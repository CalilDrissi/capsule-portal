from django.http import Http404
from django.utils.translation import gettext_lazy as _

from mayan.apps.views.generics import SingleObjectListView

from ..icons import (
    icon_setting_cluster_namespace_list, icon_setting_namespace_detail
)
from ..permissions import permission_settings_view
from ..setting_clusters import setting_cluster


class SettingNamespaceDetailView(SingleObjectListView):
    view_icon = icon_setting_namespace_detail
    view_permission = permission_settings_view

    def get_extra_context(self):
        namespace = self.get_namespace()

        return {
            'hide_object': True,
            'object': namespace,
            'subtitle': _(
                message='Settings inherited from an environment variable '
                'take precedence and cannot be changed in this view. '
            ),
            'title': _(message='Settings in namespace: %s') % namespace
        }

    def get_namespace(self):
        try:
            return setting_cluster.get_namespace(
                name=self.kwargs['namespace_name']
            )
        except KeyError:
            raise Http404(
                _(message='Namespace: %s, not found') % self.kwargs[
                    'namespace_name'
                ]
            )

    def get_source_queryset(self):
        setting_namespace = self.get_namespace()
        return setting_namespace.get_setting_list()


class SettingNamespaceListView(SingleObjectListView):
    extra_context = {
        'hide_link': True,
        'title': _(message='Setting namespaces')
    }
    view_icon = icon_setting_cluster_namespace_list
    view_permission = permission_settings_view

    def get_source_queryset(self):
        return setting_cluster.get_namespace_list()
