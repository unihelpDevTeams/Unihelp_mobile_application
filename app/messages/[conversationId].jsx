import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  AccessibilityInfo,
  Easing,
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
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import VoiceMessageBubble from '../../src/shared/components/VoiceMessageBubble';
import VoiceRecorderBar from '../../src/shared/components/VoiceRecorderBar';
import StickerPicker from '../../src/shared/components/StickerPicker';
import StickerMessage from '../../src/shared/components/StickerMessage';
import FriendRequestModal from '../../src/shared/components/FriendRequestModal';
import { fetchRecord } from '../../services/firestoreSync';
import {
  markConversationRead,
  sendDirectMessage,
  deleteDirectMessage,
  updateDirectMessage,
  clearConversationForUser,
  deleteConversationForUser,
  toggleDirectMessageReaction,
} from '../../src/shared/services/community';
import {
  RELATIONSHIP,
  acceptFriendRequest,
  acceptMessageRequest,
  blockStudent,
  declineMessageRequest,
  listenIncomingMessageRequests,
  listenRelationship,
  sendFriendRequest,
  unblockStudent,
} from '../../src/shared/services/friendships';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { getSocket } from '../../src/shared/services/socket';
import { getJson } from '../../src/shared/services/backend';
import { uploadChatAttachment } from '../../src/shared/services/backend';
import { DOCUMENT_MIME_TYPES, humanSize, prepareChatAttachment } from '../../src/shared/services/chatAttachments';
import { submitReport } from '../../src/shared/services/support';
import { clearConversationAppearance, getConversationAppearance, saveConversationAppearance } from '../../src/shared/services/chatAppearance';

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const CHAT_PAGE_SIZE = 25;
const EDIT_WINDOW_MS = 60 * 60 * 1000;
const VOICE_DELETE_WINDOW_MS = 30 * 60 * 1000;
const GROUP_GAP_MS = 5 * 60 * 1000;
const MAX_LENGTH = 4000;
const TYPING_REFRESH_MS = 3000;
const TYPING_IDLE_MS = 2000;
const REMOTE_TYPING_TIMEOUT_MS = 5000;
const MARK_READ_DEBOUNCE_MS = 500;
const RECONNECT_BANNER_DELAY_MS = 1500;
const MIN_GAP_REFETCH_MS = 2500; // Don't refetch after a blip shorter than this.
const FRIEND_GATE_MESSAGE = 'Become friends before chatting freely.';

// --- In-memory caches (reduce reads when re-entering a chat) ----------------
const MESSAGE_CACHE_TTL_MS = 20 * 1000; // Within this window we skip the network entirely.
const CONVERSATION_CACHE_TTL_MS = 5 * 60 * 1000;
const MESSAGE_CACHE_LIMIT = 80;
const CACHE_MAX_ENTRIES = 12;

const DRAFT_CACHE = new Map();
const MESSAGE_CACHE = new Map();
const CONVERSATION_CACHE = new Map();
const RELATIONSHIP_CACHE = new Map();

const putCache = (map, key, value) => {
  if (!key) return;
  map.delete(key);
  map.set(key, value);
  while (map.size > CACHE_MAX_ENTRIES) map.delete(map.keys().next().value);
};

const STATUS_RANK = { failed: 0, sending: 0, sent: 1, delivered: 2, read: 3 };
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮'];

const BUBBLE_PRESETS = [
  { key: 'brand', label: 'Classic', color: '#5B5CE2' },
  { key: 'ocean', label: 'Ocean', color: '#0A84FF' },
  { key: 'rose', label: 'Rose', color: '#E83E8C' },
  { key: 'forest', label: 'Forest', color: '#1F9D6A' },
  { key: 'cherry', label: 'Cherry', color: '#E53935' },
  { key: 'amber', label: 'Amber', color: '#E59600' },
  { key: 'mint', label: 'Mint', color: '#00A884' },
  { key: 'midnight', label: 'Midnight', color: '#27374D' },
  { key: 'sunset', label: 'Sunset', gradient: ['#FF7A18', '#AF002D'] },
  { key: 'violet', label: 'Violet', gradient: ['#7F00FF', '#E100FF'] },
  { key: 'aurora', label: 'Aurora', gradient: ['#00C6FF', '#0072FF'] },
  { key: 'candy', label: 'Candy', gradient: ['#F953C6', '#B91D73'] },
  { key: 'lime', label: 'Lime', gradient: ['#56AB2F', '#A8E063'] },
  { key: 'ember', label: 'Ember', gradient: ['#F12711', '#F5AF19'] },
];
const CHAT_BACKGROUNDS = [
  { key: 'default', label: 'Default', color: null },
  { key: 'midnight-grid', label: 'Midnight grid', gradient: ['#E8E7FF', '#C8C6FF'], darkGradient: ['#12152B', '#25215A'], pattern: 'grid' },
  { key: 'aurora', label: 'Aurora', gradient: ['#D9F5FF', '#DED9FF', '#F9D6ED'], darkGradient: ['#082F49', '#312E81', '#5B2167'], pattern: 'orb' },
  { key: 'paper', label: 'Soft paper', gradient: ['#F8FAFC', '#E9EFFF'], darkGradient: ['#1E293B', '#273449'], pattern: 'dots' },
  { key: 'campus', label: 'Campus dusk', gradient: ['#FFF1EB', '#ACE0F9'], darkGradient: ['#4A2C3B', '#244A66'], pattern: 'sun' },
  { key: 'forest', label: 'Forest mist', gradient: ['#DDF7EA', '#BFE9D5'], darkGradient: ['#0F3D32', '#1C6E5A'], pattern: 'leaf' },
  { key: 'rose', label: 'Rose haze', gradient: ['#FFE4E6', '#E9D5FF'], darkGradient: ['#492442', '#34264F'], pattern: 'orb' },
  { key: 'mono', label: 'Monochrome', gradient: ['#F5F5F5', '#D4D4D8'], darkGradient: ['#19191D', '#36363E'], pattern: 'grid' },
];
const BUBBLE_SHAPES = [
  { key: 'tail', label: 'Speech tail', radii: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 5 } },
  { key: 'ticket', label: 'Ticket', radii: { borderTopLeftRadius: 8, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 8 } },
  { key: 'comet', label: 'Comet', radii: { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 4 } },
  { key: 'pixel', label: 'Pixel', radii: { borderTopLeftRadius: 2, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 2 } },
  { key: 'ribbon', label: 'Ribbon', radii: { borderTopLeftRadius: 26, borderTopRightRadius: 5, borderBottomLeftRadius: 5, borderBottomRightRadius: 26 } },
  { key: 'orbit', label: 'Orbit', radii: { borderTopLeftRadius: 36, borderTopRightRadius: 12, borderBottomLeftRadius: 36, borderBottomRightRadius: 12 } },
  { key: 'fold', label: 'Fold', radii: { borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 } },
  { key: 'capsule', label: 'Capsule', radii: { borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 999, borderBottomRightRadius: 999 } },
  { key: 'pebble', label: 'Pebble', radii: { borderTopLeftRadius: 34, borderTopRightRadius: 34, borderBottomLeftRadius: 34, borderBottomRightRadius: 14 } },
  { key: 'leaf', label: 'Leaf', radii: { borderTopLeftRadius: 32, borderTopRightRadius: 8, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 } },
  { key: 'postcard', label: 'Postcard', radii: { borderTopLeftRadius: 4, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 } },
  { key: 'droplet', label: 'Droplet', radii: { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 2 } },
  { key: 'arch', label: 'Arch', radii: { borderTopLeftRadius: 32, borderTopRightRadius: 32, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 } },
  { key: 'soft-square', label: 'Soft square', radii: { borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 } },
  { key: 'cut-corner', label: 'Cut corner', radii: { borderTopLeftRadius: 2, borderTopRightRadius: 24, borderBottomLeftRadius: 2, borderBottomRightRadius: 24 } },
];
const DEFAULT_BUBBLE_APPEARANCE = {
  preset: 'brand', shape: 'tail', animation: 'none', customColor: '#5B5CE2',
  fontSize: 15.5, density: 'comfortable', width: 'standard', metadata: 'inline', wallpaper: 'default',
};
const isHexColor = (value) => /^#[0-9A-F]{6}$/i.test(String(value || '').trim());
const APPEARANCE_FONT_SIZES = [14, 15.5, 17];
const APPEARANCE_DENSITIES = ['compact', 'comfortable'];
const APPEARANCE_WIDTHS = ['compact', 'standard', 'wide'];
const APPEARANCE_ANIMATIONS = ['none', 'aurora-border', 'shimmer', 'float', 'pop'];
const normalizeBubbleAppearance = (value = {}) => {
  const candidate = { ...DEFAULT_BUBBLE_APPEARANCE, ...(value || {}) };
  return {
    ...candidate,
    preset: [...BUBBLE_PRESETS.map((item) => item.key), 'custom'].includes(candidate.preset) ? candidate.preset : 'brand',
    shape: BUBBLE_SHAPES.some((item) => item.key === candidate.shape) ? candidate.shape : 'tail',
    animation: APPEARANCE_ANIMATIONS.includes(candidate.animation) ? candidate.animation : 'none',
    customColor: isHexColor(candidate.customColor) ? candidate.customColor.toUpperCase() : DEFAULT_BUBBLE_APPEARANCE.customColor,
    fontSize: APPEARANCE_FONT_SIZES.includes(Number(candidate.fontSize)) ? Number(candidate.fontSize) : DEFAULT_BUBBLE_APPEARANCE.fontSize,
    density: APPEARANCE_DENSITIES.includes(candidate.density) ? candidate.density : 'comfortable',
    width: APPEARANCE_WIDTHS.includes(candidate.width) ? candidate.width : 'standard',
    metadata: candidate.metadata === 'below' ? 'below' : 'inline',
    wallpaper: CHAT_BACKGROUNDS.some((item) => item.key === candidate.wallpaper) ? candidate.wallpaper : 'default',
  };
};
const resolveBubbleFill = (appearance = {}) => {
  if (appearance.preset === 'custom') return { color: isHexColor(appearance.customColor) ? appearance.customColor : DEFAULT_BUBBLE_APPEARANCE.customColor };
  return BUBBLE_PRESETS.find((item) => item.key === appearance.preset) || BUBBLE_PRESETS[0];
};
const resolveChatBackground = (appearance = {}) =>
  CHAT_BACKGROUNDS.find((item) => item.key === appearance.wallpaper) || CHAT_BACKGROUNDS[0];

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const emitSafe = (event, payload) => {
  try {
    getSocket().emit(event, payload);
  } catch (_error) {
    // Socket might not be ready yet; callers never depend on this.
  }
};

/** Light haptic tick. Never throws, never blocks. */
const tap = (style = 'Light') => {
  try {
    const result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]);
    result?.catch?.(() => {});
  } catch (_error) {
    // Haptics unavailable (simulator, web).
  }
};

const toDate = (value) => {
  if (!value) return null;
  let date = value;
  if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
  else if (typeof value?.toDate === 'function') date = value.toDate();
  else if (typeof value?.seconds === 'number') date = new Date(value.seconds * 1000);
  else if (typeof value?._seconds === 'number') date = new Date(value._seconds * 1000);
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
};

const toMillis = (value) => toDate(value)?.getTime() || 0;

const formatTime = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
};

const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const formatDayLabel = (date) => {
  const now = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
};

const createMessageClientId = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const isLocalId = (id) => String(id || '').startsWith('local_');
const messageKey = (message) => message?.clientTempId || message?.localId || message?.id;
const keysOf = (message) => [message?.id, message?.clientTempId, message?.localId].filter(Boolean);

const previewOf = (message) => {
  if (!message) return '';
  if (message.deleted) return 'Message deleted';
  if (message.type === 'voice') return '🎤 Voice message';
  if (message.type === 'sticker') return 'Sticker';
  const text = String(message.text || message.body || message.caption || '').trim();
  if (!text) return message.attachments?.length ? '📷 Photo' : '';
  return text.length > 80 ? `${text.slice(0, 80).trim()}…` : text;
};

const buildReplyPayload = (message) =>
  message
    ? {
        id: message.id,
        senderId: message.senderId || '',
        senderName: message.senderName || 'Student',
        text: previewOf(message),
      }
    : null;

const payloadFromMessage = (message) => {
  const type = message.type || 'text';
  const base = { type, replyTo: message.replyTo || null };
  if (type === 'voice') {
    return {
      ...base,
      audioUrl: message.audioUrl,
      duration: message.duration || 0,
      played: false,
      cloudinaryPublicId: message.cloudinaryPublicId || '',
    };
  }
  if (type === 'sticker') return { ...base, stickerId: message.stickerId };
  return {
    ...base,
    text: message.text || '',
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  };
};

const sortMessages = (items = []) =>
  [...items].sort((left, right) => {
    const leftTime = toMillis(left?.createdAt);
    const rightTime = toMillis(right?.createdAt);
    if (leftTime && rightTime && leftTime !== rightTime) return leftTime - rightTime;
    return String(left?.id || '').localeCompare(String(right?.id || ''));
  });

/** Merge one incoming message without sorting. Never downgrades a status (read -> sent). */
const applyIncoming = (list, incoming) => {
  if (!incoming) return list;
  const incomingKeys = new Set(keysOf(incoming));
  if (!incomingKeys.size) return list;

  let matched = false;
  const next = list.map((existing) => {
    if (!keysOf(existing).some((key) => incomingKeys.has(key))) return existing;
    matched = true;
    const clientKey =
      incoming.clientTempId || existing.clientTempId || existing.localId || incoming.localId;
    const incomingStatus = incoming.status || 'sent';
    const status =
      (STATUS_RANK[existing.status] ?? 0) > (STATUS_RANK[incomingStatus] ?? 0)
        ? existing.status
        : incomingStatus;
    return {
      ...existing,
      ...incoming,
      id: incoming.id || existing.id,
      status,
      clientTempId: clientKey,
      localId: clientKey,
    };
  });

  if (!matched) next.push({ ...incoming, status: incoming.status || 'sent' });
  return next;
};

const reconcileIncomingMessage = (prev = [], incoming = null) =>
  incoming ? sortMessages(applyIncoming(prev, incoming)) : prev;

// Batch merge: one sort for the whole page instead of one per message.
const mergeFetchedMessages = (prev, fetched) =>
  fetched.length ? sortMessages(fetched.reduce(applyIncoming, prev)) : prev;

const toggleReactionLocal = (reactions = {}, emoji, uid) => {
  const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
  const next = current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid];
  const copy = { ...reactions };
  if (next.length) copy[emoji] = next;
  else delete copy[emoji];
  return copy;
};

const renderLinkedMessageText = (text, mine, colors) => {
  const content = String(text || '');
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(content))) {
    const matchedUrl = match[0];
    const trailingPunctuation = matchedUrl.match(/[.,!?;:)}\]]+$/)?.[0] || '';
    const visibleUrl = trailingPunctuation
      ? matchedUrl.slice(0, -trailingPunctuation.length)
      : matchedUrl;
    if (!visibleUrl) continue;

    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    parts.push(
      <Text
        key={`link-${match.index}`}
        accessibilityRole="link"
        style={{ color: mine ? colors.onBrand : colors.brand, textDecorationLine: 'underline' }}
        onPress={() => {
          const url = /^https?:\/\//i.test(visibleUrl) ? visibleUrl : `https://${visibleUrl}`;
          Linking.openURL(url).catch(() => {});
        }}
      >
        {visibleUrl}
      </Text>
    );
    if (trailingPunctuation) parts.push(trailingPunctuation);
    lastIndex = match.index + matchedUrl.length;
  }

  if (!parts.length) return content;
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return parts;
};

/**
 * One shared looping value for the "mine" bubble animation.
 * - A fresh Animated.Value per animation type, so a node that has been moved to the
 *   native driver is never re-driven by JS (aurora-border needs the JS driver).
 * - Used once per screen instead of once per message row.
 */
function useBubbleLoop(animation, { enabled, reduceMotion }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => new Animated.Value(0), [animation]);
  useEffect(() => {
    if (!enabled || reduceMotion || !animation || animation === 'none') {
      value.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration: animation === 'pop' ? 1150 : 1800,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: animation !== 'aurora-border',
      })
    );
    loop.start();
    return () => loop.stop();
  }, [animation, enabled, reduceMotion, value]);
  return value;
}

/* -------------------------------------------------------------------------- */
/*                         Styles (module-level = stable)                     */
/* -------------------------------------------------------------------------- */

// Defined outside the component so the factory identity never changes and
// `styles` stays referentially stable -> React.memo rows actually skip renders.
const createStyles = (c) => ({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, marginBottom: 8, borderRadius: 20, backgroundColor: c.surfacePrimary, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderDefault, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: c.brandDark, fontWeight: '800', fontSize: 18 },
  friendBadge: { position: 'absolute', right: -2, bottom: -2, width: 17, height: 17, borderRadius: 9, backgroundColor: c.brand, borderWidth: 2, borderColor: c.surfacePrimary, alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.brand },
  headerHint: { color: c.textSecondary, fontSize: 12.5 },
  headerHintActive: { color: c.brand, fontWeight: '700' },
  headerAction: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  headerActionPressed: { opacity: 0.8 },

  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.surfaceSecondary, borderRadius: 12, paddingVertical: 7, marginVertical: 6 },
  bannerText: { color: c.textSecondary, fontSize: 12.5, fontWeight: '600' },

  messagesPane: { flex: 1 },
  listContent: { paddingTop: 8, paddingBottom: 12, paddingHorizontal: 6 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.brand, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  retryButtonText: { color: c.onBrand, fontWeight: '800', fontSize: 13.5 },

  listHeader: { alignItems: 'center', paddingVertical: 14 },
  listHeaderText: { color: c.textTertiary, fontSize: 12 },

  dateWrap: { alignItems: 'center', marginVertical: 12 },
  datePill: { backgroundColor: c.surfaceSecondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  dateText: { color: c.textSecondary, fontSize: 11.5, fontWeight: '700' },

  unreadWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12, paddingHorizontal: 6 },
  unreadLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.brand, opacity: 0.5 },
  unreadPill: { backgroundColor: c.brandLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  unreadText: { color: c.brandDark, fontSize: 11.5, fontWeight: '800' },

  selectRow: { flexDirection: 'row', alignItems: 'center' },
  selectCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center', marginLeft: 6, marginRight: 4 },
  selectCheckOn: { backgroundColor: c.brand, borderColor: c.brand },

  rowWrap: { borderRadius: 16, paddingHorizontal: 4 },
  rowHighlight: { backgroundColor: c.brandLight },
  rowSelected: { backgroundColor: c.brandLight },
  bubble: { paddingVertical: 9, paddingHorizontal: 13, maxWidth: '82%', borderRadius: 20, shadowColor: c.shadow || '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 1, elevation: 1 },
  bubbleTail: { position: 'absolute', right: 1, bottom: 0, width: 14, height: 14, transform: [{ rotate: '45deg' }], opacity: 0.9 },
  bubbleFold: { position: 'absolute', top: 0, right: 0, width: 18, height: 18, backgroundColor: 'rgba(255,255,255,0.26)', borderBottomLeftRadius: 12 },
  bubblePressed: { opacity: 0.9 },
  bubbleFailed: { borderWidth: 1, borderColor: c.error },
  pendingDim: { opacity: 0.6 },
  mine: { alignSelf: 'flex-end', backgroundColor: c.brand },
  theirs: { alignSelf: 'flex-start', backgroundColor: c.surfacePrimary, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderDefault, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  bubbleDeleted: { opacity: 0.75, backgroundColor: c.skeleton, borderWidth: 0 },
  text: { color: c.textPrimary, lineHeight: 22, fontSize: 15.5 },
  mineText: { color: c.onBrand },
  deletedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deletedText: { fontSize: 13.5, fontStyle: 'italic', color: c.textSecondary },
  mineDeletedText: { color: 'rgba(255,255,255,0.85)' },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  outsideFooter: { marginTop: 2, marginBottom: 2, paddingHorizontal: 4 },
  metaText: { fontSize: 10.5, color: c.textTertiary },
  mineMeta: { color: 'rgba(255,255,255,0.75)' },
  seenText: { fontWeight: '800' },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  failedText: { fontSize: 11.5, fontWeight: '700', color: c.error },

  attachmentWrap: { borderRadius: 12, overflow: 'hidden', backgroundColor: c.skeleton },
  attachmentImage: { width: 210, height: 210 },
  attachmentOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.skeleton },
  attachmentOverlayText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
  attachmentFile: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 190, padding: 10, borderRadius: 12, marginBottom: 5, backgroundColor: c.surfaceSecondary },
  attachmentFileName: { flex: 1, color: c.textPrimary, fontSize: 12, fontWeight: '700' },

  replyBlock: { borderLeftWidth: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6 },
  replyBlockMine: { backgroundColor: 'rgba(255,255,255,0.18)', borderLeftColor: c.onBrand },
  replyBlockTheirs: { backgroundColor: c.surfaceSecondary, borderLeftColor: c.brand },
  replyBlockStandalone: { maxWidth: '82%', marginHorizontal: 4 },
  replyAuthor: { fontWeight: '800', color: c.brand, fontSize: 12 },
  replyAuthorMine: { color: c.onBrand },
  replyText: { marginTop: 1, color: c.textSecondary, fontSize: 13 },
  replyTextMine: { color: 'rgba(255,255,255,0.85)' },

  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4, marginLeft: 2, maxWidth: '90%' },
  reactionsRowMine: { justifyContent: 'flex-end', marginLeft: 0, marginRight: 2 },
  reactionPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  reactionPillActive: { backgroundColor: c.brandLight, borderColor: c.brand },
  reactionEmoji: { fontSize: 12.5 },
  reactionCount: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
  reactionCountActive: { color: c.brandDark },

  typingRow: { paddingTop: 4, paddingBottom: 6, paddingHorizontal: 4 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 14, paddingHorizontal: 16 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.textTertiary },

  voicePendingRow: { alignItems: 'flex-end', paddingTop: 4, paddingBottom: 6, paddingHorizontal: 4 },
  voicePendingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomRightRadius: 4 },
  voiceBars: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 },
  voiceBar: { width: 3, height: 22, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.85)' },
  voicePendingText: { color: c.onBrand, fontSize: 13, fontWeight: '700' },

  skeletonWrap: { flex: 1, paddingHorizontal: 10, paddingTop: 16, gap: 10 },
  skeletonBubble: { height: 40, borderRadius: 18, backgroundColor: c.skeleton },
  skeletonMine: { alignSelf: 'flex-end' },
  skeletonTheirs: { alignSelf: 'flex-start' },

  scrollFab: { position: 'absolute', right: 14, bottom: 12, minWidth: 42, height: 42, borderRadius: 21, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center', shadowColor: c.shadow || '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  scrollPill: { flexDirection: 'row', gap: 4, paddingHorizontal: 14, backgroundColor: c.brand, borderColor: c.brand },
  scrollPillText: { color: c.onBrand, fontSize: 12.5, fontWeight: '800' },

  toast: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: c.textPrimary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '90%' },
  toastText: { color: c.surfacePrimary, fontSize: 13, fontWeight: '700' },

  composerContainer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault, paddingTop: 10, paddingHorizontal: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  recorderExpanded: { flex: 1, minWidth: 0 },
  stickerButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1 },
  input: { minHeight: 44, maxHeight: 120, backgroundColor: c.inputBackground, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: c.textPrimary, fontSize: 15.5, lineHeight: 20 },
  inputEditing: { borderColor: c.brand },
  counter: { alignSelf: 'flex-end', marginTop: 3, marginRight: 8, fontSize: 11, color: c.textTertiary },
  counterLimit: { color: c.error, fontWeight: '700' },
  button: { backgroundColor: c.brand, borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', shadowColor: c.brand, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  buttonDisabled: { backgroundColor: c.brandGlow, opacity: 0.6 },

  composerBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: c.brand },
  composerBannerBody: { flex: 1 },
  composerBannerLabel: { fontWeight: '800', color: c.brand, fontSize: 12.5 },
  composerBannerText: { color: c.textPrimary, fontSize: 13.5, marginTop: 2 },
  composerBannerClose: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.skeleton },
  attachmentPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, marginBottom: 7, borderRadius: 12, backgroundColor: c.surfaceSecondary },
  attachmentPreviewThumb: { width: 34, height: 34, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: c.skeleton },
  attachmentPreviewImage: { width: '100%', height: '100%' },
  attachmentPreviewText: { flex: 1, color: c.textPrimary, fontSize: 12, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  dialogOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', paddingHorizontal: 28 },
  dialogCard: { backgroundColor: c.bottomSheetBackground, borderRadius: 24, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 12 },
  sheet: { backgroundColor: c.bottomSheetBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderDefault, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 2 },
  sheetSubtitle: { fontSize: 13, color: c.textSecondary, textAlign: 'center', marginBottom: 10 },
  sheetPreview: { fontSize: 13, color: c.textSecondary, backgroundColor: c.surfaceSecondary, borderRadius: 12, padding: 12, marginBottom: 8 },
  sheetHint: { fontSize: 12, color: c.textTertiary, textAlign: 'center', marginTop: 4 },
  bubbleStylePreview: { height: 58, alignSelf: 'flex-end', overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 16, marginVertical: 10, minWidth: 180 },
  bubbleStylePreviewText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  bubbleStyleLabel: { color: c.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 8, marginBottom: 7 },
  bubbleStyleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  bubbleStyleSwatch: { width: 37, height: 37, borderRadius: 19, borderWidth: 2, borderColor: 'transparent' },
  bubbleStyleSelected: { borderColor: c.textPrimary, transform: [{ scale: 1.12 }] },
  bubbleStyleChoice: { borderWidth: 1, borderColor: c.borderDefault, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: c.surfaceSecondary },
  bubbleStyleChoiceSelected: { borderColor: c.brand, backgroundColor: c.brandLight },
  bubbleStyleChoiceText: { color: c.textPrimary, fontSize: 12, fontWeight: '700' },
  customColorRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 8 },
  customColorPreview: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: c.borderDefault },
  customColorInput: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.inputBackground, color: c.textPrimary, paddingHorizontal: 12, fontWeight: '800', letterSpacing: 1 },
  customColorHint: { color: c.textTertiary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  studioSheet: { flex: 1, backgroundColor: c.bottomSheetBackground, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  studioTopbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  studioEyebrow: { color: c.brand, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  studioTitle: { color: c.textPrimary, fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 1 },
  studioClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  studioSave: { minHeight: 38, paddingHorizontal: 13, borderRadius: 19, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
  studioSaveText: { color: c.onBrand, fontWeight: '900', fontSize: 12 },
  studioScope: { flexDirection: 'row', gap: 8, marginTop: 10 },
  studioScopeOption: { flex: 1, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 13, padding: 10, backgroundColor: c.surfaceSecondary },
  studioScopeOptionSelected: { borderColor: c.brand, backgroundColor: c.brandLight },
  studioScopeTitle: { color: c.textPrimary, fontSize: 11.5, fontWeight: '900' },
  studioScopeText: { color: c.textSecondary, fontSize: 10.5, lineHeight: 14, marginTop: 2 },
  studioReset: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  studioResetText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
  wallpaperGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  wallpaperCard: { width: '30%', minWidth: 88, borderRadius: 14, borderWidth: 1, borderColor: c.borderDefault, padding: 5, backgroundColor: c.surfaceSecondary },
  wallpaperCardSelected: { borderColor: c.brand, backgroundColor: c.brandLight },
  wallpaperArt: { height: 54, borderRadius: 10, overflow: 'hidden' },
  wallpaperName: { color: c.textPrimary, fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 6, marginBottom: 2 },
  wallpaperDot: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.22)', top: -12, right: -10 },
  wallpaperLine: { position: 'absolute', height: 1, left: 0, right: 0, top: 18, backgroundColor: 'rgba(255,255,255,0.16)' },
  studioScroll: { paddingHorizontal: 16, paddingBottom: 36 },
  studioStage: { height: 218, borderRadius: 26, backgroundColor: '#131529', overflow: 'hidden', padding: 16, marginBottom: 18, justifyContent: 'center' },
  studioOrbOne: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#6D28D9', opacity: 0.54, top: -94, right: -48 },
  studioOrbTwo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: '#00B7FF', opacity: 0.32, bottom: -106, left: -45 },
  studioStageHint: { position: 'absolute', top: 14, left: 16, color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  studioBubbleFrame: { alignSelf: 'flex-end', marginTop: 22 },
  studioBubble: { overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 11, minWidth: 178, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 9, elevation: 4 },
  studioBubbleText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  studioBubbleMeta: { color: 'rgba(255,255,255,0.74)', fontSize: 10.5, marginTop: 3, textAlign: 'right' },
  studioIncoming: { alignSelf: 'flex-start', marginTop: 15, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 14 },
  studioIncomingText: { color: '#24243A', fontSize: 12.5, fontWeight: '700' },
  studioSection: { marginBottom: 22 },
  studioSectionTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  studioSectionCaption: { color: c.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 11 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodCard: { width: 61, alignItems: 'center', paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  moodCardSelected: { borderColor: c.brand, backgroundColor: c.brandLight },
  moodArtwork: { width: 43, height: 43, borderRadius: 15, overflow: 'hidden', justifyContent: 'flex-end', padding: 6 },
  moodArtworkDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.7)' },
  moodName: { color: c.textSecondary, fontSize: 9.5, fontWeight: '800', marginTop: 4 },
  moodCheck: { position: 'absolute', top: 3, right: 5, width: 16, height: 16, borderRadius: 8, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
  shapeGallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shapeTile: { width: '23%', minWidth: 70, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.surfaceSecondary, paddingVertical: 10 },
  shapeTileSelected: { borderColor: c.brand, backgroundColor: c.brandLight },
  shapeMini: { width: 44, height: 27, position: 'relative' },
  shapeTail: { position: 'absolute', right: 2, bottom: -3, width: 10, height: 10, transform: [{ rotate: '45deg' }] },
  shapeFold: { position: 'absolute', right: 0, top: 0, width: 11, height: 11, backgroundColor: 'rgba(255,255,255,0.42)', borderBottomLeftRadius: 7 },
  shapeName: { color: c.textPrimary, fontSize: 10, fontWeight: '800', marginTop: 7, textAlign: 'center' },
  motionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motionTile: { width: '31%', minWidth: 92, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 16, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.surfaceSecondary, padding: 8 },
  motionTileSelected: { backgroundColor: c.brand, borderColor: c.brand },
  motionName: { color: c.textPrimary, fontSize: 10.5, fontWeight: '800', textAlign: 'center' },
  motionNameSelected: { color: c.onBrand },
  sheetReactions: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.surfaceSecondary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  sheetReactionBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sheetReactionBtnActive: { backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brand },
  sheetReactionEmoji: { fontSize: 24 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  sheetOptionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  sheetOptionIconDanger: { backgroundColor: c.dangerLight },
  sheetOptionText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  sheetCancel: { marginTop: 6, paddingVertical: 13, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault },
  sheetCancelText: { fontSize: 15, fontWeight: '700', color: c.textSecondary },

  selectionBar: { position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 20, backgroundColor: c.surfacePrimary, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: c.borderDefault, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  selectionTitle: { color: c.textPrimary, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  selectionActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: c.surfaceSecondary, borderRadius: 12, paddingVertical: 9 },
  selectionButtonDanger: { backgroundColor: c.dangerLight },
  selectionButtonDisabled: { opacity: 0.4 },
  selectionButtonText: { fontSize: 12, fontWeight: '800', color: c.textPrimary },

  confirmIconWrap: { alignSelf: 'center', width: 48, height: 48, borderRadius: 24, backgroundColor: c.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 6 },
  confirmSubtitle: { fontSize: 13.5, color: c.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 20, paddingHorizontal: 8 },
  confirmDeleteButton: { backgroundColor: c.error, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  confirmDeleteText: { color: c.onBrand, fontWeight: '800', fontSize: 14 },
  dialogPrimaryBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  dialogPrimaryText: { color: c.onBrand, fontWeight: '800', fontSize: 14.5 },

  viewerOverlay: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerClose: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, right: 18, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },

  relationshipCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18, padding: 14, marginTop: 8, marginBottom: 12 },
  relationshipIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: c.surfacePrimary, alignItems: 'center', justifyContent: 'center' },
  relationshipCopy: { flex: 1 },
  relationshipTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '800' },
  relationshipText: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  relationshipButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.brand, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  relationshipButtonMuted: { backgroundColor: c.skeleton },
  relationshipButtonText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },
  relationshipButtonTextMuted: { color: c.textSecondary },
});

/* -------------------------------------------------------------------------- */
/*                              Small components                              */
/* -------------------------------------------------------------------------- */

function SwipeToReply({ children, disabled, onReply, color }) {
  const translateX = useMemo(() => new Animated.Value(0), []);
  const firedRef = useRef(false);

  const reset = useCallback(() => {
    firedRef.current = false;
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7, tension: 90 }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !disabled && g.dx > 12 && g.dx > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => {
          translateX.setValue(Math.max(0, Math.min(72, g.dx)));
          // Tick once when the gesture crosses the reply threshold.
          if (g.dx >= 60 && !firedRef.current) {
            firedRef.current = true;
            tap('Light');
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx >= 60) onReply?.();
          reset();
        },
        onPanResponderTerminate: reset,
      }),
    [disabled, onReply, reset, translateX]
  );

  const iconOpacity = translateX.interpolate({ inputRange: [0, 60], outputRange: [0, 1], extrapolate: 'clamp' });
  const iconScale = translateX.interpolate({ inputRange: [0, 60], outputRange: [0.5, 1], extrapolate: 'clamp' });

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: 10, top: '50%', marginTop: -10, opacity: iconOpacity, transform: [{ scale: iconScale }] }}
      >
        <Ionicons name="arrow-undo" size={18} color={color} />
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

function TypingBubble({ styles, reduceMotion }) {
  const dots = useMemo(() => [0, 1, 2].map(() => new Animated.Value(reduceMotion ? 0.7 : 0.3)), [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const loops = dots.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(value, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 320, useNativeDriver: true }),
          Animated.delay((2 - index) * 160),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dots, reduceMotion]);

  return (
    <View style={styles.typingRow}>
      <View style={[styles.bubble, styles.theirs, styles.typingBubble, { borderBottomLeftRadius: 4 }]}>
        {dots.map((value, index) => (
          <Animated.View key={index} style={[styles.typingDot, { opacity: value }]} />
        ))}
      </View>
    </View>
  );
}

/** Shown in the list while a voice note is being recorded -> uploaded, before it becomes a real message. */
function VoicePendingBubble({ styles, colors }) {
  const bars = useMemo(() => Array.from({ length: 14 }, () => new Animated.Value(0.3)), []);

  useEffect(() => {
    const loops = bars.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((index % 7) * 70),
          Animated.timing(value, { toValue: 1, duration: 360, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 360, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [bars]);

  return (
    <View style={styles.voicePendingRow}>
      <View style={[styles.bubble, styles.mine, styles.voicePendingBubble]}>
        <ActivityIndicator size="small" color={colors.onBrand} />
        <View style={styles.voiceBars}>
          {bars.map((value, index) => (
            <Animated.View key={index} style={[styles.voiceBar, { transform: [{ scaleY: value }] }]} />
          ))}
        </View>
        <Text style={styles.voicePendingText}>Sending voice note…</Text>
      </View>
    </View>
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
    { w: '34%', mine: true }, { w: '52%', mine: false }, { w: '70%', mine: true }, { w: '44%', mine: false },
  ];

  return (
    <Animated.View style={[styles.skeletonWrap, { opacity: pulse }]}>
      {rows.map((row, index) => (
        <View key={index} style={[styles.skeletonBubble, row.mine ? styles.skeletonMine : styles.skeletonTheirs, { width: row.w }]} />
      ))}
    </Animated.View>
  );
}

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

const StatusIcon = React.memo(function StatusIcon({ status, colors, onBubble }) {
  const dim = onBubble ? 'rgba(255,255,255,0.7)' : colors.textTertiary;
  if (status === 'sending') return <PulsingClock color={dim} />;
  if (status === 'read') return <Ionicons name="checkmark-done" size={15} color={onBubble ? colors.onBrand : colors.brand} />;
  if (status === 'delivered') return <Ionicons name="checkmark-done" size={15} color={dim} />;
  return <Ionicons name="checkmark" size={14} color={dim} />;
});

function AttachmentImage({ uri, styles, colors, spaced, onPress, onLongPress }) {
  const [state, setState] = useState('loading');
  return (
    <Pressable
      onPress={() => state !== 'error' && onPress?.(uri)}
      onLongPress={onLongPress}
      delayLongPress={220}
      style={[styles.attachmentWrap, spaced && { marginBottom: 8 }]}
      accessibilityRole="imagebutton"
      accessibilityLabel="Open photo"
    >
      <Image source={{ uri }} style={styles.attachmentImage} resizeMode="cover" onLoad={() => setState('ready')} onError={() => setState('error')} />
      {state === 'loading' ? (
        <View style={styles.attachmentOverlay}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : null}
      {state === 'error' ? (
        <View style={styles.attachmentOverlay}>
          <Ionicons name="image-outline" size={26} color={colors.textTertiary} />
          <Text style={styles.attachmentOverlayText}>Could not load photo</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ChatBackground({ appearance, colors, isDark, preview = false, styles }) {
  const wallpaper = resolveChatBackground(appearance);
  if (wallpaper.key === 'default') return preview ? <View style={[styles.wallpaperArt, { backgroundColor: colors.background }]} /> : null;
  const gradient = isDark && wallpaper.darkGradient ? wallpaper.darkGradient : wallpaper.gradient;
  const decoration = (
    <>
      {wallpaper.pattern === 'orb' || wallpaper.pattern === 'sun' ? <View style={styles.wallpaperDot} /> : null}
      {wallpaper.pattern === 'grid' ? (
        <>
          <View style={styles.wallpaperLine} />
          <View style={[styles.wallpaperLine, { top: 36 }]} />
        </>
      ) : null}
      {wallpaper.pattern === 'dots' ? <View style={[styles.wallpaperDot, { width: 8, height: 8, top: 12, right: 20, opacity: 0.7 }]} /> : null}
      {wallpaper.pattern === 'leaf' ? (
        <View style={[styles.wallpaperDot, { width: 72, height: 38, borderRadius: 40, top: 7, right: -16, transform: [{ rotate: '-35deg' }] }]} />
      ) : null}
    </>
  );
  if (preview) {
    return (
      <View style={[styles.wallpaperArt, { backgroundColor: gradient?.[0] }]}>
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
        {decoration}
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      {decoration}
    </View>
  );
}

function StudioSection({ title, caption, children, styles }) {
  return (
    <View style={styles.studioSection}>
      <Text style={styles.studioSectionTitle}>{title}</Text>
      <Text style={styles.studioSectionCaption}>{caption}</Text>
      {children}
    </View>
  );
}

const MOTION_OPTIONS = [
  ['none', 'Still', 'pause-outline'],
  ['aurora-border', 'Aurora edge', 'color-wand-outline'],
  ['shimmer', 'Light sweep', 'sparkles-outline'],
  ['float', 'Cloud drift', 'cloud-outline'],
  ['pop', 'Soft bounce', 'radio-outline'],
];

function BubbleStudio({ appearance, scope, saving, onChange, onDraftChange, onScopeChange, onReset, onSave, onDone, styles, colors, isDark, reduceMotion }) {
  const motion = useBubbleLoop(appearance.animation, { enabled: true, reduceMotion });
  const fill = resolveBubbleFill(appearance);
  const shape = BUBBLE_SHAPES.find((item) => item.key === appearance.shape) || BUBBLE_SHAPES[0];
  const solidPreview = fill.gradient ? fill.gradient[0] : fill.color;

  const borderTone = motion.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: ['#00D2FF', '#8B5CF6', '#FF4DA6', '#00D2FF'] });
  const drift = motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -5, 0] });
  const pulse = motion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.03, 1] });
  const shimmerX = motion.interpolate({ inputRange: [0, 1], outputRange: [-180, 290] });
  const customValid = isHexColor(appearance.customColor);

  const frameMotion = [
    appearance.animation === 'aurora-border' && { padding: 2, backgroundColor: borderTone },
    appearance.animation === 'float' && { transform: [{ translateY: drift }] },
    appearance.animation === 'pop' && { transform: [{ scale: pulse }] },
  ];

  return (
    <View style={styles.studioSheet}>
      <View style={styles.studioTopbar}>
        <View>
          <Text style={styles.studioEyebrow}>PERSONAL MESSAGE LAB</Text>
          <Text style={styles.studioTitle}>Bubble Studio</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={styles.studioSave} onPress={onSave} disabled={saving} accessibilityRole="button" accessibilityLabel="Save bubble appearance">
            {saving ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Text style={styles.studioSaveText}>Save</Text>}
          </Pressable>
          <Pressable style={styles.studioClose} onPress={onDone} accessibilityRole="button" accessibilityLabel="Close bubble studio">
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.studioScroll} keyboardShouldPersistTaps="handled">
        <StudioSection title="Where this applies" caption="Appearance is private; the other person never sees it." styles={styles}>
          <View style={styles.studioScope}>
            <Pressable onPress={() => onScopeChange('global')} style={[styles.studioScopeOption, scope === 'global' && styles.studioScopeOptionSelected]} accessibilityRole="button">
              <Text style={styles.studioScopeTitle}>All my chats</Text>
              <Text style={styles.studioScopeText}>Synced with your UniHelp profile.</Text>
            </Pressable>
            <Pressable onPress={() => onScopeChange('conversation')} style={[styles.studioScopeOption, scope === 'conversation' && styles.studioScopeOptionSelected]} accessibilityRole="button">
              <Text style={styles.studioScopeTitle}>This chat only</Text>
              <Text style={styles.studioScopeText}>Saved locally on this device.</Text>
            </Pressable>
          </View>
        </StudioSection>

        <View style={styles.studioStage}>
          <View style={styles.studioOrbOne} />
          <View style={styles.studioOrbTwo} />
          <Text style={styles.studioStageHint}>LIVE COMPOSITION</Text>
          <Animated.View style={[styles.studioBubbleFrame, shape.radii, ...frameMotion]}>
            <View style={[styles.studioBubble, shape.radii, { backgroundColor: fill.gradient ? 'transparent' : fill.color }]}>
              {fill.gradient ? <LinearGradient colors={fill.gradient} style={StyleSheet.absoluteFill} /> : null}
              {appearance.animation === 'shimmer' ? (
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: shimmerX }] }]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: 120, height: '100%' }} />
                </Animated.View>
              ) : null}
              <Text style={[styles.studioBubbleText, { fontSize: appearance.fontSize }]}>This is so you ✦</Text>
              <Text style={styles.studioBubbleMeta}>Delivered · now</Text>
            </View>
          </Animated.View>
          <View style={styles.studioIncoming}>
            <Text style={styles.studioIncomingText}>Make it unmistakable.</Text>
          </View>
        </View>

        <StudioSection title="Choose a mood" caption="Color, gradient and atmosphere" styles={styles}>
          <View style={styles.moodGrid}>
            {BUBBLE_PRESETS.map((preset) => {
              const selected = appearance.preset === preset.key;
              return (
                <Pressable key={preset.key} onPress={() => onChange({ ...appearance, preset: preset.key })} style={[styles.moodCard, selected && styles.moodCardSelected]} accessibilityRole="button" accessibilityLabel={`Use ${preset.label} mood`}>
                  <View style={[styles.moodArtwork, { backgroundColor: preset.gradient ? 'transparent' : preset.color }]}>
                    {preset.gradient ? <LinearGradient colors={preset.gradient} style={StyleSheet.absoluteFill} /> : null}
                    <View style={styles.moodArtworkDot} />
                  </View>
                  <Text style={styles.moodName}>{preset.label}</Text>
                  {selected ? (
                    <View style={styles.moodCheck}>
                      <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.customColorRow}>
            <Pressable
              onPress={() => onChange({ ...appearance, preset: 'custom' })}
              style={[styles.customColorPreview, { backgroundColor: customValid ? appearance.customColor : '#FFFFFF' }, appearance.preset === 'custom' && styles.bubbleStyleSelected]}
              accessibilityRole="button"
              accessibilityLabel="Use a custom color"
            />
            <TextInput
              value={appearance.customColor || ''}
              onChangeText={(value) =>
                onDraftChange({ ...appearance, preset: 'custom', customColor: `#${value.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase()}` })
              }
              onEndEditing={() => onChange({ ...appearance, preset: 'custom' })}
              placeholder="#6C63FF"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              style={styles.customColorInput}
              accessibilityLabel="Custom bubble HEX color"
            />
            <Text style={styles.customColorHint}>CUSTOM</Text>
          </View>
        </StudioSection>

        <StudioSection title="Sculpt the silhouette" caption="Designed shapes, not rounded rectangles" styles={styles}>
          <View style={styles.shapeGallery}>
            {BUBBLE_SHAPES.map((item) => (
              <Pressable key={item.key} onPress={() => onChange({ ...appearance, shape: item.key })} style={[styles.shapeTile, appearance.shape === item.key && styles.shapeTileSelected]} accessibilityRole="button" accessibilityLabel={`Use ${item.label} shape`}>
                <View style={[styles.shapeMini, item.radii, { backgroundColor: solidPreview }]}>
                  {item.key === 'fold' ? <View style={styles.shapeFold} /> : null}
                  {item.key === 'tail' ? <View style={[styles.shapeTail, { backgroundColor: solidPreview }]} /> : null}
                </View>
                <Text style={styles.shapeName}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </StudioSection>

        <StudioSection title="Motion lab" caption="A subtle loop applied to your bubbles" styles={styles}>
          <View style={styles.motionGrid}>
            {MOTION_OPTIONS.map(([key, label, icon]) => (
              <Pressable key={key} onPress={() => onChange({ ...appearance, animation: key })} style={[styles.motionTile, appearance.animation === key && styles.motionTileSelected]} accessibilityRole="button" accessibilityLabel={`Use ${label} animation`}>
                <Ionicons name={icon} size={19} color={appearance.animation === key ? colors.onBrand : colors.brand} />
                <Text style={[styles.motionName, appearance.animation === key && styles.motionNameSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {reduceMotion ? <Text style={[styles.studioSectionCaption, { marginTop: 8, marginBottom: 0 }]}>Reduce Motion is on, so animations stay still on this device.</Text> : null}
        </StudioSection>

        <StudioSection title="Reading comfort" caption="Tuned for comfortable everyday messaging" styles={styles}>
          <View style={styles.motionGrid}>
            {APPEARANCE_FONT_SIZES.map((size) => (
              <Pressable key={size} onPress={() => onChange({ ...appearance, fontSize: size })} style={[styles.motionTile, appearance.fontSize === size && styles.motionTileSelected]} accessibilityRole="button">
                <Text style={[styles.motionName, appearance.fontSize === size && styles.motionNameSelected]}>
                  {size === 14 ? 'Small type' : size === 17 ? 'Large type' : 'Standard type'}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => onChange({ ...appearance, density: appearance.density === 'compact' ? 'comfortable' : 'compact' })} style={styles.motionTile} accessibilityRole="button">
              <Text style={styles.motionName}>{appearance.density === 'compact' ? 'Compact spacing' : 'Comfortable spacing'}</Text>
            </Pressable>
            <Pressable
              onPress={() => onChange({ ...appearance, width: appearance.width === 'standard' ? 'wide' : appearance.width === 'wide' ? 'compact' : 'standard' })}
              style={styles.motionTile}
              accessibilityRole="button"
            >
              <Text style={styles.motionName}>{appearance.width === 'wide' ? 'Wide bubbles' : appearance.width === 'compact' ? 'Narrow bubbles' : 'Standard width'}</Text>
            </Pressable>
          </View>
        </StudioSection>

        <StudioSection title="Chat wallpaper" caption="Creative, lightweight backgrounds only you can see" styles={styles}>
          <View style={styles.wallpaperGrid}>
            {CHAT_BACKGROUNDS.map((wallpaper) => (
              <Pressable key={wallpaper.key} onPress={() => onChange({ ...appearance, wallpaper: wallpaper.key })} style={[styles.wallpaperCard, appearance.wallpaper === wallpaper.key && styles.wallpaperCardSelected]} accessibilityRole="button" accessibilityLabel={`Use ${wallpaper.label} chat wallpaper`}>
                <ChatBackground appearance={{ wallpaper: wallpaper.key }} colors={colors} isDark={isDark} preview styles={styles} />
                <Text style={styles.wallpaperName}>{wallpaper.label}</Text>
              </Pressable>
            ))}
          </View>
        </StudioSection>

        <Pressable style={styles.studioReset} onPress={onReset} accessibilityRole="button">
          <Text style={styles.studioResetText}>Restore default appearance</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SheetOption({ icon, label, onPress, danger, styles, colors }) {
  return (
    <Pressable style={styles.sheetOption} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.sheetOptionIcon, danger && styles.sheetOptionIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.textPrimary} />
      </View>
      <Text style={[styles.sheetOptionText, danger && { color: colors.error }]}>{label}</Text>
    </Pressable>
  );
}

const MessageRow = React.memo(function MessageRow({
  message,
  groupStart,
  groupEnd,
  mine,
  highlighted,
  selected,
  selectionMode,
  showSeen,
  styles,
  colors,
  currentUid,
  onLongPress,
  onSelectToggle,
  onReply,
  onRetry,
  onJumpToReply,
  onToggleReaction,
  onOpenImage,
  bubbleAppearance,
  bubbleMotion,
}) {
  const deleted = !!message.deleted;
  const isVoice = message.type === 'voice';
  const isSticker = message.type === 'sticker';
  const failed = message.status === 'failed';
  const sending = message.status === 'sending';
  const edited = Boolean(message.edited || message.editedAt);
  const showFooter = groupEnd || failed || sending;

  const reactionEntries = useMemo(
    () =>
      Object.entries(message.reactions || {})
        .filter(([, uids]) => Array.isArray(uids) && uids.length)
        .sort((a, b) => b[1].length - a[1].length),
    [message.reactions]
  );

  const handleLongPress = useCallback(() => onLongPress?.(message), [onLongPress, message]);
  const handleReply = useCallback(() => onReply(message), [onReply, message]);
  const chosenShape = BUBBLE_SHAPES.find((item) => item.key === bubbleAppearance?.shape) || BUBBLE_SHAPES[0];
  const bubbleFill = resolveBubbleFill(bubbleAppearance);
  const animation = bubbleAppearance?.animation || 'none';

  const floatY = bubbleMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -3, 0] });
  const popScale = bubbleMotion.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.025, 1] });
  const shimmerX = bubbleMotion.interpolate({ inputRange: [0, 1], outputRange: [-150, 230] });
  const auroraBorder = bubbleMotion.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: ['#00D2FF', '#7F00FF', '#FF4D9D', '#00D2FF'] });

  const radius = mine
    ? { borderTopRightRadius: groupStart ? 20 : 6, borderBottomRightRadius: groupEnd ? 4 : 6 }
    : { borderTopLeftRadius: groupStart ? 20 : 6, borderBottomLeftRadius: groupEnd ? 4 : 6 };

  // Custom shape radii, but grouped bubbles keep their tight inner corners.
  const mineRadii = mine
    ? {
        ...chosenShape.radii,
        ...(groupStart ? null : { borderTopRightRadius: 6 }),
        ...(groupEnd ? null : { borderBottomRightRadius: 6 }),
      }
    : null;
  const showTail = mine && groupEnd;

  const fontSize = bubbleAppearance?.fontSize || DEFAULT_BUBBLE_APPEARANCE.fontSize;
  const densityStyle = mine && bubbleAppearance?.density === 'compact' ? { paddingVertical: 6, paddingHorizontal: 10 } : null;
  const widthStyle = mine && bubbleAppearance?.width === 'compact' ? { maxWidth: '68%' } : mine && bubbleAppearance?.width === 'wide' ? { maxWidth: '90%' } : null;
  const textStyle = mine ? { fontSize, lineHeight: fontSize + 6 } : null;

  const replyBlock = message.replyTo ? (
    <Pressable
      onPress={() => onJumpToReply(message.replyTo.id)}
      style={[
        styles.replyBlock,
        mine ? styles.replyBlockMine : styles.replyBlockTheirs,
        (isVoice || isSticker) && styles.replyBlockStandalone,
        (isVoice || isSticker) && { alignSelf: mine ? 'flex-end' : 'flex-start' },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Jump to replied message"
    >
      <Text style={[styles.replyAuthor, mine && styles.replyAuthorMine]} numberOfLines={1}>
        {message.replyTo.senderName || 'Student'}
      </Text>
      <Text style={[styles.replyText, mine && styles.replyTextMine]} numberOfLines={2}>
        {message.replyTo.text || ''}
      </Text>
    </Pressable>
  ) : null;

  const onBubble = !isVoice && !isSticker;
  const footer = showFooter ? (
    <View style={[styles.bubbleFooter, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
      {failed ? (
        <Pressable onPress={() => onRetry(message)} hitSlop={8} style={styles.failedRow} accessibilityRole="button" accessibilityLabel="Retry sending message">
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.failedText}>Not sent · Tap to retry</Text>
        </Pressable>
      ) : (
        <>
          {edited ? <Text style={[styles.metaText, mine && onBubble && styles.mineMeta]}>Edited</Text> : null}
          {mine && showSeen ? <Text style={[styles.metaText, styles.seenText, onBubble ? styles.mineMeta : { color: colors.brand }]}>Seen</Text> : null}
          <Text style={[styles.metaText, mine && onBubble && styles.mineMeta]}>{sending ? 'Sending…' : formatTime(message.createdAt)}</Text>
          {mine ? <StatusIcon status={message.status} colors={colors} onBubble={onBubble} /> : null}
        </>
      )}
    </View>
  ) : null;

  let body;
  if (deleted) {
    body = (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs, radius, styles.bubbleDeleted]}>
        <View style={styles.deletedRow}>
          <Ionicons name="ban-outline" size={14} color={mine ? 'rgba(255,255,255,0.8)' : colors.textSecondary} />
          <Text style={[styles.deletedText, mine && styles.mineDeletedText]}>
            {isVoice ? 'This voice message was deleted' : 'This message was deleted'}
          </Text>
        </View>
        {showFooter ? (
          <View style={[styles.bubbleFooter, { justifyContent: 'flex-end' }]}>
            <Text style={[styles.metaText, mine && styles.mineMeta]}>{formatTime(message.createdAt)}</Text>
          </View>
        ) : null}
      </View>
    );
  } else if (isSticker) {
    body = (
      <View style={sending ? styles.pendingDim : null}>
        {replyBlock}
        <StickerMessage message={message} isMine={mine} onLongPress={handleLongPress} />
        {footer ? <View style={styles.outsideFooter}>{footer}</View> : null}
      </View>
    );
  } else if (isVoice) {
    body = (
      <View>
        {replyBlock}
        <View style={sending ? styles.pendingDim : null}>
          <VoiceMessageBubble
            message={message}
            isMine={mine}
            onLongPress={handleLongPress}
            bubbleColor={bubbleFill.gradient ? bubbleFill.gradient[0] : bubbleFill.color}
          />
        </View>
        {footer ? <View style={styles.outsideFooter}>{footer}</View> : null}
      </View>
    );
  } else {
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    const hasText = Boolean(message.text || message.body || message.caption);
    const needsClipLayer = mine && (bubbleFill.gradient || animation === 'shimmer' || chosenShape.key === 'fold');

    body = (
      <Animated.View
        style={[
          { alignSelf: mine ? 'flex-end' : 'flex-start' },
          mine && animation === 'float' ? { transform: [{ translateY: floatY }] } : null,
          mine && animation === 'pop' ? { transform: [{ scale: popScale }] } : null,
          mine && animation === 'aurora-border' ? { padding: 2, ...chosenShape.radii, backgroundColor: auroraBorder } : null,
        ]}
      >
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={220}
          style={({ pressed }) => [
            styles.bubble,
            mine ? styles.mine : styles.theirs,
            !mine && radius,
            mine && { backgroundColor: bubbleFill.gradient ? 'transparent' : bubbleFill.color, ...mineRadii },
            densityStyle,
            widthStyle,
            failed && styles.bubbleFailed,
            sending && styles.pendingDim,
            pressed && styles.bubblePressed,
          ]}
        >
          {/* Fill, shimmer and fold are clipped to the bubble shape; the tail is not, so it can overhang. */}
          {needsClipLayer ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, mineRadii, { overflow: 'hidden' }]}>
              {bubbleFill.gradient ? <LinearGradient colors={bubbleFill.gradient} style={StyleSheet.absoluteFill} /> : null}
              {animation === 'shimmer' ? (
                <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: shimmerX }] }]}>
                  <LinearGradient colors={['transparent', 'rgba(255,255,255,0.33)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: 100, height: '100%' }} />
                </Animated.View>
              ) : null}
              {chosenShape.key === 'fold' ? <View style={styles.bubbleFold} /> : null}
            </View>
          ) : null}
          {showTail && chosenShape.key === 'tail' ? (
            <View pointerEvents="none" style={[styles.bubbleTail, { backgroundColor: bubbleFill.gradient ? bubbleFill.gradient[1] : bubbleFill.color }]} />
          ) : null}
          {replyBlock}
          {attachments.map((att, i) =>
            att?.type === 'image' && att.url ? (
              <AttachmentImage
                key={att.url || i}
                uri={att.url}
                styles={styles}
                colors={colors}
                spaced={hasText}
                onPress={onOpenImage}
                onLongPress={handleLongPress}
              />
            ) : null
          )}
          {attachments.map((att, i) =>
            att?.type !== 'image' && att.url ? (
              <Pressable key={`file-${att.url || i}`} style={styles.attachmentFile} onPress={() => Linking.openURL(att.url).catch(() => {})} accessibilityRole="link" accessibilityLabel={`Open ${att.fileName || 'attachment'}`}>
                <Ionicons name={att.type === 'video' ? 'play-circle-outline' : 'document-text-outline'} size={24} color={mine ? '#fff' : colors.brand} />
                <View style={{ flex: 1 }}><Text style={[styles.attachmentFileName, mine && styles.mineText]} numberOfLines={1}>{att.fileName || att.name || (att.type === 'video' ? 'Video' : 'Document')}</Text><Text style={[styles.metaText, mine && styles.mineMeta]}>{att.duration ? `${Math.round(att.duration / 1000)} sec · ` : ''}{att.uploadedSize ? humanSize(att.uploadedSize) : att.size ? humanSize(att.size) : ''}</Text></View>
              </Pressable>
            ) : null
          )}
          {hasText ? (
            <Text style={[styles.text, mine && styles.mineText, textStyle]}>
              {renderLinkedMessageText(message.text || message.body || message.caption, mine, colors)}
            </Text>
          ) : null}
          {footer}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <SwipeToReply disabled={deleted || failed || sending || selectionMode} onReply={handleReply} color={colors.brand}>
      <View style={styles.selectRow}>
        {selectionMode ? (
          <View style={[styles.selectCheck, selected && styles.selectCheckOn]}>
            {selected ? <Ionicons name="checkmark" size={14} color={colors.onBrand} /> : null}
          </View>
        ) : null}
        <View
          style={[
            styles.rowWrap,
            { flex: 1, marginBottom: groupEnd ? 10 : 2 },
            highlighted && styles.rowHighlight,
            selected && styles.rowSelected,
          ]}
        >
          <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
            {body}
            {reactionEntries.length ? (
              <View style={[styles.reactionsRow, mine && styles.reactionsRowMine]}>
                {reactionEntries.map(([emoji, uids]) => {
                  const isActive = Boolean(currentUid && uids.includes(currentUid));
                  return (
                    <Pressable
                      key={emoji}
                      onPress={() => onToggleReaction?.(message, emoji)}
                      style={[styles.reactionPill, isActive && styles.reactionPillActive]}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${emoji} ${uids.length}`}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      <Text style={[styles.reactionCount, isActive && styles.reactionCountActive]}>{uids.length}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
        {selectionMode ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => onSelectToggle?.(message)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
          />
        ) : null}
      </View>
    </SwipeToReply>
  );
});

/* -------------------------------------------------------------------------- */
/*                                    Screen                                  */
/* -------------------------------------------------------------------------- */

// `key` remounts the screen per conversation, so no state can leak between chats.
export default function ConversationPage() {
  const params = useLocalSearchParams();
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
  return <ConversationScreen key={conversationId} conversationId={conversationId} />;
}

function ConversationScreen({ conversationId }) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { user, profile, updateProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useThemeStyles(createStyles);

  const cachedMessages = MESSAGE_CACHE.get(conversationId);
  const cachedConversation = CONVERSATION_CACHE.get(conversationId);

  const [conversation, setConversation] = useState(cachedConversation?.data || null);
  const [conversationError, setConversationError] = useState(false);
  const [messages, setMessages] = useState(cachedMessages?.messages || []);
  const [lastVisibleMessageId, setLastVisibleMessageId] = useState(cachedMessages?.cursor || null);
  const [hasMoreMessages, setHasMoreMessages] = useState(cachedMessages ? cachedMessages.hasMore : true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [loading, setLoading] = useState(!cachedConversation);
  const [messagesLoading, setMessagesLoading] = useState(!cachedMessages);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [connected, setConnected] = useState(true);
  const [showReconnect, setShowReconnect] = useState(false);
  const [draft, setDraft] = useState(() => DRAFT_CACHE.get(conversationId) || '');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [activeMessage, setActiveMessage] = useState(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [roomBusy, setRoomBusy] = useState('');
  const [relationship, setRelationship] = useState(() => RELATIONSHIP_CACHE.get(conversationId) || { state: RELATIONSHIP.NONE });
  const [relationshipLoaded, setRelationshipLoaded] = useState(() => RELATIONSHIP_CACHE.has(conversationId));
  const [pendingMessageRequest, setPendingMessageRequest] = useState(null);
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingName, setTypingName] = useState('');
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [friendRequestVisible, setFriendRequestVisible] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [bubbleCustomizerVisible, setBubbleCustomizerVisible] = useState(false);
  const [bubbleAppearance, setBubbleAppearance] = useState(() => normalizeBubbleAppearance(profile?.chatBubbleAppearance));
  const [bubbleDraft, setBubbleDraft] = useState(() => normalizeBubbleAppearance(profile?.chatBubbleAppearance));
  const [bubbleScope, setBubbleScope] = useState('global'); // what is actually saved
  const [scopeDraft, setScopeDraft] = useState('global'); // what the studio is editing
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [dialogConfig, setDialogConfig] = useState(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const [highlightId, setHighlightId] = useState(null);
  const [toast, setToast] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [voiceState, setVoiceState] = useState('idle'); // idle | recording | uploading
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [unread, setUnread] = useState(null); // { id, count } -> "N new messages" divider

  const openBubbleStudio = useCallback(() => {
    setBubbleDraft(bubbleAppearance);
    setScopeDraft(bubbleScope);
    setBubbleCustomizerVisible(true);
  }, [bubbleAppearance, bubbleScope]);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const nearBottomRef = useRef(true);
  const initialScrollDone = useRef(false);
  const loadingOlderRef = useRef(false);
  const lastMessageKeyRef = useRef(null);
  const typingTimeout = useRef(null);
  const typingSentAt = useRef(0);
  const remoteTypingTimer = useRef(null);
  const highlightTimer = useRef(null);
  const toastTimer = useRef(null);
  const scrollTimer = useRef(null);
  const blockTimer = useRef(null);
  const olderGuardTimer = useRef(null);
  const toastOpacity = useMemo(() => new Animated.Value(0), []);
  const sendScale = useMemo(() => new Animated.Value(1), []);
  const hasConnectedOnce = useRef(false);
  const disconnectedAtRef = useRef(0);
  const retryRef = useRef(null);
  const listDataRef = useRef([]);
  const messagesRef = useRef(messages);
  const selectedIdsRef = useRef([]);
  const syncedAtRef = useRef(cachedMessages?.ts || 0);
  const markedReadRef = useRef(null);
  const unreadComputedRef = useRef(false);

  // One shared animation loop for every "mine" bubble (instead of one per row).
  const bubbleMotion = useBubbleLoop(bubbleAppearance.animation, { enabled: isFocused, reduceMotion });

  /* ---------------------------- Derived values --------------------------- */

  const currentUid = user?.uid || profile?.uid;
  const currentUidRef = useRef(null);
  useEffect(() => {
    currentUidRef.current = currentUid;
  }, [currentUid]);

  // Depend on the appearance *content*, not the profile object's identity.
  const globalAppearanceKey = JSON.stringify(profile?.chatBubbleAppearance || null);
  useEffect(() => {
    let active = true;
    getConversationAppearance(currentUid, conversationId)
      .then((saved) => {
        if (!active) return;
        if (saved) {
          setBubbleScope('conversation');
          setBubbleAppearance(normalizeBubbleAppearance(saved));
        } else {
          setBubbleScope('global');
          setBubbleAppearance(normalizeBubbleAppearance(profile?.chatBubbleAppearance));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUid, globalAppearanceKey]);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => active && setReduceMotion(Boolean(enabled))).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => setReduceMotion(Boolean(enabled)));
    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  const otherId = conversation?.memberIds?.find((id) => id !== currentUid);
  const otherUser = conversation?.memberInfo?.[otherId] || {};
  const headerTitle = otherUser.name || 'Chat';

  const areFriends = relationship.state === RELATIONSHIP.FRIENDS;
  const isBlocked = relationship.state === RELATIONSHIP.BLOCKED;
  const hasSentIntro = messages.some((m) => m.senderId === currentUid && m.status !== 'failed');
  // Until the relationship is known we don't hide the composer (prevents a flash).
  const canChat = !isBlocked && (areFriends || !hasSentIntro || !relationshipLoaded);

  const recording = voiceState === 'recording';
  const voiceUploading = voiceState === 'uploading';
  const voiceBusy = recording || voiceUploading;

  const isMine = useCallback((item) => item?.senderId === currentUid, [currentUid]);

  const visibleMessages = useMemo(() => {
    const clearedAt = toMillis(conversation?.clearedFor?.[currentUid]);
    return messages.filter((message) => !clearedAt || toMillis(message.createdAt) > clearedAt);
  }, [messages, conversation?.clearedFor, currentUid]);

  const listData = useMemo(() => {
    const sameGroup = (a, b) => {
      if (!a || !b || a.senderId !== b.senderId) return false;
      const da = toDate(a.createdAt);
      const db = toDate(b.createdAt);
      if (!da || !db) return true;
      return dayKey(da) === dayKey(db) && Math.abs(db.getTime() - da.getTime()) <= GROUP_GAP_MS;
    };

    // "Seen" label only on my latest message, and only if it has been read.
    let seenKey = null;
    for (let i = visibleMessages.length - 1; i >= 0; i -= 1) {
      const m = visibleMessages[i];
      if (m.senderId === currentUid && !m.deleted) {
        seenKey = m.status === 'read' ? messageKey(m) : null;
        break;
      }
    }

    const out = [];
    let previousDay = '';
    visibleMessages.forEach((message, index) => {
      const date = toDate(message.createdAt);
      const key = date ? dayKey(date) : '';
      if (key && key !== previousDay) {
        out.push({ kind: 'date', key: `date-${key}`, label: formatDayLabel(date) });
        previousDay = key;
      }
      if (unread && message.id === unread.id) {
        out.push({ kind: 'unread', key: 'unread-divider', count: unread.count });
      }
      out.push({
        kind: 'message',
        key: messageKey(message),
        message,
        groupStart: !sameGroup(visibleMessages[index - 1], message),
        groupEnd: !sameGroup(message, visibleMessages[index + 1]),
        showSeen: messageKey(message) === seenKey,
      });
    });
    return out;
  }, [visibleMessages, currentUid, unread]);

  useEffect(() => {
    listDataRef.current = listData;
  }, [listData]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const lastMessage = visibleMessages[visibleMessages.length - 1];
  const lastKey = lastMessage ? messageKey(lastMessage) : null;
  const lastIncomingId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].senderId !== currentUid && !isLocalId(messages[i].id)) return messages[i].id;
    }
    return null;
  }, [messages, currentUid]);

  /* ------------------------------- Utilities ------------------------------ */

  const scrollToBottom = useCallback((animated = true) => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => listRef.current?.scrollToEnd?.({ animated }), 80);
  }, []);

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    Animated.timing(toastOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(''));
    }, 2000);
  }, [toastOpacity]);

  const showAlertDialog = useCallback((title, subtitle, icon = 'alert-circle-outline', iconBgColor = colors.dangerLight, iconColor = colors.error) => {
    setDialogConfig({
      title, subtitle, icon, iconBgColor, iconColor,
      primaryText: 'OK',
      primaryStyle: 'brand',
      onPrimary: () => setDialogConfig(null),
    });
  }, [colors.dangerLight, colors.error]);

  const showConfirmDialog = ({ title, subtitle, icon, iconBgColor, iconColor, primaryText, primaryStyle = 'danger', onPrimary }) => {
    setDialogConfig({
      title,
      subtitle,
      icon: icon || 'help-circle-outline',
      iconBgColor: iconBgColor || (primaryStyle === 'danger' ? colors.dangerLight : colors.brandLight),
      iconColor: iconColor || (primaryStyle === 'danger' ? colors.error : colors.brand),
      primaryText: primaryText || 'Confirm',
      primaryStyle,
      onPrimary: async () => {
        setDialogConfig(null);
        await onPrimary?.();
      },
      secondaryText: 'Cancel',
      onSecondary: () => setDialogConfig(null),
    });
  };

  /* -------------------------------- Loading ------------------------------- */

  // Conversation doc: served from cache when fresh (0 reads), otherwise one read.
  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return undefined;
    }
    const cached = CONVERSATION_CACHE.get(conversationId);
    if (cached && Date.now() - cached.ts < CONVERSATION_CACHE_TTL_MS) return undefined;

    let cancelled = false;
    fetchRecord('conversations', conversationId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          if (!CONVERSATION_CACHE.get(conversationId)) setConversationError(true);
          return;
        }
        putCache(CONVERSATION_CACHE, conversationId, { data, ts: Date.now() });
        setConversation(data);
        setConversationError(false);
      })
      .catch(() => {
        if (!cancelled && !CONVERSATION_CACHE.get(conversationId)) setConversationError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, reloadKey]);

  // Keep the conversation cache in sync with local changes (clear chat, unread...), preserving its age.
  useEffect(() => {
    if (!conversation) return;
    const prev = CONVERSATION_CACHE.get(conversationId);
    putCache(CONVERSATION_CACHE, conversationId, { data: conversation, ts: prev?.ts || Date.now() });
  }, [conversation, conversationId]);

  // Persist the last page of messages so re-entering the chat is instant and read-free.
  useEffect(() => {
    if (messagesLoading && !messages.length) return;
    const settled = messages.filter((m) => m.status !== 'sending');
    const persisted = settled.slice(-MESSAGE_CACHE_LIMIT);
    const trimmed = persisted.length < settled.length;
    putCache(MESSAGE_CACHE, conversationId, {
      messages: persisted,
      cursor: trimmed ? persisted.find((m) => !isLocalId(m.id))?.id || null : lastVisibleMessageId,
      hasMore: trimmed ? true : hasMoreMessages,
      ts: syncedAtRef.current,
    });
  }, [messages, lastVisibleMessageId, hasMoreMessages, messagesLoading, conversationId]);

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !hasMoreMessages || loadingOlderRef.current || !lastVisibleMessageId) return;
    loadingOlderRef.current = true;
    setLoadingOlderMessages(true);
    try {
      const data = await getJson(
        `/api/chat/${conversationId}/messages?limit=${CHAT_PAGE_SIZE}&cursor=${encodeURIComponent(lastVisibleMessageId)}`
      );
      if (!data?.success) return;
      const older = Array.isArray(data.messages) ? data.messages : [];
      if (older.length) {
        setMessages((prev) => mergeFetchedMessages(prev, older));
        setLastVisibleMessageId(data.cursor || older[0]?.id || lastVisibleMessageId);
      }
      setHasMoreMessages(Boolean(data.hasMore));
    } catch (error) {
      console.log('Failed to fetch older messages', error);
    } finally {
      setLoadingOlderMessages(false);
      // Hold the guard briefly so the auto-stick-to-bottom logic doesn't fight the prepend.
      clearTimeout(olderGuardTimer.current);
      olderGuardTimer.current = setTimeout(() => {
        loadingOlderRef.current = false;
      }, 350);
    }
  }, [conversationId, hasMoreMessages, lastVisibleMessageId]);

  // Initial load, live updates, and gap-filling after real reconnects.
  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;

    const fetchLatest = async (initial) => {
      try {
        const data = await getJson(`/api/chat/${conversationId}/messages?limit=${CHAT_PAGE_SIZE}`);
        if (cancelled) return;
        if (!data?.success) throw new Error(data?.message || 'Failed to load messages');
        const fetched = Array.isArray(data.messages) ? data.messages : [];
        syncedAtRef.current = Date.now();

        const current = messagesRef.current;
        const knownIds = new Set(current.map((m) => m.id));
        const hasHistory = current.some((m) => !isLocalId(m.id));
        // If the newest page doesn't overlap what we have, our cache has a hole: rebuild from the fresh page.
        const hasGap = hasHistory && fetched.length > 0 && !fetched.some((m) => knownIds.has(m.id));

        if (hasGap) {
          setMessages((prev) => mergeFetchedMessages(prev.filter((m) => isLocalId(m.id)), fetched));
          setLastVisibleMessageId(fetched[0]?.id || null);
          setHasMoreMessages(Boolean(data.hasMore));
        } else {
          setMessages((prev) => mergeFetchedMessages(prev, fetched));
          if (initial && !hasHistory) {
            setLastVisibleMessageId(fetched.length ? fetched[0]?.id || null : null);
            setHasMoreMessages(Boolean(data.hasMore));
          }
        }
        if (initial) setLoadError(false);
      } catch (error) {
        console.log('Failed to fetch messages', error);
        if (initial && !cancelled && !messagesRef.current.length) setLoadError(true);
      } finally {
        if (initial && !cancelled) setMessagesLoading(false);
      }
    };

    // Skip the network completely when the cache is fresh and this isn't a manual retry.
    const cacheIsFresh = reloadKey === 0 && syncedAtRef.current && Date.now() - syncedAtRef.current < MESSAGE_CACHE_TTL_MS;
    if (!cacheIsFresh) fetchLatest(true);
    else setMessagesLoading(false);

    const socket = getSocket();

    const handleConnect = () => {
      setConnected(true);
      socket.emit('join_conversation', conversationId);
      const wasGone = disconnectedAtRef.current ? Date.now() - disconnectedAtRef.current : 0;
      disconnectedAtRef.current = 0;
      // Only gap-fill after a meaningful outage; short blips are covered by the live socket.
      if (hasConnectedOnce.current && wasGone > MIN_GAP_REFETCH_MS) {
        fetchLatest(false);
        // Messages that failed while offline get another go. Friend-gate failures can never succeed, so skip them.
        messagesRef.current
          .filter((m) => m.status === 'failed' && m.failedReason !== FRIEND_GATE_MESSAGE)
          .forEach((m) => retryRef.current?.(m));
      }
      hasConnectedOnce.current = true;
    };
    const handleDisconnect = () => {
      setConnected(false);
      if (!disconnectedAtRef.current) disconnectedAtRef.current = Date.now();
    };

    if (socket.connected) handleConnect();
    else handleDisconnect();

    const handleReceiveMessage = (newMessage) => {
      if (newMessage?.conversationId && newMessage.conversationId !== conversationId) return;
      if (newMessage?.senderId && newMessage.senderId !== currentUidRef.current) setIsTyping(false);
      setMessages((prev) => reconcileIncomingMessage(prev, { ...newMessage, status: newMessage?.status || 'sent' }));
    };

    const handleTyping = ({ userId, isTyping: typing, name }) => {
      if (userId === currentUidRef.current) return;
      setIsTyping(Boolean(typing));
      if (typing && name) setTypingName(name);
      clearTimeout(remoteTypingTimer.current);
      if (typing) {
        // Safety net in case the "stopped typing" event is lost.
        remoteTypingTimer.current = setTimeout(() => setIsTyping(false), REMOTE_TYPING_TIMEOUT_MS);
      }
    };

    // --- Optional server events. If your backend emits them, the UI updates live
    // --- with zero extra reads; if not, these handlers simply never fire.
    const handleMessagesRead = ({ conversationId: cid, userId }) => {
      if ((cid && cid !== conversationId) || !userId || userId === currentUidRef.current) return;
      setMessages((prev) => {
        let changed = false;
        const next = prev.map((m) => {
          if (m.senderId !== currentUidRef.current || m.status === 'read' || m.status === 'sending' || m.status === 'failed') return m;
          changed = true;
          return { ...m, status: 'read' };
        });
        return changed ? next : prev;
      });
    };
    const handleMessageStatus = ({ conversationId: cid, messageId, status }) => {
      if ((cid && cid !== conversationId) || !messageId || !status) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && (STATUS_RANK[status] ?? 0) > (STATUS_RANK[m.status] ?? 0) ? { ...m, status } : m
        )
      );
    };
    const handleMessagePatch = ({ conversationId: cid, messageId, patch }) => {
      if ((cid && cid !== conversationId) || !messageId || !patch) return;
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleDisconnect);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('typing_update', handleTyping);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_status', handleMessageStatus);
    socket.on('message_updated', handleMessagePatch); // { conversationId, messageId, patch:{text,edited,reactions,deleted} }

    return () => {
      cancelled = true;
      clearTimeout(remoteTypingTimer.current);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleDisconnect);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing_update', handleTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_status', handleMessageStatus);
      socket.off('message_updated', handleMessagePatch);
    };
  }, [conversationId, reloadKey]);

  // Don't flash "Reconnecting…" for sub-second blips.
  useEffect(() => {
    if (connected) {
      setShowReconnect(false);
      return undefined;
    }
    const timer = setTimeout(() => setShowReconnect(true), RECONNECT_BANNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [connected]);

  // Cleanup timers and tell the other side we stopped typing when leaving.
  useEffect(
    () => () => {
      clearTimeout(typingTimeout.current);
      clearTimeout(highlightTimer.current);
      clearTimeout(toastTimer.current);
      clearTimeout(scrollTimer.current);
      clearTimeout(blockTimer.current);
      clearTimeout(olderGuardTimer.current);
      if (typingSentAt.current) emitSafe('typing', { conversationId, userId: currentUidRef.current, isTyping: false });
    },
    [conversationId]
  );

  // "N new messages" divider, computed once from the unread counter at open time.
  useEffect(() => {
    if (unreadComputedRef.current || messagesLoading || !conversation || !currentUid) return;
    unreadComputedRef.current = true;
    const count = Number(conversation?.unread?.[currentUid] || 0);
    if (!count) return;
    const incoming = messages.filter((m) => m.senderId !== currentUid && !m.deleted);
    if (!incoming.length) return;
    const anchor = incoming[Math.max(0, incoming.length - count)];
    setUnread({ id: anchor.id, count: Math.min(count, incoming.length) });
  }, [messagesLoading, conversation, currentUid, messages]);

  // Auto-scroll: only for genuinely new tail messages, never when older pages load.
  useEffect(() => {
    if (!lastKey) {
      lastMessageKeyRef.current = null;
      return;
    }
    if (lastMessageKeyRef.current === null) {
      lastMessageKeyRef.current = lastKey;
      return;
    }
    if (lastMessageKeyRef.current === lastKey) return;
    lastMessageKeyRef.current = lastKey;

    if (lastMessage?.senderId === currentUid || nearBottomRef.current) scrollToBottom(true);
    else setNewBelow((count) => count + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey]);

  useEffect(() => {
    if ((isTyping || voiceUploading) && nearBottomRef.current) scrollToBottom(true);
  }, [isTyping, voiceUploading, scrollToBottom]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      if (nearBottomRef.current) scrollToBottom(true);
    });
    return () => showSub.remove();
  }, [scrollToBottom]);

  // Mark as read: only when there IS a new incoming message, debounced, only while the app is
  // foregrounded, and never twice for the same message. Also pings the sender over the socket
  // so they see "Seen" instantly without anyone reading Firestore.
  useEffect(() => {
    if (!isFocused || !conversationId || !user?.uid || !lastIncomingId) return undefined;

    const run = () => {
      if (!isFocused || AppState.currentState !== 'active' || markedReadRef.current === lastIncomingId) return;
      markedReadRef.current = lastIncomingId;
      markConversationRead(conversationId, user.uid).catch(() => {
        markedReadRef.current = null;
      });
      emitSafe('messages_read', { conversationId, userId: user.uid });
      setConversation((current) =>
        current && Number(current.unread?.[user.uid] || 0) > 0
          ? { ...current, unread: { ...(current.unread || {}), [user.uid]: 0 } }
          : current
      );
    };

    const timer = setTimeout(run, MARK_READ_DEBOUNCE_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [conversationId, isFocused, user?.uid, lastIncomingId]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [otherUser.avatar]);

  // Relationship listener (needed live). Deduped so identical snapshots don't re-render the screen.
  useEffect(() => {
    if (!currentUid || !otherId) return undefined;
    return listenRelationship(currentUid, otherId, (next) => {
      putCache(RELATIONSHIP_CACHE, conversationId, next);
      setRelationship((prev) => (prev.state === next.state && prev.request?.id === next.request?.id ? prev : next));
      setRelationshipLoaded(true);
    });
  }, [currentUid, otherId, conversationId]);

  // Message-request listener is only useful while you're NOT friends. Once friends (the common
  // case) we don't open it at all: one fewer live Firestore query + all its snapshot reads.
  const needsRequestListener = Boolean(currentUid && otherId && relationshipLoaded && !areFriends && !isBlocked);
  useEffect(() => {
    if (!needsRequestListener) {
      setPendingMessageRequest(null);
      return undefined;
    }
    return listenIncomingMessageRequests(currentUid, (rows) => {
      const request = rows.find((item) => item.from === otherId && item.status === 'pending') || null;
      setPendingMessageRequest((prev) => (prev?.id === request?.id && prev?.status === request?.status ? prev : request));
    });
  }, [needsRequestListener, currentUid, otherId]);

  // Little "pop" on the send button when it becomes active.
  const activeText = editingMessage ? editText : draft;
  const canSubmit = Boolean(activeText.trim() || pendingAttachments.length) && !attachmentUploading;
  useEffect(() => {
    Animated.spring(sendScale, { toValue: canSubmit ? 1 : 0.92, useNativeDriver: true, friction: 6, tension: 160 }).start();
  }, [canSubmit, sendScale]);

  /* ------------------------------ Typing events --------------------------- */

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimeout.current);
    if (typingSentAt.current) {
      typingSentAt.current = 0;
      emitSafe('typing', { conversationId, userId: currentUid, isTyping: false });
    }
  }, [conversationId, currentUid]);

  const handleDraftChange = (text) => {
    if (editingMessage) {
      setEditText(text);
      return;
    }
    setDraft(text);
    if (text) DRAFT_CACHE.set(conversationId, text);
    else DRAFT_CACHE.delete(conversationId);

    if (!text.trim()) {
      stopTyping();
      return;
    }
    const now = Date.now();
    if (!typingSentAt.current || now - typingSentAt.current > TYPING_REFRESH_MS) {
      typingSentAt.current = now;
      emitSafe('typing', {
        conversationId,
        userId: currentUid,
        isTyping: true,
        name: profile?.name || user?.displayName || 'Student',
      });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  /* -------------------------------- Sending ------------------------------- */

  const markFailedMessage = (clientId, errorMessage) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (messageKey(message) !== clientId && message.id !== clientId) return message;
        return { ...message, status: 'failed', failedReason: errorMessage || 'Failed to send' };
      })
    );
  };

  const showSendError = (error) => {
    if (error?.message === FRIEND_GATE_MESSAGE) {
      setFriendRequestVisible(true);
      return;
    }
    showToast(error?.message || "Couldn't send. Tap the message to retry.");
    console.log('Failed to send message', error);
  };

  const deliver = async (clientId, payload, fallbackMessage) => {
    try {
      const response = await sendDirectMessage(conversation, user, profile || {}, {
        ...payload,
        clientTempId: clientId,
      });
      const next = response?.message || response || fallbackMessage;
      setMessages((prev) =>
        reconcileIncomingMessage(prev, {
          ...next,
          clientTempId: clientId,
          localId: clientId,
          status: next?.status || 'sent',
        })
      );
      return true;
    } catch (error) {
      markFailedMessage(clientId, error?.message || 'Failed to send');
      showSendError(error);
      return false;
    }
  };

  const baseOptimistic = (clientId) => ({
    id: clientId,
    localId: clientId,
    clientTempId: clientId,
    senderId: currentUid,
    senderName: profile?.name || user?.displayName || 'Student',
    createdAt: new Date().toISOString(),
    status: 'sending',
  });

  const addPickedAttachments = async (assets = []) => {
    try {
      const prepared = await Promise.all(assets.slice(0, 5).map(prepareChatAttachment));
      setPendingAttachments((current) => [...current, ...prepared].slice(0, 5));
    } catch (error) { showToast(error?.message || 'Unable to prepare that attachment.'); }
  };
  const pickPhotos = async (camera = false) => {
    setAttachmentMenuVisible(false);
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return showToast(camera ? 'Camera permission is needed to take a photo.' : 'Photo-library permission is needed to share media.');
    const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, selectionLimit: 5, quality: 1 });
    if (!result.canceled) await addPickedAttachments(result.assets || []);
  };
  const pickDocument = async () => {
    setAttachmentMenuVisible(false);
    const result = await DocumentPicker.getDocumentAsync({ type: DOCUMENT_MIME_TYPES, copyToCacheDirectory: true, multiple: true });
    if (!result.canceled) await addPickedAttachments(result.assets || []);
  };
  const send = async () => {
    const nextText = draft.trim();
    if ((!nextText && !pendingAttachments.length) || !conversation || !user || !canChat || attachmentUploading) return;

    tap('Medium');
    const clientId = createMessageClientId();
    const reply = buildReplyPayload(replyTo);
    let attachments;
    try {
      setAttachmentUploading(true);
      attachments = await Promise.all(pendingAttachments.map(async (attachment) => {
        const uploaded = await uploadChatAttachment(attachment, { targetType: 'conversation', targetId: conversationId });
        return { id: uploaded.key || `${clientId}-${attachment.name}`, url: uploaded.url || uploaded.secure_url, key: uploaded.key || '', type: attachment.kind, fileName: attachment.name, mimeType: attachment.mimeType, originalSize: attachment.originalSize, uploadedSize: Number(uploaded.uploadedSize || attachment.uploadedSize), size: Number(uploaded.uploadedSize || attachment.uploadedSize), compressionStatus: attachment.compressionStatus, duration: attachment.duration || 0 };
      }));
    } catch (error) { setAttachmentUploading(false); showSendError(error); return; }
    setAttachmentUploading(false);
    const optimistic = { ...baseOptimistic(clientId), type: 'text', text: nextText, attachments, replyTo: reply };

    setMessages((prev) => reconcileIncomingMessage(prev, optimistic));
    setDraft('');
    setPendingAttachments([]);
    DRAFT_CACHE.delete(conversationId);
    setReplyTo(null);
    stopTyping();
    scrollToBottom();

    await deliver(clientId, { type: 'text', text: nextText, attachments, replyTo: reply }, optimistic);
  };

  const sendVoiceMessage = useCallback(
    async (voiceResult) => {
      if (!conversation || !user || !canChat) return;
      if (!voiceResult?.audioUrl) {
        showToast("Voice note didn't upload. Please try again.");
        return;
      }

      const clientId = createMessageClientId();
      const reply = buildReplyPayload(replyTo);
      const voiceFields = {
        audioUrl: voiceResult.audioUrl,
        duration: voiceResult.duration || 0,
        played: false,
        cloudinaryPublicId: voiceResult.cloudinaryPublicId || voiceResult.publicId || '',
      };
      const optimistic = {
        id: clientId,
        localId: clientId,
        clientTempId: clientId,
        senderId: currentUid,
        senderName: profile?.name || user.displayName || 'Student',
        createdAt: new Date().toISOString(),
        status: 'sending',
        type: 'voice',
        ...voiceFields,
        replyTo: reply,
      };

      setMessages((prev) => reconcileIncomingMessage(prev, optimistic));
      setReplyTo(null);
      scrollToBottom();

      try {
        const response = await sendDirectMessage(conversation, user, profile || {}, {
          type: 'voice',
          ...voiceFields,
          replyTo: reply,
          clientTempId: clientId,
        });
        const next = response?.message || response || { ...optimistic, status: 'sent' };
        setMessages((prev) =>
          reconcileIncomingMessage(prev, { ...next, clientTempId: clientId, localId: clientId, status: next?.status || 'sent' })
        );
      } catch (error) {
        markFailedMessage(clientId, error?.message || 'Failed to send');
        showSendError(error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canChat, conversation, user, profile, replyTo, currentUid]
  );

  const sendSticker = async (sticker) => {
    if (!sticker || !conversation || !user || !canChat) return;
    const clientId = createMessageClientId();
    const reply = buildReplyPayload(replyTo);
    const stickerFields = { id: sticker.id, type: sticker.type, assetUrl: sticker.assetUrl, thumbnailUrl: sticker.thumbnailUrl, name: sticker.name, editor: sticker.editor || null };
    const optimistic = { ...baseOptimistic(clientId), type: 'sticker', stickerId: sticker.id, sticker: stickerFields, replyTo: reply };

    setMessages((prev) => reconcileIncomingMessage(prev, optimistic));
    setReplyTo(null);
    scrollToBottom();
    await deliver(clientId, { type: 'sticker', stickerId: sticker.id, replyTo: reply }, { ...optimistic, status: 'sent' });
  };

  const retrySendMessage = async (message) => {
    if (!conversation || !user || isBlocked || !message || message.status === 'sending') return;
    const clientId = messageKey(message);
    setMessages((prev) =>
      prev.map((entry) => (messageKey(entry) === clientId ? { ...entry, status: 'sending', failedReason: null } : entry))
    );
    await deliver(clientId, payloadFromMessage(message), message);
  };
  useEffect(() => {
    retryRef.current = retrySendMessage;
  });
  const handleRetry = useCallback((message) => retryRef.current?.(message), []);

  const discardFailedMessage = (message) => {
    const key = messageKey(message);
    setMessages((prev) => prev.filter((entry) => messageKey(entry) !== key));
  };

  /* ------------------------------- Message sheet -------------------------- */

  const openSheet = useCallback((message) => {
    tap('Light');
    setConfirmingDelete(false);
    setActiveMessage(message);
  }, []);

  const closeSheet = () => {
    setActiveMessage(null);
    setConfirmingDelete(false);
  };

  const setSelection = useCallback((ids, mode) => {
    selectedIdsRef.current = ids;
    setSelectedMessageIds(ids);
    setMultiSelectMode(mode);
  }, []);

  const toggleMessageSelection = useCallback((message) => {
    if (!message || message.deleted) return;
    const prev = selectedIdsRef.current;
    const next = prev.includes(message.id) ? prev.filter((id) => id !== message.id) : [...prev, message.id];
    // Keep selection mode open even at zero selected, so the bar's hint stays and Cancel is the explicit exit.
    setSelection(next, true);
  }, [setSelection]);

  const clearMessageSelection = useCallback(() => setSelection([], false), [setSelection]);

  const withinEditWindow = (message) => {
    const sentAt = toMillis(message?.createdAt);
    return Boolean(sentAt && Date.now() - sentAt <= EDIT_WINDOW_MS);
  };

  const saveBubbleAppearance = useCallback(async () => {
    const next = normalizeBubbleAppearance(bubbleDraft);
    setAppearanceSaving(true);
    try {
      if (scopeDraft === 'conversation') await saveConversationAppearance(currentUid, conversationId, next);
      else {
        // A global choice is meant to apply to this chat too. Remove any
        // previously saved local override so it cannot reappear on remount.
        await updateProfile({ chatBubbleAppearance: next });
        await clearConversationAppearance(currentUid, conversationId);
      }
      setBubbleScope(scopeDraft);
      setBubbleAppearance(next);
      setBubbleCustomizerVisible(false);
      showToast(scopeDraft === 'conversation' ? 'Appearance saved for this chat' : 'Appearance saved for all your chats');
    } catch (error) {
      showAlertDialog('Appearance not saved', error?.message || 'Please try again when you are connected.');
    } finally {
      setAppearanceSaving(false);
    }
  }, [bubbleDraft, scopeDraft, conversationId, currentUid, showAlertDialog, showToast, updateProfile]);

  const resetBubbleAppearance = useCallback(async () => {
    const globalAppearance = normalizeBubbleAppearance(profile?.chatBubbleAppearance);
    if (scopeDraft !== 'conversation') {
      setBubbleDraft(DEFAULT_BUBBLE_APPEARANCE);
      return;
    }
    try {
      await clearConversationAppearance(currentUid, conversationId);
      setBubbleScope('global');
      setScopeDraft('global');
      setBubbleAppearance(globalAppearance);
      setBubbleDraft(globalAppearance);
      showToast('This chat now uses your global appearance');
    } catch {
      showAlertDialog('Could not reset appearance', 'Please try again.');
    }
  }, [scopeDraft, conversationId, currentUid, profile?.chatBubbleAppearance, showAlertDialog, showToast]);

  const withinVoiceDeleteWindow = (message) => {
    const sentAt = toMillis(message?.createdAt);
    return Boolean(sentAt && Date.now() - sentAt <= VOICE_DELETE_WINDOW_MS);
  };

  const canDeleteMessage = (message) =>
    Boolean(
      message &&
      isMine(message) &&
      !message.deleted &&
      !isLocalId(message.id) &&
      message.status !== 'failed' &&
      message.status !== 'sending' &&
      (message.type === 'voice' ? withinVoiceDeleteWindow(message) : withinEditWindow(message))
    );

  const startReply = useCallback((message) => {
    if (!message || message.deleted) return;
    setEditingMessage(null);
    setEditText('');
    setReplyTo(message);
    setTimeout(() => inputRef.current?.focus?.(), 50);
  }, []);

  const handleReplyFromSheet = () => {
    if (activeMessage) startReply(activeMessage);
    closeSheet();
  };

  const handleCopyFromSheet = async () => {
    if (activeMessage?.text) {
      await Clipboard.setStringAsync(activeMessage.text);
      showToast('Copied to clipboard');
    }
    closeSheet();
  };

  const selectedMessages = useMemo(
    () => messages.filter((message) => selectedMessageIds.includes(message.id)),
    [messages, selectedMessageIds]
  );
  const selectionCanDelete = selectedMessages.length > 0 && selectedMessages.every(canDeleteMessage);

  const handleCopySelectedMessages = async () => {
    const text = selectedMessages
      .map((message) => {
        const value = String(message.text || message.body || message.caption || '').trim();
        return value || (message.type === 'voice' ? '[Voice message]' : '');
      })
      .filter(Boolean)
      .join('\n\n');

    if (!text) {
      showAlertDialog('Nothing to copy', 'Select a text message to copy its content.');
      return;
    }
    await Clipboard.setStringAsync(text);
    showToast(`${selectedMessages.length} message${selectedMessages.length > 1 ? 's' : ''} copied`);
    clearMessageSelection();
  };

  // Optimistic: bubbles flip to "deleted" instantly; any that fail are restored.
  const handleDeleteSelectedMessages = async () => {
    if (!conversationId || !selectionCanDelete) return;
    const targets = selectedMessages;
    const ids = new Set(targets.map((m) => m.id));
    setMessages((prev) => prev.map((m) => (ids.has(m.id) ? { ...m, deleted: true } : m)));
    clearMessageSelection();

    const results = await Promise.allSettled(
      targets.map((m) => deleteDirectMessage(conversationId, m.id, { voice: m.type === 'voice' }))
    );
    const failedIds = new Set(targets.filter((_, i) => results[i].status === 'rejected').map((m) => m.id));
    if (failedIds.size) {
      setMessages((prev) => prev.map((m) => (failedIds.has(m.id) ? { ...m, deleted: false } : m)));
      showAlertDialog("Some messages weren't deleted", `${failedIds.size} message${failedIds.size > 1 ? 's' : ''} couldn't be deleted. Please try again.`);
    } else {
      showToast(`${targets.length} message${targets.length > 1 ? 's' : ''} deleted`);
    }
  };

  const startEditingMessage = () => {
    if (!activeMessage || !isMine(activeMessage) || !withinEditWindow(activeMessage)) return;
    if (activeMessage.type && activeMessage.type !== 'text') return;
    setReplyTo(null);
    setEditingMessage(activeMessage);
    setEditText(activeMessage.text || '');
    closeSheet();
    setTimeout(() => inputRef.current?.focus?.(), 80);
  };

  const cancelEditingMessage = () => {
    setEditingMessage(null);
    setEditText('');
  };

  // Optimistic edit: the new text + "Edited" appear immediately; reverted if the server rejects it.
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
      await updateDirectMessage(conversationId, target.id, nextText, currentUid);
    } catch (error) {
      setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, ...previous } : m)));
      showAlertDialog('Edit failed', error?.message || 'Unable to edit this message.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeMessage || !conversationId) return;
    if (!canDeleteMessage(activeMessage)) {
      showAlertDialog(
        'Delete unavailable',
        activeMessage.type === 'voice'
          ? 'Voice messages can only be deleted within 30 minutes of sending.'
          : 'Messages can only be deleted within 1 hour of sending.'
      );
      setConfirmingDelete(false);
      return;
    }
    const target = activeMessage;
    closeSheet();
    setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, deleted: true } : m)));
    try {
      await deleteDirectMessage(conversationId, target.id, { voice: target.type === 'voice' });
    } catch (error) {
      setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, deleted: false } : m)));
      showAlertDialog('Delete failed', error?.message || 'Unable to delete this message.');
    }
  };

  /* ------------------------------ Chat actions ---------------------------- */

  const clearChat = async () => {
    if (!conversationId || !currentUid) return;
    setRoomBusy('clear');
    try {
      await clearConversationForUser(conversationId, currentUid);
      // Use the newest message's own timestamp instead of the device clock, so clock skew can't hide or leak messages.
      const clearedAt = new Date(toMillis(lastMessage?.createdAt) || Date.now());
      setReplyTo(null);
      setActiveMessage(null);
      setUnread(null);
      setConversation((current) => ({
        ...current,
        clearedFor: { ...(current?.clearedFor || {}), [currentUid]: clearedAt },
        unread: { ...(current?.unread || {}), [currentUid]: 0 },
      }));
      showToast('Chat cleared');
    } catch (error) {
      showAlertDialog('Clear chat failed', error?.message || 'Unable to clear this chat.');
    } finally {
      setRoomBusy('');
    }
  };

  const deleteChat = async () => {
    if (!conversationId || !currentUid) return;
    setRoomBusy('delete');
    try {
      await deleteConversationForUser(conversationId, currentUid);
      DRAFT_CACHE.delete(conversationId);
      MESSAGE_CACHE.delete(conversationId);
      CONVERSATION_CACHE.delete(conversationId);
      RELATIONSHIP_CACHE.delete(conversationId);
      router.back();
    } catch (error) {
      showAlertDialog('Delete chat failed', error?.message || 'Unable to delete this chat.');
      setRoomBusy('');
    }
  };

  const showChatOptions = () => {
    if (roomBusy) return;
    setShowOptionsSheet(true);
  };

  const handleViewProfile = () => {
    setShowOptionsSheet(false);
    if (otherId) router.navigate(`/view-user-profile/${otherId}`);
  };

  const handlePromptClearChat = () => {
    setShowOptionsSheet(false);
    setTimeout(() => {
      showConfirmDialog({
        title: 'Clear this chat?',
        subtitle: 'Messages will be removed from your view only.',
        icon: 'brush-outline',
        iconBgColor: colors.brandLight,
        iconColor: colors.brand,
        primaryText: 'Clear chat',
        primaryStyle: 'danger',
        onPrimary: clearChat,
      });
    }, 200);
  };

  const handlePromptDeleteChat = () => {
    setShowOptionsSheet(false);
    setTimeout(() => {
      showConfirmDialog({
        title: 'Delete this chat?',
        subtitle: 'This chat room will disappear from your list until a new message arrives.',
        icon: 'trash-outline',
        iconBgColor: colors.dangerLight,
        iconColor: colors.error,
        primaryText: 'Delete chat',
        primaryStyle: 'danger',
        onPrimary: deleteChat,
      });
    }, 200);
  };

  /* ------------------------------ Relationship ---------------------------- */

  const runRelationshipAction = async (title, fallback, action) => {
    setRelationshipBusy(true);
    try {
      await action();
    } catch (error) {
      showAlertDialog(title, error?.message || fallback);
    } finally {
      setRelationshipBusy(false);
    }
  };

  const handleAddFriend = () => {
    if (!currentUid || !otherId) return;
    runRelationshipAction('Friend request', 'Could not send friend request.', () =>
      sendFriendRequest({
        currentUid,
        targetUid: otherId,
        currentProfile: profile,
        targetProfile: { ...otherUser, uid: otherId },
      })
    );
  };

  const handleAcceptMessageRequest = () => {
    if (!pendingMessageRequest || !currentUid) return;
    runRelationshipAction('Message request', 'Could not accept request.', () =>
      acceptMessageRequest({ request: pendingMessageRequest, currentUid, currentProfile: profile })
    );
  };

  const handleDeclineMessageRequest = () => {
    if (!pendingMessageRequest || !currentUid) return;
    runRelationshipAction('Message request', 'Could not decline request.', () =>
      declineMessageRequest({ request: pendingMessageRequest, currentUid, currentProfile: profile })
    );
  };

  const handleAcceptFriend = () => {
    if (!relationship.request || !currentUid) return;
    runRelationshipAction('Friend request', 'Could not accept friend request.', () =>
      acceptFriendRequest({ request: relationship.request, currentUid, currentProfile: profile })
    );
  };

  const handleReportUser = () => {
    if (!currentUid || !otherId) return;
    setShowOptionsSheet(false);
    setTimeout(() => {
      showConfirmDialog({
        title: 'Report this user?',
        subtitle: `Send a moderation report about ${headerTitle}. This creates a flagged record with the chat context for review.`,
        icon: 'flag-outline',
        iconBgColor: colors.dangerLight,
        iconColor: colors.error,
        primaryText: 'Submit report',
        primaryStyle: 'danger',
        onPrimary: async () => {
          try {
            await submitReport({
              reportType: 'harassment',
              title: `Report: ${headerTitle}`,
              description: [
                `User report against ${headerTitle} (${otherId}) in a direct chat.`,
                `Conversation ID: ${conversationId}`,
                `Reporter UID: ${currentUid}`,
                'Reason: Inappropriate behavior or safety concern in chat.',
                'Please review and take the appropriate action.',
              ].join('\n'),
            });
            showToast('Report submitted');
          } catch (error) {
            showAlertDialog('Report failed', error?.message || 'Unable to submit the report right now.');
          }
        },
      });
    }, 200);
  };

  const handlePromptBlockUser = () => {
    if (!currentUid || !otherId) return;
    setShowOptionsSheet(false);
    setTimeout(() => {
      showConfirmDialog({
        title: 'Block this user?',
        subtitle: `You will no longer be able to message ${headerTitle} or receive messages from them.`,
        icon: 'ban-outline',
        iconBgColor: colors.dangerLight,
        iconColor: colors.error,
        primaryText: 'Block user',
        primaryStyle: 'danger',
        onPrimary: async () => {
          try {
            setRelationshipBusy(true);
            await blockStudent({
              currentUid,
              targetUid: otherId,
              currentProfile: profile,
              targetProfile: { ...otherUser, uid: otherId },
            });
            setRelationship({ state: RELATIONSHIP.BLOCKED, blockedByMe: true });
            showToast(`${headerTitle} has been blocked`);
            clearTimeout(blockTimer.current);
            blockTimer.current = setTimeout(() => router.back(), 500);
          } catch (error) {
            showAlertDialog('Could not block user', error?.message || 'Please try again.');
          } finally {
            setRelationshipBusy(false);
          }
        },
      });
    }, 200);
  };

  const handlePromptUnblockUser = () => {
    if (!currentUid || !otherId) return;
    setShowOptionsSheet(false);
    setTimeout(() => {
      showConfirmDialog({
        title: 'Unblock this user?',
        subtitle: 'You will be able to view their profile and send a request again.',
        icon: 'ban-outline',
        iconBgColor: colors.brandLight,
        iconColor: colors.brand,
        primaryText: 'Unblock user',
        primaryStyle: 'default',
        onPrimary: async () => {
          try {
            setRelationshipBusy(true);
            await unblockStudent({ currentUid, targetUid: otherId });
            setRelationship({ state: RELATIONSHIP.NONE });
            showToast(`${headerTitle} has been unblocked`);
          } catch (error) {
            showAlertDialog('Could not unblock user', error?.message || 'Please try again.');
          } finally {
            setRelationshipBusy(false);
          }
        },
      });
    }, 200);
  };

  /* ------------------------------ List behavior --------------------------- */

  const jumpToMessage = useCallback(
    (id) => {
      const index = listDataRef.current.findIndex(
        (entry) => entry.message && (entry.message.id === id || entry.message.clientTempId === id)
      );
      if (index < 0) {
        showToast('That message is further up in the chat');
        return;
      }
      listRef.current?.scrollToIndex?.({ index, viewPosition: 0.5, animated: true });
      setHighlightId(listDataRef.current[index].message.id);
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightId(null), 1600);
    },
    [showToast]
  );

  const handleScroll = useCallback(
    (event) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distance = contentSize.height - layoutMeasurement.height - contentOffset.y;
      nearBottomRef.current = distance < 120;
      const far = distance > 320;
      setShowScrollDown((prev) => (prev === far ? prev : far));
      if (distance < 120) setNewBelow((count) => (count === 0 ? count : 0));
      if (initialScrollDone.current && contentOffset.y <= 48) loadOlderMessages();
    },
    [loadOlderMessages]
  );

  const handleContentSizeChange = useCallback(() => {
    if (!initialScrollDone.current) {
      initialScrollDone.current = true;
      listRef.current?.scrollToEnd?.({ animated: false });
      return;
    }
    // Late-growing content (photos finishing, typing bubble) keeps the view pinned to the bottom.
    if (nearBottomRef.current && !loadingOlderRef.current) listRef.current?.scrollToEnd?.({ animated: false });
  }, []);

  const handleScrollToIndexFailed = useCallback((info) => {
    listRef.current?.scrollToOffset?.({ offset: info.averageItemLength * info.index, animated: true });
    setTimeout(() => {
      listRef.current?.scrollToIndex?.({ index: info.index, viewPosition: 0.5, animated: true });
    }, 350);
  }, []);

  // Optimistic reaction: the pill appears immediately; reverted if the write fails.
  const toggleReaction = useCallback(
    async (message, emoji) => {
      if (!message || !emoji || !conversationId || !user?.uid || isLocalId(message.id)) return;
      tap('Light');
      const uid = user.uid;
      const apply = (m) => (m.id === message.id ? { ...m, reactions: toggleReactionLocal(m.reactions, emoji, uid) } : m);
      setMessages((prev) => prev.map(apply));
      try {
        await toggleDirectMessageReaction(conversationId, message.id, emoji, uid);
      } catch (error) {
        setMessages((prev) => prev.map(apply)); // toggling again restores the previous state
        showToast(error?.message || "Couldn't add that reaction.");
      }
    },
    [conversationId, showToast, user?.uid]
  );

  const selectedSet = useMemo(() => new Set(selectedMessageIds), [selectedMessageIds]);

  const renderItem = useCallback(
    ({ item }) => {
      if (item.kind === 'date') {
        return (
          <View style={styles.dateWrap}>
            <View style={styles.datePill}>
              <Text style={styles.dateText}>{item.label}</Text>
            </View>
          </View>
        );
      }
      if (item.kind === 'unread') {
        return (
          <View style={styles.unreadWrap}>
            <View style={styles.unreadLine} />
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>{item.count} new message{item.count > 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.unreadLine} />
          </View>
        );
      }
      const { message } = item;
      return (
        <MessageRow
          message={message}
          groupStart={item.groupStart}
          groupEnd={item.groupEnd}
          mine={message.senderId === currentUid}
          highlighted={highlightId === message.id}
          selected={selectedSet.has(message.id)}
          selectionMode={multiSelectMode}
          showSeen={item.showSeen}
          styles={styles}
          colors={colors}
          currentUid={currentUid}
          onLongPress={openSheet}
          onSelectToggle={toggleMessageSelection}
          onReply={startReply}
          onRetry={handleRetry}
          onJumpToReply={jumpToMessage}
          onToggleReaction={toggleReaction}
          onOpenImage={setImagePreview}
          bubbleAppearance={bubbleAppearance}
          bubbleMotion={bubbleMotion}
        />
      );
    },
    [styles, colors, currentUid, highlightId, multiSelectMode, selectedSet, openSheet, startReply, handleRetry, jumpToMessage, toggleMessageSelection, toggleReaction, bubbleAppearance, bubbleMotion]
  );

  /* ------------------------------- Renderers ------------------------------ */

  const renderRelationshipPrompt = () => {
    if (!otherId || !relationshipLoaded || areFriends) return null;

    const isReceived = relationship.state === RELATIONSHIP.RECEIVED;
    const isSent = relationship.state === RELATIONSHIP.SENT;
    const hasIntroRequest = !!pendingMessageRequest;

    const title = hasIntroRequest
      ? 'Accept intro message'
      : isReceived
        ? 'Friend request waiting'
        : isSent
          ? 'Friend request sent'
          : isBlocked
            ? 'Chat unavailable'
            : 'Add friend to keep chatting';

    const text = hasIntroRequest
      ? `${headerTitle} sent you an introductory message. Accept to become friends and continue this chat.`
      : isReceived
        ? `${headerTitle} wants to connect. Accept the request to continue this chat freely.`
        : isSent
          ? 'You can continue chatting after the request is accepted.'
          : isBlocked
            ? 'Messaging is unavailable for this student.'
            : hasSentIntro
              ? 'You have sent an intro message. Add them as a friend to continue chatting.'
              : 'You can send one intro message before becoming friends.';

    const busyIcon = (icon, color) =>
      relationshipBusy ? <ActivityIndicator color={color} size="small" /> : <Ionicons name={icon} size={15} color={color} />;

    return (
      <View style={styles.relationshipCard}>
        <View style={styles.relationshipIcon}>
          <Ionicons
            name={isBlocked ? 'ban-outline' : hasIntroRequest || isReceived ? 'person-add-outline' : 'people-outline'}
            size={19}
            color={isBlocked ? colors.error : colors.brandText}
          />
        </View>
        <View style={styles.relationshipCopy}>
          <Text style={styles.relationshipTitle}>{title}</Text>
          <Text style={styles.relationshipText}>{text}</Text>
        </View>
        {hasIntroRequest ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.relationshipButton} onPress={handleAcceptMessageRequest} disabled={relationshipBusy} accessibilityRole="button">
              {busyIcon('checkmark', colors.onBrand)}
              <Text style={styles.relationshipButtonText}>Accept</Text>
            </Pressable>
            <Pressable style={[styles.relationshipButton, styles.relationshipButtonMuted]} onPress={handleDeclineMessageRequest} disabled={relationshipBusy} accessibilityRole="button">
              {busyIcon('close', colors.textSecondary)}
              <Text style={[styles.relationshipButtonText, styles.relationshipButtonTextMuted]}>Decline</Text>
            </Pressable>
          </View>
        ) : isReceived ? (
          <Pressable style={styles.relationshipButton} onPress={handleAcceptFriend} disabled={relationshipBusy} accessibilityRole="button">
            {busyIcon('checkmark', colors.onBrand)}
            <Text style={styles.relationshipButtonText}>Accept</Text>
          </Pressable>
        ) : isSent || isBlocked ? (
          <View style={[styles.relationshipButton, styles.relationshipButtonMuted]}>
            <Text style={[styles.relationshipButtonText, styles.relationshipButtonTextMuted]}>{isSent ? 'Pending' : 'Blocked'}</Text>
          </View>
        ) : (
          <Pressable style={styles.relationshipButton} onPress={handleAddFriend} disabled={relationshipBusy} accessibilityRole="button">
            {busyIcon('person-add-outline', colors.onBrand)}
            <Text style={styles.relationshipButtonText}>Add</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderSheetActions = () => {
    const m = activeMessage;
    if (!m) return null;
    const mine = isMine(m);
    const failed = m.status === 'failed';
    const sending = m.status === 'sending';
    const editable = mine && !failed && !sending && withinEditWindow(m);
    const deletable = canDeleteMessage(m);
    const isText = !m.type || m.type === 'text';
    const canReact = !failed && !sending && !m.deleted && !isLocalId(m.id);
    const opt = { styles, colors };

    return (
      <>
        {canReact ? (
          <View style={styles.sheetReactions}>
            {QUICK_REACTIONS.map((emoji) => {
              const active = Boolean(currentUid && Array.isArray(m.reactions?.[emoji]) && m.reactions[emoji].includes(currentUid));
              return (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    closeSheet();
                    toggleReaction(m, emoji);
                  }}
                  style={[styles.sheetReactionBtn, active && styles.sheetReactionBtnActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`React with ${emoji}`}
                >
                  <Text style={styles.sheetReactionEmoji}>{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Text style={styles.sheetPreview} numberOfLines={2}>{previewOf(m)}</Text>
        {failed ? (
          <>
            <SheetOption {...opt} icon="refresh" label="Retry sending" onPress={() => { closeSheet(); handleRetry(m); }} />
            <SheetOption {...opt} icon="trash-outline" label="Discard message" danger onPress={() => { discardFailedMessage(m); closeSheet(); }} />
          </>
        ) : (
          <>
            {!sending ? <SheetOption {...opt} icon="arrow-undo-outline" label="Reply" onPress={handleReplyFromSheet} /> : null}
            {m.text ? <SheetOption {...opt} icon="copy-outline" label="Copy text" onPress={handleCopyFromSheet} /> : null}
            {editable && isText ? <SheetOption {...opt} icon="create-outline" label="Edit message" onPress={startEditingMessage} /> : null}
            {!sending && !m.deleted ? (
              <SheetOption {...opt} icon="checkbox-outline" label="Select" onPress={() => { setSelection([m.id], true); closeSheet(); }} />
            ) : null}
            {deletable ? <SheetOption {...opt} icon="trash-outline" label="Delete message" danger onPress={() => setConfirmingDelete(true)} /> : null}
            {mine && !deletable && !sending ? (
              <Text style={styles.sheetHint}>
                {m.type === 'voice'
                  ? 'Voice messages can be deleted within 30 minutes of sending.'
                  : 'Messages can be edited or deleted within 1 hour of sending.'}
              </Text>
            ) : null}
          </>
        )}
      </>
    );
  };

  /* --------------------------------- Render -------------------------------- */

  const nearLimit = activeText.length > MAX_LENGTH * 0.85;
  const showSend = canSubmit || Boolean(editingMessage);

  const statusText = isTyping
    ? `${typingName || 'Student'} is typing…`
    : isBlocked
      ? 'Unavailable'
      : areFriends
        ? 'Friends'
        : 'Direct message';

  const listHeader = loadingOlderMessages ? (
    <View style={styles.listHeader}><ActivityIndicator size="small" color={colors.brand} /></View>
  ) : !hasMoreMessages && visibleMessages.length ? (
    <View style={styles.listHeader}><Text style={styles.listHeaderText}>Beginning of your conversation</Text></View>
  ) : null;

  const listFooter =
    isTyping || voiceUploading ? (
      <>
        {voiceUploading ? <VoicePendingBubble styles={styles} colors={colors} /> : null}
        {isTyping ? <TypingBubble styles={styles} reduceMotion={reduceMotion} /> : null}
      </>
    ) : null;

  // The conversation itself couldn't be loaded and nothing is cached: say so, and offer a retry.
  if (conversationError && !conversation) {
    return (
      <ScreenShell showHeader={false} loading={false} scrollable={false} contentPadding={false}>
        <View style={styles.centerFill}>
          <EmptyState title="Couldn't open this chat" description="Check your connection and try again." />
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setConversationError(false);
              setLoading(true);
              setReloadKey((key) => key + 1);
            }}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color={colors.onBrand} />
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.sheetCancelText}>Go back</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell showHeader={false} loading={loading} scrollable={false} contentPadding={false}>
      <View style={{ flex: 1 }}>
        <ChatBackground appearance={bubbleAppearance} colors={colors} isDark={isDark} styles={styles} />
        <FriendRequestModal
          visible={friendRequestVisible}
          person={{ ...otherUser, uid: otherId }}
          onClose={() => setFriendRequestVisible(false)}
          onAdd={() =>
            sendFriendRequest({
              currentUid,
              targetUid: otherId,
              currentProfile: profile,
              targetProfile: { ...otherUser, uid: otherId },
            })
          }
        />

        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            style={styles.avatarWrapper}
            onPress={() => otherId && router.navigate(`/view-user-profile/${otherId}`)}
            disabled={!otherId}
            accessibilityRole="button"
            accessibilityLabel={`View ${headerTitle}'s profile`}
          >
            {otherUser.avatar && !avatarFailed ? (
              <Image source={{ uri: otherUser.avatar }} style={styles.avatar} onError={() => setAvatarFailed(true)} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{(otherUser.name || 'S')[0].toUpperCase()}</Text>
              </View>
            )}
            {areFriends ? (
              <View style={styles.friendBadge}>
                <Ionicons name="people" size={9} color={colors.onBrand} />
              </View>
            ) : null}
          </Pressable>
          <View style={styles.headerMeta}>
            <Text style={styles.headerName} numberOfLines={1}>{headerTitle}</Text>
            <View style={styles.headerStatusRow}>
              {isTyping ? <View style={styles.headerStatusDot} /> : null}
              <Text style={[styles.headerHint, isTyping && styles.headerHintActive]} numberOfLines={1}>{statusText}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}
            onPress={showChatOptions}
            disabled={!!roomBusy}
            accessibilityRole="button"
            accessibilityLabel="Open chat options"
          >
            {roomBusy ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="ellipsis-vertical" size={18} color={colors.textPrimary} />}
          </Pressable>
        </View>

        {showReconnect && !messagesLoading ? (
          <View style={styles.banner}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={styles.bannerText}>Reconnecting… messages will still send</Text>
          </View>
        ) : null}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={{ flex: 1 }}
        >
          <View style={styles.messagesPane}>
            {messagesLoading && !messages.length ? (
              <MessageSkeleton styles={styles} />
            ) : loadError && !messages.length ? (
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
                  <Ionicons name="refresh" size={16} color={colors.onBrand} />
                  <Text style={styles.retryButtonText}>Try again</Text>
                </Pressable>
              </View>
            ) : listData.length || voiceUploading ? (
              <FlatList
                ref={listRef}
                data={listData}
                keyExtractor={(item) => item.key}
                renderItem={renderItem}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={handleContentSizeChange}
                onScrollToIndexFailed={handleScrollToIndexFailed}
                maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                ListHeaderComponent={listHeader}
                ListFooterComponent={listFooter}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                windowSize={11}
                maxToRenderPerBatch={12}
                updateCellsBatchingPeriod={40}
                removeClippedSubviews={Platform.OS === 'android'}
              />
            ) : (
              <EmptyState
                title="No messages yet"
                description={canChat ? 'Say hello and start the conversation.' : 'Messages will show up here once you are connected.'}
              />
            )}

            {showScrollDown && !multiSelectMode ? (
              <Pressable
                style={[styles.scrollFab, newBelow > 0 && styles.scrollPill]}
                onPress={() => {
                  setNewBelow(0);
                  scrollToBottom(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={newBelow > 0 ? `Scroll to latest, ${newBelow} new messages` : 'Scroll to latest message'}
              >
                <Ionicons name="chevron-down" size={20} color={newBelow > 0 ? colors.onBrand : colors.textPrimary} />
                {newBelow > 0 ? <Text style={styles.scrollPillText}>{newBelow > 99 ? '99+' : newBelow} new</Text> : null}
              </Pressable>
            ) : null}

            {multiSelectMode ? (
              <View style={styles.selectionBar}>
                <Text style={styles.selectionTitle}>
                  {selectedMessageIds.length ? `${selectedMessageIds.length} selected` : 'Tap messages to select them'}
                </Text>
                <View style={styles.selectionActions}>
                  <Pressable
                    style={[styles.selectionButton, !selectedMessageIds.length && styles.selectionButtonDisabled]}
                    onPress={handleCopySelectedMessages}
                    disabled={!selectedMessageIds.length}
                    accessibilityRole="button"
                  >
                    <Ionicons name="copy-outline" size={16} color={colors.textPrimary} />
                    <Text style={styles.selectionButtonText}>Copy</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.selectionButton, styles.selectionButtonDanger, !selectionCanDelete && styles.selectionButtonDisabled]}
                    onPress={handleDeleteSelectedMessages}
                    disabled={!selectionCanDelete}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text style={[styles.selectionButtonText, { color: colors.error }]}>Delete</Text>
                  </Pressable>
                  <Pressable style={styles.selectionButton} onPress={clearMessageSelection} accessibilityRole="button">
                    <Text style={styles.selectionButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {toast ? (
              <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
                <Text style={styles.toastText}>{toast}</Text>
              </Animated.View>
            ) : null}
          </View>

          {renderRelationshipPrompt()}

          {canChat ? (
            <View style={styles.composerContainer}>
              {!editingMessage && pendingAttachments.length ? pendingAttachments.map((attachment, index) => (
                <View key={`${attachment.uri}-${index}`} style={styles.attachmentPreviewRow}>
                  <View style={styles.attachmentPreviewThumb}>{attachment.kind === 'image' ? <Image source={{ uri: attachment.uri }} style={styles.attachmentPreviewImage} /> : <Ionicons name={attachment.kind === 'video' ? 'videocam-outline' : 'document-text-outline'} size={19} color={colors.brand} />}</View>
                  <Text style={styles.attachmentPreviewText} numberOfLines={2}>{attachment.name}{attachment.compressionStatus === 'optimized' ? `\nOptimized: ${humanSize(attachment.originalSize)} → ${humanSize(attachment.uploadedSize)}` : `\n${humanSize(attachment.originalSize)}`}</Text>
                  <Pressable onPress={() => setPendingAttachments((all) => all.filter((_, itemIndex) => itemIndex !== index))} accessibilityLabel="Remove attachment"><Ionicons name="close-circle" size={22} color={colors.textTertiary} /></Pressable>
                </View>
              )) : null}
              {editingMessage ? (
                <View style={styles.composerBanner}>
                  <Ionicons name="create-outline" size={18} color={colors.brand} />
                  <View style={styles.composerBannerBody}>
                    <Text style={styles.composerBannerLabel}>Editing message</Text>
                    <Text style={styles.composerBannerText} numberOfLines={1}>{editingMessage.text || ''}</Text>
                  </View>
                  <Pressable style={styles.composerBannerClose} onPress={cancelEditingMessage} accessibilityRole="button" accessibilityLabel="Cancel editing">
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : replyTo ? (
                <View style={styles.composerBanner}>
                  <Ionicons name="arrow-undo" size={18} color={colors.brand} />
                  <View style={styles.composerBannerBody}>
                    <Text style={styles.composerBannerLabel}>Replying to {replyTo.senderName || 'Student'}</Text>
                    <Text style={styles.composerBannerText} numberOfLines={1}>{previewOf(replyTo)}</Text>
                  </View>
                  <Pressable style={styles.composerBannerClose} onPress={() => setReplyTo(null)} accessibilityRole="button" accessibilityLabel="Cancel reply">
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : null}

              {/* Smart composer: sticker + input + (send when there is text, mic when there isn't). */}
              <View style={styles.composer}>
                {!editingMessage && !voiceBusy ? (
                  <Pressable style={styles.stickerButton} onPress={() => setAttachmentMenuVisible(true)} accessibilityRole="button" accessibilityLabel="Add attachment">
                    <Ionicons name="add" size={25} color={colors.brand} />
                  </Pressable>
                ) : null}

                {!editingMessage && !voiceBusy ? (
                  <Pressable style={styles.stickerButton} onPress={() => setStickerPickerVisible(true)} accessibilityRole="button" accessibilityLabel="Open sticker picker">
                    <Ionicons name="happy-outline" size={22} color={colors.brand} />
                  </Pressable>
                ) : null}

                {!voiceBusy ? (
                  <View style={styles.inputWrap}>
                    <TextInput
                      ref={inputRef}
                      value={activeText}
                      onChangeText={handleDraftChange}
                      placeholder={editingMessage ? 'Edit your message…' : 'Type a message...'}
                      placeholderTextColor={colors.placeholder}
                      style={[styles.input, editingMessage && styles.inputEditing]}
                      maxLength={MAX_LENGTH}
                      multiline
                      accessibilityLabel="Message input"
                    />
                    {nearLimit ? (
                      <Text style={[styles.counter, activeText.length >= MAX_LENGTH && styles.counterLimit]}>
                        {activeText.length}/{MAX_LENGTH}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {showSend && !voiceBusy ? (
                  <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                    <Pressable
                      style={styles.button}
                      onPress={editingMessage ? saveEditedMessage : send}
                      accessibilityRole="button"
                      accessibilityLabel={editingMessage ? 'Save edited message' : 'Send message'}
                    >
                      <Ionicons name={editingMessage ? 'checkmark' : 'arrow-up'} size={20} color={colors.onBrand} />
                    </Pressable>
                  </Animated.View>
                ) : null}

                {!editingMessage && (!showSend || voiceBusy) ? (
                  <View style={voiceBusy ? styles.recorderExpanded : null}>
                    <VoiceRecorderBar
                      conversationId={conversationId}
                      onVoiceSent={sendVoiceMessage}
                      onStateChange={setVoiceState}
                      expanded={voiceBusy}
                    />
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>

        <StickerPicker visible={stickerPickerVisible} onClose={() => setStickerPickerVisible(false)} onSelect={sendSticker} />
        <Modal visible={attachmentMenuVisible} transparent animationType="fade" onRequestClose={() => setAttachmentMenuVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setAttachmentMenuVisible(false)}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}><View style={styles.sheetHandle} /><SheetOption styles={styles} colors={colors} icon="images-outline" label="Photos and videos" onPress={() => pickPhotos(false)} /><SheetOption styles={styles} colors={colors} icon="camera-outline" label="Camera" onPress={() => pickPhotos(true)} /><SheetOption styles={styles} colors={colors} icon="document-attach-outline" label="Document" onPress={pickDocument} /></Pressable></Pressable>
        </Modal>

        {/* Full-screen photo viewer */}
        <Modal visible={!!imagePreview} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setImagePreview(null)}>
          <View style={styles.viewerOverlay}>
            {imagePreview ? <Image source={{ uri: imagePreview }} style={styles.viewerImage} resizeMode="contain" /> : null}
            <Pressable style={styles.viewerClose} onPress={() => setImagePreview(null)} accessibilityRole="button" accessibilityLabel="Close photo">
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
        </Modal>

        {/* Message actions */}
        <Modal visible={!!activeMessage} transparent animationType="fade" statusBarTranslucent onRequestClose={closeSheet}>
          <Pressable style={styles.modalOverlay} onPress={closeSheet}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              {!confirmingDelete ? (
                <>
                  {renderSheetActions()}
                  <Pressable style={styles.sheetCancel} onPress={closeSheet} accessibilityRole="button">
                    <Text style={styles.sheetCancelText}>Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.confirmIconWrap}>
                    <Ionicons name="trash" size={22} color={colors.error} />
                  </View>
                  <Text style={styles.confirmTitle}>Delete this message?</Text>
                  <Text style={styles.confirmSubtitle}>
                    It will be replaced with &#34;This message was deleted&#34; for everyone in this chat.
                  </Text>
                  <Pressable style={styles.confirmDeleteButton} onPress={handleConfirmDelete} accessibilityRole="button">
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  </Pressable>
                  <Pressable style={styles.sheetCancel} onPress={() => setConfirmingDelete(false)} accessibilityRole="button">
                    <Text style={styles.sheetCancelText}>Cancel</Text>
                  </Pressable>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Chat options */}
        <Modal visible={showOptionsSheet} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowOptionsSheet(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowOptionsSheet(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Chat options</Text>
              <Text style={styles.sheetSubtitle}>Changes only affect your side of this chat.</Text>

              {otherId ? <SheetOption styles={styles} colors={colors} icon="person-outline" label="View profile" onPress={handleViewProfile} /> : null}
              <SheetOption
                styles={styles}
                colors={colors}
                icon="color-palette-outline"
                label="Chat bubble style"
                onPress={() => {
                  setShowOptionsSheet(false);
                  openBubbleStudio();
                }}
              />
              <SheetOption
                styles={styles}
                colors={colors}
                icon="settings-outline"
                label="Conversation settings"
                onPress={() => {
                  setShowOptionsSheet(false);
                  router.navigate({ pathname: '/messages/[conversationId]/settings', params: { conversationId } });
                }}
              />
              {otherId ? <SheetOption styles={styles} colors={colors} icon="flag-outline" label="Report user" onPress={handleReportUser} /> : null}
              {otherId ? (
                isBlocked ? (
                  <SheetOption styles={styles} colors={colors} icon="ban-outline" label="Unblock user" onPress={handlePromptUnblockUser} />
                ) : (
                  <SheetOption styles={styles} colors={colors} icon="ban" label="Block user" danger onPress={handlePromptBlockUser} />
                )
              ) : null}
              <SheetOption
                styles={styles}
                colors={colors}
                icon="checkbox-outline"
                label="Select messages"
                onPress={() => {
                  setShowOptionsSheet(false);
                  setSelection([], true);
                }}
              />
              <SheetOption styles={styles} colors={colors} icon="brush-outline" label="Clear chat" onPress={handlePromptClearChat} />
              <SheetOption styles={styles} colors={colors} icon="trash-outline" label="Delete chat" danger onPress={handlePromptDeleteChat} />

              <Pressable style={styles.sheetCancel} onPress={() => setShowOptionsSheet(false)} accessibilityRole="button">
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Bubble Studio: the inner Pressable owns the 88% height so the sheet can actually fill it. */}
        <Modal visible={bubbleCustomizerVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setBubbleCustomizerVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setBubbleCustomizerVisible(false)}>
            <Pressable style={{ height: '88%' }} onPress={(e) => e.stopPropagation()}>
              <BubbleStudio
                appearance={bubbleDraft}
                scope={scopeDraft}
                saving={appearanceSaving}
                onChange={(next) => setBubbleDraft(normalizeBubbleAppearance(next))}
                onDraftChange={(next) => setBubbleDraft((current) => ({ ...current, ...next }))}
                onScopeChange={setScopeDraft}
                onReset={resetBubbleAppearance}
                onSave={saveBubbleAppearance}
                onDone={() => setBubbleCustomizerVisible(false)}
                styles={styles}
                colors={colors}
                isDark={isDark}
                reduceMotion={reduceMotion}
              />
            </Pressable>
          </Pressable>
        </Modal>

        {/* Universal confirmation / error dialog */}
        <Modal visible={!!dialogConfig} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setDialogConfig(null)}>
          <Pressable
            style={styles.dialogOverlay}
            onPress={() => (dialogConfig?.onSecondary ? dialogConfig.onSecondary() : setDialogConfig(null))}
          >
            <Pressable style={styles.dialogCard} onPress={(e) => e.stopPropagation()}>
              {dialogConfig?.icon ? (
                <View style={[styles.confirmIconWrap, { backgroundColor: dialogConfig.iconBgColor }]}>
                  <Ionicons name={dialogConfig.icon} size={24} color={dialogConfig.iconColor} />
                </View>
              ) : null}
              {dialogConfig?.title ? <Text style={styles.confirmTitle}>{dialogConfig.title}</Text> : null}
              {dialogConfig?.subtitle ? <Text style={styles.confirmSubtitle}>{dialogConfig.subtitle}</Text> : null}

              <Pressable
                style={[styles.dialogPrimaryBtn, { backgroundColor: dialogConfig?.primaryStyle === 'danger' ? colors.error : colors.brand }]}
                onPress={dialogConfig?.onPrimary}
                accessibilityRole="button"
              >
                <Text style={styles.dialogPrimaryText}>{dialogConfig?.primaryText || 'OK'}</Text>
              </Pressable>

              {dialogConfig?.secondaryText ? (
                <Pressable style={styles.sheetCancel} onPress={dialogConfig.onSecondary} accessibilityRole="button">
                  <Text style={styles.sheetCancelText}>{dialogConfig.secondaryText}</Text>
                </Pressable>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ScreenShell>
  );
}
