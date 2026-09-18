import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getJson, postJson } from './backend';

const parseReturnUrl = (url = '') => {
  if (!url) return {};
  const parsed = Linking.parse(url);
  return parsed.queryParams || {};
};

export const formatSponsorshipPrice = (plan = {}) => {
  const amount = Number(plan.amountNaira ?? (Number(plan.amount || 0) / 100));
  if (!Number.isFinite(amount)) return '';
  return `₦${amount.toLocaleString()}`;
};

export async function fetchMarketplaceSponsorshipPlans() {
  const result = await getJson('/api/marketplace/sponsorship/plans');
  return result.plans || [];
}

export async function fetchMarketplaceSponsorships(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.listingId) query.set('listingId', params.listingId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const result = await getJson(`/api/marketplace/sponsorships${suffix}`);
  return result.items || [];
}

export async function startMarketplaceSponsorshipCheckout({ listingId, planId }) {
  if (!listingId || !planId) {
    throw new Error('Choose a sponsorship plan first.');
  }

  const returnUrl = Linking.createURL(`/view/listing/${listingId}`);
  const init = await postJson(`/api/marketplace/${encodeURIComponent(listingId)}/sponsorship`, {
    planId,
    redirectUrl: returnUrl,
  });

  const payload = init.data || init;
  if (!payload.paymentLink || !payload.sponsorship?.id) {
    throw new Error('Payment link was not returned.');
  }

  const result = await WebBrowser.openAuthSessionAsync(payload.paymentLink, returnUrl);
  if (result.type !== 'success') {
    return { status: 'pending', sponsorship: payload.sponsorship };
  }

  const query = parseReturnUrl(result.url);
  const status = String(query.status || '').toLowerCase();
  const transactionId = query.transaction_id || query.transactionId;

  if (status && status !== 'successful' && status !== 'completed') {
    throw new Error('Payment was not successful.');
  }

  if (!transactionId) {
    return { status: 'pending', sponsorship: payload.sponsorship };
  }

  const verified = await postJson(`/api/marketplace/sponsorships/${encodeURIComponent(payload.sponsorship.id)}/verify`, {
    transaction_id: transactionId,
  });

  return {
    status: 'active',
    sponsorship: verified.data?.sponsorship || verified.sponsorship,
  };
}
