import Constants from 'expo-constants';
import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const DEFAULT_BASE = 'https://unihelp.app';

const appBase =
  Constants.expoConfig?.extra?.APP_URL ||
  Constants.manifest?.extra?.APP_URL ||
  (typeof process !== 'undefined' ? process.env?.APP_URL : undefined) ||
  DEFAULT_BASE;

export const buildShareUrl = (pathname, params = {}) => {
  const base = `${appBase}`.replace(/\/$/, '');
  const path = `${pathname || ''}`.replace(/^\//, '');
  const url = `${base}/${path}`;

  const search = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  return search ? `${url}?${search}` : url;
};

export const shareContent = async ({ title, text, url }) => {
  try {
    const message = [text || '', url || ''].filter(Boolean).join('\n\n');
    const result = await Share.share({ message, title });
    if (result && result.action) return 'shared';
  } catch (err) {
    // ignore and fallback to clipboard
  }

  try {
    if (url) {
      await Clipboard.setStringAsync(url);
      return 'copied';
    }
  } catch (err) {
    // final fallback: return nothing
  }

  return 'copied';
};
