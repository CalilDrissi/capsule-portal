from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('documents', '0091_fix_documenttype_verbose_name'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL)
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='favoritedocument', unique_together={
                ('document', 'user')
            }
        )
    ]
