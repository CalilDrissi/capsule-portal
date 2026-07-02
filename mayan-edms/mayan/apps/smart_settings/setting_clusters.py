from .clusters import SettingCluster
from .setting_domains.configuration_files import (
    SettingDomainConfigurationFile
)
from .setting_domains.django import SettingDomainDjango
from .setting_domains.environment_variables import (
    SettingDomainEnvironmentVariable
)
from .setting_domains.models import SettingDomainModel

setting_cluster_primary = SettingCluster(
    domains=(
        (SettingDomainDjango, 10),
        (SettingDomainConfigurationFile, 20),
        (SettingDomainEnvironmentVariable, 30),
        (SettingDomainModel, 40),
    ), name='primary'
)

setting_cluster = setting_cluster_primary
