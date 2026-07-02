from mayan.apps.dependencies.classes import PythonDependency
from mayan.apps.dependencies.environments import environment_documentation

PythonDependency(
    environments=(environment_documentation,), module=__name__,
    name='docutils', version_string='==0.21.2'
)
PythonDependency(
    environments=(environment_documentation,), module=__name__,
    name='Sphinx', version_string='==9.1.0'
)
PythonDependency(
    environments=(environment_documentation,), module=__name__,
    name='sphinx-sitemap', version_string='==2.9.0'
)
PythonDependency(
    environments=(environment_documentation,), module=__name__,
    name='sphinx_rtd_theme', version_string='==3.1.0'
)
PythonDependency(
    environments=(environment_documentation,), module=__name__,
    name='sphinxcontrib-spelling', version_string='==8.0.2'
)
