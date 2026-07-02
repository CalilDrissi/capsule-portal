from django.core import management

from ...setting_clusters import setting_cluster


class Command(management.BaseCommand):
    help = 'Rollback the configuration file to the last valid version.'

    def handle(self, *args, **options):
        try:
            setting_cluster.do_revert()
        except Exception as exception:
            self.stderr.write(
                msg=self.style.NOTICE(
                    str(exception)
                )
            )
            exit(1)
