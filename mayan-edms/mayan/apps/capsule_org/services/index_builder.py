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
  * document_date -> document.metadata_value_of.capsule_document_date

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


def _basis_token(firm):
    """
    Return the Django-template variable path used as the date source for
    the index expressions, derived from the firm's settings.
    """
    settings = getattr(firm, 'settings', None)
    basis = getattr(settings, 'period_basis', None)

    if basis == PERIOD_BASIS_DOCUMENT:
        # Render the document-date metadata value (a "YYYY-MM-DD" string)
        # through Django's `date` filter via a parse first. Mayan stores
        # metadata as text, so we reference it directly; the `date` filter
        # accepts ISO date strings.
        return 'document.metadata_value_of.{}'.format(
            DOCUMENT_DATE_METADATA_NAME
        )

    # created_date and upload_date both resolve to the document creation
    # timestamp, which is a real datetime and works cleanly with `date`.
    return 'document.datetime_created'


def _build_nodes(index, firm):
    """
    (Re)create the node tree under the index root from the firm settings.
    Assumes the root node exists and any prior non-root nodes have been
    removed by the caller.
    """
    settings = getattr(firm, 'settings', None)
    depth = getattr(settings, 'period_depth', PERIOD_DEPTH_YEAR_MONTH)
    token = _basis_token(firm=firm)

    root = index.index_template_root_node

    year = root.get_children().create(
        expression='{{{{ {0}|date:"Y" }}}}'.format(token),
        index=index, link_documents=False, parent=root
    )

    if depth == PERIOD_DEPTH_YEAR:
        # Leaf is the year node itself.
        year.link_documents = True
        year.save()
        return

    if depth == PERIOD_DEPTH_YEAR_QUARTER_MONTH:
        # Quarter expression: "Q" + ceil(month/3). Django templates lack
        # arithmetic, so derive the quarter from a small inline mapping by
        # rendering the month number and using `divisibleby`-free math via
        # the `add` filter is awkward; instead use the month's "n" (1-12)
        # mapped through a verbose but template-only expression.
        quarter = year.get_children().create(
            expression=(
                'Q{{% with m={0}|date:"n"|add:"0" %}}'
                '{{% if m <= 3 %}}1{{% elif m <= 6 %}}2'
                '{{% elif m <= 9 %}}3{{% else %}}4{{% endif %}}'
                '{{% endwith %}}'
            ).format(token),
            index=index, link_documents=False, parent=year
        )
        parent = quarter
    else:
        parent = year

    parent.get_children().create(
        expression='{{{{ {0}|date:"m" }}}}'.format(token),
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
