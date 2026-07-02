from mayan.apps.dependencies.classes import JavaScriptDependency
from mayan.apps.dependencies.environments import environment_production

JavaScriptDependency(
    environments=(environment_production,), module=__name__,
    name='@highlightjs/cdn-assets', version_string='=11.11.1'
)
