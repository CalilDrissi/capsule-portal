import io
import logging
import zipfile

from django.apps import apps

from .index_builder import DOCUMENT_DATE_METADATA_NAME

logger = logging.getLogger(name=__name__)


def _effective_period_key(document):
    """
    Compute a document's period key as "YYYY" / "YYYY-MM" using the firm
    document-date metadata when present, else the creation date. This mirrors
    the SPA's client-side period grouping so an exported period matches the
    "By period" view.
    """
    date = None

    value = None
    for document_metadata in document.metadata.all():
        metadata_type = document_metadata.metadata_type
        if metadata_type and DOCUMENT_DATE_METADATA_NAME in (
            metadata_type.name or ''
        ):
            value = document_metadata.value
            break

    if value:
        try:
            from django.utils.dateparse import parse_date, parse_datetime
            date = parse_datetime(value) or parse_date(value)
        except (ValueError, TypeError):
            date = None

    if date is None:
        date = document.datetime_created

    if date is None:
        return None

    return {'year': '{:04d}'.format(date.year),
            'month': '{:04d}-{:02d}'.format(date.year, date.month)}


def _period_matches(document, period_key):
    keys = _effective_period_key(document)
    if not keys:
        return False
    return period_key in (keys['year'], keys['month'])


def build_period_zip(client, period_key, user):
    """
    Build an in-memory zip of the latest file of every document in the
    client's cabinet whose effective period matches `period_key`, restricted
    to documents the requesting `user` may view (ACL-checked).

    Returns (bytes, count). Synchronous, in-memory — adequate for v1 firm
    document volumes; swap for a Celery `document_exports`-style task if
    periods grow large.
    """
    AccessControlList = apps.get_model(
        app_label='acls', model_name='AccessControlList'
    )
    Document = apps.get_model(app_label='documents', model_name='Document')

    from mayan.apps.documents.permissions import permission_document_view

    cabinet = client.cabinet
    if cabinet is None:
        return b'', 0

    queryset = Document.valid.filter(cabinets=cabinet).distinct()

    # ACL-restrict to what the requester may view. Accountants/clients of the
    # firm hold per-document view ACLs (granted on upload); a foreign user
    # resolves to .none().
    queryset = AccessControlList.objects.restrict_queryset(
        permission=permission_document_view, queryset=queryset, user=user
    )

    buffer = io.BytesIO()
    count = 0
    used_names = set()

    with zipfile.ZipFile(
        buffer, mode='w', compression=zipfile.ZIP_DEFLATED
    ) as archive:
        for document in queryset:
            if not _period_matches(document=document, period_key=period_key):
                continue

            document_file = document.file_latest
            if document_file is None:
                continue

            base_name = document_file.filename or '{}.bin'.format(
                document.label or 'document'
            )
            arc_name = base_name
            suffix = 1
            while arc_name in used_names:
                arc_name = '{}_{}'.format(suffix, base_name)
                suffix += 1
            used_names.add(arc_name)

            try:
                with document_file.open() as file_object:
                    archive.writestr(arc_name, file_object.read())
                count += 1
            except Exception as exception:
                logger.error(
                    'capsule_org: failed to add document %s to export zip; '
                    '%s', document, exception, exc_info=True
                )

    return buffer.getvalue(), count
