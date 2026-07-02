import os

import yaml

from django.utils.translation import gettext_lazy as _

from mayan.apps.common.serialization import yaml_load

from ..domains import SettingDomain
from ..exceptions import SettingsDomainError
from ..utils import get_environment_variable_full_name


class SettingDomainEnvironmentVariable(SettingDomain):
    name = 'environment_variable'

    @staticmethod
    def deserialize_stream(stream):
        return yaml_load(stream=stream)

    @classmethod
    def do_key_remove(cls, key):
        os.environ.pop(key)

    @classmethod
    def get_key_value(cls, key):
        key_full_path = get_environment_variable_full_name(name=key)
        environment_value = os.environ[key_full_path]

        try:
            value = cls.deserialize_stream(stream=environment_value)
        except yaml.YAMLError as exception:
            raise SettingsDomainError(
                _(
                    message='Error interpreting environment variable: %s '
                    'with value: %s; %s'
                ) % (key, environment_value, exception)
            ) from exception
        else:
            return value
