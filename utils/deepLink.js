import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_DEEP_LINK_KEY = '@unihelp_pending_deeplink_v1';

const APP_HOSTS = new Set([
  'myunihelp.com.ng',
  'www.myunihelp.com.ng',
  'unihelp.app',
  'www.unihelp.app',
]);
const CUSTOM_SCHEME_PREFIX = 'unihelp://';

const pickValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const decodeSegment = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return '';
  }
};

const isValidRouteId = (value) => (
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 256 &&
  value !== '.' &&
  value !== '..' &&
  !/[\\/\u0000-\u001f]/.test(value)
);

const detailRoute = (type, id) => (
  isValidRouteId(id)
    ? { pathname: '/view/[type]/[id]', params: { type, id } }
    : null
);

export function parseDeepLink(rawUrl) {
  if (!rawUrl) return null;

  const trimmed = String(rawUrl).trim();
  if (!trimmed) return null;

  try {
    let parsed;
    if (trimmed.startsWith(CUSTOM_SCHEME_PREFIX)) {
      parsed = new URL(trimmed.replace(CUSTOM_SCHEME_PREFIX, 'https://myunihelp.com.ng/'));
    } else {
      parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (!APP_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.hostname !== 'localhost' && !parsed.hostname.endsWith('.unihelp.app')) {
      return null;
    }

    const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') || '/' : '/';
    const query = Object.fromEntries(parsed.searchParams.entries());
    const parts = pathname.split('/').filter(Boolean).map(decodeSegment);
    if (parts.some((part) => !part)) return null;
    const routeParams = {};

    if (pathname === '/' || pathname === '/index') {
      return { pathname: '/(tabs)', params: {} };
    }

    if (pathname === '/feed' || pathname === '/newsfeed') {
      const postId = pickValue(query.post, query.id, query.postId, query.pid);
      if (postId) {
        if (!isValidRouteId(postId)) return null;
        routeParams.post = postId;
      }
      return { pathname: '/feed', params: routeParams };
    }

    if (pathname === '/profile' || parts[0] === 'profile') {
      const userId = pickValue(query.user, query.uid, query.id, parts[1]);
      if (userId) {
        if (!isValidRouteId(userId)) return null;
        return { pathname: '/view-user-profile/[userId]', params: { userId } };
      }
      return { pathname: '/(tabs)/profile', params: {} };
    }

    if (parts[0] === 'marketplace' || parts[0] === 'studentmarketplace') {
      const itemId = pickValue(query.item, query.id, query.product, query.marketplaceId, parts[1]);
      if (itemId) return detailRoute('listing', itemId);
      return { pathname: '/studentmarketplace', params: {} };
    }

    if (parts[0] === 'hostels') {
      return detailRoute('hostel', parts[1]);
    }

    if (parts[0] === 'past-questions' || parts[0] === 'pastQuestions') {
      return detailRoute('question', parts[1]);
    }

    if (parts[0] === 'formula-hub' && isValidRouteId(parts[1])) {
      return { pathname: '/formula-hub/[id]', params: { id: parts[1] } };
    }

    if (pathname === '/resources') {
      const resourceId = pickValue(query.id, query.resourceId, query.item);
      if (resourceId) return detailRoute('studyMaterial', resourceId);
      return { pathname: '/resources', params: {} };
    }

    // `/groups` is the canonical list tab. Keep legacy `/community` links working.
    if (pathname === '/groups' || pathname === '/community') {
      return { pathname: '/groups', params: {} };
    }

    if (pathname.startsWith('/community/')) {
      const groupId = pickValue(query.groupId, parts[1]);
      if (groupId) return { pathname: '/community/[groupId]', params: { groupId } };
    }

    if (pathname.startsWith('/view/')) {
      if (parts.length >= 3) {
        const type = parts[1];
        const id = parts[2];
        return detailRoute(type, id);
      }
    }

    return null;
  } catch (_error) {
    return null;
  }
}

export async function savePendingDeepLink(rawUrl) {
  const parsed = parseDeepLink(rawUrl);
  if (!parsed) return null;

  const payload = {
    pathname: parsed.pathname,
    params: parsed.params || {},
  };

  await AsyncStorage.setItem(PENDING_DEEP_LINK_KEY, JSON.stringify(payload));
  return payload;
}

export async function readPendingDeepLink() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_DEEP_LINK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_error) {
    return null;
  }
}

export async function clearPendingDeepLink() {
  try {
    await AsyncStorage.removeItem(PENDING_DEEP_LINK_KEY);
  } catch (_error) {
    // no-op; best effort
  }
}
