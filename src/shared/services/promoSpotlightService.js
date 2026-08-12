import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../../firebase/config';
import { COLLECTIONS } from '../firestoreSchema';

const SEEN_STORAGE_KEY = '@unihelp_seenPromoSpotlights';
const PROMO_TYPES = new Set(['external_ad', 'unihelp_promotion', 'announcement']);
const ACTION_TYPES = new Set(['none', 'external_url', 'screen', 'deep_link']);

const toDateMs = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const normalizePromoSpotlight = (item = {}) => ({
  ...item,
  type: PROMO_TYPES.has(item.type) ? item.type : 'announcement',
  actionType: ACTION_TYPES.has(item.actionType) ? item.actionType : 'none',
  title: String(item.title || '').trim(),
  description: String(item.description || '').trim(),
  imageUrl: String(item.imageUrl || item.creativeUrl || '').trim(),
  buttonText: String(item.buttonText || '').trim(),
  actionUrl: String(item.actionUrl || '').trim(),
  advertiserName: String(item.advertiserName || '').trim(),
  advertiserLogoUrl: String(item.advertiserLogoUrl || '').trim(),
  priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : 0,
  enabled: item.enabled === true,
});

export const isPromoActive = (promo, now = Date.now()) => {
  if (!promo || promo.enabled !== true) return false;
  const startMs = toDateMs(promo.startAt);
  const endMs = toDateMs(promo.endAt);
  if (startMs && startMs > now) return false;
  if (endMs && endMs < now) return false;
  return true;
};

export async function fetchActivePromoSpotlights({ pageSize = 20 } = {}) {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.promoSpotlights),
      where('enabled', '==', true)
    )
  );

  return snapshot.docs
    .map((entry) => normalizePromoSpotlight({ id: entry.id, ...entry.data() }))
    .filter((promo) => isPromoActive(promo))
    .sort((left, right) => {
      if (right.priority !== left.priority) return right.priority - left.priority;
      const rightCreated = toDateMs(right.createdAt) || 0;
      const leftCreated = toDateMs(left.createdAt) || 0;
      return rightCreated - leftCreated;
    })
    .slice(0, pageSize);
}

export async function getSeenPromoSpotlightIds() {
  try {
    const raw = await AsyncStorage.getItem(SEEN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function markPromoSpotlightSeen(id) {
  if (!id) return;
  const seen = await getSeenPromoSpotlightIds();
  const next = Array.from(new Set([...seen, id])).slice(-100);
  await AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next));
}

export async function fetchNextPromoSpotlight() {
  const [promos, seenIds] = await Promise.all([
    fetchActivePromoSpotlights(),
    getSeenPromoSpotlightIds(),
  ]);
  const seen = new Set(seenIds);
  return promos.find((promo) => promo?.id && !seen.has(promo.id)) || null;
}

const emptyToNull = (value) => {
  const text = String(value || '').trim();
  return text || null;
};

const writeDateValue = (value) => {
  const text = emptyToNull(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed);
};

const normalizeWritePayload = (payload = {}) => ({
  type: PROMO_TYPES.has(payload.type) ? payload.type : 'announcement',
  title: String(payload.title || '').trim(),
  description: String(payload.description || '').trim(),
  imageUrl: String(payload.imageUrl || '').trim(),
  imageAsset: payload.imageAsset || null,
  buttonText: String(payload.buttonText || '').trim(),
  actionType: ACTION_TYPES.has(payload.actionType) ? payload.actionType : 'none',
  actionUrl: String(payload.actionUrl || '').trim(),
  advertiserName: String(payload.advertiserName || '').trim(),
  advertiserLogoUrl: String(payload.advertiserLogoUrl || '').trim(),
  enabled: payload.enabled === true,
  priority: Number.isFinite(Number(payload.priority)) ? Number(payload.priority) : 0,
  startAt: writeDateValue(payload.startAt),
  endAt: writeDateValue(payload.endAt),
  targetAudience: payload.targetAudience || 'all',
});

export async function fetchPromoSpotlightsForAdmin() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.promoSpotlights));
  return snapshot.docs
    .map((entry) => normalizePromoSpotlight({ id: entry.id, ...entry.data() }))
    .sort((left, right) => right.priority - left.priority);
}

export async function fetchPromoSpotlightStats(promoIds = []) {
  const ids = Array.from(new Set(promoIds.filter(Boolean)));
  if (!ids.length) return {};

  const chunks = [];
  for (let index = 0; index < ids.length; index += 30) {
    chunks.push(ids.slice(index, index + 30));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, COLLECTIONS.promoSpotlightEvents), where('promoId', 'in', chunk)))
    )
  );

  return snapshots.reduce((stats, snapshot) => {
    snapshot.docs.forEach((entry) => {
      const event = entry.data();
      if (!event?.promoId) return;
      const current = stats[event.promoId] || { impressions: 0, clicks: 0, dismissals: 0, ctr: 0 };
      if (event.eventType === 'promo_impression') current.impressions += 1;
      if (event.eventType === 'promo_click') current.clicks += 1;
      if (event.eventType === 'promo_dismiss') current.dismissals += 1;
      current.ctr = current.impressions ? Math.round((current.clicks / current.impressions) * 1000) / 10 : 0;
      stats[event.promoId] = current;
    });
    return stats;
  }, {});
}

export async function createPromoSpotlight(payload = {}) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const ref = await addDoc(collection(db, COLLECTIONS.promoSpotlights), {
    ...normalizeWritePayload(payload),
    createdBy: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function updatePromoSpotlight(id, payload = {}) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  if (!id) throw new Error('Missing promotion id');
  await updateDoc(doc(db, COLLECTIONS.promoSpotlights, id), {
    ...normalizeWritePayload(payload),
    updatedBy: auth.currentUser.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePromoSpotlight(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  if (!id) throw new Error('Missing promotion id');
  await deleteDoc(doc(db, COLLECTIONS.promoSpotlights, id));
}

export async function trackPromoSpotlightEvent(eventName, promo) {
  if (!promo?.id || !['promo_impression', 'promo_click', 'promo_dismiss'].includes(eventName)) return;

  try {
    await addDoc(collection(db, COLLECTIONS.promoSpotlightEvents), {
      promoId: promo.id,
      eventType: eventName,
      promoType: promo.type || 'announcement',
      userId: auth.currentUser?.uid || null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.log('PromoSpotlight analytics skipped:', error?.message);
  }
}
