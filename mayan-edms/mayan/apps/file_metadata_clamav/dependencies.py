from django.utils.translation import gettext_lazy as _

from mayan.apps.dependencies.classes import BinaryDependency
from mayan.apps.dependencies.environments import environment_production

from .drivers import ClamScanDriver

arguments = ClamScanDriver.get_argument_values_from_settings()

BinaryDependency(
    environments=(environment_production,),
    help_text=_(message='Command line anti-virus scanner.'), module=__name__,
    name='clamscan', path=arguments['path_clamscan']
)
