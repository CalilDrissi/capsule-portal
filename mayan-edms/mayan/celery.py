import os

from django.conf import settings
from django.utils.module_loading import import_string

from mayan.apps.task_manager.settings import setting_celery_app_class

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mayan.settings.production')
celery_class = import_string(dotted_path=setting_celery_app_class.value)
app = celery_class(main='mayan')
app.config_from_object(namespace='CELERY', obj='django.conf:settings')
app.autodiscover_tasks(packages=lambda: settings.INSTALLED_APPS)
