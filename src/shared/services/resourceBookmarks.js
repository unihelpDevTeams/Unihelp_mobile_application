import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase/config';

const BOOKMARKS = 'savedResources';
const allowedTypes = new Set(['note', 'question', 'cbt']);

const bookmarkRef = (uid, id) => doc(db, 'users', uid, BOOKMARKS, String(id));

const resourceTitle = (resource = {}) => resource.title || resource.name || resource.courseTitle || 'Saved resource';

export const resourceBookmarkId = (type, resourceId) => `${type}:${String(resourceId)}`;

export async function listResourceBookmarks(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, 'users', uid, BOOKMARKS), orderBy('savedAt', 'desc')));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => allowedTypes.has(item.resourceType));
}

export async function saveResourceBookmark({ type, resource, uid = auth.currentUser?.uid } = {}) {
  if (!uid) throw new Error('Please sign in to save a resource.');
  if (!allowedTypes.has(type)) throw new Error('This resource cannot be saved.');
  const resourceId = String(resource?.id || resource?.resourceId || '');
  if (!resourceId) throw new Error('This resource is missing an identifier.');
  const id = resourceBookmarkId(type, resourceId);
  const payload = {
    resourceType: type,
    resourceId,
    title: resourceTitle(resource),
    subject: resource.subject || resource.course || resource.courseCode || '',
    description: resource.description || resource.summary || '',
    year: resource.year || '',
    savedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (type === 'cbt') {
    payload.courseId = resourceId;
    payload.courseTitle = resource.title || resource.courseTitle || resourceTitle(resource);
  }
  await setDoc(bookmarkRef(uid, id), payload, { merge: true });
  return { id, ...payload };
}

export async function removeResourceBookmark({ type, resourceId, uid = auth.currentUser?.uid } = {}) {
  if (!uid) throw new Error('Please sign in to manage saved resources.');
  await deleteDoc(bookmarkRef(uid, resourceBookmarkId(type, resourceId)));
}

export async function toggleResourceBookmark({ type, resource, saved = false, uid = auth.currentUser?.uid } = {}) {
  if (saved) {
    await removeResourceBookmark({ type, resourceId: resource?.id || resource?.resourceId, uid });
    return { saved: false };
  }
  const bookmark = await saveResourceBookmark({ type, resource, uid });
  return { saved: true, bookmark };
}
