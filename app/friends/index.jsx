import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import {
  acceptFriendRequest,
  acceptMessageRequest,
  cancelFriendRequest,
  createOrOpenFriendConversation,
  declineFriendRequest,
  declineMessageRequest,
  listenBlockedUsers,
  listenFriends,
  listenIncomingFriendRequests,
  listenIncomingMessageRequests,
  listenOutgoingFriendRequests,
  listSuggestedFriends,
  sendFriendRequest,
  unblockStudent,
} from '../../src/shared/services/friendships';

const TABS = [
  { key: 'friends', label: 'Friends', icon: 'people-outline' },
  { key: 'requests', label: 'Requests', icon: 'person-add-outline' },
  { key: 'sent', label: 'Sent', icon: 'paper-plane-outline' },
  { key: 'suggested', label: 'Suggested', icon: 'sparkles-outline' },
  { key: 'blocked', label: 'Blocked', icon: 'ban-outline' },
];

const nameOf = (person = {}) => person.name || person.username || person.email || 'Student';
const schoolLine = (person = {}) => [person.university || person.school, person.department, person.level].filter(Boolean).join(' • ');

function Avatar({ person, size = 50 }) {
  const name = nameOf(person);
  const uri = person.avatar || person.photo || person.photoURL || '';
  return uri ? (
    <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: Math.round(size / 3) }]} />
  ) : (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: Math.round(size / 3) }]}>
      <Text style={styles.avatarInitial}>{name[0]?.toUpperCase() || 'S'}</Text>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.cardBody}>
        <View style={styles.skeletonLineWide} />
        <View style={styles.skeletonLine} />
      </View>
    </View>
  );
}

function StudentCard({ person, subtitle, children, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && onPress && styles.cardPressed]} onPress={onPress} disabled={!onPress}>
      <Avatar person={person} />
      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{nameOf(person)}</Text>
          {person.online ? <View style={styles.onlineDot} /> : null}
        </View>
        <Text style={styles.cardSubtitle} numberOfLines={2}>{subtitle || schoolLine(person) || 'UniHelp student'}</Text>
        {children ? <View style={styles.actionRow}>{children}</View> : null}
      </View>
    </Pressable>
  );
}

function ActionButton({ label, icon, variant = 'primary', loading, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionButton, styles[`${variant}Button`], pressed && styles.actionButtonPressed]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator size="small" color={variant === 'primary' ? colors.surface : colors.brand} /> : <Ionicons name={icon} size={14} color={variant === 'primary' ? colors.surface : colors.brand} />}
      <Text style={[styles.actionText, variant !== 'primary' && styles.secondaryActionText]}>{label}</Text>
    </Pressable>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid || profile?.uid;
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [messageRequests, setMessageRequests] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');

  const refreshSuggested = useCallback(async () => {
    if (!uid) return;
    const rows = await listSuggestedFriends({ uid, profile, pageSize: 24 });
    setSuggested(rows);
  }, [profile, uid]);

  useEffect(() => {
    if (!uid) return undefined;
    setLoading(true);
    const unsubs = [
      listenFriends(uid, (rows) => setFriends(rows)),
      listenIncomingFriendRequests(uid, (rows) => setIncoming(rows)),
      listenOutgoingFriendRequests(uid, (rows) => setOutgoing(rows)),
      listenIncomingMessageRequests(uid, (rows) => setMessageRequests(rows)),
      listenBlockedUsers(uid, (rows) => setBlocked(rows)),
    ];
    refreshSuggested().finally(() => setLoading(false));
    return () => unsubs.forEach((unsubscribe) => unsubscribe?.());
  }, [refreshSuggested, uid]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSuggested();
    } finally {
      setRefreshing(false);
    }
  };

  const openMessage = async (person) => {
    if (!user || !uid || !person?.uid) return;
    setBusyId(person.uid);
    try {
      const conversationId = await createOrOpenFriendConversation({
        currentUser: user,
        otherUser: { id: person.uid, ...person },
        currentProfile: profile,
        otherProfile: person,
      });
      router.push(`/messages/${conversationId}`);
    } catch (error) {
      Alert.alert('Message unavailable', error.message || 'You need to be friends before messaging.');
    } finally {
      setBusyId('');
    }
  };

  const handleAction = async (id, task, success) => {
    setBusyId(id);
    try {
      await task();
      if (success) Alert.alert('Done', success);
    } catch (error) {
      Alert.alert('Something went wrong', error.message || 'Please try again.');
    } finally {
      setBusyId('');
    }
  };

  const rows = useMemo(() => {
    if (activeTab === 'friends') return friends;
    if (activeTab === 'requests') return [...incoming, ...messageRequests.map((item) => ({ ...item, requestType: 'message' }))];
    if (activeTab === 'sent') return outgoing;
    if (activeTab === 'suggested') return suggested;
    return blocked;
  }, [activeTab, blocked, friends, incoming, messageRequests, outgoing, suggested]);

  const renderItem = ({ item }) => {
    if (activeTab === 'friends') {
      const friendId = item.users?.find((id) => id !== uid);
      const person = item.profiles?.[friendId] || { uid: friendId };
      return (
        <StudentCard person={person} onPress={() => router.push(`/view-user-profile/${friendId}`)}>
          <ActionButton label="Message" icon="chatbubble-outline" loading={busyId === friendId} onPress={() => openMessage(person)} />
        </StudentCard>
      );
    }

    if (activeTab === 'requests' && item.requestType === 'message') {
      const person = item.fromProfile || { uid: item.from };
      return (
        <StudentCard person={person} subtitle={item.message}>
          <ActionButton label="Accept" icon="checkmark" loading={busyId === item.id} onPress={() => handleAction(item.id, async () => {
            const conversationId = await acceptMessageRequest({ request: item, currentUid: uid, currentProfile: profile });
            router.push(`/messages/${conversationId}`);
          })} />
          <ActionButton label="Decline" icon="close" variant="secondary" loading={busyId === item.id} onPress={() => handleAction(item.id, () => declineMessageRequest({ request: item, currentUid: uid, currentProfile: profile }))} />
        </StudentCard>
      );
    }

    if (activeTab === 'requests') {
      const person = item.fromProfile || { uid: item.from };
      return (
        <StudentCard person={person} onPress={() => router.push(`/view-user-profile/${item.from}`)}>
          <ActionButton label="Accept" icon="checkmark" loading={busyId === item.id} onPress={() => handleAction(item.id, () => acceptFriendRequest({ request: item, currentUid: uid, currentProfile: profile }))} />
          <ActionButton label="Decline" icon="close" variant="secondary" loading={busyId === item.id} onPress={() => handleAction(item.id, () => declineFriendRequest({ request: item, currentUid: uid, currentProfile: profile }))} />
        </StudentCard>
      );
    }

    if (activeTab === 'sent') {
      const person = item.toProfile || { uid: item.to };
      return (
        <StudentCard person={person} onPress={() => router.push(`/view-user-profile/${item.to}`)}>
          <ActionButton label="Cancel" icon="close-circle-outline" variant="secondary" loading={busyId === item.id} onPress={() => handleAction(item.id, () => cancelFriendRequest({ requestId: item.id, currentUid: uid }))} />
        </StudentCard>
      );
    }

    if (activeTab === 'suggested') {
      return (
        <StudentCard person={{ ...item, uid: item.id || item.uid }} subtitle={`${schoolLine(item) || 'Suggested student'}${item.score ? ` • ${item.score}% match` : ''}`} onPress={() => router.push(`/view-user-profile/${item.id || item.uid}`)}>
          <ActionButton label="Add" icon="person-add-outline" loading={busyId === item.id} onPress={() => handleAction(item.id, () => sendFriendRequest({
            currentUid: uid,
            targetUid: item.id || item.uid,
            currentProfile: profile,
            targetProfile: item,
          }), 'Friend request sent.')} />
        </StudentCard>
      );
    }

    const person = item.blockedProfile || { uid: item.blockedId, name: item.blockedId };
    return (
      <StudentCard person={person}>
        <ActionButton label="Unblock" icon="lock-open-outline" variant="secondary" loading={busyId === item.blockedId} onPress={() => handleAction(item.blockedId, () => unblockStudent({ currentUid: uid, targetUid: item.blockedId }))} />
      </StudentCard>
    );
  };

  const emptyCopy = {
    friends: ['No friends yet', 'Accepted friends will show up here with quick message access.'],
    requests: ['No pending requests', 'Incoming friend and message requests will appear here.'],
    sent: ['No sent requests', 'Pending requests you sent will appear here.'],
    suggested: ['No suggestions yet', 'Complete your university, department, level, and interests to improve suggestions.'],
    blocked: ['No blocked users', 'Students you block will appear here with an unblock option.'],
  }[activeTab];

  return (
    <ScreenShell title="Friends" subtitle="Trusted campus connections" showBack loading={loading} scrollable={false}>
      <Pressable style={styles.findButton} onPress={() => router.push('/find-friends')}>
        <View style={styles.findIcon}>
          <Ionicons name="search-outline" size={18} color={colors.brand} />
        </View>
        <View style={styles.findCopy}>
          <Text style={styles.findTitle}>Find friends</Text>
          <Text style={styles.findText}>Search classmates, tutors, and students near your department.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.greyLight} />
      </Pressable>

      <FlatList
        horizontal
        data={TABS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        renderItem={({ item }) => (
          <Pressable style={[styles.tab, activeTab === item.key && styles.tabActive]} onPress={() => setActiveTab(item.key)}>
            <Ionicons name={item.icon} size={15} color={activeTab === item.key ? colors.surface : colors.grey} />
            <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>{item.label}</Text>
          </Pressable>
        )}
      />

      {loading ? (
        <View>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id || item.uid || item.blockedId}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          contentContainerStyle={rows.length ? styles.listContent : styles.emptyContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState title={emptyCopy[0]} description={emptyCopy[1]} />}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  tabs: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  findIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findCopy: {
    flex: 1,
  },
  findTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  findText: {
    marginTop: 3,
    color: colors.grey,
    fontSize: 12,
    lineHeight: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  tabText: {
    color: colors.grey,
    fontWeight: '800',
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.surface,
  },
  listContent: {
    paddingBottom: spacing['3xl'],
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius['2xl'],
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardPressed: {
    backgroundColor: colors.canvasLight,
  },
  avatar: {
    backgroundColor: colors.brandLight,
  },
  avatarFallback: {
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.brandDark,
    fontWeight: '900',
    fontSize: 18,
  },
  cardBody: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: colors.ink,
    fontWeight: '900',
    fontSize: 15,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  cardSubtitle: {
    marginTop: 4,
    color: colors.grey,
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  secondaryButton: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brandBorder,
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  actionText: {
    color: colors.surface,
    fontWeight: '900',
    fontSize: 12,
  },
  secondaryActionText: {
    color: colors.brand,
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.skeleton,
  },
  skeletonLineWide: {
    width: '72%',
    height: 13,
    borderRadius: 8,
    backgroundColor: colors.skeleton,
    marginTop: 6,
  },
  skeletonLine: {
    width: '48%',
    height: 11,
    borderRadius: 8,
    backgroundColor: colors.skeletonLine,
    marginTop: 10,
  },
});
