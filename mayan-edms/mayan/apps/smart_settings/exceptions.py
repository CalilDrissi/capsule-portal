class SettingsException(Exception):
    """
    Base exception for the smart_settings app.
    """


class SettingsDomainError(SettingsException):
    """
    Raised when a domain can't read or set a setting's value.
    """
