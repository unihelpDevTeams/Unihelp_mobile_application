import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { postJson, sendAppNotification } from './backend';

export const PREMIUM_PLAN = {
  id: 'student-premium',
  name: 'Student Premium',
  monthly: 1000,
  yearly: 10000,
  features: [
    'Voice messages in chat',
    'Past question downloads',
    'Lecture note downloads',
    'Verified student badge',
    'Higher AI response limit',
    'Reduced ads experience',
    'Up to 10 hostel and 10 product uploads',
    'Early access to new tools',
  ],
};

export const COMMERCE_UPLOAD_LIMITS = {
  free: 5,
  premium: 10,
};

export const getPremiumAmount = (billing) => (billing === 'yearly' ? PREMIUM_PLAN.yearly : PREMIUM_PLAN.monthly);

export const getSubscriptionExpiry = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getDaysLeft = (expiresAt) => {
  const expiry = getSubscriptionExpiry(expiresAt);
  if (!expiry) return null;
  const diff = expiry.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const isPremiumActive = (profile = {}) => {
  if (!profile?.premium) return false;

  const status = String(profile.subscriptionStatus || '').trim().toLowerCase();
  if (status === 'expired') return false;

  const expiry = getSubscriptionExpiry(
    profile.subscriptionExpiresAt ||
      profile.premiumExpiresAt ||
      profile.expiresAt
  );

  return !expiry || expiry.getTime() > Date.now();
};

const parseReturnUrl = (url = '') => {
  if (!url) return {};
  const parsed = Linking.parse(url);
  return parsed.queryParams || {};
};

export async function startPremiumCheckout({ user, profile, billing }) {
  if (!user?.uid) {
    throw new Error('Please login first.');
  }

  const returnUrl = Linking.createURL('/premium');
  const init = await postJson('/api/payments/initialize-premium', {
    userId: user.uid,
    email: user.email || profile?.email || '',
    name: profile?.username || user.displayName || 'UniHelp Student',
    billing,
    plan: PREMIUM_PLAN.id,
    redirectUrl: returnUrl,
  });

  if (!init.paymentLink) {
    throw new Error('Payment link was not returned.');
  }

  const result = await WebBrowser.openAuthSessionAsync(init.paymentLink, returnUrl);
  if (result.type !== 'success') {
    throw new Error('Payment was cancelled.');
  }

  const query = parseReturnUrl(result.url);
  const status = String(query.status || '').toLowerCase();
  const transactionId = query.transaction_id || query.transactionId;

  if (status && status !== 'successful' && status !== 'completed') {
    throw new Error('Payment was not successful.');
  }

  if (!transactionId) {
    throw new Error('Missing transaction id from payment provider.');
  }

  const paymentResult = await postJson('/api/payments/verify-payment', {
    transaction_id: transactionId,
    userId: user.uid,
    plan: PREMIUM_PLAN.id,
    billing,
    amount: init.amount,
  });

  try {
    await sendAppNotification({
      userIds: [user.uid],
      title: 'Premium activated',
      body: 'Your premium access is now active.',
      type: 'payment',
      category: 'Payment',
      url: '/premium',
    });
  } catch (notificationError) {
    console.log('Premium push notification failed:', notificationError);
  }

  return paymentResult;
}
