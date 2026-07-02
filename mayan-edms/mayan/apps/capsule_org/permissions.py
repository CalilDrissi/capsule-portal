from django.utils.translation import gettext_lazy as _

from mayan.apps.permissions.classes import PermissionNamespace

namespace = PermissionNamespace(
    label=_(message='Capsule organization'), name='capsule_org'
)

permission_capsule_firm_manage = namespace.add_permission(
    label=_(message='Manage firms and accountants'),
    name='capsule_firm_manage'
)
permission_capsule_client_manage = namespace.add_permission(
    label=_(message='Manage clients'), name='capsule_client_manage'
)
