import logging

from django.apps import apps

from ..handlers import _grant_document_acls
from ..models import CapsuleDocumentUpload

logger = logging.getLogger(name=__name__)


def _apply_metadata(document, firm, category, document_date):
    """Set the firm's category + document-date metadata on a document."""
    DocumentMetadata = apps.get_model(
        app_label='metadata', model_name='DocumentMetadata'
    )
    pairs = (
        (getattr(firm, 'category_metadata_type', None), category),
        (getattr(firm, 'document_date_metadata_type', None), document_date),
    )
    for metadata_type, value in pairs:
        if metadata_type is None or not value:
            continue
        try:
            document_metadata, created = DocumentMetadata.objects.get_or_create(
                document=document, metadata_type=metadata_type,
                defaults={'value': value}
            )
            if not created and document_metadata.value != value:
                document_metadata.value = value
                document_metadata._event_ignore = True
                document_metadata.save()
        except Exception:
            logger.error(
                'capsule_org: failed to set %s metadata on document %s',
                metadata_type, document, exc_info=True
            )


def attach_document_to_client(
    document, client, user, category=None, document_date=None
):
    """
    Attribute an already-uploaded document to a client: grant the client + firm
    accountant roles the document ACLs, file it into the client's cabinet,
    record who uploaded it, and apply the firm's category / document-date
    metadata. Used when an ACCOUNTANT uploads on behalf of a client (a client's
    own uploads are handled automatically by the upload signal handler, which
    resolves the client from the uploading user).
    """
    _grant_document_acls(client=client, document=document, user=user)
    CapsuleDocumentUpload.objects.update_or_create(
        document_id=document.pk, defaults={'client': client, 'user': user}
    )
    _apply_metadata(
        document=document, firm=client.firm, category=category,
        document_date=document_date
    )
