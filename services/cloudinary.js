import { PDFDocument } from "pdf-lib";

import {
  CLOUDINARY_CONFIG,
  CLOUDINARY_BASE_URL,
  isCloudinaryConfigured,
} from "../config/cloudinary";

const PDF_MIME_TYPE = "application/pdf";

const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
  raw: 50 * 1024 * 1024,
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
];

const ALLOWED_PDF_TYPES = [PDF_MIME_TYPE];

const getFileType = (file) => file?.type || file?.mimeType || file?.contentType || "";

const isPdfFile = (file) =>
  getFileType(file) === PDF_MIME_TYPE ||
  file?.name?.toLowerCase().endsWith(".pdf") ||
  String(file?.uri || "").toLowerCase().endsWith(".pdf");

const hasUploadSegment = (url = "") => String(url).includes("/upload/");

export const isUsableUrl = (url = "") => {
  const value = String(url || "").trim();
  return (
    /^https?:\/\//i.test(value) &&
    !["null", "undefined", "about:blank"].includes(value.toLowerCase())
  );
};

export const isPreviewImageUrl = (url = "") =>
  typeof url === "string" &&
  (url.startsWith("blob:") ||
    /\.(avif|gif|jpe?g|png|webp|svg)(\?.*)?$/i.test(url));

export const isPdfUrl = (url = "") => {
  const value = String(url);
  return (
    /\.pdf(\?.*)?$/i.test(value) ||
    /\/raw\/upload\//i.test(value) ||
    /[?&](format|fileType|mimeType)=pdf\b/i.test(value)
  );
};

export const isCloudinaryPdfPreviewImageUrl = (url = "") =>
  hasUploadSegment(url) &&
  /\/upload\/[^/]*(?:pg_|f_jpg|f_auto)[^/]*\//i.test(String(url)) &&
  /\.(jpe?g|png|webp)(\?.*)?$/i.test(String(url));

const stripCloudinaryTransformations = (url = "") =>
  String(url).replace(/\/upload\/([^/]+)\//i, (match, segment) => {
    const isTransformation = segment
      .split(",")
      .some((part) => /^(a|ar|b|c|co|d|dl|e|f|fl|g|h|l|o|pg|q|r|t|w|x|y|z)_/i.test(part));
    return isTransformation ? "/upload/" : match;
  });

export const getCloudinaryOriginalUrl = (url = "") => {
  if (!isUsableUrl(url) || !hasUploadSegment(url)) return isUsableUrl(url) ? String(url).trim() : "";

  return stripCloudinaryTransformations(String(url).trim())
    .replace(/\.(jpe?g|png|webp)(\?.*)?$/i, ".pdf$2");
};

const sanitizeAttachmentName = (value = "download.pdf") => {
  const fileName = value.split(/[\\/]/).pop() || "download.pdf";
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return safeName.replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "download.pdf";
};

const extractFileNameFromUrl = (url = "") => {
  const cleanUrl = url.split("?")[0];
  const parts = cleanUrl.split("/");
  return parts[parts.length - 1] || "download.pdf";
};

const validateFile = (file, kind) => {
  const errors = [];

  if (!isCloudinaryConfigured()) {
    errors.push(
      "Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env"
    );
    return errors;
  }

  if (!file) {
    errors.push("No file provided");
    return errors;
  }

  const maxSize = FILE_SIZE_LIMITS[kind] || FILE_SIZE_LIMITS.raw;
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
    errors.push(`File size (${sizeMB}MB) exceeds the ${maxMB}MB limit`);
  }

  const fileType = getFileType(file);

  if (kind === "image" && !ALLOWED_IMAGE_TYPES.includes(fileType)) {
    errors.push(
      `Invalid image type: ${fileType}. Allowed: JPEG, PNG, WebP, GIF`
    );
  }

  if (kind === "video" && !ALLOWED_VIDEO_TYPES.includes(fileType)) {
    errors.push(
      `Invalid video type: ${fileType}. Allowed: MP4, WebM, OGG, MOV`
    );
  }

  if (kind === "pdf" && !ALLOWED_PDF_TYPES.includes(fileType) && !isPdfFile(file)) {
    errors.push("Only PDF files are allowed");
  }

  return errors;
};

const optimizePdfFile = async (file) => {
  if (typeof file?.arrayBuffer !== 'function') {
    return file;
  }

  try {
    const originalBytes = await file.arrayBuffer();
    const pdfDocument = await PDFDocument.load(originalBytes);
    const optimizedBytes = await pdfDocument.save({
      useObjectStreams: true,
    });

    if (optimizedBytes.byteLength >= originalBytes.byteLength) {
      return file;
    }

    if (typeof File === 'function') {
      return new File([optimizedBytes], file.name, {
        type: PDF_MIME_TYPE,
        lastModified: file.lastModified,
      });
    }

    return file;
  } catch {
    return file;
  }
};

export const uploadToCloudinary = async (
  file,
  {
    resourceType = 'image',
    validationKind = 'image',
    onProgress,
  } = {}
) => {
  const errors = validateFile(file, validationKind);

  if (errors.length > 0) {
    return Promise.reject(new Error(errors.join('. ')));
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    const basePublicId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const publicId = validationKind === "pdf" ? `${basePublicId}.pdf` : basePublicId;
    const uploadUrl = `${CLOUDINARY_BASE_URL}/${resourceType}/upload`;

    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('public_id', publicId);

    if (file?.uri && !file?.arrayBuffer) {
      formData.append('file', {
        uri: file.uri,
        name: file.name || file.fileName || extractFileNameFromUrl(file.uri) || 'file',
        type: file.type || file.mimeType || (isPdfFile(file) ? 'application/pdf' : 'application/octet-stream'),
      });
    } else {
      formData.append('file', file);
    }

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (onProgress) onProgress(100);
          resolve({
            secure_url: response.secure_url,
            public_id: response.public_id,
            format: response.format,
            bytes: response.bytes,
            resource_type: response.resource_type,
            original_filename: file?.name || extractFileNameFromUrl(file?.uri || '') || '',
          });
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
        return;
      }

      let message = 'Upload failed';
      try {
        const errorResponse = JSON.parse(xhr.responseText);
        message = errorResponse.error?.message || message;
      } catch (_) {}
      reject(new Error(message));
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error. Check your internet connection.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'));
    });

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
};

export const toCloudinaryAsset = (result, fallback = {}) => ({
  url: result?.secure_url || result?.url || fallback.url || "",
  publicId: result?.public_id || result?.publicId || fallback.publicId || "",
  resourceType:
    result?.resource_type || result?.resourceType || fallback.resourceType || "image",
});

const optimizeFileForUpload = async (file) => {
  if (isPdfFile(file)) {
    return optimizePdfFile(file);
  }

  return file;
};

export const uploadImage = async (file, onProgress) => {
  const optimizedFile = await optimizeFileForUpload(file);
  return uploadToCloudinary(optimizedFile, {
    resourceType: "image",
    validationKind: "image",
    onProgress,
  });
};

export const uploadVideo = async (file, onProgress) => {
  return uploadToCloudinary(file, {
    resourceType: "video",
    validationKind: "video",
    onProgress,
  });
};

export const uploadPDF = async (file, onProgress) => {
  const optimizedFile = await optimizePdfFile(file);

  return uploadToCloudinary(optimizedFile, {
    resourceType: "raw",
    validationKind: "pdf",
    onProgress,
  });
};

export const uploadFile = async (file, onProgress) => {
  if (file?.type?.startsWith("image/")) {
    return uploadImage(file, onProgress);
  }

  if (file?.type?.startsWith("video/")) {
    return uploadVideo(file, onProgress);
  }

  if (isPdfFile(file)) {
    return uploadPDF(file, onProgress);
  }

  return uploadToCloudinary(file, {
    resourceType: "raw",
    validationKind: "raw",
    onProgress,
  });
};

export const getCloudinaryPreviewUrl = (url) => {
  if (!url) return "";
  if (!hasUploadSegment(url)) return url;

  if (/\.(pdf)(\?.*)?$/i.test(url)) {
    return getCloudinaryPdfPageUrl(url, 1, 1200);
  }

  return url;
};

export const getCloudinaryPdfPageUrl = (url, page = 1, width = 1200) => {
  if (!url) return "";
  if (!/\.pdf(\?.*)?$/i.test(url) || !hasUploadSegment(url) || /\/raw\/upload\//i.test(url)) {
    return url;
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeWidth = Math.max(320, Number(width) || 1200);

  return url
    .replace(
      "/upload/",
      `/upload/f_auto,q_auto,pg_${safePage},w_${safeWidth}/`
    )
    .replace(/\.pdf(\?.*)?$/i, ".jpg$1");
};

export const getCloudinaryAttachmentUrl = (url, fileName) => {
  if (!url) return "";
  if (!hasUploadSegment(url)) return url;

  const attachmentName = sanitizeAttachmentName(
    fileName || extractFileNameFromUrl(url)
  );

  return getCloudinaryOriginalUrl(url).replace(
    "/upload/",
    `/upload/fl_attachment:${attachmentName}/`
  );
};

export default uploadFile;
