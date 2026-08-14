import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
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
import { auth, db } from '../../../firebase/config';
import { getApiUrl, sendAppNotification } from './backend';
import { canSendDirectMessage, createOrOpenFriendConversation } from './friendships';

export const PAGE_SIZE = 20;
export const MESSAGE_PAGE_SIZE = 25;

const normalizeSearch = (value = '') => value.trim().toLowerCase();

const mapDocs = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

export const formatShortTime = (value) => {
  if (!value?.toDate) return '';
  const date = value.toDate();
  const sameDay = new Date().toDateString() === date.toDateString();
  return date.toLocaleString([], sameDay ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric' });
};

const userSummary = (user, profile = {}) => ({
  uid: user.uid,
  name: profile.username || user.displayName || user.email || 'Student',
  email: user.email || '',
  avatar: profile.photo || user.photoURL || '',
});

export const searchUsers = async (term, currentUid, pageSize = 12) => {
  const value = normalizeSearch(term);
  if (value.length < 2) return [];

  const snapshot = await getDocs(collection(db, 'users'));
  return mapDocs(snapshot)
    .filter((entry) => entry.id !== currentUid)
    .filter((entry) => {
      const searchText = `${entry.username || ''} ${entry.email || ''} ${entry.school || ''} ${entry.department || ''}`.toLowerCase();
      return searchText.includes(value);
    })
    .slice(0, pageSize);
};

export const listGroups = async ({ search = '', category = 'All', cursor = null } = {}) => {
  const groupsRef = collection(db, 'groups');
  const clauses = [];

  if (category && category !== 'All') clauses.push(where('category', '==', category));
  if (search.trim()) {
    const value = normalizeSearch(search);
    clauses.push(orderBy('nameLower'), where('nameLower', '>=', value), where('nameLower', '<=', `${value}\uf8ff`));
  } else {
    clauses.push(orderBy('lastActivityAt', 'desc'));
  }
  if (cursor) clauses.push(startAfter(cursor));
  clauses.push(limit(PAGE_SIZE));

  const snap = await getDocs(query(groupsRef, ...clauses));
  return {
    groups: mapDocs(snap),
    cursor: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
};

export const createGroup = async ({ form, user, profile, uploads }) => {
  const summary = userSummary(user, profile);
  const groupRef = doc(collection(db, 'groups'));
  const batch = writeBatch(db);
  const now = serverTimestamp();

  batch.set(groupRef, {
    name: form.name.trim(),
    nameLower: normalizeSearch(form.name),
    description: form.description.trim(),
    category: form.category,
    privacy: form.privacy,
    allowMemberMessages: form.allowMemberMessages !== false,
    rules: form.rules.trim(),
    coverUrl: uploads.coverUrl || '',
    avatarUrl: uploads.avatarUrl || '',
    coverAsset: uploads.coverAsset || null,
    avatarAsset: uploads.avatarAsset || null,
    ownerId: user.uid,
    adminIds: [user.uid],
    moderatorIds: [],
    memberCount: 1,
    postCount: 0,
    mediaCount: 0,
    fileCount: 0,
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
  });

  batch.set(doc(db, 'groups', groupRef.id, 'members', user.uid), {
    ...summary,
    role: 'owner',
    joinedAt: now,
  });

  batch.set(doc(db, 'users', user.uid, 'groups', groupRef.id), {
    groupId: groupRef.id,
    name: form.name.trim(),
    role: 'owner',
    joinedAt: now,
  });

  batch.set(doc(db, 'notifications', user.uid, 'items', groupRef.id), {
    type: 'group_created',
    title: 'Group created',
    body: `${form.name.trim()} is ready.`,
    groupId: groupRef.id,
    route: `/community/${groupRef.id}`,
    read: false,
    createdAt: now,
  });

  await batch.commit();
  return groupRef.id;
};

export const getGroup = async (groupId) => {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getMembership = async (groupId, uid) => {
  if (!groupId || !uid) return null;
  const snap = await getDoc(doc(db, 'groups', groupId, 'members', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const joinPublicGroup = async (group, user, profile) => {
  const summary = userSummary(user, profile);
  await runTransaction(db, async (transaction) => {
    const memberRef = doc(db, 'groups', group.id, 'members', user.uid);
    const userGroupRef = doc(db, 'users', user.uid, 'groups', group.id);
    const memberSnap = await transaction.get(memberRef);
    if (memberSnap.exists()) return;

    transaction.set(memberRef, { ...summary, role: 'member', joinedAt: serverTimestamp() });
    transaction.set(userGroupRef, {
      groupId: group.id,
      name: group.name,
      role: 'member',
      joinedAt: serverTimestamp(),
    });
    transaction.update(doc(db, 'groups', group.id), {
      memberCount: increment(1),
      lastActivityAt: serverTimestamp(),
    });
  });
};

export const requestJoinGroup = async (group, user, profile) => {
  const summary = userSummary(user, profile);
  const requestRef = doc(db, 'groups', group.id, 'joinRequests', user.uid);
  await setDoc(requestRef, {
    ...summary,
    uid: user.uid,
    status: 'pending',
    requestedAt: serverTimestamp(),
  });

  const adminIds = Array.isArray(group.adminIds) ? group.adminIds : [];
  const notifyTargets = [group.ownerId, ...adminIds].filter(Boolean);
  for (const targetId of [...new Set(notifyTargets)]) {
    await addDoc(collection(db, 'notifications', targetId, 'items'), {
      type: 'group_join_request',
      title: 'New join request',
      body: `${summary.name} wants to join ${group.name}.`,
      groupId: group.id,
      route: `/community/${group.id}`,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
};

export const listGroupJoinRequests = async (groupId) => {
  if (!groupId) return [];
  const snapshot = await getDocs(query(collection(db, 'groups', groupId, 'joinRequests'), orderBy('requestedAt', 'desc')));
  return mapDocs(snapshot).filter((request) => request.status === 'pending');
};

export const approveGroupJoinRequest = async (groupId, requestUserId, currentUserId) => {
  if (!groupId || !requestUserId) throw new Error('Missing request details.');
  const groupRef = doc(db, 'groups', groupId);
  const requestRef = doc(db, 'groups', groupId, 'joinRequests', requestUserId);
  const memberRef = doc(db, 'groups', groupId, 'members', requestUserId);
  const userGroupRef = doc(db, 'users', requestUserId, 'groups', groupId);
  const requestSnap = await getDoc(requestRef);
  const memberSnap = await getDoc(memberRef);
  const groupSnap = await getDoc(groupRef);
  const groupData = groupSnap.exists() ? groupSnap.data() : {};
  if (!requestSnap.exists()) throw new Error('This request is no longer available.');
  const requestData = requestSnap.data();
  if (requestData.status === 'approved') throw new Error('This request has already been approved.');
  if (requestData.status === 'rejected') throw new Error('This request has already been declined.');
  if (memberSnap.exists()) {
    await updateDoc(requestRef, { status: 'approved', reviewedAt: serverTimestamp(), reviewedBy: currentUserId });
    return;
  }
  const summary = {
    uid: requestUserId,
    name: requestData.name || requestData.username || 'Student',
    email: requestData.email || '',
    avatar: requestData.avatar || '',
  };

  const batch = writeBatch(db);
  batch.set(memberRef, { ...summary, role: 'member', joinedAt: serverTimestamp() });
  batch.set(userGroupRef, { groupId, name: groupData.name || '', role: 'member', joinedAt: serverTimestamp() });
  batch.update(groupRef, { memberCount: increment(1), lastActivityAt: serverTimestamp() });
  batch.update(requestRef, { status: 'approved', reviewedAt: serverTimestamp(), reviewedBy: currentUserId });
  await batch.commit();
};

export const rejectGroupJoinRequest = async (groupId, requestUserId, currentUserId) => {
  if (!groupId || !requestUserId) throw new Error('Missing request details.');
  const requestRef = doc(db, 'groups', groupId, 'joinRequests', requestUserId);
  await updateDoc(requestRef, { status: 'rejected', reviewedAt: serverTimestamp(), reviewedBy: currentUserId });
};

export const leaveGroup = async (group, uid) => {
  if (group.ownerId === uid) throw new Error('Transfer ownership before leaving this group.');
  const batch = writeBatch(db);
  batch.delete(doc(db, 'groups', group.id, 'members', uid));
  batch.delete(doc(db, 'users', uid, 'groups', group.id));
  batch.update(doc(db, 'groups', group.id), {
    memberCount: increment(-1),
    lastActivityAt: serverTimestamp(),
  });
  await batch.commit();
};

export const removeGroupMember = async (group, memberId) => {
  if (!group?.id || !memberId) throw new Error('Missing group or member details.');
  if (group.ownerId === memberId) throw new Error('Owners cannot be removed. Transfer ownership first.');
  const batch = writeBatch(db);
  batch.delete(doc(db, 'groups', group.id, 'members', memberId));
  batch.delete(doc(db, 'users', memberId, 'groups', group.id));
  batch.update(doc(db, 'groups', group.id), {
    memberCount: increment(-1),
    lastActivityAt: serverTimestamp(),
  });
  await batch.commit();
};

export const listenGroupMessages = (groupId, callback) => {
  const q = query(collection(db, 'groups', groupId, 'messages'), orderBy('createdAt', 'desc'), limit(MESSAGE_PAGE_SIZE));
  return onSnapshot(q, (snap) => {
    callback(mapDocs(snap).reverse(), snap.docs[snap.docs.length - 1] || null);
  });
};

export const loadOlderGroupMessages = async (groupId, cursor) => {
  if (!cursor) return { messages: [], cursor: null, hasMore: false };
  const snap = await getDocs(query(collection(db, 'groups', groupId, 'messages'), orderBy('createdAt', 'desc'), startAfter(cursor), limit(MESSAGE_PAGE_SIZE)));
  return {
    messages: mapDocs(snap).reverse(),
    cursor: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === MESSAGE_PAGE_SIZE,
  };
};
export async function toggleMessageReaction(groupId, messageId, emoji, uid) {
  if (!groupId || !messageId || !emoji || !uid) {
    throw new Error('Missing information for this reaction.');
  }
 
  const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
 
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(messageRef);
    if (!snap.exists()) throw new Error('This message no longer exists.');
 
    const reactions = snap.data().reactions || {};
    const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
    const hasReacted = current.includes(uid);
 
    transaction.update(messageRef, {
      [`reactions.${emoji}`]: hasReacted ? arrayRemove(uid) : arrayUnion(uid),
    });
  });
}
export const sendGroupMessage = async (groupId, user, profile, payload) => {
  const summary = userSummary(user, profile);
  const groupSnap = await getDoc(doc(db, 'groups', groupId));
  const groupData = groupSnap.exists() ? groupSnap.data() : {};
  const membershipSnap = await getDoc(doc(db, 'groups', groupId, 'members', user.uid));
  const membershipData = membershipSnap.exists() ? membershipSnap.data() : null;
  const canSend = Boolean(
    membershipData?.role === 'owner' ||
    membershipData?.role === 'admin' ||
    groupData?.allowMemberMessages !== false && (membershipData?.role === 'member' || membershipData?.role === 'moderator')
  );

  if (!canSend) {
    throw new Error('Only admins can send messages in this group right now.');
  }

  await addDoc(collection(db, 'groups', groupId, 'messages'), {
    ...payload,
    senderId: user.uid,
    senderName: summary.name,
    senderAvatar: summary.avatar,
    reactions: {},
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'groups', groupId), { lastActivityAt: serverTimestamp() });

  try {
    const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
    const recipientIds = membersSnap.docs
      .map((memberDoc) => memberDoc.id)
      .filter((memberId) => memberId !== user.uid);

    if (recipientIds.length > 0) {
      await sendAppNotification({
        userIds: recipientIds,
        title: `${summary.name}`,
        body: payload.text || 'Sent a new message in the group',
        type: 'group_message',
        category: 'Message',
        url: `/community/${groupId}`,
        data: { groupId },
      });
    }
  } catch (notificationError) {
    console.log('Group push notification failed:', notificationError);
  }
};

export async function updateGroup(groupId, payload) {
  await updateDoc(doc(db, 'groups', groupId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export const listGroupMembers = async (groupId) => {
  if (!groupId) return [];
  const snapshot = await getDocs(collection(db, 'groups', groupId, 'members'));
  return mapDocs(snapshot);
};

export const promoteGroupMemberToAdmin = async (groupId, memberId, currentUserId) => {
  if (!groupId || !memberId) throw new Error('Missing member information.');
  const groupRef = doc(db, 'groups', groupId);
  const memberRef = doc(db, 'groups', groupId, 'members', memberId);
  const memberSnap = await getDoc(memberRef);
  const groupSnap = await getDoc(groupRef);
  if (!memberSnap.exists()) throw new Error('This member was not found in the group.');
  const groupData = groupSnap.exists() ? groupSnap.data() : {};
  const adminIds = Array.isArray(groupData.adminIds) ? groupData.adminIds : [];
  if (adminIds.includes(memberId)) throw new Error('This member is already an admin.');
  const nextAdminIds = [...new Set([...(adminIds || []), memberId])];
  await Promise.all([
    updateDoc(groupRef, {
      adminIds: nextAdminIds,
      updatedAt: serverTimestamp(),
    }),
    updateDoc(memberRef, {
      role: 'admin',
      promotedBy: currentUserId,
      promotedAt: serverTimestamp(),
    }),
    updateDoc(doc(db, 'users', memberId, 'groups', groupId), {
      role: 'admin',
    }),
  ]);
};

export const deleteGroup = async (groupId, currentUserId) => {
  if (!groupId) throw new Error('Missing group information.');
  // Use the backend cleanup API which handles Cloudinary asset deletion
  const { deleteGroupWithMedia } = await import('../../../services/mediaCleanup');
  await deleteGroupWithMedia(groupId);
};

export const listenConversationMessages = (conversationId, callback) => {
  const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => callback(mapDocs(snap)));
};

export const startConversation = async (currentUser, otherUser, profile) => {
  return createOrOpenFriendConversation({
    currentUser,
    otherUser,
    currentProfile: profile,
    otherProfile: otherUser,
  });
};

export const sendDirectMessage = async (conversation, user, profile, payload) => {
  const allowed = await canSendDirectMessage(conversation, user.uid);
  if (!allowed) {
    throw new Error('You can only send messages after becoming friends.');
  }
  const summary = userSummary(user, profile);
  const receiverId = conversation.memberIds.find((id) => id !== user.uid);
  const batch = writeBatch(db);
  const messageRef = doc(collection(db, 'conversations', conversation.id, 'messages'));
  const now = serverTimestamp();

  // Determine message type and last message text
  const messageType = payload.type || 'text';
  const lastMessageText = messageType === 'voice'
    ? '🎤 Voice message'
    : (payload.text || payload.attachments?.[0]?.name || 'Attachment');

  batch.set(messageRef, {
    ...payload,
    senderId: user.uid,
    senderName: summary.name,
    senderAvatar: summary.avatar,
    deliveredTo: [user.uid],
    readBy: [user.uid],
    reactions: {},
    createdAt: now,
  });
  batch.update(doc(db, 'conversations', conversation.id), {
    lastMessage: lastMessageText,
    lastSenderId: user.uid,
    updatedAt: now,
    [`unread.${receiverId}`]: increment(1),
  });
  if (receiverId) {
    const notifBody = messageType === 'voice' ? '🎤 Sent a voice message' : (payload.text || 'Sent an attachment');
    batch.set(doc(collection(db, 'notifications', receiverId, 'items')), {
      type: 'direct_message',
      title: summary.name,
      body: notifBody,
      conversationId: conversation.id,
      route: `/messages?conversationId=${conversation.id}`,
      read: false,
      createdAt: now,
    });
  }
  await batch.commit();

  if (receiverId) {
    try {
      const pushBody = messageType === 'voice' ? '🎤 Sent a voice message' : (payload.text || 'Sent an attachment');
      await sendAppNotification({
        userIds: [receiverId],
        title: summary.name,
        body: pushBody,
        type: 'message',
        category: 'Message',
        url: `/messages?conversationId=${conversation.id}`,
        data: { conversationId: conversation.id },
      });
    } catch (notificationError) {
      console.log('Direct message push notification failed:', notificationError);
    }
  }
};

export const markConversationRead = async (conversationId, uid) => {
  await setDoc(doc(db, 'conversations', conversationId), { unread: { [uid]: 0 }, readAt: { [uid]: serverTimestamp() } }, { merge: true });
};

export const clearConversationForUser = async (conversationId, uid = auth.currentUser?.uid) => {
  if (!conversationId || !uid) throw new Error('Missing chat details.');
  await setDoc(doc(db, 'conversations', conversationId), {
    clearedFor: { [uid]: serverTimestamp() },
    unread: { [uid]: 0 },
  }, { merge: true });
};

export const deleteConversationForUser = async (conversationId, uid = auth.currentUser?.uid) => {
  if (!conversationId || !uid) throw new Error('Missing chat details.');
  await setDoc(doc(db, 'conversations', conversationId), {
    clearedFor: { [uid]: serverTimestamp() },
    deletedFor: { [uid]: serverTimestamp() },
    unread: { [uid]: 0 },
  }, { merge: true });
};

export async function deleteDirectMessage(conversationId, messageId, options = {}) {
  const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  if (options.voice) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${getApiUrl()}/api/voice/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete voice message.');
      }
      return;
    } catch (error) {
      throw error;
    }
  }

  await updateDoc(messageRef, {
    deleted: true,
    text: '',
    attachments: [],
    deletedAt: serverTimestamp(),
  });
}
