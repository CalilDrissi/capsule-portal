from django.utils.translation import gettext_lazy as _

from mayan.apps.app_manager.apps import MayanAppConfig


class CapsuleOrgApp(MayanAppConfig):
    app_namespace = 'capsule_org'
    app_url = 'capsule'
    has_rest_api = True
    has_tests = True
    name = 'mayan.apps.capsule_org'
    verbose_name = _(message='Capsule organization')

    def ready(self):
        super().ready()

        from django.apps import apps
        from django.contrib.auth import get_user_model
        from django.db.models.signals import pre_save

        from mayan.apps.documents.signals import (
            signal_post_document_file_upload
        )

        from .handlers import (
            handler_auto_grant_document_acl,
            handler_enforce_firm_user_not_privileged,
            handler_enforce_membership_user_not_privileged
        )

        DocumentFile = apps.get_model(
            app_label='documents', model_name='DocumentFile'
        )
        FirmMembership = apps.get_model(
            app_label='capsule_org', model_name='FirmMembership'
        )
        User = get_user_model()

        signal_post_document_file_upload.connect(
            dispatch_uid='capsule_org_handler_auto_grant_document_acl',
            receiver=handler_auto_grant_document_acl,
            sender=DocumentFile
        )

        # Enforce the staff/superuser isolation invariant on firm users. A
        # firm user (one with a FirmMembership) must never be staff/superuser,
        # since that bypasses every Mayan ACL. Signals (not a DB constraint) to
        # avoid a migration and to cover both save paths.
        pre_save.connect(
            dispatch_uid='capsule_org_enforce_firm_user_not_privileged',
            receiver=handler_enforce_firm_user_not_privileged,
            sender=User
        )
        pre_save.connect(
            dispatch_uid='capsule_org_enforce_membership_user_not_privileged',
            receiver=handler_enforce_membership_user_not_privileged,
            sender=FirmMembership
        )
