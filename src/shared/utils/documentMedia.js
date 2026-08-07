import {
  getCloudinaryAttachmentUrl,
  getCloudinaryOriginalUrl,
  getCloudinaryPreviewUrl,
  isCloudinaryPdfPreviewImageUrl,
  isPdfUrl,
  isPreviewImageUrl,
  isUsableUrl,
} from '../services/cloudinary';

const firstValidString = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim() && !['null', 'undefined'].includes(value.trim().toLowerCase()));

const getFirstFile = (files) => (Array.isArray(files) && files.length ? files[0] : null);

const readNestedMediaUrl = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || '';
  }

  if (value && typeof value === 'object') {
    return (
      firstValidString(
        value.url,
        value.secure_url,
        value.previewUrl,
        value.fileUrl,
        value.downloadUrl,
        value.link,
        value.href
      ) || ''
    );
  }

  return '';
};

export function resolveDocumentAsset(item = {}) {
  const firstFile = getFirstFile(item.files);
  const rawCandidates = [
    item.fileUrl,
    item.pdfUrl,
    readNestedMediaUrl(item.fileAsset),
    readNestedMediaUrl(item.asset),
    readNestedMediaUrl(firstFile),
    firstFile?.url,
    firstFile?.secure_url,
    item.downloadUrl,
    item.url,
    item.link,
  ]
    .map((value) => firstValidString(value) || '')
    .map((value) => getCloudinaryOriginalUrl(value))
    .filter((value) => isUsableUrl(value) && !isCloudinaryPdfPreviewImageUrl(value));

  const rawUrl = rawCandidates[0] || '';

  const fileName =
    firstValidString(
      item.fileName,
      item.originalFileName,
      item.original_filename,
      firstFile?.name,
      firstFile?.original_filename,
      item.title,
      item.name
    ) || 'document.pdf';

  const previewSource =
    firstValidString(
      item.previewUrl,
      item.thumbnailUrl,
      item.coverUrl,
      item.fileUrl,
      item.imageUrl,
      rawUrl
    ) || rawUrl;

  const previewUrl = getCloudinaryPreviewUrl(previewSource);
  const directDownloadUrl = rawUrl || getCloudinaryOriginalUrl(item.downloadUrl || '');

  const downloadUrl = getCloudinaryAttachmentUrl(
    directDownloadUrl,
    fileName
  );

  const hasDocumentUrl = Boolean(rawUrl || directDownloadUrl);
  const hasPdfSignal =
    isPdfUrl(rawUrl) ||
    isPdfUrl(item.pdfUrl) ||
    Boolean(firstFile?.type?.includes('pdf')) ||
    Boolean(item.fileType?.includes('pdf')) ||
    item.cloudinaryResourceType === 'raw';

  return {
    fileName,
    fileUrl: rawUrl || directDownloadUrl,
    previewUrl,
    downloadUrl: downloadUrl || directDownloadUrl,
    directDownloadUrl,
    firstFile,
    hasFiles: Array.isArray(item.files) && item.files.length > 0,
    hasDocumentUrl,
    isPdf: hasPdfSignal || (hasDocumentUrl && !isPreviewImageUrl(rawUrl)),
  };
}

export function formatDocumentMeta(item = {}) {
  return [
    item.school,
    item.courseCode || item.course,
    item.department || item.dept,
    item.lecturer,
    item.year
  ]
    .filter((value) => !!value)
    .join(' · ');
}
