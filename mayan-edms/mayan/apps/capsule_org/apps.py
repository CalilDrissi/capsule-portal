from django.utils.translation import gettext_lazy as _

from mayan.apps.app_manager.apps import MayanAppConfig


class CapsuleOrgApp(MayanAppConfig):
    app_namespace = 'capsule_org'
    app_url = 'capsule'
    has_rest_api = True
    has_tests = False
    name = 'mayan.apps.capsule_org'
    verbose_name = _(message='Capsule organization')

    def ready(self):
        super().ready()

        from django.apps import apps

        from mayan.apps.documents.signals import (
            signal_post_document_file_upload
        )

        from .handlers import handler_auto_grant_document_acl

        DocumentFile = apps.get_model(
            app_label='documents', model_name='DocumentFile'
        )

        signal_post_document_file_upload.connect(
            dispatch_uid='capsule_org_handler_auto_grant_document_acl',
            receiver=handler_auto_grant_document_acl,
            sender=DocumentFile
        )
