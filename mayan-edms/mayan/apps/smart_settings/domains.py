class SettingDomain:
    label = None
    name = None

    @classmethod
    def do_cache_invalidate(cls):
        return

    @classmethod
    def do_make_persistent(cls, data, kwargs=None):
        """
        Store the value of settings to they recoverable in the next boot up.
        """

    @classmethod
    def do_key_remove(cls, key):
        """
        Remove all traces of a value.
        """

    @classmethod
    def do_key_revert(cls, key):
        """
        Revert a single setting to a previous value.
        """

    @classmethod
    def do_key_update_value_pending(cls, key, value):
        """
        Set a new value for a single global name.
        """

    @classmethod
    def do_ready(cls, data):
        """
        Domain actions to perform after the cluster has loaded.
        """

    @classmethod
    def do_revert(cls):
        """
        Revert the entire domain to a previous state.
        """

    # Getters

    @classmethod
    def get_key_value(cls, key):
        """
        Return the value of a key.
        """
        raise KeyError

    @classmethod
    def get_key_value_pending(cls, key):
        """
        Return the pending value of a key.
        """
        raise KeyError
