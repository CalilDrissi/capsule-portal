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
    company_name = models.CharField(
        blank=True, max_length=255,
        verbose_name=_(message='Company legal name')
    )
    contact_name = models.CharField(
        blank=True, max_length=255, verbose_name=_(message='Contact person')
    )
    contact_email = models.EmailField(
        blank=True, verbose_name=_(message='Contact email')
    )
    contact_phone = models.CharField(
        blank=True, max_length=64, verbose_name=_(message='Contact phone')
    )
    address = models.TextField(blank=True, verbose_name=_(message='Address'))
    tax_id = models.CharField(
        blank=True, max_length=128,
        verbose_name=_(message='Tax / registration ID')
    )
    notes = models.TextField(blank=True, verbose_name=_(message='Notes'))
    # Deactivating a client disables its logins while keeping documents intact.
    is_active = models.BooleanField(
        db_index=True, default=True, verbose_name=_(message='Active')
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


class ClientUser(models.Model):
    """
    A login belonging to a client company. A client may have multiple employee
    logins; every one joins the client's group (so they share the same client
    role -> the same cabinet + per-document ACLs). All are non-staff/non-superuser.
    `is_primary` marks the original owner login created with the client.
    """
    client = models.ForeignKey(
        on_delete=models.CASCADE, related_name='client_users', to=Client,
        verbose_name=_(message='Client')
    )
    user = models.OneToOneField(
        on_delete=models.CASCADE, related_name='capsule_client_user',
        to=settings.AUTH_USER_MODEL, verbose_name=_(message='User')
    )
    is_primary = models.BooleanField(
        default=False, verbose_name=_(message='Primary')
    )
    # One-time invite token for this specific login (employees set their own
    # password). Cleared on completion, mirroring the primary-client flow.
    invite_token = models.CharField(
        blank=True, db_index=True, max_length=64, null=True, unique=True,
        verbose_name=_(message='Invite token')
    )
    invite_created = models.DateTimeField(
        blank=True, null=True, verbose_name=_(message='Invite created')
    )
    datetime_created = models.DateTimeField(
        auto_now_add=True, verbose_name=_(message='Created')
    )

    class Meta:
        ordering = ('-is_primary', 'user__username')
        verbose_name = _(message='Client login')
        verbose_name_plural = _(message='Client logins')

    def __str__(self):
        return '{} @ {}'.format(self.user, self.client)
