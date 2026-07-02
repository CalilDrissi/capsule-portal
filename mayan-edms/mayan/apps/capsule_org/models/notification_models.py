from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from .firm_models import Firm

NOTIFICATION_KIND_UPLOAD = 'upload'
NOTIFICATION_KIND_REQUEST = 'request'
NOTIFICATION_KIND_CHOICES = (
    (NOTIFICATION_KIND_UPLOAD, _(message='Document uploaded')),
    (NOTIFICATION_KIND_REQUEST, _(message='Document requested'))
)


class CapsuleNotification(models.Model):
    """
    A lightweight, firm-scoped notification delivered to a single user.

    Capsule emits these directly (instead of riding Mayan's actstream
    event-subscription machinery) so the upload->accountant and
    request->client flows stay self-contained and isolated: every row is
    bound to one recipient user and one firm.
    """
    firm = models.ForeignKey(
        on_delete=models.CASCADE, related_name='capsule_notifications',
        to=Firm, verbose_name=_(message='Firm')
    )
    user = models.ForeignKey(
        db_index=True, on_delete=models.CASCADE,
        related_name='capsule_notifications', to=settings.AUTH_USER_MODEL,
        verbose_name=_(message='Recipient')
    )
    kind = models.CharField(
        choices=NOTIFICATION_KIND_CHOICES, max_length=32,
        verbose_name=_(message='Kind')
    )
    message = models.CharField(
        max_length=512, verbose_name=_(message='Message')
    )
    document_id = models.PositiveIntegerField(
        blank=True, null=True, verbose_name=_(message='Document')
    )
    read = models.BooleanField(
        default=False, verbose_name=_(message='Read')
    )
    datetime_created = models.DateTimeField(
        auto_now_add=True, db_index=True, verbose_name=_(message='Created')
    )

    class Meta:
        ordering = ('-datetime_created',)
        verbose_name = _(message='Capsule notification')
        verbose_name_plural = _(message='Capsule notifications')

    def __str__(self):
        return '{}: {}'.format(self.user, self.message)
