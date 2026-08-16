import Constants from 'expo-constants';
import { auth } from '../../../firebase/config';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

export const getApiUrl = () => {
  const fallback = 'https://unihelp-backend-dg0o.onrender.com';
  const rawUrl = extra?.EXPO_PUBLIC_API_URL || (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : undefined) || fallback;
  return String(rawUrl).replace(/\/$/, '');
};

/**
 * Get a Firebase auth token for authenticated API requests.
 */
async function getAuthToken() {
  try {
    if (auth?.currentUser) {
      return await auth.currentUser.getIdToken();
    }
  } catch {
    // Not authenticated
  }
  return null;
}

/**
 * Build headers with optional auth token.
 */
async function buildHeaders(extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function postJson(path, payload) {
  const headers = await buildHeaders();
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data;
}

export async function getJson(path) {
  const headers = await buildHeaders();
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data;
}

export async function sendAppNotification({
  userIds,
  title,
  body,
  type = 'general',
  category = 'General',
  url = '/notifications',
  announcementId = null,
  data = {},
}) {
  const recipients = Array.isArray(userIds) ? userIds.filter(Boolean) : [userIds].filter(Boolean);

  if (recipients.length === 0) {
    return null;
  }

  return postJson('/api/notifications/send-user', {
    userIds: recipients,
    title,
    body,
    type,
    category,
    url,
    announcementId,
    data,
  });
}
