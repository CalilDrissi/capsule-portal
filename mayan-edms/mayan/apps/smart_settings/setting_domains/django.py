from django.conf import settings

from ..domains import SettingDomain


class SettingDomainDjango(SettingDomain):
    name = 'django'

    @classmethod
    def do_key_remove(cls, key):
        delattr(settings, key)

    @classmethod
    def get_key_value(cls, key):
        try:
            value = getattr(settings, key)
        except AttributeError:
            raise KeyError
        else:
            return value
