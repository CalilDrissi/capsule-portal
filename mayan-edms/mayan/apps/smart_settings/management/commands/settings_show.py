from django.core import management

from mayan.apps.common.serialization import yaml_dump

from ...setting_clusters import setting_cluster


class Command(management.BaseCommand):
    help = 'Display the current settings.'

    def add_arguments(self, parser):
        parser.add_argument(
            dest='filter_term', nargs='?', help='Use this term to filter the '
            'list of settings.'
        )

        parser.add_argument(
            '--namespace', action='store', dest='namespace',
            help='Name (not label) of the namespace for which to filter the '
            'list of settings. Names are lowercase with words separated by '
            'underscore.'
        )

    def handle(self, *args, **options):
        data = setting_cluster.get_data(
            filter_term=options.get('filter_term'),
            namespace_name=options.get('namespace')
        )

        data_serialized = yaml_dump(data=data, default_flow_style=False)

        self.stdout.write(msg=data_serialized)
