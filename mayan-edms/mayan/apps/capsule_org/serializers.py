from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers

from .models import CapsuleNotification, Client, DocumentRequest, Firm
from .models.firm_models import PERIOD_BASIS_CHOICES, PERIOD_DEPTH_CHOICES
from .services.metadata_builder import category_is_safe

# Minimum length for any Capsule-set password (accountant creation, client
# invite completion, and password change). Enforced alongside Django's
# configured password validators.
MINIMUM_PASSWORD_LENGTH = 10


def validate_capsule_password(value):
    """
    Server-side password policy shared by every Capsule password entry point:
    a minimum length plus Django's configured `AUTH_PASSWORD_VALIDATORS`.
    Raises `serializers.ValidationError` (→ HTTP 400) on failure.
    """
    if not value or len(value) < MINIMUM_PASSWORD_LENGTH:
        raise serializers.ValidationError(
            "Le mot de passe doit contenir au moins {} caractères.".format(
                MINIMUM_PASSWORD_LENGTH
            )
        )
    try:
        validate_password(password=value)
    except DjangoValidationError as exception:
        raise serializers.ValidationError(list(exception.messages))
    return value


class FirmSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            'id', 'name', 'slug', 'accountant_group_id',
            'accountant_role_id', 'document_type_id',
            'document_date_metadata_type_id', 'category_metadata_type_id',
            'index_template_id', 'workflow_id', 'contact_email', 'is_active',
            'logo'
        )
        model = Firm
        read_only_fields = fields


class FirmCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)

    def validate_name(self, value):
        # Firm.name is unique; validate here so a duplicate returns HTTP 400
        # with a clear message instead of an IntegrityError 500.
        if Firm.objects.filter(name=value).exists():
            raise serializers.ValidationError(
                "Un cabinet portant ce nom existe déjà."
            )
        return value


class FirmUpdateSerializer(serializers.Serializer):
    """
    PATCH a firm's editable details. Both fields optional/partial. `name`
    uniqueness is validated excluding the firm being edited.
    """
    name = serializers.CharField(max_length=255, required=False)
    contact_email = serializers.EmailField(
        allow_blank=True, required=False
    )
    # Data: URI (resized client-side); allow empty to clear the logo.
    logo = serializers.CharField(allow_blank=True, required=False)

    def validate_name(self, value):
        queryset = Firm.objects.filter(name=value)
        instance = getattr(self, 'instance', None)
        if instance is not None:
            queryset = queryset.exclude(pk=instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "Un cabinet portant ce nom existe déjà."
            )
        return value


class AccountantCreateSerializer(serializers.Serializer):
    # Optional: blank -> the provisioning service auto-generates a unique
    # username from the accountant's name (matches client provisioning).
    username = serializers.CharField(
        allow_blank=True, default='', max_length=150, required=False
    )
    password = serializers.CharField(
        max_length=255, style={'input_type': 'password'}
    )
    full_name = serializers.CharField(
        allow_blank=True, max_length=150, required=False
    )

    def validate_password(self, value):
        return validate_capsule_password(value)


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            'id', 'firm_id', 'user_id', 'display_name', 'cabinet_id',
            'client_role_id', 'client_group_id', 'must_change_password',
            'company_name', 'contact_name', 'contact_email', 'contact_phone',
            'address', 'tax_id', 'notes', 'is_active', 'logo'
        )
        model = Client
        read_only_fields = fields


class ClientCreateSerializer(serializers.Serializer):
    firm_id = serializers.IntegerField()
    display_name = serializers.CharField(max_length=255)
    username = serializers.CharField(
        allow_blank=True, max_length=150, required=False
    )


class ClientUpdateSerializer(serializers.Serializer):
    """
    PATCH a client's editable business details. All fields optional/partial.
    """
    display_name = serializers.CharField(max_length=255, required=False)
    company_name = serializers.CharField(
        allow_blank=True, max_length=255, required=False
    )
    contact_name = serializers.CharField(
        allow_blank=True, max_length=255, required=False
    )
    contact_email = serializers.EmailField(allow_blank=True, required=False)
    contact_phone = serializers.CharField(
        allow_blank=True, max_length=64, required=False
    )
    address = serializers.CharField(allow_blank=True, required=False)
    tax_id = serializers.CharField(
        allow_blank=True, max_length=128, required=False
    )
    notes = serializers.CharField(allow_blank=True, required=False)
    # Data: URI (resized client-side); allow empty to clear the logo.
    logo = serializers.CharField(allow_blank=True, required=False)


class ClientUserSerializer(serializers.Serializer):
    """A login belonging to a client company (read-only projection)."""
    id = serializers.IntegerField()
    user_id = serializers.IntegerField()
    username = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    is_primary = serializers.BooleanField()
    has_invite = serializers.SerializerMethodField()

    def get_username(self, instance):
        return instance.user.get_username()

    def get_first_name(self, instance):
        return instance.user.first_name

    def get_is_active(self, instance):
        return instance.user.is_active

    def get_has_invite(self, instance):
        return bool(instance.invite_token)


class AddClientUserSerializer(serializers.Serializer):
    full_name = serializers.CharField(
        allow_blank=True, max_length=150, required=False
    )
    username = serializers.CharField(
        allow_blank=True, max_length=150, required=False
    )


class ResetPasswordSerializer(serializers.Serializer):
    """
    Reset a login's password either by setting one directly (`mode=password`)
    or by minting a fresh one-time invite link (`mode=link`).
    """
    mode = serializers.ChoiceField(choices=('password', 'link'))
    password = serializers.CharField(
        max_length=255, required=False, style={'input_type': 'password'}
    )

    def validate(self, attrs):
        if attrs['mode'] == 'password':
            validate_capsule_password(attrs.get('password'))
        return attrs


class AccountantSerializer(serializers.Serializer):
    """An accountant login of a firm (read-only projection)."""
    user_id = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    def get_user_id(self, instance):
        return instance.user_id

    def get_username(self, instance):
        return instance.user.get_username()

    def get_first_name(self, instance):
        return instance.user.first_name

    def get_is_active(self, instance):
        return instance.user.is_active


class FirmSettingsSerializer(serializers.Serializer):
    """
    GET/PATCH the firm's grouping configuration. All fields optional on
    PATCH so callers can update basis/depth/categories independently.
    """
    period_basis = serializers.ChoiceField(
        choices=[choice[0] for choice in PERIOD_BASIS_CHOICES], required=False
    )
    period_depth = serializers.ChoiceField(
        choices=[choice[0] for choice in PERIOD_DEPTH_CHOICES], required=False
    )
    categories = serializers.ListField(
        child=serializers.CharField(max_length=255), required=False
    )

    def validate_categories(self, value):
        # Reject any category that could be interpreted as a Django template
        # once written into the firm's Category MetadataType `lookup` field
        # (Mayan renders that field as a template with a context exposing all
        # platform users/groups — a `{{ users }}` category would leak every
        # firm's usernames and client group names). See
        # metadata_builder.UNSAFE_LOOKUP_SEQUENCES.
        unsafe = [item for item in (value or []) if not category_is_safe(item)]
        if unsafe:
            # NOTE: build the message without str.format()/f-strings — it
            # necessarily names the very brace sequences it forbids, and
            # str.format() would parse those as fields and raise KeyError.
            raise serializers.ValidationError(
                "Les catégories ne peuvent pas contenir de caractères de gabarit "
                "(accolades ou accolades-pourcent). Refusé : "
                + ', '.join(unsafe)
            )
        return value


class DocumentRequestSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            'id', 'firm_id', 'client_id', 'period_key', 'category', 'status',
            'requested_by_id', 'datetime_created'
        )
        model = DocumentRequest
        read_only_fields = fields


class DocumentRequestCreateSerializer(serializers.Serializer):
    period_key = serializers.CharField(
        allow_blank=True, max_length=64, required=False
    )
    category = serializers.CharField(
        allow_blank=True, max_length=255, required=False
    )
    note = serializers.CharField(
        allow_blank=True, max_length=1024, required=False
    )


class DocumentRequestUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=('requested', 'fulfilled'))


class CapsuleNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            'id', 'firm_id', 'kind', 'message', 'document_id', 'read',
            'datetime_created'
        )
        model = CapsuleNotification
        read_only_fields = fields


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        allow_blank=True, max_length=255, required=False,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        max_length=255, style={'input_type': 'password'}
    )

    def validate_new_password(self, value):
        return validate_capsule_password(value)
