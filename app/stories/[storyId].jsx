import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Text, View, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { fetchRecord, toggleStoryLike, addStoryComment, fetchStoryComments, incrementStoryView } from '../../services/firestoreSync';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';
import { useAuth } from '../../context/AuthContext';

const WPM = 200;

export default function StoryDetails() {
  const { storyId } = useLocalSearchParams();
  const router = useRouter();
  const { profile, user } = useAuth();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeToggling, setLikeToggling] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRecord(COLLECTIONS.stories, storyId)
      .then((data) => {
        setStory(data);
        setLikeCount(data?.likes || 0);
        // Check if current user liked it
        const likedBy = data?.likedBy || {};
        setLiked(!!(user?.uid && likedBy[user.uid]));
        // Increment view count
        incrementStoryView(storyId).catch(() => {});
        // Load comments
        setCommentsLoading(true);
        fetchStoryComments(storyId)
          .then(setComments)
          .catch(() => {})
          .finally(() => setCommentsLoading(false));
      })
      .catch((err) => setError(err?.message || 'Unable to load this story.'))
      .finally(() => setLoading(false));
  }, [storyId, user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const { wordCount, readingTime } = useMemo(() => {
    const text = story?.content?.trim() || '';
    const words = text ? text.split(/\s+/).length : 0;
    return { wordCount: words, readingTime: Math.max(1, Math.round(words / WPM)) };
  }, [story]);

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please log in to like stories.');
      return;
    }
    if (likeToggling) return;
    setLikeToggling(true);
    try {
      const result = await toggleStoryLike(storyId);
      setLiked(result.liked);
      setLikeCount(result.likes);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Unable to update like.');
    } finally {
      setLikeToggling(false);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please log in to comment.');
      return;
    }
    if (!commentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      await addStoryComment(storyId, commentText.trim());
      setCommentText('');
      const updated = await fetchStoryComments(storyId);
      setComments(updated);
      setStory((prev) => prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : prev);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Unable to add comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: story?.title || 'Check out this story on Unihelp!',
        url: `https://unihelp.app/stories/${storyId}`,
      });
    } catch {
      // user cancelled
    }
  };

  const genre = story?.genre || story?.category || null;
  const author = story?.authorName || story?.author || 'Unknown author';
  const status = (story?.status || 'published').toLowerCase();
  const coverUrl = story?.coverImage || story?.coverUrl || null;

  return (
    <ScreenShell title="Story" subtitle={story?.title || 'Story details'} showBack loading={loading}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : story ? (
        <View>
          {/* Cover Image */}
          {coverUrl ? (
            <View style={styles.coverContainer}>
              <Image source={{ uri: coverUrl }} style={styles.coverImage} contentFit="cover" />
            </View>
          ) : null}

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.metaRow}>
              {genre ? (
                <View style={styles.genrePill}>
                  <Text style={styles.genrePillText}>{genre}</Text>
                </View>
              ) : null}
              <StatusBadge status={status} />
            </View>

            <Text style={styles.title}>{story.title || 'Untitled story'}</Text>

            <View style={styles.bylineRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{author.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.bylineTextGroup}>
                <Text style={styles.author}>{author}</Text>
                <Text style={styles.readingMeta}>
                  {wordCount > 0 ? `${readingTime} min read · ${wordCount} words` : 'No content yet'}
                </Text>
              </View>
            </View>

            {story.summary || story.description ? (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{story.summary || story.description}</Text>
              </View>
            ) : null}

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={16} color="#64748B" />
                <Text style={styles.statText}>{story.views || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={16} color="#64748B" />
                <Text style={styles.statText}>{likeCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="chatbubble-outline" size={16} color="#64748B" />
                <Text style={styles.statText}>{story.commentCount || 0}</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleLike}
                disabled={likeToggling}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed, liked && styles.actionButtonActive]}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={18}
                  color={liked ? '#E11D48' : '#64748B'}
                />
                <Text style={[styles.actionButtonText, liked && styles.actionButtonTextActive]}>
                  {liked ? 'Liked' : 'Like'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              >
                <Ionicons name="share-outline" size={18} color="#64748B" />
                <Text style={styles.actionButtonText}>Share</Text>
              </Pressable>
            </View>
          </View>

          {/* Story content */}
          <View style={styles.contentCard}>
            {story.content?.trim() ? (
              <StoryBody content={story.content} />
            ) : (
              <View style={styles.emptyContent}>
                <Text style={styles.emptyContentTitle}>No story content yet</Text>
                <Text style={styles.emptyContentText}>
                  This story doesn&apos;t have a body yet — only a summary.
                </Text>
              </View>
            )}
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>
              Comments {story.commentCount > 0 ? `(${story.commentCount})` : ''}
            </Text>

            {user ? (
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  placeholderTextColor="#94A3B8"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <Pressable
                  onPress={handleAddComment}
                  disabled={!commentText.trim() || commentSubmitting}
                  style={({ pressed }) => [
                    styles.commentSubmitButton,
                    (!commentText.trim() || commentSubmitting) && styles.commentSubmitDisabled,
                    pressed && styles.commentSubmitPressed,
                  ]}
                >
                  {commentSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.loginPrompt}
                onPress={() => router.push('/(auth)/login')}
              >
                <Text style={styles.loginPromptText}>Log in to leave a comment</Text>
              </Pressable>
            )}

            {commentsLoading ? (
              <ActivityIndicator size="small" color="#4F46E5" style={{ marginTop: 16 }} />
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <Text style={styles.noCommentsText}>No comments yet. Be the first to share your thoughts!</Text>
              </View>
            ) : (
              <View style={styles.commentsList}>
                {comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {(comment.authorName || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentBody}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{comment.authorName || 'Anonymous'}</Text>
                        <Text style={styles.commentTime}>
                          {comment.createdAt?.toDate ? formatRelativeTime(comment.createdAt.toDate()) : ''}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      ) : (
        <NotFoundState />
      )}
      </ScrollView>
    </ScreenShell>
  );
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/* ---------- Status badge ---------- */

function StatusBadge({ status }) {
  const config =
    status === 'draft'
      ? { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', label: 'Draft' }
      : status === 'archived'
      ? { bg: '#F1F5F9', border: '#E2E8F0', text: '#475569', label: 'Archived' }
      : { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', label: 'Published' };

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <View style={[styles.statusDot, { backgroundColor: config.text }]} />
      <Text style={[styles.statusBadgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

/* ---------- Story body renderer (lightweight markdown) ---------- */

function StoryBody({ content }) {
  const blocks = useMemo(() => parseStoryContent(content), [content]);
  return (
    <View>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <Text key={i} style={styles.bodyHeading}>
                {block.text}
              </Text>
            );
          case 'quote':
            return (
              <View key={i} style={styles.blockquote}>
                <Text style={styles.blockquoteText}>{renderInline(block.text)}</Text>
              </View>
            );
          case 'bullet':
            return (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{renderInline(block.text)}</Text>
              </View>
            );
          case 'scene-break':
            return (
              <View key={i} style={styles.sceneBreak}>
                <Text style={styles.sceneBreakText}>· · ·</Text>
              </View>
            );
          case 'paragraph':
          default:
            return (
              <Text key={i} style={styles.paragraph}>
                {renderInline(block.text)}
              </Text>
            );
        }
      })}
    </View>
  );
}

function parseStoryContent(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let buffer = [];

  const flush = () => {
    if (buffer.length) {
      blocks.push({ type: 'paragraph', text: buffer.join(' ') });
      buffer = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flush();
      return;
    }
    if (line === '***' || line === '* * *') {
      flush();
      blocks.push({ type: 'scene-break' });
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ type: 'heading', text: line.slice(3) });
    } else if (line.startsWith('- ')) {
      flush();
      blocks.push({ type: 'bullet', text: line.slice(2) });
    } else if (line.startsWith('> ')) {
      flush();
      blocks.push({ type: 'quote', text: line.slice(2) });
    } else {
      buffer.push(line);
    }
  });
  flush();
  return blocks;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return (
        <Text key={i} style={styles.italic}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part;
  });
}

/* ---------- Empty / error states ---------- */

function NotFoundState() {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateEmoji}>📖</Text>
      <Text style={styles.stateTitle}>Story not found</Text>
      <Text style={styles.stateText}>This story may have been removed or isn&apos;t available yet.</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateEmoji}>⚠️</Text>
      <Text style={styles.stateTitle}>Couldn&apos;t load story</Text>
      <Text style={styles.stateText}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  coverContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
    height: 200,
    backgroundColor: '#F1F5F9',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  genrePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  genrePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 32,
    marginBottom: 14,
  },
  bylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bylineTextGroup: {
    flex: 1,
  },
  author: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  readingMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  summaryBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#C7D2FE',
    paddingLeft: 12,
    paddingVertical: 2,
  },
  summaryText: {
    fontSize: 15,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#1E293B',
    marginBottom: 16,
  },
  bodyHeading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '800',
  },
  italic: {
    fontStyle: 'italic',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 4,
  },
  bulletDot: {
    color: '#4F46E5',
    fontSize: 16,
    marginRight: 8,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#1E293B',
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
    paddingLeft: 14,
    marginBottom: 16,
  },
  blockquoteText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
    fontStyle: 'italic',
  },
  sceneBreak: {
    alignItems: 'center',
    marginVertical: 18,
  },
  sceneBreakText: {
    color: '#CBD5E1',
    fontSize: 14,
    letterSpacing: 4,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyContentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyContentText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
  },
  stateEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  stateText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  actionButtonPressed: {
    backgroundColor: '#F8FAFC',
  },
  actionButtonActive: {
    borderColor: '#FDAFB9',
    backgroundColor: '#FFF1F2',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  actionButtonTextActive: {
    color: '#E11D48',
  },
  commentsSection: {
    marginTop: 8,
  },
  commentsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
  },
  commentSubmitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSubmitPressed: {
    backgroundColor: '#4338CA',
  },
  commentSubmitDisabled: {
    opacity: 0.5,
  },
  loginPrompt: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  loginPromptText: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '700',
  },
  noComments: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  commentTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  commentText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
});