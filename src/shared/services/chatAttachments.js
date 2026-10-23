import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

export const CHAT_ATTACHMENT_LIMITS = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  document: 25 * 1024 * 1024,
};

export const DOCUMENT_MIME_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

const unsafeName = /[\\/]|\.\.|[\u0000-\u001f]/;
const humanSize = (value = 0) => value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
export { humanSize };

export const attachmentKind = (file = {}) => {
  const mime = String(file.mimeType || file.type || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'document';
};

export async function prepareChatAttachment(asset) {
  const name = String(asset?.name || asset?.fileName || `attachment-${Date.now()}`).replace(/[\\/]/g, '_');
  const mimeType = String(asset?.mimeType || asset?.type || 'application/octet-stream').toLowerCase();
  if (!asset?.uri || unsafeName.test(name) || /html|javascript|x-msdownload|x-msdos-program/.test(mimeType)) {
    throw new Error('This file type is not supported.');
  }
  const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
  if (!info.exists) throw new Error('The selected file is no longer available.');
  const originalSize = Number(asset.size || asset.fileSize || info.size || 0);
  const kind = attachmentKind({ mimeType });
  const limit = CHAT_ATTACHMENT_LIMITS[kind];
  if (originalSize > limit) throw new Error(`${kind === 'document' ? 'Documents' : `${kind}s`} must be under ${humanSize(limit)}.`);
  if (kind === 'document' && !DOCUMENT_MIME_TYPES.includes(mimeType)) throw new Error('Choose a PDF, Office document, or plain text file.');

  let uri = asset.uri;
  let uploadedSize = originalSize;
  let compressionStatus = 'original';
  if (kind === 'image' && !['image/gif', 'image/svg+xml'].includes(mimeType)) {
    const isTransparent = mimeType === 'image/png';
    try {
      const result = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1920 } }],
        { compress: isTransparent ? 1 : 0.8, format: isTransparent ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG },
      );
      const resultInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
      if (resultInfo.exists && resultInfo.size && resultInfo.size < originalSize) {
        uri = result.uri;
        uploadedSize = resultInfo.size;
        compressionStatus = 'optimized';
      }
    } catch {
      // A picker result is still safe to send when optional optimization fails.
    }
  }
  return { uri, name, mimeType, type: mimeType, kind, originalSize, size: uploadedSize, uploadedSize, compressionStatus, width: asset.width, height: asset.height, duration: asset.duration };
}
