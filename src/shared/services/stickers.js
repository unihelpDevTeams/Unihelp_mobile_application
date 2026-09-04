import { getJson, postJson, putJson, deleteJson, uploadStickerMedia as uploadStickerAsset } from './backend';

export const fetchStickerPacks = async () => (await getJson('/api/stickers/packs')).data || [];
export const fetchStickers = async (options = {}) => {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => { if (value) params.set(key, value); });
  return (await getJson(`/api/stickers${params.toString() ? `?${params.toString()}` : ''}`)).data || [];
};
export const fetchRecentStickers = async () => (await getJson('/api/stickers/recent')).data || [];
export const fetchFavoriteStickers = async () => (await getJson('/api/stickers/favorites')).data || [];
export const recordStickerUse = async (stickerId) => (await postJson(`/api/stickers/${encodeURIComponent(stickerId)}/use`, {})).data;
export const favoriteSticker = async (stickerId, favorite = true) => (await postJson(`/api/stickers/${encodeURIComponent(stickerId)}/favorite`, { favorite })).data;
export const deleteSticker = async (stickerId) => (await deleteJson(`/api/stickers/${encodeURIComponent(stickerId)}`)).data;
export const uploadStickerMedia = async (file, onProgress, options = {}) => uploadStickerAsset(file, { onProgress, ...options });
export const createSticker = async (payload) => (await postJson('/api/stickers', payload)).data;
export const createStickerPack = async (payload) => (await postJson('/api/stickers/packs', payload)).data;
export const updateStickerPack = async (packId, payload) => (await putJson(`/api/stickers/packs/${encodeURIComponent(packId)}`, payload)).data;
export const getStickerStorage = async () => (await getJson('/api/stickers/storage')).data;
export const removeStickerBackground = async (stickerId) => (await postJson(`/api/stickers/${encodeURIComponent(stickerId)}/remove-background`, {})).data;
