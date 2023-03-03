# Copyright (c) 2023, DjaoDjin inc.
# see LICENSE

from __future__ import absolute_import

from extended_templates.extras import AccountMixinBase
from rules.extras import AppMixinBase
from saas.extras import OrganizationMixinBase
from signup.helpers import update_context_urls

from ..compat import reverse


class ExtraMixin(AppMixinBase, AccountMixinBase, OrganizationMixinBase):

    def get_organization(self):
        from saas.utils import get_organization_model # to avoid import loops
        return get_organization_model().objects.attached(self.user)

    def get_context_data(self, **kwargs):
        context = super(ExtraMixin, self).get_context_data(**kwargs)

        self.update_context_urls(context, {
            'user': {
                # The following are copy/pasted
                # from `signup.UserProfileView`
                # to be used in the personal profile page.
                'api_generate_keys': reverse(
                    'api_generate_keys', args=(self.user,)),
                'api_profile': reverse(
                    'api_user_profile', args=(self.user,)),
                'api_password_change': reverse(
                    'api_user_password_change', args=(self.user,)),
                'api_contact': reverse(
                    'api_contact', args=(self.user.username,)), #XXX
                'api_pubkey': reverse(
                    'api_pubkey', args=(self.user,)),
                'password_change': reverse(
                    'password_change', args=(self.user,)),
                'keys_update': reverse(
                    'pubkey_update', args=(self.user,)),
                # For sidebar menu items on personal profiles.
                'accessibles': reverse(
                    'saas_user_product_list', args=(self.user,)),
                'notifications': reverse(
                    'users_notifications', args=(self.user,)),
                'profile': reverse('users_profile', args=(self.user,)),
        }})

        organization = self.get_organization()
        if not organization or not organization.is_broker:
            if 'urls' in context:
                if 'theme_update' in context['urls']:
                    del context['urls']['theme_update']
                if 'rules' in context['urls']:
                    del context['urls']['rules']

        if organization and not organization.is_broker:
            # A broker does not have subscriptions.

            # Duplicate code from `saas.extras.OrganizationMixinBase` since
            # it does not get inherited in the context of a `UserMixin`.
            update_context_urls(context, {
                'organization': {
                    'billing': reverse(
                        'saas_billing_info', args=(organization,)),
                    'subscriptions': reverse(
                        'saas_subscription_list', args=(organization,)),
                }})

        return context
