from mayan.apps.dependencies.classes import PythonDependency
from mayan.apps.dependencies.environments import environment_production

PythonDependency(
    environments=(environment_production,), module=__name__,
    name='django-stronghold', version_string='==0.4.0'
)
PythonDependency(
    environments=(environment_production,), module=__name__, name='furl',
    version_string='==2.1.4'
)
