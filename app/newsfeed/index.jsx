import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { deleteJson, getJson, postJson, putJson, uploadFeatureMedia } from '../../src/shared/services/backend';
import { buildShareUrl, shareContent } from '../../utils/share';
import { useAuth } from '../../context/AuthContext';
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

const getPostHashtags = (item) => item.tags?.length
  ? item.tags
  : [...new Set((item.content || '').match(/#[a-zA-Z0-9_]{1,40}/g) || [])].map((tag) => tag.toLowerCase());

// Firestore can hand back Timestamp objects instead of ISO strings, and
// `new Date(timestamp)` on one of those silently produces "Invalid Date",
// which then breaks sorting, time-window filters, and the printed time.
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

export default function NewsFeedPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const viewerAvatar = profile?.photoThumb || profile?.photoURL || profile?.photo || profile?.avatar || user?.photoURL || '';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const viewedPosts = useRef(new Set());
  const marqueeX = useRef(new Animated.Value(0)).current;

  const styles = useThemeStyles((c, s, r) => ({
    // Header — a quieter, card-based intro instead of a full-bleed brand block.
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r['2xl'],
      padding: s.md,
      marginBottom: s.md,
    },
    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brandLight,
    },
    headerCopy: { flex: 1 },
    headerTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    headerText: { marginTop: 2, color: c.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: '500' },
    noticeMarquee: { height: 38, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', marginBottom: s.md, borderRadius: r.xl, backgroundColor: c.goldLight || '#FEF3C7', borderWidth: 1, borderColor: c.gold || '#F59E0B' },
    noticeTrack: { flexDirection: 'row', alignItems: 'center', minWidth: '200%' },
    noticeItem: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14 },
    noticeText: { color: c.goldText || '#92400E', fontSize: 11.5, fontWeight: '800' },

    // Composer
    composer: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r['2xl'],
      padding: s.md,
      marginBottom: s.md,
    },
    composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.brandLight },
    composerPlaceholder: {
      flex: 1,
      color: c.textSecondary,
      backgroundColor: c.surfacePrimary,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 11,
      fontSize: 13.5,
      fontWeight: '600',
    },
    composerInput: {
      color: c.textPrimary,
      backgroundColor: c.surfacePrimary,
      borderRadius: r.xl,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
    },
    composerDivider: { height: 1, backgroundColor: c.borderDefault, marginTop: 12 },
    audienceLabel: { marginTop: 12, color: c.textTertiary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
    audienceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 7 },
    audienceAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: r.lg, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    audienceActionActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    audienceActionText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
    audienceActionTextActive: { color: c.brandText },
    composerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: r.lg,
      backgroundColor: c.surfacePrimary,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    actionActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    actionText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
    actionTextActive: { color: c.brandText },
    cancelAction: { paddingHorizontal: 11, paddingVertical: 8 },
    cancelActionText: { color: c.textTertiary, fontSize: 12, fontWeight: '800' },
    postButton: {
      marginLeft: 'auto',
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: r.lg,
      backgroundColor: c.brand,
    },
    postButtonDisabled: { opacity: 0.5 },
    postButtonText: { color: c.onBrand, fontSize: 12.5, fontWeight: '900' },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 },
    preset: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedPreset: { borderColor: c.textPrimary },
    imagePreviewWrap: { marginTop: 12, borderRadius: r.xl, overflow: 'hidden', position: 'relative' },
    imagePreview: { width: '100%', height: 180, backgroundColor: c.surfacePrimary },
    imageLightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' },
    imageLightboxImage: { width: '100%', height: '82%' },
    imageLightboxClose: { position: 'absolute', top: 52, right: 20, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
    removeImageButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15,23,42,0.6)',
    },

    // Post cards
    card: {
      backgroundColor: c.card,
      borderRadius: r['3xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      overflow: 'hidden',
      marginBottom: s.md,
    },
    skeletonCard: {
      backgroundColor: c.card,
      borderRadius: r['3xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      overflow: 'hidden',
      marginBottom: s.md,
      padding: s.lg,
    },
    skeletonLine: { height: 12, borderRadius: 6, backgroundColor: c.surfacePrimary },
    skeletonBlock: { height: 140, borderRadius: r.xl, backgroundColor: c.surfacePrimary, marginTop: 12 },
    image: { height: 260, width: '100%', backgroundColor: c.surfacePrimary },
    body: { padding: s.lg },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    author: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '800' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 5, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: c.brandLight },
    verifiedBadgeText: { color: c.brandText, fontSize: 9, fontWeight: '900' },
    time: { color: c.textTertiary, fontSize: 11, marginTop: 2 },
    menu: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfacePrimary,
    },
    description: { marginTop: 12, fontSize: 14, lineHeight: 21, color: c.textPrimary },
    colored: { minHeight: 220, justifyContent: 'center', alignItems: 'center', padding: 28 },
    coloredText: { color: '#fff', fontSize: 22, lineHeight: 30, textAlign: 'center', fontWeight: '900' },
    metaRow: { flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.borderDefault },
    metaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: r.lg,
    },
    metaButtonActive: { backgroundColor: c.brandLight },
    metaText: { fontSize: 12.5, fontWeight: '800', color: c.textSecondary },
    metaTextActive: { color: '#DC2626' },
    commentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    commentInput: {
      flex: 1,
      color: c.textPrimary,
      backgroundColor: c.surfacePrimary,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 13,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brand,
    },
    sendButtonDisabled: { opacity: 0.5 },
    commentsSheet: { height: '78%', backgroundColor: c.card, borderTopLeftRadius: r['3xl'], borderTopRightRadius: r['3xl'], paddingTop: s.md },
    commentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s.lg, paddingBottom: s.md, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    commentsTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    commentsCount: { color: c.textTertiary, fontSize: 12, fontWeight: '700' },
    commentsList: { flex: 1, paddingHorizontal: s.lg },
    commentItem: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
    commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.brandLight },
    commentCopy: { flex: 1 },
    commentAuthor: { color: c.textPrimary, fontSize: 12, fontWeight: '900' },
    commentBody: { marginTop: 3, color: c.textSecondary, fontSize: 13, lineHeight: 18 },
    commentDate: { marginTop: 3, color: c.textTertiary, fontSize: 10 },
    commentsMore: { alignItems: 'center', paddingVertical: 12 },
    commentsMoreText: { color: c.brandText, fontSize: 12, fontWeight: '900' },
    commentsEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    commentsEmptyText: { color: c.textTertiary, fontSize: 13 },
    commentsComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: s.md, borderTopWidth: 1, borderTopColor: c.borderDefault },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.48)' },
    actionCard: { backgroundColor: c.card, borderTopLeftRadius: r['3xl'], borderTopRightRadius: r['3xl'], padding: s.lg, gap: 8 },
    modalHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: c.borderDefault, marginBottom: s.sm },
    modalTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '900', marginBottom: s.sm },
    modalAction: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: s.md, borderRadius: r.xl, backgroundColor: c.surfacePrimary },
    modalActionText: { color: c.textPrimary, fontSize: 14, fontWeight: '800' },
    modalDangerText: { color: c.error || '#DC2626' },
    profileCard: { alignItems: 'center', backgroundColor: c.card, borderRadius: r['3xl'], padding: s.xl, marginHorizontal: s.lg, gap: 8 },
    profileAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: c.brandLight },
    profileName: { color: c.textPrimary, fontSize: 19, fontWeight: '900' },
    profileMeta: { color: c.textSecondary, fontSize: 12 },
    profileButton: { width: '100%', alignItems: 'center', paddingVertical: 12, borderRadius: r.xl, backgroundColor: c.brand, marginTop: s.sm },
    profileButtonText: { color: c.onBrand, fontSize: 13, fontWeight: '900' },
    profileSecondaryButton: { width: '100%', alignItems: 'center', paddingVertical: 12, borderRadius: r.xl, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    profileSecondaryButtonText: { color: c.textPrimary, fontSize: 13, fontWeight: '900' },
    profileCloseButton: { width: '100%', alignItems: 'center', paddingVertical: 10 },
    profileCloseText: { color: c.textSecondary, fontSize: 13, fontWeight: '800' },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: s.sm, paddingHorizontal: s.md, borderRadius: r.xl, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault },
    searchInput: { flex: 1, color: c.textPrimary, paddingVertical: 11, fontSize: 13 },
    filterIconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: r.lg, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    filterBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: c.brand },
    filterBadgeText: { color: c.onBrand, fontSize: 9, fontWeight: '900' },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: s.md },
    filterButton: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: r.lg, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    filterButtonActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    filterText: { color: c.textSecondary, fontSize: 11, fontWeight: '800' },
    filterTextActive: { color: c.brandText },
    filterCaption: { color: c.textTertiary, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginBottom: 6, marginTop: 2 },
    hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    hashtag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: r.lg, backgroundColor: c.brandLight },
    hashtagText: { color: c.brandText, fontSize: 11, fontWeight: '800' },
  }));

  // Single marquee loop. (Previously declared twice, which spun up two
  // competing Animated loops on the same value and wasted a native driver tick.)
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(marqueeX, { toValue: -420, duration: 12000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(marqueeX, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [marqueeX]);

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const response = await getJson('/api/feed?limit=20');
      const nextItems = Array.isArray(response?.items) ? response.items : [];
      console.log('[Feed] Loaded feed', { uid: user?.uid, count: nextItems.length });
      const hydratedItems = await Promise.all(nextItems.map(async (item) => {
        if (item.authorAvatar && item.authorName) return item;
        try {
          const author = await getUserProfileById(item.authorId);
          return {
            ...item,
            authorName: item.authorName || author?.username || author?.displayName || 'UniHelp student',
            authorAvatar: item.authorAvatar || author?.photoThumb || author?.photoURL || author?.photo || author?.avatar || '',
          };
        } catch {
          return item;
        }
      }));
      setItems(hydratedItems);
      setLikedPostIds((current) => {
        const next = new Set();
        hydratedItems.forEach((item) => { if (item.likedByMe || current.has(item.id)) next.add(item.id); });
        return next;
      });
    } catch (error) {
      console.error('[Feed] Failed to load feed', error);
      Alert.alert('Feed unavailable', error.message || "Couldn't load your feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const openImagePicker = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow access to your photos to add one to a post.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setPostType('image');
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (postType === 'image') setPostType('text');
  };

  const resetComposer = () => {
    setContent('');
    setSelectedImage(null);
    setPostType('text');
    setEditingPost(null);
    setPostAudience('friends');
    setComposerOpen(false);
  };

  const createPost = async () => {
    if (!content.trim() || (postType === 'image' && !selectedImage)) return;
    setPosting(true);
    try {
      if (editingPost) {
        await putJson(`/api/feed/posts/${editingPost.id}`, {
          content,
          audience: postAudience,
          backgroundPreset: postType === 'colored' ? backgroundPreset : undefined,
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
      await loadFeed(true);
    } catch (error) {
      Alert.alert('Could not post', error.message || 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const beginEdit = (item) => {
    setEditingPost(item);
    setContent(item.content || '');
    setPostType(item.type || 'text');
    setBackgroundPreset(item.backgroundPreset || 'indigo');
    setPostAudience(item.audience || 'friends');
    setSelectedImage(item.type === 'image' ? { uri: item.imageUrl } : null);
    setComposerOpen(true);
  };

  const handlePostMenu = (item) => {
    setManagePost(item);
  };

  const reportPost = async (item) => {
    setManagePost(null);
    try {
      await postJson(`/api/feed/posts/${item.id}/report`, { reportType: 'Inappropriate content' });
      Alert.alert('Report submitted', 'Thanks. Our team will review this post.');
    } catch (error) {
      Alert.alert('Report failed', error.message || 'Could not report this post.');
    }
  };

  const sharePost = async (item) => {
    setManagePost(null);
    await shareContent({
      title: `${item.authorName || 'UniHelp student'} on UniHelp`,
      text: item.content || 'View this post on UniHelp.',
      url: buildShareUrl('feed', { post: item.id }),
    });
  };

  const openProfilePreview = async (item) => {
    setProfilePreview({ ...item, loading: true });
    setProfileRelationship({ state: RELATIONSHIP.NONE });
    try {
      const profileData = await getUserProfileById(item.authorId);
      setProfilePreview((current) => current ? { ...current, ...(profileData || {}), loading: false } : current);
    } catch (error) {
      console.warn('[Feed] Could not load author profile', error);
      setProfilePreview((current) => current ? { ...current, loading: false } : current);
    }
  };

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

  // Optimistic like: flips the heart and count immediately instead of
  // reloading the whole feed (which used to reset scroll position and
  // flash a refresh spinner on every tap).
  const toggleLike = useCallback((item) => {
    const alreadyLiked = likedPostIds.has(item.id);
    setLikedPostIds((current) => {
      const next = new Set(current);
      if (alreadyLiked) next.delete(item.id); else next.add(item.id);
      return next;
    });
    setItems((current) => current.map((post) => post.id === item.id
      ? { ...post, likesCount: Math.max(0, (post.likesCount || 0) + (alreadyLiked ? -1 : 1)) }
      : post));
    postJson(`/api/feed/posts/${item.id}/like`, {}).catch((error) => {
      setLikedPostIds((current) => {
        const next = new Set(current);
        if (alreadyLiked) next.add(item.id); else next.delete(item.id);
        return next;
      });
      setItems((current) => current.map((post) => post.id === item.id
        ? { ...post, likesCount: Math.max(0, (post.likesCount || 0) + (alreadyLiked ? 1 : -1)) }
        : post));
      Alert.alert('Could not update like', error.message || 'Please try again.');
    });
  }, [likedPostIds]);

  const handleDelete = (item) => Alert.alert('Delete post?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        const previous = items;
        setItems((current) => current.filter((post) => post.id !== item.id));
        try {
          await deleteJson(`/api/feed/posts/${item.id}`);
        } catch (error) {
          setItems(previous);
          Alert.alert('Could not delete', error.message || 'Please try again.');
        }
      },
    },
  ]);

  const loadComments = async (item, append = false) => {
    if (!item?.id || (append && (!commentsHasMore || commentsLoadingMore))) return;
    if (append) setCommentsLoadingMore(true); else setCommentsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (append && commentsCursor) params.set('cursor', commentsCursor);
      const response = await getJson(`/api/feed/posts/${encodeURIComponent(item.id)}/comments?${params.toString()}`);
      setComments((current) => append ? [...current, ...(response.items || [])] : (response.items || []));
      setCommentsCursor(response.nextCursor || null);
      setCommentsHasMore(Boolean(response.hasMore));
    } catch (error) {
      Alert.alert('Could not load comments', error.message || 'Please try again.');
      console.error('[Feed] Failed to load comments', error);
    } finally {
      setCommentsLoading(false);
      setCommentsLoadingMore(false);
    }
  };

  const openComments = (item) => {
    setCommentText('');
    setCommentsPost(item);
    setComments([]);
    setCommentsCursor(null);
    setCommentsHasMore(false);
    loadComments(item);
  };

  const closeComments = () => {
    setCommentsPost(null);
    setComments([]);
    setCommentText('');
  };

  const addComment = async (item) => {
    const trimmed = commentText.trim();
    if (!trimmed || commentPosting) return;
    setCommentPosting(true);
    try {
      await postJson(`/api/feed/posts/${item.id}/comments`, { content: trimmed });
      const newComment = {
        id: `local-${Date.now()}`,
        postId: item.id,
        authorId: user?.uid || '',
        authorName: profile?.username || profile?.displayName || user?.email || 'You',
        authorAvatar: viewerAvatar,
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setComments((current) => [newComment, ...current]);
      setItems((current) => current.map((post) => post.id === item.id
        ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
        : post));
      setCommentText('');
    } catch (error) {
      Alert.alert('Could not comment', error.message || 'Please try again.');
    } finally {
      setCommentPosting(false);
    }
  };

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const now = Date.now();
    const timeLimits = { today: 24, week: 24 * 7, month: 24 * 30 };
    const filtered = items.filter((item) => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const tags = getPostHashtags(item);
      const searchable = `${item.content || ''} ${item.authorName || ''} ${tags.join(' ')}`.toLowerCase();
      const postDate = toDate(item.createdAt);
      const ageHours = postDate ? Math.max(0, (now - postDate.getTime()) / (60 * 60 * 1000)) : Infinity;
      const matchesTime = timeFilter === 'all' || ageHours <= timeLimits[timeFilter];
      return matchesType && matchesTime && (!normalizedSearch || searchable.includes(normalizedSearch));
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
  }, [items, search, sortFilter, timeFilter, typeFilter]);

  const renderPost = ({ item }) => {
    const liked = likedPostIds.has(item.id);
    return (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.postHeader}>
          <Pressable onPress={() => openProfilePreview(item)} accessibilityRole="button" accessibilityLabel={`Open ${item.authorName || 'student'} profile`}>
            {item.authorAvatar ? <Image source={{ uri: item.authorAvatar }} style={styles.avatar} contentFit="cover" /> : <View style={styles.avatar} />}
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.author}>{item.authorName || 'UniHelp student'}</Text>
              {item.authorPremium ? <View style={styles.verifiedBadge}><Ionicons name="checkmark-circle" size={12} color={colors.brand} /><Text style={styles.verifiedBadgeText}>Premium</Text></View> : null}
            </View>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.menu, pressed && { opacity: 0.7 }]} onPress={() => handlePostMenu(item)}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {item.type === 'colored' ? (
        <View style={[styles.colored, { backgroundColor: PRESET_COLORS[item.backgroundPreset] || PRESET_COLORS.indigo }]}>
          <Text style={styles.coloredText}>{item.content}</Text>
        </View>
      ) : null}

      {item.type === 'image' && item.imageUrl ? (
        <Pressable onPress={() => setImagePreview(item.imageUrl)} accessibilityRole="button" accessibilityLabel="Open full image">
          <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
        </Pressable>
      ) : null}

      <View style={styles.body}>
        {item.type !== 'colored' && item.content ? <Text style={styles.description}>{item.content}</Text> : null}
        {getPostHashtags(item).length ? (
          <View style={styles.hashtagRow}>
            {getPostHashtags(item).map((tag) => <Pressable key={tag} style={styles.hashtag} onPress={() => setSearch(tag)}><Text style={styles.hashtagText}>{tag}</Text></Pressable>)}
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Pressable
            style={({ pressed }) => [styles.metaButton, liked && styles.metaButtonActive, pressed && { opacity: 0.65 }]}
            onPress={() => toggleLike(item)}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
          >
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? '#DC2626' : colors.textSecondary} />
            <Text style={[styles.metaText, liked && styles.metaTextActive]}>{item.likesCount || 0}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.metaButton, pressed && { opacity: 0.65 }]}
            onPress={() => openComments(item)}
          >
            <Ionicons name="chatbubble-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.commentsCount || 0}</Text>
          </Pressable>
          <View style={styles.metaButton}>
            <Ionicons name="eye-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{item.viewsCount || 0}</Text>
          </View>
        </View>

      </View>
    </View>
    );
  };

  const canSubmit = content.trim().length > 0 && !(postType === 'image' && !selectedImage);
  const activeFilterCount = [typeFilter !== 'all', sortFilter !== 'smart', timeFilter !== 'all'].filter(Boolean).length;

  return (
    <ScreenShell title="Feed" subtitle="What is happening with your friends." showBack={false} scrollable={false} loading={loading}>
      <View
        style={styles.noticeMarquee}
        accessibilityRole="alert"
        accessibilityLabel="Feed guidelines: Share educational updates, school information, opportunities, and useful student resources. Avoid irrelevant or offensive content."
      >
        <Animated.View style={[styles.noticeTrack, { transform: [{ translateX: marqueeX }] }]}>
          {[1, 2].map((copy) => (
            <View key={copy} style={styles.noticeItem} accessible={false}>
              <Ionicons name="information-circle-outline" size={16} color={colors.gold || '#B45309'} />
              <Text style={styles.noticeText}>Keep the Feed professional: share educational updates, school information, opportunities, and useful student resources.</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <View style={styles.composer}>
        <View style={styles.composerRow}>
          {viewerAvatar ? <Image source={{ uri: viewerAvatar }} style={styles.avatar} contentFit="cover" /> : <View style={styles.avatar} />}
          <Pressable style={{ flex: 1 }} onPress={() => setComposerOpen(true)}>
            <Text style={styles.composerPlaceholder} numberOfLines={1}>
              {editingPost ? 'Editing your post' : "What's on your mind?"}
            </Text>
          </Pressable>
        </View>

        {composerOpen ? (
          <>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Share something with your friends"
              placeholderTextColor={colors.placeholder}
              multiline
              autoFocus
              style={[styles.composerInput, { marginTop: 12, minHeight: 90, textAlignVertical: 'top' }]}
            />

            {postType === 'image' && selectedImage ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} contentFit="cover" />
                {!editingPost ? (
                  <Pressable style={({ pressed }) => [styles.removeImageButton, pressed && { opacity: 0.8 }]} onPress={removeSelectedImage}>
                    <Ionicons name="close" size={15} color="#FFFFFF" />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {postType === 'colored' ? (
              <View style={styles.presetRow}>
                {Object.entries(PRESET_COLORS).map(([name, color]) => (
                  <Pressable
                    key={name}
                    onPress={() => setBackgroundPreset(name)}
                    style={[styles.preset, { backgroundColor: color }, backgroundPreset === name && styles.selectedPreset]}
                  >
                    {backgroundPreset === name ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={styles.audienceLabel}>WHO CAN SEE THIS?</Text>
            <View style={styles.audienceRow}>
              <Pressable
                style={[styles.audienceAction, postAudience === 'friends' && styles.audienceActionActive]}
                onPress={() => setPostAudience('friends')}
              >
                <Ionicons name="people-outline" size={15} color={postAudience === 'friends' ? colors.brandText : colors.textSecondary} />
                <Text style={[styles.audienceActionText, postAudience === 'friends' && styles.audienceActionTextActive]}>Friends</Text>
              </Pressable>
              <Pressable
                style={[styles.audienceAction, postAudience === 'private' && styles.audienceActionActive]}
                onPress={() => setPostAudience('private')}
              >
                <Ionicons name="lock-closed-outline" size={15} color={postAudience === 'private' ? colors.brandText : colors.textSecondary} />
                <Text style={[styles.audienceActionText, postAudience === 'private' && styles.audienceActionTextActive]}>Only me</Text>
              </Pressable>
              <Pressable
                style={[styles.audienceAction, postAudience === 'everyone' && styles.audienceActionActive]}
                onPress={() => setPostAudience('everyone')}
              >
                <Ionicons name="globe-outline" size={15} color={postAudience === 'everyone' ? colors.brandText : colors.textSecondary} />
                <Text style={[styles.audienceActionText, postAudience === 'everyone' && styles.audienceActionTextActive]}>Everyone</Text>
              </Pressable>
            </View>

            <View style={styles.composerDivider} />
            <View style={styles.composerActions}>
              {!editingPost ? (
                <Pressable
                  style={[styles.action, postType === 'image' && styles.actionActive]}
                  onPress={openImagePicker}
                >
                  <Ionicons name="image-outline" size={16} color={postType === 'image' ? colors.brandText : colors.textSecondary} />
                  <Text style={[styles.actionText, postType === 'image' && styles.actionTextActive]}>Photo</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.action, postType === 'colored' && styles.actionActive]}
                onPress={() => setPostType('colored')}
              >
                <Ionicons name="color-palette-outline" size={16} color={postType === 'colored' ? colors.brandText : colors.textSecondary} />
                <Text style={[styles.actionText, postType === 'colored' && styles.actionTextActive]}>Background</Text>
              </Pressable>
              <Pressable style={styles.cancelAction} onPress={resetComposer} disabled={posting}>
                <Text style={styles.cancelActionText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.postButton, (posting || !canSubmit) && styles.postButtonDisabled]}
                disabled={posting || !canSubmit}
                onPress={createPost}
              >
                <Text style={styles.postButtonText}>{posting ? 'Saving...' : editingPost ? 'Save' : 'Post'}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color={colors.textTertiary} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search posts or hashtags" placeholderTextColor={colors.placeholder} style={styles.searchInput} />
        {search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={17} color={colors.textTertiary} /></Pressable> : null}
        <Pressable style={styles.filterIconButton} onPress={() => setFiltersOpen(true)} accessibilityRole="button" accessibilityLabel="Open feed filters">
          <Ionicons name="options-outline" size={18} color={colors.brand} />
          {activeFilterCount ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View> : null}
        </Pressable>
      </View>

      {loading && !items.length ? (
        <View>
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
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshing={refreshing}
          onRefresh={() => loadFeed(true)}
          ListEmptyComponent={!loading ? (
            <EmptyState title={items.length && !visibleItems.length ? 'No matching posts' : 'Your feed is quiet'} description={items.length && !visibleItems.length ? 'Try another search or filter.' : 'Add friends and start sharing what is happening around campus.'} />
          ) : null}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFiltersOpen(false)}>
          <Pressable style={styles.actionCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Feed filters</Text>
            <Text style={styles.filterCaption}>POST TYPE</Text>
            <View style={styles.filterRow}>
              {[['all', 'All'], ['text', 'Text'], ['image', 'Photos'], ['colored', 'Backgrounds']].map(([value, label]) => (
                <Pressable key={value} style={[styles.filterButton, typeFilter === value && styles.filterButtonActive]} onPress={() => setTypeFilter(value)}><Text style={[styles.filterText, typeFilter === value && styles.filterTextActive]}>{label}</Text></Pressable>
              ))}
            </View>
            <Text style={styles.filterCaption}>SORT BY</Text>
            <View style={styles.filterRow}>
              {[['smart', 'For you'], ['latest', 'Latest'], ['oldest', 'Old posts'], ['popular', 'Popular']].map(([value, label]) => (
                <Pressable key={value} style={[styles.filterButton, sortFilter === value && styles.filterButtonActive]} onPress={() => setSortFilter(value)}><Text style={[styles.filterText, sortFilter === value && styles.filterTextActive]}>{label}</Text></Pressable>
              ))}
            </View>
            <Text style={styles.filterCaption}>TIME FRAME</Text>
            <View style={styles.filterRow}>
              {[['all', 'Any time'], ['today', 'Today'], ['week', 'This week'], ['month', 'This month']].map(([value, label]) => (
                <Pressable key={value} style={[styles.filterButton, timeFilter === value && styles.filterButtonActive]} onPress={() => setTimeFilter(value)}><Text style={[styles.filterText, timeFilter === value && styles.filterTextActive]}>{label}</Text></Pressable>
              ))}
            </View>
            <Pressable style={styles.profileButton} onPress={() => setFiltersOpen(false)}><Text style={styles.profileButtonText}>Apply filters</Text></Pressable>
            {activeFilterCount ? <Pressable style={styles.profileCloseButton} onPress={() => { setTypeFilter('all'); setSortFilter('smart'); setTimeFilter('all'); }}><Text style={styles.profileCloseText}>Clear filters</Text></Pressable> : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(managePost)} transparent animationType="slide" onRequestClose={() => setManagePost(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setManagePost(null)}>
          <Pressable style={styles.actionCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{managePost?.authorId === user?.uid ? 'Manage your post' : 'Post options'}</Text>
            {managePost?.authorId === user?.uid ? (
              <>
                <Pressable style={styles.modalAction} onPress={() => { const post = managePost; setManagePost(null); beginEdit(post); }}><Ionicons name="create-outline" size={20} color={colors.brand} /><Text style={styles.modalActionText}>Edit post</Text></Pressable>
                <Pressable style={styles.modalAction} onPress={() => { const post = managePost; setManagePost(null); handleDelete(post); }}><Ionicons name="trash-outline" size={20} color={colors.error || '#DC2626'} /><Text style={[styles.modalActionText, styles.modalDangerText]}>Delete post</Text></Pressable>
              </>
            ) : (
              <Pressable style={styles.modalAction} onPress={() => reportPost(managePost)}><Ionicons name="flag-outline" size={20} color={colors.brand} /><Text style={styles.modalActionText}>Report post</Text></Pressable>
            )}
            <Pressable style={styles.modalAction} onPress={() => sharePost(managePost)}><Ionicons name="share-social-outline" size={20} color={colors.brand} /><Text style={styles.modalActionText}>Share post</Text></Pressable>
            <Pressable style={styles.profileCloseButton} onPress={() => setManagePost(null)}><Text style={styles.profileCloseText}>Cancel</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(profilePreview)} transparent animationType="fade" onRequestClose={() => setProfilePreview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setProfilePreview(null)}>
          <Pressable style={styles.profileCard} onPress={(event) => event.stopPropagation()}>
            {profilePreview?.authorAvatar || profilePreview?.photoURL || profilePreview?.photo ? <Image source={{ uri: profilePreview.authorAvatar || profilePreview.photoURL || profilePreview.photo }} style={styles.profileAvatar} contentFit="cover" /> : <View style={styles.profileAvatar} />}
            <Text style={styles.profileName}>{profilePreview?.username || profilePreview?.displayName || profilePreview?.authorName || 'UniHelp student'}</Text>
            {profilePreview?.email ? <Text style={styles.profileMeta}>{profilePreview.email}</Text> : null}
            {profilePreview?.loading ? <ActivityIndicator color={colors.brand} /> : null}
            {profilePreview?.authorId && profilePreview.authorId !== user?.uid ? (
              <>
                <Pressable style={styles.profileButton} onPress={() => { const uid = profilePreview.authorId; setProfilePreview(null); router.push(`/view-user-profile/${uid}`); }}><Text style={styles.profileButtonText}>View full profile</Text></Pressable>
                {profileRelationship.state !== RELATIONSHIP.BLOCKED ? (
                  <Pressable style={styles.profileSecondaryButton} onPress={handleRelationshipAction} disabled={relationshipBusy || profileRelationship.state === RELATIONSHIP.SENT || profileRelationship.state === RELATIONSHIP.RECEIVED}>
                    {relationshipBusy ? <ActivityIndicator size="small" color={colors.brand} /> : <Text style={styles.profileSecondaryButtonText}>{profileRelationship.state === RELATIONSHIP.FRIENDS ? 'Remove friend' : profileRelationship.state === RELATIONSHIP.SENT ? 'Request sent' : profileRelationship.state === RELATIONSHIP.RECEIVED ? 'Respond in Friends' : 'Add friend'}</Text>}
                  </Pressable>
                ) : null}
              </>
            ) : null}
            <Pressable style={styles.profileCloseButton} onPress={() => setProfilePreview(null)}><Text style={styles.profileCloseText}>Close</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(commentsPost)} transparent animationType="slide" onRequestClose={closeComments}>
        <Pressable style={styles.modalBackdrop} onPress={closeComments}>
          <Pressable style={styles.commentsSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.commentsHeader}>
              <View>
                <Text style={styles.commentsTitle}>Comments</Text>
                <Text style={styles.commentsCount}>{commentsPost?.commentsCount || comments.length} comments</Text>
              </View>
              <Pressable onPress={closeComments} accessibilityRole="button" accessibilityLabel="Close comments">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {commentsLoading ? <ActivityIndicator style={{ marginTop: 32 }} color={colors.brand} /> : null}
            {!commentsLoading && !comments.length ? (
              <View style={styles.commentsEmpty}><Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textTertiary} /><Text style={styles.commentsEmptyText}>Be the first to comment</Text></View>
            ) : null}
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              style={styles.commentsList}
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
              onEndReached={() => commentsPost && loadComments(commentsPost, true)}
              onEndReachedThreshold={0.5}
              ListFooterComponent={commentsLoadingMore ? <ActivityIndicator style={{ paddingVertical: 12 }} color={colors.brand} /> : commentsHasMore ? <Pressable style={styles.commentsMore} onPress={() => loadComments(commentsPost, true)}><Text style={styles.commentsMoreText}>Load more comments</Text></Pressable> : null}
            />

            <View style={styles.commentsComposer}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment..."
                placeholderTextColor={colors.placeholder}
                style={styles.commentInput}
                editable={!commentPosting}
                onSubmitEditing={() => commentsPost && addComment(commentsPost)}
                returnKeyType="send"
              />
              <Pressable style={({ pressed }) => [styles.sendButton, (pressed || commentPosting) && styles.sendButtonDisabled]} onPress={() => commentsPost && addComment(commentsPost)} disabled={commentPosting || !commentText.trim()}>
                {commentPosting ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="send" size={16} color={colors.onBrand} />}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(imagePreview)} transparent animationType="fade" onRequestClose={() => setImagePreview(null)}>
        <View style={styles.imageLightbox}>
          {imagePreview ? <Image source={{ uri: imagePreview }} style={styles.imageLightboxImage} contentFit="contain" /> : null}
          <Pressable style={styles.imageLightboxClose} onPress={() => setImagePreview(null)} accessibilityRole="button" accessibilityLabel="Close full image">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </ScreenShell>
  );
}