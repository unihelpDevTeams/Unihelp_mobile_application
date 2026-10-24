import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../../firebase/config';
import { COLLECTIONS } from '../firestoreSchema';

const mapSlides = (snapshot) => snapshot.docs
  .map((entry) => ({ id: entry.id, ...entry.data() }))
  .sort((left, right) => (Number(left.order) || 0) - (Number(right.order) || 0));

export async function fetchActiveHomeHeroSlides() {
  const snapshot = await getDocs(query(
    collection(db, COLLECTIONS.homeHeroSlides),
    where('enabled', '==', true)
  ));
  return mapSlides(snapshot);
}

export async function fetchHomeHeroSlidesForAdmin() {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const snapshot = await getDocs(collection(db, COLLECTIONS.homeHeroSlides));
  return mapSlides(snapshot);
}

export async function createHomeHeroSlide(payload = {}) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const ref = await addDoc(collection(db, COLLECTIONS.homeHeroSlides), {
    title: String(payload.title || '').trim(),
    linkUrl: String(payload.linkUrl || '').trim(),
    imageUrl: String(payload.imageUrl || '').trim(),
    imageAsset: payload.imageAsset || null,
    order: Number(payload.order) || 0,
    enabled: payload.enabled !== false,
    createdBy: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function deleteHomeHeroSlide(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  if (!id) throw new Error('Missing hero slide id');
  await deleteDoc(doc(db, COLLECTIONS.homeHeroSlides, id));
}