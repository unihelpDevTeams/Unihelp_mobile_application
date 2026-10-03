import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../firebase/config';
import { markConversationRead, sendDirectMessage, sendGroupMessage } from './community';
import { markNotificationRead, toggleStoryLike } from './firestore';

export const NOTIFICATION_ACTION_IDS = {
  REPLY: 'reply',
  MARK_AS_READ: 'mark_as_read',
  MUTE: 'mute',
  LIKE: 'like',
  VIEW: 'view',
  DISMISS: 'dismiss',
};

export const NOTIFICATION_TYPE_CATEGORIES = {
  message: 'unihelp_message',
  direct_message: 'unihelp_message',
  group_message: 'unihelp_group_message',
  comment: 'unihelp_comment',
  comment_reply: 'unihelp_comment',
  like: 'unihelp_like',
  mention: 'unihelp_general',
  follow: 'unihelp_general',
  friend_request: 'unihelp_general',
  system: 'unihelp_general',
  promotion: 'unihelp_promotion',
  announcement: 'unihelp_promotion',
  general: 'unihelp_general',
};

export const getNotificationCategoryForType = (type) =>
  NOTIFICATION_TYPE_CATEGORIES[type] || NOTIFICATION_TYPE_CATEGORIES.general;

export const getNotificationActionList = (type = 'general') => {
  const typeKey = String(type || 'general').toLowerCase();

  switch (typeKey) {
    case 'message':
    case 'direct_message':
      return [
        { action: NOTIFICATION_ACTION_IDS.REPLY, title: 'Reply' },
        { action: NOTIFICATION_ACTION_IDS.MARK_AS_READ, title: 'Mark as read' },
        { action: NOTIFICATION_ACTION_IDS.MUTE, title: 'Mute' },
      ];
    case 'group_message':
      return [
        { action: NOTIFICATION_ACTION_IDS.REPLY, title: 'Reply' },
        { action: NOTIFICATION_ACTION_IDS.MARK_AS_READ, title: 'Mark as read' },
        { action: NOTIFICATION_ACTION_IDS.MUTE, title: 'Mute' },
      ];
    case 'comment':
    case 'comment_reply':
      return [
        { action: NOTIFICATION_ACTION_IDS.REPLY, title: 'Reply' },
        { action: NOTIFICATION_ACTION_IDS.LIKE, title: 'Like' },
        { action: NOTIFICATION_ACTION_IDS.MARK_AS_READ, title: 'Mark as read' },
      ];
    case 'like':
      return [
        { action: NOTIFICATION_ACTION_IDS.MARK_AS_READ, title: 'Mark as read' },
      ];
    case 'promotion':
    case 'announcement':
      return [
        { action: NOTIFICATION_ACTION_IDS.VIEW, title: 'View' },
        { action: NOTIFICATION_ACTION_IDS.DISMISS, title: 'Dismiss' },
      ];
    default:
      return [
        { action: NOTIFICATION_ACTION_IDS.MARK_AS_READ, title: 'Mark as read' },
      ];
  }
};

const getCurrentUserProfile = async (uid) => {
  if (!uid || !db) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return {
    uid,
    name: data.username || data.displayName || data.name || 'Student',
    avatar: data.photoURL || data.avatarUrl || '',
  };
};

const markNotificationAndConversationRead = async ({ notificationId, conversationId, uid }) => {
  if (notificationId) {
    await markNotificationRead(notificationId, uid);
  }

  if (conversationId && uid) {
    try {
      await markConversationRead(conversationId, uid);
    } catch (error) {
      console.warn('Failed to update conversation read status from notification action:', error);
    }
  }
};

const muteConversation = async ({ conversationId, groupId, uid }) => {
  const targetConversationId = conversationId || groupId;
  if (!targetConversationId || !uid || !db) {
    return null;
  }

  const ref = doc(db, 'users', uid, 'conversationSettings', targetConversationId);
  await setDoc(
    ref,
    {
      conversationId: targetConversationId,
      muted: true,
      mutedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { conversationId: targetConversationId };
};

const replyToConversation = async ({ conversationId, groupId, userText, uid }) => {
  const trimmed = String(userText || '').trim();
  if (!trimmed || !uid) {
    return { handled: false, reason: 'missing-text-or-user' };
  }

  const currentProfile = await getCurrentUserProfile(uid);
  const currentUser = auth?.currentUser || { uid, displayName: currentProfile?.name || 'Student' };

  if (groupId) {
    await sendGroupMessage(
      groupId,
      { uid: currentUser.uid, displayName: currentUser.displayName || currentProfile?.name || 'Student' },
      { username: currentProfile?.name || currentUser.displayName || 'Student', photo: currentProfile?.avatar || '' },
      { text: trimmed, type: 'text' }
    );
    return { handled: true, route: `/community/${groupId}` };
  }

  if (!conversationId) {
    return { handled: false, reason: 'missing-conversation' };
  }

  await sendDirectMessage(
    { id: conversationId },
    { uid: currentUser.uid },
    { username: currentProfile?.name || currentUser.displayName || 'Student', photo: currentProfile?.avatar || '' },
    { text: trimmed, type: 'text' }
  );

  return { handled: true, route: `/messages/${conversationId}` };
};

const likeNotificationTarget = async ({ storyId, commentId, uid, notificationId }) => {
  if (storyId) {
    await toggleStoryLike(storyId);
  }

  if (notificationId) {
    await markNotificationRead(notificationId, uid);
  }

  return { handled: true };
};

export const handleNotificationAction = async ({
  actionIdentifier,
  userText,
  notification,
  currentUserId,
}) => {
  const payload = notification?.request?.content?.data || notification?.data || {};
  const uid = currentUserId || auth?.currentUser?.uid;

  if (!uid) {
    return { handled: false, reason: 'not-authenticated' };
  }

  const notificationId = payload.notificationId || payload.id || payload.notification_id;
  const conversationId = payload.conversationId || payload.conversation_id;
  const groupId = payload.groupId || payload.group_id;
  const storyId = payload.storyId || payload.story_id;
  const commentId = payload.commentId || payload.comment_id;

  switch (actionIdentifier) {
    case NOTIFICATION_ACTION_IDS.REPLY:
      return replyToConversation({ conversationId, groupId, userText, uid });

    case NOTIFICATION_ACTION_IDS.MARK_AS_READ:
      await markNotificationAndConversationRead({ notificationId, conversationId, uid });
      return { handled: true, route: payload.route || null };

    case NOTIFICATION_ACTION_IDS.MUTE:
      await muteConversation({ conversationId, groupId, uid });
      await markNotificationAndConversationRead({ notificationId, conversationId, uid });
      return { handled: true, route: payload.route || null };

    case NOTIFICATION_ACTION_IDS.LIKE:
      return likeNotificationTarget({ storyId, commentId, uid, notificationId });

    case NOTIFICATION_ACTION_IDS.VIEW:
      return { handled: true, route: payload.route || payload.url || '/notifications' };

    case NOTIFICATION_ACTION_IDS.DISMISS:
      await markNotificationAndConversationRead({ notificationId, conversationId, uid });
      return { handled: true, route: payload.route || null };

    default:
      return { handled: false, route: payload.route || null };
  }
};

export const getNotificationActionRoute = (data = {}) => {
  const conversationId = data?.conversationId || data?.conversation_id;
  const groupId = data?.groupId || data?.group_id;

  if (conversationId) return `/messages/${conversationId}`;
  if (groupId) return `/community/${groupId}`;
  if (typeof data?.route === 'string' && data.route.startsWith('/')) return data.route;
  if (typeof data?.url === 'string' && data.url.startsWith('/')) return data.url;
  return '/notifications';
};
