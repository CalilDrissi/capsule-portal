import logging

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import OperationalError, ProgrammingError, transaction

logger = logging.getLogger(name=__name__)


def _resolve_uploading_user(instance, document):
    """
    Resolve the user who uploaded `document`.

    The happy path carries the uploader on the DocumentFile via
    `instance._event_actor`. But that attribute is ONLY set in the success
    branch of `DocumentFile.page_count_update`; when page counting fails
    (corrupt/odd PDF, HEIC) Mayan swallows the `PageCountError` and still fires
    `signal_post_document_file_upload`, leaving `_event_actor` unset. Relying
    on it alone previously orphaned such uploads (no ACL granted → invisible to
    both client and accountant, no error surfaced).

    Recovery: when `_event_actor` is missing, fall back to the
    RecentlyAccessedDocument row Mayan writes at document creation
    (`Document.save` records the creating user as a recent document). The
    earliest such row is the document's creator, i.e. the uploader.
    """
    user = getattr(instance, '_event_actor', None)
    if user is not None:
        return user

    User = get_user_model()
    recent_user_id = document.recent.order_by(
        'datetime_accessed'
    ).values_list('user_id', flat=True).first()

    if recent_user_id is None:
        return None

    recovered = User.objects.filter(pk=recent_user_id).first()
    if recovered is not None:
        logger.info(
            'capsule_org: recovered uploader %s for document %s from recent '
            'documents (page-count failure path).', recovered, document
        )
    return recovered


def _grant_document_acls(client, document, user):
    """
    Grant the client role + firm accountant role the document/metadata/workflow
    ACLs for `document`, add the document to the client's cabinet, and notify
    the firm's accountants.

    Wrapped in a single atomic block: `AccessControlList.objects.grant` is
    idempotent (get_or_create) and this whole handler is idempotent via the
    connection `dispatch_uid`, so if any grant raises mid-way the transaction
    rolls back to a clean pre-grant state and the (unchanged) document can be
    safely re-processed rather than being left with a partial ACL set.
    """
    AccessControlList = apps.get_model(
        app_label='acls', model_name='AccessControlList'
    )

    from mayan.apps.documents.permissions import (
        permission_document_edit, permission_document_file_view,
        permission_document_version_view, permission_document_view
    )
    from mayan.apps.document_comments.permissions import (
        permission_document_comment_create,
        permission_document_comment_view
    )
    from mayan.apps.document_states.permissions import (
        permission_workflow_instance_transition,
        permission_workflow_template_view
    )
    from mayan.apps.metadata.permissions import (
        permission_document_metadata_add, permission_document_metadata_edit,
        permission_document_metadata_view
    )

    permissions = (
        permission_document_view, permission_document_edit,
        # File + version view so the client/accountant can open the page-image
        # preview and download the file they uploaded/are reviewing.
        permission_document_file_view, permission_document_version_view,
        permission_document_comment_create,
        permission_document_comment_view,
        permission_workflow_instance_transition,
        # View the document's workflow instance (status). The workflow
        # instance list/detail API checks workflow_template_view on the
        # document as the external object.
        permission_workflow_template_view,
        # Let the client/accountant set the category + document-date metadata
        # on their own uploads (drives the period grouping + timeline).
        permission_document_metadata_add,
        permission_document_metadata_edit,
        permission_document_metadata_view
    )

    roles = []
    if client.client_role:
        roles.append(client.client_role)
    if client.firm and client.firm.accountant_role:
        roles.append(client.firm.accountant_role)

    firm = client.firm

    with transaction.atomic():
        for role in roles:
            for permission in permissions:
                AccessControlList.objects.grant(
                    obj=document, permission=permission, role=role
                )

        # The metadata-type primary-key field on the document-metadata
        # endpoint is ACL-filtered by `permission_document_metadata_add` on the
        # MetadataType itself, so granting the permission on the document is not
        # enough. Grant the firm's category + document-date metadata types to
        # both roles so the client/accountant can attach those values to their
        # uploads. Idempotent.
        metadata_type_permissions = (
            permission_document_metadata_add,
            permission_document_metadata_edit,
            permission_document_metadata_view
        )
        metadata_types = [
            getattr(firm, 'category_metadata_type', None),
            getattr(firm, 'document_date_metadata_type', None)
        ]
        for metadata_type in metadata_types:
            if metadata_type is None:
                continue
            for role in roles:
                for permission in metadata_type_permissions:
                    AccessControlList.objects.grant(
                        obj=metadata_type, permission=permission, role=role
                    )

        # The workflow-instance API also checks workflow_template_view on the
        # workflow template object itself, and the available-transition list is
        # ACL-filtered per WorkflowTransition by workflow_instance_transition.
        # Grant both on the firm's workflow + its transitions so the status
        # (instance + allowed transitions) is readable/actionable.
        firm_workflow = getattr(firm, 'workflow', None)
        if firm_workflow is not None:
            # Both roles may VIEW the status (workflow template + instance).
            for role in roles:
                AccessControlList.objects.grant(
                    obj=firm_workflow,
                    permission=permission_workflow_template_view, role=role
                )
            # Only the firm's accountant role may TRANSITION the status; the
            # client's view stays read-only (defense in depth — the UI also
            # gates the transition control by role).
            accountant_role = firm.accountant_role
            if accountant_role is not None:
                for transition in firm_workflow.transitions.all():
                    AccessControlList.objects.grant(
                        obj=transition,
                        permission=permission_workflow_instance_transition,
                        role=accountant_role
                    )

    if client.cabinet:
        try:
            client.cabinet.document_add(document=document, user=user)
        except Exception as exception:
            logger.error(
                'capsule_org: failed to add document %s to cabinet %s; %s',
                document, client.cabinet, exception, exc_info=True
            )

    # Notify the firm's accountants that the client uploaded a document.
    try:
        from .services import notifications
        notifications.notify_accountants_of_upload(
            client=client, document=document
        )
    except Exception as exception:
        logger.error(
            'capsule_org: failed to notify accountants of upload for '
            'document %s; %s', document, exception, exc_info=True
        )

    logger.info(
        'capsule_org: auto-granted ACLs on document %s to roles %s for '
        'client %s.', document, roles, client
    )


def handler_auto_grant_document_acl(sender, instance, **kwargs):
    """
    Bound to `signal_post_document_file_upload` (sender=DocumentFile).

    Resolve the uploading Capsule `Client` (reliably, even when page-counting
    failed and the upload actor was lost — see `_resolve_uploading_user`) and
    grant the client's role and the firm's accountant role document-level ACLs
    on the new document, add the document to the client's cabinet, and notify
    the firm's accountants.

    Runs synchronously in the worker after the file is processed. The grant
    sequence is atomic and idempotent, so a re-delivery is safe.
    """
    Client = apps.get_model(app_label='capsule_org', model_name='Client')
    Firm = apps.get_model(app_label='capsule_org', model_name='Firm')

    document = instance.document

    user = _resolve_uploading_user(instance=instance, document=document)

    client = None
    if user is not None:
        # Resolve through ClientUser so ANY of a client's employee logins maps
        # to the client (not just the primary O2O user).
        client = Client.objects.select_related(
            'client_role', 'firm', 'firm__accountant_role', 'cabinet'
        ).filter(client_users__user=user).first()

    if client is None:
        if user is not None:
            # We know who uploaded, they are simply not a Capsule client
            # (e.g. a platform admin). Nothing to grant — existing behaviour.
            logger.debug(
                'capsule_org: uploader %s is not a Capsule client; skipping '
                'auto-ACL for document %s.', user, document
            )
            return

        # The uploader could not be resolved at all: the document would be
        # orphaned (invisible, no error). Resolve the firm from the document
        # type (each firm owns a unique DocumentType) and raise it loudly so
        # an accountant can locate/re-file it instead of it silently vanishing.
        firm = Firm.objects.filter(
            document_type_id=document.document_type_id
        ).first()
        logger.error(
            'capsule_org: could not resolve an uploading client for document '
            '%s (document_type=%s); auto-ACL skipped. The document is not '
            'linked to a client and may be invisible until reviewed.',
            document, document.document_type_id
        )
        if firm is not None:
            try:
                from .services import notifications
                notifications.notify_accountants_of_orphan_upload(
                    firm=firm, document=document
                )
            except Exception as exception:
                logger.error(
                    'capsule_org: failed to emit orphan-upload notification '
                    'for document %s; %s', document, exception, exc_info=True
                )
        return

    try:
        _grant_document_acls(client=client, document=document, user=user)
    except Exception as exception:
        # A partial ACL set was rolled back by the atomic block. Surface the
        # failure loudly; the handler is idempotent and safely re-runnable.
        logger.error(
            'capsule_org: auto-ACL grant failed for document %s (client %s); '
            'no partial ACLs left behind, retry-safe. %s',
            document, client, exception, exc_info=True
        )
        firm = client.firm
        if firm is not None:
            try:
                from .services import notifications
                notifications.notify_accountants_of_orphan_upload(
                    firm=firm, document=document
                )
            except Exception:
                logger.error(
                    'capsule_org: failed to emit failure notification for '
                    'document %s.', document, exc_info=True
                )
    else:
        # Record who uploaded (attribution). Best-effort: never let this fail
        # the upload. Upsert keyed by document so a re-delivery is idempotent.
        try:
            CapsuleDocumentUpload = apps.get_model(
                app_label='capsule_org', model_name='CapsuleDocumentUpload'
            )
            CapsuleDocumentUpload.objects.update_or_create(
                document_id=document.pk,
                defaults={'client': client, 'user': user}
            )
        except Exception:
            logger.error(
                'capsule_org: failed to record uploader for document %s.',
                document, exc_info=True
            )


def handler_enforce_firm_user_not_privileged(sender, instance, **kwargs):
    """
    Isolation invariant (User pre_save): a user who belongs to a firm (has a
    FirmMembership) must never be `is_staff` or `is_superuser`, because
    staff/superuser bypass ALL Mayan ACLs and would see every firm's
    documents. Fail loudly rather than silently create a cross-tenant leak.
    """
    if not (instance.is_staff or instance.is_superuser):
        return

    # A brand-new (unsaved) user cannot yet have a membership.
    if not instance.pk:
        return

    FirmMembership = apps.get_model(
        app_label='capsule_org', model_name='FirmMembership'
    )
    try:
        has_membership = FirmMembership.objects.filter(
            user_id=instance.pk
        ).exists()
    except (OperationalError, ProgrammingError):
        # The capsule_org tables may not exist yet during initial migration /
        # bootstrap superuser creation. Never block a save in that window.
        return

    if has_membership:
        logger.error(
            'capsule_org: refusing to grant staff/superuser to firm user %s '
            '(pk=%s); this would bypass tenant ACL isolation.',
            instance.get_username(), instance.pk
        )
        raise ValidationError(
            message=(
                'A user that belongs to a firm cannot be staff or superuser; '
                'this would bypass tenant isolation.'
            )
        )


def handler_enforce_membership_user_not_privileged(sender, instance, **kwargs):
    """
    Isolation invariant (FirmMembership pre_save): a membership must never be
    attached to a staff/superuser account, for the same ACL-bypass reason as
    `handler_enforce_firm_user_not_privileged`.
    """
    user = getattr(instance, 'user', None)
    if user is None:
        return

    if user.is_staff or user.is_superuser:
        logger.error(
            'capsule_org: refusing to attach a firm membership to '
            'staff/superuser %s; this would bypass tenant ACL isolation.',
            user.get_username()
        )
        raise ValidationError(
            message=(
                'A staff or superuser account cannot be given a firm '
                'membership; this would bypass tenant isolation.'
            )
        )
