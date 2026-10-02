import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
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
} from '../../src/shared/services/community';
import {
  RELATIONSHIP,
  acceptFriendRequest,
  acceptMessageRequest,
  declineMessageRequest,
  listenIncomingMessageRequests,
  listenRelationship,
  sendFriendRequest,
} from '../../src/shared/services/friendships';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { getSocket } from '../../src/shared/services/socket';
import { getJson } from '../../src/shared/services/backend';

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const CHAT_PAGE_SIZE = 20;
const EDIT_WINDOW_MS = 60 * 60 * 1000;
const GROUP_GAP_MS = 5 * 60 * 1000;
const MAX_LENGTH = 4000;
const TYPING_REFRESH_MS = 3000;
const TYPING_IDLE_MS = 2000;
const REMOTE_TYPING_TIMEOUT_MS = 5000;

// Keeps unsent drafts when the user leaves and re-enters a conversation.
const DRAFT_CACHE = new Map();

const STATUS_RANK = { failed: 0, sending: 0, sent: 1, delivered: 2, read: 3 };

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

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

const messageKey = (message) => message?.clientTempId || message?.localId || message?.id;

const previewOf = (message) => {
  if (!message) return '';
  if (message.deleted) return 'Message deleted';
  if (message.type === 'voice') return '[Voice Message]';
  if (message.type === 'sticker') return '[Sticker]';
  const text = String(message.text || message.body || message.caption || '').trim();
  if (!text) return message.attachments?.length ? '[Attachment]' : '';
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

const keysOf = (message) => [message?.id, message?.clientTempId, message?.localId].filter(Boolean);

/**
 * Merges one incoming message into the list. Matches on any shared id
 * (server id, client temp id, local id) so optimistic messages are replaced
 * in place instead of duplicated. Never downgrades a status (read -> sent).
 */
const reconcileIncomingMessage = (prevMessages = [], incoming = null) => {
  if (!incoming) return prevMessages;
  const incomingKeys = new Set(keysOf(incoming));
  if (!incomingKeys.size) return prevMessages;

  let matched = false;
  const next = prevMessages.map((existing) => {
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
  return sortMessages(next);
};

const mergeFetchedMessages = (prev, fetched) => fetched.reduce(reconcileIncomingMessage, prev);

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

/* -------------------------------------------------------------------------- */
/*                              Small components                              */
/* -------------------------------------------------------------------------- */

function SwipeToReply({ children, disabled, onReply, color }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const replyRef = useRef(onReply);
  replyRef.current = onReply;

  const reset = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7, tension: 90 }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !disabled && g.dx > 12 && g.dx > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => translateX.setValue(Math.max(0, Math.min(72, g.dx))),
        onPanResponderRelease: (_, g) => {
          if (g.dx >= 60) replyRef.current?.();
          reset();
        },
        onPanResponderTerminate: reset,
      }),
    [disabled, reset, translateX]
  );

  const iconOpacity = translateX.interpolate({ inputRange: [0, 60], outputRange: [0, 1], extrapolate: 'clamp' });
  const iconScale = translateX.interpolate({ inputRange: [0, 60], outputRange: [0.5, 1], extrapolate: 'clamp' });

  return (
    <View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 10,
          top: '50%',
          marginTop: -10,
          opacity: iconOpacity,
          transform: [{ scale: iconScale }],
        }}
      >
        <Ionicons name="arrow-undo" size={18} color={color} />
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

function TypingBubble({ styles }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
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
  }, [dots]);

  return (
    <View style={styles.typingRow}>
      <View style={[styles.bubble, styles.theirs, styles.typingBubble, { borderTopLeftRadius: 20, borderBottomLeftRadius: 4 }]}>
        {dots.map((value, index) => (
          <Animated.View key={index} style={[styles.typingDot, { opacity: value }]} />
        ))}
      </View>
    </View>
  );
}

const StatusIcon = ({ message, colors, onBubble }) => {
  if (message.status === 'sending') {
    return <ActivityIndicator size="small" color={onBubble ? colors.onBrand : colors.textTertiary} style={{ transform: [{ scale: 0.6 }] }} />;
  }
  if (message.status === 'read') {
    return <Ionicons name="checkmark-done" size={14} color={onBubble ? colors.onBrand : colors.brand} />;
  }
  if (message.status === 'delivered') {
    return <Ionicons name="checkmark-done" size={14} color={onBubble ? 'rgba(255,255,255,0.65)' : colors.textTertiary} />;
  }
  return <Ionicons name="checkmark" size={14} color={onBubble ? 'rgba(255,255,255,0.65)' : colors.textTertiary} />;
};

const MessageRow = React.memo(function MessageRow({
  message,
  groupStart,
  groupEnd,
  mine,
  highlighted,
  styles,
  colors,
  onLongPress,
  onReply,
  onRetry,
  onJumpToReply,
}) {
  const deleted = !!message.deleted;
  const isVoice = message.type === 'voice';
  const isSticker = message.type === 'sticker';
  const failed = message.status === 'failed';
  const sending = message.status === 'sending';
  const edited = Boolean(message.edited || message.editedAt);
  const showFooter = groupEnd || failed || sending;

  const handleLongPress = useCallback(() => onLongPress(message), [onLongPress, message]);
  const handleReply = useCallback(() => onReply(message), [onReply, message]);

  const radius = mine
    ? { borderTopRightRadius: groupStart ? 20 : 6, borderBottomRightRadius: groupEnd ? 4 : 6 }
    : { borderTopLeftRadius: groupStart ? 20 : 6, borderBottomLeftRadius: groupEnd ? 4 : 6 };

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

  const footer = showFooter ? (
    <View style={[styles.bubbleFooter, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
      {failed ? (
        <Pressable onPress={() => onRetry(message)} hitSlop={8} style={styles.failedRow} accessibilityRole="button" accessibilityLabel="Retry sending message">
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.failedText}>Not sent · Tap to retry</Text>
        </Pressable>
      ) : (
        <>
          {edited ? <Text style={[styles.metaText, mine && styles.mineMeta]}>Edited</Text> : null}
          <Text style={[styles.metaText, mine && styles.mineMeta]}>{formatTime(message.createdAt)}</Text>
          {mine ? <StatusIcon message={message} colors={colors} onBubble={!isVoice && !isSticker} /> : null}
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
      <View>
        {replyBlock}
        <StickerMessage message={message} isMine={mine} onLongPress={handleLongPress} />
        {footer ? <View style={styles.outsideFooter}>{footer}</View> : null}
      </View>
    );
  } else if (isVoice) {
    body = (
      <View>
        {replyBlock}
        <VoiceMessageBubble message={message} isMine={mine} onLongPress={handleLongPress} />
        {footer ? <View style={styles.outsideFooter}>{footer}</View> : null}
      </View>
    );
  } else {
    body = (
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={220}
        style={({ pressed }) => [
          styles.bubble,
          mine ? styles.mine : styles.theirs,
          radius,
          failed && styles.bubbleFailed,
          pressed && styles.bubblePressed,
        ]}
      >
        {replyBlock}
        <Text style={[styles.text, mine && styles.mineText]}>
          {renderLinkedMessageText(message.text || message.body || message.caption || 'Attachment', mine, colors)}
        </Text>
        {footer}
      </Pressable>
    );
  }

  return (
    <SwipeToReply disabled={deleted || failed || sending} onReply={handleReply} color={colors.brand}>
      <View
        style={[
          styles.rowWrap,
          { marginBottom: groupEnd ? 10 : 2 },
          highlighted && styles.rowHighlight,
        ]}
      >
        {body}
      </View>
    </SwipeToReply>
  );
});

/* -------------------------------------------------------------------------- */
/*                                    Screen                                  */
/* -------------------------------------------------------------------------- */

export default function ConversationPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
  const { user, profile } = useAuth();
  const { colors } = useTheme();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [lastVisibleMessageId, setLastVisibleMessageId] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [connected, setConnected] = useState(true);
  const [draft, setDraft] = useState(() => DRAFT_CACHE.get(conversationId) || '');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [roomBusy, setRoomBusy] = useState('');
  const [relationship, setRelationship] = useState({ state: RELATIONSHIP.NONE });
  const [pendingMessageRequest, setPendingMessageRequest] = useState(null);
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingName, setTypingName] = useState('');
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [friendRequestVisible, setFriendRequestVisible] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [dialogConfig, setDialogConfig] = useState(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const [highlightId, setHighlightId] = useState(null);
  const [toast, setToast] = useState('');

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const nearBottomRef = useRef(true);
  const initialScrollDone = useRef(false);
  const lastMessageKeyRef = useRef(null);
  const typingTimeout = useRef(null);
  const typingSentAt = useRef(0);
  const remoteTypingTimer = useRef(null);
  const highlightTimer = useRef(null);
  const toastTimer = useRef(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const hasConnectedOnce = useRef(false);
  const retryRef = useRef(null);
  const listDataRef = useRef([]);

  /* ------------------------------- Styles -------------------------------- */

  const styles = useThemeStyles((c) => ({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingHorizontal: 2 },
    avatarWrapper: { width: 48, height: 48, borderRadius: 16, overflow: 'hidden', backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 48, height: 48 },
    avatarFallback: { width: 48, height: 48, borderRadius: 16, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: c.brandDark, fontWeight: '800', fontSize: 20 },
    headerMeta: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    headerStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.brand },
    headerHint: { color: c.textSecondary, fontSize: 12.5 },
    headerHintActive: { color: c.brand, fontWeight: '700' },
    headerAction: {
      width: 38, height: 38, borderRadius: 14, backgroundColor: c.surfaceSecondary,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.borderDefault,
    },
    headerActionPressed: { opacity: 0.82 },

    banner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.surfaceSecondary, borderRadius: 12, paddingVertical: 7, marginBottom: 8,
    },
    bannerText: { color: c.textSecondary, fontSize: 12.5, fontWeight: '600' },

    messagesPane: { flex: 1 },
    listContent: { paddingTop: 12, paddingBottom: 12, paddingHorizontal: 10 },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    retryButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.brand,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
    },
    retryButtonText: { color: c.onBrand, fontWeight: '800', fontSize: 13.5 },

    listHeader: { alignItems: 'center', paddingVertical: 14 },
    listHeaderText: { color: c.textTertiary, fontSize: 12 },

    dateWrap: { alignItems: 'center', marginVertical: 12 },
    datePill: { backgroundColor: c.surfaceSecondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: c.borderDefault },
    dateText: { color: c.textSecondary, fontSize: 11.5, fontWeight: '700' },

    rowWrap: { borderRadius: 16 },
    rowHighlight: { backgroundColor: c.brandLight },
    bubble: {
      paddingVertical: 9, paddingHorizontal: 13, maxWidth: '82%',
      borderRadius: 20,
      shadowColor: c.shadow || '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 1, elevation: 1,
    },
    bubblePressed: { opacity: 0.88 },
    bubbleFailed: { borderWidth: 1, borderColor: c.error },
    mine: { alignSelf: 'flex-end', backgroundColor: c.brand },
    theirs: { alignSelf: 'flex-start', backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
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
    failedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    failedText: { fontSize: 11.5, fontWeight: '700', color: c.error },

    replyBlock: { borderLeftWidth: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6 },
    replyBlockMine: { backgroundColor: 'rgba(255,255,255,0.18)', borderLeftColor: c.onBrand },
    replyBlockTheirs: { backgroundColor: c.surfaceSecondary, borderLeftColor: c.brand },
    replyBlockStandalone: { maxWidth: '82%', marginHorizontal: 4 },
    replyAuthor: { fontWeight: '800', color: c.brand, fontSize: 12 },
    replyAuthorMine: { color: c.onBrand },
    replyText: { marginTop: 1, color: c.textSecondary, fontSize: 13 },
    replyTextMine: { color: 'rgba(255,255,255,0.85)' },

    typingRow: { paddingHorizontal: 0, paddingTop: 4, paddingBottom: 6 },
    typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 14, paddingHorizontal: 16 },
    typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.textTertiary },

    scrollFab: {
      position: 'absolute', right: 14, bottom: 12, width: 42, height: 42, borderRadius: 21,
      backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow || '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
    },
    scrollFabBadge: {
      position: 'absolute', top: -6, right: -4, minWidth: 20, height: 20, borderRadius: 10,
      backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
    },
    scrollFabBadgeText: { color: c.onBrand, fontSize: 11, fontWeight: '800' },

    toast: {
      position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: c.textPrimary,
      borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8,
    },
    toastText: { color: c.surfacePrimary, fontSize: 13, fontWeight: '700' },

    composerContainer: {
      backgroundColor: c.surfacePrimary, borderTopWidth: 1, borderTopColor: c.borderDefault,
      paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 12, paddingHorizontal: 12,
    },
    composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    stickerButton: { width: 40, height: 44, borderRadius: 22, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.borderDefault },
    inputWrap: { flex: 1 },
    input: {
      minHeight: 44, maxHeight: 120, backgroundColor: c.inputBackground,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 22,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: c.textPrimary,
      fontSize: 15.5, lineHeight: 20,
    },
    inputEditing: { borderColor: c.brand },
    counter: { alignSelf: 'flex-end', marginTop: 3, marginRight: 8, fontSize: 11, color: c.textTertiary },
    counterLimit: { color: c.error, fontWeight: '700' },
    button: { backgroundColor: c.brand, borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    buttonDisabled: { backgroundColor: c.brandGlow, opacity: 0.6 },

    composerBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 10, marginBottom: 8,
      borderLeftWidth: 4, borderLeftColor: c.brand,
    },
    composerBannerBody: { flex: 1 },
    composerBannerLabel: { fontWeight: '800', color: c.brand, fontSize: 12.5 },
    composerBannerText: { color: c.textPrimary, fontSize: 13.5, marginTop: 2 },
    composerBannerClose: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.skeleton },

    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.bottomSheetBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderDefault, alignSelf: 'center', marginBottom: 14 },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 2 },
    sheetSubtitle: { fontSize: 13, color: c.textSecondary, textAlign: 'center', marginBottom: 10 },
    sheetPreview: { fontSize: 13, color: c.textSecondary, backgroundColor: c.surfaceSecondary, borderRadius: 12, padding: 12, marginBottom: 8 },
    sheetHint: { fontSize: 12, color: c.textTertiary, textAlign: 'center', marginTop: 4 },
    sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
    sheetOptionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
    sheetOptionIconDanger: { backgroundColor: c.dangerLight },
    sheetOptionText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    sheetCancel: { marginTop: 6, paddingVertical: 13, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.borderDefault },
    sheetCancelText: { fontSize: 15, fontWeight: '700', color: c.textSecondary },
    confirmIconWrap: { alignSelf: 'center', width: 48, height: 48, borderRadius: 24, backgroundColor: c.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    confirmTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 6 },
    confirmSubtitle: { fontSize: 13.5, color: c.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 20, paddingHorizontal: 8 },
    confirmDeleteButton: { backgroundColor: c.error, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    confirmDeleteText: { color: c.onBrand, fontWeight: '800', fontSize: 14 },
    dialogPrimaryBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    dialogPrimaryText: { color: c.onBrand, fontWeight: '800', fontSize: 14.5 },

    relationshipCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, padding: 14, marginTop: 8, marginBottom: 12,
    },
    relationshipIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: c.surfacePrimary, alignItems: 'center', justifyContent: 'center' },
    relationshipCopy: { flex: 1 },
    relationshipTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '800' },
    relationshipText: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
    relationshipButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.brand, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
    relationshipButtonMuted: { backgroundColor: c.skeleton },
    relationshipButtonText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },
    relationshipButtonTextMuted: { color: c.textSecondary },
  }));

  /* ---------------------------- Derived values --------------------------- */

  const currentUid = user?.uid || profile?.uid;
  const currentUidRef = useRef(currentUid);
  currentUidRef.current = currentUid;

  const otherId = conversation?.memberIds?.find((id) => id !== currentUid);
  const otherUser = conversation?.memberInfo?.[otherId] || {};
  const headerTitle = otherUser.name || 'Chat';
  const headerSubtitle = otherUser.email || 'Direct message';

  const areFriends = relationship.state === RELATIONSHIP.FRIENDS;
  const isBlocked = relationship.state === RELATIONSHIP.BLOCKED;
  const hasSentIntro = messages.some((m) => m.senderId === currentUid && m.status !== 'failed');
  const canChat = !isBlocked && (areFriends || !hasSentIntro);

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

    const out = [];
    let previousDay = '';
    visibleMessages.forEach((message, index) => {
      const date = toDate(message.createdAt);
      const key = date ? dayKey(date) : '';
      if (key && key !== previousDay) {
        out.push({ kind: 'date', key: `date-${key}`, label: formatDayLabel(date) });
        previousDay = key;
      }
      out.push({
        kind: 'message',
        key: messageKey(message),
        message,
        groupStart: !sameGroup(visibleMessages[index - 1], message),
        groupEnd: !sameGroup(message, visibleMessages[index + 1]),
      });
    });
    return out;
  }, [visibleMessages]);
  listDataRef.current = listData;

  const lastMessage = visibleMessages[visibleMessages.length - 1];
  const lastKey = lastMessage ? messageKey(lastMessage) : null;
  const lastIncomingId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].senderId !== currentUid) return messages[i].id;
    }
    return null;
  }, [messages, currentUid]);

  /* ------------------------------- Utilities ------------------------------ */

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated }), 80);
  }, []);

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    Animated.timing(toastOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(''));
    }, 1800);
  }, [toastOpacity]);

  const showAlertDialog = (title, subtitle, icon = 'alert-circle-outline', iconBgColor = colors.dangerLight, iconColor = colors.error) => {
    setDialogConfig({
      title, subtitle, icon, iconBgColor, iconColor,
      primaryText: 'OK',
      primaryStyle: 'brand',
      onPrimary: () => setDialogConfig(null),
    });
  };

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

  useEffect(() => {
    const load = async () => {
      const data = await fetchRecord('conversations', conversationId);
      setConversation(data);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, [conversationId]);

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !hasMoreMessages || loadingOlderMessages || !lastVisibleMessageId) return;
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
    }
  }, [conversationId, hasMoreMessages, lastVisibleMessageId, loadingOlderMessages]);

  // Initial load, live updates, and gap-filling after reconnects.
  useEffect(() => {
    if (!conversationId) return undefined;
    let cancelled = false;

    const fetchLatest = async (initial) => {
      try {
        const data = await getJson(`/api/chat/${conversationId}/messages?limit=${CHAT_PAGE_SIZE}`);
        if (cancelled) return;
        if (!data?.success) throw new Error(data?.message || 'Failed to load messages');
        const fetched = Array.isArray(data.messages) ? data.messages : [];
        setMessages((prev) => mergeFetchedMessages(prev, fetched));
        if (initial) {
          setLastVisibleMessageId(fetched.length ? fetched[0]?.id || null : null);
          setHasMoreMessages(Boolean(data.hasMore));
          setLoadError(false);
        }
      } catch (error) {
        console.log('Failed to fetch messages', error);
        if (initial && !cancelled) setLoadError(true);
      } finally {
        if (initial && !cancelled) setMessagesLoading(false);
      }
    };

    setMessagesLoading(true);
    setLoadError(false);
    fetchLatest(true);

    const socket = getSocket();

    const handleConnect = () => {
      setConnected(true);
      socket.emit('join_conversation', conversationId);
      if (hasConnectedOnce.current) fetchLatest(false);
      hasConnectedOnce.current = true;
    };
    const handleDisconnect = () => setConnected(false);

    if (socket.connected) handleConnect();
    else setConnected(false);

    const handleReceiveMessage = (newMessage) => {
      if (newMessage?.conversationId && newMessage.conversationId !== conversationId) return;
      if (newMessage?.senderId && newMessage.senderId !== currentUidRef.current) setIsTyping(false);
      setMessages((prev) =>
        reconcileIncomingMessage(prev, { ...newMessage, status: newMessage?.status || 'sent' })
      );
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

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleDisconnect);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('typing_update', handleTyping);

    return () => {
      cancelled = true;
      clearTimeout(remoteTypingTimer.current);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleDisconnect);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing_update', handleTyping);
    };
  }, [conversationId, reloadKey]);

  // Cleanup timers and tell the other side we stopped typing when leaving.
  useEffect(
    () => () => {
      clearTimeout(typingTimeout.current);
      clearTimeout(highlightTimer.current);
      clearTimeout(toastTimer.current);
      if (typingSentAt.current) {
        try {
          getSocket().emit('typing', { conversationId, userId: currentUidRef.current, isTyping: false });
        } catch (error) {
          // ignore
        }
      }
    },
    [conversationId]
  );

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

    if (lastMessage?.senderId === currentUid || nearBottomRef.current) {
      scrollToBottom(true);
    } else {
      setNewBelow((count) => count + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey]);

  useEffect(() => {
    if (isTyping && nearBottomRef.current) scrollToBottom(true);
  }, [isTyping, scrollToBottom]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      if (nearBottomRef.current) scrollToBottom(true);
    });
    return () => showSub.remove();
  }, [scrollToBottom]);

  useEffect(() => {
    if (conversationId && user?.uid) {
      markConversationRead(conversationId, user.uid).catch(() => {});
    }
  }, [conversationId, user?.uid, lastIncomingId]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [otherUser.avatar]);

  useEffect(() => {
    if (!currentUid || !otherId) {
      setRelationship({ state: RELATIONSHIP.NONE });
      return undefined;
    }
    return listenRelationship(currentUid, otherId, setRelationship);
  }, [currentUid, otherId]);

  useEffect(() => {
    if (!currentUid || !otherId) {
      setPendingMessageRequest(null);
      return undefined;
    }
    return listenIncomingMessageRequests(currentUid, (rows) => {
      const request = rows.find((item) => item.from === otherId && item.status === 'pending');
      setPendingMessageRequest(request || null);
    });
  }, [currentUid, otherId]);

  /* ------------------------------ Typing events --------------------------- */

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimeout.current);
    if (typingSentAt.current) {
      typingSentAt.current = 0;
      getSocket().emit('typing', { conversationId, userId: currentUid, isTyping: false });
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
      getSocket().emit('typing', {
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
    if (error?.message === 'Become friends before chatting freely.') {
      setFriendRequestVisible(true);
      return;
    }
    showAlertDialog('Message not sent', error?.message || 'You can only send direct messages to friends.');
    console.error('Failed to send message', error);
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

  const send = async () => {
    const nextText = draft.trim();
    if (!nextText || !conversation || !user || !canChat) return;

    const clientId = createMessageClientId();
    const reply = buildReplyPayload(replyTo);
    const optimistic = { ...baseOptimistic(clientId), type: 'text', text: nextText, attachments: [], replyTo: reply };

    setMessages((prev) => reconcileIncomingMessage(prev, optimistic));
    setDraft('');
    DRAFT_CACHE.delete(conversationId);
    setReplyTo(null);
    stopTyping();
    scrollToBottom();

    await deliver(clientId, { type: 'text', text: nextText, attachments: [], replyTo: reply }, optimistic);
  };

  const sendVoiceMessage = useCallback(
    async (voiceResult) => {
      if (!conversation || !user || !voiceResult?.audioUrl || !canChat) return;

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
    const optimistic = { ...baseOptimistic(clientId), type: 'sticker', stickerId: sticker.id, replyTo: reply };

    setMessages((prev) => reconcileIncomingMessage(prev, optimistic));
    setReplyTo(null);
    scrollToBottom();
    await deliver(clientId, { type: 'sticker', stickerId: sticker.id, replyTo: reply }, { ...optimistic, status: 'sent' });
  };

  const retrySendMessage = async (message) => {
    if (!conversation || !user || isBlocked || !message || message.status === 'sending') return;
    const clientId = messageKey(message);
    setMessages((prev) =>
      prev.map((entry) =>
        messageKey(entry) === clientId ? { ...entry, status: 'sending', failedReason: null } : entry
      )
    );
    await deliver(clientId, payloadFromMessage(message), message);
  };
  retryRef.current = retrySendMessage;
  const handleRetry = useCallback((message) => retryRef.current?.(message), []);

  const discardFailedMessage = (message) => {
    const key = messageKey(message);
    setMessages((prev) => prev.filter((entry) => messageKey(entry) !== key));
  };

  /* ------------------------------- Message sheet -------------------------- */

  const openSheet = useCallback((message) => {
    setConfirmingDelete(false);
    setActiveMessage(message);
  }, []);

  const closeSheet = () => {
    setActiveMessage(null);
    setConfirmingDelete(false);
  };

  const withinEditWindow = (message) => {
    const sentAt = toMillis(message?.createdAt);
    return Boolean(sentAt && Date.now() - sentAt <= EDIT_WINDOW_MS);
  };

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

  const saveEditedMessage = async () => {
    const nextText = editText.trim();
    if (!editingMessage || !nextText || savingEdit) return;
    if (nextText === String(editingMessage.text || '').trim()) {
      cancelEditingMessage();
      return;
    }
    setSavingEdit(true);
    try {
      await updateDirectMessage(conversationId, editingMessage.id, nextText, currentUid);
      const targetId = editingMessage.id;
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, text: nextText, edited: true } : m))
      );
      cancelEditingMessage();
    } catch (error) {
      showAlertDialog('Edit failed', error?.message || 'Unable to edit this message.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeMessage || !conversationId) return;
    const target = activeMessage;
    setDeletingId(target.id);
    try {
      await deleteDirectMessage(conversationId, target.id, { voice: target.type === 'voice' });
      setMessages((prev) => prev.map((m) => (m.id === target.id ? { ...m, deleted: true } : m)));
    } catch (error) {
      showAlertDialog('Delete failed', error?.message || 'Unable to delete this message.');
    } finally {
      setDeletingId(null);
      closeSheet();
    }
  };

  /* ------------------------------ Chat actions ---------------------------- */

  const clearChat = async () => {
    if (!conversationId || !currentUid) return;
    setRoomBusy('clear');
    try {
      await clearConversationForUser(conversationId, currentUid);
      setReplyTo(null);
      setActiveMessage(null);
      setConversation((current) => ({
        ...current,
        clearedFor: { ...(current?.clearedFor || {}), [currentUid]: new Date() },
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
      if (distance < 120) setNewBelow(0);
      if (initialScrollDone.current && contentOffset.y <= 48) loadOlderMessages();
    },
    [loadOlderMessages]
  );

  const handleContentSizeChange = useCallback(() => {
    if (!initialScrollDone.current && listRef.current) {
      initialScrollDone.current = true;
      listRef.current.scrollToEnd({ animated: false });
    }
  }, []);

  const handleScrollToIndexFailed = useCallback((info) => {
    listRef.current?.scrollToOffset?.({ offset: info.averageItemLength * info.index, animated: true });
    setTimeout(() => {
      listRef.current?.scrollToIndex?.({ index: info.index, viewPosition: 0.5, animated: true });
    }, 350);
  }, []);

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
      const { message } = item;
      if (deletingId === message.id) {
        return (
          <View style={[styles.rowWrap, { marginBottom: 10 }]}>
            <View style={[styles.bubble, styles.mine, styles.bubbleDeleted]}>
              <Text style={[styles.deletedText, styles.mineDeletedText]}>Deleting…</Text>
            </View>
          </View>
        );
      }
      return (
        <MessageRow
          message={message}
          groupStart={item.groupStart}
          groupEnd={item.groupEnd}
          mine={message.senderId === currentUid}
          highlighted={highlightId === message.id}
          styles={styles}
          colors={colors}
          onLongPress={openSheet}
          onReply={startReply}
          onRetry={handleRetry}
          onJumpToReply={jumpToMessage}
        />
      );
    },
    [styles, colors, currentUid, highlightId, deletingId, openSheet, startReply, handleRetry, jumpToMessage]
  );

  /* ------------------------------- Renderers ------------------------------ */

  const renderRelationshipPrompt = () => {
    if (!otherId || areFriends) return null;

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
            <Pressable style={styles.relationshipButton} onPress={handleAcceptMessageRequest} disabled={relationshipBusy}>
              {busyIcon('checkmark', colors.onBrand)}
              <Text style={styles.relationshipButtonText}>Accept</Text>
            </Pressable>
            <Pressable style={[styles.relationshipButton, styles.relationshipButtonMuted]} onPress={handleDeclineMessageRequest} disabled={relationshipBusy}>
              {busyIcon('close', colors.textSecondary)}
              <Text style={[styles.relationshipButtonText, styles.relationshipButtonTextMuted]}>Decline</Text>
            </Pressable>
          </View>
        ) : isReceived ? (
          <Pressable style={styles.relationshipButton} onPress={handleAcceptFriend} disabled={relationshipBusy}>
            {busyIcon('checkmark', colors.onBrand)}
            <Text style={styles.relationshipButtonText}>Accept</Text>
          </Pressable>
        ) : isSent || isBlocked ? (
          <View style={[styles.relationshipButton, styles.relationshipButtonMuted]}>
            <Text style={[styles.relationshipButtonText, styles.relationshipButtonTextMuted]}>{isSent ? 'Pending' : 'Blocked'}</Text>
          </View>
        ) : (
          <Pressable style={styles.relationshipButton} onPress={handleAddFriend} disabled={relationshipBusy}>
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
    const isText = !m.type || m.type === 'text';

    const Option = ({ icon, label, onPress, danger }) => (
      <Pressable style={styles.sheetOption} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        <View style={[styles.sheetOptionIcon, danger && styles.sheetOptionIconDanger]}>
          <Ionicons name={icon} size={18} color={danger ? colors.error : colors.textPrimary} />
        </View>
        <Text style={[styles.sheetOptionText, danger && { color: colors.error }]}>{label}</Text>
      </Pressable>
    );

    return (
      <>
        <Text style={styles.sheetPreview} numberOfLines={2}>{previewOf(m)}</Text>
        {failed ? (
          <>
            <Option icon="refresh" label="Retry sending" onPress={() => { closeSheet(); handleRetry(m); }} />
            <Option icon="trash-outline" label="Discard message" danger onPress={() => { discardFailedMessage(m); closeSheet(); }} />
          </>
        ) : (
          <>
            {!sending ? <Option icon="arrow-undo-outline" label="Reply" onPress={handleReplyFromSheet} /> : null}
            {m.text ? <Option icon="copy-outline" label="Copy text" onPress={handleCopyFromSheet} /> : null}
            {editable && isText ? <Option icon="create-outline" label="Edit message" onPress={startEditingMessage} /> : null}
            {editable ? <Option icon="trash-outline" label="Delete message" danger onPress={() => setConfirmingDelete(true)} /> : null}
            {mine && !editable && !sending ? (
              <Text style={styles.sheetHint}>Messages can be edited or deleted within 1 hour of sending.</Text>
            ) : null}
          </>
        )}
      </>
    );
  };

  /* --------------------------------- Render -------------------------------- */

  const activeText = editingMessage ? editText : draft;
  const canSubmit = Boolean(activeText.trim()) && !savingEdit;
  const nearLimit = activeText.length > MAX_LENGTH * 0.85;

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

  return (
    <ScreenShell title={headerTitle} subtitle={headerSubtitle} showBack loading={loading} scrollable={false}>
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

      {!connected && !messagesLoading ? (
        <View style={styles.banner}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text style={styles.bannerText}>Reconnecting…</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        <View style={styles.messagesPane}>
          {messagesLoading ? (
            <View style={styles.centerFill}>
              <ActivityIndicator color={colors.brand} />
            </View>
          ) : loadError && !messages.length ? (
            <View style={styles.centerFill}>
              <EmptyState title="Couldn't load messages" description="Check your connection and try again." />
              <Pressable style={styles.retryButton} onPress={() => setReloadKey((key) => key + 1)} accessibilityRole="button">
                <Ionicons name="refresh" size={16} color={colors.onBrand} />
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : listData.length ? (
            <FlatList
              ref={listRef}
              data={listData}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              onScroll={handleScroll}
              scrollEventThrottle={64}
              onContentSizeChange={handleContentSizeChange}
              onScrollToIndexFailed={handleScrollToIndexFailed}
              maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
              ListHeaderComponent={listHeader}
              ListFooterComponent={isTyping ? <TypingBubble styles={styles} /> : null}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              windowSize={11}
            />
          ) : (
            <EmptyState
              title="No messages yet"
              description={canChat ? 'Say hello and start the conversation.' : 'Messages will show up here once you are connected.'}
            />
          )}

          {showScrollDown ? (
            <Pressable style={styles.scrollFab} onPress={() => scrollToBottom(true)} accessibilityRole="button" accessibilityLabel="Scroll to latest message">
              <Ionicons name="chevron-down" size={22} color={colors.textPrimary} />
              {newBelow > 0 ? (
                <View style={styles.scrollFabBadge}>
                  <Text style={styles.scrollFabBadgeText}>{newBelow > 99 ? '99+' : newBelow}</Text>
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

        {renderRelationshipPrompt()}

        {canChat ? (
          <View style={styles.composerContainer}>
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

            <View style={styles.composer}>
              {!editingMessage ? (
                <>
                  <Pressable style={styles.stickerButton} onPress={() => setStickerPickerVisible(true)} accessibilityRole="button" accessibilityLabel="Open sticker picker">
                    <Ionicons name="happy-outline" size={22} color={colors.brand} />
                  </Pressable>
                  <VoiceRecorderBar conversationId={conversationId} onVoiceSent={sendVoiceMessage} />
                </>
              ) : null}
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
                />
                {nearLimit ? (
                  <Text style={[styles.counter, activeText.length >= MAX_LENGTH && styles.counterLimit]}>
                    {activeText.length}/{MAX_LENGTH}
                  </Text>
                ) : null}
              </View>
              <Pressable
                style={[styles.button, !canSubmit && styles.buttonDisabled]}
                onPress={editingMessage ? saveEditedMessage : send}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel={editingMessage ? 'Save edited message' : 'Send message'}
              >
                {savingEdit ? (
                  <ActivityIndicator color={colors.onBrand} />
                ) : (
                  <Ionicons name={editingMessage ? 'checkmark' : 'arrow-up'} size={18} color={colors.onBrand} />
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <StickerPicker visible={stickerPickerVisible} onClose={() => setStickerPickerVisible(false)} onSelect={sendSticker} />

      {/* Message actions */}
      <Modal visible={!!activeMessage} transparent animationType="fade" statusBarTranslucent onRequestClose={closeSheet}>
        <Pressable style={styles.modalOverlay} onPress={closeSheet}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            {!confirmingDelete ? (
              <>
                {renderSheetActions()}
                <Pressable style={styles.sheetCancel} onPress={closeSheet}>
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
                <Pressable style={styles.confirmDeleteButton} onPress={handleConfirmDelete}>
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                </Pressable>
                <Pressable style={styles.sheetCancel} onPress={() => setConfirmingDelete(false)}>
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

            {otherId ? (
              <Pressable style={styles.sheetOption} onPress={handleViewProfile}>
                <View style={styles.sheetOptionIcon}>
                  <Ionicons name="person-outline" size={18} color={colors.textPrimary} />
                </View>
                <Text style={styles.sheetOptionText}>View profile</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.sheetOption} onPress={handlePromptClearChat}>
              <View style={styles.sheetOptionIcon}>
                <Ionicons name="brush-outline" size={18} color={colors.textPrimary} />
              </View>
              <Text style={styles.sheetOptionText}>Clear chat</Text>
            </Pressable>

            <Pressable style={styles.sheetOption} onPress={handlePromptDeleteChat}>
              <View style={[styles.sheetOptionIcon, styles.sheetOptionIconDanger]}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </View>
              <Text style={[styles.sheetOptionText, { color: colors.error }]}>Delete chat</Text>
            </Pressable>

            <Pressable style={styles.sheetCancel} onPress={() => setShowOptionsSheet(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Universal confirmation / error dialog */}
      <Modal visible={!!dialogConfig} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setDialogConfig(null)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => (dialogConfig?.onSecondary ? dialogConfig.onSecondary() : setDialogConfig(null))}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            {dialogConfig?.icon ? (
              <View style={[styles.confirmIconWrap, { backgroundColor: dialogConfig.iconBgColor }]}>
                <Ionicons name={dialogConfig.icon} size={24} color={dialogConfig.iconColor} />
              </View>
            ) : null}
            {dialogConfig?.title ? <Text style={styles.confirmTitle}>{dialogConfig.title}</Text> : null}
            {dialogConfig?.subtitle ? <Text style={styles.confirmSubtitle}>{dialogConfig.subtitle}</Text> : null}

            <Pressable
              style={[
                styles.dialogPrimaryBtn,
                { backgroundColor: dialogConfig?.primaryStyle === 'danger' ? colors.error : colors.brand },
              ]}
              onPress={dialogConfig?.onPrimary}
            >
              <Text style={styles.dialogPrimaryText}>{dialogConfig?.primaryText || 'OK'}</Text>
            </Pressable>

            {dialogConfig?.secondaryText ? (
              <Pressable style={styles.sheetCancel} onPress={dialogConfig.onSecondary}>
                <Text style={styles.sheetCancelText}>{dialogConfig.secondaryText}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}