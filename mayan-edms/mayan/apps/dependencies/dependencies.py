from mayan.apps.dependencies.environments import (
    environment_build, environment_production
)
from mayan.literals import PYTHON_PACKAGING_VERSION

from .classes import PythonDependency

PythonDependency(
    environments=(environment_production,), module=__name__,
    name='node-semver', version_string='==0.9.0'
)
PythonDependency(
    environments=(environment_build,), module=__name__, name='packaging',
    version_string='=={}'.format(PYTHON_PACKAGING_VERSION)
)
