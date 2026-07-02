from django.urls import re_path

from .api_views import (
    APIClientInviteView, APIClientListCreateView,
    APIClientRequestListCreateView, APIDocumentRequestUpdateView,
    APIFirmAccountantCreateView, APIFirmListCreateView, APIFirmSettingsView,
    APIInviteView, APINotificationListView, APINotificationMarkReadView,
    APIPasswordChangeView, APIPeriodExportView, APIWhoAmIView
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
        route=r'^capsule/clients/$', name='capsule-client-list',
        view=APIClientListCreateView.as_view()
    ),
    re_path(
        route=r'^capsule/clients/(?P<client_id>[0-9]+)/invite/$',
        name='capsule-client-invite',
        view=APIClientInviteView.as_view()
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
