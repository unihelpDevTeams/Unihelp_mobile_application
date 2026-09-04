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
  setDoc,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../../firebase/config';

import { COLLECTIONS, conversationSubcollections, groupSubcollections, profileDefaults, userSubcollections } from '../firestoreSchema';
import { sendAppNotification, getJson, postJson, putJson, deleteJson } from './backend';

const mapDocs = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const RESOURCE_ADMIN_EMAILS = new Set(['iadejuwon77@gmail.com', 'onakomayaokiki@gmail.com']);
const collectionMapForType = {
  announcement: COLLECTIONS.announcements,
  note: COLLECTIONS.notes,
  question: COLLECTIONS.questions,
  group: COLLECTIONS.groups,
  story: COLLECTIONS.stories,
  hostel: COLLECTIONS.hostels,
  listing: COLLECTIONS.studentMarketplace,
  tutorial: COLLECTIONS.tutorials,
  studyMaterial: COLLECTIONS.studyMaterials,
  formula: COLLECTIONS.formulas,
};

const currentUserIsResourceAdmin = async () => {
  const user = auth.currentUser;
  if (!user?.uid) return false;
  if (RESOURCE_ADMIN_EMAILS.has(String(user.email || '').toLowerCase())) return true;
  const profile = await getCurrentUserProfile(user.uid);
  return profile?.admin === true;
};

const ownsResource = (data = {}, uid) =>
  Boolean(uid && [data.ownerId, data.uploadedBy, data.userId].includes(uid));

const sanitizeResourceUpdate = (payload = {}) => {
  const {
    id,
    ownerId,
    uploadedBy,
    userId,
    createdAt,
    ...safePayload
  } = payload;
  return safePayload;
};

const orderedPage = async (name, field = 'createdAt', direction = 'desc', pageSize = 20, cursor = null) => {
  const constraints = [orderBy(field, direction)];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(collection(db, name), ...constraints));
  return {
    items: mapDocs(snapshot),
    cursor: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  };
};

const orderedList = async (name, field = 'createdAt', direction = 'desc', pageSize = 20) => {
  const page = await orderedPage(name, field, direction, pageSize);
  return page.items;
};

export async function getCurrentUserProfile(uid = auth.currentUser?.uid) {
  if (!uid) return null;
  try {
    const res = await getJson('/api/users');
    return res.data || null;
  } catch (error) {
    console.error('Failed to get user profile from API', error);
    return null;
  }
}

export async function syncCurrentUserProfile(payload = {}) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  try {
    const nextUsername = payload.username?.trim?.() || payload.username || '';
    const nextPayload = {
      ...payload,
      ...(nextUsername ? { usernameLower: nextUsername.toLowerCase() } : {}),
    };
    const res = await putJson('/api/users', nextPayload);
    return res.data || null;
  } catch (error) {
    console.error('Failed to sync user profile', error);
    return null;
  }
}

// Profile cache to avoid redundant reads after writes
let profileCacheRef = null;

export async function ensureCurrentUserProfile(overrides = {}) {
  if (!auth.currentUser) return null;
  
  try {
    const existingRes = await getJson('/api/users').catch(() => null);
    
    if (!existingRes || !existingRes.data) {
      const defaultProfile = profileDefaults(auth.currentUser, overrides);
      const res = await putJson('/api/users', defaultProfile);
      profileCacheRef = res.data;
      return profileCacheRef;
    }
    
    const existingData = existingRes.data;
    const nextProfile = { ...overrides };

    if (typeof nextProfile.username === 'string' && nextProfile.username.trim()) {
      nextProfile.usernameLower = nextProfile.username.trim().toLowerCase();
    }

    const mergedProfile = {
      ...existingData,
      ...nextProfile,
    };

    if (overrides.role === undefined && existingData?.role) {
      mergedProfile.role = existingData.role;
    }

    if (overrides.username === undefined && existingData?.username) {
      mergedProfile.username = existingData.username;
      mergedProfile.usernameLower = existingData.usernameLower;
    }

    const overrideKeys = Object.keys(overrides).filter(
      (key) => key !== 'provider' && overrides[key] !== undefined
    );
    const hasRealChanges = overrideKeys.some(
      (key) => JSON.stringify(existingData?.[key]) !== JSON.stringify(overrides[key])
    );

    if (hasRealChanges) {
      const res = await putJson('/api/users', mergedProfile);
      profileCacheRef = res.data;
      return profileCacheRef;
    }

    profileCacheRef = existingData;
    return profileCacheRef;
  } catch (error) {
    console.error('Failed to ensure user profile', error);
    return null;
  }
}

export async function fetchAnnouncements() {
  return orderedList(COLLECTIONS.announcements);
}

export async function fetchAnnouncementsPage({ pageSize = 20, cursor = null } = {}) {
  return orderedPage(COLLECTIONS.announcements, 'createdAt', 'desc', pageSize, cursor);
}

export async function fetchNotes(options = {}) {
  return orderedList(COLLECTIONS.notes, 'createdAt', 'desc', options.pageSize || 20);
}

export async function fetchNotesPage({ pageSize = 20, cursor = null } = {}) {
  return orderedPage(COLLECTIONS.notes, 'createdAt', 'desc', pageSize, cursor);
}

export async function fetchQuestions(options = {}) {
  return orderedList(COLLECTIONS.questions, 'createdAt', 'desc', options.pageSize || 20);
}

export async function fetchQuestionsPage({ pageSize = 20, cursor = null } = {}) {
  return orderedPage(COLLECTIONS.questions, 'createdAt', 'desc', pageSize, cursor);
}

export async function fetchGroupsPage({ pageSize = 20, cursor = null } = {}) {
  const safePageSize = Math.max(1, Number(pageSize) || 20);
  const constraints = [orderBy('lastActivityAt', 'desc')];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(safePageSize));

  const snapshot = await getDocs(query(collection(db, COLLECTIONS.groups), ...constraints));
  return {
    items: mapDocs(snapshot).filter((item) => item?.id),
    cursor: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === safePageSize,
  };
}

export async function fetchGroups() {
  return (await fetchGroupsPage({ pageSize: 20 })).items;
}

export async function fetchUserGroups(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snapshot = await getDocs(collection(db, 'users', uid, 'groups'));
  return mapDocs(snapshot);
}

export async function fetchStories() {
  const data = await getJson('/api/stories?page=1&limit=20');
  return data.items || [];
}

export async function fetchStoriesPage({ pageSize = 20, page = 1 } = {}) {
  const data = await getJson(`/api/stories?page=${page}&limit=${pageSize}`);
  return {
    items: data.items || [],
    page: data.page || page,
    hasMore: data.hasMore || false,
  };
}

export async function fetchHostels() {
  const data = await getJson('/api/hostels?page=1&limit=20');
  return data.items || [];
}

export async function fetchHostelsPage({ pageSize = 20, page = 1 } = {}) {
  const data = await getJson(`/api/hostels?page=${page}&limit=${pageSize}`);
  return {
    items: data.items || [],
    page: data.page || page,
    hasMore: data.hasMore || false,
  };
}

export async function fetchStudentListings() {
  const data = await getJson('/api/marketplace?page=1&limit=20');
  return data.items || [];
}

export async function fetchStudentListingsPage({ pageSize = 20, page = 1 } = {}) {
  const data = await getJson(`/api/marketplace?page=${page}&limit=${pageSize}`);
  return {
    items: data.items || [],
    page: data.page || page,
    hasMore: data.hasMore || false,
  };
}

export async function fetchTasks(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')));
  return mapDocs(snapshot).filter((item) => item.userId === uid || !item.userId);
}

export async function fetchGpaRecords(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, 'GPARecords'), orderBy('createdAt', 'desc')));
  return mapDocs(snapshot).filter((item) => item.userId === uid || !item.userId);
}

export async function fetchCgpaRecords(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, 'cgpaTracker'), orderBy('createdAt', 'desc')));
  return mapDocs(snapshot).filter((item) => item.userId === uid || !item.userId);
}

export async function fetchNotifications(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const page = await fetchNotificationsPage({ uid });
  return page.items;
}

export async function fetchNotificationsPage({ uid = auth.currentUser?.uid, pageSize = 30, cursor = null } = {}) {
  if (!cursor) {
    try {
      const { items } = await getJson('/api/notifications?pageSize=' + pageSize);
      return { items, cursor: null, hasMore: false };
    } catch (e) {
      console.error('API notifications fetch failed, falling back to firebase', e);
    }
  }

  if (!uid) return { items: [], cursor: null, hasMore: false };
  const constraints = [orderBy('createdAt', 'desc')];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(collection(db, COLLECTIONS.notifications, uid, 'items'), ...constraints));
  return {
    items: mapDocs(snapshot),
    cursor: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

export async function fetchConversations(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.conversations)));
  return mapDocs(snapshot)
    .filter((item) => Array.isArray(item.memberIds) && item.memberIds.includes(uid))
    .filter((item) => {
      const deletedAt = item.deletedFor?.[uid]?.toDate?.()?.getTime?.() || 0;
      const updatedAt = item.updatedAt?.toDate?.()?.getTime?.() || 0;
      return !deletedAt || updatedAt > deletedAt;
    })
    .sort((left, right) => {
      const leftTime = left.updatedAt?.toDate?.()?.getTime?.() || 0;
      const rightTime = right.updatedAt?.toDate?.()?.getTime?.() || 0;
      return rightTime - leftTime;
    });
}

export async function fetchConversationMessages(conversationId) {
  if (!conversationId) return [];
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.conversations, conversationId, 'messages'), orderBy('createdAt', 'asc')));
  return mapDocs(snapshot);
}

export async function markNotificationRead(id, uid = auth.currentUser?.uid) {
  if (!id) return;

  const resolvedUid = uid || auth.currentUser?.uid;
  if (!resolvedUid) return;

  try {
    await postJson(`/api/notifications/${id}/read`, {});
  } catch (error) {
    console.error('API markNotificationRead failed, falling back to firebase', error);
    await setDoc(doc(db, COLLECTIONS.notifications, resolvedUid, 'items', id), { read: true }, { merge: true });
  }
}

export async function deleteNotification(id, uid = auth.currentUser?.uid) {
  if (!id) return;

  const resolvedUid = uid || auth.currentUser?.uid;
  if (!resolvedUid) return;

  try {
    await deleteJson(`/api/notifications/${encodeURIComponent(id)}`);
  } catch (error) {
    console.error('API deleteNotification failed, falling back to firebase', error);
    await deleteDoc(doc(db, COLLECTIONS.notifications, resolvedUid, 'items', id));
  }
}

export async function fetchBookmarks(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  try {
    const res = await getJson('/api/users/bookmarks');
    return res.data || [];
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return [];
  }
}

export async function saveBookmark(item) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const res = await postJson('/api/users/bookmarks', { 
    item_id: item.id || item.item_id, 
    item_type: item.type || item.item_type || 'unknown' 
  });
  return res.data?.id;
}

export async function deleteBookmark(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await deleteJson(`/api/users/bookmarks/${encodeURIComponent(id)}`);
}

export async function fetchUserActivity(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  try {
    const res = await getJson('/api/users/activity');
    return res.data || [];
  } catch (error) {
    console.error('Error fetching activity:', error);
    return [];
  }
}

const dailyStreakWriteCache = new Map();

export async function addUserActivity(payload) {
  // User activity writes are intentionally disabled to stop unnecessary Firestore reads/writes.
  // This keeps the API available without generating document churn on every app open.
  return null;
}

export async function notifyInactiveUsers() {
  console.log('Inactive-user notification job should run on a backend cron, not client side.');
  return { sent: 0, recipients: 0 };
}

export async function countUserUploads(collectionName, uid = auth.currentUser?.uid, field = 'userId') {
  if (!uid) return 0;
  if (collectionName === COLLECTIONS.hostels || collectionName === 'hostels') {
    const data = await getJson(`/api/hostels?userId=${encodeURIComponent(uid)}&limit=1`);
    return data.total ?? data.items?.length ?? 0;
  }
  if (collectionName === COLLECTIONS.studentMarketplace || collectionName === 'studentMarketplace') {
    const data = await getJson(`/api/marketplace?userId=${encodeURIComponent(uid)}&limit=1`);
    return data.total ?? data.items?.length ?? 0;
  }
  if (collectionName === COLLECTIONS.stories || collectionName === 'stories') {
    const data = await getJson(`/api/stories?authorId=${encodeURIComponent(uid)}&limit=1`);
    return data.total ?? data.items?.length ?? 0;
  }
  const snapshot = await getDocs(query(collection(db, collectionName), where(field, '==', uid)));
  return snapshot.size;
}

export async function fetchUserDocuments(collectionName, uid = auth.currentUser?.uid, field = 'userId') {
  if (!uid) return [];
  if (collectionName === COLLECTIONS.hostels || collectionName === 'hostels') {
    const data = await getJson(`/api/hostels?userId=${encodeURIComponent(uid)}&limit=100`);
    return data.items || [];
  }
  if (collectionName === COLLECTIONS.studentMarketplace || collectionName === 'studentMarketplace') {
    const data = await getJson(`/api/marketplace?userId=${encodeURIComponent(uid)}&limit=100`);
    return data.items || [];
  }
  if (collectionName === COLLECTIONS.stories || collectionName === 'stories') {
    const data = await getJson(`/api/stories?authorId=${encodeURIComponent(uid)}&limit=100`);
    return data.items || [];
  }
  const snapshot = await getDocs(query(collection(db, collectionName), where(field, '==', uid)));
  return mapDocs(snapshot).sort((left, right) => {
    const leftTime =
      left.updatedAt?.toDate?.()?.getTime?.() ||
      left.createdAt?.toDate?.()?.getTime?.() ||
      0;
    const rightTime =
      right.updatedAt?.toDate?.()?.getTime?.() ||
      right.createdAt?.toDate?.()?.getTime?.() ||
      0;
    return rightTime - leftTime;
  });
}

export async function createAnnouncement(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const ref = await addDoc(collection(db, COLLECTIONS.announcements), {
    ...payload,
    title: payload.title || '',
    body: payload.body || payload.description || '',
    description: payload.description || payload.body || '',
    authorId: auth.currentUser.uid,
    authorName: payload.authorName || auth.currentUser.displayName || 'Admin',
    priority: payload.priority || 'normal',
    targetAudience: payload.targetAudience || 'all',
    published: true,
    pinned: payload.pinned || false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function createNote(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const ref = await addDoc(collection(db, COLLECTIONS.notes), {
    ...payload,
    fileUrl: payload.fileUrl || payload.downloadUrl || payload.url || '',
    downloadUrl: payload.downloadUrl || payload.fileUrl || payload.url || '',
    previewUrl: payload.previewUrl || payload.fileUrl || payload.url || '',
    fileName: payload.fileName || payload.name || payload.title || 'document.pdf',
    fileSize: payload.fileSize || payload.size || 0,
    compressedSize: payload.compressedSize || 0,
    cloudinaryPublicId: payload.cloudinaryPublicId || '',
    cloudinaryResourceType: payload.cloudinaryResourceType || 'image',
    fileAsset: payload.fileAsset || null,
    ownerId: auth.currentUser.uid,
    uploadedBy: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function createQuestion(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  if (!(await currentUserIsResourceAdmin())) throw new Error('Only admins can upload past questions.');
  const ref = await addDoc(collection(db, COLLECTIONS.questions), {
    ...payload,
    files: Array.isArray(payload.files)
      ? payload.files
      : payload.fileUrl || payload.downloadUrl || payload.url
        ? [
            {
              name: payload.fileName || payload.name || payload.title || 'document.pdf',
              url: payload.downloadUrl || payload.fileUrl || payload.url || '',
              publicId: payload.cloudinaryPublicId || '',
              resourceType: payload.cloudinaryResourceType || 'image',
              size: payload.fileSize || payload.size || 0,
              type: payload.fileType || 'application/pdf',
            },
          ]
        : [],
    ownerId: auth.currentUser.uid,
    userId: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function updateNote(id, payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const ref = doc(db, COLLECTIONS.notes, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Note not found');
  const data = snapshot.data();
  const isAdmin = await currentUserIsResourceAdmin();
  if (!isAdmin && !ownsResource(data, auth.currentUser.uid)) {
    throw new Error('You can only edit notes you uploaded.');
  }
  await updateDoc(ref, {
    ...sanitizeResourceUpdate(payload),
    updatedAt: serverTimestamp(),
  });
}

export async function updateQuestion(id, payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  if (!(await currentUserIsResourceAdmin())) throw new Error('Only admins can edit past questions.');
  await updateDoc(doc(db, COLLECTIONS.questions, id), {
    ...sanitizeResourceUpdate(payload),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNote(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const { deleteMediaDocument } = await import('../../../services/mediaCleanup');
  await deleteMediaDocument('notes', id);
}

export async function deleteQuestion(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const { deleteMediaDocument } = await import('../../../services/mediaCleanup');
  await deleteMediaDocument('questions', id);
}

export async function createGroup(payload = {}) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');

  const form = payload.form || payload;
  const name = String(form.name || form.title || '').trim();
  const description = String(form.description || form.summary || '').trim();
  const ownerId = auth.currentUser.uid;
  const now = serverTimestamp();

  const ref = await addDoc(collection(db, COLLECTIONS.groups), {
    name,
    nameLower: name.toLowerCase(),
    description,
    category: form.category || 'Academics',
    privacy: form.privacy || 'public',
    allowMemberMessages: form.allowMemberMessages !== false,
    requireApproval: form.requireApproval !== false,
    welcomeMessage: String(form.welcomeMessage || '').trim(),
    rules: form.rules || '',
    coverUrl: form.coverUrl || form.cover?.url || '',
    avatarUrl: form.avatarUrl || form.avatar?.url || '',
    photoURL: form.photoURL || form.avatarUrl || form.avatar?.url || '',
    coverAsset: form.coverAsset || form.cover?.asset || null,
    avatarAsset: form.avatarAsset || form.avatar?.asset || null,
    ownerId,
    adminIds: [ownerId],
    moderatorIds: [],
    members: [ownerId],
    memberCount: 1,
    postCount: 0,
    mediaCount: 0,
    fileCount: 0,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });

  const ownerSummary = {
    uid: ownerId,
    name: auth.currentUser.displayName || auth.currentUser.email || 'Student',
    email: auth.currentUser.email || '',
    avatar: auth.currentUser.photoURL || '',
    role: 'owner',
    joinedAt: now,
  };

  await Promise.all([
    setDoc(doc(db, COLLECTIONS.groups, ref.id, 'members', ownerId), ownerSummary),
    setDoc(doc(db, 'users', ownerId, 'groups', ref.id), {
      groupId: ref.id,
      name,
      role: 'owner',
      joinedAt: now,
    })
  ]);

  sendAppNotification({
    userIds: [ownerId],
    title: 'Group created',
    body: `${name} is ready.`,
    type: 'group_created',
    category: 'Group',
    url: '/groups',
    data: { groupId: ref.id }
  }).catch(() => {});

  return { id: ref.id };
}

export async function createHostelListing(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const created = await postJson('/api/hostels', {
    ...payload,
  });
  return { id: created.id };
}

export async function createStudentListing(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const created = await postJson('/api/marketplace', {
    ...payload,
  });
  return { id: created.id };
}

export async function updateHostelListing(id, payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await putJson(`/api/hostels/${encodeURIComponent(id)}`, payload);
}

export async function updateStudentListing(id, payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await putJson(`/api/marketplace/${encodeURIComponent(id)}`, payload);
}

export async function createTutorialListing(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const ref = await addDoc(collection(db, COLLECTIONS.tutorials), {
    ...payload,
    userId: auth.currentUser.uid,
    ownerId: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function fetchRecord(collectionName, id) {
  try {
    if (collectionName === COLLECTIONS.hostels || collectionName === 'hostels') {
      return getJson(`/api/hostels/${encodeURIComponent(id)}`);
    }
    if (collectionName === COLLECTIONS.studentMarketplace || collectionName === 'studentMarketplace') {
      return getJson(`/api/marketplace/${encodeURIComponent(id)}`);
    }
    if (collectionName === COLLECTIONS.stories || collectionName === 'stories') {
      return getJson(`/api/stories/${encodeURIComponent(id)}`);
    }
    const snapshot = await getDoc(doc(db, collectionName, id));
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
  } catch (error) {
    console.warn('Unable to fetch record from Firestore, using local fallback:', error);
  }

  return null;
}

// Detail screens need to preserve REST errors instead of turning every API
// failure into an ambiguous "Item not found" state.
export async function fetchDetailRecord(type, id) {
  if (!type || !id) return null;

  if (type === 'hostel') return getJson(`/api/hostels/${encodeURIComponent(id)}`);
  if (type === 'listing') return getJson(`/api/marketplace/${encodeURIComponent(id)}`);
  if (type === 'story') return getJson(`/api/stories/${encodeURIComponent(id)}`);

  const collectionName = collectionMapForType[type] || type;
  const snapshot = await getDoc(doc(db, collectionName, id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export function groupPaths(groupId) {
  return {
    members: groupSubcollections.members(groupId),
    joinRequests: groupSubcollections.joinRequests(groupId),
    posts: groupSubcollections.posts(groupId),
    messages: groupSubcollections.messages(groupId),
  };
}

export function conversationPaths(conversationId) {
  return {
    messages: conversationSubcollections.messages(conversationId),
  };
}

export async function createStory(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  // Get author info from profile
  const userSnap = await getDoc(doc(db, COLLECTIONS.users, auth.currentUser.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const authorName = userData?.username || auth.currentUser.displayName || 'A student';
  const authorAvatar = userData?.photo || auth.currentUser.photoURL || '';

  const created = await postJson('/api/stories', {
    ...payload,
    authorId: auth.currentUser.uid,
    authorName,
    authorAvatar,
    views: 0,
    likes: 0,
    likedBy: {},
    bookmarks: 0,
    chaptersCount: 0,
    commentCount: 0,
  });

  if (payload.status === 'published') {
    try {
      await sendAppNotification({
        userIds: [auth.currentUser.uid],
        title: 'Story published',
        body: `${authorName} published a new story.`,
        type: 'story_published',
        category: 'Story',
        url: '/stories',
      });
    } catch (notificationError) {
      console.log('Story publish notification failed:', notificationError);
    }
  }

  return { id: created.id };
}

export async function updateStory(id, payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await putJson(`/api/stories/${encodeURIComponent(id)}`, payload);
}

/**
 * Toggle like on a story. Returns the new like count.
 */
export async function toggleStoryLike(storyId) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  return postJson(`/api/stories/${encodeURIComponent(storyId)}/like`, {});
}

/**
 * Add a comment to a story
 */
export async function addStoryComment(storyId, text) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  if (!text?.trim()) throw new Error('Comment cannot be empty');

  // Get commenter info
  const userSnap = await getDoc(doc(db, COLLECTIONS.users, auth.currentUser.uid));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const commenterName = userData?.username || auth.currentUser.displayName || 'Anonymous';
  const commenterAvatar = userData?.photo || auth.currentUser.photoURL || '';

  const comment = await postJson(`/api/stories/${encodeURIComponent(storyId)}/comments`, {
    text: text.trim(),
    authorId: auth.currentUser.uid,
    authorName: commenterName,
    authorAvatar: commenterAvatar,
  });
  return { id: comment.id };
}

/**
 * Fetch comments for a story, ordered by newest first
 */
export async function fetchStoryComments(storyId) {
  return getJson(`/api/stories/${encodeURIComponent(storyId)}/comments`);
}

/**
 * Increment view count on a story
 */
export async function incrementStoryView(storyId) {
  try {
    await postJson(`/api/stories/${encodeURIComponent(storyId)}/views`, {});
  } catch (error) {
    console.log('Failed to increment story view:', error?.message);
  }
}

export async function deleteHostelListing(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await deleteJson(`/api/hostels/${encodeURIComponent(id)}`);
}

export async function deleteStudentListing(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await deleteJson(`/api/marketplace/${encodeURIComponent(id)}`);
}

export async function deleteStory(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await deleteJson(`/api/stories/${encodeURIComponent(id)}`);
}

export async function createFormulaBookmark(payload) {
  return saveBookmark(payload);
}

export async function blockUser(uid) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await setDoc(doc(db, COLLECTIONS.users, uid), { blocked: true, blockedAt: serverTimestamp() }, { merge: true });
}

export async function unblockUser(uid) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await setDoc(doc(db, COLLECTIONS.users, uid), { blocked: false, unblockedAt: serverTimestamp() }, { merge: true });
}

/**
 * Record daily streak activity for the current user.
 */
export async function recordDailyStreak() {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');

  const userId = auth.currentUser.uid;
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = `${userId}:${todayKey}`;
  if (dailyStreakWriteCache.has(cacheKey)) {
    return fetchDailyStreak();
  }

  const response = await postJson('/api/streak/check-in', {});
  const result = response.data || {};
  dailyStreakWriteCache.set(cacheKey, result.streakCount || 0);
  return { ...result, todayKey };
}

/**
 * Fetch the current user's daily streak data.
 */
export async function fetchDailyStreak() {
  if (!auth.currentUser?.uid) return { streakCount: 0, streakDates: [], lastActiveDate: '' };

  const response = await getJson('/api/streak');
  return response.data || { streakCount: 0, streakDates: [], lastActiveDate: '' };
}

export async function fetchStreakRewards() {
  if (!auth.currentUser?.uid) return { rewards: [], history: [] };
  const response = await getJson('/api/streak/rewards');
  return response.data || { rewards: [], history: [] };
}

export async function fetchStreakMilestones() {
  if (!auth.currentUser?.uid) return [];
  const response = await getJson('/api/streak/milestones');
  return response.data || [];
}

export async function spinStreakReward(rewardId, idempotencyKey) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const response = await postJson(`/api/streak/rewards/${encodeURIComponent(rewardId)}/spin`, { idempotencyKey });
  return response.data;
}
