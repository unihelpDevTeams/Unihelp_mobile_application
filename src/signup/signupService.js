import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import * as FileSystem from 'expo-file-system/legacy';
import {
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseAuthProfile,
} from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { toCloudinaryAsset, uploadToCloudinary } from '../../services/cloudinary';

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;

export async function checkUsernameAvailability(username) {
  if (!username || username.trim().length < 3) {
    return { available: false, error: 'Username must be at least 3 characters.' };
  }

  const normalized = username.trim().toLowerCase();
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('usernameLower', '==', normalized));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return { available: false, error: 'Username is already taken.' };
  }

  return { available: true };
}

export async function uploadProfilePicture(uri) {
  if (!uri) return '';

  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists || !fileInfo.size) {
    throw new Error('This image could not be read. Please try another file.');
  }

  if (fileInfo.size > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large. Please upload an image smaller than 30MB.');
  }

  const fileName = `profile-${Date.now()}.${String(uri).toLowerCase().endsWith('.png') ? 'png' : 'jpg'}`;
  const uploaded = await uploadToCloudinary(
    { uri, name: fileName, type: 'image/jpeg', size: fileInfo.size },
    { resourceType: 'image', validationKind: 'image' }
  );

  const secureUrl = uploaded?.secure_url || uploaded?.url || '';
  return {
    url: secureUrl,
    asset: toCloudinaryAsset(uploaded, { url: secureUrl, resourceType: 'image' }),
  };
}

export async function createCompleteAccount(formData) {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    photoURL,
    photoAsset,
    universityId,
    universityName,
    departmentId,
    departmentName,
    faculty,
    level,
    studentType,
    bio,
    interests,
  } = formData;

  // Step 1: Create Firebase Auth account
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const displayName = `${firstName} ${lastName}`.trim();

  await updateFirebaseAuthProfile(credential.user, {
    displayName,
    photoURL: photoURL || null,
  });

  // Step 2: Save complete profile in Firestore
  const userRef = doc(db, 'users', credential.user.uid);
  const userDocument = {
    uid: credential.user.uid,
    firstName: firstName || '',
    lastName: lastName || '',
    displayName,
    username: username.trim(),
    usernameLower: username.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
    photoURL: photoURL || '',
    photo: photoURL || '',
    photoAsset: photoAsset || null,
    universityId: universityId || '',
    universityName: universityName || '',
    departmentId: departmentId || '',
    departmentName: departmentName || '',
    faculty: faculty || '',
    level: level || '',
    studentType: studentType || '',
    bio: bio || '',
    interests: interests || [],
    points: 0,
    xp: 0,
    currentStreak: 0,
    highestStreak: 0,
    questionsAnswered: 0,
    accuracy: 0,
    badges: [],
    role: studentType || 'university',
    provider: 'email',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, userDocument, { merge: true });

  return credential;
}
