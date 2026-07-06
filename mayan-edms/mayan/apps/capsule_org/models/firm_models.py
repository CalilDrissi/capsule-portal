from django.conf import settings
from django.contrib.auth.models import Group
from django.db import models
from django.utils.translation import gettext_lazy as _

MEMBERSHIP_KIND_ACCOUNTANT = 'accountant'
MEMBERSHIP_KIND_CLIENT = 'client'
MEMBERSHIP_KIND_CHOICES = (
    (MEMBERSHIP_KIND_ACCOUNTANT, _(message='Accountant')),
    (MEMBERSHIP_KIND_CLIENT, _(message='Client'))
)

PERIOD_BASIS_CREATED = 'created_date'
PERIOD_BASIS_UPLOAD = 'upload_date'
PERIOD_BASIS_DOCUMENT = 'document_date'
PERIOD_BASIS_CHOICES = (
    (PERIOD_BASIS_CREATED, _(message='Document created date')),
    (PERIOD_BASIS_UPLOAD, _(message='Upload date')),
    (PERIOD_BASIS_DOCUMENT, _(message='Document date (metadata)'))
)

PERIOD_DEPTH_YEAR = 'Y'
PERIOD_DEPTH_YEAR_MONTH = 'YM'
PERIOD_DEPTH_YEAR_QUARTER_MONTH = 'YQM'
PERIOD_DEPTH_CHOICES = (
    (PERIOD_DEPTH_YEAR, _(message='Year')),
    (PERIOD_DEPTH_YEAR_MONTH, _(message='Year / Month')),
    (PERIOD_DEPTH_YEAR_QUARTER_MONTH, _(message='Year / Quarter / Month'))
)


class Firm(models.Model):
    """
    A single accounting firm. The top-level tenant boundary. Every other
    Capsule object (clients, documents, settings) belongs to exactly one
    firm and isolation between firms is enforced via Mayan ACLs/roles.
    """
    name = models.CharField(
        db_index=True, max_length=255, unique=True,
        verbose_name=_(message='Name')
    )
    slug = models.SlugField(
        db_index=True, max_length=128, unique=True,
        verbose_name=_(message='Slug')
    )
    accountant_group = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_firm_accountant', to=Group,
        verbose_name=_(message='Accountant group')
    )
    accountant_role = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_firm_accountant', to='permissions.Role',
        verbose_name=_(message='Accountant role')
    )
    document_type = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_firm', to='documents.DocumentType',
        verbose_name=_(message='Document type')
    )
    document_date_metadata_type = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_firm_document_date',
        to='metadata.MetadataType',
        verbose_name=_(message='Document date metadata type')
    )
    category_metadata_type = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_firm_category', to='metadata.MetadataType',
        verbose_name=_(message='Category metadata type')
    )
    index_template = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_firm', to='document_indexing.IndexTemplate',
        verbose_name=_(message='Period index template')
    )
    workflow = models.ForeignKey(
        blank=True, null=True, on_delete=models.SET_NULL,
        related_name='capsule_firm', to='document_states.Workflow',
        verbose_name=_(message='Status workflow')
    )
    contact_email = models.EmailField(
        blank=True, verbose_name=_(message='Contact email')
    )
    # Deactivating a firm disables its logins (users set is_active=False) while
    # keeping all documents/history intact. Reversible.
    is_active = models.BooleanField(
        db_index=True, default=True, verbose_name=_(message='Active')
    )

    class Meta:
        ordering = ('name',)
        verbose_name = _(message='Firm')
        verbose_name_plural = _(message='Firms')

    def __str__(self):
        return self.name


class FirmMembership(models.Model):
    """
    Binds a Django user to a single firm with a role kind. Exactly one
    membership per user (one-to-one).
    """
    firm = models.ForeignKey(
        on_delete=models.CASCADE, related_name='memberships', to=Firm,
        verbose_name=_(message='Firm')
    )
    user = models.OneToOneField(
        on_delete=models.CASCADE, related_name='capsule_membership',
        to=settings.AUTH_USER_MODEL, verbose_name=_(message='User')
    )
    kind = models.CharField(
        choices=MEMBERSHIP_KIND_CHOICES, max_length=32,
        verbose_name=_(message='Kind')
    )

    class Meta:
        verbose_name = _(message='Firm membership')
        verbose_name_plural = _(message='Firm memberships')

    def __str__(self):
        return '{} @ {} ({})'.format(self.user, self.firm, self.kind)


class FirmSettings(models.Model):
    """
    Per-firm configuration: how documents are grouped into periods, the
    list of selectable categories, and required-document checklist
    templates.
    """
    firm = models.OneToOneField(
        on_delete=models.CASCADE, related_name='settings', to=Firm,
        verbose_name=_(message='Firm')
    )
    period_basis = models.CharField(
        choices=PERIOD_BASIS_CHOICES, default=PERIOD_BASIS_CREATED,
        max_length=32, verbose_name=_(message='Period basis')
    )
    period_depth = models.CharField(
        choices=PERIOD_DEPTH_CHOICES, default=PERIOD_DEPTH_YEAR_MONTH,
        max_length=8, verbose_name=_(message='Period depth')
    )
    categories = models.JSONField(
        blank=True, default=list, verbose_name=_(message='Categories')
    )
    checklist_template = models.JSONField(
        blank=True, default=dict,
        verbose_name=_(message='Checklist template')
    )

    class Meta:
        verbose_name = _(message='Firm settings')
        verbose_name_plural = _(message='Firm settings')

    def __str__(self):
        return 'Settings for {}'.format(self.firm)
