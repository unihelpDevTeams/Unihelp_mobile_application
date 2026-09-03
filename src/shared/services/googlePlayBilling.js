import { Platform } from 'react-native';
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';
import Constants from 'expo-constants';
import { getJson, postJson } from './backend';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
const productIds = String(extra.EXPO_PUBLIC_GOOGLE_PLAY_PRODUCT_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export const GOOGLE_PLAY_PRODUCT_IDS = productIds;

const assertAndroid = () => {
  if (Platform.OS !== 'android') throw new Error('Google Play subscriptions are available on Android only.');
  if (!GOOGLE_PLAY_PRODUCT_IDS.length) throw new Error('Google Play products are not configured.');
};

export const loadGooglePlayProducts = async () => {
  assertAndroid();
  await initConnection();
  return fetchProducts({ skus: GOOGLE_PLAY_PRODUCT_IDS, type: 'subs' });
};

const verifyAndFinish = async (purchase) => {
  const purchaseToken = purchase?.purchaseToken;
  if (!purchaseToken || !GOOGLE_PLAY_PRODUCT_IDS.includes(purchase.productId)) {
    throw new Error('Google Play returned an unsupported purchase.');
  }
  const result = await postJson('/api/subscriptions/google/verify', {
    purchaseToken,
    productId: purchase.productId,
  });
  await finishTransaction({ purchase, isConsumable: false });
  return result;
};

export const purchaseGoogleSubscription = async (productId) => {
  assertAndroid();
  if (!GOOGLE_PLAY_PRODUCT_IDS.includes(productId)) throw new Error('Unsupported subscription plan.');
  await initConnection();

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      purchaseSubscription.remove();
      errorSubscription.remove();
    };
    const complete = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const purchaseSubscription = purchaseUpdatedListener(async (purchase) => {
      try {
        const result = await verifyAndFinish(purchase);
        complete(resolve, result);
      } catch (error) {
        complete(reject, error);
      }
    });
    const errorSubscription = purchaseErrorListener((error) => {
      const message = String(error?.message || '').toLowerCase();
      complete(reject, new Error(message.includes('cancel') ? 'Payment was cancelled.' : 'Google Play could not complete the purchase.'));
    });

    requestPurchase({
      type: 'subs',
      request: { google: { skus: [productId] } },
    }).catch((error) => complete(reject, error));
  });
};

export const restoreGooglePurchases = async () => {
  assertAndroid();
  await initConnection();
  const purchases = await getAvailablePurchases();
  const relevant = purchases.filter((purchase) => GOOGLE_PLAY_PRODUCT_IDS.includes(purchase.productId));
  const verified = [];
  for (const purchase of relevant) {
    verified.push(await verifyAndFinish(purchase));
  }
  return verified;
};

export const getGoogleSubscriptionStatus = () => getJson('/api/subscriptions/google/status');