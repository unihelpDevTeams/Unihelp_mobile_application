import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EvosAura from '../../src/shared/components/EvosAura';
import EmptyState from '../../src/shared/components/EmptyState';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { deleteJson, getJson, postJson, putJson, uploadFeatureMedia } from '../../src/shared/services/backend';
import { buildShareUrl, shareContent } from '../../utils/share';
import { useAuth } from '../../context/AuthContext';
import { isPremiumActive } from '../../src/shared/services/premium';
import {
  getUserProfileById,
  listenRelationship,
  RELATIONSHIP,
  removeFriend,
  sendFriendRequest,
} from '../../src/shared/services/friendships';

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

const getPostHashtags = (item) => item.tags?.length
  ? item.tags
  : [...new Set((item.content || '').match(/#[a-zA-Z0-9_]{1,40}/g) || [])].map((tag) => tag.toLowerCase());

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
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

// A single post. Memoized so liking / commenting on one post doesn't
// re-render every card in the list.
const PostCard = React.memo(function PostCard({
  item, liked, styles, colors, onOpenProfile, onMenu, onLike, onComment, onShare, onOpenImage, onTagPress,
}) {
  const tags = useMemo(() => getPostHashtags(item), [item]);
  const isColored = item.type === 'colored';
  return (
    <View style={styles.card}>
      <View style={styles.postHeader}>
        <Pressable onPress={() => onOpenProfile(item)} accessibilityRole="button" accessibilityLabel={`Open ${item.authorName || 'student'} profile`}>
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
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            {item.audience && AUDIENCE_ICON[item.audience] ? (
              <Ionicons name={AUDIENCE_ICON[item.audience]} size={12} color={colors.textTertiary} style={{ marginLeft: 6 }} />
            ) : null}
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.menu, pressed && { opacity: 0.6 }]}
          onPress={() => onMenu(item)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Post options"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {!isColored && item.content ? <Text style={styles.description}>{item.content}</Text> : null}

      {isColored ? (
        <View style={[styles.colored, { backgroundColor: PRESET_COLORS[item.backgroundPreset] || PRESET_COLORS.indigo }]}>
          <Text style={styles.coloredText}>{item.content}</Text>
        </View>
      ) : null}

      {item.type === 'image' && item.imageUrl ? (
        <Pressable onPress={() => onOpenImage(item.imageUrl)} accessibilityRole="button" accessibilityLabel="Open full image">
          <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" transition={150} />
        </Pressable>
      ) : null}

      {tags.length ? (
        <View style={styles.hashtagRow}>
          {tags.map((tag) => (
            <Pressable key={tag} style={styles.hashtag} onPress={() => onTagPress(tag)}>
              <Text style={styles.hashtagText}>{tag}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.metaRow}>
        <Pressable
          style={({ pressed }) => [styles.metaButton, pressed && { opacity: 0.65 }]}
          onPress={() => onLike(item)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? colors.error || '#DC2626' : colors.textSecondary} />
          <Text style={[styles.metaText, liked && styles.metaTextActive]}>{item.likesCount || 0}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.metaButton, pressed && { opacity: 0.65 }]}
          onPress={() => onComment(item)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Open comments"
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.metaText}>{item.commentsCount || 0}</Text>
        </Pressable>
        <View style={styles.metaButton}>
          <Ionicons name="eye-outline" size={19} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>{item.viewsCount || 0}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.metaButton, { marginLeft: 'auto' }, pressed && { opacity: 0.65 }]}
          onPress={() => onShare(item)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Share post"
        >
          <Ionicons name="share-social-outline" size={19} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
});

export default function NewsFeedPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const viewerAvatar = profile?.photoThumb || profile?.photoURL || profile?.photo || profile?.avatar || user?.photoURL || '';

  const [items, setItems] = useState([]);
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
  const [commentPosting, setCommentPosting] = useState(false);
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

  const viewedPosts = useRef(new Set());
  const pillAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const listRef = useRef(null);
  // Incremented on every refresh so slow "load more" / refresh responses
  // from an older request can never overwrite newer data.
  const requestIdRef = useRef(0);
  const commentsRequestRef = useRef(0);
  const itemsRef = useRef([]);
  const busyRef = useRef(true);
  const likedRef = useRef(new Set());
  const likeBusyRef = useRef(new Set());

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

    // Composer entry (top of the list)
    stickyHeader: {
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
      zIndex: 10,
    },
    composerEntry: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
    composerPillText: { color: c.textSecondary, fontSize: 14.5, fontWeight: '500' },
    entryIconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight },

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

    // Post cards
    card: {
      backgroundColor: c.background,
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
      paddingTop: s.lg,
      paddingBottom: s.sm,
    },
    skeletonCard: { backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.borderDefault, padding: s.lg },
    skeletonLine: { height: 12, borderRadius: 6, backgroundColor: c.surfacePrimary },
    skeletonBlock: { height: 140, borderRadius: r.xl, backgroundColor: c.surfacePrimary, marginTop: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandLight },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    authorCol: { flex: 1, gap: 1 },
    authorRow: { flexDirection: 'row', alignItems: 'center' },
    author: { flexShrink: 1, color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    time: { color: c.textTertiary, fontSize: 12.5 },
    menu: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    description: { marginTop: 10, fontSize: 15.5, lineHeight: 22, color: c.textPrimary },
    colored: { minHeight: 220, justifyContent: 'center', alignItems: 'center', padding: 28, borderRadius: r.xl, marginTop: 10 },
    coloredText: { color: '#fff', fontSize: 22, lineHeight: 30, textAlign: 'center', fontWeight: '900' },
    image: { height: 280, width: '100%', backgroundColor: c.surfacePrimary, borderRadius: r.xl, marginTop: 10 },
    hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    hashtag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: r.lg, backgroundColor: c.brandLight },
    hashtagText: { color: c.brandText, fontSize: 11.5, fontWeight: '800' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 8 },
    metaButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
    metaText: { fontSize: 13, fontWeight: '800', color: c.textSecondary },
    metaTextActive: { color: c.error || '#DC2626' },

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
    headerFilterButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brandLight,
      borderWidth: 1,
      borderColor: c.brandBorder,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
    headerFilterButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    headerFilterButtonActive: { backgroundColor: c.brand, borderColor: c.brand },
    filterBadge: { position: 'absolute', top: -5, right: -6, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: c.brand },
    filterBadgeText: { color: c.onBrand, fontSize: 9, fontWeight: '900' },

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

    // "New posts" pill — floats over the top of the list.
    pillLayer: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
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
  useEffect(() => { busyRef.current = loading || refreshing || loadingMore || posting; }, [loading, refreshing, loadingMore, posting]);

  // Slide the "new posts" pill in when there is something to show.
  const hasNewPosts = Boolean(newPosts);
  useEffect(() => {
    if (hasNewPosts) {
      pillAnim.setValue(0);
      Animated.spring(pillAnim, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
    }
  }, [hasNewPosts, pillAnim]);

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
      setItems(hydratedItems);
      setFeedCursor(page.cursor);
      setHasMore(page.hasMore);
      setNewPosts(null);
      setLikedPostIds((current) => {
        const next = new Set();
        hydratedItems.forEach((item) => { if (item.likedByMe || current.has(item.id)) next.add(item.id); });
        return next;
      });
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
        // Silent — this is a background check and the next tick will retry.
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
    setNewPosts(null);
    scrollToTop();
    await loadFeed(true);
  }, [loadFeed, scrollToTop]);

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
  }, []);

  const composerDirty = editingPost
    ? content !== (editingPost.content || '')
    : Boolean(content.trim() || selectedImage);

  // Asks before throwing away a half-written post.
  const closeComposer = useCallback(() => {
    if (posting) return;
    if (!composerDirty) { resetComposer(); return; }
    Keyboard.dismiss();
    Alert.alert('Discard this post?', 'What you wrote will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: resetComposer },
    ]);
  }, [posting, composerDirty, resetComposer]);

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
    if (postType === 'colored') {
      setPostType('text');
    } else {
      setSelectedImage(null);
      setPostType('colored');
    }
  };

  const createPost = async () => {
    if (posting || !content.trim() || (postType === 'image' && !selectedImage)) return;
    Keyboard.dismiss();
    setPosting(true);
    try {
      if (editingPost) {
        await putJson(`/api/feed/posts/${editingPost.id}`, {
          content,
          audience: postAudience,
          backgroundPreset: editingPost.type === 'colored' ? backgroundPreset : undefined,
        });
      } else {
        let image = null;
        if (postType === 'image') {
          image = await uploadFeatureMedia({ ...selectedImage, type: selectedImage.mimeType || 'image/jpeg' }, { feature: 'feed', resourceType: 'image' });
        }
        await postJson('/api/feed/posts', {
          type: postType,
          content,
          audience: postAudience,
          backgroundPreset: postType === 'colored' ? backgroundPreset : undefined,
          imageUrl: image?.url || image?.secure_url,
          cloudinaryPublicId: image?.publicId || image?.public_id,
        });
      }
      resetComposer();
      scrollToTop();
      await loadFeed(true);
    } catch (error) {
      Alert.alert('Could not post', error.message || 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const beginEdit = useCallback((item) => {
    setEditingPost(item);
    setContent(item.content || '');
    setPostType(item.type || 'text');
    setBackgroundPreset(item.backgroundPreset || 'indigo');
    setPostAudience(item.audience || 'friends');
    setSelectedImage(item.type === 'image' ? { uri: item.imageUrl } : null);
    setComposerOpen(true);
  }, []);

  // ---------- Post actions ----------
  const reportPost = async (item) => {
    setManagePost(null);
    try {
      await postJson(`/api/feed/posts/${item.id}/report`, { reportType: 'Inappropriate content' });
      Alert.alert('Report submitted', 'Thanks. Our team will review this post.');
    } catch (error) {
      Alert.alert('Report failed', error.message || 'Could not report this post.');
    }
  };

  const sharePost = useCallback(async (item) => {
    setManagePost(null);
    await shareContent({
      title: `${item.authorName || 'UniHelp student'} on UniHelp`,
      text: item.content || 'View this post on UniHelp.',
      url: buildShareUrl('feed', { post: item.id }),
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
    setRelationshipBusy(true);
    try {
      if (profileRelationship.state === RELATIONSHIP.FRIENDS) {
        await removeFriend({ currentUid: user.uid, friendUid: targetUid, currentProfile: profile || {} });
        setProfileRelationship({ state: RELATIONSHIP.NONE });
      } else if (profileRelationship.state === RELATIONSHIP.NONE) {
        await sendFriendRequest({ currentUid: user.uid, targetUid, currentProfile: profile || {}, targetProfile: profilePreview || {} });
        setProfileRelationship({ state: RELATIONSHIP.SENT });
      }
    } catch (error) {
      Alert.alert('Friend connection failed', error.message || 'Please try again.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const recordView = useCallback((item) => {
    if (!item?.id || viewedPosts.current.has(item.id)) return;
    viewedPosts.current.add(item.id);
    postJson(`/api/feed/posts/${item.id}/view`, {}).catch(() => {
      viewedPosts.current.delete(item.id);
    });
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    viewableItems.forEach(({ item }) => recordView(item));
  }).current;

  // Optimistic like. Reads the liked set from a ref so this callback stays
  // stable (keeps memoized cards from re-rendering), and ignores taps while a
  // request for the same post is still in flight so rapid taps can't desync.
  const toggleLike = useCallback((item) => {
    if (likeBusyRef.current.has(item.id)) return;
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
    postJson(`/api/feed/posts/${item.id}/like`, {})
      .catch((error) => {
        applyLike(alreadyLiked, -delta);
        Alert.alert('Could not update like', error.message || 'Please try again.');
      })
      .finally(() => { likeBusyRef.current.delete(item.id); });
  }, []);

  const handleDelete = useCallback((item) => Alert.alert('Delete post?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        const previous = itemsRef.current;
        setItems((current) => current.filter((post) => post.id !== item.id));
        try {
          await deleteJson(`/api/feed/posts/${item.id}`);
        } catch (error) {
          setItems(previous);
          Alert.alert('Could not delete', error.message || 'Please try again.');
        }
      },
    },
  ]), []);

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

  const addComment = async () => {
    const post = commentsPost;
    const trimmed = commentText.trim();
    if (!post || !trimmed || commentPosting) return;
    setCommentPosting(true);
    try {
      const response = await postJson(`/api/feed/posts/${post.id}/comments`, { content: trimmed });
      const saved = response && typeof response === 'object' ? (response.item || response.comment || null) : null;
      const newComment = {
        id: `local-${Date.now()}`,
        postId: post.id,
        authorId: user?.uid || '',
        authorName: profile?.username || profile?.displayName || user?.email || 'You',
        authorAvatar: viewerAvatar,
        content: trimmed,
        createdAt: new Date().toISOString(),
        ...(saved || {}),
      };
      setComments((current) => [newComment, ...current]);
      setItems((current) => current.map((item) => item.id === post.id
        ? { ...item, commentsCount: (item.commentsCount || 0) + 1 }
        : item));
      setCommentText('');
    } catch (error) {
      Alert.alert('Could not comment', error.message || 'Please try again.');
    } finally {
      setCommentPosting(false);
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
    setSearch(tag);
    setSearchOpen(true);
  }, []);

  const clearFilters = () => {
    setTypeFilter('all');
    setSortFilter('smart');
    setTimeFilter('all');
    setMineOnly(false);
  };

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const now = Date.now();
    const timeLimits = { today: 24, week: 24 * 7, month: 24 * 30 };
    const filtered = items.filter((item) => {
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
  }, [items, search, sortFilter, timeFilter, typeFilter, mineOnly, user?.uid]);

  const renderPost = useCallback(({ item }) => (
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
    />
  ), [likedPostIds, styles, colors, openProfilePreview, toggleLike, openComments, sharePost, handleTagPress]);

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

  const headerActions = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable
        onPress={() => setFiltersOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Open feed filters"
        style={({ pressed }) => [
          styles.headerFilterButton,
          activeFilterCount > 0 && styles.headerFilterButtonActive,
          pressed && styles.headerFilterButtonPressed,
        ]}
      >
        <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? colors.onBrand : colors.textPrimary} />
        {activeFilterCount > 0 ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View> : null}
      </Pressable>
    </View>
  );

  // Collapsed composer + active-filter summary. Lives in the list header so it
  // scrolls away with the feed instead of eating screen space.
  const listHeader = (
    <View style={styles.stickyHeader}>
      <View style={styles.composerEntry}>
        {viewerAvatar ? <Image source={{ uri: viewerAvatar }} style={styles.avatarSm} contentFit="cover" /> : <View style={styles.avatarSm} />}
        <Pressable style={styles.composerPill} onPress={() => setComposerOpen(true)} accessibilityRole="button" accessibilityLabel="Write a post">
          <Text style={styles.composerPillText} numberOfLines={1}>What's happening?</Text>
        </Pressable>
        <Pressable style={styles.entryIconButton} onPress={openImagePicker} accessibilityRole="button" accessibilityLabel="Post a photo">
          <Ionicons name="image-outline" size={20} color={colors.brandText} />
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

  return (
    <ScreenShell
      title="Feed"
      subtitle="What is happening with your friends."
      showBack={false}
      scrollable={false}
      loading={loading}
      actions={headerActions}
      onSearch={toggleSearch}
      showNotifications={false}
      headerScrollY={scrollY}
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

      {loading && !items.length ? (
        <View>
          {listHeader}
          {[0, 1, 2].map((key) => (
            <View key={key} style={styles.skeletonCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.avatar, { opacity: 0.6 }]} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={[styles.skeletonLine, { width: '40%' }]} />
                  <View style={[styles.skeletonLine, { width: '25%', height: 9 }]} />
                </View>
              </View>
              <View style={styles.skeletonBlock} />
            </View>
          ))}
        </View>
      ) : (
        <Animated.FlatList
          ref={listRef}
          data={visibleItems}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          extraData={likedPostIds}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshing={refreshing}
          onRefresh={() => loadFeed(true)}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={() => { if (!loadMoreError) loadMore(); }}
          onEndReachedThreshold={0.6}
          initialNumToRender={5}
          windowSize={9}
          maxToRenderPerBatch={6}
          stickyHeaderIndices={[0]}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={!loading ? (
            <EmptyState
              title={items.length && !visibleItems.length ? 'No matching posts' : 'Your feed is quiet'}
              description={items.length && !visibleItems.length
                ? (hasMore ? 'Nothing in the posts loaded so far. Try another filter or load more.' : 'Try another search or filter.')
                : 'Add friends and start sharing what is happening around campus.'}
            />
          ) : null}
          ListFooterComponent={renderFooter}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}

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

      {/* ---------- Composer sheet ---------- */}
      <BottomSheet visible={composerOpen} onClose={closeComposer} styles={styles} sheetStyle={styles.composerSheet} avoidKeyboard>
        <View style={styles.sheetTop}>
          <Pressable style={styles.sheetCancel} onPress={closeComposer} disabled={posting} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.sheetTopTitle}>{editingPost ? 'Edit post' : 'New post'}</Text>
          <Pressable
            style={[styles.postButton, (posting || !canSubmit) && styles.postButtonDisabled]}
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
                    onPress={() => setPostAudience(value)}
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
              placeholder="What's happening?"
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
                  onPress={() => setBackgroundPreset(name)}
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
            <Pressable key={label} style={[styles.filterButton, mineOnly === value && styles.filterButtonActive]} onPress={() => setMineOnly(value)}>
              <Text style={[styles.filterText, mineOnly === value && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.filterCaption}>Post type</Text>
        <View style={styles.filterRow}>
          {TYPE_FILTERS.map(([value, label]) => (
            <Pressable key={value} style={[styles.filterButton, typeFilter === value && styles.filterButtonActive]} onPress={() => setTypeFilter(value)}>
              <Text style={[styles.filterText, typeFilter === value && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.filterCaption}>Sort by</Text>
        <View style={styles.filterRow}>
          {SORT_FILTERS.map(([value, label]) => (
            <Pressable key={value} style={[styles.filterButton, sortFilter === value && styles.filterButtonActive]} onPress={() => setSortFilter(value)}>
              <Text style={[styles.filterText, sortFilter === value && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.filterCaption}>Time frame</Text>
        <View style={styles.filterRow}>
          {TIME_FILTERS.map(([value, label]) => (
            <Pressable key={value} style={[styles.filterButton, timeFilter === value && styles.filterButtonActive]} onPress={() => setTimeFilter(value)}>
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
            <View style={styles.commentItem}>
              {item.authorAvatar ? <Image source={{ uri: item.authorAvatar }} style={styles.commentAvatar} contentFit="cover" /> : <View style={styles.commentAvatar} />}
              <View style={styles.commentCopy}>
                <Text style={styles.commentAuthor}>{item.authorName || 'UniHelp student'}</Text>
                <Text style={styles.commentBody}>{item.content}</Text>
                <Text style={styles.commentDate}>{timeAgo(item.createdAt)}</Text>
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
            placeholder="Add a comment..."
            placeholderTextColor={colors.placeholder}
            style={styles.commentInput}
            editable={!commentPosting}
            onSubmitEditing={addComment}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable
            style={({ pressed }) => [styles.sendButton, (pressed || commentPosting || !commentText.trim()) && styles.sendButtonDisabled]}
            onPress={addComment}
            disabled={commentPosting || !commentText.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send comment"
          >
            {commentPosting ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="send" size={16} color={colors.onBrand} />}
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
    </ScreenShell>
  );
}