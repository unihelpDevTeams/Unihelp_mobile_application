import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
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
import { sendAppNotification, getJson } from './backend';

const mapDocs = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const RESOURCE_ADMIN_EMAILS = new Set(['iadejuwon77@gmail.com', 'onakomayaokiki@gmail.com']);

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
  const snapshot = await getDoc(doc(db, COLLECTIONS.users, uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function syncCurrentUserProfile(payload = {}) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const ref = doc(db, COLLECTIONS.users, auth.currentUser.uid);
  const nextUsername = payload.username?.trim?.() || payload.username || '';
  await setDoc(
    ref,
    {
      ...payload,
      ...(nextUsername ? { usernameLower: nextUsername.toLowerCase() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return getCurrentUserProfile(auth.currentUser.uid);
}

export async function ensureCurrentUserProfile(overrides = {}) {
  if (!auth.currentUser) return null;
  const ref = doc(db, COLLECTIONS.users, auth.currentUser.uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    const defaultProfile = profileDefaults(auth.currentUser, overrides);
    await setDoc(ref, { ...defaultProfile, createdAt: serverTimestamp() }, { merge: true });
    return getCurrentUserProfile(auth.currentUser.uid);
  }

  const existingData = snapshot.data();
  const nextProfile = { ...overrides };

  if (typeof nextProfile.username === 'string' && nextProfile.username.trim()) {
    nextProfile.usernameLower = nextProfile.username.trim().toLowerCase();
  }

  const mergedProfile = {
    ...existingData,
    ...nextProfile,
    uid: auth.currentUser.uid,
    updatedAt: serverTimestamp(),
  };

  if (overrides.role === undefined && existingData?.role) {
    mergedProfile.role = existingData.role;
  }

  if (overrides.username === undefined && existingData?.username) {
    mergedProfile.username = existingData.username;
    mergedProfile.usernameLower = existingData.usernameLower;
  }

  await setDoc(ref, mergedProfile, { merge: true });

  return getCurrentUserProfile(auth.currentUser.uid);
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

export async function fetchGroups() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.groups));
  return mapDocs(snapshot)
    .filter((item) => item?.id)
    .sort((left, right) => {
      const leftTime =
        left.lastActivityAt?.toDate?.()?.getTime?.() ||
        left.updatedAt?.toDate?.()?.getTime?.() ||
        left.createdAt?.toDate?.()?.getTime?.() ||
        0;
      const rightTime =
        right.lastActivityAt?.toDate?.()?.getTime?.() ||
        right.updatedAt?.toDate?.()?.getTime?.() ||
        right.createdAt?.toDate?.()?.getTime?.() ||
        0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return String(left.name || '').localeCompare(String(right.name || ''));
    });
}

export async function fetchUserGroups(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snapshot = await getDocs(collection(db, 'users', uid, 'groups'));
  return mapDocs(snapshot);
}

export async function fetchStories() {
  try {
    return await getJson('/api/stories');
  } catch (error) {
    console.error('API stories fetch failed, falling back to firebase', error);
    return orderedList(COLLECTIONS.stories);
  }
}

export async function fetchStoriesPage({ pageSize = 20, cursor = null } = {}) {
  // If no cursor is passed, try API first
  if (!cursor) {
    try {
      const items = await getJson('/api/stories');
      return { items, cursor: null, hasMore: false };
    } catch (error) {
      return orderedPage(COLLECTIONS.stories, 'createdAt', 'desc', pageSize, cursor);
    }
  }
  return orderedPage(COLLECTIONS.stories, 'createdAt', 'desc', pageSize, cursor);
}

export async function fetchHostels() {
  try {
    return await getJson('/api/hostels');
  } catch (error) {
    console.error('API hostels fetch failed, falling back to firebase', error);
    return orderedList(COLLECTIONS.hostels);
  }
}

export async function fetchHostelsPage({ pageSize = 20, cursor = null } = {}) {
  if (!cursor) {
    try {
      const items = await getJson('/api/hostels');
      return { items, cursor: null, hasMore: false };
    } catch (error) {
      return orderedPage(COLLECTIONS.hostels, 'createdAt', 'desc', pageSize, cursor);
    }
  }
  return orderedPage(COLLECTIONS.hostels, 'createdAt', 'desc', pageSize, cursor);
}

export async function fetchStudentListings() {
  try {
    return await getJson('/api/marketplace');
  } catch (error) {
    console.error('API marketplace fetch failed, falling back to firebase', error);
    return orderedList(COLLECTIONS.studentMarketplace);
  }
}

export async function fetchStudentListingsPage({ pageSize = 20, cursor = null } = {}) {
  if (!cursor) {
    try {
      const items = await getJson('/api/marketplace');
      return { items, cursor: null, hasMore: false };
    } catch (error) {
      return orderedPage(COLLECTIONS.studentMarketplace, 'createdAt', 'desc', pageSize, cursor);
    }
  }
  return orderedPage(COLLECTIONS.studentMarketplace, 'createdAt', 'desc', pageSize, cursor);
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
  if (!uid) throw new Error('No authenticated user');
  await setDoc(doc(db, COLLECTIONS.notifications, uid, 'items', id), { read: true }, { merge: true });
}

export async function fetchBookmarks(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snapshot = await getDocs(collection(db, userSubcollections.bookmarks(uid)));
  return mapDocs(snapshot);
}

export async function saveBookmark(item) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const bookmarkRef = doc(db, COLLECTIONS.users, auth.currentUser.uid, 'bookmarks', item.id);
  await setDoc(bookmarkRef, { ...item, createdAt: serverTimestamp() });
  return bookmarkRef.id;
}

export async function deleteBookmark(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await deleteDoc(doc(db, COLLECTIONS.users, auth.currentUser.uid, 'bookmarks', id));
}

export async function fetchUserActivity(uid = auth.currentUser?.uid) {
  if (!uid) return [];
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.users, uid, 'activity'), orderBy('createdAt', 'desc')));
  return mapDocs(snapshot);
}

const dailyActivityWriteCache = new Map();
const dailyStreakWriteCache = new Map();

export async function addUserActivity(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');

  const dateKey = new Date().toISOString().slice(0, 10);
  const activityKey = `${auth.currentUser.uid}:${payload?.type || 'activity'}:${dateKey}`;
  const cached = dailyActivityWriteCache.get(activityKey);
  if (cached === dateKey) {
    return null;
  }

  const userRef = doc(db, COLLECTIONS.users, auth.currentUser.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  const lastActiveAt = userData.lastActiveAt?.toDate?.() || userData.lastActive?.toDate?.();
  const now = new Date();

  if (!lastActiveAt || now.getTime() - lastActiveAt.getTime() > 5 * 60 * 1000) {
    await setDoc(
      userRef,
      {
        lastActiveAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  const activityRef = doc(db, COLLECTIONS.users, auth.currentUser.uid, 'activity', `${payload?.type || 'activity'}_${dateKey}`);
  const activitySnap = await getDoc(activityRef);
  if (activitySnap.exists()) {
    dailyActivityWriteCache.set(activityKey, dateKey);
    return activityRef.id;
  }

  await setDoc(activityRef, {
    ...payload,
    activityKey,
    createdAt: serverTimestamp(),
  });

  dailyActivityWriteCache.set(activityKey, dateKey);
  return activityRef.id;
}

export async function notifyInactiveUsers() {
  try {
    const usersSnap = await getDocs(collection(db, COLLECTIONS.users));
    const now = Date.now();
    const inactiveCutoff = now - 20 * 60 * 60 * 1000; // 20 hours

    const recipients = [];

    usersSnap.forEach((userDoc) => {
      const user = userDoc.data() || {};
      if (user.notificationsEnabled === false || user.pushNotificationsEnabled === false) {
        return;
      }

      const lastActive = user.lastActiveAt?.toDate?.()?.getTime?.() || user.lastActive?.toDate?.()?.getTime?.() || user.updatedAt?.toDate?.()?.getTime?.();
      if (!lastActive) {
        return;
      }

      if (lastActive > inactiveCutoff) {
        return;
      }

      recipients.push(userDoc.id);
    });

    if (!recipients.length) {
      return { sent: 0, recipients: 0 };
    }

    const result = await sendAppNotification({
      userIds: recipients,
      title: 'We miss you! 🎓',
      body: 'You have been away for over 20 hours. Come back and continue learning.',
      type: 'inactive_user',
      category: 'Reminder',
      url: '/notifications',
      route: '/notifications',
    });

    return { sent: result?.sent || recipients.length, recipients: recipients.length };
  } catch (error) {
    console.log('Inactive-user notification job failed:', error);
    return { sent: 0, recipients: 0 };
  }
}

export async function countUserUploads(collectionName, uid = auth.currentUser?.uid, field = 'userId') {
  if (!uid) return 0;
  const snapshot = await getDocs(query(collection(db, collectionName), where(field, '==', uid)));
  return snapshot.size;
}

export async function fetchUserDocuments(collectionName, uid = auth.currentUser?.uid, field = 'userId') {
  if (!uid) return [];
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
    }),
    setDoc(doc(db, COLLECTIONS.notifications, ownerId, 'items', ref.id), {
      type: 'group_created',
      title: 'Group created',
      body: `${name} is ready.`,
      groupId: ref.id,
      read: false,
      createdAt: now,
    }),
  ]);

  return { id: ref.id };
}

export async function createHostelListing(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const ref = await addDoc(collection(db, COLLECTIONS.hostels), {
    ...payload,
    userId: auth.currentUser.uid,
    ownerId: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function createStudentListing(payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const ref = await addDoc(collection(db, COLLECTIONS.studentMarketplace), {
    ...payload,
    userId: auth.currentUser.uid,
    ownerId: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export async function updateHostelListing(id, payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await updateDoc(doc(db, COLLECTIONS.hostels, id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function updateStudentListing(id, payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await updateDoc(doc(db, COLLECTIONS.studentMarketplace, id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
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
    const snapshot = await getDoc(doc(db, collectionName, id));
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() };
    }
  } catch (error) {
    console.warn('Unable to fetch record from Firestore, using local fallback:', error);
  }

  return null;
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

  const ref = await addDoc(collection(db, COLLECTIONS.stories), {
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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

  return { id: ref.id };
}

export async function updateStory(id, payload) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  await updateDoc(doc(db, COLLECTIONS.stories, id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Toggle like on a story. Returns the new like count.
 */
export async function toggleStoryLike(storyId) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const storyRef = doc(db, COLLECTIONS.stories, storyId);
  const storySnap = await getDoc(storyRef);
  if (!storySnap.exists()) throw new Error('Story not found');

  const data = storySnap.data();
  const likedBy = data.likedBy || {};
  const userId = auth.currentUser.uid;
  const alreadyLiked = !!likedBy[userId];

  if (alreadyLiked) {
    // Unlike
    delete likedBy[userId];
    await updateDoc(storyRef, {
      likedBy,
      likes: increment(-1),
    });
    return { liked: false, likes: Math.max(0, (data.likes || 0) - 1) };
  } else {
    // Like
    likedBy[userId] = true;
    await updateDoc(storyRef, {
      likedBy,
      likes: increment(1),
    });
    return { liked: true, likes: (data.likes || 0) + 1 };
  }
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

  // Add comment document
  const commentRef = await addDoc(collection(db, COLLECTIONS.stories, storyId, 'comments'), {
    text: text.trim(),
    authorId: auth.currentUser.uid,
    authorName: commenterName,
    authorAvatar: commenterAvatar,
    createdAt: serverTimestamp(),
  });

  // Increment comment count on story
  await updateDoc(doc(db, COLLECTIONS.stories, storyId), {
    commentCount: increment(1),
  });

  return { id: commentRef.id };
}

/**
 * Fetch comments for a story, ordered by newest first
 */
export async function fetchStoryComments(storyId) {
  const q = query(
    collection(db, COLLECTIONS.stories, storyId, 'comments'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Increment view count on a story
 */
export async function incrementStoryView(storyId) {
  try {
    await updateDoc(doc(db, COLLECTIONS.stories, storyId), {
      views: increment(1),
    });
  } catch (error) {
    console.log('Failed to increment story view:', error?.message);
  }
}

export async function deleteHostelListing(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const { deleteMediaDocument } = await import('../../../services/mediaCleanup');
  await deleteMediaDocument('hostels', id);
}

export async function deleteStudentListing(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const { deleteMediaDocument } = await import('../../../services/mediaCleanup');
  await deleteMediaDocument('studentMarketplace', id);
}

export async function deleteStory(id) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');
  const { deleteMediaDocument } = await import('../../../services/mediaCleanup');
  await deleteMediaDocument('stories', id);
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
    return {
      streakCount: dailyStreakWriteCache.get(cacheKey),
      streakDates: [],
      todayKey,
    };
  }

  const userRef = doc(db, COLLECTIONS.users, userId);
  const snap = await getDoc(userRef);
  const userData = snap.exists() ? snap.data() : {};

  const yesterdayKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let streakCount = userData.streakCount || 0;
  let streakDates = userData.streakDates || [];

  if (streakDates.includes(todayKey)) {
    dailyStreakWriteCache.set(cacheKey, streakCount);
    return { streakCount, streakDates, todayKey };
  }

  if (streakDates.includes(yesterdayKey) || streakDates.length === 0) {
    streakCount += 1;
  } else {
    const lastDate = streakDates[streakDates.length - 1];
    streakCount = lastDate === yesterdayKey ? streakCount + 1 : 1;
  }

  streakDates = [...new Set([...streakDates, todayKey])].slice(-60);

  await updateDoc(userRef, {
    streakCount,
    lastActiveDate: todayKey,
    streakDates,
    lastActiveAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  dailyStreakWriteCache.set(cacheKey, streakCount);
  return { streakCount, streakDates, todayKey };
}

/**
 * Fetch the current user's daily streak data.
 */
export async function fetchDailyStreak() {
  if (!auth.currentUser?.uid) return { streakCount: 0, streakDates: [], lastActiveDate: '' };

  const snap = await getDoc(doc(db, COLLECTIONS.users, auth.currentUser.uid));
  if (!snap.exists()) return { streakCount: 0, streakDates: [], lastActiveDate: '' };

  const data = snap.data();
  return {
    streakCount: data.streakCount || 0,
    streakDates: data.streakDates || [],
    lastActiveDate: data.lastActiveDate || '',
  };
}
