import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../src/shared/components/EmptyState';
import StickerPicker from '../../src/shared/components/StickerPicker';
import StickerMessage from '../../src/shared/components/StickerMessage';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { useAuth } from '../../context/AuthContext';
import {
  approveGroupJoinRequest,
  createGroupPost,
  deleteGroupPost,
  formatShortTime,
  getGroup,
  getMembership,
  joinPublicGroup,
  leaveGroup,
  listGroupMembers,
  listGroupJoinRequests,
  listenGroupMessages,
  listenGroupPosts,
  loadOlderGroupMessages,
  loadRecentGroupMessages,
  MESSAGE_PAGE_SIZE,
  rejectGroupJoinRequest,
  requestJoinGroup,
  sendGroupMessage,
  createGroupPoll,
  editGroupPoll,
  setGroupPollClosed,
  voteGroupPoll,
  updateGroupMessage,
  deleteGroupMessage,
  startConversation,
  toggleMessageReaction,
  reactToGroupPost,
  recordGroupPostView,
  updateGroup,
  updateGroupPost,
} from '../../src/shared/services/community';
import { uploadFeatureMedia } from '../../src/shared/services/backend';

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const CATEGORIES = ['Academics', 'Career', 'Health', 'Social', 'Tech', 'Other'];
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const SWIPE_REPLY_MAX = 88;
const SWIPE_REPLY_THRESHOLD = 56;
const NEAR_BOTTOM_PX = 140;
const GROUP_WINDOW_MS = 5 * 60 * 1000;
const EDIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_LENGTH = 2000;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const PENDING_MATCH_WINDOW_MS = 3 * 60 * 1000;
const PENDING_SCAN_TAIL = 80; // optimistic messages can only match the newest server messages

// In-memory caches. Re-entering a group shows cached data instantly and costs ZERO extra
// page reads: the live listener revalidates, and a page is only fetched when nothing is cached
// (or when the cache is so old that the listener's window no longer overlaps it).
const GROUP_CACHE_TTL_MS = 3 * 60 * 1000;
const MESSAGE_CACHE_MAX = 300;
const CACHE_MAX_ENTRIES = 12;
const GROUP_CACHE = new Map();
const MESSAGE_CACHE = new Map();
const DRAFT_CACHE = new Map();
const REQUESTED_CACHE = new Set(); // join requests already sent this session (no read needed)

const putCache = (map, key, value) => {
  if (!key) return;
  map.delete(key);
  map.set(key, value);
  while (map.size > CACHE_MAX_ENTRIES) map.delete(map.keys().next().value);
};

/* ------------------------------ Role identity ------------------------------ */
// One place defines how privileged senders look. Admin = warm gold, Premium = deep violet.
// - mineBg: solid fill used when the viewer is the sender (white text must stay readable)
// - tint:   translucent wash laid over the "theirs" bubble so it adapts to light/dark themes
const ROLE_STYLES = {
  admin: {
    key: 'admin',
    label: 'Admin',
    icon: 'shield-checkmark',
    accent: '#C98F00',
    chipBg: '#F5B301',
    chipText: '#2B1D00',
    tint: 'rgba(245,179,1,0.11)',
    border: 'rgba(245,179,1,0.80)',
    glow: '#F5B301',
    mineBg: null,
    sheen: 'rgba(255,236,170,0.55)',
  },
  premium: {
    key: 'premium',
    label: 'Premium',
    icon: 'diamond',
    accent: '#8B5CF6',
    chipBg: '#7C3AED',
    chipText: '#FFFFFF',
    tint: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.60)',
    glow: '#8B5CF6',
    mineBg: '#5B21B6',
    sheen: 'rgba(233,222,255,0.55)',
  },
};

const roleOf = (message) => {
  if (message?.senderRole === 'admin') return ROLE_STYLES.admin;
  if (message?.senderPremium) return ROLE_STYLES.premium;
  return null;
};

const bubbleRadii = (mine, tail) =>
  mine
    ? { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: tail ? 5 : 20 }
    : { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: tail ? 5 : 20 };

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const AVATAR_PALETTE = ['#4F46E5', '#0EA5E9', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#8B5CF6'];
const colorForName = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};
const initialsForName = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
const pluralize = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// createdAt can be a Firestore Timestamp, {seconds}, Date/ISO string, or null (pending server write).
const getMillis = (message) => {
  const created = message?.createdAt;
  if (!created) return 0;
  if (typeof created.toMillis === 'function') return created.toMillis();
  if (typeof created.seconds === 'number') return created.seconds * 1000;
  const parsed = new Date(created).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const startOfDay = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const isSameDay = (a, b) => startOfDay(a) === startOfDay(b);
const dayLabel = (ms) => {
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(ms)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};
const timeLabel = (ms) => (ms ? new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');

const inSameGroup = (a, b) => {
  if (!a || !b || a.senderId !== b.senderId) return false;
  const am = getMillis(a);
  const bm = getMillis(b);
  if (am && bm) return isSameDay(am, bm) && Math.abs(bm - am) <= GROUP_WINDOW_MS;
  return true;
};

const createLocalId = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Pending-write messages (no timestamp yet) sort to the end instead of jumping to the top.
const sortMessages = (items) =>
  items.sort((a, b) => {
    const l = getMillis(a) || Infinity;
    const r = getMillis(b) || Infinity;
    if (l !== r) return l - r;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });

const reactionSig = (m) =>
  Object.keys(m?.reactions || {})
    .sort()
    .map((k) => `${k}:${(m.reactions[k] || []).join(',')}`)
    .join('|');

const attachmentSig = (m) =>
  (m?.attachments || []).map((attachment) => `${attachment?.url || ''}:${attachment?.type || attachment?.mimeType || ''}:${attachment?.name || ''}`).join('|');

// Includes role + avatar fields so a promotion / new photo is never swallowed by the merge.
const isSameMessage = (a, b) =>
  a.text === b.text &&
  a.deleted === b.deleted &&
  a.edited === b.edited &&
  a.type === b.type &&
  a.senderName === b.senderName &&
  a.senderAvatar === b.senderAvatar &&
  a.senderRole === b.senderRole &&
  Boolean(a.senderPremium) === Boolean(b.senderPremium) &&
  (a.stickerId || a.sticker?.id) === (b.stickerId || b.sticker?.id) &&
  attachmentSig(a) === attachmentSig(b) &&
  a.replyTo?.id === b.replyTo?.id &&
  getMillis(a) === getMillis(b) &&
  reactionSig(a) === reactionSig(b);

// Merge by id. If a snapshot repeats an unchanged message we keep the old object,
// so memoized rows don't re-render and the list doesn't jitter.
const mergeMessages = (existing = [], incoming = []) => {
  const byId = new Map();
  existing.forEach((m) => m?.id && byId.set(m.id, m));
  incoming.forEach((m) => {
    if (!m?.id) return;
    const prev = byId.get(m.id);
    byId.set(m.id, prev && isSameMessage(prev, m) ? prev : m);
  });
  return sortMessages([...byId.values()]);
};

const toggleReactionLocal = (reactions = {}, emoji, uid) => {
  const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
  const next = current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid];
  const copy = { ...reactions };
  if (next.length) copy[emoji] = next;
  else delete copy[emoji];
  return copy;
};

// Does a real (server) message correspond to this optimistic one?
const matchesPending = (pending, server) => {
  if (pending.serverId && pending.serverId === server.id) return true;
  if (server.clientTempId && server.clientTempId === pending.localId) return true;
  if (pending.localStatus !== 'sent' || server.senderId !== pending.senderId) return false;
  if ((server.type || 'text') !== (pending.type || 'text')) return false;
  const sameContent =
    pending.type === 'sticker'
      ? (server.stickerId || server.sticker?.id) === pending.stickerId
      : String(server.text || '').trim() === String(pending.text || '').trim();
  if (!sameContent) return false;
  const sm = getMillis(server);
  return !sm || Math.abs(sm - getMillis(pending)) < PENDING_MATCH_WINDOW_MS;
};

// Only the newest server messages can echo an optimistic one, so don't scan all 300.
const hasServerEcho = (pending, messages) => {
  const from = Math.max(0, messages.length - PENDING_SCAN_TAIL);
  for (let i = messages.length - 1; i >= from; i -= 1) {
    if (matchesPending(pending, messages[i])) return true;
  }
  return false;
};

const computeIsAdmin = (group, membership, uid) =>
  Boolean(
    group && uid && (group.adminId === uid || group.ownerId === uid || membership?.role === 'admin' || membership?.role === 'owner')
  );

const renderLinkedText = (text, mine, colors) => {
  const content = String(text || '');
  const pattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
  const parts = [];
  let last = 0;
  let match;
  while ((match = pattern.exec(content))) {
    const raw = match[0];
    const trailing = raw.match(/[.,!?;:)}\]]+$/)?.[0] || '';
    const visible = trailing ? raw.slice(0, -trailing.length) : raw;
    if (!visible) continue;
    if (match.index > last) parts.push(content.slice(last, match.index));
    parts.push(
      <Text
        key={`l-${match.index}`}
        accessibilityRole="link"
        style={{ color: mine ? '#FFFFFF' : colors.brand, textDecorationLine: 'underline' }}
        onPress={() => Linking.openURL(/^https?:\/\//i.test(visible) ? visible : `https://${visible}`).catch(() => {})}
      >
        {visible}
      </Text>
    );
    if (trailing) parts.push(trailing);
    last = match.index + raw.length;
  }
  if (!parts.length) return content;
  if (last < content.length) parts.push(content.slice(last));
  return parts;
};

const messagePreview = (message) => {
  if (!message) return '';
  if (message.deleted) return 'Message deleted';
  if (message.type === 'sticker') return 'Sticker';
  const text = String(message.text || '').trim();
  if (!text) return '📎 Attachment';
  return text.length > 80 ? `${text.slice(0, 80).trim()}…` : text;
};

// expo-image-picker accepts these stable media-type strings. Using them avoids
// the deprecated MediaTypeOptions enum, which is absent in newer SDK releases.
const imageMediaTypes = () => ['images'];
const chatMediaTypes = () => ['images', 'videos'];

const isSafeAttachment = (file = {}) => {
  const mimeType = String(file.mimeType || file.type || '').toLowerCase();
  const name = String(file.name || file.fileName || '').toLowerCase();
  const forbidden = /(?:^|\/)(?:x-msdownload|x-msdos-program|x-sh|javascript|html|xhtml)(?:$|;)/.test(mimeType)
    || /\.(?:apk|bat|cmd|com|dll|exe|html?|jar|js|msi|php|ps1|sh|svg)$/i.test(name);
  const allowed = mimeType.startsWith('image/')
    || mimeType.startsWith('video/')
    || /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-(excel|powerpoint))|text\/plain)$/i.test(mimeType);
  return allowed && !forbidden && Number(file.size || 0) <= MAX_ATTACHMENT_BYTES;
};

const sanitizeMessageText = (value = '') => String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
const urlsInText = (value = '') => {
  const matches = String(value).match(/https?:\/\/[^\s]+|www\.[^\s]+/gi) || [];
  return matches.map((url) => url.replace(/[.,!?;:)}\]]+$/g, '')).filter(Boolean);
};

const attachmentKind = (attachment = {}) => {
  const type = String(attachment.mimeType || attachment.type || '').toLowerCase();
  if (type === 'image' || type.startsWith('image/')) return 'image';
  if (type === 'video' || type.startsWith('video/')) return 'video';
  return 'document';
};

const formatFileSize = (bytes) => {
  const value = Number(bytes || 0);
  if (!value) return '';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

function GroupMediaViewer({ media, onClose }) {
  const player = useVideoPlayer(media?.kind === 'video' && media?.url ? { uri: media.url } : null, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.play();
  });

  if (!media) return null;
  return (
    <View style={{ flex: 1, backgroundColor: '#080B12' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {media.kind === 'image' ? (
          <ScrollView
            maximumZoomScale={3}
            minimumZoomScale={1}
            centerContent
            contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Image source={{ uri: media.url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </ScrollView>
        ) : media.kind === 'video' ? (
          <VideoView player={player} style={{ width: '100%', aspectRatio: 16 / 9 }} nativeControls contentFit="contain" />
        ) : (
          <Pressable onPress={() => Linking.openURL(media.url)} style={{ alignItems: 'center', gap: 12, padding: 28 }}>
            <Ionicons name="document-text-outline" size={48} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' }}>{media.name || 'Open document'}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>Open in your device viewer</Text>
          </Pressable>
        )}
      </View>
      <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, backgroundColor: 'rgba(8,11,18,0.96)' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }} numberOfLines={1}>{media.name || 'Shared media'}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 }} numberOfLines={1}>{[media.authorName, formatFileSize(media.size)].filter(Boolean).join('  |  ')}</Text>
      </View>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close media viewer" style={{ position: 'absolute', top: 56, right: 18, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

// Drag-to-dismiss for bottom sheets. Attach panHandlers to the handle only.
function useDraggableSheet(onDismiss) {
  const translateY = useRef(new Animated.Value(0)).current;
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.9) {
          Animated.timing(translateY, { toValue: 700, duration: 180, useNativeDriver: true }).start(() => {
            dismissRef.current();
            // Reset after the modal has closed, otherwise the sheet flashes back up.
            setTimeout(() => translateY.setValue(0), 300);
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;
  return { translateY, panHandlers: panResponder.panHandlers };
}

/* -------------------------------------------------------------------------- */
/*                         Styles (module-level = stable)                     */
/* -------------------------------------------------------------------------- */

const createStyles = (c) => ({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  conversationHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, backgroundColor: c.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault },
  conversationBack: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  conversationAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
  conversationAvatarImage: { width: '100%', height: '100%' },
  conversationAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  conversationIdentity: { flex: 1, minWidth: 0 },
  conversationName: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
  conversationStatus: { color: c.textSecondary, fontSize: 11.5, marginTop: 2 },
  conversationAction: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceSecondary },
  chatArea: { flex: 1 },
  composerOuter: { backgroundColor: c.surface, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.borderDefault },
  chatContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14 },

  jumpButton: { position: 'absolute', right: 14, bottom: 12, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderDefault, shadowColor: c.shadow || '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  jumpBadge: { position: 'absolute', top: -6, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  jumpBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  toast: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: c.textPrimary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '90%', zIndex: 30 },
  toastText: { color: c.surface, fontSize: 13, fontWeight: '700' },

  groupTabs: { backgroundColor: c.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault },
  groupTabsContent: { paddingHorizontal: 8 },
  groupTab: { minHeight: 50, paddingHorizontal: 10, gap: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  groupTabActive: { borderBottomColor: c.brand },
  groupTabText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
  groupTabTextActive: { color: c.brand },
  tabCount: { color: c.textTertiary, fontSize: 11, fontWeight: '800' },
  tabContent: { flex: 1 },
  tabContentInner: { padding: 12, paddingBottom: 30, gap: 12 },
  postComposer: { backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.borderDefault, padding: 12 },
  postInput: { minHeight: 70, color: c.textPrimary, fontSize: 15, textAlignVertical: 'top' },
  postComposerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault, paddingTop: 9 },
  postMediaButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight },
  postAttachmentChip: { flex: 1, color: c.textSecondary, fontSize: 12, fontWeight: '700' },
  publishButton: { backgroundColor: c.brand, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9 },
  publishText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  postCard: { backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.borderDefault, padding: 12 },
  postAuthor: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  postManageButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceSecondary },
  postAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
  postAvatarImage: { width: '100%', height: '100%' },
  postAvatarText: { color: c.brandDark, fontSize: 12, fontWeight: '800' },
  postAuthorName: { color: c.textPrimary, fontSize: 13.5, fontWeight: '800' },
  postTime: { color: c.textTertiary, fontSize: 11, marginTop: 2 },
  postText: { color: c.textPrimary, fontSize: 14.5, lineHeight: 21, marginTop: 10 },
  postImage: { width: '100%', aspectRatio: 1.45, borderRadius: 12, marginTop: 10, backgroundColor: c.skeleton },
  postFile: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.surfaceSecondary, borderRadius: 12, padding: 10, marginTop: 10 },
  postFileName: { flex: 1, color: c.textPrimary, fontSize: 12.5, fontWeight: '700' },
  postFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault },
  postReaction: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: c.surfaceSecondary, paddingHorizontal: 10, paddingVertical: 6 },
  postReactionActive: { backgroundColor: c.brandLight },
  postReactionText: { color: c.textSecondary, fontSize: 12, fontWeight: '700' },
  postStat: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  postStatText: { color: c.textTertiary, fontSize: 11.5, fontWeight: '700' },
  editedPostLabel: { color: c.textTertiary, fontSize: 10.5, fontStyle: 'italic', marginTop: 5 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 15, padding: 11, borderWidth: 1, borderColor: c.borderDefault },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandLight, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  memberName: { color: c.textPrimary, fontSize: 14, fontWeight: '800' },
  memberRole: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  aboutCard: { backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.borderDefault, padding: 14, gap: 10 },
  aboutTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
  aboutText: { color: c.textSecondary, fontSize: 13.5, lineHeight: 20 },

  joinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.brand, borderRadius: 14, paddingVertical: 13, marginBottom: 16 },
  joinButtonMuted: { backgroundColor: c.skeleton },
  joinText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  joinTextMuted: { color: c.textSecondary },

  listHeaderLoading: { alignItems: 'center', paddingVertical: 12 },
  centerFill: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 24 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.brand, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },

  skeletonWrap: { gap: 10, paddingTop: 8 },
  skeletonBubble: { height: 40, borderRadius: 18, backgroundColor: c.skeleton },
  skeletonMine: { alignSelf: 'flex-end' },
  skeletonTheirs: { alignSelf: 'flex-start' },

  dateDividerWrap: { alignItems: 'center', marginVertical: 12 },
  dateDividerPill: { backgroundColor: c.surfaceSecondary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  dateDividerText: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },

  row: { flexDirection: 'row', marginBottom: 3, maxWidth: '100%' },
  rowEnd: { marginBottom: 10 },
  rowTheirs: { justifyContent: 'flex-start' },
  rowMine: { justifyContent: 'flex-end' },
  swipeReplyIconTheirs: { position: 'absolute', left: 44, top: '50%', marginTop: -12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  swipeReplyIconMine: { position: 'absolute', right: 2, top: '50%', marginTop: -12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },

  avatarSlot: { width: 36, alignItems: 'center', marginRight: 4, justifyContent: 'flex-end' },
  avatarRing: { padding: 1.5, borderRadius: 20, borderWidth: 1.5, borderColor: 'transparent' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 28, height: 28 },
  avatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  avatarBadge: { position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: c.background },

  bubbleColumn: { maxWidth: '78%' },
  pollBubbleColumn: { width: '86%', maxWidth: 520 },
  pendingDim: { opacity: 0.6 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, shadowColor: c.shadow || '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 1, elevation: 1 },
  bubbleFailed: { borderWidth: 1, borderColor: c.danger },
  bubbleTheirs: { backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
  bubbleMine: { backgroundColor: c.brand },
  bubbleSticker: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 2, paddingVertical: 2, shadowOpacity: 0, elevation: 0 },

  // Role bubbles (admin / premium): wash + hairline border + soft coloured glow + top sheen.
  bubbleRole: { borderWidth: 1, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  roleSheen: { position: 'absolute', top: 0, left: 16, right: 16, height: 1 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  authorRowMine: { justifyContent: 'flex-end' },
  messageAuthor: { fontWeight: '800', fontSize: 12, flexShrink: 1 },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  roleChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },

  messageBody: { color: c.inkLight, fontSize: 15, lineHeight: 21 },
  messageBodyMine: { color: '#FFFFFF' },
  messageDeleted: { fontStyle: 'italic', opacity: 0.75 },
  pollCard: { gap: 10, minWidth: 220 },
  pollHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pollIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight },
  pollQuestion: { flex: 1, color: c.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: '800' },
  pollQuestionMine: { color: '#FFFFFF' },
  pollOption: { minHeight: 48, overflow: 'hidden', borderWidth: 1, borderColor: c.borderDefault, borderRadius: 12, justifyContent: 'center', backgroundColor: c.inputBackground },
  pollOptionMine: { borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.08)' },
  pollOptionSelected: { borderColor: c.brand, backgroundColor: c.brandLight },
  pollOptionSelectedMine: { borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.18)' },
  pollProgress: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '0%', backgroundColor: c.brandLight, opacity: 0.72 },
  pollProgressMine: { backgroundColor: 'rgba(255,255,255,0.16)' },
  pollOptionContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 9 },
  pollChoice: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: c.textTertiary, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
  pollChoiceMine: { borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'transparent' },
  pollChoiceSelected: { borderColor: c.brand, backgroundColor: c.brand },
  pollChoiceSelectedMine: { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
  pollOptionText: { flex: 1, color: c.textPrimary, fontSize: 13.5, fontWeight: '700' },
  pollOptionTextMine: { color: '#FFFFFF' },
  pollPercent: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
  pollPercentMine: { color: 'rgba(255,255,255,0.88)' },
  pollFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 1 },
  pollMeta: { color: c.textTertiary, fontSize: 11.5, fontWeight: '700', flex: 1 },
  pollMetaMine: { color: 'rgba(255,255,255,0.76)' },
  pollManage: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pollManageText: { color: c.brand, fontSize: 11.5, fontWeight: '800' },
  pollManageTextMine: { color: '#FFFFFF' },
  chatAttachment: { width: 220, maxWidth: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 7, backgroundColor: c.surfaceSecondary },
  chatAttachmentImage: { width: 220, height: 180, backgroundColor: c.skeleton },
  chatAttachmentVideo: { width: 220, height: 150, alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: c.canvas },
  chatAttachmentDocument: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, backgroundColor: c.surfaceSecondary },
  chatAttachmentName: { flex: 1, color: c.textPrimary, fontSize: 12.5, fontWeight: '700' },
  chatAttachmentMeta: { color: c.textSecondary, fontSize: 11, marginTop: 2 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 },
  messageTime: { color: c.textTertiary, fontSize: 10 },
  messageTimeMine: { color: 'rgba(255,255,255,0.75)' },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  failedText: { fontSize: 11.5, fontWeight: '700', color: c.danger },

  replyBlock: { borderLeftWidth: 3, padding: 8, borderRadius: 10, marginBottom: 6 },
  replyBlockTheirs: { backgroundColor: c.surfaceSecondary, borderLeftColor: c.brand },
  replyBlockMine: { backgroundColor: 'rgba(255,255,255,0.16)', borderLeftColor: '#FFFFFF' },
  replyAuthor: { color: c.brandDark, fontWeight: '800', fontSize: 11 },
  replyAuthorMine: { color: '#FFFFFF' },
  replyText: { marginTop: 2, color: c.textSecondary, fontSize: 12, lineHeight: 16 },
  replyTextMine: { color: 'rgba(255,255,255,0.85)' },

  // Reactions tuck under the bubble edge for a layered, native-feeling look.
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: -6, paddingHorizontal: 8, zIndex: 2 },
  reactionsRowMine: { justifyContent: 'flex-end' },
  reactionPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, shadowColor: c.shadow || '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  reactionPillActive: { backgroundColor: c.brandLight, borderColor: c.brand },
  reactionEmoji: { fontSize: 12.5 },
  reactionCount: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
  reactionCountActive: { color: c.brandDark },

  actionSheetBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  actionSheetCard: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 24 },
  pollEditorCard: { width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '90%', paddingHorizontal: 18 },
  pollEditorScroll: { flexGrow: 0 },
  pollEditorContent: { gap: 10, paddingBottom: 8 },
  pollEditorSubtitle: { color: c.textSecondary, fontSize: 13, lineHeight: 19, marginTop: -4, marginBottom: 4 },
  pollOptionField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollOptionInput: { flex: 1, marginBottom: 0 },
  pollRemoveOption: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: c.dangerLight },
  pollAddOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: c.brand, borderRadius: 12, paddingVertical: 11 },
  pollAddOptionText: { color: c.brand, fontWeight: '800', fontSize: 13 },
  pollMode: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 14, padding: 12, backgroundColor: c.inputBackground },
  pollModeCopy: { flex: 1 },
  pollModeTitle: { color: c.textPrimary, fontSize: 13.5, fontWeight: '800' },
  pollModeHint: { color: c.textSecondary, fontSize: 11.5, marginTop: 2 },
  pollLockedNotice: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: c.surfaceSecondary, borderRadius: 10, padding: 10 },
  pollLockedNoticeText: { flex: 1, color: c.textSecondary, fontSize: 12, lineHeight: 17 },
  actionSheetHandleWrap: { paddingVertical: 10, alignItems: 'center' },
  actionSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderDefault },
  reactionViewerCard: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 30, maxHeight: '72%' },
  reactionViewerTitle: { color: c.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  reactorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  reactorAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  reactorAvatarImage: { width: '100%', height: '100%' },
  reactorAvatarText: { color: c.brandDark, fontWeight: '800', fontSize: 13 },
  reactorName: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '700' },
  reactorEmojis: { color: c.textSecondary, fontSize: 16 },
  sheetReactions: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.surfaceSecondary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 8 },
  sheetReactionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sheetReactionBtnActive: { backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brand },
  sheetReactionEmoji: { fontSize: 24 },
  sheetPreview: { fontSize: 13, color: c.textSecondary, backgroundColor: c.surfaceSecondary, borderRadius: 12, padding: 12, marginBottom: 6 },
  actionSheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8 },
  actionSheetIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
  actionSheetIconWrapDanger: { backgroundColor: c.redLight },
  actionSheetLabel: { fontSize: 14.5, fontWeight: '700', color: c.textPrimary },

  groupOptionsPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingBottom: 12, marginBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault },
  groupOptionsAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  groupOptionsAvatarImage: { width: 44, height: 44 },
  groupOptionsAvatarText: { color: c.brandDark, fontWeight: '800', fontSize: 15 },
  groupOptionsName: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
  groupOptionsMeta: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
  requestsCard: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.borderDefault, padding: 12, marginBottom: 12 },
  requestsTitle: { fontSize: 13, fontWeight: '800', color: c.textPrimary, marginBottom: 8 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault },
  requestName: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
  requestMeta: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 6 },
  requestApprove: { backgroundColor: c.teal, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, minWidth: 66, alignItems: 'center' },
  requestReject: { backgroundColor: c.danger, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, minWidth: 66, alignItems: 'center' },
  requestButtonDisabled: { opacity: 0.6 },
  requestActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10 },
  linkIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
  dangerIconWrap: { backgroundColor: c.redLight },
  linkText: { flex: 1, color: c.textPrimary, fontWeight: '700', fontSize: 13.5 },
  dangerLinkText: { color: c.danger },

  replyPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.borderDefault, paddingVertical: 8, paddingHorizontal: 12, gap: 10 },
  replyPreviewBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  replyPreviewBody: { flex: 1 },
  replyPreviewLabel: { fontSize: 12, fontWeight: '800', color: c.textPrimary },
  replyPreviewText: { color: c.textSecondary, fontSize: 12, marginTop: 1 },
  composer: { flexDirection: 'column', gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: c.surfacePrimary },
  attachmentPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault },
  attachmentPreviewThumb: { width: 32, height: 32, borderRadius: 7, backgroundColor: c.skeleton, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  attachmentPreviewImage: { width: '100%', height: '100%' },
  attachmentPreviewName: { flex: 1, color: c.textPrimary, fontSize: 12, fontWeight: '700' },
  permissionNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.purpleLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  permissionNoticeText: { color: c.brandDark, fontSize: 12.5, fontWeight: '700', flex: 1 },
  composerInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  stickerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.inputBackground, borderWidth: 1, borderColor: c.borderDefault },
  inputPill: { flex: 1, backgroundColor: c.inputBackground, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4, minHeight: 44, maxHeight: 120, justifyContent: 'center', borderWidth: 1, borderColor: c.borderDefault },
  inputPillEditing: { borderColor: c.brand },
  input: { fontSize: 15.5, color: c.textPrimary, maxHeight: 100, paddingTop: Platform.OS === 'ios' ? 8 : 6, paddingBottom: Platform.OS === 'ios' ? 8 : 6 },
  counter: { alignSelf: 'flex-end', marginRight: 8, marginBottom: 4, fontSize: 11, color: c.textTertiary },
  counterLimit: { color: c.danger, fontWeight: '700' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: c.brandGlow, opacity: 0.7 },
  composerToolsCard: { backgroundColor: c.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 14, paddingBottom: 28 },

  mediaFilters: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
  mediaFilter: { borderWidth: 1, borderColor: c.borderDefault, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: c.surface },
  mediaFilterActive: { backgroundColor: c.brand, borderColor: c.brand },
  mediaFilterText: { color: c.textSecondary, fontSize: 12, fontWeight: '700' },
  mediaFilterTextActive: { color: '#FFFFFF' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaTile: { width: '48%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surfaceSecondary, justifyContent: 'center' },
  mediaTileImage: { width: '100%', height: '100%' },
  mediaTileOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,11,18,0.28)', alignItems: 'center', justifyContent: 'center' },
  mediaTileDoc: { alignItems: 'center', justifyContent: 'center', padding: 10, gap: 6 },
  mediaTileName: { color: c.textPrimary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  memberSearch: { height: 42, borderRadius: 12, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.inputBackground, color: c.textPrimary, paddingHorizontal: 12, marginBottom: 10 },

  sheetBackdrop: { flex: 1, backgroundColor: c.overlay },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 28, maxHeight: '88%' },
  sheetHandleWrap: { paddingVertical: 8, alignItems: 'center' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderDefault },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, marginBottom: 16, textAlign: 'center' },
  photoPicker: { alignItems: 'center', marginBottom: 18 },
  photoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  photoImage: { width: 80, height: 80 },
  photoInitials: { color: c.brandDark, fontWeight: '800', fontSize: 24 },
  photoCameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.surface },
  photoHint: { marginTop: 8, fontSize: 12.5, fontWeight: '700', color: c.brandDark },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: c.textPrimary, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: c.borderDefault, borderRadius: 14, padding: 12, marginBottom: 14, backgroundColor: c.inputBackground, color: c.textPrimary, fontSize: 14 },
  fieldTextArea: { minHeight: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderColor: c.borderDefault, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: c.inputBackground },
  chipActive: { backgroundColor: c.brand, borderColor: c.brand },
  chipText: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary },
  chipTextActive: { color: '#FFFFFF' },
  segmented: { flexDirection: 'row', backgroundColor: c.skeleton, borderRadius: 14, padding: 4, gap: 4, marginBottom: 16 },
  segmentOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 11 },
  segmentOptionActive: { backgroundColor: c.brand },
  segmentText: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary },
  segmentTextActive: { color: '#FFFFFF' },
  editMessageBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, marginBottom: 14 },
  editMessageSuccess: { backgroundColor: c.greenLight },
  editMessageError: { backgroundColor: c.dangerLight },
  saveButton: { backgroundColor: c.brand, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 6 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  cancelRow: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: c.textSecondary, fontWeight: '700', fontSize: 14 },
});

/* -------------------------------------------------------------------------- */
/*                              Small components                              */
/* -------------------------------------------------------------------------- */

function PulsingClock({ color }) {
  const opacity = useMemo(() => new Animated.Value(0.4), []);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={{ opacity }}>
      <Ionicons name="time-outline" size={13} color={color} />
    </Animated.View>
  );
}

function MessageSkeleton({ styles }) {
  const pulse = useMemo(() => new Animated.Value(0.45), []);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const rows = [
    { w: '58%', mine: false }, { w: '40%', mine: false }, { w: '66%', mine: true },
    { w: '34%', mine: true }, { w: '52%', mine: false }, { w: '70%', mine: true },
  ];
  return (
    <Animated.View style={[styles.skeletonWrap, { opacity: pulse }]}>
      {rows.map((row, i) => (
        <View key={i} style={[styles.skeletonBubble, row.mine ? styles.skeletonMine : styles.skeletonTheirs, { width: row.w }]} />
      ))}
    </Animated.View>
  );
}

function Segmented({ options, value, onChange, styles, colors }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable key={String(option.value)} style={[styles.segmentOption, active && styles.segmentOptionActive]} onPress={() => onChange(option.value)}>
            <Ionicons name={option.icon} size={14} color={active ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SheetRow({ icon, label, onPress, danger, styles, colors }) {
  return (
    <Pressable style={styles.actionSheetRow} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.actionSheetIconWrap, danger && styles.actionSheetIconWrapDanger]}>
        <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.brandDark} />
      </View>
      <Text style={[styles.actionSheetLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

// Small pill shown next to the sender name: icon + role label.
function RoleChip({ role, styles }) {
  return (
    <View style={[styles.roleChip, { backgroundColor: role.chipBg }]} accessibilityLabel={`${role.label} member`}>
      <Ionicons name={role.icon} size={9} color={role.chipText} />
      <Text style={[styles.roleChipText, { color: role.chipText }]}>{role.label}</Text>
    </View>
  );
}

function PollMessage({ message, mine, uid, styles, colors, voting, onVote, onViewVoters, onEdit, onToggleClosed }) {
  const poll = message.poll;
  const participants = new Set((poll.options || []).flatMap((option) => option.voterIds || [])).size;
  const totalVotes = (poll.options || []).reduce((total, option) => total + (option.voterIds?.length || 0), 0);
  const answerLabel = poll.isClosed
    ? 'Poll closed'
    : poll.multiSelect
      ? 'Select one or more answers'
      : 'Select an answer';

  return (
    <View style={styles.pollCard}>
      <View style={styles.pollHeader}>
        <View style={styles.pollIcon}><Ionicons name="bar-chart-outline" size={16} color={colors.brand} /></View>
        <Text style={[styles.pollQuestion, mine && styles.pollQuestionMine]}>{poll.question}</Text>
      </View>
      {poll.options.map((option) => {
        const count = option.voterIds?.length || 0;
        const selected = option.voterIds?.includes(uid);
        const percent = participants ? Math.round((count / participants) * 100) : 0;
        return (
          <Pressable
            key={option.id}
            disabled={voting}
            onPress={() => { if (!poll.isClosed) onVote(message, option.id); }}
            onLongPress={() => onViewVoters(option)}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityState={{ disabled: voting, selected: Boolean(selected) }}
            accessibilityLabel={`${option.text}, ${percent} percent, ${count} vote${count === 1 ? '' : 's'}${selected ? ', selected' : ''}`}
            accessibilityHint="Long press to see voters"
            style={({ pressed }) => [
              styles.pollOption,
              mine && styles.pollOptionMine,
              selected && styles.pollOptionSelected,
              selected && mine && styles.pollOptionSelectedMine,
              pressed && !voting && { opacity: 0.82 },
            ]}
          >
            <View style={[styles.pollProgress, { width: `${percent}%` }, mine && styles.pollProgressMine]} />
            <View style={styles.pollOptionContent}>
              <View style={[styles.pollChoice, mine && styles.pollChoiceMine, selected && styles.pollChoiceSelected, selected && mine && styles.pollChoiceSelectedMine]}>
                {selected ? <Ionicons name="checkmark" size={14} color={mine ? colors.brand : '#FFFFFF'} /> : null}
              </View>
              <Text style={[styles.pollOptionText, mine && styles.pollOptionTextMine]}>{option.text}</Text>
              <Text style={[styles.pollPercent, mine && styles.pollPercentMine]}>{percent}%</Text>
            </View>
          </Pressable>
        );
      })}
      <View style={styles.pollFooter}>
        <Text style={[styles.pollMeta, mine && styles.pollMetaMine]}>{participants} participant{participants === 1 ? '' : 's'} · {totalVotes} vote{totalVotes === 1 ? '' : 's'} · {answerLabel}</Text>
        {mine ? (
          <View style={styles.pollManage}>
            <Pressable onPress={() => onEdit(message)} accessibilityRole="button" accessibilityLabel="Edit poll"><Text style={[styles.pollManageText, mine && styles.pollManageTextMine]}>Edit</Text></Pressable>
            <Pressable onPress={() => onToggleClosed(message)} accessibilityRole="button" accessibilityLabel={poll.isClosed ? 'Reopen poll' : 'Close poll'}><Text style={[styles.pollManageText, mine && styles.pollManageTextMine]}>{poll.isClosed ? 'Reopen' : 'Close'}</Text></Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// Memoised: typing in the composer no longer re-renders every bubble.
const MessageRow = React.memo(function MessageRow({
  message,
  mine,
  isFirst,
  showHeader,
  groupedNext,
  uid,
  isMember,
  styles,
  colors,
  onLongPress,
  onSwipeReply,
  onToggleReaction,
  onOpenReactions,
  onRetry,
  onOpenProfile,
  onOpenAttachment,
  onVotePoll,
  onViewPollVoters,
  onEditPoll,
  onTogglePollClosed,
  votingPollId,
}) {
  const swipeX = useMemo(() => new Animated.Value(0), []);
  const scaleAnim = useMemo(() => new Animated.Value(1), []);
  const firedHaptic = useRef(false);

  const isDeleted = Boolean(message.deleted);
  const isLocal = Boolean(message.localStatus);
  const status = message.localStatus || (message.createdAt ? 'sent' : 'sending');
  const failed = status === 'failed';
  const sending = status === 'sending';
  const isSticker = message.type === 'sticker' && !isDeleted;
  const lightFooter = mine && !isSticker;
  const senderColor = useMemo(() => colorForName(message.senderName || 'Student'), [message.senderName]);
  const attachments = Array.isArray(message.attachments) ? message.attachments.filter((attachment) => attachment?.url) : [];

  // Role styling applies to the avatar always, and to the bubble for real text messages only.
  const senderRole = roleOf(message);
  const bubbleRole = senderRole && !isSticker && !isDeleted ? senderRole : null;
  const roleOnMine = Boolean(bubbleRole && mine);
  const tail = !groupedNext;
  const radii = bubbleRadii(mine, tail);

  const reactionEntries = useMemo(
    () =>
      Object.entries(message.reactions || {})
        .filter(([, uids]) => Array.isArray(uids) && uids.length)
        .sort((a, b) => b[1].length - a[1].length),
    [message.reactions]
  );

  // The PanResponder is created once; it reads the latest props through this ref.
  const latest = useRef({});
  latest.current = { message, onSwipeReply, canSwipe: isMember && !isDeleted && !isLocal };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          latest.current.canSwipe && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => {
          const dx = mine ? Math.min(0, g.dx) : Math.max(0, g.dx);
          const clamped = Math.max(-SWIPE_REPLY_MAX, Math.min(dx, SWIPE_REPLY_MAX));
          swipeX.setValue(clamped);
          const past = Math.abs(clamped) >= SWIPE_REPLY_THRESHOLD;
          if (past && !firedHaptic.current) {
            firedHaptic.current = true;
            Haptics.selectionAsync();
          } else if (!past) firedHaptic.current = false;
        },
        onPanResponderRelease: (_, g) => {
          const dx = mine ? Math.min(0, g.dx) : Math.max(0, g.dx);
          if (Math.abs(dx) >= SWIPE_REPLY_THRESHOLD) latest.current.onSwipeReply(latest.current.message);
          firedHaptic.current = false;
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 16 }).start();
        },
        onPanResponderTerminate: () => {
          firedHaptic.current = false;
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [mine, swipeX]
  );

  const replyIconOpacity = swipeX.interpolate({
    inputRange: mine ? [-SWIPE_REPLY_THRESHOLD, 0] : [0, SWIPE_REPLY_THRESHOLD],
    outputRange: mine ? [1, 0] : [0, 1],
    extrapolate: 'clamp',
  });

  const ms = getMillis(message);
  const timeText = isLocal ? timeLabel(ms) : message.createdAt ? formatShortTime(message.createdAt) : '';
  const dimColor = lightFooter ? 'rgba(255,255,255,0.75)' : colors.textTertiary;

  const footer = (
    <View style={styles.bubbleFooter}>
      {failed ? (
        <Pressable onPress={() => onRetry(message)} hitSlop={8} style={styles.failedRow} accessibilityRole="button" accessibilityLabel="Retry sending message">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.failedText}>Not sent · Tap to retry</Text>
        </Pressable>
      ) : (
        <>
          {message.edited && !isDeleted ? <Text style={[styles.messageTime, lightFooter && styles.messageTimeMine]}>Edited</Text> : null}
          <Text style={[styles.messageTime, lightFooter && styles.messageTimeMine]}>{sending ? 'Sending…' : timeText}</Text>
          {mine && !isDeleted ? (sending ? <PulsingClock color={dimColor} /> : <Ionicons name="checkmark" size={14} color={dimColor} />) : null}
        </>
      )}
    </View>
  );

  const showAuthorRow = (showHeader && !mine) || (isFirst && bubbleRole);

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs, !groupedNext && styles.rowEnd]} {...panResponder.panHandlers}>
      <Animated.View pointerEvents="none" style={[mine ? styles.swipeReplyIconMine : styles.swipeReplyIconTheirs, { opacity: replyIconOpacity }]}>
        <Ionicons name="arrow-undo" size={18} color={colors.brand} />
      </Animated.View>

      {!mine ? (
        <Pressable style={styles.avatarSlot} onPress={() => message.senderId && onOpenProfile(message.senderId)} disabled={!message.senderId} accessibilityRole="button" accessibilityLabel={`Open ${message.senderName || 'student'}'s profile`}>
          {showHeader ? (
            <View style={[styles.avatarRing, senderRole && { borderColor: senderRole.chipBg }]}>
              <View style={[styles.avatar, { backgroundColor: senderColor }]}>
                {message.senderAvatar ? (
                  <Image source={{ uri: message.senderAvatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initialsForName(message.senderName || 'S')}</Text>
                )}
              </View>
              {senderRole ? (
                <View style={[styles.avatarBadge, { backgroundColor: senderRole.chipBg }]}>
                  <Ionicons name={senderRole.icon} size={8} color={senderRole.chipText} />
                </View>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <Animated.View style={[styles.bubbleColumn, message.type === 'poll' && styles.pollBubbleColumn, { transform: [{ translateX: swipeX }, { scale: scaleAnim }] }]}>
        <Pressable
          onLongPress={() => onLongPress(message)}
          onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 4 }).start()}
          onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start()}
          delayLongPress={250}
          accessibilityLabel={`${message.senderName || 'Student'}: ${messagePreview(message)}`}
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            radii,
            isSticker && styles.bubbleSticker,
            bubbleRole && [
              styles.bubbleRole,
              { borderColor: bubbleRole.border, shadowColor: bubbleRole.glow },
              roleOnMine && bubbleRole.mineBg && { backgroundColor: bubbleRole.mineBg },
            ],
            failed && styles.bubbleFailed,
            sending && styles.pendingDim,
          ]}
        >
          {/* Tinted wash (theirs only) + top sheen make the role bubble read as a premium surface. */}
          {bubbleRole && !mine ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, radii, { backgroundColor: bubbleRole.tint }]} />
          ) : null}
          {bubbleRole ? <View pointerEvents="none" style={[styles.roleSheen, { backgroundColor: bubbleRole.sheen }]} /> : null}

          {showAuthorRow ? (
            <View style={[styles.authorRow, mine && styles.authorRowMine]}>
              {showHeader && !mine ? (
                <Text style={[styles.messageAuthor, { color: senderRole ? senderRole.accent : senderColor }]} numberOfLines={1}>
                  {message.senderName || 'Student'}
                </Text>
              ) : null}
              {bubbleRole && isFirst ? <RoleChip role={bubbleRole} styles={styles} /> : null}
            </View>
          ) : null}

          {message.replyTo ? (
            <View style={[styles.replyBlock, lightFooter ? styles.replyBlockMine : styles.replyBlockTheirs]}>
              <Text style={[styles.replyAuthor, lightFooter && styles.replyAuthorMine]}>{message.replyTo.senderName || 'Student'}</Text>
              <Text style={[styles.replyText, lightFooter && styles.replyTextMine]} numberOfLines={2}>{message.replyTo.text || ''}</Text>
            </View>
          ) : null}

          {isDeleted ? (
            <Text style={[styles.messageBody, mine && styles.messageBodyMine, styles.messageDeleted]}>This message was deleted</Text>
          ) : message.type === 'sticker' ? (
            <View style={sending ? styles.pendingDim : null}>
              <StickerMessage message={message} isMine={mine} onLongPress={() => onLongPress(message)} />
            </View>
          ) : message.type === 'poll' && message.poll ? (
            <PollMessage message={message} mine={mine} uid={uid} styles={styles} colors={colors} voting={votingPollId === message.id} onVote={onVotePoll} onViewVoters={onViewPollVoters} onEdit={onEditPoll} onToggleClosed={onTogglePollClosed} />
          ) : (
            <Text style={[styles.messageBody, mine && styles.messageBodyMine]}>
              {message.text ? renderLinkedText(message.text, mine, colors) : '📎 Attachment'}
            </Text>
          )}

          {!isDeleted && message.type !== 'sticker' && message.type !== 'poll' ? attachments.map((attachment, index) => {
            const kind = attachmentKind(attachment);
            const media = { ...attachment, kind, authorName: message.senderName };
            if (kind === 'image') {
              return <Pressable key={`${attachment.url}-${index}`} onPress={() => onOpenAttachment(media)} style={styles.chatAttachment} accessibilityRole="imagebutton" accessibilityLabel="Open image attachment"><Image source={{ uri: attachment.url }} style={styles.chatAttachmentImage} resizeMode="cover" /></Pressable>;
            }
            if (kind === 'video') {
              return <Pressable key={`${attachment.url}-${index}`} onPress={() => onOpenAttachment(media)} style={[styles.chatAttachment, styles.chatAttachmentVideo]} accessibilityRole="button" accessibilityLabel="Play video attachment"><Ionicons name="play-circle" size={42} color={mine ? '#FFFFFF' : colors.brand} /><Text style={[styles.messageTime, mine && styles.messageTimeMine]} numberOfLines={1}>{attachment.name || 'Video'}</Text></Pressable>;
            }
            return <Pressable key={`${attachment.url}-${index}`} onPress={() => onOpenAttachment(media)} style={[styles.chatAttachment, styles.chatAttachmentDocument]} accessibilityRole="button" accessibilityLabel={`Open ${attachment.name || 'document'}`}><Ionicons name="document-text-outline" size={23} color={mine ? '#FFFFFF' : colors.brand} /><View style={{ flex: 1 }}><Text style={[styles.chatAttachmentName, mine && styles.messageBodyMine]} numberOfLines={1}>{attachment.name || 'Document'}</Text><Text style={[styles.chatAttachmentMeta, mine && styles.messageTimeMine]}>{formatFileSize(attachment.size) || 'Document'}</Text></View></Pressable>;
          }) : null}

          {footer}
        </Pressable>

        {reactionEntries.length ? (
          <View style={[styles.reactionsRow, mine && styles.reactionsRowMine]}>
            {reactionEntries.map(([emoji, uids]) => {
              const reactedByMe = uid ? uids.includes(uid) : false;
              return (
                <Pressable
                  key={emoji}
                  style={[styles.reactionPill, reactedByMe && styles.reactionPillActive]}
                  onPress={() => onToggleReaction(message, emoji)}
                  onLongPress={() => onOpenReactions(message.reactions, 'Message reactions')}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`${emoji} ${uids.length}${reactedByMe ? ', you reacted' : ''}. Long press to see who reacted.`}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={[styles.reactionCount, reactedByMe && styles.reactionCountActive]}>{uids.length}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/*                                    Screen                                  */
/* -------------------------------------------------------------------------- */

export default function GroupDetailPage() {
  const { groupId: rawGroupId } = useLocalSearchParams();
  const groupId = Array.isArray(rawGroupId) ? rawGroupId[0] : rawGroupId;
  // Remount per group so no state leaks between groups.
  return <GroupDetailScreen key={groupId} groupId={groupId} />;
}

function GroupDetailScreen({ groupId }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const uid = user?.uid;
  const cacheKey = `${uid || 'anon'}:${groupId}`;

  const cachedGroup = GROUP_CACHE.get(cacheKey);
  const cachedMessages = MESSAGE_CACHE.get(groupId);

  const [group, setGroup] = useState(cachedGroup?.group || null);
  const [membership, setMembership] = useState(cachedGroup?.membership || null);
  const [joinRequests, setJoinRequests] = useState(cachedGroup?.joinRequests || []);
  const [messages, setMessages] = useState(cachedMessages?.messages || []);
  const [pending, setPending] = useState([]); // optimistic outgoing messages
  const [messageCursor, setMessageCursor] = useState(cachedMessages?.cursor || null);
  const [hasMoreMessages, setHasMoreMessages] = useState(cachedMessages ? cachedMessages.hasMore : true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(!cachedMessages);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(!cachedGroup);
  const [busy, setBusy] = useState(false);
  const [requestSent, setRequestSent] = useState(() => REQUESTED_CACHE.has(`${uid || 'anon'}:${groupId}`));
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [draft, setDraft] = useState(() => DRAFT_CACHE.get(groupId) || '');
  const [chatAttachment, setChatAttachment] = useState(null);
  const [chatUploading, setChatUploading] = useState(false);
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [toast, setToast] = useState('');
  const [pollVisible, setPollVisible] = useState(false);
  const [pollEditing, setPollEditing] = useState(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollMultiSelect, setPollMultiSelect] = useState(false);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [votingPollId, setVotingPollId] = useState(null);
  const [pollVoterViewer, setPollVoterViewer] = useState(null);
  const [activeTab, setActiveTab] = useState('Feed');
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [viewerMedia, setViewerMedia] = useState(null);
  const [postDraft, setPostDraft] = useState('');
  const [postAttachment, setPostAttachment] = useState(null);
  const [posting, setPosting] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editPostText, setEditPostText] = useState('');
  const [savingPostEdit, setSavingPostEdit] = useState(false);
  const [composerToolsVisible, setComposerToolsVisible] = useState(false);

  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [reactionViewer, setReactionViewer] = useState(null);
  const [groupOptionsVisible, setGroupOptionsVisible] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Academics');
  const [editPrivacy, setEditPrivacy] = useState('public');
  const [editAllowMemberMessages, setEditAllowMemberMessages] = useState(true);
  const [editRequireApproval, setEditRequireApproval] = useState(true);
  const [editWelcomeMessage, setEditWelcomeMessage] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editMessageType, setEditMessageType] = useState('success');

  const messageActionsSheet = useDraggableSheet(() => setActiveMessage(null));
  const groupOptionsSheet = useDraggableSheet(() => setGroupOptionsVisible(false));
  const editSheet = useDraggableSheet(() => setEditVisible(false));

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const nearBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const lastKeyRef = useRef(null);
  const messagesRef = useRef(messages);
  const syncedAtRef = useRef(cachedMessages?.ts || 0);
  const cursorReadyRef = useRef(Boolean(cachedMessages)); // do we know where "older" starts?
  const editCloseTimer = useRef(null);
  const toastTimer = useRef(null);
  const scrollTimer = useRef(null);
  const olderTimer = useRef(null);
  const handleScrollRef = useRef(null);
  const viewedPostsRef = useRef(new Set());
  const toastOpacity = useMemo(() => new Animated.Value(0), []);
  const sendScale = useMemo(() => new Animated.Value(1), []);
  const scrollY = useMemo(() => new Animated.Value(0), []);

  /* ---------------------------- Derived values --------------------------- */

  const groupPhotoUrl = group?.photoURL || group?.avatarUrl || group?.coverUrl || group?.avatar?.url || group?.avatar?.secure_url || '';
  const isOwnerOrAdmin = computeIsAdmin(group, membership, uid);
  const isMember = Boolean(isOwnerOrAdmin || membership);
  const isAdmin = isOwnerOrAdmin;
  const canSendMessages = Boolean(isAdmin || (isMember && group?.allowMemberMessages !== false));
  const activeText = editingMessage ? editText : draft;
  const canSubmit = Boolean(activeText.trim() || chatAttachment) && canSendMessages && !chatUploading;
  const nearLimit = activeText.length > MAX_LENGTH * 0.85;
  const pollHasVotes = Boolean(pollEditing?.poll?.options?.some((option) => (option.voterIds || []).length));
  const canSubmitPoll = Boolean(pollQuestion.trim() && pollOptions.filter((option) => option.trim()).length >= 2) && !pollSubmitting;

  const groupTabs = useMemo(() => [
    { key: 'Feed', icon: 'newspaper-outline', label: 'Feed' },
    { key: 'Chat', icon: 'chatbubble-outline', label: 'Chat' },
    { key: 'Members', icon: 'people-outline', label: 'Members', count: Number(group?.memberCount || members.length || 0) },
    { key: 'Media', icon: 'images-outline', label: 'Media' },
    { key: 'Files', icon: 'document-text-outline', label: 'Files' },
    { key: 'About', icon: 'information-circle-outline', label: 'About' },
  ], [group?.memberCount, members.length]);

  useEffect(() => {
    if (!groupId || !isMember || !['Feed', 'Media', 'Files'].includes(activeTab)) return undefined;
    return listenGroupPosts(groupId, setPosts);
  }, [groupId, isMember, activeTab]);

  useEffect(() => {
    viewedPostsRef.current = new Set();
  }, [groupId]);

  useEffect(() => {
    if (activeTab !== 'Feed' || !groupId || !uid || !isMember || !posts.length) return;
    posts.forEach((post) => {
      if (!post?.id || viewedPostsRef.current.has(post.id)) return;
      viewedPostsRef.current.add(post.id);
      recordGroupPostView(groupId, post.id, uid).catch(() => {
        viewedPostsRef.current.delete(post.id);
      });
    });
  }, [activeTab, groupId, isMember, posts, uid]);

  useEffect(() => {
    if (!groupId || !isMember || activeTab !== 'Members') return;
    listGroupMembers(groupId).then(setMembers).catch(() => setMembers([]));
  }, [groupId, isMember, activeTab]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Messages shown = server messages + optimistic ones that the server hasn't echoed back yet.
  const displayMessages = useMemo(() => {
    if (!pending.length) return messages;
    const live = pending.filter((p) => !hasServerEcho(p, messages));
    return live.length ? sortMessages([...messages, ...live]) : messages;
  }, [messages, pending]);

  const sharedMedia = useMemo(() => {
    const fromMessages = displayMessages.flatMap((message) =>
      (message.attachments || []).filter((attachment) => attachment?.url).map((attachment, index) => ({
        ...attachment,
        id: `message-${message.id}-${index}`,
        kind: attachmentKind(attachment),
        authorName: message.senderName || 'Student',
        createdAt: message.createdAt,
      }))
    );
    const fromPosts = posts.flatMap((post) =>
      (post.attachments || []).filter((attachment) => attachment?.url).map((attachment, index) => ({
        ...attachment,
        id: `post-${post.id}-${index}`,
        kind: attachmentKind(attachment),
        authorName: post.authorName || 'Student',
        createdAt: post.createdAt,
      }))
    );
    const links = displayMessages.flatMap((message) =>
      urlsInText(message.text).map((url, index) => ({
        id: `link-${message.id}-${index}`,
        url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
        name: url,
        kind: 'link',
        authorName: message.senderName || 'Student',
        createdAt: message.createdAt,
      }))
    );
    return [...fromMessages, ...fromPosts, ...links].sort((left, right) => getMillis(right) - getMillis(left));
  }, [displayMessages, posts]);

  // Drop optimistic copies once the real message has arrived.
  useEffect(() => {
    if (!pending.length) return;
    const stale = pending.filter((p) => hasServerEcho(p, messages));
    if (stale.length) setPending((prev) => prev.filter((p) => !stale.some((s) => s.localId === p.localId)));
  }, [messages, pending]);

  const listData = useMemo(() => {
    if (!isMember) return [];
    const out = [];
    let prevMs = 0;
    displayMessages.forEach((message, index) => {
      const ms = getMillis(message);
      if (ms && (!prevMs || !isSameDay(ms, prevMs))) {
        out.push({ kind: 'date', key: `date-${startOfDay(ms)}`, label: dayLabel(ms) });
      }
      if (ms) prevMs = ms;
      const mine = message.senderId === uid;
      const isFirst = !inSameGroup(displayMessages[index - 1], message);
      out.push({
        kind: 'message',
        key: message.id,
        message,
        mine,
        isFirst,
        showHeader: !mine && isFirst,
        groupedNext: inSameGroup(message, displayMessages[index + 1]),
      });
    });
    return out;
  }, [displayMessages, isMember, uid]);

  const reactionPeople = useMemo(() => {
    if (!reactionViewer) return [];
    const people = new Map();
    const addPerson = (id, person = {}) => {
      if (!id) return;
      people.set(String(id), {
        id: String(id),
        name: person.name || person.displayName || person.fullName || person.senderName || 'Group member',
        avatar: person.avatar || person.avatarUrl || person.photoURL || person.senderAvatar || '',
      });
    };
    addPerson(uid, { name: profile?.displayName || profile?.name || user?.displayName || 'You', avatar: profile?.avatar || profile?.photoURL || user?.photoURL });
    members.forEach((member) => addPerson(member.uid || member.id, member));
    messages.forEach((message) => addPerson(message.senderId, message));
    posts.forEach((post) => addPerson(post.authorId, post));

    return reactionViewer.reactorIds.map((id) => {
      const emojis = Object.entries(reactionViewer.reactions || {})
        .filter(([, ids]) => Array.isArray(ids) && ids.includes(id))
        .map(([emoji]) => emoji);
      return { ...(people.get(String(id)) || { id: String(id), name: 'Group member', avatar: '' }), emojis };
    });
  }, [reactionViewer, uid, profile, user, members, messages, posts]);

  const pollVoterPeople = useMemo(() => {
    if (!pollVoterViewer) return [];
    const directory = new Map(members.map((member) => [String(member.uid || member.id), member]));
    return pollVoterViewer.voterIds.map((id) => {
      const member = directory.get(String(id)) || {};
      return {
        id: String(id),
        name: String(id) === uid ? 'You' : member.name || member.displayName || member.username || 'Group member',
        avatar: member.avatar || member.avatarUrl || member.photoURL || '',
      };
    });
  }, [pollVoterViewer, members, uid]);

  /* ------------------------------- Utilities ------------------------------ */

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    Animated.timing(toastOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(''));
    }, 2200);
  }, [toastOpacity]);

  const scrollToLatest = useCallback((animated = true) => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated }), 60);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(editCloseTimer.current);
      clearTimeout(toastTimer.current);
      clearTimeout(scrollTimer.current);
      clearTimeout(olderTimer.current);
    },
    []
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      if (nearBottomRef.current) scrollToLatest(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToLatest]);

  // Little "pop" on the send button when it becomes active.
  useEffect(() => {
    Animated.spring(sendScale, { toValue: canSubmit ? 1 : 0.92, useNativeDriver: true, friction: 6, tension: 160 }).start();
  }, [canSubmit, sendScale]);

  /* -------------------------------- Loading ------------------------------- */

  // Group doc + membership (+ join requests for admins). Served from cache when fresh;
  // `force` is used after actions that really change membership.
  const load = useCallback(
    async (force = false) => {
      if (!groupId) return;
      const cached = GROUP_CACHE.get(cacheKey);
      if (!force && cached && Date.now() - cached.ts < GROUP_CACHE_TTL_MS) return;
      // No uid yet (auth still hydrating) -> don't pay for a membership read that can't succeed.
      const [groupData, memberData] = await Promise.all([getGroup(groupId), uid ? getMembership(groupId, uid) : null]);
      let requests = [];
      if (groupData && computeIsAdmin(groupData, memberData, uid)) {
        const result = await listGroupJoinRequests(groupId, 20);
        requests = Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : [];
      }
      putCache(GROUP_CACHE, cacheKey, { group: groupData, membership: memberData, joinRequests: requests, ts: Date.now() });
      setGroup(groupData);
      setMembership(memberData);
      setJoinRequests(requests);
    },
    [groupId, uid, cacheKey]
  );

  useEffect(() => {
    let cancelled = false;
    load()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Keep the cache in sync with local changes (optimistic edits, approved requests) without extra reads.
  useEffect(() => {
    if (!group) return;
    const prev = GROUP_CACHE.get(cacheKey);
    putCache(GROUP_CACHE, cacheKey, { group, membership, joinRequests, ts: prev?.ts || Date.now() });
  }, [group, membership, joinRequests, cacheKey]);

  // Persist loaded messages so re-entering the group is instant.
  useEffect(() => {
    if (messagesLoading && !messages.length) return;
    if (messages.length > MESSAGE_CACHE_MAX) {
      MESSAGE_CACHE.delete(groupId);
      return;
    }
    putCache(MESSAGE_CACHE, groupId, { messages, cursor: messageCursor, hasMore: hasMoreMessages, ts: syncedAtRef.current });
  }, [messages, messageCursor, hasMoreMessages, messagesLoading, groupId]);

  const loadOlderMessages = useCallback(async () => {
    if (!groupId || !isMember || !hasMoreMessages || loadingOlderRef.current || !messageCursor) return;
    loadingOlderRef.current = true;
    setLoadingOlderMessages(true);
    try {
      const result = await loadOlderGroupMessages(groupId, messageCursor);
      const older = Array.isArray(result?.messages) ? result.messages : [];
      if (older.length) {
        setMessages((prev) => mergeMessages(prev, older));
        setMessageCursor(result.cursor || null);
      }
      setHasMoreMessages(Boolean(result?.hasMore));
    } catch (error) {
      console.log('Failed to fetch older group messages', error);
    } finally {
      setLoadingOlderMessages(false);
      // Hold the guard so auto-stick-to-bottom doesn't fight the prepend.
      clearTimeout(olderTimer.current);
      olderTimer.current = setTimeout(() => {
        loadingOlderRef.current = false;
      }, 350);
    }
  }, [groupId, hasMoreMessages, isMember, messageCursor]);

  // Live messages.
  //  - Cached messages are shown instantly and the listener revalidates them: NO separate page read.
  //  - A page is fetched only when nothing is cached (we need its cursor for "load older"),
  //    or when the listener's window doesn't overlap a very old cache (gap -> rebuild).
  useEffect(() => {
    if (!groupId || !isMember) return undefined;
    let cancelled = false;
    let firstSnapshot = true;

    const fetchFirstPage = async (rebuild = false) => {
      try {
        const result = await loadRecentGroupMessages(groupId, MESSAGE_PAGE_SIZE);
        if (cancelled) return;
        const next = Array.isArray(result?.messages) ? result.messages : [];
        syncedAtRef.current = Date.now();
        setMessages((prev) => mergeMessages(prev, next));
        if (rebuild || !cursorReadyRef.current) {
          cursorReadyRef.current = true;
          setMessageCursor(result?.cursor || null);
          setHasMoreMessages(Boolean(result?.hasMore));
        }
        setLoadError(false);
      } catch (error) {
        console.log('Failed to load group messages', error);
        if (!cancelled && !messagesRef.current.length) setLoadError(true);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };

    if (messagesRef.current.length) setMessagesLoading(false);
    else fetchFirstPage();

    const unsubscribe = listenGroupMessages(groupId, (incoming) => {
      if (cancelled) return;
      const list = Array.isArray(incoming) ? incoming : [];
      syncedAtRef.current = Date.now();
      setMessagesLoading(false);

      if (firstSnapshot) {
        firstSnapshot = false;
        const current = messagesRef.current;
        if (current.length && list.length) {
          const known = new Set(current.map((m) => m.id));
          if (!list.some((m) => known.has(m.id))) {
            // Cache is older than the live window: drop it and rebuild the cursor.
            setMessages(mergeMessages([], list));
            fetchFirstPage(true);
            return;
          }
        }
      }
      setMessages((prev) => mergeMessages(prev, list));
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [groupId, isMember, reloadKey]);

  // Auto-follow new tail messages; otherwise count them for the jump button badge.
  const lastMessage = displayMessages[displayMessages.length - 1];
  const lastKey = lastMessage?.id || null;
  useEffect(() => {
    if (!lastKey) {
      lastKeyRef.current = null;
      return;
    }
    if (lastKeyRef.current === null) {
      lastKeyRef.current = lastKey;
      return;
    }
    if (lastKeyRef.current === lastKey) return;
    lastKeyRef.current = lastKey;
    if (lastMessage?.senderId === uid || nearBottomRef.current) scrollToLatest(true);
    else setNewBelow((count) => count + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey]);

  /* ------------------------------ List behavior --------------------------- */

  const handleScroll = useCallback(
    (event) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distance = contentSize.height - (contentOffset.y + layoutMeasurement.height);
      const near = distance < NEAR_BOTTOM_PX;
      nearBottomRef.current = near;
      setShowJumpToLatest((prev) => (prev === !near ? prev : !near));
      if (near) setNewBelow((count) => (count === 0 ? count : 0));
      if (contentOffset.y <= 48) loadOlderMessages();
    },
    [loadOlderMessages]
  );

  useEffect(() => {
    handleScrollRef.current = handleScroll;
  }, [handleScroll]);

  // Stable Animated.event (header collapse) that forwards to the latest handler.
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
        listener: (event) => handleScrollRef.current?.(event),
      }),
    [scrollY]
  );

  const handleContentSizeChange = useCallback(() => {
    // Only follow new content if the reader is already at the bottom.
    if (nearBottomRef.current && !loadingOlderRef.current) scrollRef.current?.scrollToEnd?.({ animated: false });
  }, []);

  /* -------------------------------- Actions ------------------------------- */

  const handleDraftChange = (text) => {
    if (editingMessage) {
      setEditText(text);
      return;
    }
    setDraft(text);
    if (text) DRAFT_CACHE.set(groupId, text);
    else DRAFT_CACHE.delete(groupId);
  };

  const insertMention = (name) => {
    if (!name) return;
    const mention = `@${name.replace(/\s+/g, '')} `;
    const prefix = draft.trimEnd();
    handleDraftChange(prefix ? `${prefix} ${mention}` : mention);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const openProfile = useCallback((senderId) => router.navigate(`/view-user-profile/${senderId}`), [router]);

  const openDm = async (message) => {
    if (!user || !message?.senderId || message.senderId === uid) return;
    showToast('Opening chat…');
    try {
      const conversationId = await startConversation(
        user,
        { id: message.senderId, username: message.senderName, photo: message.senderAvatar, email: message.senderEmail || '' },
        profile || {}
      );
      router.navigate(`/messages/${conversationId}`);
    } catch (error) {
      Alert.alert('Could not open chat', error?.message || 'Unable to start a private conversation.');
    }
  };

  const join = async () => {
    if (!group || !user || isOwnerOrAdmin || requestSent) return;
    setBusy(true);
    try {
      if (group.privacy === 'private' && group.requireApproval !== false) {
        await requestJoinGroup(group, user, profile || {});
        REQUESTED_CACHE.add(cacheKey);
        setRequestSent(true);
        showToast('Request sent. An admin will review it.');
      } else {
        await joinPublicGroup(group, user, profile || {});
        await load(true);
        showToast('You joined the group');
      }
    } catch (error) {
      Alert.alert('Could not join', error?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Optimistic: the request disappears immediately; it is restored if the call fails. No full reload.
  const handleJoinRequestAction = async (request, action) => {
    const requestUserId = request?.uid;
    if (!groupId || !uid || !requestUserId || processingRequestId) return;
    setProcessingRequestId(requestUserId);
    setJoinRequests((prev) => prev.filter((r) => r.uid !== requestUserId));
    try {
      if (action === 'approve') {
        await approveGroupJoinRequest(groupId, requestUserId, uid);
        setGroup((g) => (g ? { ...g, memberCount: Number(g.memberCount || 0) + 1 } : g));
        showToast(`${request.name || 'Student'} was approved`);
      } else {
        await rejectGroupJoinRequest(groupId, requestUserId, uid);
        showToast('Request declined');
      }
    } catch (error) {
      setJoinRequests((prev) => (prev.some((r) => r.uid === requestUserId) ? prev : [request, ...prev]));
      showToast(error?.message || 'Unable to process this request right now.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  /* -------------------------------- Sending ------------------------------- */

  const buildReplyPayload = () =>
    replyTo
      ? { id: replyTo.id, senderId: replyTo.senderId || '', senderName: replyTo.senderName || 'Student', text: messagePreview(replyTo) }
      : null;

  // Role fields are mirrored on the optimistic copy so a premium/admin bubble looks right
  // the instant it is sent, instead of "popping" into its styling when the server echoes it.
  const buildLocal = (fields, payload) => {
    const localId = createLocalId();
    return {
      id: localId,
      localId,
      localStatus: 'sending',
      senderId: uid,
      senderName: profile?.name || user?.displayName || 'Student',
      senderAvatar: profile?.photo || profile?.avatar || user?.photoURL || '',
      senderRole: profile?.role || undefined,
      senderPremium: Boolean(profile?.isPremium ?? profile?.premium),
      createdAt: new Date(),
      replyTo: payload.replyTo || null,
      payload,
      ...fields,
    };
  };

  const deliver = async (local) => {
    setPending((prev) => prev.map((p) => (p.localId === local.localId ? { ...p, localStatus: 'sending' } : p)));
    try {
      const result = await sendGroupMessage(groupId, user, profile || {}, { ...local.payload, clientTempId: local.localId });
      const serverId = (typeof result === 'string' ? result : result?.id || result?.message?.id) || null;
      setPending((prev) => prev.map((p) => (p.localId === local.localId ? { ...p, localStatus: 'sent', serverId } : p)));
    } catch (error) {
      setPending((prev) => prev.map((p) => (p.localId === local.localId ? { ...p, localStatus: 'failed' } : p)));
      showToast(error?.message || 'Message not sent. Tap it to retry.');
    }
  };

  const queueMessage = (fields, payload) => {
    const local = buildLocal(fields, payload);
    setPending((prev) => [...prev, local]);
    setReplyTo(null);
    nearBottomRef.current = true;
    scrollToLatest(true);
    deliver(local);
  };

  const send = async () => {
    const text = sanitizeMessageText(draft);
    if ((!text && !chatAttachment) || !group || !isMember || !canSendMessages || chatUploading) return;
    const replyPayload = buildReplyPayload();
    let attachments = [];
    if (chatAttachment) {
      setChatUploading(true);
      try {
        const uploaded = await uploadFeatureMedia(chatAttachment, {
          feature: 'groups',
          resourceType: chatAttachment.kind === 'image' ? 'image' : chatAttachment.kind === 'video' ? 'video' : 'raw',
        });
        const url = uploaded?.secure_url || uploaded?.url;
        if (!url) throw new Error('Attachment upload failed. Please try again.');
        attachments = [{
          url,
          name: chatAttachment.name,
          type: chatAttachment.kind,
          mimeType: chatAttachment.mimeType || chatAttachment.type,
          size: chatAttachment.size || 0,
        }];
      } catch (error) {
        showToast(error?.message || 'Could not upload the attachment.');
        setChatUploading(false);
        return;
      }
      setChatUploading(false);
      setChatAttachment(null);
    }
    setDraft('');
    DRAFT_CACHE.delete(groupId);
    queueMessage({ type: 'text', text, attachments }, { text, attachments, replyTo: replyPayload });
  };

  const sendSticker = (sticker) => {
    if (!sticker || !group || !user || !isMember || !canSendMessages) return;
    const replyPayload = buildReplyPayload();
    const stickerFields = { id: sticker.id, type: sticker.type, assetUrl: sticker.assetUrl, thumbnailUrl: sticker.thumbnailUrl, name: sticker.name, editor: sticker.editor || null };
    queueMessage(
      { type: 'sticker', stickerId: sticker.id, sticker: stickerFields },
      { type: 'sticker', stickerId: sticker.id, sticker: stickerFields, replyTo: replyPayload && { ...replyPayload, text: replyPayload.text || 'Sticker' } }
    );
  };

  const submitPoll = async () => {
    if (!canSubmitPoll) return;
    setPollSubmitting(true);
    try {
      if (pollEditing) await editGroupPoll(groupId, pollEditing.id, uid, { question: pollQuestion, options: pollOptions, multiSelect: pollMultiSelect });
      else await createGroupPoll(groupId, user, profile || {}, { question: pollQuestion, options: pollOptions, multiSelect: pollMultiSelect });
      setPollVisible(false); setPollEditing(null); setPollQuestion(''); setPollOptions(['', '']); setPollMultiSelect(false);
    } catch (error) { showToast(error?.message || 'Could not create poll.'); }
    finally { setPollSubmitting(false); }
  };

  const votePoll = useCallback(async (message, optionId) => {
    if (!message?.id || votingPollId) return;
    setVotingPollId(message.id);
    try { await voteGroupPoll(groupId, message.id, optionId, uid); }
    catch (error) { showToast(error?.message || 'Could not record your vote.'); }
    finally { setVotingPollId(null); }
  }, [groupId, showToast, uid, votingPollId]);

  const openPollVoters = useCallback((option) => {
    Haptics.selectionAsync();
    setPollVoterViewer({ optionText: option?.text || 'Option', voterIds: [...new Set(option?.voterIds || [])] });
  }, []);

  const openPollEditor = useCallback((message = null) => {
    setPollEditing(message);
    setPollQuestion(message?.poll?.question || '');
    setPollOptions(message?.poll?.options?.map((option) => option.text) || ['', '']);
    setPollMultiSelect(Boolean(message?.poll?.multiSelect));
    setPollVisible(true);
  }, []);
  const togglePollClosed = useCallback(async (message) => {
    try { await setGroupPollClosed(groupId, message.id, uid, !message.poll?.isClosed); }
    catch (error) { showToast(error?.message || 'Could not update poll.'); }
  }, [groupId, showToast, uid]);

  const retryPending = useCallback((message) => {
    if (message?.localStatus !== 'failed') return;
    deliver(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, user, profile]);

  const discardPending = (message) => setPending((prev) => prev.filter((p) => p.localId !== message.localId));

  /* ----------------------------- Message actions -------------------------- */

  const withinEditWindow = (message) => {
    const sentAt = getMillis(message);
    return Boolean(sentAt && Date.now() - sentAt <= EDIT_WINDOW_MS);
  };

  const openActions = useCallback((message) => {
    Haptics.selectionAsync();
    setActiveMessage(message);
  }, []);

  const setReplyFromSwipe = useCallback((message) => {
    if (!message || message.deleted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingMessage(null);
    setReplyTo(message);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Optimistic reaction: the pill shows instantly; on failure the toggle is undone.
  const toggleReaction = useCallback(
    async (message, emoji) => {
      if (!uid || !groupId || !isMember || message?.localStatus) return;
      const apply = (m) => (m.id === message.id ? { ...m, reactions: toggleReactionLocal(m.reactions, emoji, uid) } : m);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMessages((prev) => prev.map(apply));
      try {
        await toggleMessageReaction(groupId, message.id, emoji, uid);
      } catch (err) {
        setMessages((prev) => prev.map(apply));
        showToast(err?.message || "Couldn't add that reaction.");
      }
    },
    [groupId, isMember, showToast, uid]
  );

  const openReactionViewer = useCallback(async (reactions = {}, title = 'Reactions') => {
    // Messages store emoji -> user IDs; feed posts store user ID -> selected emoji.
    const normalizedReactions = Object.values(reactions).some(Array.isArray)
      ? reactions
      : Object.entries(reactions).reduce((result, [reactorId, emoji]) => {
        if (!emoji) return result;
        result[emoji] = [...(result[emoji] || []), reactorId];
        return result;
      }, {});
    const reactorIds = [...new Set(Object.values(normalizedReactions).flatMap((ids) => (Array.isArray(ids) ? ids : [])))];
    if (!reactorIds.length) return;
    setReactionViewer({ title, reactions: normalizedReactions, reactorIds });
    if (!members.length) {
      try {
        const groupMembers = await listGroupMembers(groupId);
        setMembers(groupMembers || []);
      } catch {
        // The reaction list still has a private fallback while the directory is unavailable.
      }
    }
  }, [groupId, members.length]);

  const startEditingMessage = (message) => {
    if (!message || message.senderId !== uid || message.type === 'sticker' || !withinEditWindow(message)) return;
    setReplyTo(null);
    setEditingMessage(message);
    setEditText(message.text || '');
    setActiveMessage(null);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const cancelEditingMessage = () => {
    setEditingMessage(null);
    setEditText('');
  };

  // Optimistic edit: new text + "Edited" appear immediately; reverted if the server rejects it.
  const saveEditedMessage = async () => {
    const nextText = editText.trim();
    if (!editingMessage || !nextText) return;
    if (nextText === String(editingMessage.text || '').trim()) {
      cancelEditingMessage();
      return;
    }
    const target = editingMessage;
    const previous = { text: target.text, edited: target.edited };
    setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, text: nextText, edited: true } : m)));
    cancelEditingMessage();
    try {
      await updateGroupMessage(groupId, target.id, nextText, uid);
    } catch (error) {
      setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, ...previous } : m)));
      showToast(error?.message || 'Unable to edit this message.');
    }
  };

  const removeGroupMessage = (message) => {
    if (!message || message.senderId !== uid || !withinEditWindow(message)) return;
    Alert.alert('Delete message?', 'It will be replaced with “This message was deleted” for everyone in the group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, deleted: true } : m)));
          try {
            await deleteGroupMessage(groupId, message.id, uid);
          } catch (error) {
            setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, deleted: false } : m)));
            showToast(error?.message || 'Unable to delete this message.');
          }
        },
      },
    ]);
  };

  const copyMessage = async (message) => {
    if (message?.text) {
      await Clipboard.setStringAsync(message.text);
      showToast('Copied to clipboard');
    }
  };

  const setSelectedChatAttachment = (asset, fallbackName) => {
    const candidate = {
      uri: asset?.uri,
      name: asset?.name || asset?.fileName || fallbackName,
      type: asset?.mimeType || asset?.type || 'application/octet-stream',
      mimeType: asset?.mimeType || asset?.type || 'application/octet-stream',
      size: Number(asset?.size || asset?.fileSize || 0),
    };
    if (!candidate.uri) return;
    if (!isSafeAttachment(candidate)) {
      Alert.alert('Unsupported attachment', 'Use an image, video, PDF, Office document, or plain text file under 20 MB.');
      return;
    }
    setChatAttachment({ ...candidate, kind: attachmentKind(candidate) });
  };

  const pickChatMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to share photos and videos in this group.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: chatMediaTypes(), quality: 0.82 });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.uri) setSelectedChatAttachment(asset, `group-media-${Date.now()}`);
  };

  const pickChatDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.uri) setSelectedChatAttachment(asset, `group-file-${Date.now()}`);
  };

  const pickPostImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission needed', 'Allow photo library access to add an image to the group feed.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: imageMediaTypes(), quality: 0.82 });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.uri) {
      setPostAttachment({ uri: asset.uri, name: asset.fileName || `group-image-${Date.now()}.jpg`, type: asset.mimeType || 'image/jpeg', kind: 'image' });
    }
  };

  const pickPostFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.uri) {
      setPostAttachment({ uri: asset.uri, name: asset.name || `group-file-${Date.now()}`, type: asset.mimeType || 'application/octet-stream', size: asset.size || 0, kind: 'file' });
    }
  };

  const submitGroupPost = async () => {
    if ((!postDraft.trim() && !postAttachment) || posting || !user || !isMember) return;
    setPosting(true);
    try {
      let attachments = [];
      if (postAttachment) {
        const uploaded = await uploadFeatureMedia(postAttachment, {
          feature: 'groups',
          resourceType: postAttachment.kind === 'image' ? 'image' : 'raw',
        });
        const url = uploaded?.url || uploaded?.secure_url;
        if (!url) throw new Error('Attachment upload failed. Please try again.');
        attachments = [{
          type: postAttachment.kind,
          url,
          key: uploaded?.key || uploaded?.publicId || '',
          name: postAttachment.name,
          mimeType: postAttachment.type,
          size: postAttachment.size || 0,
        }];
      }
      await createGroupPost(groupId, user, profile, { text: postDraft, attachments });
      setPostDraft('');
      setPostAttachment(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Could not publish post', error?.message || 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const togglePostReaction = async (post) => {
    if (!uid || !isMember) return;
    try {
      await reactToGroupPost(groupId, post.id, '👍', uid);
    } catch (error) {
      showToast(error?.message || 'Could not react to that post.');
    }
  };

  const openPostEditor = (post) => {
    if (!post || post.authorId !== uid) return;
    setEditingPost(post);
    setEditPostText(post.text || '');
  };

  const savePostEdit = async () => {
    const text = sanitizeMessageText(editPostText);
    if (!editingPost || savingPostEdit) return;
    if (!text && !(editingPost.attachments || []).length) {
      showToast('Add text or keep an attachment on the post.');
      return;
    }
    setSavingPostEdit(true);
    try {
      await updateGroupPost(groupId, editingPost.id, uid, { text });
      setEditingPost(null);
      setEditPostText('');
      showToast('Post updated');
    } catch (error) {
      showToast(error?.message || 'Unable to update this post.');
    } finally {
      setSavingPostEdit(false);
    }
  };

  const confirmDeletePost = (post) => {
    if (!post || (post.authorId !== uid && !isAdmin)) return;
    Alert.alert('Delete post?', 'This will permanently remove the post and its shared media.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroupPost(groupId, post.id);
            showToast('Post deleted');
          } catch (error) {
            showToast(error?.message || 'Unable to delete this post.');
          }
        },
      },
    ]);
  };

  const openPostActions = (post) => {
    const canEditPost = post?.authorId === uid;
    const canDeletePost = canEditPost || isAdmin;
    if (!canDeletePost) return;
    const options = [];
    if (canEditPost) options.push({ text: 'Edit post', onPress: () => openPostEditor(post) });
    options.push({ text: 'Delete post', style: 'destructive', onPress: () => confirmDeletePost(post) });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Manage post', 'Choose an action for this post.', options);
  };

  /* ------------------------------ Group editing --------------------------- */

  const openEdit = () => {
    if (!group) return;
    setEditName(group.name || '');
    setEditDescription(group.description || '');
    setEditCategory(group.category || 'Academics');
    setEditPrivacy(group.privacy || 'public');
    setEditAllowMemberMessages(group.allowMemberMessages !== false);
    setEditRequireApproval(group.requireApproval !== false);
    setEditWelcomeMessage(group.welcomeMessage || '');
    setEditPhotoUri(null);
    setEditMessage('');
    setGroupOptionsVisible(false);
    setEditVisible(true);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setEditMessageType('error');
      setEditMessage('Photo library permission is needed to change the picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imageMediaTypes(),
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) setEditPhotoUri(result.assets[0].uri);
  };

  const saveEdit = async () => {
    if (!editName.trim()) {
      setEditMessageType('error');
      setEditMessage('Give the group a name.');
      return;
    }
    setSavingEdit(true);
    setEditMessage('');
    const oldPhotoUrl = groupPhotoUrl;
    try {
      const nextPayload = {
        name: editName.trim(),
        description: editDescription.trim(),
        category: editCategory,
        privacy: editPrivacy,
        allowMemberMessages: editAllowMemberMessages,
        requireApproval: editRequireApproval,
        welcomeMessage: editWelcomeMessage.trim(),
      };

      // Upload the new photo FIRST, so a failed upload never leaves the group without a picture.
      if (editPhotoUri) {
        setUploadingPhoto(true);
        const uploaded = await uploadFeatureMedia(
          { uri: editPhotoUri, name: `${editName.trim().replace(/\s+/g, '-').toLowerCase() || 'group'}-photo.jpg`, type: 'image/jpeg' },
          { feature: 'groups', resourceType: 'image' }
        );
        const secureUrl = uploaded?.secure_url || uploaded?.url || '';
        if (!secureUrl) throw new Error('Photo upload failed. Please try again.');
        nextPayload.photoURL = secureUrl;
        setUploadingPhoto(false);
      }

      await updateGroup(groupId, nextPayload);
      // Merge locally instead of re-reading the group, membership and join requests.
      setGroup((g) => ({ ...g, ...nextPayload }));

      // Clean up the old Cloudinary asset only after everything succeeded (non-blocking).
      if (editPhotoUri && oldPhotoUrl && oldPhotoUrl.includes('res.cloudinary.com')) {
        import('../../services/mediaCleanup')
          .then(({ deleteCloudinaryAssets }) => deleteCloudinaryAssets({ urls: [oldPhotoUrl] }))
          .catch((cleanupError) => console.log('Group photo cleanup (non-blocking):', cleanupError?.message));
      }

      setEditMessageType('success');
      setEditMessage('Group updated.');
      clearTimeout(editCloseTimer.current);
      editCloseTimer.current = setTimeout(() => setEditVisible(false), 700);
    } catch (error) {
      setUploadingPhoto(false);
      setEditMessageType('error');
      setEditMessage(error?.message || 'Unable to update group.');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmLeaveGroup = () => {
    setGroupOptionsVisible(false);
    Alert.alert('Leave group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await leaveGroup(group, uid);
            GROUP_CACHE.delete(cacheKey);
            MESSAGE_CACHE.delete(groupId);
            DRAFT_CACHE.delete(groupId);
            router.replace('/groups');
          } catch (error) {
            Alert.alert('Error', error?.message || 'Unable to leave group.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  /* -------------------------------- Rendering ----------------------------- */

  const renderItem = useCallback(
    ({ item }) => {
      if (item.kind === 'date') {
        return (
          <View style={styles.dateDividerWrap}>
            <View style={styles.dateDividerPill}>
              <Text style={styles.dateDividerText}>{item.label}</Text>
            </View>
          </View>
        );
      }
      return (
        <MessageRow
          message={item.message}
          mine={item.mine}
          isFirst={item.isFirst}
          showHeader={item.showHeader}
          groupedNext={item.groupedNext}
          uid={uid}
          isMember={isMember}
          styles={styles}
          colors={colors}
          onLongPress={openActions}
          onSwipeReply={setReplyFromSwipe}
          onToggleReaction={toggleReaction}
          onOpenReactions={openReactionViewer}
          onRetry={retryPending}
          onOpenProfile={openProfile}
          onOpenAttachment={setViewerMedia}
          onVotePoll={votePoll}
          onViewPollVoters={openPollVoters}
          onEditPoll={openPollEditor}
          onTogglePollClosed={togglePollClosed}
          votingPollId={votingPollId}
        />
      );
    },
    [styles, colors, uid, isMember, openActions, setReplyFromSwipe, toggleReaction, openReactionViewer, retryPending, openProfile, votePoll, openPollVoters, openPollEditor, togglePollClosed, votingPollId]
  );

  const renderPostCard = (post) => {
    const attachment = post.attachments?.[0];
    const reacted = post.userReactions?.[uid] === '👍';
    return (
      <View key={post.id} style={styles.postCard}>
        <View style={styles.postAuthor}>
          <View style={styles.postAvatar}>
            {post.authorAvatar ? <Image source={{ uri: post.authorAvatar }} style={styles.postAvatarImage} /> : <Text style={styles.postAvatarText}>{initialsForName(post.authorName)}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.postAuthorName}>{post.authorName || 'Student'}</Text>
            <Text style={styles.postTime}>{formatShortTime(post.createdAt) || 'Just now'}</Text>
          </View>
          {post.authorId === uid || isAdmin ? <Pressable style={styles.postManageButton} onPress={() => openPostActions(post)} accessibilityRole="button" accessibilityLabel="Manage post"><Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} /></Pressable> : null}
        </View>
        {post.text ? <Text style={styles.postText}>{post.text}</Text> : null}
        {post.edited ? <Text style={styles.editedPostLabel}>Edited</Text> : null}
        {attachment?.type === 'image' ? <Image source={{ uri: attachment.url }} style={styles.postImage} resizeMode="cover" /> : null}
        {attachment?.type === 'file' ? (
          <Pressable style={styles.postFile} onPress={() => Linking.openURL(attachment.url)} accessibilityRole="link">
            <Ionicons name="document-text-outline" size={20} color={colors.brand} />
            <Text style={styles.postFileName} numberOfLines={1}>{attachment.name || 'Download file'}</Text>
            <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        <View style={styles.postFooter}>
          <Pressable
            style={[styles.postReaction, reacted && styles.postReactionActive]}
            onPress={() => togglePostReaction(post)}
            onLongPress={() => openReactionViewer(post.userReactions || {}, 'Post reactions')}
            accessibilityRole="button"
            accessibilityLabel={`Like post, ${post.reactionCount || 0} reactions. Long press to see who reacted.`}
          >
            <Text>👍</Text><Text style={styles.postReactionText}>{post.reactionCount || 0}</Text>
          </Pressable>
          <View style={styles.postStat} accessibilityLabel={`${post.viewCount || 0} views`}>
            <Ionicons name="eye-outline" size={15} color={colors.textTertiary} />
            <Text style={styles.postStatText}>{post.viewCount || 0}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWorkspaceTab = () => {
    if (!isMember) return <View style={styles.tabContentInner}><EmptyState title="Join to unlock the group workspace" description="Members can use the feed, chat, directory, media, and files." /></View>;
    if (activeTab === 'Feed') return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner} keyboardShouldPersistTaps="handled">
        <View style={styles.postComposer}>
          <TextInput value={postDraft} onChangeText={setPostDraft} placeholder="Share something with the group" placeholderTextColor={colors.textTertiary} style={styles.postInput} multiline maxLength={2000} />
          {postAttachment ? <Text style={styles.postAttachmentChip} numberOfLines={1}>{postAttachment.kind === 'image' ? 'Image: ' : 'File: '}{postAttachment.name}</Text> : null}
          <View style={styles.postComposerActions}>
            <Pressable style={styles.postMediaButton} onPress={pickPostImage} accessibilityLabel="Add image"><Ionicons name="image-outline" size={19} color={colors.brand} /></Pressable>
            <Pressable style={styles.postMediaButton} onPress={pickPostFile} accessibilityLabel="Add file"><Ionicons name="attach-outline" size={19} color={colors.brand} /></Pressable>
            {postAttachment ? <Pressable onPress={() => setPostAttachment(null)}><Ionicons name="close-circle" size={20} color={colors.textTertiary} /></Pressable> : <View style={{ flex: 1 }} />}
            <Pressable style={[styles.publishButton, posting && { opacity: 0.65 }]} onPress={submitGroupPost} disabled={posting || (!postDraft.trim() && !postAttachment)}>
              {posting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.publishText}>Publish</Text>}
            </Pressable>
          </View>
        </View>
        {posts.length ? posts.map(renderPostCard) : <EmptyState title="No posts yet" description="Start the group feed with an update, image, or file." />}
      </ScrollView>
    );
    if (activeTab === 'Members') return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
        <TextInput value={memberSearch} onChangeText={setMemberSearch} placeholder="Search members" placeholderTextColor={colors.textTertiary} style={styles.memberSearch} accessibilityLabel="Search group members" />
        {members.filter((member) => `${member.name || ''} ${member.email || ''}`.toLowerCase().includes(memberSearch.trim().toLowerCase())).length ? members.filter((member) => `${member.name || ''} ${member.email || ''}`.toLowerCase().includes(memberSearch.trim().toLowerCase())).map((member) => (
          <Pressable key={member.id || member.uid} style={styles.memberRow} onPress={() => openProfile(member.uid)}>
            <View style={styles.memberAvatar}>
              {member.avatar ? <Image source={{ uri: member.avatar }} style={styles.postAvatarImage} /> : <Text style={styles.postAvatarText}>{initialsForName(member.name)}</Text>}
            </View>
            <View>
              <Text style={styles.memberName}>{member.uid === uid ? `${member.name || 'Student'} (You)` : member.name || 'Student'}</Text>
              <Text style={styles.memberRole}>{member.role === 'owner' ? 'Group owner' : member.role === 'admin' ? 'Admin' : member.role === 'moderator' ? 'Moderator' : 'Member'}</Text>
            </View>
          </Pressable>
        )) : <EmptyState title={memberSearch ? 'No matching members' : 'No members found'} description={memberSearch ? 'Try a different name or email.' : 'Members will appear here.'} />}
      </ScrollView>
    );
    if (activeTab === 'Media' || activeTab === 'Files') {
      const availableFilters = activeTab === 'Media' ? ['all', 'image', 'video', 'document', 'link'] : ['document'];
      const items = sharedMedia.filter((item) => activeTab === 'Files' ? item.kind === 'document' : mediaFilter === 'all' || item.kind === mediaFilter);
      return (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
          {activeTab === 'Media' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaFilters}>{availableFilters.map((filter) => <Pressable key={filter} onPress={() => setMediaFilter(filter)} style={[styles.mediaFilter, mediaFilter === filter && styles.mediaFilterActive]}><Text style={[styles.mediaFilterText, mediaFilter === filter && styles.mediaFilterTextActive]}>{filter[0].toUpperCase() + filter.slice(1)}</Text></Pressable>)}</ScrollView> : null}
          {items.length ? <View style={styles.mediaGrid}>{items.map((item) => item.kind === 'image' ? (
            <Pressable key={item.id} style={styles.mediaTile} onPress={() => setViewerMedia(item)} accessibilityRole="imagebutton" accessibilityLabel={`Open ${item.name || 'image'}`}><Image source={{ uri: item.url }} style={styles.mediaTileImage} /><View style={styles.mediaTileOverlay}><Ionicons name="expand-outline" size={20} color="#FFFFFF" /></View></Pressable>
          ) : item.kind === 'video' ? (
            <Pressable key={item.id} style={styles.mediaTile} onPress={() => setViewerMedia(item)} accessibilityRole="button" accessibilityLabel={`Play ${item.name || 'video'}`}><View style={styles.mediaTileDoc}><Ionicons name="play-circle-outline" size={34} color={colors.brand} /><Text style={styles.mediaTileName} numberOfLines={2}>{item.name || 'Video'}</Text></View></Pressable>
          ) : (
            <Pressable key={item.id} style={styles.postFile} onPress={() => setViewerMedia(item)} accessibilityRole="button"><Ionicons name="document-text-outline" size={21} color={colors.brand} /><Text style={styles.postFileName} numberOfLines={1}>{item.name || 'Document'}</Text><Text style={styles.chatAttachmentMeta}>{formatFileSize(item.size)}</Text></Pressable>
          ))}</View> : <EmptyState title={`No ${activeTab.toLowerCase()} yet`} description={`Shared ${activeTab.toLowerCase()} will appear here.`} />}
        </ScrollView>
      );
    }
    return <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}><View style={styles.aboutCard}><Text style={styles.aboutTitle}>About {group.name}</Text><Text style={styles.aboutText}>{group.description || 'No description has been added yet.'}</Text><Text style={styles.aboutText}>{group.privacy === 'private' ? 'Private group — join approval may be required.' : 'Public group — students can join and participate.'}</Text><Text style={styles.aboutText}>{pluralize(Number(group.memberCount || 0), 'member')} · {group.category || 'Community'}</Text></View></ScrollView>;
  };

  const am = activeMessage;
  const activeMine = Boolean(am && uid && am.senderId === uid);
  const activeLocal = Boolean(am?.localStatus);
  const activeFailed = am?.localStatus === 'failed';
  const activeCanModify = activeMine && !am?.deleted && !activeLocal && withinEditWindow(am);
  const canReactActive = Boolean(am && isMember && !am.deleted && !activeLocal);
  const sheetOpt = { styles, colors };

  const requestsCard =
    isAdmin && joinRequests.length ? (
      <View style={styles.requestsCard}>
        <Text style={styles.requestsTitle}>Pending requests ({joinRequests.length})</Text>
        {joinRequests.map((request) => {
          const processing = processingRequestId === request.uid;
          return (
            <View key={request.id || request.uid} style={styles.requestRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestName} numberOfLines={1}>{request.name || 'Student'}</Text>
                <Text style={styles.requestMeta} numberOfLines={1}>{request.email || 'Awaiting review'}</Text>
              </View>
              <View style={styles.requestActions}>
                <Pressable style={[styles.requestApprove, processing && styles.requestButtonDisabled]} onPress={() => handleJoinRequestAction(request, 'approve')} disabled={processing}>
                  {processing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.requestActionText}>Approve</Text>}
                </Pressable>
                <Pressable style={[styles.requestReject, processing && styles.requestButtonDisabled]} onPress={() => handleJoinRequestAction(request, 'reject')} disabled={processing}>
                  <Text style={styles.requestActionText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    ) : null;

  const listHeader = group ? (
    <>
      {requestsCard}

      {!isMember ? (
        <>
          <Pressable style={[styles.joinButton, requestSent && styles.joinButtonMuted]} onPress={join} disabled={busy || requestSent} accessibilityRole="button">
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : requestSent ? (
              <>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.joinText, styles.joinTextMuted]}>Request sent · waiting for approval</Text>
              </>
            ) : (
              <>
                <Ionicons name={group.privacy === 'private' ? 'lock-closed-outline' : 'add-circle-outline'} size={16} color="#fff" />
                <Text style={styles.joinText}>{group.privacy === 'private' ? 'Request access' : 'Join group'}</Text>
              </>
            )}
          </Pressable>
          <EmptyState title="Join to see the conversation" description="Members can read and send messages in this group." />
        </>
      ) : loadingOlderMessages ? (
        <View style={styles.listHeaderLoading}><ActivityIndicator size="small" color={colors.brand} /></View>
      ) : null}
    </>
  ) : null;

  const listEmpty = isMember ? (
    messagesLoading ? (
      <MessageSkeleton styles={styles} />
    ) : loadError ? (
      <View style={styles.centerFill}>
        <EmptyState title="Couldn't load messages" description="Check your connection and try again." />
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setLoadError(false);
            setMessagesLoading(true);
            setReloadKey((key) => key + 1);
          }}
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    ) : (
      <EmptyState
        title="No messages yet"
        description={group?.welcomeMessage?.trim() || (canSendMessages ? 'Say hello to get the conversation started.' : 'Admins will post here.')}
      />
    )
  ) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {group ? (
        <View style={styles.screen}>
          <View style={styles.conversationHeader}>
            <Pressable style={styles.conversationBack} onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={25} color={colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.conversationAvatar} onPress={() => setActiveTab('About')} accessibilityRole="button" accessibilityLabel="View group information">
              {groupPhotoUrl ? <Image source={{ uri: groupPhotoUrl }} style={styles.conversationAvatarImage} /> : <Text style={styles.conversationAvatarText}>{initialsForName(group.name)}</Text>}
            </Pressable>
            <Pressable style={styles.conversationIdentity} onPress={() => setActiveTab('About')} accessibilityRole="button" accessibilityLabel="View group information">
              <Text style={styles.conversationName} numberOfLines={1}>{group.name}</Text>
              <Text style={styles.conversationStatus} numberOfLines={1}>{group.allowMemberMessages === false ? 'Announcements' : `${pluralize(Number(group.memberCount || 0), 'member')} · Group chat`}</Text>
            </Pressable>
            {isAdmin ? (
              <Pressable style={styles.conversationAction} onPress={openEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit group">
                <Ionicons name="create-outline" size={18} color={colors.brand} />
              </Pressable>
            ) : null}
            {isMember ? (
              <Pressable style={styles.conversationAction} onPress={() => setGroupOptionsVisible(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Group options">
                <Ionicons name="ellipsis-vertical" size={19} color={colors.brand} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.flex}>
            {activeTab === 'Chat' && isMember ? null : listHeader}
            <View style={styles.groupTabs}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupTabsContent}>
                {groupTabs.map((tab) => {
                  const active = activeTab === tab.key;
                  return <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.groupTab, active && styles.groupTabActive]} accessibilityRole="tab" accessibilityState={{ selected: active }}><Ionicons name={tab.icon} size={17} color={active ? colors.brand : colors.textSecondary} /><Text style={[styles.groupTabText, active && styles.groupTabTextActive]}>{tab.label}</Text>{tab.count ? <Text style={styles.tabCount}>{tab.count}</Text> : null}</Pressable>;
                })}
              </ScrollView>
            </View>
            {activeTab === 'Chat' ? <>
            <View style={styles.chatArea}>
              <FlatList
                ref={scrollRef}
                style={styles.flex}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                onContentSizeChange={handleContentSizeChange}
                maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                data={listData}
                keyExtractor={(item) => item.key}
                renderItem={renderItem}
                initialNumToRender={20}
                maxToRenderPerBatch={12}
                windowSize={11}
                ListEmptyComponent={listEmpty}
              />

              {showJumpToLatest && isMember ? (
                <Pressable
                  style={styles.jumpButton}
                  onPress={() => {
                    nearBottomRef.current = true;
                    setNewBelow(0);
                    scrollToLatest(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Jump to latest message"
                >
                  <Ionicons name="chevron-down" size={20} color={colors.brand} />
                  {newBelow > 0 ? (
                    <View style={styles.jumpBadge}>
                      <Text style={styles.jumpBadgeText}>{newBelow > 99 ? '99+' : newBelow}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ) : null}

              {toast ? (
                <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
                  <Text style={styles.toastText}>{toast}</Text>
                </Animated.View>
              ) : null}
            </View>

            {isMember ? (
              <View style={styles.composerOuter}>
                {editingMessage ? (
                  <View style={styles.replyPreview}>
                    <View style={[styles.replyPreviewBar, { backgroundColor: colors.brand }]} />
                    <View style={styles.replyPreviewBody}>
                      <Text style={styles.replyPreviewLabel}>Editing message</Text>
                      <Text style={styles.replyPreviewText} numberOfLines={2}>{editingMessage.text || ''}</Text>
                    </View>
                    <Pressable onPress={cancelEditingMessage} hitSlop={8} accessibilityLabel="Cancel editing">
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                ) : replyTo ? (
                  <View style={styles.replyPreview}>
                    <View style={[styles.replyPreviewBar, { backgroundColor: colorForName(replyTo.senderName || 'S') }]} />
                    <View style={styles.replyPreviewBody}>
                      <Text style={styles.replyPreviewLabel}>Replying to {replyTo.senderName || 'Student'}</Text>
                      <Text style={styles.replyPreviewText} numberOfLines={1}>{messagePreview(replyTo)}</Text>
                    </View>
                    <Pressable onPress={() => setReplyTo(null)} hitSlop={8} accessibilityLabel="Cancel reply">
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                ) : null}

                <View style={[styles.composer, { paddingBottom: keyboardVisible ? 10 : Platform.OS === 'ios' ? 24 : 12 }]}>
                  {!canSendMessages ? (
                    <View style={styles.permissionNotice}>
                      <Ionicons name="lock-closed-outline" size={14} color={colors.brandDark} />
                      <Text style={styles.permissionNoticeText}>Only admins can send messages in this group.</Text>
                    </View>
                  ) : (
                    <>
                    {chatAttachment ? (
                      <View style={styles.attachmentPreview}>
                        <View style={styles.attachmentPreviewThumb}>
                          {chatAttachment.kind === 'image' ? <Image source={{ uri: chatAttachment.uri }} style={styles.attachmentPreviewImage} /> : <Ionicons name={chatAttachment.kind === 'video' ? 'videocam-outline' : 'document-text-outline'} size={18} color={colors.brand} />}
                        </View>
                        <Text style={styles.attachmentPreviewName} numberOfLines={1}>{chatAttachment.name}</Text>
                        <Pressable onPress={() => setChatAttachment(null)} accessibilityRole="button" accessibilityLabel="Remove attachment"><Ionicons name="close-circle" size={21} color={colors.textTertiary} /></Pressable>
                      </View>
                    ) : null}
                    <View style={styles.composerInputRow}>
                      <Pressable accessibilityRole="button" accessibilityLabel="Open message tools" style={styles.stickerButton} onPress={() => setComposerToolsVisible(true)} disabled={Boolean(editingMessage) || chatUploading}>
                        <Ionicons name="add" size={24} color={editingMessage || chatUploading ? colors.textTertiary : colors.brand} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open sticker picker"
                        style={styles.stickerButton}
                        onPress={() => setStickerPickerVisible(true)}
                        disabled={Boolean(editingMessage)}
                      >
                        <Ionicons name="happy-outline" size={22} color={editingMessage ? colors.textTertiary : colors.brand} />
                      </Pressable>
                      <View style={[styles.inputPill, editingMessage && styles.inputPillEditing]}>
                        <TextInput
                          ref={inputRef}
                          value={activeText}
                          onChangeText={handleDraftChange}
                          placeholder={editingMessage ? 'Edit your message' : 'Write a message'}
                          placeholderTextColor={colors.textTertiary}
                          style={styles.input}
                          multiline
                          maxLength={MAX_LENGTH}
                          accessibilityLabel="Message input"
                        />
                        {nearLimit ? (
                          <Text style={[styles.counter, activeText.length >= MAX_LENGTH && styles.counterLimit]}>
                            {activeText.length}/{MAX_LENGTH}
                          </Text>
                        ) : null}
                      </View>
                      <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                        <Pressable
                          style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
                          onPress={editingMessage ? saveEditedMessage : send}
                          disabled={!canSubmit}
                          accessibilityRole="button"
                          accessibilityLabel={editingMessage ? 'Save edit' : 'Send message'}
                        >
                          {chatUploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={editingMessage ? 'checkmark' : 'send'} size={18} color="#fff" />}
                        </Pressable>
                      </Animated.View>
                    </View>
                    </>
                  )}
                </View>
              </View>
            ) : null}
            </> : <View style={styles.flex}>{renderWorkspaceTab()}</View>}
          </View>

          <StickerPicker visible={stickerPickerVisible} onClose={() => setStickerPickerVisible(false)} onSelect={sendSticker} />
          <Modal visible={Boolean(viewerMedia)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setViewerMedia(null)}>
            <GroupMediaViewer media={viewerMedia} onClose={() => setViewerMedia(null)} />
          </Modal>
          <Modal visible={composerToolsVisible} transparent animationType="slide" onRequestClose={() => setComposerToolsVisible(false)}>
            <Pressable style={styles.actionSheetBackdrop} onPress={() => setComposerToolsVisible(false)}>
              <Pressable style={styles.composerToolsCard} onPress={(event) => event.stopPropagation()}>
                <View style={styles.actionSheetHandleWrap}><View style={styles.actionSheetHandle} /></View>
                <SheetRow styles={styles} colors={colors} icon="image-outline" label="Photo or video" onPress={() => { setComposerToolsVisible(false); pickChatMedia(); }} />
                <SheetRow styles={styles} colors={colors} icon="document-attach-outline" label="Document" onPress={() => { setComposerToolsVisible(false); pickChatDocument(); }} />
                <SheetRow styles={styles} colors={colors} icon="bar-chart-outline" label="Create poll" onPress={() => { setComposerToolsVisible(false); openPollEditor(); }} />
              </Pressable>
            </Pressable>
          </Modal>
          <Modal visible={Boolean(editingPost)} transparent animationType="fade" onRequestClose={() => setEditingPost(null)}>
            <Pressable style={styles.actionSheetBackdrop} onPress={() => setEditingPost(null)}>
              <Pressable style={styles.actionSheetCard} onPress={(event) => event.stopPropagation()}>
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Edit post</Text>
                <TextInput value={editPostText} onChangeText={setEditPostText} style={[styles.fieldInput, styles.fieldTextArea]} multiline maxLength={2000} placeholder="Share an update" placeholderTextColor={colors.textTertiary} accessibilityLabel="Edit group post" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable style={[styles.saveButton, { flex: 1, backgroundColor: colors.surfaceSecondary }]} onPress={() => setEditingPost(null)}><Text style={[styles.saveButtonText, { color: colors.textPrimary }]}>Cancel</Text></Pressable>
                  <Pressable style={[styles.saveButton, { flex: 1 }, savingPostEdit && styles.saveButtonDisabled]} onPress={savePostEdit} disabled={savingPostEdit}>{savingPostEdit ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save</Text>}</Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
          <Modal visible={pollVisible} transparent animationType="fade" onRequestClose={() => setPollVisible(false)}>
            <Pressable style={styles.actionSheetBackdrop} onPress={() => setPollVisible(false)}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Pressable style={[styles.actionSheetCard, styles.pollEditorCard]} onPress={(event) => event.stopPropagation()}>
                  <View style={styles.actionSheetHandleWrap}><View style={styles.actionSheetHandle} /></View>
                  <ScrollView style={styles.pollEditorScroll} contentContainerStyle={styles.pollEditorContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Text style={{ color: colors.textPrimary, fontSize: 19, fontWeight: '800' }}>{pollEditing ? 'Edit poll' : 'Create poll'}</Text>
                    <Text style={styles.pollEditorSubtitle}>{pollEditing ? 'Update the question or manage your poll.' : 'Ask your group and let everyone vote.'}</Text>
                    {pollHasVotes ? <View style={styles.pollLockedNotice}><Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} /><Text style={styles.pollLockedNoticeText}>Voting has started, so options and answer mode are locked. You can still edit the question.</Text></View> : null}
                    <TextInput value={pollQuestion} onChangeText={setPollQuestion} style={[styles.fieldInput, { marginBottom: 0 }]} placeholder="Ask a question" placeholderTextColor={colors.textTertiary} maxLength={200} accessibilityLabel="Poll question" />
                    {pollOptions.map((option, index) => (
                      <View key={index} style={styles.pollOptionField}>
                        <TextInput value={option} editable={!pollHasVotes} onChangeText={(value) => setPollOptions((items) => items.map((item, i) => i === index ? value : item))} style={[styles.fieldInput, styles.pollOptionInput, pollHasVotes && { opacity: 0.62 }]} placeholder={`Option ${index + 1}`} placeholderTextColor={colors.textTertiary} maxLength={120} accessibilityLabel={`Poll option ${index + 1}`} />
                        {pollOptions.length > 2 && !pollHasVotes ? <Pressable onPress={() => setPollOptions((items) => items.filter((_, i) => i !== index))} style={styles.pollRemoveOption} accessibilityRole="button" accessibilityLabel={`Remove option ${index + 1}`}><Ionicons name="close" size={18} color={colors.danger} /></Pressable> : null}
                      </View>
                    ))}
                    {pollOptions.length < 6 && !pollHasVotes ? <Pressable onPress={() => setPollOptions((items) => [...items, ''])} style={styles.pollAddOption} accessibilityRole="button"><Ionicons name="add" size={18} color={colors.brand} /><Text style={styles.pollAddOptionText}>Add option</Text></Pressable> : null}
                    <Pressable disabled={pollHasVotes} onPress={() => setPollMultiSelect((value) => !value)} style={[styles.pollMode, pollHasVotes && { opacity: 0.62 }]} accessibilityRole="checkbox" accessibilityState={{ checked: pollMultiSelect, disabled: pollHasVotes }} accessibilityLabel="Allow multiple answers">
                      <View style={styles.pollModeCopy}><Text style={styles.pollModeTitle}>Allow multiple answers</Text><Text style={styles.pollModeHint}>Members can choose more than one option.</Text></View>
                      <Ionicons name={pollMultiSelect ? 'checkbox' : 'square-outline'} size={24} color={colors.brand} />
                    </Pressable>
                    <Pressable style={[styles.saveButton, !canSubmitPoll && styles.saveButtonDisabled]} onPress={submitPoll} disabled={!canSubmitPoll} accessibilityRole="button">
                      {pollSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{pollEditing ? 'Save changes' : 'Post poll'}</Text>}
                    </Pressable>
                  </ScrollView>
                </Pressable>
              </KeyboardAvoidingView>
            </Pressable>
          </Modal>
        </View>
      ) : (
        <View style={styles.centerFill}>
          {loading ? <ActivityIndicator size="large" color={colors.brand} /> : <EmptyState title="Group not found" description="This group may have been deleted or is unavailable." />}
        </View>
      )}

      <Modal visible={Boolean(reactionViewer)} transparent animationType="fade" onRequestClose={() => setReactionViewer(null)}>
        <Pressable style={styles.actionSheetBackdrop} onPress={() => setReactionViewer(null)}>
          <Pressable style={styles.reactionViewerCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.actionSheetHandleWrap}>
              <View style={styles.actionSheetHandle} />
            </View>
            <Text style={styles.reactionViewerTitle}>{reactionViewer?.title || 'Reactions'} · {reactionPeople.length}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {reactionPeople.map((person) => (
                <Pressable key={person.id} style={styles.reactorRow} onPress={() => { setReactionViewer(null); openProfile(person.id); }} accessibilityRole="button" accessibilityLabel={`Open ${person.name}'s profile`}>
                  <View style={styles.reactorAvatar}>
                    {person.avatar ? <Image source={{ uri: person.avatar }} style={styles.reactorAvatarImage} /> : <Text style={styles.reactorAvatarText}>{initialsForName(person.name)}</Text>}
                  </View>
                  <Text style={styles.reactorName} numberOfLines={1}>{person.id === uid ? 'You' : person.name}</Text>
                  <Text style={styles.reactorEmojis}>{person.emojis.join(' ')}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(pollVoterViewer)} transparent animationType="fade" onRequestClose={() => setPollVoterViewer(null)}>
        <Pressable style={styles.actionSheetBackdrop} onPress={() => setPollVoterViewer(null)}>
          <Pressable style={styles.reactionViewerCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.actionSheetHandleWrap}>
              <View style={styles.actionSheetHandle} />
            </View>
            <Text style={styles.reactionViewerTitle} numberOfLines={1}>{pollVoterViewer?.optionText || 'Option'} · {pollVoterPeople.length} vote{pollVoterPeople.length === 1 ? '' : 's'}</Text>
            {pollVoterPeople.length ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {pollVoterPeople.map((person) => (
                  <Pressable key={person.id} style={styles.reactorRow} onPress={() => { setPollVoterViewer(null); openProfile(person.id); }} accessibilityRole="button" accessibilityLabel={`Open ${person.name}'s profile`}>
                    <View style={styles.reactorAvatar}>
                      {person.avatar ? <Image source={{ uri: person.avatar }} style={styles.reactorAvatarImage} /> : <Text style={styles.reactorAvatarText}>{initialsForName(person.name)}</Text>}
                    </View>
                    <Text style={styles.reactorName} numberOfLines={1}>{person.name}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : <Text style={[styles.pollMeta, { textAlign: 'center', paddingVertical: 18 }]}>No one has voted for this option yet.</Text>}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Message actions: reactions + actions, opened with a long-press */}
      <Modal visible={Boolean(activeMessage)} transparent animationType="fade" onRequestClose={() => setActiveMessage(null)}>
        <Pressable style={styles.actionSheetBackdrop} onPress={() => setActiveMessage(null)}>
          <Animated.View
            style={[styles.actionSheetCard, { transform: [{ translateY: messageActionsSheet.translateY }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.actionSheetHandleWrap} {...messageActionsSheet.panHandlers}>
              <View style={styles.actionSheetHandle} />
            </View>

            {canReactActive ? (
              <View style={styles.sheetReactions}>
                {QUICK_REACTIONS.map((emoji) => {
                  const active = Boolean(uid && Array.isArray(am?.reactions?.[emoji]) && am.reactions[emoji].includes(uid));
                  return (
                    <Pressable
                      key={emoji}
                      style={[styles.sheetReactionBtn, active && styles.sheetReactionBtnActive]}
                      onPress={() => {
                        const target = am;
                        setActiveMessage(null);
                        toggleReaction(target, emoji);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`React with ${emoji}`}
                    >
                      <Text style={styles.sheetReactionEmoji}>{emoji}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {am ? <Text style={styles.sheetPreview} numberOfLines={2}>{messagePreview(am)}</Text> : null}

            {activeFailed ? (
              <>
                <SheetRow {...sheetOpt} icon="refresh" label="Retry sending" onPress={() => { const m = am; setActiveMessage(null); retryPending(m); }} />
                <SheetRow {...sheetOpt} icon="trash-outline" label="Discard message" danger onPress={() => { discardPending(am); setActiveMessage(null); }} />
              </>
            ) : am && !am.deleted && !activeLocal ? (
              <>
                {isMember ? (
                  <SheetRow
                    {...sheetOpt}
                    icon="arrow-undo-outline"
                    label="Reply"
                    onPress={() => {
                      setEditingMessage(null);
                      setReplyTo(am);
                      setActiveMessage(null);
                      setTimeout(() => inputRef.current?.focus(), 200);
                    }}
                  />
                ) : null}
                {am.text ? <SheetRow {...sheetOpt} icon="copy-outline" label="Copy text" onPress={() => { const m = am; setActiveMessage(null); copyMessage(m); }} /> : null}
                {am.senderName && canSendMessages && !activeMine ? (
                  <SheetRow {...sheetOpt} icon="at-outline" label={`Tag ${am.senderName}`} onPress={() => { insertMention(am.senderName); setActiveMessage(null); }} />
                ) : null}
                {am.senderId && !activeMine ? (
                  <SheetRow {...sheetOpt} icon="chatbubble-ellipses-outline" label="Message privately" onPress={() => { const m = am; setActiveMessage(null); openDm(m); }} />
                ) : null}
                {activeCanModify && am.type !== 'sticker' ? (
                  <SheetRow {...sheetOpt} icon="create-outline" label="Edit message" onPress={() => startEditingMessage(am)} />
                ) : null}
                {activeCanModify ? (
                  <SheetRow {...sheetOpt} icon="trash-outline" label="Delete message" danger onPress={() => { const m = am; setActiveMessage(null); removeGroupMessage(m); }} />
                ) : null}
              </>
            ) : null}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Group options */}
      <Modal visible={groupOptionsVisible} transparent animationType="slide" onRequestClose={() => setGroupOptionsVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setGroupOptionsVisible(false)} />
        <View style={styles.sheetWrap}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: groupOptionsSheet.translateY }] }]}>
            <View style={styles.sheetHandleWrap} {...groupOptionsSheet.panHandlers}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.groupOptionsPreview}>
              <View style={styles.groupOptionsAvatar}>
                {groupPhotoUrl ? <Image source={{ uri: groupPhotoUrl }} style={styles.groupOptionsAvatarImage} /> : <Text style={styles.groupOptionsAvatarText}>{initialsForName(group?.name)}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupOptionsName} numberOfLines={1}>{group?.name}</Text>
                <Text style={styles.groupOptionsMeta}>{pluralize(Number(group?.memberCount || 0), 'member')}</Text>
              </View>
            </View>

            {[
              { icon: 'mail-outline', label: 'Open messages', onPress: () => { setGroupOptionsVisible(false); router.navigate('/messages'); } },
              { icon: 'settings-outline', label: isAdmin ? 'Members and settings' : 'Group settings', onPress: () => { setGroupOptionsVisible(false); router.navigate({ pathname: '/community-settings', params: { groupId } }); } },
              ...(isAdmin ? [{ icon: 'create-outline', label: 'Edit group details', onPress: openEdit }] : []),
              ...(membership && !isAdmin ? [{ icon: 'exit-outline', label: 'Leave group', danger: true, onPress: confirmLeaveGroup, disabled: busy }] : []),
            ].map((row) => (
              <Pressable key={row.label} style={styles.linkCard} onPress={row.onPress} disabled={row.disabled} accessibilityRole="button" accessibilityLabel={row.label}>
                <View style={[styles.linkIconWrap, row.danger && styles.dangerIconWrap]}>
                  <Ionicons name={row.icon} size={16} color={row.danger ? colors.danger : colors.brand} />
                </View>
                <Text style={[styles.linkText, row.danger && styles.dangerLinkText]}>{row.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </Animated.View>
        </View>
      </Modal>

      {/* Admin: manage group */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setEditVisible(false)} />
        <KeyboardAvoidingView behavior="padding" style={styles.sheetWrap}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: editSheet.translateY }] }]}>
            <View style={styles.sheetHandleWrap} {...editSheet.panHandlers}>
              <View style={styles.sheetHandle} />
            </View>
            <Text style={styles.sheetTitle}>Manage group</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Pressable style={styles.photoPicker} onPress={pickPhoto}>
                <View style={styles.photoCircle}>
                  {editPhotoUri ? (
                    <Image source={{ uri: editPhotoUri }} style={styles.photoImage} />
                  ) : groupPhotoUrl ? (
                    <Image source={{ uri: groupPhotoUrl }} style={styles.photoImage} />
                  ) : (
                    <Text style={styles.photoInitials}>{initialsForName(editName || group?.name)}</Text>
                  )}
                  <View style={styles.photoCameraBadge}>
                    <Ionicons name="camera" size={13} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.photoHint}>{editPhotoUri ? 'New photo selected' : 'Change group photo'}</Text>
              </Pressable>

              <Text style={styles.fieldLabel}>Group name</Text>
              <TextInput value={editName} onChangeText={setEditName} style={styles.fieldInput} placeholder="Group name" placeholderTextColor={colors.textTertiary} />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput value={editDescription} onChangeText={setEditDescription} style={[styles.fieldInput, styles.fieldTextArea]} placeholder="What's this group for?" placeholderTextColor={colors.textTertiary} multiline />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((option) => {
                  const active = option === editCategory;
                  return (
                    <Pressable key={option} style={[styles.chip, active && styles.chipActive]} onPress={() => setEditCategory(option)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Messaging permission</Text>
              <Segmented
                styles={styles}
                colors={colors}
                value={editAllowMemberMessages}
                onChange={setEditAllowMemberMessages}
                options={[
                  { value: true, label: 'Members can post', icon: 'chatbubble-outline' },
                  { value: false, label: 'Admins only', icon: 'lock-closed-outline' },
                ]}
              />

              <Text style={styles.fieldLabel}>Join approval</Text>
              <Segmented
                styles={styles}
                colors={colors}
                value={editRequireApproval}
                onChange={setEditRequireApproval}
                options={[
                  { value: true, label: 'Admin approval', icon: 'shield-checkmark-outline' },
                  { value: false, label: 'Auto-join', icon: 'flash-outline' },
                ]}
              />

              <Text style={styles.fieldLabel}>Welcome message</Text>
              <TextInput value={editWelcomeMessage} onChangeText={setEditWelcomeMessage} style={[styles.fieldInput, styles.fieldTextArea]} placeholder="Optional welcome note for new members" placeholderTextColor={colors.textTertiary} multiline />

              <Text style={styles.fieldLabel}>Privacy</Text>
              <Segmented
                styles={styles}
                colors={colors}
                value={editPrivacy}
                onChange={setEditPrivacy}
                options={[
                  { value: 'public', label: 'Public', icon: 'globe-outline' },
                  { value: 'private', label: 'Private', icon: 'lock-closed-outline' },
                ]}
              />

              {editMessage ? (
                <View style={[styles.editMessageBox, editMessageType === 'error' ? styles.editMessageError : styles.editMessageSuccess]}>
                  <Ionicons name={editMessageType === 'error' ? 'alert-circle' : 'checkmark-circle'} size={15} color={editMessageType === 'error' ? colors.danger : colors.teal} />
                  <Text style={{ color: editMessageType === 'error' ? colors.danger : colors.teal, fontSize: 12.5, flex: 1 }}>{editMessage}</Text>
                </View>
              ) : null}

              <Pressable style={[styles.saveButton, savingEdit && styles.saveButtonDisabled]} onPress={saveEdit} disabled={savingEdit}>
                {savingEdit ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#fff" />
                    {uploadingPhoto ? <Text style={styles.saveButtonText}>Uploading photo…</Text> : null}
                  </View>
                ) : (
                  <Text style={styles.saveButtonText}>Save changes</Text>
                )}
              </Pressable>

              <Pressable style={styles.cancelRow} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
