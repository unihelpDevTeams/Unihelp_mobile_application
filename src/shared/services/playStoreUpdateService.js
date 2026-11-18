import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

const nativeUpdates = Platform.OS === 'android'
  ? requireOptionalNativeModule('UniHelpPlayStoreUpdates')
  : null;

export const isPlayUpdateCheckSupported = Boolean(nativeUpdates);
export const PLAY_UPDATE_INSTALL_STATUS_DOWNLOADED = 11;

export async function checkPlayStoreUpdate() {
  if (!nativeUpdates) return { isAvailable: false };
  return nativeUpdates.checkForUpdateAsync();
}

export async function startFlexiblePlayUpdate() {
  if (!nativeUpdates) throw new Error('Google Play in-app updates are unavailable in this build.');
  return nativeUpdates.startFlexibleUpdateAsync();
}

export async function completeFlexiblePlayUpdate() {
  if (!nativeUpdates) throw new Error('Google Play in-app updates are unavailable in this build.');
  return nativeUpdates.completeFlexibleUpdateAsync();
}

export function addPlayUpdateInstallListener(listener) {
  return nativeUpdates?.addListener('onUpdateInstallState', listener);
}