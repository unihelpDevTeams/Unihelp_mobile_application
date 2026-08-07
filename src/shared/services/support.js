import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  startAfter,
} from 'firebase/firestore';
import { auth, db } from '../../../firebase/config';
import { COLLECTIONS } from '../firestoreSchema';

const mapDocs = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

// ============================================================
// CONTACT MESSAGES
// ============================================================

export async function submitContactMessage({ name, email, phone, subject, message }) {
  const docData = {
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || '',
    subject: subject.trim(),
    message: message.trim(),
    userId: auth.currentUser?.uid || null,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTIONS.contactMessages), docData);
  return { id: ref.id, ...docData };
}

export async function fetchContactMessages({
  statusFilter,
  searchQuery,
  sortField = 'createdAt',
  sortDirection = 'desc',
  pageSize = 20,
  lastDoc = null,
} = {}) {
  const constraints = [orderBy(sortField, sortDirection)];

  if (statusFilter && statusFilter !== 'all') {
    constraints.unshift(where('status', '==', statusFilter));
  }

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(collection(db, COLLECTIONS.contactMessages), ...constraints));
  let items = mapDocs(snapshot);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.subject?.toLowerCase().includes(q) ||
        item.message?.toLowerCase().includes(q)
    );
  }

  return {
    items,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

// ============================================================
// REPORTS
// ============================================================

export async function submitReport({ reportType, title, description, attachments }) {
  if (!auth.currentUser?.uid) throw new Error('You must be logged in to submit a report.');

  const docData = {
    userId: auth.currentUser.uid,
    displayName: auth.currentUser.displayName || '',
    email: auth.currentUser.email || '',
    reportType: reportType.trim(),
    title: title?.trim() || '',
    description: description.trim(),
    attachments: attachments || [],
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTIONS.reports), docData);
  return { id: ref.id, ...docData };
}

export async function fetchReports({
  statusFilter,
  searchQuery,
  sortField = 'createdAt',
  sortDirection = 'desc',
  pageSize = 20,
  lastDoc = null,
} = {}) {
  const constraints = [orderBy(sortField, sortDirection)];

  if (statusFilter && statusFilter !== 'all') {
    constraints.unshift(where('status', '==', statusFilter));
  }

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(collection(db, COLLECTIONS.reports), ...constraints));
  let items = mapDocs(snapshot);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.reportType?.toLowerCase().includes(q) ||
        item.displayName?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q)
    );
  }

  return {
    items,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

// ============================================================
// SUGGESTIONS
// ============================================================

export async function submitSuggestion({ title, category, description }) {
  if (!auth.currentUser?.uid) throw new Error('You must be logged in to submit a suggestion.');

  const docData = {
    userId: auth.currentUser.uid,
    title: title.trim(),
    category: category.trim(),
    description: description?.trim() || '',
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTIONS.suggestions), docData);
  return { id: ref.id, ...docData };
}

export async function fetchSuggestions({
  statusFilter,
  categoryFilter,
  searchQuery,
  sortField = 'createdAt',
  sortDirection = 'desc',
  pageSize = 20,
  lastDoc = null,
} = {}) {
  const constraints = [orderBy(sortField, sortDirection)];

  if (statusFilter && statusFilter !== 'all') {
    constraints.unshift(where('status', '==', statusFilter));
  }

  if (categoryFilter && categoryFilter !== 'all') {
    constraints.unshift(where('category', '==', categoryFilter));
  }

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(collection(db, COLLECTIONS.suggestions), ...constraints));
  let items = mapDocs(snapshot);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
    );
  }

  return {
    items,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

// ============================================================
// STATUS MANAGEMENT
// ============================================================

export async function updateSupportItemStatus(collectionName, itemId, newStatus) {
  const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
  }

  await updateDoc(doc(db, collectionName, itemId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  return { id: itemId, status: newStatus };
}

// ============================================================
// ADMIN NOTES
// ============================================================

export async function addAdminNote(collectionName, itemId, note) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');

  const noteData = {
    adminId: auth.currentUser.uid,
    adminName: auth.currentUser.displayName || auth.currentUser.email || 'Admin',
    note: note.trim(),
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, collectionName, itemId, COLLECTIONS.supportNotes),
    noteData
  );
  return { id: ref.id, ...noteData };
}

export async function fetchAdminNotes(collectionName, itemId) {
  const snapshot = await getDocs(
    query(
      collection(db, collectionName, itemId, COLLECTIONS.supportNotes),
      orderBy('createdAt', 'asc')
    )
  );
  return mapDocs(snapshot);
}

// ============================================================
// SINGLE ITEM FETCH
// ============================================================

export async function fetchSupportItem(collectionName, itemId) {
  const snapshot = await getDoc(doc(db, collectionName, itemId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

// ============================================================
// DELETE
// ============================================================

export async function deleteSupportItem(collectionName, itemId) {
  await deleteDoc(doc(db, collectionName, itemId));
}