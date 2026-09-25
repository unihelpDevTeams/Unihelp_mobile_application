import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { deleteJson, getJson, postJson, putJson, uploadFeatureMedia } from '../../src/shared/services/backend';
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
  const [commentingId, setCommentingId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [managePost, setManagePost] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileRelationship, setProfileRelationship] = useState({ state: RELATIONSHIP.NONE });
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [postAudience, setPostAudience] = useState('friends');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const viewedPosts = useRef(new Set());

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
    image: { height: 260, width: '100%', backgroundColor: c.surfacePrimary },
    body: { padding: s.lg },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    author: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '800' },
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
    metaText: { fontSize: 12.5, fontWeight: '800', color: c.textSecondary },
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
    filterRow: { flexDirection: 'row', gap: 7, marginBottom: s.md },
    filterButton: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: r.lg, backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    filterButtonActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    filterText: { color: c.textSecondary, fontSize: 11, fontWeight: '800' },
    filterTextActive: { color: c.brandText },
    hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    hashtag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: r.lg, backgroundColor: c.brandLight },
    hashtagText: { color: c.brandText, fontSize: 11, fontWeight: '800' },
  }));

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

  const handleDelete = (item) => Alert.alert('Delete post?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteJson(`/api/feed/posts/${item.id}`); loadFeed(true); } },
  ]);

  const addComment = async (item) => {
    if (!commentText.trim()) return;
    await postJson(`/api/feed/posts/${item.id}/comments`, { content: commentText });
    setCommentText('');
    setCommentingId(null);
    loadFeed(true);
  };

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const tags = getPostHashtags(item);
      const searchable = `${item.content || ''} ${item.authorName || ''} ${tags.join(' ')}`.toLowerCase();
      return matchesType && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [items, search, typeFilter]);

  const renderPost = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.postHeader}>
          <Pressable onPress={() => openProfilePreview(item)} accessibilityRole="button" accessibilityLabel={`Open ${item.authorName || 'student'} profile`}>
            {item.authorAvatar ? <Image source={{ uri: item.authorAvatar }} style={styles.avatar} contentFit="cover" /> : <View style={styles.avatar} />}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.author}>{item.authorName || 'UniHelp student'}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
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
        <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
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
            style={({ pressed }) => [styles.metaButton, pressed && { opacity: 0.65 }]}
            onPress={() => postJson(`/api/feed/posts/${item.id}/like`, {}).then(() => loadFeed(true))}
          >
            <Ionicons name="heart-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.likesCount || 0}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.metaButton, pressed && { opacity: 0.65 }]}
            onPress={() => setCommentingId(commentingId === item.id ? null : item.id)}
          >
            <Ionicons name="chatbubble-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.commentsCount || 0}</Text>
          </Pressable>
          <View style={styles.metaButton}>
            <Ionicons name="eye-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{item.viewsCount || 0}</Text>
          </View>
        </View>

        {commentingId === item.id ? (
          <View style={styles.commentRow}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment"
              placeholderTextColor={colors.placeholder}
              style={styles.commentInput}
              autoFocus
            />
            <Pressable style={({ pressed }) => [styles.sendButton, pressed && { opacity: 0.85 }]} onPress={() => addComment(item)}>
              <Ionicons name="send" size={16} color={colors.onBrand} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );

  const canSubmit = content.trim().length > 0 && !(postType === 'image' && !selectedImage);

  return (
    <ScreenShell title="Feed" subtitle="What is happening with your friends." showBack={false} scrollable={false} loading={loading}>

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
                <Pressable style={({ pressed }) => [styles.removeImageButton, pressed && { opacity: 0.8 }]} onPress={removeSelectedImage}>
                  <Ionicons name="close" size={15} color="#FFFFFF" />
                </Pressable>
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
      </View>
      <View style={styles.filterRow}>
        {[['all', 'All'], ['text', 'Text'], ['image', 'Photos'], ['colored', 'Backgrounds']].map(([value, label]) => (
          <Pressable key={value} style={[styles.filterButton, typeFilter === value && styles.filterButtonActive]} onPress={() => setTypeFilter(value)}><Text style={[styles.filterText, typeFilter === value && styles.filterTextActive]}>{label}</Text></Pressable>
        ))}
      </View>

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
              <Pressable style={styles.modalAction} onPress={() => { const post = managePost; setManagePost(null); postJson(`/api/feed/posts/${post.id}/report`, { reportType: 'Inappropriate content' }); }}><Ionicons name="flag-outline" size={20} color={colors.brand} /><Text style={styles.modalActionText}>Report post</Text></Pressable>
            )}
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
    </ScreenShell>
  );
}