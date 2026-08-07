import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  updateProfile as updateFirebaseAuthProfile,
} from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { uploadToCloudinary } from '../../services/cloudinary';

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

export async function uploadProfilePicture(uri, username) {
  if (!uri) return '';

  const fileName = `${username.trim().replace(/\s+/g, '-').toLowerCase() || 'profile'}.jpg`;
  const uploaded = await uploadToCloudinary(
    { uri, name: fileName, type: 'image/jpeg' },
    { resourceType: 'image', validationKind: 'image' }
  );

  return uploaded?.secure_url || '';
}

export async function createCompleteAccount(formData) {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    photoURL,
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
