import logging

from django.apps import apps

logger = logging.getLogger(name=__name__)


def handler_auto_grant_document_acl(sender, instance, **kwargs):
    """
    Bound to `signal_post_document_file_upload` (sender=DocumentFile).

    The uploading user is carried on the DocumentFile instance via
    `instance._event_actor` (the document upload code sets this and marks it
    as a kept event attribute, so it survives until `upload_complete()`
    fires this signal). If the uploader is a Capsule `Client`, grant the
    client's role and the firm's accountant role document-level ACLs on the
    new document, and add the document to the client's cabinet so it gets
    grouped/indexed.

    This runs synchronously in the worker after the file is fully processed,
    which makes it the most reliable hook for auto-ACL (the async
    `event_document_created` would require post-commit binding).
    """
    AccessControlList = apps.get_model(
        app_label='acls', model_name='AccessControlList'
    )
    Client = apps.get_model(
        app_label='capsule_org', model_name='Client'
    )

    from mayan.apps.documents.permissions import (
        permission_document_edit, permission_document_view
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

    document = instance.document

    user = getattr(instance, '_event_actor', None)
    if user is None:
        logger.debug(
            'capsule_org: no _event_actor on uploaded file for document '
            '%s; skipping auto-ACL.', document
        )
        return

    try:
        client = Client.objects.select_related(
            'client_role', 'firm', 'firm__accountant_role', 'cabinet'
        ).get(user=user)
    except Client.DoesNotExist:
        logger.debug(
            'capsule_org: uploader %s is not a Capsule client; skipping '
            'auto-ACL for document %s.', user, document
        )
        return

    permissions = (
        permission_document_view, permission_document_edit,
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

    for role in roles:
        for permission in permissions:
            AccessControlList.objects.grant(
                obj=document, permission=permission, role=role
            )

    # The metadata-type primary-key field on the document-metadata endpoint is
    # ACL-filtered by `permission_document_metadata_add` on the MetadataType
    # itself, so granting the permission on the document is not enough. Grant
    # the firm's category + document-date metadata types to both roles so the
    # client/accountant can attach those values to their uploads. Idempotent.
    metadata_type_permissions = (
        permission_document_metadata_add,
        permission_document_metadata_edit,
        permission_document_metadata_view
    )
    firm = client.firm
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
    # Grant both on the firm's workflow + its transitions to both roles so
    # the status (instance + allowed transitions) is readable/actionable.
    firm_workflow = getattr(firm, 'workflow', None)
    if firm_workflow is not None:
        # Both roles may VIEW the status (workflow template + instance).
        for role in roles:
            AccessControlList.objects.grant(
                obj=firm_workflow, permission=permission_workflow_template_view,
                role=role
            )
        # Only the firm's accountant role may TRANSITION the status; the
        # client's view stays read-only (defense in depth — the UI also gates
        # the transition control by role).
        accountant_role = client.firm.accountant_role
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
