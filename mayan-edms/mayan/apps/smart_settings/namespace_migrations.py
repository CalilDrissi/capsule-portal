import re


class SettingNamespaceMigration:
    @staticmethod
    def get_method_name(setting):
        return setting.global_name.lower()

    def __init__(self, namespace):
        self.namespace = namespace

    def get_method_name_full(self, setting, version):
        method_name = self.get_method_name(setting=setting)

        return '{}_{}'.format(method_name, version)

    def do_setting_migrate(self, setting):
        namespace = self.namespace
        cluster = setting.get_cluster()

        namespace_version_previous, namespace_version = cluster.get_namespace_version_list(
            namespace=namespace
        )

        if namespace_version_previous != namespace_version:
            setting_method_name = SettingNamespaceMigration.get_method_name(
                setting=setting
            )

            # Get methods for this setting.
            pattern = r'{}_\d{{4}}'.format(setting_method_name)
            setting_methods = re.findall(
                pattern=pattern, string='\n'.join(
                    dir(self)
                )
            )

            # Get order of execution of setting methods.
            version_list = [
                method.replace(
                    '{}_'.format(setting_method_name), ''
                ) for method in setting_methods
            ]

            try:
                start = version_list.index(namespace_version_previous)
            except ValueError:
                start = 0

            try:
                end = version_list.index(namespace.version)
            except ValueError:
                end = None

            value = setting.value

            for version in version_list[start:end]:
                method = getattr(
                    self, self.get_method_name_full(
                        setting=setting, version=version
                    ), None
                )
                if method:
                    value = method(value=value)

            setting.do_value_override(value=value)
