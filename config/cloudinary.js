/* =============================================
   CLOUDINARY CONFIG
   ============================================= */

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

export const CLOUDINARY_CONFIG = {
  cloudName:
    extra?.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME : undefined) ||
    "",
  uploadPreset:
    extra?.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
    (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET : undefined) ||
    "",
};

export const CLOUDINARY_BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}`;

export const isCloudinaryConfigured = () => {
  return (
    CLOUDINARY_CONFIG.cloudName &&
    CLOUDINARY_CONFIG.uploadPreset
  );
};
