from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from .client_models import Client


class CapsuleDocumentUpload(models.Model):
    """
    Attribution record: which user uploaded a given document, for which client.
    Written by the auto-ACL upload handler where the uploading user is already
    resolved. `document_id` is a plain integer — documents live in Mayan's own
    app, so there is no cross-app FK; the row is upserted per document.
    """
    document_id = models.PositiveIntegerField(
        db_index=True, unique=True, verbose_name=_(message='Document')
    )
    client = models.ForeignKey(
        on_delete=models.CASCADE, related_name='document_uploads', to=Client,
        verbose_name=_(message='Client')
    )
    user = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_document_uploads', to=settings.AUTH_USER_MODEL,
        verbose_name=_(message='Uploaded by')
    )
    datetime_created = models.DateTimeField(
        auto_now_add=True, verbose_name=_(message='Uploaded')
    )

    class Meta:
        ordering = ('-datetime_created',)
        verbose_name = _(message='Document upload')
        verbose_name_plural = _(message='Document uploads')

    def __str__(self):
        return 'doc {} by {}'.format(self.document_id, self.user)
