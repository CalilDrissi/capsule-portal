from django.urls import re_path

from .api_views import (
    APIAccountantDetailView, APIAccountantResetPasswordView,
    APIClientActiveView, APIClientDetailView,
    APIClientDocumentAttachView, APIClientDocumentUploadersView,
    APIClientInviteView,
    APIClientListCreateView, APIClientRequestListCreateView,
    APIClientUserDetailView, APIClientUserListCreateView,
    APIClientUserResetPasswordView, APIDocumentRequestUpdateView,
    APIFirmAccountantCreateView, APIFirmAccountantListView,
    APIFirmActiveView, APIFirmDetailView, APIFirmListCreateView,
    APIFirmSettingsView, APIInviteView, APINotificationListView,
    APINotificationMarkReadView, APIPasswordChangeView, APIPeriodExportView,
    APIWhoAmIView
)

urlpatterns = []

api_urls = [
    re_path(
        route=r'^capsule/whoami/$', name='capsule-whoami',
        view=APIWhoAmIView.as_view()
    ),
    re_path(
        route=r'^capsule/firms/$', name='capsule-firm-list',
        view=APIFirmListCreateView.as_view()
    ),
    re_path(
        route=r'^capsule/firms/(?P<firm_id>[0-9]+)/accountants/$',
        name='capsule-firm-accountant-create',
        view=APIFirmAccountantCreateView.as_view()
    ),
    re_path(
        route=r'^capsule/firms/(?P<firm_id>[0-9]+)/settings/$',
        name='capsule-firm-settings',
        view=APIFirmSettingsView.as_view()
    ),
    re_path(
        route=r'^capsule/firms/(?P<firm_id>[0-9]+)/$',
        name='capsule-firm-detail',
        view=APIFirmDetailView.as_view()
    ),
    re_path(
        route=r'^capsule/firms/(?P<firm_id>[0-9]+)/active/$',
        name='capsule-firm-active',
        view=APIFirmActiveView.as_view()
    ),
    re_path(
        route=r'^capsule/firms/(?P<firm_id>[0-9]+)/accountant-list/$',
        name='capsule-firm-accountant-list',
        view=APIFirmAccountantListView.as_view()
    ),
    re_path(
        route=(
            r'^capsule/firms/(?P<firm_id>[0-9]+)/accountants/'
            r'(?P<user_id>[0-9]+)/reset-password/$'
        ),
        name='capsule-accountant-reset-password',
        view=APIAccountantResetPasswordView.as_view()
    ),
    re_path(
        route=(
            r'^capsule/firms/(?P<firm_id>[0-9]+)/accountants/'
            r'(?P<user_id>[0-9]+)/$'
        ),
        name='capsule-accountant-detail',
        view=APIAccountantDetailView.as_view()
    ),
    re_path(
        route=r'^capsule/clients/$', name='capsule-client-list',
        view=APIClientListCreateView.as_view()
    ),
    re_path(
        route=r'^capsule/clients/(?P<client_id>[0-9]+)/invite/$',
        name='capsule-client-invite',
        view=APIClientInviteView.as_view()
    ),
    re_path(
        route=r'^capsule/clients/(?P<client_id>[0-9]+)/active/$',
        name='capsule-client-active',
        view=APIClientActiveView.as_view()
    ),
    re_path(
        route=(
            r'^capsule/clients/(?P<client_id>[0-9]+)/users/'
            r'(?P<user_id>[0-9]+)/reset-password/$'
        ),
        name='capsule-client-user-reset-password',
        view=APIClientUserResetPasswordView.as_view()
    ),
    re_path(
        route=(
            r'^capsule/clients/(?P<client_id>[0-9]+)/users/'
            r'(?P<user_id>[0-9]+)/$'
        ),
        name='capsule-client-user-detail',
        view=APIClientUserDetailView.as_view()
    ),
    re_path(
        route=r'^capsule/clients/(?P<client_id>[0-9]+)/users/$',
        name='capsule-client-user-list',
        view=APIClientUserListCreateView.as_view()
    ),
    re_path(
        route=(
            r'^capsule/clients/(?P<client_id>[0-9]+)/document-uploaders/$'
        ),
        name='capsule-client-document-uploaders',
        view=APIClientDocumentUploadersView.as_view()
    ),
    re_path(
        route=r'^capsule/clients/(?P<client_id>[0-9]+)/documents/attach/$',
        name='capsule-client-document-attach',
        view=APIClientDocumentAttachView.as_view()
    ),
    re_path(
        route=r'^capsule/clients/(?P<client_id>[0-9]+)/$',
        name='capsule-client-detail',
        view=APIClientDetailView.as_view()
    ),
    re_path(
        route=r'^capsule/invite/(?P<token>[A-Za-z0-9_\-]+)/$',
        name='capsule-invite', view=APIInviteView.as_view()
    ),
    re_path(
        route=r'^capsule/password-change/$', name='capsule-password-change',
        view=APIPasswordChangeView.as_view()
    ),
    re_path(
        route=r'^capsule/clients/(?P<client_id>[0-9]+)/requests/$',
        name='capsule-client-request-list',
        view=APIClientRequestListCreateView.as_view()
    ),
    re_path(
        route=r'^capsule/requests/(?P<request_id>[0-9]+)/$',
        name='capsule-request-update',
        view=APIDocumentRequestUpdateView.as_view()
    ),
    re_path(
        route=(
            r'^capsule/clients/(?P<client_id>[0-9]+)/periods/'
            r'(?P<period_key>[0-9A-Za-z\-]+)/export/$'
        ),
        name='capsule-period-export',
        view=APIPeriodExportView.as_view()
    ),
    re_path(
        route=r'^capsule/notifications/$', name='capsule-notification-list',
        view=APINotificationListView.as_view()
    ),
    re_path(
        route=r'^capsule/notifications/mark-read/$',
        name='capsule-notification-mark-read',
        view=APINotificationMarkReadView.as_view()
    )
]
