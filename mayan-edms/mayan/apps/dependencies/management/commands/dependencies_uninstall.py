from django.core import management
from django.utils.translation import gettext_lazy as _

from ...classes import GoogleFontDependency, JavaScriptDependency


class Command(management.BaseCommand):
    help = 'Uninstall Google Font and JavaScript dependencies.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--app', action='store', dest='app',
            help=_(message='Process a specific app.')
        )

    def handle(self, *args, **options):
        JavaScriptDependency.uninstall_multiple(
            app_label=options['app'], subclass_only=True
        )
        GoogleFontDependency.uninstall_multiple(
            app_label=options['app'], subclass_only=True
        )
