"""
Per-firm period IndexTemplate builder.

Mirrors `mayan/apps/document_indexing/handlers.py`: a root node whose
children form a Year[/Quarter]/Month tree of Django-template expressions,
with the leaf node carrying `link_documents=True`. One IndexTemplate per
firm, scoped to the firm's DocumentType, so firms never share index trees.

The expression "basis" comes from `FirmSettings.period_basis`:
  * created_date  -> document.datetime_created   (default)
  * upload_date   -> document.datetime_created    (proxy; file timestamp
                     is not cleanly template-addressable, created date is
                     the closest stable equivalent)
  * document_date -> the `capsule_document_date` metadata value (stored as
                     TEXT). Mayan's `|date` filter cannot parse a plain ISO
                     string, so the year/month are sliced out of the ISO
                     "YYYY-MM-DD" value directly, falling back to the creation
                     date when the metadata is absent — matching
                     export.py `_effective_period_key`.

The "depth" comes from `FirmSettings.period_depth`:
  * Y    -> year
  * YM   -> year / month        (default)
  * YQM  -> year / quarter / month
"""
from django.apps import apps
from django.utils.text import slugify

from ..models.firm_models import (
    PERIOD_BASIS_DOCUMENT, PERIOD_DEPTH_YEAR, PERIOD_DEPTH_YEAR_MONTH,
    PERIOD_DEPTH_YEAR_QUARTER_MONTH
)

DOCUMENT_DATE_METADATA_NAME = 'capsule_document_date'


def _quarter_body(month_number_expression):
    """
    Wrap a template expression that yields the 1-12 month number into a
    "Q1".."Q4" label. Django templates lack arithmetic, so the quarter is
    derived from an inline comparison chain (the index renderer supports
    `{% with %}`/`{% if %}`, as the pre-existing expression relied on).
    """
    return (
        'Q{% with m=' + month_number_expression + ' %}'
        '{% if m <= 3 %}1{% elif m <= 6 %}2'
        '{% elif m <= 9 %}3{% else %}4{% endif %}{% endwith %}'
    )


def _period_expressions(firm):
    """
    Return (year, quarter, month) Django-template expressions for the firm's
    period basis.

    created_date / upload_date resolve to `document.datetime_created`, a real
    datetime the `date` filter formats directly.

    document_date resolves to the `capsule_document_date` metadata value, which
    Mayan stores as TEXT. The `date` filter cannot parse a plain ISO string —
    which previously filed every document into empty buckets — so the year and
    month are sliced straight out of the ISO "YYYY-MM-DD" value, falling back
    to the document creation date when the metadata is absent. This mirrors
    export.py `_effective_period_key` (both assume the SPA's zero-padded ISO
    dates, which Mayan's DateValidator accepts) so the index and the export
    agree on a document's period.
    """
    settings = getattr(firm, 'settings', None)
    basis = getattr(settings, 'period_basis', None)

    created = 'document.datetime_created'

    if basis == PERIOD_BASIS_DOCUMENT:
        meta = 'document.metadata_value_of.' + DOCUMENT_DATE_METADATA_NAME
        # ISO date slices: [:4] -> "YYYY", [5:7] -> "MM".
        year = (
            '{% if ' + meta + ' %}{{ ' + meta + '|slice:":4" }}'
            '{% else %}{{ ' + created + '|date:"Y" }}{% endif %}'
        )
        month = (
            '{% if ' + meta + ' %}{{ ' + meta + '|slice:"5:7" }}'
            '{% else %}{{ ' + created + '|date:"m" }}{% endif %}'
        )
        quarter = (
            '{% if ' + meta + ' %}'
            + _quarter_body(meta + '|slice:"5:7"|add:"0"')
            + '{% else %}'
            + _quarter_body(created + '|date:"n"|add:"0"')
            + '{% endif %}'
        )
        return year, quarter, month

    year = '{{ ' + created + '|date:"Y" }}'
    month = '{{ ' + created + '|date:"m" }}'
    quarter = _quarter_body(created + '|date:"n"|add:"0"')
    return year, quarter, month


def _build_nodes(index, firm):
    """
    (Re)create the node tree under the index root from the firm settings.
    Assumes the root node exists and any prior non-root nodes have been
    removed by the caller.
    """
    settings = getattr(firm, 'settings', None)
    depth = getattr(settings, 'period_depth', PERIOD_DEPTH_YEAR_MONTH)
    year_expression, quarter_expression, month_expression = (
        _period_expressions(firm=firm)
    )

    root = index.index_template_root_node

    year = root.get_children().create(
        expression=year_expression,
        index=index, link_documents=False, parent=root
    )

    if depth == PERIOD_DEPTH_YEAR:
        # Leaf is the year node itself.
        year.link_documents = True
        year.save()
        return

    if depth == PERIOD_DEPTH_YEAR_QUARTER_MONTH:
        quarter = year.get_children().create(
            expression=quarter_expression,
            index=index, link_documents=False, parent=year
        )
        parent = quarter
    else:
        parent = year

    parent.get_children().create(
        expression=month_expression,
        index=index, link_documents=True, parent=parent
    )


def rebuild_period_index(firm, user=None):
    """
    (Re)create the firm's period IndexTemplate node tree from the current
    FirmSettings and trigger a rebuild so existing docs re-bucket.

    Creates the IndexTemplate (scoped to the firm DocumentType) on first
    call and stores it on `firm.index_template`. Idempotent: on subsequent
    calls it wipes the non-root template nodes and rebuilds them.
    """
    IndexTemplate = apps.get_model(
        app_label='document_indexing', model_name='IndexTemplate'
    )
    IndexTemplateNode = apps.get_model(
        app_label='document_indexing', model_name='IndexTemplateNode'
    )

    index = firm.index_template

    if index is None:
        slug = 'capsule-firm-{}-period'.format(firm.slug)
        label = 'Capsule: {} — periods'.format(firm.name)
        index = IndexTemplate(label=label, slug=slug)
        index._event_ignore = True
        index.save()
        if firm.document_type:
            index.document_types.add(firm.document_type)
        firm.index_template = index
        firm.save(update_fields=['index_template'])
    else:
        # Drop every non-root template node so the tree is rebuilt cleanly
        # from current settings.
        IndexTemplateNode.objects.filter(
            index=index
        ).exclude(parent=None).delete()

    _build_nodes(index=index, firm=firm)

    # Rebuild instance nodes from the new template so existing documents of
    # the firm document type are filed into the fresh tree.
    index.rebuild()

    return index
