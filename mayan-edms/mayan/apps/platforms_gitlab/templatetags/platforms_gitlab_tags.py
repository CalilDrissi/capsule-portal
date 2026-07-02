from django.template import Library

import mayan
from mayan.apps.dependencies.versions import Version
from mayan.apps.platforms.utils import yaml_dump
from mayan.literals import LINUX_PACKAGES_DEBIAN_PUSH

DEFAULT_APK_CACHE_PATH = '.cache/apk'
DEFAULT_APT_CACHE_PATH = '.cache/apt'
DEFAULT_PIP_CACHE_PATH = '.cache/pip'

register = Library()


@register.simple_tag(name='platforms_gitlab_ci_cache_before_script')
def tag_platforms_gitlab_ci_cache_before_script(
    indent, apk=False, apt=False, pip=False
):
    data = []

    if apk:
        data.extend(
            [
                'echo ${APK_CACHE_DIR}',
                'mkdir -p ${APK_CACHE_DIR}',
                'rm -f /etc/apk/cache',
                'ln -s ${APK_CACHE_DIR} /etc/apk/cache',
                'apk update'
            ]
        )

    if apt:
        data.extend(
            [
                'export APT_STATE_LISTS=${APT_CACHE_DIR}/lists && export APT_CACHE_ARCHIVES=${APT_CACHE_DIR}/archives',
                'mkdir -p "${APT_STATE_LISTS}/partial" && mkdir -p "${APT_CACHE_ARCHIVES}/partial"',
                'printf "dir::state::lists    ${APT_STATE_LISTS};\\ndir::cache::archives    ${APT_CACHE_ARCHIVES};\\n" > /etc/apt/apt.conf.d/99gitlab-ci-cache',
                'if [ "${APT_PROXY}" ]; then echo "Acquire::http { Proxy \\"http://${APT_PROXY}\\"; };" > /etc/apt/apt.conf.d/01proxy; fi',
                'apt-get update'
            ]
        )

    if pip:
        data.extend(
            [
                'mkdir -p ${PIP_CACHE_DIR}'
            ]
        )

    return yaml_dump(data=data, indent=indent)


@register.simple_tag(name='platforms_gitlab_ci_cache_paths')
def tag_platforms_gitlab_ci_cache_paths(
    indent, apk=False, apt=False, pip=False
):
    cache_list = []
    apk_cache_path = DEFAULT_APK_CACHE_PATH
    apt_cache_path = DEFAULT_APT_CACHE_PATH
    pip_cache_path = DEFAULT_PIP_CACHE_PATH

    version_base = Version(version_string=mayan.__version__)
    version_upstream = Version(
        version_string=version_base.as_upstream()
    )
    version_final = version_upstream.as_minor()

    if apk:
        cache_list.append(
            {
                'key': 'apk-cache-{}'.format(version_final),
                'paths': [apk_cache_path]
            }
        )

    if apt:
        cache_list.append(
            {
                'key': 'apt-cache-{}'.format(version_final),
                'paths': [apt_cache_path]
            }
        )

    if pip:
        cache_list.append(
            {
                'key': 'pip-cache-{}'.format(version_final),
                'paths': [pip_cache_path]
            }
        )

    return yaml_dump(data=cache_list, indent=indent)


@register.simple_tag(name='platforms_gitlab_ci_cache_variables')
def tag_platforms_gitlab_ci_cache_variables(
    indent, apk=False, apt=False, pip=False
):
    apk_cache_path = DEFAULT_APK_CACHE_PATH
    apt_cache_path = DEFAULT_APT_CACHE_PATH
    pip_cache_path = DEFAULT_PIP_CACHE_PATH
    variables = {}

    if apk:
        variables['APK_CACHE_DIR'] = f'${{CI_PROJECT_DIR}}/{apk_cache_path}'

    if apt:
        variables['APT_CACHE_DIR'] = f'${{CI_PROJECT_DIR}}/{apt_cache_path}'

    if pip:
        variables['PIP_CACHE_DIR'] = f'${{CI_PROJECT_DIR}}/{pip_cache_path}'

    return yaml_dump(data=variables, indent=indent)


@register.simple_tag(name='platforms_gitlab_ci_ssh_before_script')
def tag_platforms_gitlab_ci_ssh_before_script(indent, hostname, private_key):
    data = [
        'mkdir --parents ~/.ssh',
        'chmod 700 ~/.ssh',
        'echo "{}" > ~/.ssh/known_hosts'.format(hostname),
        'chmod 644 ~/.ssh/known_hosts',
        '\'which ssh-agent || ( apt-get update --yes && apt-get install --yes --no-install-recommends {debian_packages} )\''.format(debian_packages=LINUX_PACKAGES_DEBIAN_PUSH),
        'eval $(ssh-agent -s)',
        'echo "{}" | tr -d \'\\r\' | ssh-add - > /dev/null'.format(private_key)
    ]

    return yaml_dump(data=data, indent=indent)
