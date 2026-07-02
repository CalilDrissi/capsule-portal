from django.conf import settings
from django.contrib.auth.models import Group
from django.db import models
from django.utils.translation import gettext_lazy as _

from .firm_models import Firm


class Client(models.Model):
    """
    A client of a firm. The client user is a non-staff, non-superuser
    account whose documents are isolated from sibling clients via a
    dedicated client role + cabinet. The firm's accountant role also
    receives ACL grants so accountants can review all their clients' docs.
    """
    firm = models.ForeignKey(
        on_delete=models.CASCADE, related_name='clients', to=Firm,
        verbose_name=_(message='Firm')
    )
    user = models.OneToOneField(
        on_delete=models.CASCADE, related_name='capsule_client',
        to=settings.AUTH_USER_MODEL, verbose_name=_(message='User')
    )
    display_name = models.CharField(
        max_length=255, verbose_name=_(message='Display name')
    )
    cabinet = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_client', to='cabinets.Cabinet',
        verbose_name=_(message='Cabinet')
    )
    client_role = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_client', to='permissions.Role',
        verbose_name=_(message='Client role')
    )
    client_group = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_client', to=Group,
        verbose_name=_(message='Client group')
    )
    must_change_password = models.BooleanField(
        default=True, verbose_name=_(message='Must change password')
    )
    # One-time invite token (unguessable). Set at provisioning / regeneration,
    # cleared when the client completes setup via the public invite endpoint.
    invite_token = models.CharField(
        blank=True, db_index=True, max_length=64, null=True, unique=True,
        verbose_name=_(message='Invite token')
    )
    invite_created = models.DateTimeField(
        blank=True, null=True, verbose_name=_(message='Invite created')
    )

    class Meta:
        ordering = ('display_name',)
        verbose_name = _(message='Client')
        verbose_name_plural = _(message='Clients')

    def __str__(self):
        return self.display_name
