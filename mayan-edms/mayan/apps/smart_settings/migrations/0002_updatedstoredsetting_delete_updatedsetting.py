from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('smart_settings', '0001_initial')
    ]

    operations = [
        migrations.CreateModel(
            name='UpdatedStoredSetting',
            fields=[
                (
                    'id', models.AutoField(
                        auto_created=True, primary_key=True, serialize=False,
                        verbose_name='ID'
                    )
                ),
                (
                    'key', models.CharField(
                        db_index=True, help_text='A unique identifier.',
                        max_length=255, unique=True, verbose_name='Key'
                    )
                ),
                (
                    'value', models.TextField(
                        blank=True, null=True, verbose_name='Value'
                    )
                )
            ],
            options={
                'verbose_name': 'Updated stored setting',
                'verbose_name_plural': 'Updated stored settings'
            },
        ),
        migrations.DeleteModel(name='UpdatedSetting')
    ]
