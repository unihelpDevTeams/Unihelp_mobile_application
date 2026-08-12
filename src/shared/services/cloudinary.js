const sanitizeAttachmentName = (value = 'download.pdf') => {
  const fileName = String(value).split(/[\\/]/).pop() || 'download.pdf';
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return safeName.replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'download.pdf';
};

const extractFileNameFromUrl = (url = '') => {
  const cleanUrl = String(url).split('?')[0];
  const parts = cleanUrl.split('/');
  return parts[parts.length - 1] || 'download.pdf';
};

const hasUploadSegment = (url = '') => String(url).includes('/upload/');

export const isUsableUrl = (url = '') => {
  const value = String(url || '').trim();
  return (
    /^https?:\/\//i.test(value) &&
    !['null', 'undefined', 'about:blank'].includes(value.toLowerCase())
  );
};

export const isPdfUrl = (url = '') => {
  const value = String(url);
  return (
    /\.pdf(\?.*)?$/i.test(value) ||
    /\/raw\/upload\//i.test(value) ||
    /[?&](format|fileType|mimeType)=pdf\b/i.test(value)
  );
};

export const isCloudinaryPdfPreviewImageUrl = (url = '') =>
  hasUploadSegment(url) && /\/upload\/[^/]*(?:pg_|f_jpg|f_auto)[^/]*\//i.test(String(url)) && /\.(jpe?g|png|webp)(\?.*)?$/i.test(String(url));

const stripCloudinaryTransformations = (url = '') =>
  String(url).replace(/\/upload\/([^/]+)\//i, (match, segment) => {
    const isTransformation = segment.split(',').some((part) => /^(a|ar|b|c|co|d|dl|e|f|fl|g|h|l|o|pg|q|r|t|w|x|y|z)_/i.test(part));
    return isTransformation ? '/upload/' : match;
  });

export const getCloudinaryOriginalUrl = (url = '') => {
  if (!isUsableUrl(url) || !hasUploadSegment(url)) return isUsableUrl(url) ? String(url).trim() : '';

  return stripCloudinaryTransformations(String(url).trim())
    .replace(/\.(jpe?g|png|webp)(\?.*)?$/i, '.pdf$2');
};

export const isPreviewImageUrl = (url = '') =>
  typeof url === 'string' &&
  (url.startsWith('blob:') ||
    /\.(avif|gif|jpe?g|png|webp|svg)(\?.*)?$/i.test(url));

export const getCloudinaryPdfPageUrl = (url, page = 1, width = 1200) => {
  if (!url) return '';
  if (!/\.pdf(\?.*)?$/i.test(url) || !hasUploadSegment(url) || /\/raw\/upload\//i.test(url)) {
    return url;
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeWidth = Math.max(320, Number(width) || 1200);

  return url
    .replace('/upload/', `/upload/f_auto,q_auto,pg_${safePage},w_${safeWidth}/`)
    .replace(/\.pdf(\?.*)?$/i, '.jpg$1');
};

export const getCloudinaryPreviewUrl = (url) => {
  if (!url) return '';
  if (!hasUploadSegment(url)) return url;

  if (/\.(pdf)(\?.*)?$/i.test(url)) {
    return getCloudinaryPdfPageUrl(url, 1, 1200);
  }

  return url;
};

export const getCloudinaryAttachmentUrl = (url, fileName) => {
  if (!url) return '';
  if (!hasUploadSegment(url)) return url;

  const attachmentName = sanitizeAttachmentName(fileName || extractFileNameFromUrl(url));

  return getCloudinaryOriginalUrl(url).replace('/upload/', `/upload/fl_attachment:${attachmentName}/`);
};
