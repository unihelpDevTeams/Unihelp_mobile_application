import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchConversations } from '../../services/firestoreSync';
import {
  clearConversationForUser,
  deleteConversationForUser,
  searchUsers,
} from '../../src/shared/services/community';
import {
  listenFriends,
  listenIncomingFriendRequests,
  listenOutgoingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  createOrOpenFriendConversation,
} from '../../src/shared/services/friendships';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const TABS = [
  { key: 'chats', label: 'Chats', icon: 'chatbubbles-outline' },
  { key: 'friends', label: 'Friends', icon: 'people-outline' },
  { key: 'requests', label: 'Requests', icon: 'person-add-outline' },
];

const REFRESH_INTERVAL_MS = 20000;
const MIN_SEARCH_LENGTH = 2;

const RELATION_LABELS = {
  incoming: { text: 'Friend request received', icon: 'person-add-outline', tone: 'default' },
  outgoing: { text: 'Friend request sent', icon: 'time-outline', tone: 'default' },
  none: { text: 'Not friends yet', icon: 'alert-circle-outline', tone: 'warning' },
};

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

/** WhatsApp-style: time today, "Yesterday", weekday this week, otherwise a short date. */
const formatListTime = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const now = new Date();
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (diffDays <= 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: '2-digit' }),
  });
};

const getPeerInfo = (item, currentUid) => {
  const peerId = item.memberIds?.find((memberId) => memberId !== currentUid);
  return { peerId, peerInfo: item.memberInfo?.[peerId] || {} };
};

const hashHue = (text) => {
  const value = String(text || 'S');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 360;
  return hash;
};

const personName = (profileLike = {}) =>
  profileLike.name || profileLike.username || profileLike.email || 'Student';

/* -------------------------------------------------------------------------- */
/*                              Small components                              */
/* -------------------------------------------------------------------------- */

function Avatar({ uri, name, size = 48 }) {
  const [failed, setFailed] = useState(false);
  const cleanUri = typeof uri === 'string' ? uri.trim() : '';

  useEffect(() => {
    setFailed(false);
  }, [cleanUri]);

  const radius = Math.round(size * 0.33);
  if (cleanUri && !failed) {
    return (
      <Image
        source={{ uri: cleanUri }}
        style={{ width: size, height: size, borderRadius: radius }}
        onError={() => setFailed(true)}
      />
    );
  }

  const hue = hashHue(name);
  const initial = String(name || 'S').trim()[0]?.toUpperCase() || 'S';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: `hsl(${hue}, 70%, 90%)`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: `hsl(${hue}, 45%, 30%)`, fontWeight: '800', fontSize: Math.round(size * 0.4) }}>
        {initial}
      </Text>
    </View>
  );
}

const ConversationItem = React.memo(function ConversationItem({
  item,
  currentUid,
  relation,
  colors,
  styles,
  onPress,
  onLongPress,
}) {
  const { peerInfo } = getPeerInfo(item, currentUid);
  const peerName = peerInfo.name || 'Student';
  const unread = item.unread?.[currentUid] || 0;
  const label = relation === 'friend' ? null : RELATION_LABELS[relation];

  const clearedAt = toMillis(item.clearedFor?.[currentUid]);
  const lastAt = toMillis(item.lastMessageAt || item.updatedAt);
  const hidden = Boolean(clearedAt && lastAt <= clearedAt);
  const raw = hidden ? '' : String(item.lastMessage || '');
  const special =
    raw === '[Voice Message]'
      ? { icon: 'mic-outline', label: 'Voice message' }
      : raw === '[Sticker]'
        ? { icon: 'happy-outline', label: 'Sticker' }
        : null;
  const lastSender = item.lastMessageSenderId || item.lastSenderId;
  const youPrefix = raw && lastSender && lastSender === currentUid ? 'You: ' : '';
  const timeText = hidden ? '' : formatListTime(item.lastMessageAt || item.updatedAt);

  return (
    <Pressable
      style={({ pressed }) => [styles.chatCard, unread > 0 && styles.chatCardUnread, pressed && styles.cardPressed]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={240}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${peerName}${unread ? `, ${unread} unread` : ''}`}
    >
      <View style={styles.avatarWrapper}>
        <Avatar uri={peerInfo.avatar} name={peerName} />
      </View>
      <View style={styles.chatCopy}>
        <View style={styles.chatHeaderRow}>
          <Text style={[styles.chatTitle, unread > 0 && styles.chatTitleUnread]} numberOfLines={1}>{peerName}</Text>
          {timeText ? <Text style={[styles.chatTime, unread > 0 && styles.chatTimeUnread]}>{timeText}</Text> : null}
        </View>
        <View style={styles.previewRow}>
          {special ? <Ionicons name={special.icon} size={14} color={colors.textSecondary} /> : null}
          <Text style={[styles.chatMessage, unread > 0 && styles.chatMessageUnread]} numberOfLines={1}>
            {raw ? `${youPrefix}${special ? special.label : raw}` : 'Say hello 👋'}
          </Text>
        </View>
        {label ? (
          <View style={[styles.relationshipPill, label.tone === 'warning' && styles.relationshipPillWarning]}>
            <Ionicons name={label.icon} size={12} color={label.tone === 'warning' ? colors.error : colors.brandText} />
            <Text style={[styles.relationshipPillText, label.tone === 'warning' && styles.relationshipPillTextWarning]}>
              {label.text}
            </Text>
          </View>
        ) : null}
      </View>
      {unread > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

/* -------------------------------------------------------------------------- */
/*                                    Screen                                  */
/* -------------------------------------------------------------------------- */

export default function MessagesPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const uid = user?.uid || profile?.uid;

  const [activeTab, setActiveTab] = useState('chats');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [busyRequestId, setBusyRequestId] = useState('');

  const [findModalVisible, setFindModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState('');

  const [newChatVisible, setNewChatVisible] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState('');

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState(null); // 'clear' | 'delete' | null
  const [actionLoading, setActionLoading] = useState(false);
  const [openingFriendId, setOpeningFriendId] = useState('');

  const [toast, setToast] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);
  const searchRunId = useRef(0);

  /* ------------------------------- Styles -------------------------------- */

  const styles = useThemeStyles((c) => ({
    tabBar: {
      flexDirection: 'row', backgroundColor: c.surfacePrimary, borderRadius: 16, padding: 4,
      marginBottom: 12, borderWidth: 1, borderColor: c.borderDefault,
    },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
    tabActive: { backgroundColor: c.brandLight },
    tabLabel: { fontSize: 13, fontWeight: '600', color: c.textTertiary },
    tabLabelActive: { color: c.brandText, fontWeight: '700' },
    tabBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    tabBadgeBrand: { backgroundColor: c.brand },
    tabBadgeText: { color: c.onBrand, fontSize: 10, fontWeight: '800' },

    searchWrap: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBackground, borderWidth: 1,
      borderColor: c.borderDefault, borderRadius: 14, paddingHorizontal: 12, marginBottom: 10,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: c.textPrimary, paddingVertical: 11, fontSize: 15 },

    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    chipActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    chipText: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: c.brandText },

    tabContent: { flex: 1 },
    listContent: { paddingBottom: 96 },
    listHint: { textAlign: 'center', color: c.textTertiary, fontSize: 12, paddingVertical: 12 },
    sectionLabel: { fontSize: 12, fontWeight: '800', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, marginTop: 6 },
    emptyCta: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center',
      backgroundColor: c.brand, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 11, marginTop: 6,
    },
    emptyCtaText: { color: c.onBrand, fontWeight: '800', fontSize: 14 },

    cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    chatCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderWidth: 1,
      borderColor: c.borderDefault, borderRadius: 18, padding: 14, marginBottom: 10,
    },
    chatCardUnread: { borderColor: c.brand },
    avatarWrapper: { width: 48, height: 48, marginRight: 12 },
    chatCopy: { flex: 1 },
    chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
    chatTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary, flex: 1, marginRight: 8 },
    chatTitleUnread: { fontWeight: '800' },
    chatTime: { color: c.textSecondary, fontSize: 11 },
    chatTimeUnread: { color: c.brandText, fontWeight: '700' },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    chatMessage: { flexShrink: 1, color: c.textSecondary, fontSize: 13, lineHeight: 18 },
    chatMessageUnread: { color: c.textPrimary, fontWeight: '600' },
    relationshipPill: {
      alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: c.brandLight,
    },
    relationshipPillWarning: { backgroundColor: c.dangerLight },
    relationshipPillText: { color: c.brandText, fontSize: 11, fontWeight: '800' },
    relationshipPillTextWarning: { color: c.error },
    unreadBadge: { marginLeft: 12, minWidth: 24, paddingHorizontal: 7, backgroundColor: c.brand, borderRadius: 999, alignItems: 'center', justifyContent: 'center', height: 24 },
    unreadText: { color: c.onBrand, fontWeight: '800', fontSize: 11 },

    fab: {
      position: 'absolute', right: 4, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.brand, borderRadius: 28, height: 54, paddingHorizontal: 20,
      shadowColor: c.shadow || '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 6,
    },
    fabText: { color: c.onBrand, fontWeight: '800', fontSize: 14 },

    findFriendBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18, padding: 14, marginBottom: 12 },
    findFriendIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    findFriendTextWrap: { flex: 1 },
    findFriendTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    findFriendSubtitle: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    secondaryActionBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfacePrimary,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16, gap: 8,
    },
    secondaryActionText: { fontSize: 13, fontWeight: '700', color: c.textPrimary },

    personCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18, padding: 14, marginBottom: 10 },
    personInfo: { flex: 1, marginRight: 8 },
    personName: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    personDetail: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    messageBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    requestActions: { flexDirection: 'row', gap: 8 },
    acceptBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.success, alignItems: 'center', justifyContent: 'center' },
    declineBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.dangerLight, borderWidth: 1, borderColor: c.dangerBorder, alignItems: 'center', justifyContent: 'center' },
    pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: c.brand },
    pillBtnMuted: { backgroundColor: c.skeleton, borderWidth: 1, borderColor: c.borderDefault },
    pillBtnText: { color: c.onBrand, fontSize: 12, fontWeight: '700' },
    pillBtnTextMuted: { color: c.textSecondary },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: c.modalBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary },
    modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
    modalList: { paddingBottom: 20 },
    modalEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
    modalEmptyText: { fontSize: 14, color: c.textTertiary, textAlign: 'center' },

    sheetHandle: { width: 36, height: 4, backgroundColor: c.borderDefault, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
    sheetContent: { backgroundColor: c.modalBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sheetPeerName: { fontSize: 17, fontWeight: '800', color: c.textPrimary },
    sheetSubtext: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    actionOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 16, padding: 14, marginBottom: 10, gap: 12 },
    actionOptionDanger: { backgroundColor: c.dangerLight, borderColor: c.dangerBorder },
    actionIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surfacePrimary, alignItems: 'center', justifyContent: 'center' },
    actionIconWrapDanger: { backgroundColor: c.error + '18' },
    actionTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    actionTitleDanger: { color: c.error },
    actionSubtitle: { fontSize: 12, color: c.textSecondary, marginTop: 2 },

    confirmBox: { backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 20, padding: 18, alignItems: 'center' },
    confirmIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    confirmTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary, textAlign: 'center' },
    confirmDesc: { fontSize: 13, color: c.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 18 },
    confirmButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
    confirmBtnCancel: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center' },
    confirmBtnCancelText: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
    confirmBtnDanger: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: c.error, alignItems: 'center', justifyContent: 'center' },
    confirmBtnDangerText: { fontSize: 14, fontWeight: '800', color: c.onBrand },

    toast: { position: 'absolute', top: 8, alignSelf: 'center', backgroundColor: c.textPrimary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '90%' },
    toastText: { color: c.surfacePrimary, fontSize: 13, fontWeight: '700' },
  }));

  /* ------------------------------- Utilities ------------------------------ */

  const showToast = useCallback(
    (text) => {
      setToast(text);
      clearTimeout(toastTimer.current);
      Animated.timing(toastOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(''));
      }, 2200);
    },
    [toastOpacity]
  );

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* -------------------------------- Loading ------------------------------- */

  const loadConversations = useCallback(async () => {
    if (!uid) return [];
    const data = await fetchConversations(uid);
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
    return data;
  }, [uid]);

  // Refresh on focus (e.g. returning from a chat) and keep unread counts fresh while visible.
  useFocusEffect(
    useCallback(() => {
      loadConversations().catch(() => setLoading(false));
      const timer = setInterval(() => {
        loadConversations().catch(() => {});
      }, REFRESH_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [loadConversations])
  );

  const handlePullToRefresh = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    try {
      await loadConversations();
    } catch (error) {
      showToast("Couldn't refresh. Check your connection.");
    } finally {
      setRefreshing(false);
    }
  }, [loadConversations, showToast, uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return listenFriends(uid, (data) => setFriends(Array.isArray(data) ? data : []));
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return listenIncomingFriendRequests(uid, (data) => setIncomingRequests(Array.isArray(data) ? data : []));
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return listenOutgoingFriendRequests(uid, (data) => setOutgoingRequests(Array.isArray(data) ? data : []));
  }, [uid]);

  // Debounced user search; stale responses are ignored.
  useEffect(() => {
    const term = search.trim();
    if (term.length < MIN_SEARCH_LENGTH || !uid) {
      searchRunId.current += 1;
      setMatches([]);
      setSearching(false);
      return undefined;
    }
    const runId = ++searchRunId.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(term, uid);
        if (runId === searchRunId.current) setMatches(Array.isArray(results) ? results : []);
      } catch (error) {
        if (runId === searchRunId.current) setMatches([]);
      } finally {
        if (runId === searchRunId.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [uid, search]);

  /* ------------------------------ Derived data ---------------------------- */

  const friendByUser = useMemo(() => {
    const map = new Map();
    friends.forEach((friend) => {
      friend.users?.forEach?.((id) => {
        if (id !== uid) map.set(id, friend);
      });
    });
    return map;
  }, [friends, uid]);

  const incomingByUser = useMemo(() => {
    const map = new Map();
    incomingRequests.forEach((request) => request.from && map.set(request.from, request));
    return map;
  }, [incomingRequests]);

  const outgoingByUser = useMemo(() => {
    const map = new Map();
    outgoingRequests.forEach((request) => request.to && map.set(request.to, request));
    return map;
  }, [outgoingRequests]);

  const relationFor = useCallback(
    (peerId) => {
      if (!peerId) return 'friend';
      if (friendByUser.has(peerId)) return 'friend';
      if (incomingByUser.has(peerId)) return 'incoming';
      if (outgoingByUser.has(peerId)) return 'outgoing';
      return 'none';
    },
    [friendByUser, incomingByUser, outgoingByUser]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const sortedChats = useMemo(
    () => [...items].sort((a, b) => toMillis(b.lastMessageAt || b.updatedAt) - toMillis(a.lastMessageAt || a.updatedAt)),
    [items]
  );

  const totalUnread = useMemo(
    () => items.reduce((sum, item) => sum + (item.unread?.[uid] || 0), 0),
    [items, uid]
  );
  const unreadChats = useMemo(() => items.filter((item) => (item.unread?.[uid] || 0) > 0).length, [items, uid]);

  const visibleChats = useMemo(
    () =>
      sortedChats.filter((item) => {
        if (unreadOnly && !(item.unread?.[uid] > 0)) return false;
        if (!normalizedQuery) return true;
        const { peerInfo } = getPeerInfo(item, uid);
        return (
          String(peerInfo.name || '').toLowerCase().includes(normalizedQuery) ||
          String(item.lastMessage || '').toLowerCase().includes(normalizedQuery)
        );
      }),
    [sortedChats, unreadOnly, normalizedQuery, uid]
  );

  const friendProfileOf = useCallback(
    (friend) => {
      const otherUid = friend.users?.find((id) => id !== uid);
      return otherUid ? friend.profiles?.[otherUid] || {} : {};
    },
    [uid]
  );

  const sortedFriends = useMemo(
    () =>
      [...friends].sort((a, b) =>
        personName(friendProfileOf(a)).localeCompare(personName(friendProfileOf(b)), undefined, { sensitivity: 'base' })
      ),
    [friends, friendProfileOf]
  );

  const filterFriends = useCallback(
    (term) => {
      const needle = term.trim().toLowerCase();
      if (!needle) return sortedFriends;
      return sortedFriends.filter((friend) => {
        const p = friendProfileOf(friend);
        return [personName(p), p.school, p.university, p.department]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      });
    },
    [sortedFriends, friendProfileOf]
  );

  const visibleFriends = useMemo(() => filterFriends(query), [filterFriends, query]);
  const newChatFriends = useMemo(() => filterFriends(newChatQuery), [filterFriends, newChatQuery]);

  const requestSections = useMemo(() => {
    const sections = [];
    if (incomingRequests.length) sections.push({ key: 'incoming', title: `Received (${incomingRequests.length})`, data: incomingRequests });
    if (outgoingRequests.length) sections.push({ key: 'outgoing', title: `Sent (${outgoingRequests.length})`, data: outgoingRequests });
    return sections;
  }, [incomingRequests, outgoingRequests]);

  /* -------------------------------- Actions ------------------------------- */

  const switchTab = (key) => {
    setActiveTab(key);
    setQuery('');
  };

  const openConversation = useCallback((item) => router.navigate(`/messages/${item.id}`), [router]);

  const openFriendChat = async (friend) => {
    const otherUid = friend?.users?.find((id) => id !== uid);
    if (!uid || !otherUid || openingFriendId) return;

    setOpeningFriendId(otherUid);
    try {
      const friendProfile = friend.profiles?.[otherUid] || { uid: otherUid };
      const conversationId = await createOrOpenFriendConversation({
        currentUser: user || { uid },
        otherUser: { id: otherUid, ...friendProfile },
        currentProfile: profile,
        otherProfile: friendProfile,
      });
      router.navigate(`/messages/${conversationId}`);
    } catch (error) {
      showToast(error?.message || 'Unable to open this conversation.');
    } finally {
      setOpeningFriendId('');
    }
  };

  const closeFindModal = () => {
    setFindModalVisible(false);
    setSearch('');
    setMatches([]);
  };

  const closeNewChat = () => {
    setNewChatVisible(false);
    setNewChatQuery('');
  };

  const handleSendRequest = async (targetUser) => {
    const targetUid = targetUser.id || targetUser.uid;
    if (!targetUid || sendingId) return;
    setSendingId(targetUid);
    try {
      await sendFriendRequest({
        currentUid: uid,
        targetUid,
        currentProfile: profile,
        targetProfile: targetUser,
      });
      showToast(`Request sent to ${personName(targetUser)}`);
    } catch (error) {
      showToast(error?.message || 'Could not send the request.');
    } finally {
      setSendingId('');
    }
  };

  const runRequestAction = async (request, action, successText, failText) => {
    if (busyRequestId) return;
    setBusyRequestId(request.id);
    try {
      await action();
      if (successText) showToast(successText);
    } catch (error) {
      showToast(error?.message || failText);
    } finally {
      setBusyRequestId('');
    }
  };

  const handleAcceptRequest = (request) =>
    runRequestAction(
      request,
      () => acceptFriendRequest({ request, currentUid: uid, currentProfile: profile }),
      `You and ${personName(request.fromProfile)} are now friends`,
      'Could not accept the request.'
    );

  const handleDeclineRequest = (request) =>
    runRequestAction(
      request,
      () => declineFriendRequest({ request, currentUid: uid, currentProfile: profile }),
      'Request declined',
      'Could not decline the request.'
    );

  const handleCancelRequest = (request) =>
    runRequestAction(
      request,
      () => cancelFriendRequest({ requestId: request.id, currentUid: uid }),
      'Request cancelled',
      'Could not cancel the request.'
    );

  /* --------------------------- Conversation options ----------------------- */

  const handleOpenConversationOptions = useCallback((conversation) => {
    setSelectedConversation(conversation);
    setConfirmationMode(null);
    setOptionsModalVisible(true);
  }, []);

  const handleCloseOptionsModal = () => {
    if (actionLoading) return;
    setOptionsModalVisible(false);
    setSelectedConversation(null);
    setConfirmationMode(null);
  };

  const executeClearConversation = async () => {
    if (!selectedConversation?.id || !uid) return;
    const targetId = selectedConversation.id;
    setActionLoading(true);
    try {
      await clearConversationForUser(targetId, uid);
      setItems((current) =>
        current.map((item) =>
          item.id === targetId
            ? {
                ...item,
                clearedFor: { ...(item.clearedFor || {}), [uid]: new Date() },
                unread: { ...(item.unread || {}), [uid]: 0 },
              }
            : item
        )
      );
      setActionLoading(false);
      handleCloseOptionsModal();
      showToast('Chat cleared');
    } catch (error) {
      setActionLoading(false);
      showToast(error?.message || 'Could not clear this chat.');
    }
  };

  const executeDeleteConversation = async () => {
    if (!selectedConversation?.id || !uid) return;
    const targetId = selectedConversation.id;
    setActionLoading(true);
    try {
      await deleteConversationForUser(targetId, uid);
      setItems((current) => current.filter((item) => item.id !== targetId));
      setActionLoading(false);
      handleCloseOptionsModal();
      showToast('Chat deleted');
    } catch (error) {
      setActionLoading(false);
      showToast(error?.message || 'Could not delete this chat.');
    }
  };

  /* -------------------------------- Renderers ----------------------------- */

  const renderSearchBar = (value, onChange, placeholder, autoFocus = false) => (
    <View style={styles.searchWrap}>
      <Ionicons name="search-outline" size={18} color={colors.placeholder} style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={styles.searchInput}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChange('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.placeholder} />
        </Pressable>
      ) : null}
    </View>
  );

  const renderModalShell = ({ visible, title, onClose, children }) => (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <Pressable style={[styles.modalContainer, { height: windowHeight * 0.78 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Pressable style={styles.modalClose} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
            {children}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={colors.brand} colors={[colors.brand]} />
  );

  /* ------------------------------- Chats tab ------------------------------- */

  const renderConversation = ({ item }) => (
    <ConversationItem
      item={item}
      currentUid={uid}
      relation={relationFor(getPeerInfo(item, uid).peerId)}
      colors={colors}
      styles={styles}
      onPress={openConversation}
      onLongPress={handleOpenConversationOptions}
    />
  );

  const renderChatsTab = () => {
    const filtering = Boolean(normalizedQuery) || unreadOnly;
    return (
      <View style={styles.tabContent}>
        {visibleChats.length > 0 ? (
          <FlatList
            data={visibleChats}
            keyExtractor={(item) => item.id}
            renderItem={renderConversation}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={12}
            refreshControl={refreshControl}
            ListFooterComponent={!filtering ? <Text style={styles.listHint}>Long-press a chat for more options</Text> : null}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <EmptyState
              title={filtering ? 'No matching chats' : 'No conversations yet'}
              description={
                filtering
                  ? unreadOnly && !normalizedQuery
                    ? "You're all caught up."
                    : 'Try a different name or clear the search.'
                  : friends.length
                    ? 'Pick a friend to start your first conversation.'
                    : 'Add friends to start chatting with other students.'
              }
            />
            {!filtering ? (
              <Pressable
                style={styles.emptyCta}
                onPress={() => (friends.length ? setNewChatVisible(true) : setFindModalVisible(true))}
                accessibilityRole="button"
              >
                <Ionicons name={friends.length ? 'create-outline' : 'search'} size={18} color={colors.onBrand} />
                <Text style={styles.emptyCtaText}>{friends.length ? 'New message' : 'Find friends'}</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {!filtering || visibleChats.length ? (
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
            onPress={() => setNewChatVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Start a new message"
          >
            <Ionicons name="create-outline" size={20} color={colors.onBrand} />
            <Text style={styles.fabText}>New chat</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  /* ------------------------------ Friends tab ------------------------------ */

  const renderFriendRow = (friend, { onOpen } = {}) => {
    const p = friendProfileOf(friend);
    const name = personName(p);
    const otherUid = friend.users?.find((id) => id !== uid);
    const detail = [p.department, p.school || p.university].filter(Boolean).join(', ');
    const opening = openingFriendId === otherUid;

    return (
      <Pressable
        style={({ pressed }) => [styles.personCard, pressed && styles.cardPressed]}
        onPress={() => (onOpen ? onOpen(friend) : openFriendChat(friend))}
        accessibilityRole="button"
        accessibilityLabel={`Message ${name}`}
      >
        <View style={styles.avatarWrapper}>
          <Avatar uri={p.avatar} name={name} />
        </View>
        <View style={styles.personInfo}>
          <Text style={styles.personName} numberOfLines={1}>{name}</Text>
          {detail ? <Text style={styles.personDetail} numberOfLines={1}>{detail}</Text> : null}
        </View>
        <View style={styles.messageBtn}>
          {opening ? (
            <ActivityIndicator size="small" color={colors.brandText} />
          ) : (
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.brandText} />
          )}
        </View>
      </Pressable>
    );
  };

  const friendsHeader = (
    <View>
      <Pressable style={styles.findFriendBtn} onPress={() => setFindModalVisible(true)} accessibilityRole="button">
        <View style={styles.findFriendIconWrap}>
          <Ionicons name="search" size={20} color={colors.onBrand} />
        </View>
        <View style={styles.findFriendTextWrap}>
          <Text style={styles.findFriendTitle}>Find friends</Text>
          <Text style={styles.findFriendSubtitle}>Search and connect with students</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>

      <Pressable style={styles.secondaryActionBtn} onPress={() => router.navigate('/friends')} accessibilityRole="button">
        <Ionicons name="ban-outline" size={16} color={colors.textPrimary} />
        <Text style={styles.secondaryActionText}>View blocked users</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>
        {normalizedQuery ? `Results (${visibleFriends.length})` : `Friends${friends.length ? ` (${friends.length})` : ''}`}
      </Text>
    </View>
  );

  const renderFriendsTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={visibleFriends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderFriendRow(item)}
        ListHeaderComponent={friendsHeader}
        ListEmptyComponent={
          <EmptyState
            title={normalizedQuery ? 'No friends match' : 'No friends yet'}
            description={normalizedQuery ? 'Try a different name or school.' : 'Find and connect with other students to start chatting.'}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={refreshControl}
      />
    </View>
  );

  /* ------------------------------ Requests tab ----------------------------- */

  const renderRequestItem = ({ item: request, section }) => {
    const incoming = section.key === 'incoming';
    const p = (incoming ? request.fromProfile : request.toProfile) || {};
    const name = personName(p);
    const busy = busyRequestId === request.id;
    const disabled = Boolean(busyRequestId);

    return (
      <View style={styles.personCard}>
        <View style={styles.avatarWrapper}>
          <Avatar uri={p.avatar} name={name} />
        </View>
        <View style={styles.personInfo}>
          <Text style={styles.personName} numberOfLines={1}>{name}</Text>
          <Text style={styles.personDetail}>{incoming ? 'Wants to connect' : 'Request sent'}</Text>
        </View>
        {incoming ? (
          <View style={styles.requestActions}>
            <Pressable style={[styles.acceptBtn, disabled && { opacity: 0.6 }]} onPress={() => handleAcceptRequest(request)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Accept request from ${name}`}>
              {busy ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="checkmark" size={18} color={colors.onBrand} />}
            </Pressable>
            <Pressable style={[styles.declineBtn, disabled && { opacity: 0.6 }]} onPress={() => handleDeclineRequest(request)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Decline request from ${name}`}>
              <Ionicons name="close" size={18} color={colors.error} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={[styles.pillBtn, styles.pillBtnMuted, disabled && { opacity: 0.6 }]} onPress={() => handleCancelRequest(request)} disabled={disabled} accessibilityRole="button">
            {busy ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Text style={[styles.pillBtnText, styles.pillBtnTextMuted]}>Cancel</Text>}
          </Pressable>
        )}
      </View>
    );
  };

  const renderRequestsTab = () => (
    <View style={styles.tabContent}>
      <SectionList
        sections={requestSections}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestItem}
        renderSectionHeader={({ section }) => <Text style={styles.sectionLabel}>{section.title}</Text>}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <EmptyState title="No pending requests" description="Friend requests you send or receive will appear here." />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      />
    </View>
  );

  /* -------------------------------- Modals -------------------------------- */

  const renderSearchResult = ({ item }) => {
    const targetUid = item.id || item.uid;
    const name = item.username || item.name || item.email || 'Student';
    const detail = item.school || item.department || item.email || '';
    const relation = relationFor(targetUid);
    const isFriend = relation === 'friend';
    const sending = sendingId === targetUid;

    let action;
    if (isFriend) {
      action = (
        <Pressable
          style={styles.pillBtn}
          onPress={() => {
            const friend = friendByUser.get(targetUid);
            closeFindModal();
            if (friend) openFriendChat(friend);
          }}
          accessibilityRole="button"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.onBrand} />
          <Text style={styles.pillBtnText}>Message</Text>
        </Pressable>
      );
    } else if (relation === 'incoming') {
      action = (
        <Pressable style={styles.pillBtn} onPress={() => handleAcceptRequest(incomingByUser.get(targetUid))} accessibilityRole="button">
          <Ionicons name="checkmark" size={16} color={colors.onBrand} />
          <Text style={styles.pillBtnText}>Accept</Text>
        </Pressable>
      );
    } else if (relation === 'outgoing') {
      action = (
        <View style={[styles.pillBtn, styles.pillBtnMuted]}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.pillBtnText, styles.pillBtnTextMuted]}>Pending</Text>
        </View>
      );
    } else {
      action = (
        <Pressable style={[styles.pillBtn, sending && { opacity: 0.7 }]} onPress={() => handleSendRequest(item)} disabled={sending} accessibilityRole="button">
          {sending ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="person-add-outline" size={16} color={colors.onBrand} />}
          <Text style={styles.pillBtnText}>Add</Text>
        </Pressable>
      );
    }

    return (
      <View style={styles.personCard}>
        <View style={styles.avatarWrapper}>
          <Avatar uri={item.photo || item.avatar} name={name} />
        </View>
        <View style={styles.personInfo}>
          <Text style={styles.personName} numberOfLines={1}>{name}</Text>
          {detail ? <Text style={styles.personDetail} numberOfLines={1}>{detail}</Text> : null}
        </View>
        {action}
      </View>
    );
  };

  const renderFindFriendModal = () =>
    renderModalShell({
      visible: findModalVisible,
      title: 'Find friends',
      onClose: closeFindModal,
      children: (
        <>
          {renderSearchBar(search, setSearch, 'Search by name, email, or school', true)}
          <FlatList
            data={matches}
            keyExtractor={(item) => String(item.id || item.uid)}
            renderItem={renderSearchResult}
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              searching ? (
                <View style={styles.modalEmpty}>
                  <ActivityIndicator color={colors.brand} />
                  <Text style={styles.modalEmptyText}>Searching…</Text>
                </View>
              ) : search.trim().length >= MIN_SEARCH_LENGTH ? (
                <View style={styles.modalEmpty}>
                  <Ionicons name="search-outline" size={40} color={colors.icon} />
                  <Text style={styles.modalEmptyText}>No students found for “{search.trim()}”</Text>
                </View>
              ) : (
                <View style={styles.modalEmpty}>
                  <Ionicons name="people-outline" size={40} color={colors.icon} />
                  <Text style={styles.modalEmptyText}>Type at least {MIN_SEARCH_LENGTH} characters to search</Text>
                </View>
              )
            }
            ListFooterComponent={
              <Pressable
                style={[styles.secondaryActionBtn, { marginTop: 8 }]}
                onPress={() => {
                  closeFindModal();
                  router.navigate('/find-friends');
                }}
                accessibilityRole="button"
              >
                <Ionicons name="compass-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.secondaryActionText}>Browse all students</Text>
              </Pressable>
            }
          />
        </>
      ),
    });

  const renderNewChatModal = () =>
    renderModalShell({
      visible: newChatVisible,
      title: 'New message',
      onClose: closeNewChat,
      children: (
        <>
          {renderSearchBar(newChatQuery, setNewChatQuery, 'Search your friends', true)}
          <FlatList
            data={newChatFriends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) =>
              renderFriendRow(item, {
                onOpen: async (friend) => {
                  await openFriendChat(friend);
                  closeNewChat();
                },
              })
            }
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Ionicons name="people-outline" size={40} color={colors.icon} />
                <Text style={styles.modalEmptyText}>
                  {friends.length ? 'No friends match your search' : 'Add friends first to start a conversation'}
                </Text>
                {!friends.length ? (
                  <Pressable
                    style={styles.emptyCta}
                    onPress={() => {
                      closeNewChat();
                      setFindModalVisible(true);
                    }}
                    accessibilityRole="button"
                  >
                    <Ionicons name="search" size={18} color={colors.onBrand} />
                    <Text style={styles.emptyCtaText}>Find friends</Text>
                  </Pressable>
                ) : null}
              </View>
            }
          />
        </>
      ),
    });

  const renderConversationOptionsModal = () => {
    if (!selectedConversation) return null;
    const { peerId, peerInfo } = getPeerInfo(selectedConversation, uid);
    const peerName = peerInfo.name || 'Student';

    const Option = ({ icon, title, subtitle, onPress, danger }) => (
      <Pressable
        style={({ pressed }) => [styles.actionOption, danger && styles.actionOptionDanger, pressed && styles.cardPressed]}
        onPress={onPress}
        accessibilityRole="button"
      >
        <View style={[styles.actionIconWrap, danger && styles.actionIconWrapDanger]}>
          <Ionicons name={icon} size={20} color={danger ? colors.error : colors.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionTitle, danger && styles.actionTitleDanger]}>{title}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={danger ? colors.error : colors.textTertiary} />
      </Pressable>
    );

    return (
      <Modal visible={optionsModalVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleCloseOptionsModal}>
        <Pressable style={styles.modalOverlay} onPress={handleCloseOptionsModal}>
          <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.avatarWrapper}>
                <Avatar uri={peerInfo.avatar} name={peerName} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetPeerName} numberOfLines={1}>{peerName}</Text>
                <Text style={styles.sheetSubtext}>Changes only affect your view</Text>
              </View>
            </View>

            {confirmationMode ? (
              <View style={styles.confirmBox}>
                <View style={styles.confirmIconWrap}>
                  <Ionicons name={confirmationMode === 'clear' ? 'brush-outline' : 'trash-outline'} size={26} color={colors.error} />
                </View>
                <Text style={styles.confirmTitle}>{confirmationMode === 'clear' ? 'Clear this chat?' : 'Delete this chat?'}</Text>
                <Text style={styles.confirmDesc}>
                  {confirmationMode === 'clear'
                    ? `Messages will be hidden from your view. ${peerName} keeps their history.`
                    : 'This chat will disappear from your list until a new message arrives.'}
                </Text>
                <View style={styles.confirmButtonsRow}>
                  <Pressable style={styles.confirmBtnCancel} onPress={() => setConfirmationMode(null)} disabled={actionLoading}>
                    <Text style={styles.confirmBtnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmBtnDanger}
                    onPress={confirmationMode === 'clear' ? executeClearConversation : executeDeleteConversation}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color={colors.onBrand} size="small" />
                    ) : (
                      <Text style={styles.confirmBtnDangerText}>{confirmationMode === 'clear' ? 'Clear chat' : 'Delete chat'}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View>
                <Option
                  icon="chatbubble-outline"
                  title="Open chat"
                  subtitle="Continue the conversation"
                  onPress={() => {
                    const target = selectedConversation;
                    handleCloseOptionsModal();
                    openConversation(target);
                  }}
                />
                {peerId ? (
                  <Option
                    icon="person-outline"
                    title="View profile"
                    subtitle={`See ${peerName}'s profile`}
                    onPress={() => {
                      handleCloseOptionsModal();
                      router.navigate(`/view-user-profile/${peerId}`);
                    }}
                  />
                ) : null}
                <Option icon="brush-outline" title="Clear chat history" subtitle="Remove messages from your view" onPress={() => setConfirmationMode('clear')} />
                <Option icon="trash-outline" title="Delete chat" subtitle="Remove this chat from your list" danger onPress={() => setConfirmationMode('delete')} />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  /* --------------------------------- Render -------------------------------- */

  const subtitle = totalUnread > 0 ? `${totalUnread} unread message${totalUnread === 1 ? '' : 's'}` : 'Direct messages';

  const tabBadge = (key) => {
    if (key === 'chats' && unreadChats > 0) return { count: unreadChats, brand: true };
    if (key === 'requests' && incomingRequests.length > 0) return { count: incomingRequests.length, brand: false };
    return null;
  };

  return (
    <ScreenShell title="Messenger" subtitle={subtitle} showBack loading={loading} scrollable={false}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const badge = tabBadge(tab.key);
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => switchTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons name={tab.icon} size={18} color={isActive ? colors.brandText : colors.textTertiary} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              {badge ? (
                <View style={[styles.tabBadge, badge.brand && styles.tabBadgeBrand]}>
                  <Text style={styles.tabBadgeText}>{badge.count > 99 ? '99+' : badge.count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {activeTab !== 'requests'
        ? renderSearchBar(query, setQuery, activeTab === 'chats' ? 'Search chats' : 'Search friends')
        : null}

      {activeTab === 'chats' ? (
        <View style={styles.chipRow}>
          <Pressable style={[styles.chip, !unreadOnly && styles.chipActive]} onPress={() => setUnreadOnly(false)} accessibilityRole="button">
            <Text style={[styles.chipText, !unreadOnly && styles.chipTextActive]}>All</Text>
          </Pressable>
          <Pressable style={[styles.chip, unreadOnly && styles.chipActive]} onPress={() => setUnreadOnly(true)} accessibilityRole="button">
            <Text style={[styles.chipText, unreadOnly && styles.chipTextActive]}>
              Unread{unreadChats > 0 ? ` (${unreadChats})` : ''}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {activeTab === 'chats' && renderChatsTab()}
      {activeTab === 'friends' && renderFriendsTab()}
      {activeTab === 'requests' && renderRequestsTab()}

      {renderFindFriendModal()}
      {renderNewChatModal()}
      {renderConversationOptionsModal()}

      {toast ? (
        <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}
    </ScreenShell>
  );
}