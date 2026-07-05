"""
Tests for the staff/superuser isolation invariant.

The whole Capsule tenancy model assumes firm users (accountants and clients)
are never `is_staff`/`is_superuser`, because staff/superuser bypass every
Mayan ACL and would therefore see every firm's documents. These tests assert:

  (a) provisioned client and accountant users are non-staff/non-superuser;
  (b) the guard rejects flipping a firm user to staff/superuser, and rejects
      attaching a membership to an already-privileged account;
  (c) the guard does NOT interfere with ordinary (non-firm) superusers.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.test import TestCase

from ..models import Firm, FirmMembership
from ..models.firm_models import MEMBERSHIP_KIND_ACCOUNTANT
from ..services import provisioning

User = get_user_model()


class IsolationInvariantTestCase(TestCase):
    def _make_firm(self):
        firm = Firm.objects.create(name='Test Firm', slug='test-firm')
        firm.accountant_group = Group.objects.create(
            name='firm:test-firm:accountant'
        )
        firm.save(update_fields=['accountant_group'])
        return firm

    def test_provisioned_accountant_is_not_privileged(self):
        firm = self._make_firm()
        user, membership = provisioning.create_accountant(
            firm=firm, username='acct', password='Sup3rSecret!pw'
        )
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(membership.kind, MEMBERSHIP_KIND_ACCOUNTANT)

    def test_provisioned_client_is_not_privileged(self):
        firm = self._make_firm()
        client, username, password = provisioning.provision_client(
            firm=firm, display_name='Acme Ltd'
        )
        self.assertFalse(client.user.is_staff)
        self.assertFalse(client.user.is_superuser)

    def test_guard_rejects_flipping_firm_user_to_staff(self):
        firm = self._make_firm()
        user, membership = provisioning.create_accountant(
            firm=firm, username='acct2', password='Sup3rSecret!pw'
        )

        user.is_staff = True
        with self.assertRaises(ValidationError):
            user.save()

        # And the flag must not have persisted.
        user.refresh_from_db()
        self.assertFalse(user.is_staff)

    def test_guard_rejects_flipping_firm_user_to_superuser(self):
        firm = self._make_firm()
        user, membership = provisioning.create_accountant(
            firm=firm, username='acct3', password='Sup3rSecret!pw'
        )

        user.is_superuser = True
        with self.assertRaises(ValidationError):
            user.save()

        user.refresh_from_db()
        self.assertFalse(user.is_superuser)

    def test_guard_rejects_membership_for_privileged_user(self):
        firm = self._make_firm()
        admin = User.objects.create(
            username='platform_admin', is_superuser=True
        )
        with self.assertRaises(ValidationError):
            FirmMembership.objects.create(
                firm=firm, user=admin, kind=MEMBERSHIP_KIND_ACCOUNTANT
            )

    def test_ordinary_superuser_without_membership_is_allowed(self):
        # The guard must never block createsuperuser / platform admins.
        admin = User.objects.create(
            username='root', is_staff=True, is_superuser=True
        )
        admin.refresh_from_db()
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
