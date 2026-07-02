"""
Per-firm MetadataType builder.

Creates two MetadataTypes and links them to the firm's DocumentType via
DocumentTypeMetadataType:

  * capsule_document_date  (label "Document date") — a date, validated by
    Mayan's DateValidator.
  * capsule_category       (label "Category") — single-choice; choices come
    from FirmSettings.categories rendered into the `lookup` field as a
    comma-delimited string (Mayan renders `lookup` as a Django template and
    comma-splits the result, so a literal CSV is a valid static choice set).

The metadata-type names must be globally unique (Mayan constraint), so the
firm slug is folded into the `name`. Study reference:
`mayan/apps/metadata/models/`.
"""
from django.apps import apps

DATE_VALIDATOR = 'mayan.apps.metadata.metadata_validators.DateValidator'

DEFAULT_CATEGORIES = [
    'Bank statement', 'Sales invoice', 'Purchase invoice', 'Payroll',
    'Tax', 'Other'
]


def _firm_metadata_name(firm, suffix):
    # MetadataType.name is globally unique and disallows spaces. Fold the
    # firm slug (already safe) into the name to keep firms isolated.
    return 'capsule_{}_{}'.format(
        firm.slug.replace('-', '_'), suffix
    )


def build_firm_metadata_types(firm, categories=None):
    """
    Create the document-date and category MetadataTypes for the firm, link
    them to the firm DocumentType, store the ids on the firm, and return
    (document_date_type, category_type). Idempotent on the firm fields.
    """
    if (
        firm.document_date_metadata_type_id
        and firm.category_metadata_type_id
    ):
        return (
            firm.document_date_metadata_type, firm.category_metadata_type
        )

    MetadataType = apps.get_model(
        app_label='metadata', model_name='MetadataType'
    )
    DocumentTypeMetadataType = apps.get_model(
        app_label='metadata', model_name='DocumentTypeMetadataType'
    )

    settings = getattr(firm, 'settings', None)
    if categories is None:
        categories = list(
            getattr(settings, 'categories', None) or DEFAULT_CATEGORIES
        )
    if not categories:
        categories = list(DEFAULT_CATEGORIES)

    document_date_type = MetadataType(
        name=_firm_metadata_name(firm=firm, suffix='document_date'),
        label='Document date', validation=DATE_VALIDATOR
    )
    document_date_type._event_ignore = True
    document_date_type.save()

    category_type = MetadataType(
        name=_firm_metadata_name(firm=firm, suffix='category'),
        label='Category', lookup=','.join(categories)
    )
    category_type._event_ignore = True
    category_type.save()

    if firm.document_type:
        for metadata_type in (document_date_type, category_type):
            relationship = DocumentTypeMetadataType(
                document_type=firm.document_type,
                metadata_type=metadata_type, required=False
            )
            relationship._event_ignore = True
            relationship.save()

    firm.document_date_metadata_type = document_date_type
    firm.category_metadata_type = category_type
    firm.save(
        update_fields=[
            'document_date_metadata_type', 'category_metadata_type'
        ]
    )

    return document_date_type, category_type


def update_firm_category_choices(firm, categories):
    """
    Rewrite the firm's Category MetadataType `lookup` (the static choice set)
    from a fresh category list. No-op if the firm has no category metadata
    type yet. Returns the updated MetadataType (or None).
    """
    metadata_type = firm.category_metadata_type
    if metadata_type is None:
        return None

    categories = [c for c in (categories or []) if c]
    metadata_type.lookup = ','.join(categories)
    metadata_type._event_ignore = True
    metadata_type.save(update_fields=['lookup'])
    return metadata_type
