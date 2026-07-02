from mayan.apps.dependencies.classes import JavaScriptDependency
from mayan.apps.dependencies.environments import environment_production

JavaScriptDependency(
    environments=(environment_production,), module=__name__,
    name='jstree', version_string='=3.3.17'
)
