from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from .client_models import Client
from .firm_models import Firm

REQUEST_STATUS_REQUESTED = 'requested'
REQUEST_STATUS_FULFILLED = 'fulfilled'
REQUEST_STATUS_CHOICES = (
    (REQUEST_STATUS_REQUESTED, _(message='Requested')),
    (REQUEST_STATUS_FULFILLED, _(message='Fulfilled'))
)


class DocumentRequest(models.Model):
    """
    An accountant's request that a client provide a specific document for a
    given period/category. Drives per-period checklists.
    """
    firm = models.ForeignKey(
        on_delete=models.CASCADE, related_name='document_requests', to=Firm,
        verbose_name=_(message='Firm')
    )
    client = models.ForeignKey(
        on_delete=models.CASCADE, related_name='document_requests',
        to=Client, verbose_name=_(message='Client')
    )
    period_key = models.CharField(
        blank=True, max_length=64, verbose_name=_(message='Period key')
    )
    category = models.CharField(
        blank=True, max_length=255, verbose_name=_(message='Category')
    )
    status = models.CharField(
        choices=REQUEST_STATUS_CHOICES, default=REQUEST_STATUS_REQUESTED,
        max_length=32, verbose_name=_(message='Status')
    )
    requested_by = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_document_requests',
        to=settings.AUTH_USER_MODEL, verbose_name=_(message='Requested by')
    )
    datetime_created = models.DateTimeField(
        auto_now_add=True, verbose_name=_(message='Created')
    )

    class Meta:
        ordering = ('-datetime_created',)
        verbose_name = _(message='Document request')
        verbose_name_plural = _(message='Document requests')

    def __str__(self):
        return '{} / {} ({})'.format(
            self.client, self.category or self.period_key, self.status
        )
