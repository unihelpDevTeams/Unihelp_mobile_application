import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';

const OWNED_INDEX_KEY = '@unihelp/local-stickers/v2';
const LEGACY_OWNED_INDEX_KEY = '@unihelp/local-stickers/v1';
const CACHE_INDEX_KEY = '@unihelp/sticker-cache/v1';
const OWNED_DIRECTORY = `${FileSystem.documentDirectory}unihelp-stickers/`;
const CACHE_DIRECTORY = `${FileSystem.cacheDirectory}unihelp-sticker-cache/`;
export const LOCAL_STICKER_LIMITS = { maxDimensions: 512, maxImageBytes: 300 * 1024, maxVideoBytes: 3 * 1024 * 1024, maxOwnedBytes: 100 * 1024 * 1024, maxCacheBytes: 100 * 1024 * 1024 };

const localId = () => `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const extensionFor = (mime = '', animated = false) => animated ? 'mp4' : mime === 'image/webp' ? 'webp' : 'jpg';
const keyFor = (cached) => cached ? CACHE_INDEX_KEY : OWNED_INDEX_KEY;
async function ensureDirectory(directory) { if (!(await FileSystem.getInfoAsync(directory)).exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true }); }
async function readIndex(cached) { try { const raw = await AsyncStorage.getItem(keyFor(cached)); const legacy = !cached && !raw ? await AsyncStorage.getItem(LEGACY_OWNED_INDEX_KEY) : null; return JSON.parse(raw || legacy || '[]'); } catch { return []; } }
const writeIndex = (cached, items) => AsyncStorage.setItem(keyFor(cached), JSON.stringify(items));
const bytesFromBase64 = (base64) => { const binary = globalThis.atob(base64); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i); return bytes; };
const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
export async function hashStickerFile(uri) { const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }); return toHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytesFromBase64(base64))); }
async function validItems(cached) { const items = await readIndex(cached); const valid = []; for (const item of items) if ((await FileSystem.getInfoAsync(item.uri).catch(() => ({ exists: false }))).exists) valid.push(item); if (valid.length !== items.length) await writeIndex(cached, valid); return valid; }
async function trimCache(items, protectedId) { let next = [...items]; while (next.reduce((total, item) => total + Number(item.fileSize || 0), 0) > LOCAL_STICKER_LIMITS.maxCacheBytes) { const oldest = next.filter((item) => item.id !== protectedId).sort((a, b) => Number(a.lastUsedAt) - Number(b.lastUsedAt))[0]; if (!oldest) throw new Error('Not enough device storage for this sticker cache.'); next = next.filter((item) => item.id !== oldest.id); await FileSystem.deleteAsync(oldest.uri, { idempotent: true }).catch(() => {}); } return next; }

async function optimizeImage(media) {
  const width = Number(media.width || 0); const height = Number(media.height || 0);
  const scale = Math.min(1, LOCAL_STICKER_LIMITS.maxDimensions / Math.max(width || 1, height || 1));
  const actions = scale < 1 ? [{ resize: { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) } }] : [];
  const result = await ImageManipulator.manipulateAsync(media.uri, actions, { compress: 0.82, format: ImageManipulator.SaveFormat.WEBP });
  const info = await FileSystem.getInfoAsync(result.uri);
  if (Number(info.size || 0) > LOCAL_STICKER_LIMITS.maxImageBytes) throw new Error('This image is still over the 300 KB sticker limit. Choose a simpler image.');
  return { uri: result.uri, width: result.width, height: result.height, mimeType: 'image/webp' };
}

export async function listLocalStickers() { return (await validItems(false)).sort((a, b) => Number(b.lastUsedAt || b.createdAt) - Number(a.lastUsedAt || a.createdAt)); }
export async function listCachedStickers() { return validItems(true); }
export async function saveLocalSticker({ media, name, editor = {}, existingId } = {}) {
  if (!media?.uri) throw new Error('Choose a photo or video first.');
  const isAnimated = String(media.type || media.mimeType || '').startsWith('video'); const optimized = isAnimated ? media : await optimizeImage(media); const sourceInfo = await FileSystem.getInfoAsync(optimized.uri);
  const maxBytes = isAnimated ? LOCAL_STICKER_LIMITS.maxVideoBytes : LOCAL_STICKER_LIMITS.maxImageBytes;
  if (!sourceInfo.exists || Number(sourceInfo.size || 0) > maxBytes) throw new Error(`Keep ${isAnimated ? 'video' : 'image'} stickers under ${Math.round(maxBytes / 1024)} KB.`);
  await ensureDirectory(OWNED_DIRECTORY); const id = existingId || localId(); const uri = `${OWNED_DIRECTORY}${id}.${extensionFor(optimized.mimeType, isAnimated)}`;
  if (optimized.uri !== uri) await FileSystem.copyAsync({ from: optimized.uri, to: uri }); const contentHash = await hashStickerFile(uri); const items = await validItems(false); const previous = items.find((item) => item.id === id);
  // Saving the same bytes twice should reuse the user's first copy. This also
  // makes a double tap or a retry harmless and prevents silent storage waste.
  const duplicate = items.find((item) => item.id !== id && item.contentHash === contentHash);
  if (duplicate) {
    if (uri !== duplicate.uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    const lastUsedAt = Date.now();
    await writeIndex(false, items.map((item) => item.id === duplicate.id ? { ...item, lastUsedAt } : item));
    return { ...duplicate, alreadySaved: true, lastUsedAt };
  }
  if (previous?.uri && previous.uri !== uri) await FileSystem.deleteAsync(previous.uri, { idempotent: true }).catch(() => {});
  const now = Date.now(); const sticker = { id, local: true, saved: true, ownerId: 'local', name: String(name || 'My Sticker').slice(0, 80), uri, assetUrl: uri, thumbnailUrl: uri, type: isAnimated ? 'animated' : 'image', isAnimated, mimeType: optimized.mimeType || (isAnimated ? 'video/mp4' : 'image/webp'), fileSize: Number(sourceInfo.size || 0), width: optimized.width || media.width || 0, height: optimized.height || media.height || 0, duration: Number(media.duration || 0), contentHash, editor, createdAt: previous?.createdAt || now, lastUsedAt: now };
  const next = [...items.filter((item) => item.id !== id), sticker]; if (next.reduce((total, item) => total + Number(item.fileSize || 0), 0) > LOCAL_STICKER_LIMITS.maxOwnedBytes) throw new Error('Your saved sticker storage is full. Remove a saved sticker and try again.'); await writeIndex(false, next); return sticker;
}
export async function deleteLocalSticker(id) { const items = await validItems(false); const target = items.find((item) => item.id === id); if (target?.uri) await FileSystem.deleteAsync(target.uri, { idempotent: true }).catch(() => {}); await writeIndex(false, items.filter((item) => item.id !== id)); }
export async function markLocalStickerUsed(id) { for (const cached of [false, true]) { const items = await readIndex(cached); await writeIndex(cached, items.map((item) => item.id === id ? { ...item, lastUsedAt: Date.now() } : item)); } }
export async function cacheReceivedSticker(sticker) {
  if (!sticker?.assetUrl || sticker.local || !/^https?:/i.test(sticker.assetUrl)) return null; const hash = String(sticker.contentHash || sticker.id || ''); if (!/^[a-zA-Z0-9_-]{8,128}$/.test(hash)) return null;
  const id = `received-${hash}`; const existing = (await validItems(true)).find((item) => item.id === id); if (existing) { await markLocalStickerUsed(id); return existing; }
  await ensureDirectory(CACHE_DIRECTORY); const uri = `${CACHE_DIRECTORY}${id}.${extensionFor(sticker.mimeType, sticker.isAnimated || sticker.type === 'animated')}`; await FileSystem.downloadAsync(sticker.assetUrl, uri);
  const contentHash = await hashStickerFile(uri); if (sticker.contentHash && contentHash !== sticker.contentHash) { await FileSystem.deleteAsync(uri, { idempotent: true }); throw new Error('Downloaded sticker integrity check failed.'); }
  const info = await FileSystem.getInfoAsync(uri); const now = Date.now(); const item = { ...sticker, id, uri, assetUrl: uri, thumbnailUrl: uri, local: true, cached: true, saved: false, contentHash, fileSize: Number(info.size || 0), createdAt: now, lastUsedAt: now }; await writeIndex(true, await trimCache([...(await validItems(true)), item], id)); return item;
}
