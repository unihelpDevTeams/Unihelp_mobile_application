import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { deleteJson, getJson, postJson, putJson, uploadFeatureMedia } from '../../src/shared/services/backend';
import { useAuth } from '../../context/AuthContext';

export default function NewsFeedPage() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
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
  const viewedPosts = useRef(new Set());

  const styles = useThemeStyles((c, s, r) => ({
    hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.brand, borderRadius: r['3xl'], padding: s.lg, marginBottom: s.md },
    heroCopy: { flex: 1 },
    heroTitle: { color: c.onBrand, fontSize: 20, fontWeight: '800' },
    heroText: { marginTop: 4, color: c.onBrand, fontSize: 12, lineHeight: 18, fontWeight: '500' },
    composer: { backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r['2xl'], padding: s.md, marginBottom: s.md },
    composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.brandLight },
    composerInput: { flex: 1, color: c.textPrimary, backgroundColor: c.surfacePrimary, borderRadius: r.xl, paddingHorizontal: 14, paddingVertical: 11 },
    composerActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    action: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: r.lg, backgroundColor: c.brandLight },
    actionText: { color: c.brandText, fontSize: 12, fontWeight: '800' },
    presetRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    preset: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
    selectedPreset: { borderColor: c.textPrimary },
    card: {
      backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault,
      overflow: 'hidden', marginBottom: s.md,
    },
    image: { height: 260, width: '100%' },
    body: { padding: s.lg },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    author: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '800' },
    time: { color: c.textTertiary, fontSize: 11, marginTop: 2 },
    menu: { padding: 4 },
    title: { fontSize: 16, fontWeight: '800', color: c.textPrimary, lineHeight: 23 },
    colored: { minHeight: 220, justifyContent: 'center', alignItems: 'center', padding: 24 },
    coloredText: { color: '#fff', fontSize: 24, lineHeight: 31, textAlign: 'center', fontWeight: '900' },
    description: { marginTop: 12, fontSize: 14, lineHeight: 21, color: c.textPrimary },
    metaRow: { flexDirection: 'row', gap: 20, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.borderDefault },
    meta: { fontSize: 12, fontWeight: '800', color: c.textSecondary },
    commentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    commentInput: { flex: 1, color: c.textPrimary, backgroundColor: c.surfacePrimary, borderRadius: r.xl, paddingHorizontal: 12, paddingVertical: 9 },
  }));

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const response = await getJson('/api/feed?limit=20');
      setItems(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      Alert.alert('Feed unavailable', error.message || "Couldn't load your feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const openImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setPostType('image');
    }
  };

  const createPost = async () => {
    if (!content.trim() || (postType === 'image' && !selectedImage)) return;
    setPosting(true);
    try {
      if (editingPost) {
        await putJson(`/api/feed/posts/${editingPost.id}`, {
          content,
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
          backgroundPreset: postType === 'colored' ? backgroundPreset : undefined,
          imageUrl: image?.url || image?.secure_url,
          cloudinaryPublicId: image?.publicId || image?.public_id,
        });
      }
      setContent('');
      setSelectedImage(null);
      setPostType('text');
      setEditingPost(null);
      setComposerOpen(false);
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
    setSelectedImage(item.type === 'image' ? { uri: item.imageUrl } : null);
    setComposerOpen(true);
  };

  const handlePostMenu = (item) => {
    const ownPost = item.authorId === user?.uid;
    const actions = ownPost
      ? [
        { text: 'Edit', onPress: () => beginEdit(item) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
        { text: 'Cancel', style: 'cancel' },
      ]
      : [
        { text: 'Report', onPress: () => postJson(`/api/feed/posts/${item.id}/report`, { reportType: 'Inappropriate content' }) },
        { text: 'Cancel', style: 'cancel' },
      ];
    Alert.alert(ownPost ? 'Manage post' : 'Post options', undefined, actions);
  };

  const recordView = useCallback((item) => {
    if (!item?.id || viewedPosts.current.has(item.id)) return;
    viewedPosts.current.add(item.id);
    postJson(`/api/feed/posts/${item.id}/view`, {}).catch(() => {
      viewedPosts.current.delete(item.id);
    });
  }, []);

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

  const presetColors = { indigo: '#4F46E5', violet: '#7C3AED', blue: '#0284C7', green: '#15803D', orange: '#EA580C', pink: '#DB2777', red: '#DC2626', dark: '#111827' };

  const renderPost = ({ item }) => {
    return <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.postHeader}>
          {item.authorAvatar ? <Image source={{ uri: item.authorAvatar }} style={styles.avatar} /> : <View style={styles.avatar} />}
          <View style={{ flex: 1 }}><Text style={styles.author}>{item.authorName || 'UniHelp student'}</Text><Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text></View>
          <Pressable style={styles.menu} onPress={() => handlePostMenu(item)}><Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} /></Pressable>
        </View>
      </View>
      {item.type === 'colored' ? <View style={[styles.colored, { backgroundColor: presetColors[item.backgroundPreset] || presetColors.indigo }]}><Text style={styles.coloredText}>{item.content}</Text></View> : null}
      {item.type === 'image' && item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" /> : null}
      <View style={styles.body}>{item.type !== 'colored' && item.content ? <Text style={styles.description}>{item.content}</Text> : null}<View style={styles.metaRow}><Pressable onPress={() => postJson(`/api/feed/posts/${item.id}/like`, {}).then(() => loadFeed(true))}><Text style={styles.meta}>♡ {item.likesCount || 0}</Text></Pressable><Pressable onPress={() => setCommentingId(commentingId === item.id ? null : item.id)}><Text style={styles.meta}>💬 {item.commentsCount || 0}</Text></Pressable><Text style={styles.meta}>◉ {item.viewsCount || 0}</Text></View>{commentingId === item.id ? <View style={styles.commentRow}><TextInput value={commentText} onChangeText={setCommentText} placeholder="Write a comment" placeholderTextColor={colors.placeholder} style={styles.commentInput} /><Pressable onPress={() => addComment(item)}><Ionicons name="send" size={20} color={colors.brand} /></Pressable></View> : null}</View>
    </View>;
  };

  return (
    <ScreenShell title="Feed" subtitle="What is happening with your friends." showBack loading={loading}>
      <View style={styles.hero}>
          <Ionicons name="people-outline" size={22} color={colors.onBrand} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>UniHelp Feed</Text>
          <Text style={styles.heroText}>Share what is happening with friends around campus.</Text>
        </View>
      </View>
      <View style={styles.composer}><View style={styles.composerRow}>{profile?.photo ? <Image source={{ uri: profile.photo }} style={styles.avatar} /> : <View style={styles.avatar} />}<Pressable style={{ flex: 1 }} onPress={() => setComposerOpen(true)}><Text style={styles.composerInput}>{editingPost ? 'Editing your post' : 'What&apos;s on your mind?'}</Text></Pressable></View>{composerOpen ? <><TextInput value={content} onChangeText={setContent} placeholder="Share something with your friends" placeholderTextColor={colors.placeholder} multiline autoFocus style={[styles.composerInput, { marginTop: 12, minHeight: 90, textAlignVertical: 'top' }]} /><View style={styles.composerActions}>{!editingPost ? <Pressable style={styles.action} onPress={openImagePicker}><Ionicons name="image-outline" size={18} color={colors.brandText} /><Text style={styles.actionText}>Photo</Text></Pressable> : null}<Pressable style={styles.action} onPress={() => setPostType('colored')}><Ionicons name="color-palette-outline" size={18} color={colors.brandText} /><Text style={styles.actionText}>Background</Text></Pressable><Pressable style={[styles.action, { marginLeft: 'auto', backgroundColor: colors.brand }]} disabled={posting} onPress={createPost}><Text style={[styles.actionText, { color: colors.onBrand }]}>{posting ? 'Saving...' : editingPost ? 'Save' : 'Post'}</Text></Pressable></View>{postType === 'colored' ? <View style={styles.presetRow}>{Object.entries(presetColors).map(([name, color]) => <Pressable key={name} onPress={() => setBackgroundPreset(name)} style={[styles.preset, { backgroundColor: color }, backgroundPreset === name && styles.selectedPreset]} />)}</View> : null}{selectedImage ? <Text style={styles.time}>Photo selected</Text> : null}</> : null}</View>
      <FlatList data={items} keyExtractor={(item) => item.id} renderItem={renderPost} onViewableItemsChanged={({ viewableItems }) => viewableItems.forEach(({ item }) => recordView(item))} viewabilityConfig={{ itemVisiblePercentThreshold: 60 }} refreshing={refreshing} onRefresh={() => loadFeed(true)} ListEmptyComponent={!loading ? <EmptyState title="Your feed is quiet" description="Add friends and start sharing what is happening around campus." /> : null} contentContainerStyle={{ paddingBottom: 30 }} />
    </ScreenShell>
  );
}
