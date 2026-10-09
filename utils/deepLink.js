import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_DEEP_LINK_KEY = '@unihelp_pending_deeplink_v1';

const APP_HOSTS = new Set(['unihelp.app', 'www.unihelp.app']);
const CUSTOM_SCHEME_PREFIX = 'unihelp://';

const pickValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

export function parseDeepLink(rawUrl) {
  if (!rawUrl) return null;

  const trimmed = String(rawUrl).trim();
  if (!trimmed) return null;

  try {
    let parsed;
    if (trimmed.startsWith(CUSTOM_SCHEME_PREFIX)) {
      parsed = new URL(trimmed.replace(CUSTOM_SCHEME_PREFIX, 'https://unihelp.app/'));
    } else {
      parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    }

    if (!APP_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.hostname !== 'localhost' && !parsed.hostname.endsWith('.unihelp.app')) {
      return null;
    }

    const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/, '') || '/' : '/';
    const query = Object.fromEntries(parsed.searchParams.entries());
    const routeParams = {};

    if (pathname === '/' || pathname === '/index') {
      return { pathname: '/(tabs)', params: {} };
    }

    if (pathname === '/feed' || pathname === '/newsfeed') {
      const postId = pickValue(query.post, query.id, query.postId, query.pid);
      if (postId) routeParams.post = postId;
      return { pathname: '/feed', params: routeParams };
    }

    if (pathname === '/profile' || pathname.startsWith('/profile/')) {
      const userId = pickValue(query.user, query.uid, query.id, pathname.split('/').filter(Boolean)[1]);
      if (userId) {
        return { pathname: '/view-user-profile/[userId]', params: { userId } };
      }
      return { pathname: '/(tabs)/profile', params: {} };
    }

    if (pathname === '/marketplace' || pathname === '/studentmarketplace') {
      const itemId = pickValue(query.item, query.id, query.product, query.marketplaceId);
      if (itemId) return { pathname: '/view/[type]/[id]', params: { type: 'listing', id: itemId } };
      return { pathname: '/studentmarketplace', params: {} };
    }

    if (pathname === '/hostelmarketplace' || pathname === '/hostels' || pathname === '/hostel') {
      const hostelId = pickValue(query.listing, query.id, query.hostelId, query.hostel);
      if (hostelId) return { pathname: '/view/[type]/[id]', params: { type: 'hostel', id: hostelId } };
      return { pathname: '/hostelmarketplace', params: {} };
    }

    if (pathname === '/resources') {
      const resourceId = pickValue(query.id, query.resourceId, query.item);
      if (resourceId) return { pathname: '/view/[type]/[id]', params: { type: 'studyMaterial', id: resourceId } };
      return { pathname: '/resources', params: {} };
    }

    if (pathname.startsWith('/community/')) {
      const groupId = pickValue(query.groupId, pathname.split('/').filter(Boolean)[1]);
      if (groupId) return { pathname: '/community/[groupId]', params: { groupId } };
    }

    if (pathname.startsWith('/stories/')) {
      const storyId = pickValue(query.storyId, pathname.split('/').filter(Boolean)[1]);
      if (storyId) return { pathname: '/stories/[storyId]', params: { storyId } };
    }

    if (pathname.startsWith('/view/')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 3) {
        const type = parts[1];
        const id = parts[2];
        return { pathname: '/view/[type]/[id]', params: { type, id } };
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
