import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { auth, db } from '../../../firebase/config';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getJson, postJson } from '../services/backend';
import { resolveDocumentAsset } from '../utils/documentMedia';
import { cachedRequest } from '../utils/requestCache';

// ATOMIC STORAGE KEYS (optimized for independent updates)
const LEARNING_STORAGE_KEY = '@unihelp_learning_offline_v2'; // Legacy - kept for migration
const LEGACY_STORAGE_KEY = '@unihelp_learning_offline_v1'; // Legacy
const DOWNLOADS_KEY = '@unihelp_downloads_v3'; // Atomic downloads array
const ENTITLEMENT_KEY = '@unihelp_entitlement_v3'; // Atomic entitlement object
const SYNC_QUEUE_KEY = '@unihelp_syncQueue_v3'; // Atomic sync queue
const PROGRESS_KEY = '@unihelp_progress_v3'; // Atomic progress tracking
const METADATA_KEY = '@unihelp_metadata_v3'; // Atomic metadata

const OFFLINE_ROOT = `${FileSystem.documentDirectory || ''}unihelp-offline/`;
const OFFLINE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

const emptyStore = () => ({
  downloads: [],
  syncQueue: [],
  progress: {
    pastQuestions: {},
    notes: {},
    gpa: {},
  },
  entitlement: null,
  metadata: { lastSyncedAt: null },
});

const ensureStoreShape = (value) => {
  const base = emptyStore();
  if (!value || typeof value !== 'object') return base;
  return {
    ...base,
    ...value,
    downloads: Array.isArray(value.downloads) ? value.downloads : base.downloads,
    syncQueue: Array.isArray(value.syncQueue) ? value.syncQueue : base.syncQueue,
    progress: { ...base.progress, ...(value.progress || {}) },
    entitlement: value.entitlement || base.entitlement,
    metadata: { ...base.metadata, ...(value.metadata || {}) },
  };
};

// Migrate from legacy monolithic storage to atomic keys (runs once)
async function migrateToAtomicStorage() {
  try {
    const hasAtomic = await AsyncStorage.getItem(DOWNLOADS_KEY);
    if (hasAtomic) return; // Already migrated

    const legacyRaw = (await AsyncStorage.getItem(LEARNING_STORAGE_KEY)) || (await AsyncStorage.getItem(LEGACY_STORAGE_KEY));
    if (!legacyRaw) return; // Nothing to migrate

    const legacyStore = ensureStoreShape(JSON.parse(legacyRaw));
    
    // Write each part to atomic keys
    await Promise.all([
      AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(legacyStore.downloads)),
      AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(legacyStore.syncQueue)),
      AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(legacyStore.progress)),
      AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(legacyStore.entitlement)),
      AsyncStorage.setItem(METADATA_KEY, JSON.stringify(legacyStore.metadata)),
    ]);
  } catch {
    // Silent fail - migration issues shouldn't break the app
  }
}

// Read from atomic keys with fallback to legacy
async function readStore() {
  try {
    const [downloads, syncQueue, progress, entitlement, metadata] = await Promise.all([
      AsyncStorage.getItem(DOWNLOADS_KEY),
      AsyncStorage.getItem(SYNC_QUEUE_KEY),
      AsyncStorage.getItem(PROGRESS_KEY),
      AsyncStorage.getItem(ENTITLEMENT_KEY),
      AsyncStorage.getItem(METADATA_KEY),
    ]);

    // If all atomic keys exist, use them
    if (downloads || syncQueue || progress || entitlement || metadata) {
      return {
        downloads: downloads ? JSON.parse(downloads) : [],
        syncQueue: syncQueue ? JSON.parse(syncQueue) : [],
        progress: progress ? JSON.parse(progress) : { pastQuestions: {}, notes: {}, gpa: {} },
        entitlement: entitlement ? JSON.parse(entitlement) : null,
        metadata: metadata ? JSON.parse(metadata) : { lastSyncedAt: null },
      };
    }

    // Fallback to legacy storage
    const legacyRaw = (await AsyncStorage.getItem(LEARNING_STORAGE_KEY)) || (await AsyncStorage.getItem(LEGACY_STORAGE_KEY));
    if (!legacyRaw) return emptyStore();
    
    const store = ensureStoreShape(JSON.parse(legacyRaw));
    // Migrate in background
    migrateToAtomicStorage().catch(() => {});
    return store;
  } catch {
    return emptyStore();
  }
}

// Write individual components to atomic keys (no full store rewrite)
async function writeStore(nextStore) {
  const normalized = ensureStoreShape(nextStore);
  
  // Write each part independently
  await Promise.all([
    AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(normalized.downloads)),
    AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(normalized.syncQueue)),
    AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(normalized.progress)),
    AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(normalized.entitlement)),
    AsyncStorage.setItem(METADATA_KEY, JSON.stringify(normalized.metadata)),
  ]);

  return normalized;
}

// Optimized: Write only downloads without rewriting everything
async function writeDownloads(downloads = []) {
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
  return downloads;
}

// Optimized: Write only entitlement without rewriting everything
async function writeEntitlement(entitlement) {
  await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(entitlement));
  return entitlement;
}

// Optimized: Write only sync queue without rewriting everything
async function writeSyncQueue(syncQueue = []) {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
  return syncQueue;
}

const normalizeType = (type = '') => {
  const value = String(type || '').trim();
  if (['question', 'questions', 'pastQuestion', 'pastQuestions'].includes(value)) return 'pastQuestions';
  if (['note', 'notes', 'studyMaterial', 'studyMaterials'].includes(value)) return 'notes';
  return value || 'resource';
};

const getCurrentUid = () => auth.currentUser?.uid || null;

const isEntitlementUsable = (entitlement, uid = getCurrentUid()) => {
  if (!entitlement?.premium || !uid || entitlement.userId !== uid) return false;
  if (entitlement.expiresAt) {
    const expiry = new Date(entitlement.expiresAt);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= Date.now()) return false;
  }
  const validatedAt = entitlement.lastValidatedAt ? new Date(entitlement.lastValidatedAt) : null;
  if (!validatedAt || Number.isNaN(validatedAt.getTime())) return false;
  return Date.now() - validatedAt.getTime() <= OFFLINE_GRACE_MS;
};

const safeFileName = (value = 'resource.bin') => {
  const name = String(value || 'resource.bin').split(/[\\/]/).pop() || 'resource.bin';
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'resource.bin';
};

const getResourceDirectory = (uid, type, id) =>
  `${OFFLINE_ROOT}${safeFileName(uid)}/resources/${safeFileName(type)}/${safeFileName(String(id))}/`;

async function ensureDirectory(uri) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
}

const withoutRemoteDocumentUrls = (metadata = {}) => {
  const blocked = new Set(['fileUrl', 'pdfUrl', 'downloadUrl', 'url', 'link']);
  return Object.entries(metadata || {}).reduce((acc, [key, value]) => {
    if (blocked.has(key)) return acc;
    if (key === 'files' && Array.isArray(value)) {
      acc.files = value.map((file) => ({
        name: file?.name || file?.fileName || file?.original_filename || '',
        type: file?.type || file?.mimeType || '',
        size: file?.size || 0,
      }));
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};

const MAX_PAYLOAD_BYTES = 900 * 1024;

const safePayloadForStorage = (value) => {
  if (value == null) return value;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= MAX_PAYLOAD_BYTES) return value;
    return null;
  } catch {
    return null;
  }
};

export async function validateOfflineEntitlement({ force = false } = {}) {
  const store = await readStore();
  const uid = getCurrentUid();
  if (!uid) return { premium: false, userId: null, reason: 'auth-required' };
  if (!force && isEntitlementUsable(store.entitlement, uid)) return store.entitlement;

  const online = await checkConnectivity();
  if (!online) return store.entitlement || { premium: false, userId: uid, reason: 'offline-unvalidated' };

  // Use request deduplication to prevent multiple concurrent validation calls
  const cacheKey = `entitlement-validate-${uid}`;
  const data = await cachedRequest(
    cacheKey,
    () => getJson('/api/offline-library/entitlement'),
    10000 // 10 second dedup window
  );
  
  const entitlement = data.entitlement || { premium: false, userId: uid };
  // Only write entitlement, not entire store
  await writeEntitlement(entitlement);
  return entitlement;
}

export async function hasOfflineLibraryAccess() {
  const store = await readStore();
  return isEntitlementUsable(store.entitlement);
}

export async function getOfflineEntitlement() {
  const store = await readStore();
  return store.entitlement;
}

function createDownloadEntry(type, id, payload = {}) {
  const uid = payload.userId || getCurrentUid() || 'offline-user';
  return {
    id: String(id || `${type}-${Date.now()}`),
    type: normalizeType(type),
    userId: uid,
    title: payload.title || payload.meta?.title || 'Offline resource',
    status: payload.status || 'downloaded',
    contentKind: payload.contentKind || 'structured',
    contentVersion: String(payload.contentVersion || '1'),
    downloadedVersion: String(payload.downloadedVersion || payload.contentVersion || '1'),
    downloadedAt: payload.downloadedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: null,
    size: payload.size || 0,
    localReference: payload.localReference || null,
    payload: payload.payload || null,
    meta: payload.meta || {},
  };
}

export async function getDownloadRecords({ includeExpired = true } = {}) {
  const store = await readStore();
  const uid = getCurrentUid();
  const list = uid ? store.downloads.filter((item) => !item.userId || item.userId === uid) : store.downloads;
  if (includeExpired) return [...list];
  return isEntitlementUsable(store.entitlement, uid) ? [...list] : [];
}

export async function getDownloadRecord(type, id) {
  const normalizedType = normalizeType(type);
  const uid = getCurrentUid();
  const store = await readStore();
  return store.downloads.find((item) =>
    item.type === normalizedType &&
    String(item.id) === String(id) &&
    (!uid || !item.userId || item.userId === uid)
  ) || null;
}

export async function setDownloadState(type, id, update = {}) {
  const store = await readStore();
  const normalizedType = normalizeType(type);
  const normalizedId = String(id);
  const uid = update.userId || getCurrentUid() || 'offline-user';
  const sanitizedUpdate = {
    ...update,
    payload: safePayloadForStorage(update.payload),
  };
  const existingIndex = store.downloads.findIndex((item) =>
    item.type === normalizedType &&
    String(item.id) === normalizedId &&
    (!item.userId || item.userId === uid)
  );
  const entry = existingIndex >= 0
    ? { ...store.downloads[existingIndex], ...sanitizedUpdate, updatedAt: new Date().toISOString() }
    : createDownloadEntry(normalizedType, normalizedId, { ...sanitizedUpdate, userId: uid });

  const nextDownloads = [...store.downloads];
  if (existingIndex >= 0) nextDownloads[existingIndex] = entry;
  else nextDownloads.push(entry);

  // Only write downloads, not entire store
  await writeDownloads(nextDownloads);
  return entry;
}

export async function isContentDownloaded(type, id) {
  const item = await getDownloadRecord(type, id);
  return Boolean(item && item.status === 'downloaded');
}

export async function saveResourceForOffline({ resourceType, resourceId, resource = null, fileUrl = '', fileName = '', onProgress } = {}) {
  const type = normalizeType(resourceType);
  const id = String(resourceId || resource?.id || type);
  const uid = getCurrentUid();
  if (!uid) throw new Error('Please sign in to save resources offline.');

  const existing = await getDownloadRecord(type, id);
  if (existing?.status === 'downloaded' && existing.downloadedVersion === String(existing.contentVersion || '1')) {
    return existing;
  }

  await setDownloadState(type, id, {
    userId: uid,
    status: 'saving',
    title: resource?.title || resource?.name || existing?.title || 'Saving resource',
    contentVersion: resource?.contentVersion || existing?.contentVersion || '1',
  });

  try {
    const authResult = await postJson('/api/offline-library/authorize', { resourceType: type, resourceId: id });
    const entitlement = authResult.entitlement;
    const authorized = authResult.resource || {};
    // Only write entitlement, not entire store
    await writeEntitlement(entitlement);
    if (!isEntitlementUsable(entitlement, uid)) throw new Error('Offline Library is available with UniHelp Premium.');

    const title = authorized.title || resource?.title || resource?.name || 'Offline resource';
    const contentVersion = String(authorized.contentVersion || resource?.contentVersion || resource?.version || '1');
    const contentKind = authorized.contentKind || (fileUrl ? 'document' : 'structured');
    const meta = authorized.metadata || resource || {};
    const resolved = resolveDocumentAsset(meta || {});
    const remoteUrl = fileUrl || resolved.directDownloadUrl || resolved.fileUrl || resolved.downloadUrl || '';
    let localReference = null;
    let size = 0;
    let payload = authorized.payload || null;

    if (contentKind === 'document' && remoteUrl) {
      const directory = getResourceDirectory(uid, type, id);
      await ensureDirectory(directory);
      const finalName = safeFileName(fileName || resolved.fileName || `${id}.pdf`);
      localReference = `${directory}${finalName}`;
      const resumable = FileSystem.createDownloadResumable?.(remoteUrl, localReference, {}, ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (typeof onProgress === 'function' && totalBytesExpectedToWrite > 0) {
          onProgress(Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100));
        }
      });
      const result = resumable ? await resumable.downloadAsync() : await FileSystem.downloadAsync(remoteUrl, localReference);
      if (!result?.uri) throw new Error('Save failed.');
      const info = await FileSystem.getInfoAsync(result.uri, { size: true });
      size = info?.size || 0;
      payload = null;
    } else {
      payload = authorized.payload || resource || {};
      size = JSON.stringify(payload || {}).length;
    }

    const safePayload = safePayloadForStorage(payload);
    return setDownloadState(type, id, {
      userId: uid,
      status: 'downloaded',
      title,
      contentKind,
      contentVersion,
      downloadedVersion: contentVersion,
      downloadedAt: new Date().toISOString(),
      size,
      localReference,
      payload: safePayload,
      meta: {
        ...withoutRemoteDocumentUrls(meta),
        title,
        resourceType: type,
        contentKind,
        payloadTruncated: safePayload === null && payload != null,
      },
    });
  } catch (error) {
    await setDownloadState(type, id, { userId: uid, status: 'failed', reason: error?.message || 'Save failed' });
    throw error;
  }
}

export async function removeDownload(type, id) {
  const normalizedType = normalizeType(type);
  const uid = getCurrentUid();
  const store = await readStore();
  const target = store.downloads.find((item) =>
    item.type === normalizedType &&
    String(item.id) === String(id) &&
    (!uid || !item.userId || item.userId === uid)
  );
  if (target?.localReference) {
    await FileSystem.deleteAsync(target.localReference, { idempotent: true }).catch(() => {});
  }
  const nextDownloads = store.downloads.filter((item) =>
    !(item.type === normalizedType && String(item.id) === String(id) && (!uid || !item.userId || item.userId === uid))
  );
  // Only write downloads, not entire store
  await writeDownloads(nextDownloads);
  return nextDownloads;
}

export async function clearOfflineDownloads() {
  const uid = getCurrentUid();
  if (!uid) return [];
  const store = await readStore();
  const keep = [];
  for (const item of store.downloads) {
    if (item.userId === uid) {
      if (item.localReference) await FileSystem.deleteAsync(item.localReference, { idempotent: true }).catch(() => {});
    } else {
      keep.push(item);
    }
  }
  await FileSystem.deleteAsync(`${OFFLINE_ROOT}${safeFileName(uid)}/resources/`, { idempotent: true }).catch(() => {});
  const nextStore = await writeStore({ ...store, downloads: keep });
  return nextStore.downloads;
}

export async function getStoredFormulas() {
  const store = await readStore();
  if (Array.isArray(store.progress.formulas)) return store.progress.formulas;
  const formulaDownloads = store.downloads.filter((item) => item.type === 'formulas' && item.status === 'downloaded');
  const payloads = formulaDownloads.flatMap((item) => Array.isArray(item.payload) ? item.payload : [item.payload].filter(Boolean));
  return payloads.length ? payloads : [];
}

export async function saveStoredFormulas(formulas = []) {
  const store = await readStore();
  const normalized = Array.isArray(formulas) ? formulas : [];
  const next = await writeStore({ ...store, progress: { ...store.progress, formulas: normalized } });
  return next.progress.formulas;
}

export async function queueLearningSync(entry = {}) {
  const store = await readStore();
  const syncItem = {
    id: entry.id || `${entry.type || 'sync'}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: entry.type || 'learning',
    action: entry.action || 'update',
    payload: entry.payload || {},
    status: entry.status || 'queued',
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
    retryCount: entry.retryCount || 0,
  };
  const existingIndex = store.syncQueue.findIndex((item) => item.id === syncItem.id);
  const nextQueue = [...store.syncQueue];
  if (existingIndex >= 0) nextQueue[existingIndex] = syncItem;
  else nextQueue.unshift(syncItem);
  // Only write sync queue, not entire store
  await writeSyncQueue(nextQueue);
  return nextQueue[0] || syncItem;
}

export async function getSyncQueue() {
  const store = await readStore();
  return [...store.syncQueue];
}

export async function markSyncSuccess(id) {
  const store = await readStore();
  const queue = store.syncQueue.map((item) => (item.id === id ? { ...item, status: 'synced', updatedAt: new Date().toISOString() } : item));
  const nextQueue = queue.filter((item) => item.id !== id);
  // Only write sync queue, not entire store
  await writeSyncQueue(nextQueue);
  return nextQueue;
}

export async function markSyncFailed(id, reason = '') {
  const store = await readStore();
  const nextQueue = store.syncQueue.map((item) => {
    if (item.id !== id) return item;
    const retryCount = Math.max(0, Number(item.retryCount || 0) + 1);
    return { ...item, status: retryCount >= 4 ? 'failed' : 'queued', retryCount, reason, updatedAt: new Date().toISOString() };
  });
  // Only write sync queue, not entire store
  await writeSyncQueue(nextQueue);
  return nextQueue;
}

export async function clearSyncQueue() {
  // Only write sync queue, not entire store
  await writeSyncQueue([]);
  return [];
}

export async function getLocalStudyProgress(scope = 'challenge') {
  const store = await readStore();
  return store.progress?.[scope] || {};
}

export async function saveLocalStudyProgress(scope, key, value) {
  const store = await readStore();
  const nextProgress = { ...store.progress, [scope]: { ...(store.progress?.[scope] || {}), [key]: value } };
  const nextStore = await writeStore({ ...store, progress: nextProgress });
  return nextStore.progress?.[scope]?.[key];
}

export async function checkConnectivity() {
  const state = await NetInfo.fetch();
  return Boolean(state?.isConnected) && (state?.isInternetReachable !== false);
}

export function useNetworkStatus() {
  const [status, setStatus] = useState({ isConnected: true, isOffline: false, isReconnecting: false, isSyncing: false, state: null });
  useEffect(() => {
    const applyState = (state) => {
      const connected = Boolean(state?.isConnected) && state?.isInternetReachable !== false;
      setStatus({ isConnected: connected, isOffline: !connected, isReconnecting: Boolean(!connected && state?.isConnected === null), isSyncing: false, state });
    };
    const unsubscribe = NetInfo.addEventListener(applyState);
    NetInfo.fetch().then(applyState).catch(() => {});
    return () => unsubscribe();
  }, []);
  return status;
}

export async function syncQueuedLearningActions({ onProgress } = {}) {
  const canSync = await checkConnectivity();
  if (!canSync || !auth.currentUser?.uid) return { processed: 0, queued: true };
  await validateOfflineEntitlement({ force: true }).catch(() => null);

  const store = await readStore();
  const queue = [...store.syncQueue].filter((item) => item.status !== 'synced' && (item.status === 'queued' || item.status === 'failed'));
  let processed = 0;

  for (const item of queue) {
    try {
      if (item.type === 'challengeAttempt') {
        const attempt = item.payload?.attempt || {};
        const stats = item.payload?.stats || {};
        const attemptPath = doc(db, 'challengeUsers', auth.currentUser.uid, 'attempts', String(item.payload?.syncKey || item.id));
        const statsPath = doc(db, 'challengeUsers', auth.currentUser.uid);
        await setDoc(attemptPath, { ...attempt, updatedAt: serverTimestamp() }, { merge: true });
        await setDoc(statsPath, { ...stats, updatedAt: serverTimestamp() }, { merge: true });
      }

      if (item.type === 'gpaRecord') {
        const record = item.payload || {};
        const recordPath = doc(db, 'GPARecords', String(record.id || item.id));
        await setDoc(recordPath, { ...record, userId: auth.currentUser.uid, updatedAt: serverTimestamp() }, { merge: true });
      }

      if (item.type === 'offlineProgress') {
        const ref = doc(db, 'users', auth.currentUser.uid, 'learningProgress', String(item.payload?.scope || 'general'));
        await setDoc(ref, { ...item.payload?.value, updatedAt: serverTimestamp() }, { merge: true });
      }

      if (item.type?.startsWith?.('offline:')) {
        await postJson('/api/offline-library/sync', item);
      }

      if (typeof onProgress === 'function') onProgress({ processed: processed + 1, total: queue.length });
      processed += 1;
      await markSyncSuccess(item.id);
    } catch (error) {
      await markSyncFailed(item.id, error?.message || 'Sync failed');
    }
  }
  return { processed, queued: queue.length > processed };
}

export async function saveLocalChallengeAttempt(result = {}) {
  const localResult = {
    id: result.id || `challenge-${Date.now()}`,
    category: result.category || 'daily',
    score: result.score || 0,
    totalQuestions: result.totalQuestions || 0,
    accuracy: result.accuracy || 0,
    xpEarned: result.xpEarned || 0,
    pointsEarned: result.pointsEarned || 0,
    correct: result.correct || 0,
    wrong: result.wrong || 0,
    skipped: result.skipped || 0,
    answers: result.answers || [],
    createdAt: new Date().toISOString(),
    offline: true,
  };
  const store = await readStore();
  const keyed = { ...store.progress.challenge, [localResult.id]: localResult };
  await writeStore({ ...store, progress: { ...store.progress, challenge: keyed } });
  return localResult;
}

export async function saveLocalGpaRecord(record = {}) {
  const safeId = String(record.id || `gpa-${Date.now()}`);
  const store = await readStore();
  const keyed = { ...store.progress.gpa, [safeId]: { ...record, id: safeId, savedAt: new Date().toISOString(), offline: true } };
  await writeStore({ ...store, progress: { ...store.progress, gpa: keyed } });
  return keyed[safeId];
}

export async function getLocalGpaRecords() {
  const store = await readStore();
  return Object.values(store.progress.gpa || {}).sort((a, b) => (new Date(b.savedAt || 0) - new Date(a.savedAt || 0)));
}

export async function saveDownloadedFormulas(formulas = []) {
  await saveStoredFormulas(Array.isArray(formulas) ? formulas : []);
  if (Array.isArray(formulas) && formulas.length) {
    await setDownloadState('formulas', 'all', {
      status: 'downloaded',
      title: 'Formula Library',
      contentKind: 'structured',
      payload: formulas,
      size: JSON.stringify(formulas).length,
      meta: { title: 'Formula Library', count: formulas.length },
    });
  }
  return getStoredFormulas();
}

export async function syncLocalLearningProgress() {
  const canSync = await checkConnectivity();
  if (!canSync) return { processed: 0, skipped: true };
  return syncQueuedLearningActions();
}
