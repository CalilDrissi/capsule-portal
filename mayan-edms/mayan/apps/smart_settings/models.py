from django.db import models
from django.utils.translation import gettext_lazy as _


class UpdatedStoredSetting(models.Model):
    key = models.CharField(
        db_index=True, help_text=_(
            message='A unique identifier.'
        ), max_length=255, unique=True, verbose_name=_(message='Key')
    )
    value = models.TextField(
        blank=True, null=True, verbose_name=_(message='Value')
    )

    class Meta:
        verbose_name = _(message='Updated stored setting')
        verbose_name_plural = _(message='Updated stored settings')
