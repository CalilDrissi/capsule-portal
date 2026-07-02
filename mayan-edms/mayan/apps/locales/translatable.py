from django.utils.text import format_lazy


def join_translatable(items, separator):
    if not items:
        return ''

    format_string = separator.join(
        ['{}'] * len(items)
    )
    return format_lazy(format_string, *items)
