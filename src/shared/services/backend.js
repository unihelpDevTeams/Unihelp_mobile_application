import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { auth } from '../../../firebase/config';
import { compressImageForUpload } from '../../../services/cloudinary';

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

  let response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, requestInit);
  } catch (error) {
    console.warn(`[Network Error] ${method} ${path}`, error);
    throw new Error('Network error. Please check your connection and try again.');
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = data.message || data.error || 'Request failed. Please try again.';
    if (response.status === 401 && !forceRefresh && auth?.currentUser) {
      console.warn('[API auth] Received 401; refreshing Firebase token and retrying once.', { path });
      return requestJson(path, { method, payload, extraHeaders, useFormData, forceRefresh: true });
    }
    const error = new Error(message);
    error.status = response.status;
    error.responseData = data;
    error.path = path;
    throw error;
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

const appendFileToFormData = async (formData, fieldName, file) => {
  if (file == null) {
    return;
  }

  const fileCtor = typeof globalThis !== 'undefined' ? globalThis.File : undefined;
  const blobCtor = typeof globalThis !== 'undefined' ? globalThis.Blob : undefined;

  if (fileCtor && file instanceof fileCtor) {
    formData.append(fieldName, file, file.name || `${fieldName}.bin`);
    return;
  }

  if (blobCtor && file instanceof blobCtor) {
    formData.append(fieldName, file, file.name || `${fieldName}.bin`);
    return;
  }

  if (typeof file === 'string' || typeof file === 'number' || typeof file === 'boolean') {
    formData.append(fieldName, String(file));
    return;
  }

  const uriSource = file && typeof file === 'object' && (file.uri || file.path || file.url);
  if (uriSource) {
    const uri = file.uri || file.path || file.url;
    const fileName = file.name || file.fileName || file.filename || `${fieldName}.bin`;
    const type = file.type || file.mimeType || 'application/octet-stream';

      try {
        if (!blobCtor) {
          throw new Error('Blob unavailable');
        }

        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let index = 0; index < binaryString.length; index += 1) {
          bytes[index] = binaryString.charCodeAt(index);
        }

        const blobValue = new blobCtor([bytes], { type });
        formData.append(fieldName, blobValue, fileName);
        return;
      } catch {
        try {
          const response = await fetch(uri);
          if (!response.ok) {
            throw new Error(`Unable to fetch media from ${uri}: ${response.status}`);
          }
          const blobValue = await response.blob();
          formData.append(fieldName, blobValue, fileName);
          return;
        } catch {
          throw new Error(`Unable to convert media for ${fieldName}. Please try again.`);
        }
      }
  }

  if (file && typeof file === 'object' && typeof file.arrayBuffer === 'function') {
    const blob = blobCtor ? new blobCtor([await file.arrayBuffer()], { type: file.type || 'application/octet-stream' }) : file;
    formData.append(fieldName, blob, file.name || `${fieldName}.bin`);
    return;
  }

  throw new Error(`Unsupported FormDataPart for ${fieldName}`);
};

const uploadLocalFileMultipart = async (path, uri, fieldName, mimeType, parameters = {}) => {
  const headers = await buildHeaders({});
  const result = await FileSystem.uploadAsync(`${getApiUrl()}${path}`, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName,
    mimeType,
    parameters,
    headers,
  });
  const data = JSON.parse(result.body || '{}');
  if (result.status < 200 || result.status >= 300) {
    throw new Error(data.message || data.error || 'Upload failed. Please try again.');
  }
  return data;
};

export async function uploadFeatureMedia(file, { feature = 'stories', resourceType = 'auto', onProgress } = {}) {
  const normalizedFile = resourceType === 'image' || String(file?.type || file?.mimeType || '').startsWith('image/')
    ? await compressImageForUpload(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.72 })
    : file;

  if (normalizedFile?.uri) {
    const data = await uploadLocalFileMultipart(
      '/api/uploads',
      normalizedFile.uri,
      'file',
      normalizedFile.mimeType || normalizedFile.type || 'application/octet-stream',
      { feature, resourceType }
    );
    onProgress?.(100);
    return data;
  }

  const headers = await buildHeaders({});
  delete headers['Content-Type'];

  const formData = new FormData();
  formData.append('feature', feature);
  formData.append('resourceType', resourceType);
  await appendFileToFormData(formData, 'file', normalizedFile);

  let response;
  try {
    response = await fetch(`${getApiUrl()}/api/uploads`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (error) {
    console.warn('[Network Error] POST /api/uploads', error);
    throw new Error('Network error. Please check your connection and try again.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Upload failed. Please try again.');
  }

  if (onProgress) onProgress(100);
  return data;
}

export async function deleteProfileMedia(key) {
  if (typeof key !== 'string' || !key.startsWith('unihelp/profile/')) {
    throw new Error('Invalid profile media key.');
  }

  return requestJson('/api/uploads', { method: 'DELETE', payload: { key } });
}

export async function deleteMarketingMedia(key) {
  if (typeof key !== 'string' || !key.startsWith('unihelp/marketing/') || key.includes('..')) {
    throw new Error('Invalid marketing media key.');
  }

  return requestJson('/api/uploads', { method: 'DELETE', payload: { key } });
}

export async function uploadStickerMedia(file, { onProgress, rotation = 0 } = {}) {
  const normalizedFile = file && (String(file?.type || file?.mimeType || '').startsWith('image/') || file?.uri)
    ? await compressImageForUpload(file, { maxWidth: 1400, maxHeight: 1400, quality: 0.75 })
    : file;

  const headers = await buildHeaders({});
  delete headers['Content-Type'];
  const formData = new FormData();
  const fileName = normalizedFile.name || normalizedFile.fileName || `sticker-media.${normalizedFile.type === 'video' ? 'mp4' : 'jpg'}`;
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
  const mimeType = normalizedFile.mimeType || (normalizedFile.type?.includes('/') ? normalizedFile.type : extensionMimeTypes[extension]) || (normalizedFile.type === 'video' ? 'video/mp4' : 'image/jpeg');

  if (normalizedFile.uri) {
    const data = await uploadLocalFileMultipart(
      '/api/stickers/upload',
      normalizedFile.uri,
      'file',
      mimeType,
      { rotation: String(rotation) }
    );
    onProgress?.(100);
    return data.data || data;
  }

  await appendFileToFormData(formData, 'file', {
    ...normalizedFile,
    uri: normalizedFile.uri,
    name: fileName,
    type: mimeType,
  });
  formData.append('rotation', String(rotation));
  let response;
  try {
    response = await fetch(`${getApiUrl()}/api/stickers/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (error) {
    console.warn('[Network Error] POST /api/stickers/upload', error);
    throw new Error('Network error. Please check your connection and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Sticker upload failed. Please try again.');
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
