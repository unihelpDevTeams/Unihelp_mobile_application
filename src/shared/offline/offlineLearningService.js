import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { auth, db } from '../../../firebase/config';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

const LEARNING_STORAGE_KEY = '@unihelp_learning_offline_v1';

const emptyStore = () => ({
  downloads: [],
  syncQueue: [],
  progress: {
    formulas: {},
    flashcards: {},
    challenge: {},
    pastQuestions: {},
    notes: {},
    gpa: {},
  },
  metadata: {
    lastSyncedAt: null,
  },
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
    metadata: { ...base.metadata, ...(value.metadata || {}) },
  };
};

async function readStore() {
  const raw = await AsyncStorage.getItem(LEARNING_STORAGE_KEY);
  if (!raw) return emptyStore();

  try {
    return ensureStoreShape(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

async function writeStore(nextStore) {
  const normalized = ensureStoreShape(nextStore);
  await AsyncStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function getStoredFormulas() {
  const store = await readStore();
  return Array.isArray(store.progress.formulas) ? store.progress.formulas : [];
}

export async function saveStoredFormulas(formulas = []) {
  const store = await readStore();
  const normalized = Array.isArray(formulas) ? formulas : [];
  const next = await writeStore({
    ...store,
    progress: {
      ...store.progress,
      formulas: normalized,
    },
  });
  return next.progress.formulas;
}

function createDownloadEntry(type, id, payload = {}) {
  return {
    id: String(id || `${type}-${Date.now()}`),
    type,
    status: 'downloaded',
    contentVersion: payload.contentVersion || '1',
    downloadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSyncedAt: null,
    payload: payload.payload || payload,
    meta: payload.meta || {},
  };
}

export async function getDownloadRecords() {
  const store = await readStore();
  return [...store.downloads];
}

export async function setDownloadState(type, id, update = {}) {
  const store = await readStore();
  const normalizedId = String(id);
  const existingIndex = store.downloads.findIndex((item) => item.type === type && String(item.id) === normalizedId);
  const entry = existingIndex >= 0 ? { ...store.downloads[existingIndex], ...update } : createDownloadEntry(type, normalizedId, update);

  const nextDownloads = [...store.downloads];
  if (existingIndex >= 0) nextDownloads[existingIndex] = entry;
  else nextDownloads.push(entry);

  const nextStore = await writeStore({ ...store, downloads: nextDownloads });
  return nextStore.downloads.find((item) => item.type === type && String(item.id) === normalizedId) || entry;
}

export async function isContentDownloaded(type, id) {
  const item = await getDownloadRecord(type, id);
  return Boolean(item && item.status === 'downloaded');
}

export async function getDownloadRecord(type, id) {
  const store = await readStore();
  return store.downloads.find((item) => item.type === type && String(item.id) === String(id)) || null;
}

export async function removeDownload(type, id) {
  const store = await readStore();
  const nextDownloads = store.downloads.filter((item) => !(item.type === type && String(item.id) === String(id)));
  const nextStore = await writeStore({ ...store, downloads: nextDownloads });
  return nextStore.downloads;
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

  const nextStore = await writeStore({ ...store, syncQueue: nextQueue });
  return nextStore.syncQueue[0] || syncItem;
}

export async function getSyncQueue() {
  const store = await readStore();
  return [...store.syncQueue];
}

export async function markSyncSuccess(id) {
  const store = await readStore();
  const queue = store.syncQueue.map((item) => (item.id === id ? { ...item, status: 'synced', updatedAt: new Date().toISOString() } : item));
  const nextStore = await writeStore({ ...store, syncQueue: queue.filter((item) => item.id !== id), metadata: { ...store.metadata, lastSyncedAt: new Date().toISOString() } });
  return nextStore;
}

export async function markSyncFailed(id, reason = '') {
  const store = await readStore();
  const nextQueue = store.syncQueue.map((item) => {
    if (item.id !== id) return item;
    const retryCount = Math.max(0, Number(item.retryCount || 0) + 1);
    return {
      ...item,
      status: retryCount >= 4 ? 'failed' : 'queued',
      retryCount,
      reason,
      updatedAt: new Date().toISOString(),
    };
  });

  await writeStore({ ...store, syncQueue: nextQueue });
  return nextQueue;
}

export async function clearSyncQueue() {
  const store = await readStore();
  const nextStore = await writeStore({ ...store, syncQueue: [] });
  return nextStore.syncQueue;
}

export async function getLocalStudyProgress(scope = 'challenge') {
  const store = await readStore();
  return store.progress?.[scope] || {};
}

export async function saveLocalStudyProgress(scope, key, value) {
  const store = await readStore();
  const nextProgress = {
    ...store.progress,
    [scope]: {
      ...(store.progress?.[scope] || {}),
      [key]: value,
    },
  };
  const nextStore = await writeStore({ ...store, progress: nextProgress });
  return nextStore.progress?.[scope]?.[key];
}

export async function checkConnectivity() {
  const state = await NetInfo.fetch();
  return Boolean(state?.isConnected) && (state?.isInternetReachable !== false);
}

export function useNetworkStatus() {
  const [status, setStatus] = useState({
    isConnected: true,
    isOffline: false,
    isReconnecting: false,
    isSyncing: false,
    state: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(state?.isConnected) && state?.isInternetReachable !== false;
      setStatus({
        isConnected: connected,
        isOffline: !connected,
        isReconnecting: Boolean(!connected && state?.isConnected === null),
        isSyncing: false,
        state,
      });
    });

    NetInfo.fetch().then((state) => {
      const connected = Boolean(state?.isConnected) && state?.isInternetReachable !== false;
      setStatus({
        isConnected: connected,
        isOffline: !connected,
        isReconnecting: false,
        isSyncing: false,
        state,
      });
    }).catch(() => {});

    return () => unsubscribe();
  }, []);

  return status;
}

export async function syncQueuedLearningActions({ onProgress } = {}) {
  const canSync = await checkConnectivity();
  if (!canSync || !auth.currentUser?.uid) {
    return { processed: 0, queued: true };
  }

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

      if (typeof onProgress === 'function') {
        onProgress({ processed: processed + 1, total: queue.length });
      }

      processed += 1;
      await markSyncSuccess(item.id);
    } catch (error) {
      await markSyncFailed(item.id, error?.message || 'Sync failed');
    }
  }

  return {
    processed,
    queued: queue.length > processed,
  };
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
  await writeStore({
    ...store,
    progress: { ...store.progress, challenge: keyed },
  });

  return localResult;
}

export async function saveLocalGpaRecord(record = {}) {
  const safeId = String(record.id || `gpa-${Date.now()}`);
  const store = await readStore();
  const keyed = { ...store.progress.gpa, [safeId]: { ...record, id: safeId, savedAt: new Date().toISOString(), offline: true } };
  await writeStore({
    ...store,
    progress: { ...store.progress, gpa: keyed },
  });
  return keyed[safeId];
}

export async function getLocalGpaRecords() {
  const store = await readStore();
  return Object.values(store.progress.gpa || {}).sort((a, b) => (new Date(b.savedAt || 0) - new Date(a.savedAt || 0)));
}

export async function saveDownloadedFormulas(formulas = []) {
  await saveStoredFormulas(Array.isArray(formulas) ? formulas : []);
  return getStoredFormulas();
}

export async function syncLocalLearningProgress() {
  const canSync = await checkConnectivity();
  if (!canSync) return { processed: 0, skipped: true };
  return syncQueuedLearningActions();
}
