import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { COLLECTIONS } from '../firestoreSchema';
import { sendAppNotification } from './backend';

export const FRIEND_PAGE_SIZE = 20;
export const REQUEST_PAGE_SIZE = 20;
export const MESSAGE_REQUEST_COOLDOWN_DAYS = 7;
export const DAILY_FRIEND_REQUEST_LIMIT = 40;
export const DAILY_MESSAGE_REQUEST_LIMIT = 12;

export const RELATIONSHIP = {
  NONE: 'none',
  SENT: 'sent',
  RECEIVED: 'received',
  FRIENDS: 'friends',
  BLOCKED: 'blocked',
};

const mapDocs = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

export const pairId = (uidA, uidB) => [uidA, uidB].sort().join('_');
export const directedId = (from, to) => `${from}_${to}`;

const toMillis = (value) => {
  if (!value) return 0;
  const date = typeof value === 'string' ? new Date(value) : value?.toDate ? value.toDate() : value;
  return Number.isNaN(date?.getTime?.()) ? 0 : date.getTime();
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const userName = (profile = {}, fallback = 'Student') => (
  profile.username || profile.name || profile.displayName || profile.email || fallback
);

const profileSummary = (uid, profile = {}) => ({
  uid,
  name: userName(profile),
  username: profile.username || profile.name || '',
  email: profile.email || '',
  avatar: profile.photo || profile.avatar || profile.photoURL || '',
  university: profile.university || profile.school || '',
  school: profile.school || profile.university || '',
  faculty: profile.faculty || '',
  department: profile.department || '',
  level: profile.level || '',
  interests: Array.isArray(profile.interests) ? profile.interests : [],
  role: profile.role || '',
  verifiedTutor: !!profile.verifiedTutor,
  online: profile.online === true,
  lastActiveAt: profile.lastActiveAt || null,
});

export const getUserProfileById = async (uid) => {
  if (!uid) return null;
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  return snap.exists() ? { id: snap.id, uid: snap.id, ...snap.data() } : null;
};

const findSharedFriendIds = async (uidA, uidB, max = 3) => {
  const [aSnap, bSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.friends), where('users', 'array-contains', uidA), limit(80))),
    getDocs(query(collection(db, COLLECTIONS.friends), where('users', 'array-contains', uidB), limit(80))),
  ]);
  const aFriends = new Set();
  aSnap.docs.forEach((friendDoc) => {
    friendDoc.data()?.users?.forEach?.((id) => id !== uidA && aFriends.add(id));
  });
  const shared = [];
  bSnap.docs.forEach((friendDoc) => {
    friendDoc.data()?.users?.forEach?.((id) => {
      if (id !== uidB && aFriends.has(id) && shared.length < max) shared.push(id);
    });
  });
  return shared;
};

export const notifyUser = async (uid, payload) => {
  if (!uid) return;
  try {
    await sendAppNotification({
      userIds: [uid],
      title: payload.title || 'UniHelp',
      body: payload.body || '',
      type: payload.type || 'social',
      category: 'Social',
      url: payload.route || '/friends',
      route: payload.route || '/friends',
      data: payload.data || {},
    });
  } catch (error) {
    console.log('Social push notification failed:', error?.message || error);
  }
};

export const createFriendshipBatch = (batch, uidA, uidB, profileA = {}, profileB = {}) => {
  const friendshipId = pairId(uidA, uidB);
  batch.set(doc(db, COLLECTIONS.friends, friendshipId), {
    users: [uidA, uidB].sort(),
    memberIds: [uidA, uidB].sort(),
    userMap: { [uidA]: true, [uidB]: true },
    profiles: {
      [uidA]: profileSummary(uidA, profileA),
      [uidB]: profileSummary(uidB, profileB),
    },
    createdAt: serverTimestamp(),
  }, { merge: true });
  return friendshipId;
};

const readBlockState = async (transaction, uidA, uidB) => {
  const [aBlocksB, bBlocksA] = await Promise.all([
    transaction.get(doc(db, COLLECTIONS.blockedUsers, directedId(uidA, uidB))),
    transaction.get(doc(db, COLLECTIONS.blockedUsers, directedId(uidB, uidA))),
  ]);
  return aBlocksB.exists() || bBlocksA.exists();
};

const assertCanInteract = async (transaction, from, to) => {
  if (!from || !to) throw new Error('Missing user information.');
  if (from === to) throw new Error('You cannot interact with yourself.');
  const blocked = await readBlockState(transaction, from, to);
  if (blocked) throw new Error('This student is not available for requests.');
};

const checkDailyLimit = async (transaction, uid, field, max) => {
  const ref = doc(db, 'rateLimits', uid);
  const snap = await transaction.get(ref);
  const data = snap.exists() ? snap.data() : {};
  const key = todayKey();
  const current = data?.date === key ? Number(data[field] || 0) : 0;
  if (current >= max) throw new Error('Daily request limit reached. Please try again tomorrow.');
  return { ref, key, field };
};

const incrementDailyLimit = (transaction, limitInfo) => {
  transaction.set(limitInfo.ref, {
    date: limitInfo.key,
    [limitInfo.field]: increment(1),
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const listenRelationship = (currentUid, otherUid, callback) => {
  if (!currentUid || !otherUid || currentUid === otherUid) {
    callback({ state: RELATIONSHIP.NONE });
    return () => {};
  }

  const friendshipRef = doc(db, COLLECTIONS.friends, pairId(currentUid, otherUid));
  const requestRef = doc(db, COLLECTIONS.friendRequests, pairId(currentUid, otherUid));
  const currentBlockRef = doc(db, COLLECTIONS.blockedUsers, directedId(currentUid, otherUid));
  const otherBlockRef = doc(db, COLLECTIONS.blockedUsers, directedId(otherUid, currentUid));
  const state = {};

  const emit = () => {
    if (state.currentBlock?.exists || state.otherBlock?.exists) {
      callback({ state: RELATIONSHIP.BLOCKED, blockedByMe: !!state.currentBlock?.exists });
      return;
    }
    if (state.friendship?.exists) {
      callback({ state: RELATIONSHIP.FRIENDS, friendship: state.friendship.data });
      return;
    }
    const request = state.request?.data;
    if (state.request?.exists && request?.status === 'pending') {
      callback({
        state: request.from === currentUid ? RELATIONSHIP.SENT : RELATIONSHIP.RECEIVED,
        request: { id: pairId(currentUid, otherUid), ...request },
      });
      return;
    }
    callback({ state: RELATIONSHIP.NONE });
  };

  const unsubscribers = [
    onSnapshot(friendshipRef, (snap) => {
      state.friendship = { exists: snap.exists(), data: snap.exists() ? snap.data() : null };
      emit();
    }),
    onSnapshot(requestRef, (snap) => {
      state.request = { exists: snap.exists(), data: snap.exists() ? snap.data() : null };
      emit();
    }),
    onSnapshot(currentBlockRef, (snap) => {
      state.currentBlock = { exists: snap.exists() };
      emit();
    }),
    onSnapshot(otherBlockRef, (snap) => {
      state.otherBlock = { exists: snap.exists() };
      emit();
    }),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
};

export const sendFriendRequest = async ({ currentUid, targetUid, currentProfile = {}, targetProfile = {} }) => {
  await runTransaction(db, async (transaction) => {
    await assertCanInteract(transaction, currentUid, targetUid);
    const limitInfo = await checkDailyLimit(transaction, currentUid, 'friendRequests', DAILY_FRIEND_REQUEST_LIMIT);

    const friendshipRef = doc(db, COLLECTIONS.friends, pairId(currentUid, targetUid));
    const requestRef = doc(db, COLLECTIONS.friendRequests, pairId(currentUid, targetUid));
    const [friendshipSnap, requestSnap] = await Promise.all([
      transaction.get(friendshipRef),
      transaction.get(requestRef),
    ]);

    if (friendshipSnap.exists()) throw new Error('You are already friends.');
    if (requestSnap.exists() && requestSnap.data()?.status === 'pending') {
      throw new Error('A pending friend request already exists.');
    }

    transaction.set(requestRef, {
      from: currentUid,
      to: targetUid,
      status: 'pending',
      fromProfile: profileSummary(currentUid, currentProfile),
      toProfile: profileSummary(targetUid, targetProfile),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    incrementDailyLimit(transaction, limitInfo);
  });

  await notifyUser(targetUid, {
    type: 'friend_request_received',
    title: 'New friend request',
    body: `${userName(currentProfile)} wants to connect with you.`,
    route: '/friends',
    data: { from: currentUid },
  });
};

export const acceptFriendRequest = async ({ request, currentUid, currentProfile = {} }) => {
  if (!request?.id) throw new Error('Missing friend request.');
  if (request.to !== currentUid) throw new Error('Only the receiver can accept this request.');
  const senderProfile = request.fromProfile || await getUserProfileById(request.from) || {};

  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, COLLECTIONS.friendRequests, request.id);
    const snap = await transaction.get(requestRef);
    if (!snap.exists() || snap.data()?.status !== 'pending') throw new Error('This request is no longer pending.');
    await assertCanInteract(transaction, request.from, currentUid);

    const batchLike = {
      set: (...args) => transaction.set(...args),
      update: (...args) => transaction.update(...args),
    };
    createFriendshipBatch(batchLike, request.from, currentUid, senderProfile, currentProfile);
    transaction.update(requestRef, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
      respondedAt: serverTimestamp(),
      respondedBy: currentUid,
    });
  });

  await notifyUser(request.from, {
    type: 'friend_request_accepted',
    title: 'Friend request accepted',
    body: `${userName(currentProfile)} accepted your friend request.`,
    route: `/view-user-profile/${currentUid}`,
    data: { friendId: currentUid },
  });
};

export const declineFriendRequest = async ({ request, currentUid, currentProfile = {} }) => {
  if (!request?.id) throw new Error('Missing friend request.');
  if (request.to !== currentUid) throw new Error('Only the receiver can decline this request.');
  await updateDoc(doc(db, COLLECTIONS.friendRequests, request.id), {
    status: 'declined',
    updatedAt: serverTimestamp(),
    respondedAt: serverTimestamp(),
    respondedBy: currentUid,
  });
  await notifyUser(request.from, {
    type: 'friend_request_declined',
    title: 'Friend request declined',
    body: `${userName(currentProfile)} declined your friend request.`,
    route: '/friends',
    data: { friendId: currentUid },
  });
};

export const cancelFriendRequest = async ({ requestId, currentUid }) => {
  const ref = doc(db, COLLECTIONS.friendRequests, requestId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.from !== currentUid) throw new Error('Only the sender can cancel this request.');
    if (data.status !== 'pending') throw new Error('This request is no longer pending.');
    transaction.delete(ref);
  });
};

export const removeFriend = async ({ currentUid, friendUid, currentProfile = {} }) => {
  if (!currentUid || !friendUid) throw new Error('Missing friendship details.');
  await deleteDoc(doc(db, COLLECTIONS.friends, pairId(currentUid, friendUid)));
  await notifyUser(friendUid, {
    type: 'friend_removed',
    title: 'Friend removed',
    body: `${userName(currentProfile)} removed the friendship connection.`,
    route: '/friends',
    data: { friendId: currentUid },
  });
};

export const blockStudent = async ({ currentUid, targetUid, currentProfile = {}, targetProfile = {} }) => {
  if (!currentUid || !targetUid || currentUid === targetUid) throw new Error('You cannot block this student.');
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.blockedUsers, directedId(currentUid, targetUid)), {
    blockerId: currentUid,
    blockedId: targetUid,
    blockerProfile: profileSummary(currentUid, currentProfile),
    blockedProfile: profileSummary(targetUid, targetProfile),
    createdAt: serverTimestamp(),
  }, { merge: true });
  batch.delete(doc(db, COLLECTIONS.friends, pairId(currentUid, targetUid)));
  batch.delete(doc(db, COLLECTIONS.friendRequests, pairId(currentUid, targetUid)));
  await batch.commit();
  await notifyUser(currentUid, {
    type: 'user_blocked',
    title: 'User blocked',
    body: 'This student can no longer interact with you.',
    route: '/friends',
    data: { blockedId: targetUid },
  });
};

export const unblockStudent = async ({ currentUid, targetUid }) => {
  await deleteDoc(doc(db, COLLECTIONS.blockedUsers, directedId(currentUid, targetUid)));
  await notifyUser(currentUid, {
    type: 'user_unblocked',
    title: 'User unblocked',
    body: 'This student can send requests again.',
    route: '/friends',
    data: { unblockedId: targetUid },
  });
};

export const createOrOpenFriendConversation = async ({ currentUser, otherUser, currentProfile = {}, otherProfile = {} }) => {
  const currentUid = currentUser?.uid || currentProfile?.uid;
  const otherUid = otherUser?.id || otherUser?.uid;
  if (!currentUid || !otherUid) throw new Error('Missing conversation details.');
  const [friendshipSnap, currentBlocks, otherBlocks] = await Promise.all([
    getDoc(doc(db, COLLECTIONS.friends, pairId(currentUid, otherUid))),
    getDoc(doc(db, COLLECTIONS.blockedUsers, directedId(currentUid, otherUid))),
    getDoc(doc(db, COLLECTIONS.blockedUsers, directedId(otherUid, currentUid))),
  ]);
  if (currentBlocks.exists() || otherBlocks.exists()) {
    throw new Error('You cannot message this student while either of you has blocked the other.');
  }
  if (!friendshipSnap.exists()) throw new Error('Become friends before chatting freely.');

  const memberIds = [currentUid, otherUid].sort();
  const conversationId = memberIds.join('_');
  await setDoc(doc(db, COLLECTIONS.conversations, conversationId), {
    memberIds,
    participants: memberIds,
    type: 'direct',
    access: 'friends',
    memberInfo: {
      [currentUid]: profileSummary(currentUid, { ...currentProfile, email: currentUser?.email || currentProfile?.email }),
      [otherUid]: profileSummary(otherUid, otherProfile || otherUser),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return conversationId;
};

export const canSendDirectMessage = async (conversation, uid) => {
  if (!conversation?.memberIds?.includes(uid)) return false;
  const otherUid = conversation.memberIds.find((id) => id !== uid);
  if (!otherUid) return false;
  const [friendshipSnap, currentBlocks, otherBlocks] = await Promise.all([
    getDoc(doc(db, COLLECTIONS.friends, pairId(uid, otherUid))),
    getDoc(doc(db, COLLECTIONS.blockedUsers, directedId(uid, otherUid))),
    getDoc(doc(db, COLLECTIONS.blockedUsers, directedId(otherUid, uid))),
  ]);
  return friendshipSnap.exists() && !currentBlocks.exists() && !otherBlocks.exists();
};

export const sendMessageRequest = async ({ currentUid, targetUid, message, currentProfile = {}, targetProfile = {} }) => {
  const trimmed = String(message || '').trim();
  if (!trimmed) throw new Error('Add a short introductory message.');
  if (trimmed.length > 500) throw new Error('Keep the intro under 500 characters.');
  const requestId = directedId(currentUid, targetUid);
  const receiverProfile = targetProfile?.uid || targetProfile?.id ? targetProfile : await getUserProfileById(targetUid) || {};
  const sharedFriendIds = receiverProfile?.privacy?.messageRequests === 'friends_of_friends'
    ? await findSharedFriendIds(currentUid, targetUid)
    : [];

  await runTransaction(db, async (transaction) => {
    await assertCanInteract(transaction, currentUid, targetUid);
    const limitInfo = await checkDailyLimit(transaction, currentUid, 'messageRequests', DAILY_MESSAGE_REQUEST_LIMIT);

    const friendshipSnap = await transaction.get(doc(db, COLLECTIONS.friends, pairId(currentUid, targetUid)));
    if (friendshipSnap.exists()) throw new Error('You are already friends. Send a normal message instead.');

    const requestRef = doc(db, COLLECTIONS.messageRequests, requestId);
    const requestSnap = await transaction.get(requestRef);
    if (requestSnap.exists()) {
      const request = requestSnap.data();
      if (request.status === 'pending') throw new Error('You already sent a pending message request.');
      if (request.status === 'declined') {
        const cooldownUntil = toMillis(request.cooldownUntil || request.updatedAt || request.createdAt);
        if (cooldownUntil && cooldownUntil > Date.now()) {
          throw new Error('You can send another message request after the seven-day cooldown.');
        }
      }
    }

    transaction.set(requestRef, {
      from: currentUid,
      to: targetUid,
      message: trimmed,
      status: 'pending',
      fromProfile: profileSummary(currentUid, currentProfile),
      toProfile: profileSummary(targetUid, targetProfile),
      sharedFriendIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      expiresAt: addDays(new Date(), 30),
    }, { merge: false });
    incrementDailyLimit(transaction, limitInfo);
  });

  await notifyUser(targetUid, {
    type: 'message_request_received',
    title: 'New message request',
    body: `${userName(currentProfile)}: ${trimmed}`,
    route: '/friends',
    data: { from: currentUid, requestId },
  });
};

export const acceptMessageRequest = async ({ request, currentUid, currentProfile = {} }) => {
  if (!request?.id) throw new Error('Missing message request.');
  if (request.to !== currentUid) throw new Error('Only the receiver can accept this request.');
  const senderProfile = request.fromProfile || await getUserProfileById(request.from) || {};
  const conversationId = pairId(request.from, currentUid);

  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, COLLECTIONS.messageRequests, request.id);
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists() || requestSnap.data()?.status !== 'pending') {
      throw new Error('This message request is no longer pending.');
    }
    await assertCanInteract(transaction, request.from, currentUid);

    const txBatch = {
      set: (...args) => transaction.set(...args),
      update: (...args) => transaction.update(...args),
    };
    createFriendshipBatch(txBatch, request.from, currentUid, senderProfile, currentProfile);
    transaction.set(doc(db, COLLECTIONS.conversations, conversationId), {
      memberIds: [request.from, currentUid].sort(),
      participants: [request.from, currentUid].sort(),
      type: 'direct',
      access: 'message_request_accepted',
      memberInfo: {
        [request.from]: profileSummary(request.from, senderProfile),
        [currentUid]: profileSummary(currentUid, currentProfile),
      },
      lastMessage: request.message,
      lastSenderId: request.from,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      [`unread.${currentUid}`]: increment(1),
    }, { merge: true });
    transaction.set(doc(collection(db, COLLECTIONS.conversations, conversationId, 'messages')), {
      text: request.message,
      type: 'text',
      isIntroductoryRequest: true,
      senderId: request.from,
      senderName: userName(senderProfile),
      senderAvatar: senderProfile.photo || senderProfile.avatar || '',
      deliveredTo: [request.from],
      readBy: [request.from],
      reactions: {},
      createdAt: serverTimestamp(),
    });
    transaction.update(requestRef, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
      respondedAt: serverTimestamp(),
      respondedBy: currentUid,
      conversationId,
    });
  });

  await notifyUser(request.from, {
    type: 'message_request_accepted',
    title: 'Message request accepted',
    body: `${userName(currentProfile)} accepted your message request. You are now friends.`,
    route: `/messages/${conversationId}`,
    data: { conversationId, friendId: currentUid },
  });
  return conversationId;
};

export const declineMessageRequest = async ({ request, currentUid, currentProfile = {} }) => {
  if (!request?.id) throw new Error('Missing message request.');
  if (request.to !== currentUid) throw new Error('Only the receiver can decline this request.');
  await updateDoc(doc(db, COLLECTIONS.messageRequests, request.id), {
    status: 'declined',
    updatedAt: serverTimestamp(),
    respondedAt: serverTimestamp(),
    respondedBy: currentUid,
    cooldownUntil: addDays(new Date(), MESSAGE_REQUEST_COOLDOWN_DAYS),
  });
  await notifyUser(request.from, {
    type: 'message_request_declined',
    title: 'Message request declined',
    body: `${userName(currentProfile)} declined your message request.`,
    route: '/friends',
    data: { receiverId: currentUid },
  });
};

export const listenFriends = (uid, callback, pageSize = FRIEND_PAGE_SIZE) => {
  if (!uid) return () => {};
  const q = query(collection(db, COLLECTIONS.friends), where('users', 'array-contains', uid), orderBy('createdAt', 'desc'), limit(pageSize));
  return onSnapshot(q, (snap) => callback(mapDocs(snap)));
};

export const listenIncomingFriendRequests = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(collection(db, COLLECTIONS.friendRequests), where('to', '==', uid), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(REQUEST_PAGE_SIZE));
  return onSnapshot(q, (snap) => callback(mapDocs(snap)));
};

export const listenOutgoingFriendRequests = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(collection(db, COLLECTIONS.friendRequests), where('from', '==', uid), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(REQUEST_PAGE_SIZE));
  return onSnapshot(q, (snap) => callback(mapDocs(snap)));
};

export const listenIncomingMessageRequests = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(collection(db, COLLECTIONS.messageRequests), where('to', '==', uid), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(REQUEST_PAGE_SIZE));
  return onSnapshot(q, (snap) => callback(mapDocs(snap)));
};

export const listenBlockedUsers = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(collection(db, COLLECTIONS.blockedUsers), where('blockerId', '==', uid), orderBy('createdAt', 'desc'), limit(FRIEND_PAGE_SIZE));
  return onSnapshot(q, (snap) => callback(mapDocs(snap)));
};

export const loadMoreFriends = async (uid, cursor, pageSize = FRIEND_PAGE_SIZE) => {
  if (!uid || !cursor) return { items: [], cursor: null, hasMore: false };
  const snap = await getDocs(query(
    collection(db, COLLECTIONS.friends),
    where('users', 'array-contains', uid),
    orderBy('createdAt', 'desc'),
    startAfter(cursor),
    limit(pageSize)
  ));
  return { items: mapDocs(snap), cursor: snap.docs[snap.docs.length - 1] || null, hasMore: snap.size === pageSize };
};

export const listSuggestedFriends = async ({ uid, profile = {}, pageSize = 20 } = {}) => {
  if (!uid) return [];
  const usersSnap = await getDocs(query(collection(db, COLLECTIONS.users), limit(120)));
  const [friendsSnap, outgoingSnap, incomingSnap, blockedSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.friends), where('users', 'array-contains', uid))),
    getDocs(query(collection(db, COLLECTIONS.friendRequests), where('from', '==', uid), where('status', '==', 'pending'))),
    getDocs(query(collection(db, COLLECTIONS.friendRequests), where('to', '==', uid), where('status', '==', 'pending'))),
    getDocs(query(collection(db, COLLECTIONS.blockedUsers), where('blockerId', '==', uid))),
  ]);
  const excluded = new Set([uid]);
  friendsSnap.docs.forEach((friendDoc) => friendDoc.data()?.users?.forEach?.((id) => id !== uid && excluded.add(id)));
  outgoingSnap.docs.forEach((requestDoc) => excluded.add(requestDoc.data()?.to));
  incomingSnap.docs.forEach((requestDoc) => excluded.add(requestDoc.data()?.from));
  blockedSnap.docs.forEach((blockDoc) => excluded.add(blockDoc.data()?.blockedId));

  const currentInterests = new Set(Array.isArray(profile.interests) ? profile.interests.map((item) => String(item).toLowerCase()) : []);
  return mapDocs(usersSnap)
    .filter((student) => !excluded.has(student.id || student.uid))
    .map((student) => {
      const interests = Array.isArray(student.interests) ? student.interests : [];
      const sharedInterests = interests.filter((item) => currentInterests.has(String(item).toLowerCase())).length;
      let score = 0;
      if ((student.school || student.university) && (student.school || student.university) === (profile.school || profile.university)) score += 35;
      if (student.faculty && student.faculty === profile.faculty) score += 20;
      if (student.department && student.department === profile.department) score += 25;
      if (student.level && student.level === profile.level) score += 12;
      score += Math.min(sharedInterests * 8, 24);
      if (student.verifiedTutor) score += 10;
      if (student.lastActiveAt) score += 4;
      return { ...student, score };
    })
    .filter((student) => student.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, pageSize);
};

export const updatePrivacySettings = async (uid, privacy) => {
  if (!uid) throw new Error('No authenticated user');
  await setDoc(doc(db, COLLECTIONS.users, uid), {
    privacy,
  }, { merge: true });
};
