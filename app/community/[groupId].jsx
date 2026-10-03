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
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import StickerPicker from '../../src/shared/components/StickerPicker';
import StickerMessage from '../../src/shared/components/StickerMessage';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { useAuth } from '../../context/AuthContext';
import {
  approveGroupJoinRequest,
  formatShortTime,
  getGroup,
  getMembership,
  joinPublicGroup,
  leaveGroup,
  listGroupJoinRequests,
  listenGroupMessages,
  loadOlderGroupMessages,
  loadRecentGroupMessages,
  MESSAGE_PAGE_SIZE,
  rejectGroupJoinRequest,
  requestJoinGroup,
  sendGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,
  startConversation,
  toggleMessageReaction,
  updateGroup,
} from '../../src/shared/services/community';
import { uploadToCloudinary } from '../../services/cloudinary';

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

// In-memory caches: re-entering a group within the TTL costs zero reads for the
// group doc, membership, join requests and the message page.
const GROUP_CACHE_TTL_MS = 2 * 60 * 1000;
const MESSAGE_CACHE_TTL_MS = 20 * 1000;
const MESSAGE_CACHE_MAX = 300;
const CACHE_MAX_ENTRIES = 12;
const GROUP_CACHE = new Map();
const MESSAGE_CACHE = new Map();
const DRAFT_CACHE = new Map();

const putCache = (map, key, value) => {
  if (!key) return;
  map.delete(key);
  map.set(key, value);
  while (map.size > CACHE_MAX_ENTRIES) map.delete(map.keys().next().value);
};

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

const isSameMessage = (a, b) =>
  a.text === b.text &&
  a.deleted === b.deleted &&
  a.edited === b.edited &&
  a.type === b.type &&
  a.senderName === b.senderName &&
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
  return !sm || Math.abs(sm - getMillis(pending)) < 3 * 60 * 1000;
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
  chatArea: { flex: 1 },
  composerOuter: { backgroundColor: c.surface, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.borderDefault },
  chatContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },

  jumpButton: { position: 'absolute', right: 14, bottom: 12, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderDefault, shadowColor: c.shadow || '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  jumpBadge: { position: 'absolute', top: -6, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  jumpBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  toast: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: c.textPrimary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '90%', zIndex: 30 },
  toastText: { color: c.surface, fontSize: 13, fontWeight: '700' },

  compactHero: { backgroundColor: c.surface, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: c.borderDefault },
  heroActionsRowInline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  heroIconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  heroAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  heroAvatarImage: { width: 44, height: 44 },
  heroAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  heroTextWrap: { flex: 1, justifyContent: 'center', paddingRight: 8 },
  heroTitle: { color: c.textPrimary, fontSize: 15.5, fontWeight: '800', marginBottom: 2 },
  heroText: { color: c.textSecondary, fontSize: 12 },
  heroDescription: { color: c.textTertiary, fontSize: 12, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault },

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

  dateDividerWrap: { alignItems: 'center', marginVertical: 10 },
  dateDividerPill: { backgroundColor: c.surfaceSecondary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  dateDividerText: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },

  row: { flexDirection: 'row', marginBottom: 3, maxWidth: '100%' },
  rowEnd: { marginBottom: 10 },
  rowTheirs: { justifyContent: 'flex-start' },
  rowMine: { justifyContent: 'flex-end' },
  swipeReplyIconTheirs: { position: 'absolute', left: 38, top: '50%', marginTop: -12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  swipeReplyIconMine: { position: 'absolute', right: 2, top: '50%', marginTop: -12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  avatarSlot: { width: 30, alignItems: 'center', marginRight: 6, justifyContent: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 28, height: 28 },
  avatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  bubbleColumn: { maxWidth: '78%' },
  pendingDim: { opacity: 0.6 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, shadowColor: c.shadow || '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 1, elevation: 1 },
  bubbleFailed: { borderWidth: 1, borderColor: c.danger },
  bubbleAdmin: { borderWidth: 2, borderColor: '#F5B301' },
  bubblePremium: { borderWidth: 1, borderColor: '#8A2BE2' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
  roleBadgeAdmin: { backgroundColor: '#F5B301' },
  roleBadgePremium: { backgroundColor: '#8A2BE2' },
  roleBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  bubbleTheirs: { backgroundColor: c.surfacePrimary, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: c.borderDefault },
  bubbleTheirsNoTail: { borderBottomLeftRadius: 20 },
  bubbleMine: { backgroundColor: c.brand, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 4 },
  bubbleMineNoTail: { borderBottomRightRadius: 20 },
  bubbleSticker: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 2, paddingVertical: 2, shadowOpacity: 0, elevation: 0 },
  messageAuthor: { fontWeight: '800', fontSize: 12, marginBottom: 2 },
  messageBody: { color: c.inkLight, fontSize: 15, lineHeight: 21 },
  messageBodyMine: { color: '#FFFFFF' },
  messageDeleted: { fontStyle: 'italic', opacity: 0.75 },
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

  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5, marginLeft: 2 },
  reactionsRowMine: { justifyContent: 'flex-end', marginLeft: 0, marginRight: 2 },
  reactionPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  reactionPillActive: { backgroundColor: c.brandLight, borderColor: c.brand },
  reactionEmoji: { fontSize: 12.5 },
  reactionCount: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
  reactionCountActive: { color: c.brandDark },

  actionSheetBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  actionSheetCard: { backgroundColor: c.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 24 },
  actionSheetHandleWrap: { paddingVertical: 10, alignItems: 'center' },
  actionSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderDefault },
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

// Memoised: typing in the composer no longer re-renders every bubble.
const MessageRow = React.memo(function MessageRow({
  message,
  mine,
  showHeader,
  groupedNext,
  uid,
  isMember,
  styles,
  colors,
  onLongPress,
  onSwipeReply,
  onToggleReaction,
  onRetry,
  onOpenProfile,
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
  const isAdminSender = message.senderRole === 'admin';

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

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs, !groupedNext && styles.rowEnd]} {...panResponder.panHandlers}>
      <Animated.View pointerEvents="none" style={[mine ? styles.swipeReplyIconMine : styles.swipeReplyIconTheirs, { opacity: replyIconOpacity }]}>
        <Ionicons name="arrow-undo" size={18} color={colors.brand} />
      </Animated.View>

      {!mine ? (
        <Pressable style={styles.avatarSlot} onPress={() => message.senderId && onOpenProfile(message.senderId)} disabled={!message.senderId}>
          {showHeader ? (
            <View style={[styles.avatar, { backgroundColor: senderColor }]}>
              {message.senderAvatar ? (
                <Image source={{ uri: message.senderAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initialsForName(message.senderName || 'S')}</Text>
              )}
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <Animated.View style={[styles.bubbleColumn, { transform: [{ translateX: swipeX }, { scale: scaleAnim }] }]}>
        <Pressable
          onLongPress={() => onLongPress(message)}
          onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 4 }).start()}
          onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start()}
          delayLongPress={250}
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            groupedNext && (mine ? styles.bubbleMineNoTail : styles.bubbleTheirsNoTail),
            isSticker && styles.bubbleSticker,
            failed && styles.bubbleFailed,
            sending && styles.pendingDim,
            !isSticker && isAdminSender && styles.bubbleAdmin,
            !isSticker && !isAdminSender && message.senderPremium && styles.bubblePremium,
          ]}
        >
          {showHeader ? <Text style={[styles.messageAuthor, { color: senderColor }]}>{message.senderName || 'Student'}</Text> : null}
          {isAdminSender || message.senderPremium ? (
            <View style={[styles.roleBadge, isAdminSender ? styles.roleBadgeAdmin : styles.roleBadgePremium]}>
              <Text style={[styles.roleBadgeText, { color: isAdminSender ? '#000' : '#FFF' }]}>{isAdminSender ? 'ADMIN' : 'PREMIUM'}</Text>
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
          ) : (
            <Text style={[styles.messageBody, mine && styles.messageBodyMine]}>
              {message.text ? renderLinkedText(message.text, mine, colors) : '📎 Attachment'}
            </Text>
          )}

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
                  hitSlop={4}
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
  const [requestSent, setRequestSent] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [draft, setDraft] = useState(() => DRAFT_CACHE.get(groupId) || '');
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [toast, setToast] = useState('');

  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
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
  const editCloseTimer = useRef(null);
  const toastTimer = useRef(null);
  const scrollTimer = useRef(null);
  const handleScrollRef = useRef(null);
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
  const canSubmit = Boolean(activeText.trim()) && canSendMessages;
  const nearLimit = activeText.length > MAX_LENGTH * 0.85;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Messages shown = server messages + optimistic ones that the server hasn't echoed back yet.
  const displayMessages = useMemo(() => {
    if (!pending.length) return messages;
    const live = pending.filter((p) => !messages.some((m) => matchesPending(p, m)));
    return live.length ? sortMessages([...messages, ...live]) : messages;
  }, [messages, pending]);

  // Drop optimistic copies once the real message has arrived.
  useEffect(() => {
    if (!pending.length) return;
    const stale = pending.filter((p) => messages.some((m) => matchesPending(p, m)));
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
      out.push({
        kind: 'message',
        key: message.id,
        message,
        mine,
        showHeader: !mine && !inSameGroup(displayMessages[index - 1], message),
        groupedNext: inSameGroup(message, displayMessages[index + 1]),
      });
    });
    return out;
  }, [displayMessages, isMember, uid]);

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
      const cached = GROUP_CACHE.get(cacheKey);
      if (!force && cached && Date.now() - cached.ts < GROUP_CACHE_TTL_MS) return;
      const [groupData, memberData] = await Promise.all([getGroup(groupId), getMembership(groupId, uid)]);
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
      setTimeout(() => {
        loadingOlderRef.current = false;
      }, 350);
    }
  }, [groupId, hasMoreMessages, isMember, messageCursor]);

  // Initial page + live listener. With a fresh cache the initial page read is skipped entirely
  // and a stale cache is only used if the new page overlaps it (otherwise it is rebuilt).
  useEffect(() => {
    if (!groupId || !isMember) return undefined;
    let cancelled = false;

    const init = async () => {
      try {
        const result = await loadRecentGroupMessages(groupId, MESSAGE_PAGE_SIZE);
        if (cancelled) return;
        const next = Array.isArray(result?.messages) ? result.messages : [];
        syncedAtRef.current = Date.now();
        const current = messagesRef.current;
        const known = new Set(current.map((m) => m.id));
        const gap = current.length > 0 && next.length > 0 && !next.some((m) => known.has(m.id));
        if (!current.length || gap) {
          setMessages(mergeMessages([], next));
          setMessageCursor(result?.cursor || null);
          setHasMoreMessages(Boolean(result?.hasMore));
        } else {
          setMessages((prev) => mergeMessages(prev, next));
        }
        setLoadError(false);
      } catch (error) {
        console.log('Failed to load group messages', error);
        if (!cancelled && !messagesRef.current.length) setLoadError(true);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };

    const fresh = reloadKey === 0 && syncedAtRef.current && Date.now() - syncedAtRef.current < MESSAGE_CACHE_TTL_MS;
    if (fresh) setMessagesLoading(false);
    else init();

    const unsubscribe = listenGroupMessages(groupId, (incoming) => {
      syncedAtRef.current = Date.now();
      setMessagesLoading(false);
      setMessages((prev) => mergeMessages(prev, Array.isArray(incoming) ? incoming : []));
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
    if (!groupId || !uid || !requestUserId) return;
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

  const buildLocal = (fields, payload) => {
    const localId = createLocalId();
    return {
      id: localId,
      localId,
      localStatus: 'sending',
      senderId: uid,
      senderName: profile?.name || user?.displayName || 'Student',
      senderAvatar: profile?.photo || profile?.avatar || user?.photoURL || '',
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
      showToast(error?.message || "Message not sent. Tap it to retry.");
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

  const send = () => {
    const text = draft.trim();
    if (!text || !group || !isMember || !canSendMessages) return;
    const replyPayload = buildReplyPayload();
    setDraft('');
    DRAFT_CACHE.delete(groupId);
    queueMessage({ type: 'text', text, attachments: [] }, { text, attachments: [], replyTo: replyPayload });
  };

  const sendSticker = (sticker) => {
    if (!sticker || !group || !user || !isMember || !canSendMessages) return;
    const replyPayload = buildReplyPayload();
    const stickerFields = { id: sticker.id, type: sticker.type, assetUrl: sticker.assetUrl, thumbnailUrl: sticker.thumbnailUrl, name: sticker.name };
    queueMessage(
      { type: 'sticker', stickerId: sticker.id, sticker: stickerFields },
      { type: 'sticker', stickerId: sticker.id, sticker: stickerFields, replyTo: replyPayload && { ...replyPayload, text: replyPayload.text || 'Sticker' } }
    );
  };

  const retryPending = useCallback((message) => {
    if (message?.localStatus !== 'failed') return;
    deliver(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, user, profile]);

  const discardPending = (message) => setPending((prev) => prev.filter((p) => p.localId !== message.localId));

  const handleDraftChange = (text) => {
    if (editingMessage) {
      setEditText(text);
      return;
    }
    setDraft(text);
    if (text) DRAFT_CACHE.set(groupId, text);
    else DRAFT_CACHE.delete(groupId);
  };

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

  // Optimistic reaction: the pill shows instantly; toggling again restores the old state on failure.
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        const uploaded = await uploadToCloudinary(
          { uri: editPhotoUri, name: `${editName.trim().replace(/\s+/g, '-').toLowerCase() || 'group'}-photo.jpg`, type: 'image/jpeg' },
          { resourceType: 'image', validationKind: 'image' }
        );
        nextPayload.photoURL = uploaded?.secure_url || null;
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
            router.replace('/community');
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
          showHeader={item.showHeader}
          groupedNext={item.groupedNext}
          uid={uid}
          isMember={isMember}
          styles={styles}
          colors={colors}
          onLongPress={openActions}
          onSwipeReply={setReplyFromSwipe}
          onToggleReaction={toggleReaction}
          onRetry={retryPending}
          onOpenProfile={openProfile}
        />
      );
    },
    [styles, colors, uid, isMember, openActions, setReplyFromSwipe, toggleReaction, retryPending, openProfile]
  );

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
      <View style={styles.compactHero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroAvatar}>
            {groupPhotoUrl ? <Image source={{ uri: groupPhotoUrl }} style={styles.heroAvatarImage} /> : <Text style={styles.heroAvatarText}>{initialsForName(group.name)}</Text>}
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.heroText} numberOfLines={1}>
              {group.privacy === 'private' ? 'Private • ' : ''}
              {pluralize(Number(group.memberCount || 0), 'member')}
            </Text>
          </View>
          <View style={styles.heroActionsRowInline}>
            {isAdmin ? (
              <Pressable style={styles.heroIconButton} onPress={openEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit group">
                <Ionicons name="create-outline" size={18} color={colors.brand} />
              </Pressable>
            ) : null}
            {isMember ? (
              <Pressable style={styles.heroIconButton} onPress={() => setGroupOptionsVisible(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Group options">
                <Ionicons name="ellipsis-vertical" size={18} color={colors.brand} />
              </Pressable>
            ) : null}
          </View>
        </View>
        {group.description ? <Text style={styles.heroDescription} numberOfLines={2}>{group.description}</Text> : null}
      </View>

      {requestsCard}

      {!isMember ? (
        <>
          <Pressable style={[styles.joinButton, requestSent && styles.joinButtonMuted]} onPress={join} disabled={busy || requestSent}>
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
      <EmptyState title="No messages yet" description="Start the conversation when you are ready." />
    )
  ) : null;

  return (
    <ScreenShell title="Group" subtitle={group?.name || groupId} showBack loading={loading} scrollable={false} headerScrollY={scrollY}>
      {group ? (
        <View style={styles.screen}>
          <View style={styles.flex}>
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
                windowSize={11}
                ListHeaderComponent={listHeader}
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
                    <View style={styles.composerInputRow}>
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
                          <Ionicons name={editingMessage ? 'checkmark' : 'send'} size={18} color="#fff" />
                        </Pressable>
                      </Animated.View>
                    </View>
                  )}
                </View>
              </View>
            ) : null}
          </View>

          <StickerPicker visible={stickerPickerVisible} onClose={() => setStickerPickerVisible(false)} onSelect={sendSticker} />
        </View>
      ) : (
        <EmptyState title="Group not found" description="This group may have been deleted or is unavailable." />
      )}

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
              { icon: 'settings-outline', label: 'Group settings', onPress: () => { setGroupOptionsVisible(false); router.navigate({ pathname: '/community-settings', params: { groupId } }); } },
              ...(isAdmin ? [{ icon: 'create-outline', label: 'Manage this group', onPress: openEdit }] : []),
              ...(isAdmin ? [{ icon: 'person-remove-outline', label: 'Remove member', danger: true, onPress: () => { setGroupOptionsVisible(false); router.navigate({ pathname: '/community-settings', params: { groupId } }); } }] : []),
              ...(membership && !isAdmin ? [{ icon: 'exit-outline', label: 'Leave group', danger: true, onPress: confirmLeaveGroup, disabled: busy }] : []),
            ].map((row) => (
              <Pressable key={row.label} style={styles.linkCard} onPress={row.onPress} disabled={row.disabled}>
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
    </ScreenShell>
  );
}