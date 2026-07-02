import secrets

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from mayan.apps.acls.models import AccessControlList
from mayan.apps.cabinets.models import Cabinet
from mayan.apps.cabinets.permissions import permission_cabinet_view
from mayan.apps.documents.models.document_type_models import DocumentType
from mayan.apps.documents.permissions import permission_document_create
from mayan.apps.permissions.models import Role
from mayan.apps.sources.models import Source

from ..models import Client, Firm, FirmMembership, FirmSettings
from ..models.firm_models import (
    MEMBERSHIP_KIND_ACCOUNTANT, MEMBERSHIP_KIND_CLIENT
)
from . import index_builder, metadata_builder, workflow_builder

User = get_user_model()


def _unique_slug(model, base, field='slug'):
    base = slugify(base) or 'firm'
    candidate = base
    index = 1
    while model.objects.filter(**{field: candidate}).exists():
        index += 1
        candidate = '{}-{}'.format(base, index)
    return candidate


def _unique_username(base):
    base = slugify(base).replace('-', '_') or 'user'
    candidate = base
    index = 1
    while User.objects.filter(username=candidate).exists():
        index += 1
        candidate = '{}{}'.format(base, index)
    return candidate


@transaction.atomic
def create_firm(name, actor=None):
    """
    Platform-admin action. Creates a Firm together with its accountant
    Group + Role (role joined to group), default FirmSettings, and a
    dedicated DocumentType scoped to the firm.
    """
    slug = _unique_slug(model=Firm, base=name)

    firm = Firm(name=name, slug=slug)
    firm.save()

    group = Group.objects.create(name='firm:{}:accountant'.format(slug))

    # `_event_ignore` suppresses the asynchronous audit-event commit for
    # these provisioning-internal objects. Without it, Mayan dispatches a
    # Celery `task_event_commit` immediately (not on transaction commit),
    # which races the still-open atomic transaction and fails with
    # `DoesNotExist`. The event is low-value here and isolation does not
    # depend on it.
    role = Role(label='firm:{}:accountant'.format(slug))
    role._event_ignore = True
    role.save()
    role.groups.add(group)

    document_type = DocumentType(label='Firm: {}'.format(name))
    document_type._event_ignore = True
    document_type.save()

    firm.accountant_group = group
    firm.accountant_role = role
    firm.document_type = document_type
    firm.save()

    FirmSettings.objects.create(
        firm=firm, categories=list(metadata_builder.DEFAULT_CATEGORIES)
    )
    # Refresh so `firm.settings` is available to the builders below.
    firm.refresh_from_db()

    # Per-firm metadata types (document date + category), linked to the
    # firm document type.
    metadata_builder.build_firm_metadata_types(firm=firm)

    # Per-firm period index template, scoped to the firm document type.
    index_builder.rebuild_period_index(firm=firm, user=actor)

    # Per-firm status workflow, auto-launched on the firm document type.
    workflow_builder.build_status_workflow(firm=firm, user=actor)

    return firm


@transaction.atomic
def create_accountant(firm, username, password, full_name='', actor=None):
    """
    Creates a NON-STAFF, NON-SUPERUSER accountant user, adds them to the
    firm's accountant group, and records a FirmMembership(accountant).
    """
    username = _unique_username(base=username)

    user = User(
        username=username, is_staff=False, is_superuser=False,
        first_name=full_name[:150]
    )
    user.set_password(raw_password=password)
    user.save()

    if firm.accountant_group:
        user.groups.add(firm.accountant_group)

    membership = FirmMembership.objects.create(
        firm=firm, user=user, kind=MEMBERSHIP_KIND_ACCOUNTANT
    )

    return user, membership


@transaction.atomic
def provision_client(firm, display_name, username=None, actor=None):
    """
    Atomic client provisioning. Creates:
      * a NON-STAFF, NON-SUPERUSER user with a generated temp password,
      * a dedicated client Group + Role (role joined to group),
      * a root Cabinet for the client,
      * ACL grants of cabinet-view to the client role AND the firm's
        accountant role,
      * the Client + FirmMembership(client) rows.

    Document-level ACLs are granted later, at upload time, by the
    auto-grant signal handler.

    Returns: (client, temp_username, temp_password)
    """
    username = _unique_username(base=username or display_name)
    temp_password = secrets.token_urlsafe(nbytes=12)

    user = User(
        username=username, is_staff=False, is_superuser=False
    )
    user.set_password(raw_password=temp_password)
    user.save()

    group = Group.objects.create(
        name='firm:{}:client:{}'.format(firm.slug, username)
    )

    role = Role(label='firm:{}:client:{}'.format(firm.slug, username))
    role._event_ignore = True
    role.save()
    role.groups.add(group)

    user.groups.add(group)

    cabinet = Cabinet(label='{} — {}'.format(firm.name, display_name))
    cabinet._event_ignore = True
    cabinet.save()

    # Cabinet visibility for both the client role and the firm accountant
    # role. Note: cabinet ACLs do NOT cascade to documents inside, so
    # document-level grants still happen on upload.
    grant_roles = [role]
    if firm.accountant_role:
        grant_roles.append(firm.accountant_role)

    for grant_role in grant_roles:
        AccessControlList.objects.grant(
            obj=cabinet, permission=permission_cabinet_view, role=grant_role
        )

    # Allow the client to create documents of the firm's document type. The
    # accountant role gets it too so accountants can upload on behalf of
    # clients. Isolation does NOT rely on this grant: every uploaded
    # document receives its own per-client document-level ACL via the
    # auto-grant signal handler.
    if firm.document_type:
        AccessControlList.objects.grant(
            obj=firm.document_type, permission=permission_document_create,
            role=role
        )
        if firm.accountant_role:
            AccessControlList.objects.grant(
                obj=firm.document_type,
                permission=permission_document_create,
                role=firm.accountant_role
            )

    # Allow the client to use the existing web-form source(s) to upload.
    # The `document_upload` source action requires `document_create` on the
    # Source object. Source access alone does not breach isolation because
    # documents are ACL-scoped per client at upload time.
    for source in Source.objects.filter(enabled=True):
        AccessControlList.objects.grant(
            obj=source, permission=permission_document_create, role=role
        )
        if firm.accountant_role:
            AccessControlList.objects.grant(
                obj=source, permission=permission_document_create,
                role=firm.accountant_role
            )

    client = Client.objects.create(
        firm=firm, user=user, display_name=display_name, cabinet=cabinet,
        client_role=role, client_group=group, must_change_password=True,
        invite_token=secrets.token_urlsafe(nbytes=32),
        invite_created=timezone.now()
    )

    FirmMembership.objects.create(
        firm=firm, user=user, kind=MEMBERSHIP_KIND_CLIENT
    )

    return client, username, temp_password
