import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EvosAura from '../../src/shared/components/EvosAura';
import EmptyState from '../../src/shared/components/EmptyState';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { deleteJson, getJson, postJson, putJson, uploadFeatureMedia } from '../../src/shared/services/backend';
import { buildContentShareUrl, shareContent } from '../../utils/share';
import { useAuth } from '../../context/AuthContext';
import { isPremiumActive } from '../../src/shared/services/premium';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getUserProfileById,
  listenIncomingFriendRequests,
  listenRelationship,
  listSuggestedFriends,
  RELATIONSHIP,
  removeFriend,
  sendFriendRequest,
} from '../../src/shared/services/friendships';
import { fetchStudentListings } from '../../src/shared/services/firestore';

const PRESET_COLORS = {
  indigo: '#4F46E5',
  violet: '#7C3AED',
  blue: '#0284C7',
  green: '#15803D',
  orange: '#EA580C',
  pink: '#DB2777',
  red: '#DC2626',
  dark: '#111827',
};

const AUDIENCES = [
  { value: 'friends', label: 'Friends', icon: 'people-outline' },
  { value: 'private', label: 'Only me', icon: 'lock-closed-outline' },
  { value: 'everyone', label: 'Everyone', icon: 'globe-outline' },
];
const AUDIENCE_ICON = Object.fromEntries(AUDIENCES.map((a) => [a.value, a.icon]));

const TYPE_FILTERS = [['all', 'All'], ['text', 'Text'], ['image', 'Photos'], ['colored', 'Backgrounds']];
const SORT_FILTERS = [['smart', 'For you'], ['latest', 'Latest'], ['oldest', 'Oldest first'], ['popular', 'Popular']];
const TIME_FILTERS = [['all', 'Any time'], ['today', 'Today'], ['week', 'This week'], ['month', 'This month']];
const labelOf = (list, value) => list.find(([v]) => v === value)?.[1] || value;

// Pagination / freshness settings.
const PAGE_SIZE = 20;
const NEW_POSTS_POLL_MS = 60 * 1000;

// Floating "write" button. Sits above the bottom inset; raise FAB_OFFSET if
// your ScreenShell draws a tab bar over the content.
const FAB_SIZE = 56;
const FAB_OFFSET = 20;
const DELETE_UNDO_MS = 4600;

const HOME_TOOLS = [
  { id: 'challenge', title: 'Daily Challenge', note: 'Keep your streak moving', icon: 'flame', route: '/challenge', color: '#EA580C' },
  { id: 'cbt', title: 'CBT Practice', note: 'Practice before the exam', icon: 'school-outline', route: '/cbt', color: '#15803D' },
  { id: 'cgpa', title: 'GPA & CGPA', note: 'Plan your semester well', icon: 'stats-chart-outline', route: '/cgpa', color: '#4F46E5' },
  { id: 'schedule', title: 'Smart Schedule', note: 'Keep classes in view', icon: 'calendar-outline', route: '/smart-timetable', color: '#DB2777' },
  { id: 'pomodoro', title: 'Focus Timer', note: 'A calmer study session', icon: 'timer-outline', route: '/pomodoroScreen', color: '#D97706' },
];

const personName = (person = {}) => person.displayName || person.display_name || person.name || person.username || [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Student';
const personAvatar = (person = {}) => person.photoThumb || person.photoURL || person.photo || person.avatar || '';
const listingImage = (listing = {}) => {
  const value = listing.imageUrl || listing.thumbnailUrl || listing.coverUrl || listing.images?.[0]?.url || listing.images?.[0] || '';
  return typeof value === 'string' ? value : value?.url || value?.secure_url || '';
};
const listingPrice = (value) => Number.isFinite(Number(value)) ? `\u20A6${Number(value).toLocaleString()}` : 'Price on request';
const seededRandom = (seed) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const getPostHashtags = (item) => item.tags?.length
  ? item.tags
  : [...new Set((item.content || '').match(/#[a-zA-Z0-9_]{1,40}/g) || [])].map((tag) => tag.toLowerCase());

const renderFeedText = (content, linkStyle, onOpenLink) => {
  const text = String(content || '');
  const pattern = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
  const parts = [];
  let last = 0;
  let match;

  while ((match = pattern.exec(text))) {
    const raw = match[0];
    const trailing = raw.match(/[.,!?;:)}\]]+$/)?.[0] || '';
    const visible = trailing ? raw.slice(0, -trailing.length) : raw;
    if (!visible) continue;
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <Text
        key={`link-${match.index}`}
        accessibilityRole="link"
        style={linkStyle}
        onPress={() => onOpenLink(/^https?:\/\//i.test(visible) ? visible : `https://${visible}`)}
      >
        {visible}
      </Text>
    );
    if (trailing) parts.push(trailing);
    last = match.index + raw.length;
  }

  if (!parts.length) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

// Firestore can hand back Timestamp objects instead of ISO strings, and
// `new Date(timestamp)` on one of those silently produces "Invalid Date".
// Normalize either shape before using it.
const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const timeAgo = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// 1243 -> 1.2k, 15300 -> 15k, 2400000 -> 2.4m
const formatCount = (n) => {
  const value = Number(n) || 0;
  if (value < 1000) return String(value);
  if (value < 1000000) return `${(value / 1000).toFixed(value < 10000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}m`;
};

// Reads the paging info off a feed response in one place.
const readPageInfo = (response) => {
  const cursor = response?.nextCursor || null;
  const hasMore = typeof response?.hasMore === 'boolean' ? response.hasMore && Boolean(cursor) : Boolean(cursor);
  return { cursor, hasMore };
};

const fetchFeedPage = (cursor) => {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) params.set('cursor', cursor);
  return getJson(`/api/feed?${params.toString()}`);
};

// Light haptic feedback. Never throws on devices without a haptic engine.
const tap = () => { try { Haptics.selectionAsync().catch(() => {}); } catch { /* noop */ } };
const success = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch { /* noop */ }
};

const isPendingId = (id) => String(id || '').startsWith('pending-');
const isLocalId = (id) => String(id || '').startsWith('local-');

// Tracks whether the software keyboard is open so docked bars can drop the
// home-indicator inset while the keyboard is covering it.
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

// Snackbar with optional action. Springs in, fades out.
function useToast() {
  const [toast, setToast] = useState(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true })
      .start(({ finished }) => { if (finished) setToast(null); });
  }, [anim]);

  const show = useCallback((message, { icon = 'checkmark-circle', actionLabel, onAction } = {}) => {
    clearTimeout(timer.current);
    setToast({ message, icon, actionLabel, onAction });
    Animated.spring(anim, { toValue: 1, friction: 9, tension: 100, useNativeDriver: true }).start();
    timer.current = setTimeout(hide, actionLabel ? 4500 : 2200);
  }, [anim, hide]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, anim, show, hide };
}

// One modal wrapper for every sheet. The backdrop is a sibling (not a parent)
// of the sheet so touches inside lists / inputs are never swallowed, and the
// KeyboardAvoidingView lifts the sheet above the keyboard on both platforms.
function BottomSheet({ visible, onClose, styles, sheetStyle, avoidKeyboard = false, align = 'bottom', animationType = 'slide', children }) {
  return (
    <Modal visible={visible} transparent animationType={animationType} statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled={avoidKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={align === 'center' ? styles.centerBackdrop : styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss" />
          <View style={sheetStyle}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// One of the three Facebook-style action buttons. Pops when pressed.
function ActionButton({ icon, label, active, color, activeColor, onPress, disabled, accessibilityLabel, styles }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, friction: 4, tension: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Pressable
      style={({ pressed }) => [styles.fbAction, pressed && styles.fbActionPressed, disabled && { opacity: 0.4 }]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={icon} size={20} color={active ? activeColor : color} />
      </Animated.View>
      <Text style={[styles.fbActionText, active && { color: activeColor }]}>{label}</Text>
    </Pressable>
  );
}

// A single post. Memoized so liking / commenting on one post doesn't
// re-render every card in the list.
const PostCard = React.memo(function PostCard({
  item, liked, styles, colors, onOpenProfile, onMenu, onLike, onComment, onShare, onOpenImage, onTagPress, onOpenLink,
}) {
  const tags = useMemo(() => getPostHashtags(item), [item]);
  const [expanded, setExpanded] = useState(false);
  const burst = useRef(new Animated.Value(0)).current;
  const tapTimer = useRef(null);
  const lastTap = useRef(0);
  useEffect(() => () => clearTimeout(tapTimer.current), []);

  const isColored = item.type === 'colored';
  const pending = Boolean(item.pending);
  const text = String(item.content || '');
  const isLong = text.length > 280 || text.split('\n').length > 6;
  const likes = item.likesCount || 0;
  const commentsCount = item.commentsCount || 0;
  const views = item.viewsCount || 0;

  const playBurst = () => {
    burst.setValue(0);
    Animated.sequence([
      Animated.spring(burst, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 0, duration: 220, delay: 250, useNativeDriver: true }),
    ]).start();
  };

  // Single tap opens the lightbox, double tap likes.
  const onImageTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 260) {
      clearTimeout(tapTimer.current);
      lastTap.current = 0;
      if (!pending) {
        if (!liked) onLike(item);
        playBurst();
      }
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => {
      lastTap.current = 0;
      onOpenImage(item.imageUrl);
    }, 260);
  };

  return (
    <View style={[styles.card, pending && { opacity: 0.7 }]}>
      <View style={[styles.postHeader, styles.cardPad]}>
        <Pressable onPress={() => onOpenProfile(item)} disabled={pending} accessibilityRole="button" accessibilityLabel={`Open ${item.authorName || 'student'} profile`}>
          <EvosAura size={40} active={item.authorPremium}>
            {item.authorAvatar ? <Image source={{ uri: item.authorAvatar }} style={styles.avatar} contentFit="cover" /> : <View style={styles.avatar} />}
          </EvosAura>
        </Pressable>
        <View style={styles.authorCol}>
          <View style={styles.authorRow}>
            <Text style={styles.author} numberOfLines={1}>{item.authorName || 'UniHelp student'}</Text>
            {item.authorPremium ? <Ionicons name="checkmark-circle" size={14} color={colors.brand} style={{ marginLeft: 4 }} /> : null}
          </View>
          <View style={styles.authorRow}>
            <Text style={styles.time}>{pending ? 'Posting…' : timeAgo(item.createdAt)}</Text>
            {item.audience && AUDIENCE_ICON[item.audience] ? (
              <>
                <Text style={styles.time}>{'  ·  '}</Text>
                <Ionicons name={AUDIENCE_ICON[item.audience]} size={12} color={colors.textTertiary} />
              </>
            ) : null}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.menu, pressed && { backgroundColor: colors.surfacePrimary }]}
          onPress={() => onMenu(item)}
          disabled={pending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Post options"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {!isColored && text ? (
        <View style={styles.cardPad}>
          <Text style={styles.description} numberOfLines={expanded || !isLong ? undefined : 6}>
            {renderFeedText(text, styles.postLink, onOpenLink)}
          </Text>
          {isLong ? (
            <Pressable onPress={() => { tap(); setExpanded((v) => !v); }} hitSlop={6}>
              <Text style={styles.seeMore}>{expanded ? 'See less' : 'See more'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isColored ? (
        <View style={[styles.colored, { backgroundColor: PRESET_COLORS[item.backgroundPreset] || PRESET_COLORS.indigo }]}>
          <Text style={styles.coloredText}>{renderFeedText(text, styles.coloredLink, onOpenLink)}</Text>
        </View>
      ) : null}

      {item.type === 'image' && item.imageUrl ? (
        <Pressable onPress={onImageTap} accessibilityRole="button" accessibilityLabel="Open full image. Double tap to like.">
          <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" transition={150} />
          <View style={styles.burstLayer} pointerEvents="none">
            <Animated.View style={{ opacity: burst, transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }] }}>
              <Ionicons name="thumbs-up" size={84} color="#FFFFFF" />
            </Animated.View>
          </View>
        </Pressable>
      ) : null}

      {tags.length ? (
        <View style={[styles.hashtagRow, styles.cardPad]}>
          {tags.map((tag) => (
            <Pressable key={tag} style={({ pressed }) => [styles.hashtag, pressed && { opacity: 0.6 }]} onPress={() => onTagPress(tag)}>
              <Text style={styles.hashtagText}>{tag}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Reaction summary line */}
      {likes > 0 || commentsCount > 0 || views > 0 ? (
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            {likes > 0 ? (
              <>
                <View style={styles.summaryBadge}><Ionicons name="thumbs-up" size={11} color={colors.onBrand} /></View>
                <Text style={styles.summaryText}>{formatCount(likes)}</Text>
              </>
            ) : null}
          </View>
          <Pressable onPress={() => { if (!pending) onComment(item); }} hitSlop={6}>
            <Text style={styles.summaryText}>
              {[
                commentsCount > 0 ? `${formatCount(commentsCount)} ${commentsCount === 1 ? 'comment' : 'comments'}` : null,
                views > 0 ? `${formatCount(views)} ${views === 1 ? 'view' : 'views'}` : null,
              ].filter(Boolean).join('  ·  ')}
            </Text>
          </Pressable>
        </View>
      ) : <View style={{ height: 10 }} />}

      <View style={styles.actionRow}>
        <ActionButton
          styles={styles}
          icon={liked ? 'thumbs-up' : 'thumbs-up-outline'}
          label="Like"
          active={liked}
          color={colors.textSecondary}
          activeColor={colors.brand}
          disabled={pending}
          onPress={() => onLike(item)}
          accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
        />
        <ActionButton
          styles={styles}
          icon="chatbubble-outline"
          label="Comment"
          color={colors.textSecondary}
          disabled={pending}
          onPress={() => onComment(item)}
          accessibilityLabel="Open comments"
        />
        <ActionButton
          styles={styles}
          icon="arrow-redo-outline"
          label="Share"
          color={colors.textSecondary}
          disabled={pending}
          onPress={() => onShare(item)}
          accessibilityLabel="Share post"
        />
      </View>
    </View>
  );
});

function HomeInsert({ item, styles, colors, router, onAddFriend, onRespond }) {
  const openProfile = (person) => {
    const id = person?.uid || person?.id;
    if (id) router.push(`/view-user-profile/${id}`);
  };

  if (item.kind === 'requests') {
    const requests = item.requests.slice(0, 2);
    return (
      <View style={styles.homeInsert}>
        <View style={styles.homeInsertHeader}>
          <View><Text style={styles.homeInsertTitle}>Friend requests</Text><Text style={styles.homeInsertCaption}>People who want to connect with you</Text></View>
          <Pressable onPress={() => router.push('/friends')}><Text style={styles.homeInsertLink}>See all</Text></Pressable>
        </View>
        {requests.map((request) => {
          const person = request.fromProfile || {};
          const name = personName(person);
          return <View key={request.id} style={styles.requestRow}>
            <Pressable onPress={() => openProfile({ ...person, uid: request.from })}>
              {personAvatar(person) ? <Image source={{ uri: personAvatar(person) }} style={styles.insertAvatar} contentFit="cover" /> : <View style={styles.insertAvatar}><Text style={styles.insertInitial}>{name[0]}</Text></View>}
            </Pressable>
            <Pressable style={{ flex: 1 }} onPress={() => openProfile({ ...person, uid: request.from })}><Text style={styles.insertName} numberOfLines={1}>{name}</Text><Text style={styles.insertMeta} numberOfLines={1}>{person.department || person.school || person.university || 'Student network'}</Text></Pressable>
            <Pressable style={({ pressed }) => [styles.requestAccept, pressed && { opacity: 0.8 }]} onPress={() => onRespond(request, true)}><Text style={styles.requestAcceptText}>Confirm</Text></Pressable>
            <Pressable style={({ pressed }) => [styles.requestDecline, pressed && { opacity: 0.7 }]} onPress={() => onRespond(request, false)}><Ionicons name="close" size={18} color={colors.textSecondary} /></Pressable>
          </View>;
        })}
      </View>
    );
  }

  if (item.kind === 'friends') {
    return (
      <View style={styles.homeInsert}>
        <View style={styles.homeInsertHeader}>
          <View><Text style={styles.homeInsertTitle}>People you may know</Text><Text style={styles.homeInsertCaption}>Build a campus circle that helps you grow</Text></View>
          <Pressable onPress={() => router.push('/find-friends')}><Text style={styles.homeInsertLink}>Discover</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insertScroll}>
          {item.people.map((person) => {
            const name = personName(person);
            return <View key={person.uid || person.id} style={styles.personSuggestion}>
              <Pressable onPress={() => openProfile(person)}>
                {personAvatar(person) ? <Image source={{ uri: personAvatar(person) }} style={styles.suggestionAvatar} contentFit="cover" /> : <View style={styles.suggestionAvatar}><Text style={styles.suggestionInitial}>{name[0]}</Text></View>}
              </Pressable>
              <Text style={styles.suggestionName} numberOfLines={1}>{name}</Text>
              <Text style={styles.suggestionMeta} numberOfLines={1}>{person.department || person.school || 'Campus student'}</Text>
              <Pressable style={({ pressed }) => [styles.addFriendButton, pressed && { opacity: 0.75 }]} onPress={() => onAddFriend(person)}><Ionicons name="person-add-outline" size={14} color={colors.brandText} /><Text style={styles.addFriendText}>Connect</Text></Pressable>
            </View>;
          })}
        </ScrollView>
      </View>
    );
  }

  if (item.kind === 'products') {
    return (
      <View style={styles.homeInsert}>
        <View style={styles.homeInsertHeader}>
          <View><Text style={styles.homeInsertTitle}>Around your campus</Text><Text style={styles.homeInsertCaption}>Fresh finds from fellow students</Text></View>
          <Pressable onPress={() => router.push('/studentmarketplace')}><Text style={styles.homeInsertLink}>Browse market</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insertScroll}>
          {item.products.map((product, index) => <Pressable key={product.id || `${product.title || product.name || 'product'}-${index}`} style={({ pressed }) => [styles.productSuggestion, pressed && { opacity: 0.85 }]} onPress={() => router.push('/studentmarketplace')}>
            {listingImage(product) ? <Image source={{ uri: listingImage(product) }} style={styles.productImage} contentFit="cover" /> : <View style={[styles.productImage, styles.productImageFallback]}><Ionicons name="storefront-outline" size={24} color={colors.brandText} /></View>}
            <Text style={styles.productPrice}>{listingPrice(product.price || product.amount)}</Text>
            <Text style={[styles.suggestionName, styles.productCopy]} numberOfLines={1}>{product.title || product.name || 'Campus listing'}</Text>
            <Text style={[styles.suggestionMeta, styles.productCopy]} numberOfLines={1}>{product.category || 'Student marketplace'}</Text>
          </Pressable>)}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.homeInsert}>
      <View style={styles.homeInsertHeader}>
        <View><Text style={styles.homeInsertTitle}>Made for your next move</Text><Text style={styles.homeInsertCaption}>A smart tool, right when you need it</Text></View>
        <Pressable onPress={() => router.push('/toolScreen')}><Text style={styles.homeInsertLink}>All tools</Text></Pressable>
      </View>
      {item.tools.map((tool) => <Pressable key={tool.id} style={({ pressed }) => [styles.toolSuggestion, pressed && { opacity: 0.7 }]} onPress={() => router.push(tool.route)}>
        <View style={[styles.toolSuggestionIcon, { backgroundColor: `${tool.color}18` }]}><Ionicons name={tool.icon} size={20} color={tool.color} /></View>
        <View style={{ flex: 1 }}><Text style={styles.insertName}>{tool.title}</Text><Text style={styles.insertMeta}>{tool.note}</Text></View>
        <Ionicons name="arrow-forward" size={17} color={colors.textTertiary} />
      </Pressable>)}
    </View>
  );
}

export default function NewsFeedPage() {
  const router = useRouter();
  const routeParams = useLocalSearchParams();
  const rawSharedPostId = Array.isArray(routeParams.post) ? routeParams.post[0] : routeParams.post;
  const sharedPostId = typeof rawSharedPostId === 'string' ? rawSharedPostId.trim() : '';
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { toast, anim: toastAnim, show: showToast, hide: hideToast } = useToast();
  const currentUid = user?.uid;
  const viewerAvatar = profile?.photoThumb || profile?.photoURL || profile?.photo || profile?.avatar || user?.photoURL || '';

  const [items, setItems] = useState([]);
  const [sharedPostResult, setSharedPostResult] = useState(null);
  const sharedPost = sharedPostResult?.id === sharedPostId ? sharedPostResult.post : null;
  const sharedPostError = sharedPostResult?.id === sharedPostId && sharedPostResult.error;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedCursor, setFeedCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [newPosts, setNewPosts] = useState(null); // { count, avatars }
  const [composerOpen, setComposerOpen] = useState(false);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('text');
  const [backgroundPreset, setBackgroundPreset] = useState('indigo');
  const [selectedImage, setSelectedImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [commentsPost, setCommentsPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsCursor, setCommentsCursor] = useState(null);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [managePost, setManagePost] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [profileRelationship, setProfileRelationship] = useState({ state: RELATIONSHIP.NONE });
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [postAudience, setPostAudience] = useState('friends');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('smart');
  const [timeFilter, setTimeFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [likedPostIds, setLikedPostIds] = useState(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [homeDiscovery, setHomeDiscovery] = useState({ friends: [], products: [] });
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [homeStreamSeed, setHomeStreamSeed] = useState(() => Date.now());
  const [fabActive, setFabActive] = useState(false);

  const viewedPosts = useRef(new Set());
  const pillAnim = useRef(new Animated.Value(0)).current;
  const skeletonAnim = useRef(new Animated.Value(0.55)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabActiveRef = useRef(false);
  const composerHeightRef = useRef(150);
  const listRef = useRef(null);
  // Incremented on every refresh so slow "load more" / refresh responses
  // from an older request can never overwrite newer data.
  const requestIdRef = useRef(0);
  const commentsRequestRef = useRef(0);
  const itemsRef = useRef([]);
  const busyRef = useRef(true);
  const likedRef = useRef(new Set());
  const likeBusyRef = useRef(new Set());
  const commentLikeBusyRef = useRef(new Set());
  const profileRef = useRef(profile);
  const draftStashRef = useRef(null); // a new-post draft parked while editing an existing post
  const deleteTimersRef = useRef({});

  const sheetBottomPad = keyboardVisible ? 10 : Math.max(insets.bottom, 10);

  const styles = useThemeStyles((c, s, r) => ({
    // Search
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: s.md,
      marginTop: s.sm,
      marginBottom: s.xs || 4,
      paddingHorizontal: s.md,
      borderRadius: r.xl,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    searchInput: { flex: 1, color: c.textPrimary, paddingVertical: 11, fontSize: 14 },

    // Composer card: first row of the list, scrolls away with the feed
    headerCard: { backgroundColor: c.card },
    composerEntry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingTop: s.md,
      paddingBottom: s.sm,
      paddingHorizontal: s.lg,
    },
    avatarSm: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandLight },
    composerPill: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 999,
      backgroundColor: c.surfacePrimary,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    composerPillDraft: { borderColor: c.brand },
    composerPillText: { color: c.textSecondary, fontSize: 14.5, fontWeight: '500' },
    composerPillTextDraft: { color: c.brandText, fontWeight: '700' },
    quickRow: {
      flexDirection: 'row',
      marginHorizontal: s.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderDefault,
    },
    quickButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, marginVertical: 2, borderRadius: 8 },
    quickButtonPressed: { backgroundColor: c.surfacePrimary },
    quickText: { color: c.textSecondary, fontSize: 13.5, fontWeight: '700' },
    feedBg: { flex: 1, backgroundColor: c.surfacePrimary },
    homeControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: s.lg,
      paddingTop: s.sm,
      paddingBottom: s.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderDefault,
    },
    homeControlsLabel: { color: c.textTertiary, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.2 },
    inlineFilterButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: r.full, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
    inlineFilterButtonActive: { backgroundColor: c.brand, borderColor: c.brand },
    inlineFilterText: { color: c.brandText, fontSize: 11.5, fontWeight: '900' },
    inlineFilterTextActive: { color: c.onBrand },
    inlineFilterBadge: { minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: c.onBrand },
    inlineFilterBadgeText: { color: c.brandText, fontSize: 9, fontWeight: '900' },

    // Active filter summary
    activeBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: s.lg,
      paddingTop: 2,
      paddingBottom: s.sm,
    },
    activeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: c.brandLight },
    activeChipText: { color: c.brandText, fontSize: 11.5, fontWeight: '800' },
    activeClear: { marginLeft: 'auto', paddingVertical: 4, paddingHorizontal: 6 },
    activeClearText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },

    // Floating write button (appears once the composer has scrolled away)
    fabWrap: { position: 'absolute', right: 18, zIndex: 30 },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brand,
      shadowColor: '#000',
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    fabDot: { position: 'absolute', top: 12, right: 12, width: 11, height: 11, borderRadius: 6, backgroundColor: '#F59E0B', borderWidth: 2, borderColor: c.brand },

    // Composer sheet
    composerSheet: { height: '92%', backgroundColor: c.card, borderTopLeftRadius: r['3xl'], borderTopRightRadius: r['3xl'], overflow: 'hidden' },
    sheetTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: s.lg,
      paddingTop: s.sm,
      paddingBottom: s.md,
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
    },
    sheetTopTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    sheetCancel: { paddingVertical: 8, paddingRight: 12, minWidth: 64 },
    sheetCancelText: { color: c.textSecondary, fontSize: 14, fontWeight: '800' },
    postButton: { minWidth: 64, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, backgroundColor: c.brand },
    postButtonDisabled: { opacity: 0.45 },
    postButtonText: { color: c.onBrand, fontSize: 13, fontWeight: '800' },
    composerBody: { padding: s.lg, paddingBottom: s.xl },
    composerWho: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: s.md },
    audienceRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    audienceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    audienceChipActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    audienceChipText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
    audienceChipTextActive: { color: c.brandText },
    composerInput: { color: c.textPrimary, fontSize: 17, lineHeight: 24, minHeight: 120, textAlignVertical: 'top' },
    coloredComposer: { minHeight: 240, borderRadius: r.xl, padding: 24, justifyContent: 'center' },
    coloredComposerInput: { color: '#FFFFFF', fontSize: 22, lineHeight: 30, fontWeight: '900', textAlign: 'center', minHeight: 180, textAlignVertical: 'center' },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
    preset: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    selectedPreset: { borderColor: c.textPrimary },
    imagePreviewWrap: { marginTop: 12, borderRadius: r.xl, overflow: 'hidden' },
    imagePreview: { width: '100%', height: 220, backgroundColor: c.surfacePrimary },
    removeImageButton: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.65)' },
    composerToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: s.lg,
      paddingTop: s.sm,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
      backgroundColor: c.card,
    },
    toolButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: r.lg, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    toolButtonActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    toolText: { color: c.textSecondary, fontSize: 12.5, fontWeight: '800' },
    toolTextActive: { color: c.brandText },
    charCount: { marginLeft: 'auto', color: c.textTertiary, fontSize: 12, fontWeight: '700' },

    // Post cards: full-width white sections, grey gap between them
    card: { backgroundColor: c.card, marginTop: 8, paddingTop: s.md },
    cardPad: { paddingHorizontal: s.lg },
    skeletonCard: { backgroundColor: c.card, marginTop: 8, padding: s.lg },
    skeletonLine: { height: 12, borderRadius: 6, backgroundColor: c.surfacePrimary },
    skeletonBlock: { height: 140, borderRadius: r.xl, backgroundColor: c.surfacePrimary, marginTop: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandLight },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    authorCol: { flex: 1, gap: 1 },
    authorRow: { flexDirection: 'row', alignItems: 'center' },
    author: { flexShrink: 1, color: c.textPrimary, fontSize: 15, fontWeight: '700' },
    time: { color: c.textTertiary, fontSize: 12.5 },
    menu: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    description: { marginTop: 12, fontSize: 16, lineHeight: 23, color: c.textPrimary },
    seeMore: { marginTop: 4, color: c.textSecondary, fontSize: 14.5, fontWeight: '700' },
    postLink: { color: c.brand, textDecorationLine: 'underline' },
    colored: { minHeight: 280, justifyContent: 'center', alignItems: 'center', padding: 28, marginTop: 12 },
    coloredText: { color: '#fff', fontSize: 22, lineHeight: 30, textAlign: 'center', fontWeight: '900' },
    coloredLink: { color: '#DBEAFE', textDecorationLine: 'underline' },
    image: { height: 340, width: '100%', backgroundColor: c.surfacePrimary, marginTop: 12 },
    burstLayer: { ...StyleSheet.absoluteFillObject, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
    hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    hashtag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: r.lg, backgroundColor: c.brandLight },
    hashtagText: { color: c.brandText, fontSize: 11.5, fontWeight: '800' },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s.lg, paddingTop: 12, paddingBottom: 10 },
    summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summaryBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
    summaryText: { color: c.textSecondary, fontSize: 13 },
    actionRow: {
      flexDirection: 'row',
      marginHorizontal: s.lg,
      paddingVertical: 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderDefault,
    },
    fbAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, marginVertical: 2, borderRadius: 8 },
    fbActionPressed: { backgroundColor: c.surfacePrimary },
    fbActionText: { fontSize: 13.5, fontWeight: '700', color: c.textSecondary },

    // Home stream inserts: same full-bleed treatment as posts
    homeInsert: { marginTop: 8, padding: s.lg, backgroundColor: c.card },
    homeInsertHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: s.md },
    homeInsertTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '900' },
    homeInsertCaption: { marginTop: 2, color: c.textTertiary, fontSize: 11.5, fontWeight: '600' },
    homeInsertLink: { color: c.brandText, fontSize: 12, fontWeight: '900', paddingVertical: 3 },
    insertScroll: { gap: 10, paddingRight: 2 },
    personSuggestion: { width: 126, padding: 10, borderRadius: r.lg, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    suggestionAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
    suggestionInitial: { color: c.brandText, fontSize: 16, fontWeight: '900' },
    suggestionName: { color: c.textPrimary, fontSize: 12.5, fontWeight: '800' },
    suggestionMeta: { marginTop: 2, color: c.textTertiary, fontSize: 10.5 },
    addFriendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10, paddingVertical: 7, borderRadius: r.md, backgroundColor: c.brandLight },
    addFriendText: { color: c.brandText, fontSize: 11, fontWeight: '900' },
    requestRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault },
    insertAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight },
    insertInitial: { color: c.brandText, fontSize: 14, fontWeight: '900' },
    insertName: { color: c.textPrimary, fontSize: 13, fontWeight: '800' },
    insertMeta: { marginTop: 2, color: c.textTertiary, fontSize: 11 },
    requestAccept: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: r.md, backgroundColor: c.brand },
    requestAcceptText: { color: c.onBrand, fontSize: 11, fontWeight: '900' },
    requestDecline: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: r.md, backgroundColor: c.surfacePrimary },
    productSuggestion: { width: 142, overflow: 'hidden', borderRadius: r.lg, paddingBottom: 9, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    productImage: { width: '100%', height: 84, backgroundColor: c.brandLight },
    productImageFallback: { alignItems: 'center', justifyContent: 'center' },
    productPrice: { marginTop: 8, marginHorizontal: 9, color: c.brandText, fontSize: 12, fontWeight: '900' },
    productCopy: { marginHorizontal: 9 },
    toolSuggestion: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault },
    toolSuggestionIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },

    // Sheets / modals
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.48)' },
    centerBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: s.lg, backgroundColor: 'rgba(15,23,42,0.48)' },
    actionCard: { backgroundColor: c.card, borderTopLeftRadius: r['3xl'], borderTopRightRadius: r['3xl'], padding: s.lg, gap: 8 },
    modalHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: c.borderDefault, marginBottom: s.sm },
    modalTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '900', marginBottom: s.sm },
    modalAction: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: s.md, borderRadius: r.xl, backgroundColor: c.surfacePrimary },
    modalActionText: { color: c.textPrimary, fontSize: 14, fontWeight: '800' },
    modalDangerText: { color: c.error || '#DC2626' },

    // Filters
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: s.md },
    filterButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: r.lg, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    filterButtonActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    filterText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
    filterTextActive: { color: c.brandText },
    filterCaption: { color: c.textTertiary, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, marginBottom: 6, marginTop: 2 },

    // Profile preview
    profileCard: { alignItems: 'center', backgroundColor: c.card, borderRadius: r['3xl'], padding: s.xl, gap: 8 },
    profileAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: c.brandLight },
    profileName: { color: c.textPrimary, fontSize: 19, fontWeight: '900' },
    profileButton: { width: '100%', alignItems: 'center', paddingVertical: 13, borderRadius: r.xl, backgroundColor: c.brand, marginTop: s.sm },
    profileButtonText: { color: c.onBrand, fontSize: 13, fontWeight: '900' },
    profileSecondaryButton: { width: '100%', alignItems: 'center', paddingVertical: 13, borderRadius: r.xl, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    profileSecondaryButtonText: { color: c.textPrimary, fontSize: 13, fontWeight: '900' },
    profileCloseButton: { width: '100%', alignItems: 'center', paddingVertical: 10 },
    profileCloseText: { color: c.textSecondary, fontSize: 13, fontWeight: '800' },

    // Comments
    commentsSheet: { height: '80%', backgroundColor: c.card, borderTopLeftRadius: r['3xl'], borderTopRightRadius: r['3xl'], paddingTop: s.md, overflow: 'hidden' },
    commentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s.lg, paddingBottom: s.md, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    commentsTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    commentsCount: { color: c.textTertiary, fontSize: 12, fontWeight: '700' },
    commentsList: { flex: 1 },
    commentItem: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
    commentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.brandLight },
    commentCopy: { flex: 1 },
    commentAuthor: { color: c.textPrimary, fontSize: 12.5, fontWeight: '900' },
    commentBody: { marginTop: 3, color: c.textSecondary, fontSize: 13.5, lineHeight: 19 },
    commentDate: { marginTop: 3, color: c.textTertiary, fontSize: 10.5 },
    commentsMore: { alignItems: 'center', paddingVertical: 12 },
    commentsMoreText: { color: c.brandText, fontSize: 12, fontWeight: '900' },
    commentsEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 8 },
    commentsEmptyText: { color: c.textTertiary, fontSize: 13 },
    commentsComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: s.md, paddingTop: s.sm, borderTopWidth: 1, borderTopColor: c.borderDefault, backgroundColor: c.card },
    commentInput: { flex: 1, color: c.textPrimary, backgroundColor: c.surfacePrimary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
    sendButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
    sendButtonDisabled: { opacity: 0.45 },

    // Lightbox
    imageLightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' },
    imageLightboxImage: { width: '100%', height: '82%' },
    imageLightboxClose: { position: 'absolute', right: 20, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },

    // "New posts" pill: floats over the top of the list.
    pillLayer: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingLeft: 10,
      paddingRight: 14,
      borderRadius: 999,
      backgroundColor: c.brand,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    pillAvatars: { flexDirection: 'row', alignItems: 'center' },
    pillAvatar: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.brand, backgroundColor: c.brandLight },
    pillText: { color: c.onBrand, fontSize: 12.5, fontWeight: '800' },

    // Toast / snackbar
    toast: {
      position: 'absolute',
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: '#1F2937',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
      zIndex: 50,
    },
    toastText: { flex: 1, color: '#FFFFFF', fontSize: 13.5, fontWeight: '600' },
    toastAction: { color: '#93C5FD', fontSize: 13.5, fontWeight: '800', paddingLeft: 8 },

    // List footer
    footer: { paddingVertical: s.lg, paddingHorizontal: s.lg, alignItems: 'center', gap: 8 },
    loadMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 200, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brand },
    loadMoreText: { color: c.brandText, fontSize: 13, fontWeight: '800' },
    loadMoreHint: { color: c.textTertiary, fontSize: 11.5, fontWeight: '600' },
    loadMoreErrorText: { color: c.error || '#DC2626', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    caughtUp: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', paddingVertical: s.sm },
    caughtUpLine: { flex: 1, height: 1, backgroundColor: c.borderDefault },
    caughtUpCenter: { alignItems: 'center', gap: 4 },
    caughtUpIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight },
    caughtUpTitle: { color: c.textPrimary, fontSize: 13, fontWeight: '800' },
    caughtUpText: { color: c.textTertiary, fontSize: 11.5, fontWeight: '500' },
  }));

  // Keep refs in sync so background work never needs to re-create intervals
  // or callbacks when state changes.
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { likedRef.current = likedPostIds; }, [likedPostIds]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { busyRef.current = loading || refreshing || loadingMore || posting; }, [loading, refreshing, loadingMore, posting]);

  // Slide the "new posts" pill in when there is something to show.
  const hasNewPosts = Boolean(newPosts);
  useEffect(() => {
    if (hasNewPosts) {
      pillAnim.setValue(0);
      Animated.spring(pillAnim, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
    }
  }, [hasNewPosts, pillAnim]);

  // Gentle pulse on the skeleton cards while the first page loads.
  useEffect(() => {
    if (!loading) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(skeletonAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(skeletonAnim, { toValue: 0.55, duration: 800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [loading, skeletonAnim]);

  // Adds author hydration (name / avatar / premium flag) for any posts that
  // the backend returned without it. Shared by refresh and load-more.
  const hydrateItems = useCallback(async (rawItems) => Promise.all(rawItems.map(async (item) => {
    if (typeof item.authorPremium === 'boolean') return item;
    try {
      const author = await getUserProfileById(item.authorId);
      return {
        ...item,
        authorName: item.authorName || author?.username || author?.displayName || 'UniHelp student',
        authorAvatar: item.authorAvatar || author?.photoThumb || author?.photoURL || author?.photo || author?.avatar || '',
        authorPremium: isPremiumActive(author),
      };
    } catch {
      return item;
    }
  })), []);

  const loadFeed = useCallback(async (refresh = false) => {
    if (!user?.uid) {
      setItems([]);
      setFeedCursor(null);
      setHasMore(false);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoadingMore(false);
    setLoadMoreError(false);
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const response = await fetchFeedPage(null);
      if (requestId !== requestIdRef.current) return;
      const nextItems = Array.isArray(response?.items) ? response.items : [];
      const hydratedItems = await hydrateItems(nextItems);
      if (requestId !== requestIdRef.current) return;
      const page = readPageInfo(response);
      // A post that is still being published must survive a refresh.
      const stillPending = itemsRef.current.filter((item) => item.pending);
      setItems([...stillPending, ...hydratedItems]);
      setFeedCursor(page.cursor);
      setHasMore(page.hasMore);
      setNewPosts(null);
      setHomeStreamSeed(Date.now());
      setLikedPostIds(new Set(hydratedItems.filter((item) => item.likedByMe).map((item) => item.id)));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('[Feed] Failed to load feed', error);
      Alert.alert('Feed unavailable', error.message || "Couldn't load your feed.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user?.uid, hydrateItems]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // The home stream remains post-led, but these small live collections let it
  // surface useful campus activity between posts instead of feeling static.
  // Depends on the uid only (profile is read from a ref) so suggestions don't
  // reshuffle every time the profile object changes.
  useEffect(() => {
    let active = true;
    const loadHomeDiscovery = async () => {
      const [friends, products] = await Promise.all([
        currentUid ? listSuggestedFriends({ uid: currentUid, profile: profileRef.current || {}, pageSize: 12 }).catch(() => []) : Promise.resolve([]),
        fetchStudentListings().catch(() => []),
      ]);
      if (!active) return;
      const mix = (rows) => [...(Array.isArray(rows) ? rows : [])].sort(() => Math.random() - 0.5).slice(0, 8);
      setHomeDiscovery({ friends: mix(friends), products: mix(products) });
    };
    loadHomeDiscovery();
    return () => { active = false; };
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid) { setIncomingRequests([]); return undefined; }
    return listenIncomingFriendRequests(currentUid, (rows) => setIncomingRequests(Array.isArray(rows) ? rows : []));
  }, [currentUid]);

  useEffect(() => {
    if (!sharedPostId || !user?.uid) return undefined;

    let cancelled = false;
    getJson(`/api/feed/posts/${encodeURIComponent(sharedPostId)}`)
      .then(async (response) => {
        const record = response?.item || response?.post || response;
        if (!record?.id) throw new Error('This post is unavailable.');
        const [hydratedPost] = await hydrateItems([record]);
        if (cancelled) return;
        setSharedPostResult({ id: sharedPostId, post: hydratedPost, error: false });
        setLikedPostIds((current) => {
          const next = new Set(current);
          if (hydratedPost.likedByMe) next.add(hydratedPost.id);
          return next;
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('[Feed] Shared post could not be loaded', error);
        setSharedPostResult({ id: sharedPostId, post: null, error: true });
      });

    return () => { cancelled = true; };
  }, [sharedPostId, user?.uid, hydrateItems]);

  // Appends the next page of older posts.
  const loadMore = useCallback(async () => {
    if (!hasMore || !feedCursor || loadingMore || loading || refreshing) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const response = await fetchFeedPage(feedCursor);
      if (requestId !== requestIdRef.current) return;
      const pageItems = Array.isArray(response?.items) ? response.items : [];
      const hydratedItems = await hydrateItems(pageItems);
      if (requestId !== requestIdRef.current) return;
      const page = readPageInfo(response);
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...hydratedItems.filter((item) => !seen.has(item.id))];
      });
      setLikedPostIds((current) => {
        const next = new Set(current);
        hydratedItems.forEach((item) => { if (item.likedByMe) next.add(item.id); });
        return next;
      });
      setFeedCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('[Feed] Failed to load more posts', error);
      setLoadMoreError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  }, [hasMore, feedCursor, loadingMore, loading, refreshing, hydrateItems]);

  // Quietly checks the first page for posts we haven't loaded yet and shows
  // the "new posts" pill instead of shifting the list under the reader.
  useEffect(() => {
    if (!user?.uid) return undefined;
    let cancelled = false;

    const checkForNewPosts = async () => {
      if (cancelled || busyRef.current || AppState.currentState !== 'active') return;
      const known = new Set(itemsRef.current.map((item) => item.id));
      if (!known.size) return;
      try {
        const response = await fetchFeedPage(null);
        if (cancelled || busyRef.current) return;
        const fresh = (Array.isArray(response?.items) ? response.items : []).filter((item) => item?.id && !known.has(item.id));
        if (!fresh.length) return;
        const avatars = [...new Set(fresh.map((item) => item.authorAvatar).filter(Boolean))].slice(0, 3);
        setNewPosts({ count: fresh.length, avatars });
      } catch {
        // Silent: this is a background check and the next tick will retry.
      }
    };

    const timer = setInterval(checkForNewPosts, NEW_POSTS_POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') checkForNewPosts(); });
    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [user?.uid]);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const showNewPosts = useCallback(async () => {
    tap();
    setNewPosts(null);
    scrollToTop();
    await loadFeed(true);
  }, [loadFeed, scrollToTop]);

  // Show the floating pen only once the composer card has scrolled out of
  // view. State is touched only when the threshold is crossed, so scrolling
  // doesn't re-render the screen.
  const handleScroll = useCallback((event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const shouldShow = offsetY > composerHeightRef.current;
    if (shouldShow === fabActiveRef.current) return;
    fabActiveRef.current = shouldShow;
    setFabActive(shouldShow);
    Animated.spring(fabAnim, { toValue: shouldShow ? 1 : 0, friction: 7, tension: 120, useNativeDriver: true }).start();
  }, [fabAnim]);

  // ---------- Composer ----------
  const resetComposer = useCallback(() => {
    Keyboard.dismiss();
    setContent('');
    setSelectedImage(null);
    setPostType('text');
    setBackgroundPreset('indigo');
    setEditingPost(null);
    setPostAudience('friends');
    setComposerOpen(false);
    // Bring back a new-post draft that was parked while editing a post.
    const stash = draftStashRef.current;
    draftStashRef.current = null;
    if (stash) {
      setContent(stash.content);
      setPostType(stash.postType);
      setBackgroundPreset(stash.backgroundPreset);
      setPostAudience(stash.postAudience);
      setSelectedImage(stash.selectedImage);
    }
  }, []);

  const composerDirty = editingPost
    ? content !== (editingPost.content || '')
    : Boolean(content.trim() || selectedImage);

  // A new-post draft that was saved and is waiting while the sheet is closed.
  const hasDraft = !editingPost && !composerOpen && Boolean(content.trim() || selectedImage);

  // Closing a half-written post offers to keep it as a draft.
  const closeComposer = useCallback(() => {
    if (posting) return;
    if (!composerDirty) { resetComposer(); return; }
    Keyboard.dismiss();
    if (editingPost) {
      Alert.alert('Discard changes?', 'Your edits will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: resetComposer },
      ]);
      return;
    }
    Alert.alert('Save as draft?', 'You can pick up where you left off.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: resetComposer },
      { text: 'Save draft', onPress: () => { tap(); setComposerOpen(false); } },
    ]);
  }, [posting, composerDirty, editingPost, resetComposer]);

  const openComposer = useCallback(() => {
    tap();
    setComposerOpen(true);
  }, []);

  const openImagePicker = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow access to your photos to add one to a post.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setPostType('image');
      setComposerOpen(true);
    }
  }, []);

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (postType === 'image') setPostType('text');
  };

  const toggleBackground = () => {
    tap();
    if (postType === 'colored') {
      setPostType('text');
    } else {
      setSelectedImage(null);
      setPostType('colored');
    }
  };

  const openColoredComposer = () => {
    tap();
    setSelectedImage(null);
    setPostType('colored');
    setComposerOpen(true);
  };

  const restoreDraft = (draft) => {
    setContent(draft.content);
    setPostType(draft.postType);
    setBackgroundPreset(draft.backgroundPreset);
    setPostAudience(draft.postAudience);
    setSelectedImage(draft.selectedImage);
    setEditingPost(draft.editingPost);
    setComposerOpen(true);
  };

  // Optimistic: the composer closes immediately and the post shows up dimmed
  // as "Posting…". On success it is swapped for the real post; on failure it
  // is removed and the draft is restored so nothing is lost.
  const createPost = async () => {
    if (posting || !content.trim() || (postType === 'image' && !selectedImage)) return;
    const draft = { content, postType, backgroundPreset, postAudience, selectedImage, editingPost };
    tap();
    resetComposer();

    // ----- Edit: update the card immediately -----
    if (draft.editingPost) {
      const previous = itemsRef.current;
      const id = draft.editingPost.id;
      setItems((cur) => cur.map((p) => p.id === id
        ? { ...p, content: draft.content, audience: draft.postAudience, backgroundPreset: draft.backgroundPreset }
        : p));
      try {
        await putJson(`/api/feed/posts/${id}`, {
          content: draft.content,
          audience: draft.postAudience,
          backgroundPreset: draft.editingPost.type === 'colored' ? draft.backgroundPreset : undefined,
        });
        success();
        showToast('Post updated');
      } catch (error) {
        setItems(previous);
        restoreDraft(draft);
        Alert.alert('Could not save', error.message || 'Please try again.');
      }
      return;
    }

    // ----- New post: show a pending card right away -----
    const tempId = `pending-${Date.now()}`;
    const pendingPost = {
      id: tempId,
      pending: true,
      type: draft.postType,
      content: draft.content,
      audience: draft.postAudience,
      backgroundPreset: draft.postType === 'colored' ? draft.backgroundPreset : undefined,
      imageUrl: draft.postType === 'image' ? draft.selectedImage?.uri : undefined,
      authorId: user?.uid,
      authorName: profile?.username || profile?.displayName || 'You',
      authorAvatar: viewerAvatar,
      authorPremium: isPremiumActive(profile),
      createdAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
      viewsCount: 0,
    };
    setItems((cur) => [pendingPost, ...cur]);
    scrollToTop();
    setPosting(true);
    try {
      let image = null;
      if (draft.postType === 'image') {
        image = await uploadFeatureMedia({ ...draft.selectedImage, type: draft.selectedImage.mimeType || 'image/jpeg' }, { feature: 'feed', resourceType: 'image' });
      }
      const response = await postJson('/api/feed/posts', {
        type: draft.postType,
        content: draft.content,
        audience: draft.postAudience,
        backgroundPreset: draft.postType === 'colored' ? draft.backgroundPreset : undefined,
        imageUrl: image?.url || image?.secure_url,
        cloudinaryPublicId: image?.publicId || image?.public_id,
      });
      success();
      showToast('Posted to your campus');
      const saved = response?.item || response?.post;
      if (saved?.id) {
        setItems((cur) => cur.map((p) => p.id === tempId
          ? {
            ...pendingPost,
            ...saved,
            pending: false,
            authorName: saved.authorName || pendingPost.authorName,
            authorAvatar: saved.authorAvatar || pendingPost.authorAvatar,
          }
          : p));
      } else {
        // Drop the placeholder first so the refreshed feed doesn't show it twice.
        setItems((cur) => cur.filter((p) => p.id !== tempId));
        await loadFeed(true);
      }
    } catch (error) {
      setItems((cur) => cur.filter((p) => p.id !== tempId));
      restoreDraft(draft);
      Alert.alert('Could not post', error.message || 'Your draft was kept. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const beginEdit = (item) => {
    // Park a half-written new post so editing doesn't overwrite it.
    if (!editingPost && (content.trim() || selectedImage)) {
      draftStashRef.current = { content, postType, backgroundPreset, postAudience, selectedImage };
    }
    setEditingPost(item);
    setContent(item.content || '');
    setPostType(item.type || 'text');
    setBackgroundPreset(item.backgroundPreset || 'indigo');
    setPostAudience(item.audience || 'friends');
    setSelectedImage(item.type === 'image' ? { uri: item.imageUrl } : null);
    setComposerOpen(true);
  };

  // ---------- Post actions ----------
  const reportPost = async (item) => {
    setManagePost(null);
    try {
      await postJson(`/api/feed/posts/${item.id}/report`, { reportType: 'Inappropriate content' });
      success();
      showToast('Report sent. Thanks for keeping campus safe.', { icon: 'flag' });
    } catch (error) {
      Alert.alert('Report failed', error.message || 'Could not report this post.');
    }
  };

  const sharePost = useCallback(async (item) => {
    setManagePost(null);
    await shareContent({
      title: `${item.authorName || 'UniHelp student'} on UniHelp`,
      text: item.content || 'View this post on UniHelp.',
      url: buildContentShareUrl('post', item.id),
    });
  }, []);

  const openProfilePreview = useCallback(async (item) => {
    setProfilePreview({ ...item, loading: true });
    setProfileRelationship({ state: RELATIONSHIP.NONE });
    try {
      const profileData = await getUserProfileById(item.authorId);
      setProfilePreview((current) => current ? { ...current, ...(profileData || {}), loading: false } : current);
    } catch (error) {
      console.warn('[Feed] Could not load author profile', error);
      setProfilePreview((current) => current ? { ...current, loading: false } : current);
    }
  }, []);

  useEffect(() => {
    const targetUid = profilePreview?.authorId;
    if (!targetUid || !user?.uid || targetUid === user.uid) {
      setProfileRelationship({ state: RELATIONSHIP.NONE });
      return undefined;
    }
    return listenRelationship(user.uid, targetUid, setProfileRelationship);
  }, [profilePreview?.authorId, user?.uid]);

  const handleRelationshipAction = async () => {
    const targetUid = profilePreview?.authorId;
    if (!targetUid || !user?.uid || relationshipBusy) return;
    tap();
    setRelationshipBusy(true);
    try {
      if (profileRelationship.state === RELATIONSHIP.FRIENDS) {
        await removeFriend({ currentUid: user.uid, friendUid: targetUid, currentProfile: profile || {} });
        setProfileRelationship({ state: RELATIONSHIP.NONE });
        showToast('Friend removed', { icon: 'person-remove' });
      } else if (profileRelationship.state === RELATIONSHIP.NONE) {
        await sendFriendRequest({ currentUid: user.uid, targetUid, currentProfile: profile || {}, targetProfile: profilePreview || {} });
        setProfileRelationship({ state: RELATIONSHIP.SENT });
        showToast('Friend request sent', { icon: 'person-add' });
      }
    } catch (error) {
      Alert.alert('Friend connection failed', error.message || 'Please try again.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const recordView = useCallback((item) => {
    if (!currentUid || !item?.id || isPendingId(item.id)) return;
    const viewKey = `${currentUid}:${item.id}`;
    if (viewedPosts.current.has(viewKey)) return;
    viewedPosts.current.add(viewKey);
    postJson(`/api/feed/posts/${item.id}/view`, {}).then((response) => {
      if (Number.isFinite(response?.viewsCount)) {
        setItems((current) => current.map((post) => post.id === item.id
          ? { ...post, viewsCount: response.viewsCount }
          : post));
      }
    }).catch((error) => {
      console.warn('[Feed] Could not record post view', error);
      viewedPosts.current.delete(viewKey);
    });
  }, [currentUid]);

  const openFeedLink = useCallback(async (url) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn't open link", 'Please try opening this link again.');
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    // Only real posts count as views, never home inserts or pending posts.
    viewableItems.forEach(({ item }) => {
      if (item?.streamType === 'post' && !isPendingId(item.id)) recordView(item);
    });
  }).current;

  // Optimistic like. Reads the liked set from a ref so this callback stays
  // stable (keeps memoized cards from re-rendering), and ignores taps while a
  // request for the same post is still in flight so rapid taps can't desync.
  const toggleLike = useCallback((item) => {
    if (isPendingId(item.id) || likeBusyRef.current.has(item.id)) return;
    tap();
    likeBusyRef.current.add(item.id);
    const alreadyLiked = likedRef.current.has(item.id);
    const delta = alreadyLiked ? -1 : 1;
    const applyLike = (liked, change) => {
      setLikedPostIds((current) => {
        const next = new Set(current);
        if (liked) next.add(item.id); else next.delete(item.id);
        return next;
      });
      setItems((current) => current.map((post) => post.id === item.id
        ? { ...post, likesCount: Math.max(0, (post.likesCount || 0) + change) }
        : post));
    };
    applyLike(!alreadyLiked, delta);
    const request = alreadyLiked
      ? deleteJson(`/api/feed/posts/${item.id}/like`)
      : postJson(`/api/feed/posts/${item.id}/like`, {});

    request
      .then((response) => {
        if (Number.isFinite(response?.likesCount)) {
          setItems((current) => current.map((post) => post.id === item.id
            ? { ...post, likesCount: response.likesCount }
            : post));
        }
      })
      .catch(() => {
        applyLike(alreadyLiked, -delta);
        showToast("Couldn't update your like", { icon: 'alert-circle' });
      })
      .finally(() => { likeBusyRef.current.delete(item.id); });
  }, [showToast]);

  // Delete is instant but undoable: the post disappears right away, the real
  // request is held back for a few seconds, and "Undo" brings it back in place.
  const handleDelete = useCallback((item) => Alert.alert('Delete post?', 'You can undo for a few seconds.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        const index = itemsRef.current.findIndex((post) => post.id === item.id);
        const restore = () => setItems((current) => {
          if (current.some((post) => post.id === item.id)) return current;
          const next = [...current];
          next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
          return next;
        });

        setItems((current) => current.filter((post) => post.id !== item.id));

        const timer = setTimeout(async () => {
          delete deleteTimersRef.current[item.id];
          try {
            await deleteJson(`/api/feed/posts/${item.id}`);
          } catch (error) {
            restore();
            Alert.alert('Could not delete', error.message || 'Please try again.');
          }
        }, DELETE_UNDO_MS);
        deleteTimersRef.current[item.id] = timer;

        showToast('Post deleted', {
          icon: 'trash',
          actionLabel: 'Undo',
          onAction: () => {
            clearTimeout(timer);
            delete deleteTimersRef.current[item.id];
            tap();
            restore();
          },
        });
      },
    },
  ]), [showToast]);

  // ---------- Comments ----------
  // Stable fetcher: takes the cursor explicitly so it never closes over state.
  // A request id guards against a slow response for a previous post landing
  // in the sheet of the current one.
  const fetchComments = useCallback(async (post, cursor) => {
    if (!post?.id) return;
    const append = Boolean(cursor);
    const requestId = append ? commentsRequestRef.current : ++commentsRequestRef.current;
    if (append) setCommentsLoadingMore(true); else setCommentsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (cursor) params.set('cursor', cursor);
      const response = await getJson(`/api/feed/posts/${encodeURIComponent(post.id)}/comments?${params.toString()}`);
      if (requestId !== commentsRequestRef.current) return;
      const nextItems = response?.items || [];
      setComments((current) => append ? [...current, ...nextItems] : nextItems);
      setCommentsCursor(response?.nextCursor || null);
      setCommentsHasMore(Boolean(response?.hasMore) && Boolean(response?.nextCursor));
    } catch (error) {
      if (requestId !== commentsRequestRef.current) return;
      console.error('[Feed] Failed to load comments', error);
      Alert.alert('Could not load comments', error.message || 'Please try again.');
    } finally {
      if (requestId === commentsRequestRef.current) {
        setCommentsLoading(false);
        setCommentsLoadingMore(false);
      }
    }
  }, []);

  const openComments = useCallback((item) => {
    if (isPendingId(item.id)) return;
    setCommentText('');
    setCommentsPost(item);
    setComments([]);
    setCommentsCursor(null);
    setCommentsHasMore(false);
    fetchComments(item, null);
  }, [fetchComments]);

  const closeComments = useCallback(() => {
    commentsRequestRef.current += 1;
    Keyboard.dismiss();
    setCommentsPost(null);
    setComments([]);
    setCommentText('');
    setCommentsLoading(false);
    setCommentsLoadingMore(false);
  }, []);

  const loadMoreComments = () => {
    if (!commentsPost || !commentsHasMore || !commentsCursor || commentsLoading || commentsLoadingMore) return;
    fetchComments(commentsPost, commentsCursor);
  };

  const toggleCommentLike = useCallback((comment) => {
    if (isLocalId(comment.id) || commentLikeBusyRef.current.has(comment.id)) return;
    tap();
    commentLikeBusyRef.current.add(comment.id);

    const alreadyLiked = comment.liked;
    const delta = alreadyLiked ? -1 : 1;

    // Optimistic UI update
    setComments((current) => current.map((c) =>
      c.id === comment.id
        ? { ...c, liked: !alreadyLiked, likesCount: Math.max(0, (c.likesCount || 0) + delta) }
        : c
    ));

    const request = alreadyLiked
      ? deleteJson(`/api/feed/comments/${comment.id}/like`)
      : postJson(`/api/feed/comments/${comment.id}/like`, {});

    request
      .then((response) => {
        if (Number.isFinite(response?.likesCount)) {
          setComments((current) => current.map((c) => c.id === comment.id
            ? { ...c, liked: response.liked, likesCount: response.likesCount }
            : c));
        }
      })
      .catch(() => {
        setComments((current) => current.map((c) =>
          c.id === comment.id
            ? { ...c, liked: alreadyLiked, likesCount: Math.max(0, (c.likesCount || 0) - delta) }
            : c
        ));
        showToast("Couldn't update your like", { icon: 'alert-circle' });
      })
      .finally(() => commentLikeBusyRef.current.delete(comment.id));
  }, [showToast]);

  // Optimistic: the comment appears and the input clears the moment send is
  // tapped. On failure the comment is removed and the text comes back.
  const addComment = async () => {
    const post = commentsPost;
    const trimmed = commentText.trim();
    if (!post || !trimmed) return;
    tap();
    const tempId = `local-${Date.now()}`;
    const optimistic = {
      id: tempId,
      postId: post.id,
      authorId: user?.uid || '',
      authorName: profile?.username || profile?.displayName || user?.email || 'You',
      authorAvatar: viewerAvatar,
      content: trimmed,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      pending: true,
    };
    setComments((current) => [optimistic, ...current]);
    setItems((current) => current.map((item) => item.id === post.id
      ? { ...item, commentsCount: (item.commentsCount || 0) + 1 }
      : item));
    setCommentText('');
    try {
      const response = await postJson(`/api/feed/posts/${post.id}/comments`, { content: trimmed });
      const saved = response && typeof response === 'object' ? (response.item || response.comment || null) : null;
      setComments((current) => current.map((c) => c.id === tempId ? { ...c, ...(saved || {}), pending: false } : c));
    } catch {
      setComments((current) => current.filter((c) => c.id !== tempId));
      setItems((current) => current.map((item) => item.id === post.id
        ? { ...item, commentsCount: Math.max(0, (item.commentsCount || 0) - 1) }
        : item));
      setCommentText(trimmed);
      showToast("Comment didn't send. Tap send to retry.", { icon: 'alert-circle' });
    }
  };

  // The header count should follow the live post, not the snapshot taken when the sheet opened.
  const liveCommentsPost = commentsPost ? (items.find((item) => item.id === commentsPost.id) || commentsPost) : null;
  const commentsTotal = Math.max(liveCommentsPost?.commentsCount || 0, comments.length);

  // ---------- Search / filters ----------
  const toggleSearch = () => {
    if (searchOpen) setSearch('');
    setSearchOpen(!searchOpen);
  };

  // Tapping a hashtag opens the search bar so the active filter is never hidden.
  const handleTagPress = useCallback((tag) => {
    tap();
    setSearch(tag);
    setSearchOpen(true);
  }, []);

  const clearFilters = () => {
    tap();
    setTypeFilter('all');
    setSortFilter('smart');
    setTimeFilter('all');
    setMineOnly(false);
  };

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const now = Date.now();
    const timeLimits = { today: 24, week: 24 * 7, month: 24 * 30 };
    const sourceItems = sharedPostId ? (sharedPost ? [sharedPost] : []) : items;
    const filtered = sourceItems.filter((item) => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesMine = !mineOnly || item.authorId === user?.uid;
      const tags = getPostHashtags(item);
      const searchable = `${item.content || ''} ${item.authorName || ''} ${tags.join(' ')}`.toLowerCase();
      const postDate = toDate(item.createdAt);
      const ageHours = postDate ? Math.max(0, (now - postDate.getTime()) / (60 * 60 * 1000)) : Infinity;
      const matchesTime = timeFilter === 'all' || ageHours <= timeLimits[timeFilter];
      return matchesType && matchesMine && matchesTime && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
    return [...filtered].sort((left, right) => {
      // A post being published always stays on top.
      if (Boolean(left.pending) !== Boolean(right.pending)) return left.pending ? -1 : 1;
      const leftTime = toDate(left.createdAt)?.getTime() ?? 0;
      const rightTime = toDate(right.createdAt)?.getTime() ?? 0;
      if (sortFilter === 'oldest') return leftTime - rightTime;
      if (sortFilter === 'popular') {
        const leftScore = (left.likesCount || 0) + ((left.commentsCount || 0) * 2) + ((left.viewsCount || 0) * 0.1);
        const rightScore = (right.likesCount || 0) + ((right.commentsCount || 0) * 2) + ((right.viewsCount || 0) * 0.1);
        return rightScore - leftScore;
      }
      if (sortFilter === 'latest') return rightTime - leftTime;
      return 0;
    });
  }, [items, sharedPost, sharedPostId, search, sortFilter, timeFilter, typeFilter, mineOnly, user?.uid]);

  // Instant: the card disappears and a toast confirms; restored if it fails.
  const handleAddFriend = useCallback(async (person) => {
    const targetUid = person?.uid || person?.id;
    if (!currentUid || !targetUid) return;
    tap();
    const previous = homeDiscovery.friends;
    setHomeDiscovery((current) => ({ ...current, friends: current.friends.filter((row) => (row.uid || row.id) !== targetUid) }));
    showToast(`Request sent to ${personName(person)}`, { icon: 'person-add' });
    try {
      await sendFriendRequest({ currentUid, targetUid, currentProfile: profile || {}, targetProfile: person });
    } catch (error) {
      setHomeDiscovery((current) => ({ ...current, friends: previous }));
      Alert.alert('Could not send request', error?.message || 'Please try again.');
    }
  }, [currentUid, profile, homeDiscovery.friends, showToast]);

  const handleRequestResponse = useCallback(async (request, accepted) => {
    if (!currentUid || !request?.id) return;
    tap();
    const previous = incomingRequests;
    setIncomingRequests((current) => current.filter((row) => row.id !== request.id));
    showToast(
      accepted ? `You and ${personName(request.fromProfile || {})} are now friends` : 'Request removed',
      { icon: accepted ? 'people' : 'close-circle' },
    );
    try {
      if (accepted) await acceptFriendRequest({ request, currentUid, currentProfile: profile || {} });
      else await declineFriendRequest({ request, currentUid, currentProfile: profile || {} });
    } catch (error) {
      setIncomingRequests(previous);
      Alert.alert('Could not update request', error?.message || 'Please try again.');
    }
  }, [currentUid, profile, incomingRequests, showToast]);

  // A deliberately light rhythm: no repeated promo blocks and no insert while
  // someone is searching or filtering posts. The stream still feels personal,
  // yet each detour earns its space with a useful next action.
  const streamItems = useMemo(() => {
    if (search.trim() || typeFilter !== 'all' || timeFilter !== 'all' || mineOnly || sharedPostId) {
      return visibleItems.map((post) => ({ ...post, streamType: 'post' }));
    }
    const inserts = [
      incomingRequests.length ? { id: 'home-requests', streamType: 'insert', kind: 'requests', requests: incomingRequests } : null,
      homeDiscovery.friends.length ? { id: 'home-friends', streamType: 'insert', kind: 'friends', people: homeDiscovery.friends.slice(0, 5) } : null,
      homeDiscovery.products.length ? { id: 'home-products', streamType: 'insert', kind: 'products', products: homeDiscovery.products.slice(0, 5) } : null,
      { id: 'home-tools', streamType: 'insert', kind: 'tools', tools: HOME_TOOLS.slice(0, 3) },
    ].filter(Boolean);
    const random = seededRandom(homeStreamSeed);
    // Shuffle each refresh, then leave the order stable while the person reads.
    for (let index = inserts.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [inserts[index], inserts[swapIndex]] = [inserts[swapIndex], inserts[index]];
    }
    const rows = [];
    let insertIndex = 0;
    const insertCount = Math.min(inserts.length, Math.max(0, visibleItems.length - 1));
    const insertPositions = [];
    let previousPosition = -1;
    for (let index = 0; index < insertCount; index += 1) {
      const ideal = Math.round(((index + 1) * visibleItems.length) / (insertCount + 1)) - 1;
      const jittered = ideal + Math.floor(random() * 3) - 1;
      const position = Math.min(visibleItems.length - 2, Math.max(previousPosition + 1, jittered));
      insertPositions.push(position);
      previousPosition = position;
    }
    visibleItems.forEach((post, index) => {
      rows.push({ ...post, streamType: 'post' });
      if (index === insertPositions[insertIndex]) {
        rows.push(inserts[insertIndex]);
        insertIndex += 1;
      }
    });
    // With a very short stream there is no meaningful middle yet; show only
    // the first useful cards, never stack every card below the final post.
    if (!visibleItems.length) rows.push(...inserts.slice(0, 2));
    return rows;
  }, [visibleItems, incomingRequests, homeDiscovery, homeStreamSeed, search, typeFilter, timeFilter, mineOnly, sharedPostId]);

  const renderPost = useCallback(({ item }) => {
    if (item.streamType === 'insert') {
      return <HomeInsert item={item} styles={styles} colors={colors} router={router} onAddFriend={handleAddFriend} onRespond={handleRequestResponse} />;
    }
    return (
      <PostCard
        item={item}
        liked={likedPostIds.has(item.id)}
        styles={styles}
        colors={colors}
        onOpenProfile={openProfilePreview}
        onMenu={setManagePost}
        onLike={toggleLike}
        onComment={openComments}
        onShare={sharePost}
        onOpenImage={setImagePreview}
        onTagPress={handleTagPress}
        onOpenLink={openFeedLink}
      />
    );
  }, [likedPostIds, styles, colors, router, handleAddFriend, handleRequestResponse, openProfilePreview, toggleLike, openComments, sharePost, handleTagPress, openFeedLink]);

  // Bottom of the list: spinner while loading, a clear button when there is
  // more, a retry message on failure, and a quiet "all caught up" ending.
  const renderFooter = () => {
    if (!items.length) return null;

    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.loadMoreHint}>Loading more posts…</Text>
        </View>
      );
    }

    if (loadMoreError) {
      return (
        <View style={styles.footer}>
          <Text style={styles.loadMoreErrorText}>Couldn't load more posts. Check your connection and try again.</Text>
          <Pressable
            style={({ pressed }) => [styles.loadMoreButton, pressed && { opacity: 0.75 }]}
            onPress={loadMore}
            accessibilityRole="button"
            accessibilityLabel="Retry loading more posts"
          >
            <Ionicons name="refresh" size={16} color={colors.brandText} />
            <Text style={styles.loadMoreText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    if (hasMore) {
      return (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.loadMoreButton, pressed && { opacity: 0.75 }]}
            onPress={loadMore}
            accessibilityRole="button"
            accessibilityLabel="Load more posts"
          >
            <Text style={styles.loadMoreText}>Load more posts</Text>
            <Ionicons name="chevron-down" size={16} color={colors.brandText} />
          </Pressable>
          <Text style={styles.loadMoreHint}>{items.length} posts loaded</Text>
        </View>
      );
    }

    return (
      <View style={styles.footer}>
        <View style={styles.caughtUp}>
          <View style={styles.caughtUpLine} />
          <View style={styles.caughtUpCenter}>
            <View style={styles.caughtUpIcon}><Ionicons name="checkmark-done" size={18} color={colors.brandText} /></View>
            <Text style={styles.caughtUpTitle}>You're all caught up</Text>
            <Text style={styles.caughtUpText}>You've seen every recent post</Text>
          </View>
          <View style={styles.caughtUpLine} />
        </View>
      </View>
    );
  };

  const canSubmit = content.trim().length > 0 && !(postType === 'image' && !selectedImage);
  const activeFilters = [
    mineOnly ? 'My posts' : null,
    typeFilter !== 'all' ? labelOf(TYPE_FILTERS, typeFilter) : null,
    sortFilter !== 'smart' ? labelOf(SORT_FILTERS, sortFilter) : null,
    timeFilter !== 'all' ? labelOf(TIME_FILTERS, timeFilter) : null,
  ].filter(Boolean);
  const activeFilterCount = activeFilters.length;
  const newPostsLabel = newPosts
    ? `${newPosts.count >= PAGE_SIZE ? `${PAGE_SIZE}+` : newPosts.count} new ${newPosts.count === 1 ? 'post' : 'posts'}`
    : '';
  const isColoredDraft = postType === 'colored';

  // Composer card + filter row. This is the list header, so it scrolls away
  // with the feed instead of being pinned. Once it is gone, the floating pen
  // button takes over.
  const listHeader = (
    <View style={styles.headerCard}>
      <View onLayout={(event) => { composerHeightRef.current = Math.max(event.nativeEvent.layout.height - 8, 60); }}>
        <View style={styles.composerEntry}>
          {viewerAvatar ? <Image source={{ uri: viewerAvatar }} style={styles.avatarSm} contentFit="cover" /> : <View style={styles.avatarSm} />}
          <Pressable
            style={({ pressed }) => [styles.composerPill, hasDraft && styles.composerPillDraft, pressed && { opacity: 0.7 }]}
            onPress={openComposer}
            accessibilityRole="button"
            accessibilityLabel={hasDraft ? 'Continue your draft' : 'Write a post'}
          >
            <Text style={[styles.composerPillText, hasDraft && styles.composerPillTextDraft]} numberOfLines={1}>
              {hasDraft ? 'Continue your draft…' : "What's on your mind?"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.quickRow}>
          <Pressable
            style={({ pressed }) => [styles.quickButton, pressed && styles.quickButtonPressed]}
            onPress={() => { tap(); openImagePicker(); }}
            accessibilityRole="button"
            accessibilityLabel="Post a photo"
          >
            <Ionicons name="images" size={20} color="#16A34A" />
            <Text style={styles.quickText}>Photo</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickButton, pressed && styles.quickButtonPressed]}
            onPress={openColoredComposer}
            accessibilityRole="button"
            accessibilityLabel="Post with a colored background"
          >
            <Ionicons name="color-palette" size={20} color="#DB2777" />
            <Text style={styles.quickText}>Background</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.homeControlsRow}>
        <Text style={styles.homeControlsLabel}>Campus updates</Text>
        <Pressable
          style={({ pressed }) => [styles.inlineFilterButton, activeFilterCount > 0 && styles.inlineFilterButtonActive, pressed && { opacity: 0.78 }]}
          onPress={() => { tap(); setFiltersOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={activeFilterCount ? `Open post filters, ${activeFilterCount} active` : 'Open post filters'}
        >
          <Ionicons name="options-outline" size={16} color={activeFilterCount ? colors.onBrand : colors.brandText} />
          <Text style={[styles.inlineFilterText, activeFilterCount > 0 && styles.inlineFilterTextActive]}>Filter</Text>
          {activeFilterCount > 0 ? <View style={styles.inlineFilterBadge}><Text style={styles.inlineFilterBadgeText}>{activeFilterCount}</Text></View> : null}
        </Pressable>
      </View>
      {activeFilters.length > 0 ? (
        <View style={styles.activeBar}>
          {activeFilters.map((label) => (
            <View key={label} style={styles.activeChip}><Text style={styles.activeChipText}>{label}</Text></View>
          ))}
          <Pressable style={styles.activeClear} onPress={clearFilters} accessibilityRole="button" accessibilityLabel="Clear filters">
            <Text style={styles.activeClearText}>Clear</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  // First-page skeletons live inside the list so the header stays in place.
  const skeletons = (
    <View>
      {[0, 1, 2].map((key) => (
        <Animated.View key={key} style={[styles.skeletonCard, { opacity: skeletonAnim }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.avatar} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[styles.skeletonLine, { width: '40%' }]} />
              <View style={[styles.skeletonLine, { width: '25%', height: 9 }]} />
            </View>
          </View>
          <View style={styles.skeletonBlock} />
        </Animated.View>
      ))}
    </View>
  );

  return (
    <ScreenShell
      title="Home"
      subtitle="Your campus, your people, your next move."
      showBack={false}
      scrollable={false}
      loading={loading}
      onSearch={toggleSearch}
      showNotifications={false}
    >
      {searchOpen ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={17} color={colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search posts or hashtags"
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        style={styles.feedBg}
        data={streamItems}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        extraData={likedPostIds}
        ListHeaderComponent={listHeader}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshing={refreshing}
        onRefresh={() => { tap(); loadFeed(true); }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReached={() => { if (!loadMoreError) loadMore(); }}
        onEndReachedThreshold={0.6}
        initialNumToRender={5}
        windowSize={9}
        maxToRenderPerBatch={6}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={loading && !items.length ? skeletons : (
          <EmptyState
            title={sharedPostId
              ? (sharedPostError ? 'Post unavailable' : 'Loading shared post')
              : items.length && !visibleItems.length ? 'No matching posts' : 'Your home is getting started'}
            description={sharedPostId
              ? (sharedPostError ? 'This post may have been deleted or is not available to your account.' : 'The shared post is loading.')
              : items.length && !visibleItems.length
                ? (hasMore ? 'Nothing in the posts loaded so far. Try another filter or load more.' : 'Try another search or filter.')
                : 'Connect with students or share something to bring your campus home to life.'}
          />
        )}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingBottom: 30 + FAB_SIZE }}
      />

      {newPosts ? (
        <View style={styles.pillLayer} pointerEvents="box-none">
          <Animated.View
            style={{
              opacity: pillAnim,
              transform: [
                { translateY: pillAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
                { scale: pillAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              ],
            }}
          >
            <Pressable
              style={({ pressed }) => [styles.pill, pressed && { opacity: 0.85 }]}
              onPress={showNewPosts}
              accessibilityRole="button"
              accessibilityLabel={`Show ${newPostsLabel}`}
            >
              {newPosts.avatars.length ? (
                <View style={styles.pillAvatars}>
                  {newPosts.avatars.map((uri, index) => (
                    <Image key={uri} source={{ uri }} style={[styles.pillAvatar, index > 0 && { marginLeft: -8 }]} contentFit="cover" />
                  ))}
                </View>
              ) : null}
              <Ionicons name="arrow-up" size={14} color={colors.onBrand} />
              <Text style={styles.pillText}>{newPostsLabel}</Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : null}

      {/* ---------- Floating write button ---------- */}
      {/* Rises out of the corner once the composer has scrolled off screen, and
          steps up out of the way of the toast while one is showing. */}
      <Animated.View
        style={[styles.fabWrap, {
          bottom: insets.bottom + FAB_OFFSET,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -72] }) }],
        }]}
        pointerEvents={fabActive ? 'box-none' : 'none'}
      >
        <Animated.View
          style={{
            opacity: fabAnim,
            transform: [
              { scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
              { translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            ],
          }}
        >
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.94 }], opacity: 0.92 }]}
            onPress={openComposer}
            accessibilityRole="button"
            accessibilityLabel={hasDraft ? 'Continue your draft' : 'Write a post'}
          >
            <Ionicons name="pencil" size={24} color={colors.onBrand} />
            {hasDraft ? <View style={styles.fabDot} /> : null}
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* ---------- Composer sheet ---------- */}
      <BottomSheet visible={composerOpen} onClose={closeComposer} styles={styles} sheetStyle={styles.composerSheet} avoidKeyboard>
        <View style={styles.sheetTop}>
          <Pressable style={styles.sheetCancel} onPress={closeComposer} disabled={posting} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.sheetTopTitle}>{editingPost ? 'Edit post' : 'New post'}</Text>
          <Pressable
            style={({ pressed }) => [styles.postButton, (posting || !canSubmit) && styles.postButtonDisabled, pressed && { opacity: 0.8 }]}
            disabled={posting || !canSubmit}
            onPress={createPost}
            accessibilityRole="button"
            accessibilityLabel={editingPost ? 'Save post' : 'Publish post'}
          >
            {posting ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Text style={styles.postButtonText}>{editingPost ? 'Save' : 'Post'}</Text>}
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.composerBody}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.composerWho}>
            {viewerAvatar ? <Image source={{ uri: viewerAvatar }} style={styles.avatarSm} contentFit="cover" /> : <View style={styles.avatarSm} />}
            <View style={styles.audienceRow}>
              {AUDIENCES.map(({ value, label, icon }) => {
                const active = postAudience === value;
                return (
                  <Pressable
                    key={value}
                    style={[styles.audienceChip, active && styles.audienceChipActive]}
                    onPress={() => { tap(); setPostAudience(value); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Visible to ${label}`}
                  >
                    <Ionicons name={icon} size={14} color={active ? colors.brandText : colors.textSecondary} />
                    <Text style={[styles.audienceChipText, active && styles.audienceChipTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* One TextInput for both modes so toggling Background never drops focus or the keyboard. */}
          <View style={isColoredDraft ? [styles.coloredComposer, { backgroundColor: PRESET_COLORS[backgroundPreset] || PRESET_COLORS.indigo }] : null}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="What's on your mind?"
              placeholderTextColor={isColoredDraft ? 'rgba(255,255,255,0.7)' : colors.placeholder}
              multiline
              autoFocus
              style={isColoredDraft ? styles.coloredComposerInput : styles.composerInput}
            />
          </View>

          {isColoredDraft ? (
            <View style={styles.presetRow}>
              {Object.entries(PRESET_COLORS).map(([name, color]) => (
                <Pressable
                  key={name}
                  onPress={() => { tap(); setBackgroundPreset(name); }}
                  style={[styles.preset, { backgroundColor: color }, backgroundPreset === name && styles.selectedPreset]}
                  accessibilityRole="button"
                  accessibilityLabel={`${name} background`}
                >
                  {backgroundPreset === name ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          {postType === 'image' && selectedImage ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} contentFit="cover" />
              {!editingPost ? (
                <Pressable
                  style={({ pressed }) => [styles.removeImageButton, pressed && { opacity: 0.8 }]}
                  onPress={removeSelectedImage}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {/* Docked above the keyboard thanks to the KeyboardAvoidingView around the sheet. */}
        <View style={[styles.composerToolbar, { paddingBottom: sheetBottomPad }]}>
          {!editingPost ? (
            <>
              <Pressable style={[styles.toolButton, postType === 'image' && styles.toolButtonActive]} onPress={openImagePicker} accessibilityRole="button" accessibilityLabel="Add photo">
                <Ionicons name="image-outline" size={17} color={postType === 'image' ? colors.brandText : colors.textSecondary} />
                <Text style={[styles.toolText, postType === 'image' && styles.toolTextActive]}>Photo</Text>
              </Pressable>
              <Pressable style={[styles.toolButton, isColoredDraft && styles.toolButtonActive]} onPress={toggleBackground} accessibilityRole="button" accessibilityLabel="Toggle colored background">
                <Ionicons name="color-palette-outline" size={17} color={isColoredDraft ? colors.brandText : colors.textSecondary} />
                <Text style={[styles.toolText, isColoredDraft && styles.toolTextActive]}>Background</Text>
              </Pressable>
            </>
          ) : null}
          {content.length > 0 ? <Text style={styles.charCount}>{content.length}</Text> : null}
        </View>
      </BottomSheet>

      {/* ---------- Filters ---------- */}
      <BottomSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} styles={styles} sheetStyle={[styles.actionCard, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Feed filters</Text>
        <Text style={styles.filterCaption}>Show</Text>
        <View style={styles.filterRow}>
          {[[false, 'Everyone'], [true, 'My posts']].map(([value, label]) => (
            <Pressable key={label} style={[styles.filterButton, mineOnly === value && styles.filterButtonActive]} onPress={() => { tap(); setMineOnly(value); }}>
              <Text style={[styles.filterText, mineOnly === value && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.filterCaption}>Post type</Text>
        <View style={styles.filterRow}>
          {TYPE_FILTERS.map(([value, label]) => (
            <Pressable key={value} style={[styles.filterButton, typeFilter === value && styles.filterButtonActive]} onPress={() => { tap(); setTypeFilter(value); }}>
              <Text style={[styles.filterText, typeFilter === value && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.filterCaption}>Sort by</Text>
        <View style={styles.filterRow}>
          {SORT_FILTERS.map(([value, label]) => (
            <Pressable key={value} style={[styles.filterButton, sortFilter === value && styles.filterButtonActive]} onPress={() => { tap(); setSortFilter(value); }}>
              <Text style={[styles.filterText, sortFilter === value && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.filterCaption}>Time frame</Text>
        <View style={styles.filterRow}>
          {TIME_FILTERS.map(([value, label]) => (
            <Pressable key={value} style={[styles.filterButton, timeFilter === value && styles.filterButtonActive]} onPress={() => { tap(); setTimeFilter(value); }}>
              <Text style={[styles.filterText, timeFilter === value && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.profileButton} onPress={() => setFiltersOpen(false)}><Text style={styles.profileButtonText}>Show results</Text></Pressable>
        {activeFilterCount ? (
          <Pressable style={styles.profileCloseButton} onPress={clearFilters}><Text style={styles.profileCloseText}>Clear filters</Text></Pressable>
        ) : null}
      </BottomSheet>

      {/* ---------- Post options ---------- */}
      <BottomSheet visible={Boolean(managePost)} onClose={() => setManagePost(null)} styles={styles} sheetStyle={[styles.actionCard, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{managePost?.authorId === user?.uid ? 'Manage your post' : 'Post options'}</Text>
        {managePost?.authorId === user?.uid ? (
          <>
            <Pressable style={styles.modalAction} onPress={() => { const post = managePost; setManagePost(null); beginEdit(post); }}>
              <Ionicons name="create-outline" size={20} color={colors.brand} />
              <Text style={styles.modalActionText}>Edit post</Text>
            </Pressable>
            <Pressable style={styles.modalAction} onPress={() => { const post = managePost; setManagePost(null); handleDelete(post); }}>
              <Ionicons name="trash-outline" size={20} color={colors.error || '#DC2626'} />
              <Text style={[styles.modalActionText, styles.modalDangerText]}>Delete post</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.modalAction} onPress={() => reportPost(managePost)}>
            <Ionicons name="flag-outline" size={20} color={colors.brand} />
            <Text style={styles.modalActionText}>Report post</Text>
          </Pressable>
        )}
        <Pressable style={styles.modalAction} onPress={() => sharePost(managePost)}>
          <Ionicons name="share-social-outline" size={20} color={colors.brand} />
          <Text style={styles.modalActionText}>Share post</Text>
        </Pressable>
        <Pressable style={styles.profileCloseButton} onPress={() => setManagePost(null)}><Text style={styles.profileCloseText}>Cancel</Text></Pressable>
      </BottomSheet>

      {/* ---------- Profile preview (centered card) ---------- */}
      <BottomSheet visible={Boolean(profilePreview)} onClose={() => setProfilePreview(null)} styles={styles} sheetStyle={styles.profileCard} align="center" animationType="fade">
        {profilePreview?.authorAvatar || profilePreview?.photoURL || profilePreview?.photo
          ? <Image source={{ uri: profilePreview.authorAvatar || profilePreview.photoURL || profilePreview.photo }} style={styles.profileAvatar} contentFit="cover" />
          : <View style={styles.profileAvatar} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={styles.profileName}>{profilePreview?.username || profilePreview?.displayName || profilePreview?.authorName || 'UniHelp student'}</Text>
          {isPremiumActive(profilePreview) ? <Ionicons name="checkmark-circle" size={16} color={colors.brand} /> : null}
        </View>
        {profilePreview?.loading ? <ActivityIndicator color={colors.brand} /> : null}
        {profilePreview?.authorId && profilePreview.authorId !== user?.uid ? (
          <>
            <Pressable style={styles.profileButton} onPress={() => { const uid = profilePreview.authorId; setProfilePreview(null); router.push(`/view-user-profile/${uid}`); }}>
              <Text style={styles.profileButtonText}>View full profile</Text>
            </Pressable>
            {profileRelationship.state !== RELATIONSHIP.BLOCKED ? (
              <Pressable
                style={styles.profileSecondaryButton}
                onPress={handleRelationshipAction}
                disabled={relationshipBusy || profileRelationship.state === RELATIONSHIP.SENT || profileRelationship.state === RELATIONSHIP.RECEIVED}
              >
                {relationshipBusy
                  ? <ActivityIndicator size="small" color={colors.brand} />
                  : <Text style={styles.profileSecondaryButtonText}>
                    {profileRelationship.state === RELATIONSHIP.FRIENDS ? 'Remove friend'
                      : profileRelationship.state === RELATIONSHIP.SENT ? 'Request sent'
                        : profileRelationship.state === RELATIONSHIP.RECEIVED ? 'Respond in Friends'
                          : 'Add friend'}
                  </Text>}
              </Pressable>
            ) : null}
          </>
        ) : null}
        <Pressable style={styles.profileCloseButton} onPress={() => setProfilePreview(null)}><Text style={styles.profileCloseText}>Close</Text></Pressable>
      </BottomSheet>

      {/* ---------- Comments ---------- */}
      <BottomSheet visible={Boolean(commentsPost)} onClose={closeComments} styles={styles} sheetStyle={styles.commentsSheet} avoidKeyboard>
        <View style={styles.commentsHeader}>
          <View>
            <Text style={styles.commentsTitle}>Comments</Text>
            <Text style={styles.commentsCount}>{commentsTotal} {commentsTotal === 1 ? 'comment' : 'comments'}</Text>
          </View>
          <Pressable onPress={closeComments} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close comments">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          style={styles.commentsList}
          contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          renderItem={({ item }) => (
            <View style={[styles.commentItem, item.pending && { opacity: 0.55 }]}>
              <Pressable onPress={() => { closeComments(); router.push(`/view-user-profile/${item.authorId}`); }}>
                {item.authorAvatar ? <Image source={{ uri: item.authorAvatar }} style={styles.commentAvatar} contentFit="cover" /> : <View style={styles.commentAvatar} />}
              </Pressable>
              <View style={styles.commentCopy}>
                <Pressable onPress={() => { closeComments(); router.push(`/view-user-profile/${item.authorId}`); }}>
                  <Text style={styles.commentAuthor}>{item.authorName || 'UniHelp student'}</Text>
                </Pressable>
                <Text style={styles.commentBody}>{item.content}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 }}>
                  <Text style={styles.commentDate}>{item.pending ? 'Sending…' : timeAgo(item.createdAt)}</Text>
                  <Pressable
                    onPress={() => toggleCommentLike(item)}
                    accessibilityRole="button"
                    accessibilityLabel={item.liked ? 'Unlike comment' : 'Like comment'}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Ionicons name={item.liked ? 'heart' : 'heart-outline'} size={14} color={item.liked ? (colors.error || '#DC2626') : colors.textTertiary} />
                    {item.likesCount > 0 && <Text style={[styles.commentDate, { color: item.liked ? (colors.error || '#DC2626') : colors.textTertiary }]}>{item.likesCount}</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          )}
          onEndReached={loadMoreComments}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={commentsLoading
            ? <ActivityIndicator style={{ marginTop: 32 }} color={colors.brand} />
            : (
              <View style={styles.commentsEmpty}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.commentsEmptyText}>Be the first to comment</Text>
              </View>
            )}
          ListFooterComponent={commentsLoadingMore
            ? <ActivityIndicator style={{ paddingVertical: 12 }} color={colors.brand} />
            : commentsHasMore
              ? <Pressable style={styles.commentsMore} onPress={loadMoreComments}><Text style={styles.commentsMoreText}>Load more comments</Text></Pressable>
              : null}
        />

        <View style={[styles.commentsComposer, { paddingBottom: sheetBottomPad }]}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Write a comment..."
            placeholderTextColor={colors.placeholder}
            style={styles.commentInput}
            onSubmitEditing={addComment}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable
            style={({ pressed }) => [styles.sendButton, (pressed || !commentText.trim()) && styles.sendButtonDisabled]}
            onPress={addComment}
            disabled={!commentText.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send comment"
          >
            <Ionicons name="send" size={16} color={colors.onBrand} />
          </Pressable>
        </View>
      </BottomSheet>

      {/* ---------- Image lightbox ---------- */}
      <Modal visible={Boolean(imagePreview)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setImagePreview(null)}>
        <View style={styles.imageLightbox}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setImagePreview(null)} accessibilityLabel="Close full image" />
          {imagePreview ? <Image source={{ uri: imagePreview }} style={styles.imageLightboxImage} contentFit="contain" /> : null}
          <Pressable
            style={[styles.imageLightboxClose, { top: insets.top + 12 }]}
            onPress={() => setImagePreview(null)}
            accessibilityRole="button"
            accessibilityLabel="Close full image"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>

      {/* ---------- Toast ---------- */}
      {toast ? (
        <Animated.View
          style={[styles.toast, {
            bottom: insets.bottom + 16,
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }]}
          pointerEvents="box-none"
        >
          <Ionicons name={toast.icon} size={18} color="#FFFFFF" />
          <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
          {toast.actionLabel ? (
            <Pressable onPress={() => { toast.onAction?.(); hideToast(); }} hitSlop={8}>
              <Text style={styles.toastAction}>{toast.actionLabel}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </ScreenShell>
  );
}