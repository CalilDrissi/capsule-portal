from django.utils.crypto import get_random_string

from .literals import DEFAULT_PASSWORD_LENGTH


def get_random_password(length=DEFAULT_PASSWORD_LENGTH):
    return get_random_string(length=length)
