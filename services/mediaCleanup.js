import { auth } from "../firebase/config";
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
const API_URL =
  extra?.EXPO_PUBLIC_API_URL ||
  (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : undefined) ||
  "http://localhost:5000";

const requestCleanupDelete = async (path) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in before deleting this item.");

  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/media-cleanup${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.error || "Delete failed. Please try again.");
  }

  return data;
};

const requestCleanupPost = async (path, body) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in before deleting this item.");

  const token = await user.getIdToken();
  const response = await fetch(`${API_URL}/api/media-cleanup${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.error || "Delete failed. Please try again.");
  }

  return data;
};

export const deleteMediaDocument = (type, id) =>
  requestCleanupDelete(`/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);

export const deleteGroupPostWithMedia = (groupId, postId) =>
  requestCleanupDelete(
    `/groups/${encodeURIComponent(groupId)}/posts/${encodeURIComponent(postId)}`
  );

export const deleteGroupWithMedia = (groupId) =>
  requestCleanupDelete(`/groups/${encodeURIComponent(groupId)}`);

export const deleteCurrentUserWithMedia = () => requestCleanupDelete("/users/me");

/**
 * Delete specific Cloudinary assets by their public IDs, URLs, or asset objects.
 * @param {Object} options
 * @param {Array<{publicId?: string, resourceType?: string, url?: string}>} [options.assets] - Array of asset objects
 * @param {string[]} [options.urls] - Array of Cloudinary URLs to delete
 * @param {string[]} [options.publicIds] - Array of Cloudinary public IDs to delete as images
 */
export const deleteCloudinaryAssets = (options = {}) =>
  requestCleanupPost("/delete-assets", options);
