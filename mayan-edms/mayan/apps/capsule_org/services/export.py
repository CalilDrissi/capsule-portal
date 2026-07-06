import io
import logging
import shutil
import zipfile

from django.apps import apps

logger = logging.getLogger(name=__name__)

# Read/compress each document file this many bytes at a time so a single
# large file never becomes fully resident in memory during export.
COPY_CHUNK_SIZE = 1024 * 1024  # 1 MiB


def _effective_period_key(document, date_type_id=None):
    """
    Compute a document's period key as "YYYY" / "YYYY-MM" using the firm's
    document-date metadata when present, else the creation date. This mirrors
    the SPA's period grouping so an exported period matches the "By period" view.

    `date_type_id` is the firm's document-date MetadataType id — matched by id
    rather than by name, because the type is named `capsule_<slug>_document_date`
    (firm-scoped) and a fixed-name substring match would never hit it.
    """
    date = None

    value = None
    if date_type_id is not None:
        for document_metadata in document.metadata.all():
            if document_metadata.metadata_type_id == date_type_id:
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


def _period_matches(document, period_key, date_type_id=None):
    keys = _effective_period_key(document, date_type_id=date_type_id)
    if not keys:
        return False
    return period_key in (keys['year'], keys['month'])


def build_period_zip(client, period_key, user):
    """
    Build a zip of the latest file of every document in the client's cabinet
    whose effective period matches `period_key`, restricted to documents the
    requesting `user` may view (ACL-checked).

    Returns (bytes, count). Synchronous — adequate for v1 firm document
    volumes; swap for a Celery `document_exports`-style task if periods grow
    large. Memory-bounded: each document file is streamed into the zip in
    fixed-size chunks (see COPY_CHUNK_SIZE) rather than being fully read into
    RAM, so a single large file never becomes wholly resident.
    """
    AccessControlList = apps.get_model(
        app_label='acls', model_name='AccessControlList'
    )
    Document = apps.get_model(app_label='documents', model_name='Document')

    from mayan.apps.documents.permissions import permission_document_view

    cabinet = client.cabinet
    if cabinet is None:
        return b'', 0

    date_type_id = getattr(client.firm, 'document_date_metadata_type_id', None)

    queryset = Document.valid.filter(cabinets=cabinet).distinct()

    # Kill the per-document N+1: `_effective_period_key` walks
    # `document.metadata.all()` and reads `metadata_type` on each row, so
    # prefetch both in a single pair of queries for the whole period scan.
    queryset = queryset.prefetch_related('metadata__metadata_type')

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
            if not _period_matches(
                document=document, period_key=period_key,
                date_type_id=date_type_id
            ):
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
                # Stream the file into the zip entry in fixed-size chunks so
                # the whole document is never resident in RAM. The archive's
                # ZIP_DEFLATED compression is applied by the entry writer.
                with document_file.open() as file_object:
                    with archive.open(arc_name, mode='w') as archive_entry:
                        shutil.copyfileobj(
                            file_object, archive_entry, COPY_CHUNK_SIZE
                        )
                count += 1
            except Exception as exception:
                logger.error(
                    'capsule_org: failed to add document %s to export zip; '
                    '%s', document, exception, exc_info=True
                )

    return buffer.getvalue(), count
