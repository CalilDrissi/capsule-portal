from rest_framework import serializers

from .models import CapsuleNotification, Client, DocumentRequest, Firm
from .models.firm_models import PERIOD_BASIS_CHOICES, PERIOD_DEPTH_CHOICES


class FirmSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            'id', 'name', 'slug', 'accountant_group_id',
            'accountant_role_id', 'document_type_id',
            'document_date_metadata_type_id', 'category_metadata_type_id',
            'index_template_id', 'workflow_id'
        )
        model = Firm
        read_only_fields = fields


class FirmCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)


class AccountantCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(
        max_length=255, style={'input_type': 'password'}
    )
    full_name = serializers.CharField(
        allow_blank=True, max_length=150, required=False
    )


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            'id', 'firm_id', 'user_id', 'display_name', 'cabinet_id',
            'client_role_id', 'client_group_id', 'must_change_password'
        )
        model = Client
        read_only_fields = fields


class ClientCreateSerializer(serializers.Serializer):
    firm_id = serializers.IntegerField()
    display_name = serializers.CharField(max_length=255)
    username = serializers.CharField(
        allow_blank=True, max_length=150, required=False
    )


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
