from django.utils.translation import gettext_lazy as _

from mayan.apps.dependencies.classes import BinaryDependency
from mayan.apps.dependencies.environments import environment_production

from .drivers import FileMetadataDriverEXIF

arguments = FileMetadataDriverEXIF.get_argument_values_from_settings()

BinaryDependency(
    environments=(environment_production,), help_text=_(
        message='Library and program to read and write meta information in '
        'multimedia files.'
    ), module=__name__, name='exiftool', path=arguments['exiftool_path']
)
