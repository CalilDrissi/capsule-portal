import logging
import secrets

from django.apps import apps
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    CapsuleNotification, Client, DocumentRequest, Firm, FirmMembership
)
from .models.firm_models import MEMBERSHIP_KIND_ACCOUNTANT
from .serializers import (
    AccountantCreateSerializer, CapsuleNotificationSerializer,
    ClientCreateSerializer, ClientSerializer, DocumentRequestCreateSerializer,
    DocumentRequestSerializer, DocumentRequestUpdateSerializer,
    FirmCreateSerializer, FirmSerializer, FirmSettingsSerializer,
    PasswordChangeSerializer, validate_capsule_password
)
from rest_framework.exceptions import ValidationError as DRFValidationError
from .services import (
    export, index_builder, metadata_builder, notifications, provisioning
)

logger = logging.getLogger(name=__name__)


class APIWhoAmIView(APIView):
    """
    get: Return the Capsule firm/role context for the requesting user.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        user = request.user

        data = {
            'user': {'id': user.pk, 'username': user.get_username()},
            'firm': None, 'role': None, 'client_id': None,
            'must_change_password': False,
            # Upload context for clients/accountants. Clients can't list
            # /document_types/ or /sources/ (no permission), so whoami resolves
            # them server-side to let the scoped upload self-configure.
            'document_type_id': None, 'source_id': None,
            'category_metadata_type_id': None,
            'document_date_metadata_type_id': None,
            # The firm's configurable category list, so the scoped upload
            # dropdown can show real categories instead of a static list.
            'categories': []
        }

        if user.is_superuser or user.is_staff:
            data['role'] = 'platform'

        membership = FirmMembership.objects.filter(
            user=user
        ).select_related('firm').first()

        if membership:
            firm = membership.firm
            data['firm'] = {'id': firm.pk, 'name': firm.name}
            data['role'] = membership.kind
            data['document_type_id'] = firm.document_type_id
            data['category_metadata_type_id'] = firm.category_metadata_type_id
            data['document_date_metadata_type_id'] = (
                firm.document_date_metadata_type_id
            )
            data['source_id'] = self._resolve_source_id()
            firm_settings = getattr(firm, 'settings', None)
            if firm_settings is not None:
                data['categories'] = list(firm_settings.categories or [])

        client = Client.objects.filter(user=user).first()
        if client:
            data['client_id'] = client.pk
            data['must_change_password'] = client.must_change_password

        return Response(data=data)

    @staticmethod
    def _resolve_source_id():
        # The interactive web-form source the client was granted
        # `document_create` on at provisioning. There is a single shared
        # web-form source in a default install; pick the first enabled one.
        Source = apps.get_model(app_label='sources', model_name='Source')
        source = Source.objects.filter(
            enabled=True, backend_path__icontains='webform'
        ).first() or Source.objects.filter(enabled=True).first()
        return source.pk if source else None


class APIFirmListCreateView(APIView):
    """
    get: List firms (platform admin).
    post: Create a firm (platform admin only).
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(status=status.HTTP_403_FORBIDDEN)

        serializer = FirmSerializer(
            instance=Firm.objects.all(), many=True
        )
        return Response(data=serializer.data)

    def post(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                data={'detail': 'Superuser required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = FirmCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        firm = provisioning.create_firm(
            actor=request.user, name=serializer.validated_data['name']
        )

        return Response(
            data=FirmSerializer(instance=firm).data,
            status=status.HTTP_201_CREATED
        )


class APIFirmAccountantCreateView(APIView):
    """
    post: Create an accountant user for a firm (platform admin, or an
    accountant of that firm).
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, firm_id, *args, **kwargs):
        firm = get_object_or_404(queryset=Firm.objects.all(), pk=firm_id)

        if not _can_manage_firm(user=request.user, firm=firm):
            return Response(
                data={'detail': 'Not permitted for this firm.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AccountantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, membership = provisioning.create_accountant(
            actor=request.user, firm=firm,
            full_name=serializer.validated_data.get('full_name', ''),
            password=serializer.validated_data['password'],
            username=serializer.validated_data['username']
        )

        return Response(
            data={
                'user': {'id': user.pk, 'username': user.get_username()},
                'firm_id': firm.pk, 'membership_id': membership.pk
            }, status=status.HTTP_201_CREATED
        )


class APIClientListCreateView(APIView):
    """
    get: List clients of the firms the requesting accountant belongs to.
    post: Provision a client (accountant of the target firm).
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        if request.user.is_superuser:
            queryset = Client.objects.all()
        else:
            firm_ids = FirmMembership.objects.filter(
                kind=MEMBERSHIP_KIND_ACCOUNTANT, user=request.user
            ).values_list('firm_id', flat=True)
            queryset = Client.objects.filter(firm_id__in=firm_ids)

        serializer = ClientSerializer(instance=queryset, many=True)
        return Response(data=serializer.data)

    def post(self, request, *args, **kwargs):
        serializer = ClientCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        firm = get_object_or_404(
            queryset=Firm.objects.all(),
            pk=serializer.validated_data['firm_id']
        )

        if not _can_manage_firm(user=request.user, firm=firm):
            return Response(
                data={'detail': 'Must be an accountant of this firm.'},
                status=status.HTTP_403_FORBIDDEN
            )

        client, temp_username, temp_password = provisioning.provision_client(
            actor=request.user,
            display_name=serializer.validated_data['display_name'],
            firm=firm,
            username=serializer.validated_data.get('username') or None
        )

        return Response(
            data={
                'client': ClientSerializer(instance=client).data,
                'temp_username': temp_username,
                'temp_password': temp_password,
                'invite_token': client.invite_token,
                'invite_path': (
                    '/invite/{}'.format(client.invite_token)
                    if client.invite_token else None
                )
            }, status=status.HTTP_201_CREATED
        )


class APIClientInviteView(APIView):
    """
    post: (Re)generate the client's one-time invite token and return the
    relative invite path + the client's username. Accountant of the client's
    firm (or platform) only.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, client_id, *args, **kwargs):
        client = get_object_or_404(
            queryset=Client.objects.select_related('firm'), pk=client_id
        )
        if not _can_manage_firm(user=request.user, firm=client.firm):
            return Response(
                data={'detail': 'Must be an accountant of this firm.'},
                status=status.HTTP_403_FORBIDDEN
            )

        client.invite_token = secrets.token_urlsafe(nbytes=32)
        client.invite_created = timezone.now()
        client.save(update_fields=('invite_token', 'invite_created'))

        return Response(
            data={
                'invite_token': client.invite_token,
                'invite_path': '/invite/{}'.format(client.invite_token),
                'username': client.user.get_username()
            }
        )


class APIInviteView(APIView):
    """
    PUBLIC (no auth). A client completes account setup via their one-time
    invite link.

    get: Return only display info for a valid, unconsumed token
         {firm_name, display_name, username}; 404 otherwise.
    post: Body {password}; set the client user's password, clear
          must_change_password, and CONSUME the token (one-time use).
          404 for an invalid/used token.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def _get_client(self, token):
        if not token:
            return None
        return Client.objects.select_related('firm', 'user').filter(
            invite_token=token
        ).first()

    def get(self, request, token, *args, **kwargs):
        client = self._get_client(token=token)
        if client is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(
            data={
                'firm_name': client.firm.name,
                'display_name': client.display_name,
                'username': client.user.get_username()
            }
        )

    def post(self, request, token, *args, **kwargs):
        client = self._get_client(token=token)
        if client is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        password = (request.data or {}).get('password')
        # Enforce the shared Capsule password policy (min length + Django's
        # configured validators) on invite completion, same as accountant
        # creation and password change.
        try:
            validate_capsule_password(password)
        except DRFValidationError as exception:
            return Response(
                data={'detail': exception.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = client.user
        user.set_password(raw_password=password)
        user._event_ignore = True
        user.save(update_fields=('password',))

        client.must_change_password = False
        client.invite_token = None
        client.invite_created = None
        client.save(
            update_fields=(
                'must_change_password', 'invite_token', 'invite_created'
            )
        )

        return Response(data={'username': user.get_username()})


class APIFirmSettingsView(APIView):
    """
    get: Return the firm's grouping config {period_basis, period_depth,
    categories[]} (accountant of the firm or platform).
    patch: Update grouping config. A change to period_basis/period_depth
    rebuilds the firm's period IndexTemplate; a change to categories rewrites
    the firm's Category metadata-type choices.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request, firm_id, *args, **kwargs):
        firm = get_object_or_404(queryset=Firm.objects.all(), pk=firm_id)
        if not _can_manage_firm(user=request.user, firm=firm):
            return Response(
                data={'detail': 'Not permitted for this firm.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return Response(data=self._serialize(firm=firm))

    def patch(self, request, firm_id, *args, **kwargs):
        firm = get_object_or_404(queryset=Firm.objects.all(), pk=firm_id)
        if not _can_manage_firm(user=request.user, firm=firm):
            return Response(
                data={'detail': 'Not permitted for this firm.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = FirmSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        FirmSettings = apps.get_model(
            app_label='capsule_org', model_name='FirmSettings'
        )
        firm_settings, _created = FirmSettings.objects.get_or_create(firm=firm)

        index_changed = False
        if 'period_basis' in data and (
            data['period_basis'] != firm_settings.period_basis
        ):
            firm_settings.period_basis = data['period_basis']
            index_changed = True
        if 'period_depth' in data and (
            data['period_depth'] != firm_settings.period_depth
        ):
            firm_settings.period_depth = data['period_depth']
            index_changed = True

        categories_changed = False
        if 'categories' in data and (
            list(data['categories']) != list(firm_settings.categories or [])
        ):
            firm_settings.categories = list(data['categories'])
            categories_changed = True

        # Persist the settings and apply their side effects (index rebuild,
        # category rewrite) as one unit. If the index rebuild fails partway it
        # leaves template/instance nodes inconsistent, so we roll the whole
        # thing back — the saved settings included — rather than half-apply and
        # report success. The caller gets a clear 500 instead of a traceback.
        try:
            with transaction.atomic():
                firm_settings.save()

                # Refresh the cached related object so the index/category
                # builders read the freshly-saved settings.
                firm = Firm.objects.get(pk=firm.pk)

                if index_changed and firm.index_template_id:
                    index_builder.rebuild_period_index(
                        firm=firm, user=request.user
                    )
                if categories_changed:
                    metadata_builder.update_firm_category_choices(
                        firm=firm, categories=firm_settings.categories
                    )
        except Exception as exception:
            logger.error(
                'capsule_org: firm settings update failed for firm %s; the '
                'index rebuild or category rewrite raised, so no changes were '
                'saved. %s', firm.pk, exception, exc_info=True
            )
            return Response(
                data={
                    'detail': (
                        'Failed to apply settings: the period index rebuild '
                        'did not complete. No changes were saved; the firm '
                        'retains its previous settings and index.'
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Re-read outside the transaction so the response reflects committed
        # state.
        firm = Firm.objects.get(pk=firm.pk)
        return Response(data=self._serialize(firm=firm))

    @staticmethod
    def _serialize(firm):
        firm_settings = getattr(firm, 'settings', None)
        return {
            'period_basis': getattr(firm_settings, 'period_basis', None),
            'period_depth': getattr(firm_settings, 'period_depth', None),
            'categories': list(getattr(firm_settings, 'categories', None) or [])
        }


class APIPasswordChangeView(APIView):
    """
    post: Change the authenticated user's password. Body:
    {current_password?, new_password}. If the user is a Capsule Client, the
    `must_change_password` flag is cleared on success.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        current_password = serializer.validated_data.get(
            'current_password', ''
        )
        new_password = serializer.validated_data['new_password']

        # If a current password is supplied, it must be correct. Clients on
        # first login (must_change_password) may omit it.
        client = Client.objects.filter(user=user).first()
        require_current = not (client and client.must_change_password)

        if current_password:
            if not user.check_password(raw_password=current_password):
                return Response(
                    data={'detail': 'Current password is incorrect.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif require_current:
            return Response(
                data={'detail': 'Current password is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(raw_password=new_password)
        user.save(update_fields=['password'])

        if client and client.must_change_password:
            client.must_change_password = False
            client.save(update_fields=['must_change_password'])

        return Response(
            data={'detail': 'Password changed.'}, status=status.HTTP_200_OK
        )


class APIClientRequestListCreateView(APIView):
    """
    get: List the document requests for a client. Visible to the client and
    to accountants of the client's firm.
    post: Create a document request (accountant of the client's firm only).
    Body: {period_key?, category?, note?}.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request, client_id, *args, **kwargs):
        client = get_object_or_404(
            queryset=Client.objects.select_related('firm'), pk=client_id
        )
        if not _can_access_client(user=request.user, client=client):
            return Response(
                data={'detail': 'Not permitted for this client.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = DocumentRequestSerializer(
            instance=client.document_requests.all(), many=True
        )
        return Response(data=serializer.data)

    def post(self, request, client_id, *args, **kwargs):
        client = get_object_or_404(
            queryset=Client.objects.select_related('firm'), pk=client_id
        )
        # Only an accountant of the client's firm may create a request.
        if not _can_manage_firm(user=request.user, firm=client.firm):
            return Response(
                data={'detail': 'Must be an accountant of this firm.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = DocumentRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        document_request = DocumentRequest.objects.create(
            firm=client.firm, client=client,
            period_key=data.get('period_key', '') or '',
            category=data.get('category', '') or '',
            requested_by=request.user
        )

        try:
            notifications.notify_client_of_request(
                document_request=document_request
            )
        except Exception:
            pass

        return Response(
            data=DocumentRequestSerializer(instance=document_request).data,
            status=status.HTTP_201_CREATED
        )


class APIDocumentRequestUpdateView(APIView):
    """
    patch: Update a document request's status. The client may mark their own
    request fulfilled; an accountant of the firm may mark any of the firm's
    requests fulfilled. Body: {status}.
    """
    permission_classes = (IsAuthenticated,)

    def patch(self, request, request_id, *args, **kwargs):
        document_request = get_object_or_404(
            queryset=DocumentRequest.objects.select_related('client', 'firm'),
            pk=request_id
        )
        if not _can_access_client(
            user=request.user, client=document_request.client
        ):
            return Response(
                data={'detail': 'Not permitted for this request.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = DocumentRequestUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_request.status = serializer.validated_data['status']
        document_request.save(update_fields=['status'])

        return Response(
            data=DocumentRequestSerializer(instance=document_request).data
        )


class APINotificationListView(APIView):
    """
    get: List the requesting user's Capsule notifications (most recent first).
    Query param `unread=1` filters to unread.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        queryset = CapsuleNotification.objects.filter(user=request.user)
        if request.query_params.get('unread') in ('1', 'true', 'True'):
            queryset = queryset.filter(read=False)
        queryset = queryset[:50]
        serializer = CapsuleNotificationSerializer(
            instance=queryset, many=True
        )
        unread = CapsuleNotification.objects.filter(
            user=request.user, read=False
        ).count()
        return Response(
            data={'unread_count': unread, 'results': serializer.data}
        )


class APINotificationMarkReadView(APIView):
    """
    post: Mark the requesting user's notifications read. Body {id} marks one;
    empty body marks all of the user's notifications read.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        queryset = CapsuleNotification.objects.filter(user=request.user)
        notification_id = request.data.get('id')
        if notification_id is not None:
            queryset = queryset.filter(pk=notification_id)
        updated = queryset.update(read=True)
        return Response(data={'updated': updated})


class APIPeriodExportView(APIView):
    """
    post: Stream back a zip of a client+period's documents' latest files,
    ACL-checked for the requester. Accountant of the client's firm (or the
    client) only.
    """
    permission_classes = (IsAuthenticated,)

    def post(self, request, client_id, period_key, *args, **kwargs):
        client = get_object_or_404(
            queryset=Client.objects.select_related('firm', 'cabinet'),
            pk=client_id
        )
        if not _can_access_client(user=request.user, client=client):
            return Response(
                data={'detail': 'Not permitted for this client.'},
                status=status.HTTP_403_FORBIDDEN
            )

        zip_bytes, count = export.build_period_zip(
            client=client, period_key=period_key, user=request.user
        )

        if count == 0:
            return Response(
                data={'detail': 'No documents found for this period.'},
                status=status.HTTP_404_NOT_FOUND
            )

        response = HttpResponse(
            content=zip_bytes, content_type='application/zip'
        )
        filename = 'capsule_{}_{}.zip'.format(client.pk, period_key)
        response['Content-Disposition'] = (
            'attachment; filename="{}"'.format(filename)
        )
        return response


def _can_manage_firm(user, firm):
    if user.is_superuser:
        return True
    return FirmMembership.objects.filter(
        firm=firm, kind=MEMBERSHIP_KIND_ACCOUNTANT, user=user
    ).exists()


def _can_access_client(user, client):
    """
    True if `user` is the client themselves, or an accountant of the client's
    firm, or a superuser. The membership/ownership scope that keeps
    client-vs-client and firm-vs-firm isolation intact on these endpoints.
    """
    if user.is_superuser:
        return True
    if client.user_id == user.pk:
        return True
    return _can_manage_firm(user=user, firm=client.firm)
