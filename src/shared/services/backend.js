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
async function getAuthToken(forceRefresh = false) {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Your session expired. Please sign in again.');
  }

  try {
    const token = await currentUser.getIdToken(forceRefresh);
    if (!token) throw new Error('Firebase did not return an auth token.');
    return token;
  } catch (error) {
    console.error('[API auth] Failed to get Firebase ID token', {
      uid: currentUser.uid,
      email: currentUser.email,
      forceRefresh,
      error,
    });
    throw new Error('Your login session expired. Please sign in again.');
  }
}

/**
 * Build headers with optional auth token.
 */
async function buildHeaders(extraHeaders = {}, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  const token = await getAuthToken(Boolean(options.forceRefresh));
  headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function requestJson(path, { method = 'GET', payload, extraHeaders = {}, useFormData = false, forceRefresh = false } = {}) {
  const headers = await buildHeaders(extraHeaders, { forceRefresh });
  const requestInit = {
    method,
    headers,
  };

  if (payload !== undefined && !useFormData) {
    requestInit.body = JSON.stringify(payload);
  }

  const response = await fetch(`${getApiUrl()}${path}`, requestInit);
  const data = await parseResponse(response);

  if (!response.ok) {
    const message = data.message || data.error || 'Request failed';
    if (response.status === 401 && !forceRefresh && auth?.currentUser) {
      console.warn('[API auth] Received 401; refreshing Firebase token and retrying once.', { path });
      return requestJson(path, { method, payload, extraHeaders, useFormData, forceRefresh: true });
    }
    throw new Error(`${response.status} ${message}`);
  }

  return data;
}

const parseResponse = async (response) => {
  const rawText = await response.text();
  if (!rawText) return {};

  try {
    return JSON.parse(rawText);
  } catch {
    return { error: rawText };
  }
};

export async function postJson(path, payload) {
  return requestJson(path, { method: 'POST', payload });
}

export async function putJson(path, payload) {
  return requestJson(path, { method: 'PUT', payload });
}

export async function patchJson(path, payload) {
  return requestJson(path, { method: 'PATCH', payload });
}

export async function deleteJson(path) {
  return requestJson(path, { method: 'DELETE' });
}

export async function getJson(path) {
  return requestJson(path, { method: 'GET' });
}

const appendFileToFormData = (formData, fieldName, file) => {
  if (!file) {
    return;
  }

  if (typeof File !== 'undefined' && file instanceof File) {
    formData.append(fieldName, file, file.name || `${fieldName}.bin`);
    return;
  }

  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    formData.append(fieldName, file, file.name || `${fieldName}.bin`);
    return;
  }

  if (file && typeof file === 'object' && (file.uri || file.path || file.url)) {
    formData.append(fieldName, {
      uri: file.uri || file.path || file.url,
      name: file.name || file.fileName || file.filename || `${fieldName}.bin`,
      type: file.type || file.mimeType || 'application/octet-stream',
    });
    return;
  }

  formData.append(fieldName, file);
};

export async function uploadFeatureMedia(file, { feature = 'stories', resourceType = 'auto', onProgress } = {}) {
  const headers = await buildHeaders({});
  delete headers['Content-Type'];

  const formData = new FormData();
  formData.append('feature', feature);
  formData.append('resourceType', resourceType);
  appendFileToFormData(formData, 'file', file);

  const response = await fetch(`${getApiUrl()}/api/uploads`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Upload failed');
  }

  if (onProgress) onProgress(100);
  return data;
}

export async function uploadStickerMedia(file, { onProgress, rotation = 0 } = {}) {
  const headers = await buildHeaders({});
  delete headers['Content-Type'];
  const formData = new FormData();
  const fileName = file.name || file.fileName || `sticker-media.${file.type === 'video' ? 'mp4' : 'jpg'}`;
  const extension = fileName.split('.').pop()?.toLowerCase();
  const extensionMimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  const mimeType = file.mimeType || (file.type?.includes('/') ? file.type : extensionMimeTypes[extension]) || (file.type === 'video' ? 'video/mp4' : 'image/jpeg');
  appendFileToFormData(formData, 'file', {
    ...file,
    uri: file.uri,
    name: fileName,
    type: mimeType,
  });
  formData.append('rotation', String(rotation));
  const response = await fetch(`${getApiUrl()}/api/stickers/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Sticker upload failed');
  onProgress?.(100);
  return data.data || data;
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
