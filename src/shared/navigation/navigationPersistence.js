import AsyncStorage from '@react-native-async-storage/async-storage';

export const LAST_LOCATION_VERSION = 1;
export const LAST_LOCATION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const STORAGE_PREFIX = 'unihelp:lastLocation:';

const STATIC_ROUTES = new Set([
  '/',
  '/chat',
  '/studyMaterials',
  '/groups',
  '/feed',
  '/profile',
  '/messages',
  '/newsfeed',
  '/notifications',
  '/announcements',
  '/community',
  '/marketplace',
  '/marketplace/hostels',
  '/marketplace/student-marketplace',
  '/hostelmarketplace',
  '/studentmarketplace',
  '/myhostels',
  '/myproducts',
  '/mystories',
  '/stories',
  '/challenge',
  '/challenge/categories',
  '/challenge/history',
  '/challenge/leaderboard',
  '/challenge/achievements',
  '/challenge/profile',
  '/challenge/streak',
  '/ai',
  '/ai/_studyTools',
  '/formula-hub',
  '/formula-hub/bookmarks',
  '/formula-hub/flashcards',
  '/formula-hub/subjects',
  '/friends',
  '/find-friends',
  '/saved',
  '/downloads',
  '/offline-center',
  '/smart-timetable',
  '/cgpa',
  '/tasks',
  '/pomodoroScreen',
  '/about',
  '/contact',
  '/faq',
  '/help-center',
  '/privacy',
  '/terms',
]);

const ROUTE_PATTERNS = [
  /^\/messages\/[^/]+$/,
  /^\/community\/[^/]+$/,
  /^\/view-user-profile\/[^/]+$/,
  /^\/view\/(?:listing|hostel|story|note|question|tutorial)\/[^/]+$/,
  /^\/formula-hub\/[^/]+$/,
  /^\/formula-hub\/subject\/[^/]+$/,
  /^\/stories\/[^/]+$/,
  /^\/read-story\/[^/]+\/[^/]+$/,
  /^\/offline-resource\/[^/]+\/[^/]+$/,
];

const storageQueues = new Map();

function withUserStorageQueue(uid, operation) {
  const previous = storageQueues.get(uid) || Promise.resolve();
  const next = previous.catch((error) => {
    console.warn('A previous local navigation storage operation failed:', error?.message || error);
  }).then(operation);
  storageQueues.set(uid, next);
  return next.finally(() => {
    if (storageQueues.get(uid) === next) storageQueues.delete(uid);
  });
}

const safePrimitiveParams = (params) => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return false;
  return Object.entries(params).every(([key, value]) => (
    typeof key === 'string'
    && key.length > 0
    && key.length <= 80
    && (
      typeof value === 'string'
      || typeof value === 'boolean'
      || (typeof value === 'number' && Number.isFinite(value))
    )
    && String(value).length <= 256
  ));
};

export function getLastLocationStorageKey(uid) {
  if (typeof uid !== 'string' || !uid.trim()) {
    throw new Error('A signed-in user ID is required to access saved navigation.');
  }
  return `${STORAGE_PREFIX}${uid}`;
}

export function normalizeLocationPath(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return '';
  const pathOnly = pathname.split(/[?#]/, 1)[0];
  const withoutGroups = pathOnly
    .split('/')
    .filter((segment) => segment && !/^\([^/]+\)$/.test(segment))
    .join('/');
  return withoutGroups ? `/${withoutGroups}` : '/';
}

export function shouldPersistRoute(pathname) {
  const path = normalizeLocationPath(pathname);
  if (!path || path.includes('\\') || path.includes('//') || path.split('/').some((part) => part === '.' || part === '..')) {
    return false;
  }
  try {
    if (path.split('/').some((part) => {
      const decoded = decodeURIComponent(part);
      return decoded.includes('/') || decoded.includes('\\') || decoded === '.' || decoded === '..';
    })) {
      return false;
    }
  } catch {
    return false;
  }
  if (STATIC_ROUTES.has(path)) return true;
  return ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}

export function isValidLastLocation(location, now = Date.now()) {
  if (!location || typeof location !== 'object' || Array.isArray(location)) return false;
  if (location.version !== LAST_LOCATION_VERSION) return false;
  if (typeof location.pathname !== 'string' || !shouldPersistRoute(location.pathname)) return false;
  if (!safePrimitiveParams(location.params)) return false;
  if (!Number.isFinite(location.timestamp) || location.timestamp > now) return false;
  return now - location.timestamp <= LAST_LOCATION_MAX_AGE_MS;
}

export async function saveLastLocation(uid, pathname, params = {}, options = {}) {
  if (!shouldPersistRoute(pathname)) return false;
  if (!safePrimitiveParams(params)) {
    throw new Error('Navigation parameters must contain only small serializable values.');
  }

  const key = getLastLocationStorageKey(uid);
  const normalizedPath = normalizeLocationPath(pathname);
  return withUserStorageQueue(uid, async () => {
    const cached = await AsyncStorage.getItem(key);
    if (!options.refresh && cached) {
      try {
        const current = JSON.parse(cached);
        if (
          current?.version === LAST_LOCATION_VERSION
          && current.pathname === normalizedPath
          && JSON.stringify(current.params || {}) === JSON.stringify(params)
        ) {
          return true;
        }
      } catch {
        // Replace malformed saved data with the valid current route.
      }
    }

    const location = {
      version: LAST_LOCATION_VERSION,
      pathname: normalizedPath,
      params,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(location));
    return true;
  });
}

export async function getLastLocation(uid) {
  const key = getLastLocationStorageKey(uid);
  await storageQueues.get(uid);
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;

  let location;
  try {
    location = JSON.parse(raw);
  } catch {
    await withUserStorageQueue(uid, () => AsyncStorage.removeItem(key));
    return null;
  }

  if (!isValidLastLocation(location)) {
    await withUserStorageQueue(uid, () => AsyncStorage.removeItem(key));
    return null;
  }

  return {
    version: LAST_LOCATION_VERSION,
    pathname: normalizeLocationPath(location.pathname),
    params: location.params,
    timestamp: location.timestamp,
  };
}

export async function clearLastLocation(uid) {
  const key = getLastLocationStorageKey(uid);
  await withUserStorageQueue(uid, () => AsyncStorage.removeItem(key));
}

let explicitNavigationIntent = false;

export function markExplicitNavigationIntent() {
  explicitNavigationIntent = true;
}

export function hasExplicitNavigationIntent() {
  return explicitNavigationIntent;
}

export function resetNavigationPersistenceMemory() {
  explicitNavigationIntent = false;
}
