from decimal import Decimal
import math

from django.template import Library

register = Library()


def _process_value(value):
    """
    Normalize template values into numeric Python types.

    Behavior:
    - Pass through int, float, Decimal values unchanged.
    - Parse strings (with surrounding whitespace trimmed) as int first,
      then float.
    - Raise ValueError for empty or non-numeric strings.
    - Raise TypeError for unsupported types.
    """
    if value is None:
        raise ValueError('Invalid numeric value: None.')

    if isinstance(value, (int, float, Decimal)):
        return value

    if isinstance(value, str):
        value = value.strip()

        if value == '':
            raise ValueError('Invalid numeric value: empty string.')

        try:
            return int(value)
        except ValueError:
            try:
                return float(value)
            except ValueError as exception:
                raise ValueError(
                    'Invalid numeric value: {!r}.'.format(value)
                ) from exception

    raise TypeError(
        'Unsupported numeric value type: {}.'.format(
            type(value).__name__
        )
    )


@register.filter(name='math_add')
def filter_math_add(value, argument):
    """
    Mathematical addition. {{ |math_add:addend }}
    """
    addends = _process_value(value=value), _process_value(value=argument)
    result = addends[0] + addends[1]
    return result


@register.filter(name='math_absolute')
def filter_math_absolute(value):
    """
    Mathematical absolute. {{ |math_absolute }}
    """
    value = _process_value(value=value)
    result = abs(value)
    return result


@register.filter(name='math_ceil')
def filter_math_ceil(value):
    """
    Mathematical ceil. {{ |math_ceil }}
    """
    number = _process_value(value=value)
    result = math.ceil(number)
    return result


@register.filter(name='math_divide')
def filter_math_divide(value, argument):
    """
    Mathematical division. {{ |math_divide:divisor }}
    """
    dividend = _process_value(value=value)
    divisor = _process_value(value=argument)
    quotient = dividend / divisor
    return quotient


@register.filter(name='math_exponentiate')
def fitler_math_exponentiate(value, argument):
    """
    Mathematical exponentiation. {{ |math_exponentiate:power }}
    """
    base = _process_value(value=value)
    exponent = _process_value(value=argument)
    power = base ** exponent
    return power


@register.filter(name='math_floor')
def filter_math_floor(value):
    """
    Mathematical floor. {{ |math_floor }}
    """
    number = _process_value(value=value)
    result = math.floor(number)
    return result


@register.filter(name='math_floor_divide')
def filter_math_floor_divide(value, argument):
    """
    Mathematical floor division. {{ |math_floor_divide:divisor }}
    """
    dividend = _process_value(value=value)
    divisor = _process_value(value=argument)
    quotient = dividend // divisor
    return quotient


@register.filter(name='math_integer')
def filter_math_integer(value):
    """
    Mathematical integer conversion. {{ |math_integer }}
    """
    number = _process_value(value=value)
    result = int(number)
    return result


@register.filter(name='math_maximum')
def filter_math_maximum(value, argument):
    """
    Mathematical maximum. {{ |math_maximum:second }}
    """
    first = _process_value(value=value)
    second = _process_value(value=argument)
    result = max(first, second)
    return result


@register.filter(name='math_minimum')
def filter_math_minimum(value, argument):
    """
    Mathematical minimum. {{ |math_minimum:second }}
    """
    first = _process_value(value=value)
    second = _process_value(value=argument)
    result = min(first, second)
    return result


@register.filter(name='math_modulo')
def filter_math_modulo(value, argument):
    """
    Mathematical modulo. {{ |math_modulo:divisor }}
    """
    dividend = _process_value(value=value)
    divisor = _process_value(value=argument)
    modulus = dividend % divisor
    return modulus


@register.filter(name='math_multiply')
def filter_math_multiply(value, argument):
    """
    Mathematical multiplication. {{ |math_multiply:multiplier }}
    """
    multiplicand = _process_value(value=value)
    multiplier = _process_value(value=argument)
    product = multiplicand * multiplier
    return product


@register.simple_tag(name='math_percent')
def tag_math_percent(value, total, digits=2, default=0):
    """
    Mathematical percentage as (value / total) * 100.
    Zero-safe: If total == 0, returns `default`.
    {% math_percent value total digits=2 default=0 %}
    """
    numerator = _process_value(value=value)
    denominator = _process_value(value=total)
    default_processed = _process_value(value=default)
    digits_processed = _process_value(value=digits)

    if denominator == 0:
        return default_processed

    percentage = (numerator / denominator) * 100
    result = round(percentage, digits_processed)
    return result


@register.filter(name='math_round')
def filter_math_round(value, argument=None):
    """
    Mathematical rounding. {{ |math_round:digits }}
    """
    number = _process_value(value=value)
    if argument is not None:
        digits = _process_value(value=argument)
    else:
        digits = argument

    result = round(number, digits)
    return result


@register.filter(name='math_square_root')
def filter_math_square_root(value):
    """
    Mathematical square root. {{ |math_square_root }}
    """
    radicand = _process_value(value=value)
    square_root = math.sqrt(radicand)
    return square_root


@register.filter(name='math_subtract')
def filter_math_subtract(value, argument):
    """
    Mathematical subtraction. {{ |math_subtract:subtrahend }}
    """
    minuend = _process_value(value=value)
    subtrahend = _process_value(value=argument)
    difference = minuend - subtrahend
    return difference


@register.filter(name='math_substract')
def filter_math_substract(parser, token):
    """
    Mathematical subtraction (compatibility alias)
    """
    return filter_math_subtract(parser, token)
