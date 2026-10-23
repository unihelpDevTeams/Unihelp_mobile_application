import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';

const MEDIA_CACHE_ROOT = `${FileSystem.documentDirectory || ''}unihelp/media-cache/`;
const MEDIA_CACHE_INDEX_KEY = '@unihelp_media_cache_index_v1';
const DOWNLOAD_PREFS_KEY = '@unihelp_media_download_prefs_v1';
const DEFAULT_CACHE_LIMIT_BYTES = 250 * 1024 * 1024;
const DEFAULT_DOWNLOAD_PREFS = {
  wifi: true,
  mobileData: false,
};

const hashString = (value = '') => {
  const source = String(value || '');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
};

const sanitizeFileName = (value = 'attachment') => {
  const raw = String(value || 'attachment').split(/[\\/]+/).pop() || 'attachment';
  const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'attachment';
  return `${safe}-${Date.now().toString(36)}`;
};

const buildCacheKey = (url, fallbackName = 'attachment') => {
  const source = String(url || fallbackName || 'attachment');
  return `media-${hashString(source)}`;
};

const readCacheIndex = async () => {
  try {
    const raw = await AsyncStorage.getItem(MEDIA_CACHE_INDEX_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeCacheIndex = async (index) => {
  await AsyncStorage.setItem(MEDIA_CACHE_INDEX_KEY, JSON.stringify(index || {}));
};

const ensureCacheRoot = async () => {
  const info = await FileSystem.getInfoAsync(MEDIA_CACHE_ROOT);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_CACHE_ROOT, { intermediates: true });
  }
};

const touchCacheEntry = async (cacheKey) => {
  const index = await readCacheIndex();
  if (!index[cacheKey]) return;
  index[cacheKey].lastAccessedAt = Date.now();
  await writeCacheIndex(index);
};

export const getMediaDownloadPreferences = async () => {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOAD_PREFS_KEY);
    if (!raw) return { ...DEFAULT_DOWNLOAD_PREFS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DOWNLOAD_PREFS,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    };
  } catch {
    return { ...DEFAULT_DOWNLOAD_PREFS };
  }
};

export const setMediaDownloadPreferences = async (nextPrefs = {}) => {
  const next = {
    ...DEFAULT_DOWNLOAD_PREFS,
    ...(nextPrefs || {}),
  };
  await AsyncStorage.setItem(DOWNLOAD_PREFS_KEY, JSON.stringify(next));
  return next;
};

export const shouldAutomaticallyDownload = async (connectionType = 'wifi') => {
  const prefs = await getMediaDownloadPreferences();
  if (connectionType === 'wifi') return prefs.wifi !== false;
  if (connectionType === 'cellular') return prefs.mobileData === true;
  return false;
};

export const getCachedMediaStatus = async (url, fallbackName = 'attachment') => {
  if (!url) return { exists: false, localUri: null, size: 0 };

  const cacheKey = buildCacheKey(url, fallbackName);
  const index = await readCacheIndex();
  const entry = index[cacheKey];
  if (!entry?.localUri) {
    return { exists: false, localUri: null, size: 0 };
  }

  const fileInfo = await FileSystem.getInfoAsync(entry.localUri);
  if (!fileInfo.exists) {
    delete index[cacheKey];
    await writeCacheIndex(index);
    return { exists: false, localUri: null, size: 0 };
  }

  return {
    exists: true,
    localUri: entry.localUri,
    size: Number(entry.size || fileInfo.size || 0) || 0,
    lastAccessedAt: entry.lastAccessedAt || entry.cachedAt || 0,
    mimeType: entry.mimeType || '',
  };
};

export const cacheRemoteMedia = async ({ url, fileName, mimeType = '' } = {}) => {
  if (!url || typeof url !== 'string') return null;

  const existing = await getCachedMediaStatus(url, fileName);
  if (existing.exists && existing.localUri) {
    const key = buildCacheKey(url, fileName);
    await touchCacheEntry(key);
    return existing.localUri;
  }

  await ensureCacheRoot();

  const cacheKey = buildCacheKey(url, fileName);
  const finalName = sanitizeFileName(fileName || url || 'attachment');
  const localUri = `${MEDIA_CACHE_ROOT}${finalName}`;

  const result = await FileSystem.downloadAsync(url, localUri, {
    sessionType: 'background',
  }).catch((error) => {
    throw new Error(`Failed to download media: ${error?.message || 'unknown error'}`);
  });

  if (!result || !result.uri) {
    throw new Error('Media download returned no file URI.');
  }

  const fileInfo = await FileSystem.getInfoAsync(result.uri);
  if (!fileInfo.exists || !fileInfo.size) {
    throw new Error('Downloaded media is empty or corrupt.');
  }

  const index = await readCacheIndex();
  index[cacheKey] = {
    key: cacheKey,
    url,
    localUri: result.uri,
    fileName: finalName,
    mimeType,
    size: Number(fileInfo.size || 0),
    cachedAt: Date.now(),
    lastAccessedAt: Date.now(),
  };
  await writeCacheIndex(index);

  return result.uri;
};

export const ensureCachedMediaUri = async (url, options = {}) => cacheRemoteMedia({ url, ...options });

export const clearMediaCacheEntry = async (url, fallbackName = 'attachment') => {
  if (!url) return false;
  const cacheKey = buildCacheKey(url, fallbackName);
  const index = await readCacheIndex();
  const entry = index[cacheKey];
  if (entry?.localUri) {
    await FileSystem.deleteAsync(entry.localUri, { idempotent: true }).catch(() => {});
    delete index[cacheKey];
    await writeCacheIndex(index);
    return true;
  }
  return false;
};

export const pruneMediaCache = async (maxBytes = DEFAULT_CACHE_LIMIT_BYTES) => {
  const index = await readCacheIndex();
  const entries = Object.values(index).filter((entry) => entry?.localUri);
  const totalBytes = entries.reduce((total, entry) => total + (Number(entry.size) || 0), 0);

  if (totalBytes <= maxBytes) return entries.length;

  const sorted = [...entries].sort((left, right) => (left.lastAccessedAt || 0) - (right.lastAccessedAt || 0));
  let remaining = totalBytes;

  for (const entry of sorted) {
    if (remaining <= maxBytes) break;
    await FileSystem.deleteAsync(entry.localUri, { idempotent: true }).catch(() => {});
    delete index[entry.key];
    remaining -= Number(entry.size) || 0;
  }

  await writeCacheIndex(index);
  return Object.keys(index).length;
};

export const getMediaCacheSnapshot = async () => {
  const index = await readCacheIndex();
  return Object.values(index)
    .filter((entry) => entry?.localUri)
    .map((entry) => ({
      key: entry.key,
      url: entry.url,
      localUri: entry.localUri,
      size: Number(entry.size) || 0,
      cachedAt: entry.cachedAt || 0,
      lastAccessedAt: entry.lastAccessedAt || entry.cachedAt || 0,
    }));
};

export const getCurrentNetworkType = async () => {
  const state = await NetInfo.fetch();
  return state?.type || 'unknown';
};

export const getMediaDownloadPreferenceSummary = async () => {
  const prefs = await getMediaDownloadPreferences();
  const networkType = await getCurrentNetworkType();
  return {
    preferences: prefs,
    autoDownloadEnabled: await shouldAutomaticallyDownload(networkType),
    networkType,
  };
};
