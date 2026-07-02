from django.utils.translation import gettext_lazy as _

from mayan.apps.dependencies.classes import JavaScriptDependency
from mayan.apps.dependencies.environments import environment_production

JavaScriptDependency(
    environments=(environment_production,),
    label=_(message='JavaScript image cropper'), module=__name__,
    name='cropperjs', version_string='=1.6.2'
)
JavaScriptDependency(
    environments=(environment_production,), module=__name__,
    name='jquery-cropper', version_string='=1.0.2'
)
