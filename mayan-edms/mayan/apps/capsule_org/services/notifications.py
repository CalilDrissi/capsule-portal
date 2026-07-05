import logging

from django.apps import apps

from ..models.notification_models import (
    NOTIFICATION_KIND_REQUEST, NOTIFICATION_KIND_UPLOAD
)

logger = logging.getLogger(name=__name__)


def _model():
    return apps.get_model(
        app_label='capsule_org', model_name='CapsuleNotification'
    )


def notify_accountants_of_upload(client, document):
    """
    Notify every accountant of the client's firm that the client uploaded a
    document. Firm-scoped: only the firm's accountant memberships receive it.
    """
    FirmMembership = apps.get_model(
        app_label='capsule_org', model_name='FirmMembership'
    )
    CapsuleNotification = _model()

    firm = client.firm
    message = '{} uploaded "{}".'.format(
        client.display_name, getattr(document, 'label', document)
    )

    memberships = FirmMembership.objects.filter(
        firm=firm, kind='accountant'
    ).select_related('user')

    created = 0
    for membership in memberships:
        CapsuleNotification.objects.create(
            firm=firm, user=membership.user, kind=NOTIFICATION_KIND_UPLOAD,
            message=message, document_id=getattr(document, 'pk', None)
        )
        created += 1

    logger.info(
        'capsule_org: created %d upload notifications for firm %s.', created,
        firm
    )
    return created


def notify_accountants_of_orphan_upload(firm, document):
    """
    Notify every accountant of `firm` that a document was uploaded but its
    uploading client could not be resolved (e.g. page counting failed and the
    upload actor was lost). Makes the otherwise-silent orphan state visible so
    an accountant can locate and re-file the document instead of it vanishing.
    """
    FirmMembership = apps.get_model(
        app_label='capsule_org', model_name='FirmMembership'
    )
    CapsuleNotification = _model()

    message = (
        'A document ("{}") was uploaded but could not be linked to a client. '
        'Please review it.'
    ).format(getattr(document, 'label', document))

    memberships = FirmMembership.objects.filter(
        firm=firm, kind='accountant'
    ).select_related('user')

    created = 0
    for membership in memberships:
        CapsuleNotification.objects.create(
            firm=firm, user=membership.user, kind=NOTIFICATION_KIND_UPLOAD,
            message=message, document_id=getattr(document, 'pk', None)
        )
        created += 1

    logger.error(
        'capsule_org: emitted %d orphan-upload notifications for firm %s '
        '(document %s).', created, firm, document
    )
    return created


def notify_client_of_request(document_request):
    """
    Notify the client that their accountant requested a document.
    """
    CapsuleNotification = _model()

    client = document_request.client
    descriptor = document_request.category or document_request.period_key or (
        'a document'
    )
    if document_request.period_key:
        message = 'Your accountant requested {} for {}.'.format(
            descriptor, document_request.period_key
        )
    else:
        message = 'Your accountant requested {}.'.format(descriptor)

    CapsuleNotification.objects.create(
        firm=document_request.firm, user=client.user,
        kind=NOTIFICATION_KIND_REQUEST, message=message
    )
    logger.info(
        'capsule_org: created request notification for client %s.', client
    )
