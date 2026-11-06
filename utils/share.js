import Constants from 'expo-constants';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const DEFAULT_BASE = 'https://myunihelp.com.ng';

const appBase =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_URL ||
  Constants.manifest?.extra?.EXPO_PUBLIC_APP_URL ||
  DEFAULT_BASE;

const CONTENT_PATHS = {
  post: (id) => `/feed?post=${encodeURIComponent(id)}`,
  profile: (id) => `/profile/${encodeURIComponent(id)}`,
  marketplace: (id) => `/marketplace/${encodeURIComponent(id)}`,
  hostel: (id) => `/hostels/${encodeURIComponent(id)}`,
  pastQuestion: (id) => `/past-questions/${encodeURIComponent(id)}`,
  formula: (id) => `/formula-hub/${encodeURIComponent(id)}`,
};

export const buildShareUrl = (pathname, params = {}) => {
  const url = new URL(`${pathname || ''}`.replace(/^\//, ''), `${appBase.replace(/\/$/, '')}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

export const buildContentShareUrl = (type, id) => {
  const buildPath = CONTENT_PATHS[type];
  if (!buildPath || id === undefined || id === null || id === '') return '';
  return buildShareUrl(buildPath(String(id)));
};

export const shareContent = async ({ title, text, url }) => {
  try {
    const message = [text || '', url || ''].filter(Boolean).join('\n\n');
    const result = await Share.share({ message, title });
    if (result && result.action) return 'shared';
  } catch (_err) {
    // ignore and fallback to clipboard
  }

  try {
    if (url) {
      await Clipboard.setStringAsync(url);
      return 'copied';
    }
  } catch (_err) {
    // final fallback: return nothing
  }

  return 'copied';
};
