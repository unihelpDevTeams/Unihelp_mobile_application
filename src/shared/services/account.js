import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import {
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../../firebase/config';
import { COLLECTIONS } from '../firestoreSchema';
import { deleteCloudinaryAssets, deleteCurrentUserWithMedia } from '../../../services/mediaCleanup';

const DELETE_BATCH_SIZE = 400;
const RECENT_SIGN_IN_WINDOW_MS = 5 * 60 * 1000;
const CLOUDINARY_HOST = 'res.cloudinary.com';
const RESOURCE_TYPES = new Set(['image', 'video', 'raw']);

function hasRecentSignIn(user) {
  const lastSignIn = user?.metadata?.lastSignInTime ? Date.parse(user.metadata.lastSignInTime) : NaN;
  return Number.isFinite(lastSignIn) && Date.now() - lastSignIn <= RECENT_SIGN_IN_WINDOW_MS;
}

async function deleteCollectionPath(collectionPath) {
  const snapshot = await getDocs(collection(db, collectionPath));
  const docs = snapshot.docs;

  for (let index = 0; index < docs.length; index += DELETE_BATCH_SIZE) {
    const batch = writeBatch(db);
    docs.slice(index, index + DELETE_BATCH_SIZE).forEach((item) => {
      batch.delete(item.ref);
    });
    await batch.commit();
  }

  return docs.length;
}

function inferResourceType(value = {}) {
  const explicit = value.resourceType || value.resource_type || value.cloudinaryResourceType || value.cloudinary_resource_type;
  if (RESOURCE_TYPES.has(explicit)) return explicit;

  const type = value.type || value.mimeType || '';
  if (typeof type === 'string') {
    if (type.startsWith('video/') || type === 'video') return 'video';
    if (type.startsWith('image/') || type === 'image') return 'image';
    if (type === 'pdf' || type === 'document' || type === 'raw') return 'raw';
  }

  return 'image';
}

function collectAssetsFromString(value = '', assets = []) {
  if (!value || typeof value !== 'string' || !value.includes(CLOUDINARY_HOST)) {
    return assets;
  }

  const matches = value.match(/https?:\/\/res\.cloudinary\.com\/[^\s)"']+/g) || [];
  matches.forEach((url) => {
    const resourceMatch = url.match(/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\//);
    assets.push({
      url,
      publicId: null,
      resourceType: resourceMatch?.[1] || 'image',
    });
  });

  return assets;
}

function collectCloudinaryAssets(value, assets = []) {
  if (!value) return assets;

  if (Array.isArray(value)) {
    value.forEach((item) => collectCloudinaryAssets(item, assets));
    return assets;
  }

  if (typeof value === 'string') {
    collectAssetsFromString(value, assets);
    return assets;
  }

  if (typeof value !== 'object') return assets;

  const publicId = value.publicId || value.public_id || value.cloudinaryPublicId || value.cloudinary_public_id;
  if (publicId) {
    assets.push({
      url: value.url || value.secure_url || value.fileUrl || value.downloadUrl || value.previewUrl || '',
      publicId,
      resourceType: inferResourceType(value),
    });
  }

  Object.values(value).forEach((nested) => collectCloudinaryAssets(nested, assets));
  return assets;
}

function dedupeAssets(assets = []) {
  const seen = new Set();
  return assets.filter((asset) => {
    const key = `${asset.publicId || ''}|${asset.url || ''}|${asset.resourceType || 'image'}`;
    if ((!asset.publicId && !asset.url) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function cleanupActivityCloudinaryAssets(uid) {
  const snapshot = await getDocs(collection(db, COLLECTIONS.users, uid, 'activity'));
  const assets = dedupeAssets(
    snapshot.docs.flatMap((entry) => collectCloudinaryAssets(entry.data(), []))
  );

  if (!assets.length) {
    return { deletedCloudinaryAssets: 0, skippedCloudinaryAssets: 0, failedCloudinaryAssets: 0 };
  }

  const result = await deleteCloudinaryAssets({ assets });
  return {
    deletedCloudinaryAssets: result.deletedAssets || 0,
    skippedCloudinaryAssets: result.skippedAssets || 0,
    failedCloudinaryAssets: result.failedAssets || 0,
  };
}

export function requiresPasswordForAccountDeletion(user) {
  return user?.providerData?.some((provider) => provider.providerId === 'password') ?? false;
}

export async function deleteCurrentUserAccount({ password = '' } = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user found.');
  }

  if (requiresPasswordForAccountDeletion(currentUser)) {
    if (!password.trim()) {
      throw new Error('Enter your password to confirm account deletion.');
    }
    if (!currentUser.email) {
      throw new Error('This account does not have an email address available for password confirmation.');
    }

    const credential = EmailAuthProvider.credential(currentUser.email, password.trim());
    await reauthenticateWithCredential(currentUser, credential);
  } else if (!hasRecentSignIn(currentUser)) {
    const error = new Error('Please sign in again before deleting your account.');
    error.code = 'auth/requires-recent-login';
    throw error;
  }

  const uid = currentUser.uid;
  const activityCloudinaryResult = await cleanupActivityCloudinaryAssets(uid);
  const deletedActivities = await deleteCollectionPath(`${COLLECTIONS.users}/${uid}/activity`);
  const mediaResult = await deleteCurrentUserWithMedia();

  return {
    deletedActivities,
    deletedCloudinaryAssets: (activityCloudinaryResult.deletedCloudinaryAssets || 0) + (mediaResult.deletedAssets || 0),
    skippedCloudinaryAssets: (activityCloudinaryResult.skippedCloudinaryAssets || 0) + (mediaResult.skippedAssets || 0),
    failedCloudinaryAssets: (activityCloudinaryResult.failedCloudinaryAssets || 0) + (mediaResult.failedAssets || 0),
  };
}

export async function deleteCurrentUserActivities() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No authenticated user found.');
  }

  const cloudinaryResult = await cleanupActivityCloudinaryAssets(currentUser.uid);
  const deletedActivities = await deleteCollectionPath(`${COLLECTIONS.users}/${currentUser.uid}/activity`);

  return { deletedActivities, ...cloudinaryResult };
}
