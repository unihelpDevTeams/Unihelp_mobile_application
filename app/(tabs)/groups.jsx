import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fetchGroups, fetchUserGroups } from '../../services/firestoreSync';
import { joinPublicGroup, requestJoinGroup } from '../../src/shared/services/community';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { shadows } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { buildShareUrl, shareContent } from '../../utils/share';
import { useAuth } from '../../context/AuthContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateNext = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
const JOIN_ERROR_AUTO_DISMISS_MS = 4000;
const SHARE_MESSAGE_AUTO_DISMISS_MS = 2600;

const getMembershipRole = (group = {}, user, userGroupsById = {}) => {
  const uid = user?.uid || user?.id;
  if (!uid) return null;
  if (userGroupsById[group.id]?.role) return userGroupsById[group.id].role;
  const adminIds = [group.adminId, group.ownerId, group.createdBy, group.creatorId, ...(Array.isArray(group.adminIds) ? group.adminIds : [])].filter(Boolean);
  if (adminIds.includes(uid)) return 'admin';
  const memberList = [group.members, group.memberIds, group.memberUids, group.memberList].find((list) => Array.isArray(list));
  if (memberList?.includes(uid)) return 'member';
  return null;
};

const groupTitle = (group) => group?.name || group?.title || 'Untitled group';
const groupDescription = (group) => group?.description || group?.summary || 'No description yet.';
const normalize = (value = '') => String(value).trim().toLowerCase();

const pickImage = (group = {}) => {
  const candidates = [group.avatarUrl, group.photoURL, group.coverUrl, group.imageUrl, group.avatar, group.cover];
  return candidates.find((item) => typeof item === 'string' && item.trim()) || null;
};

export default function Groups() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [groups, setGroups] = useState([]);
  const [userGroupsById, setUserGroupsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [joiningId, setJoiningId] = useState(null);
  const [joinStates, setJoinStates] = useState({});
  const [joinError, setJoinError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const joinErrorTimer = useRef(null);
  const shareTimer = useRef(null);

  const styles = useThemeStyles((c, s, r) => ({
    errorScreen: { flex: 1, padding: s.lg, justifyContent: 'center', backgroundColor: c.background },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.redLight, borderRadius: r.xl, padding: s.lg, borderWidth: 1, borderColor: c.redBorder },
    errorText: { flex: 1, color: c.red, fontSize: 13, fontWeight: '700' },
    retryButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.red, borderRadius: r.md, paddingHorizontal: s.sm, paddingVertical: 7 },
    retryButtonPressed: { opacity: 0.85 },
    retryText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },
    noticeBox: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, borderRadius: r.lg,
      padding: s.md, marginBottom: s.md, borderWidth: 1,
    },
    noticeError: { backgroundColor: c.redLight, borderColor: c.redBorder },
    noticeSuccess: { backgroundColor: c.greenLight, borderColor: c.green },
    noticeText: { flex: 1, fontSize: 12.5, fontWeight: '700' },
    hero: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl,
      padding: s.lg, gap: s.md, marginBottom: s.lg,
    },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: s.md },
    heroTitle: { flex: 1, color: c.textPrimary, fontSize: 20, fontWeight: '900', lineHeight: 25 },
    heroSubtitle: { color: c.textSecondary, fontSize: 13, lineHeight: 19 },
    createButton: {
      width: 42, height: 42, borderRadius: r.lg, backgroundColor: c.brand,
      alignItems: 'center', justifyContent: 'center',
    },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.inputBackground,
      borderWidth: 1, borderColor: c.inputBorder, borderRadius: r.lg, paddingHorizontal: s.md,
    },
    searchInput: { flex: 1, color: c.textPrimary, fontSize: 14, paddingVertical: s.md },
    clearButton: { padding: s.xs },
    statsRow: { flexDirection: 'row', gap: s.sm },
    statPill: {
      flex: 1, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: r.lg, padding: s.md,
    },
    statValue: { color: c.textPrimary, fontSize: 17, fontWeight: '900' },
    statLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 2 },
    chips: { paddingBottom: s.sm, gap: s.sm },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: s.md, paddingVertical: 9,
      borderRadius: r.full, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault,
      marginRight: s.sm,
    },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { color: c.textPrimary, fontSize: 12, fontWeight: '800' },
    chipTextActive: { color: c.onBrand },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md },
    sectionTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    resultCount: { color: c.textTertiary, fontSize: 12, fontWeight: '700' },
    card: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl,
      padding: s.md, marginBottom: s.md, gap: s.md,
    },
    cardPressed: { transform: [{ scale: 0.99 }] },
    cardTop: { flexDirection: 'row', gap: s.md },
    avatar: { width: 58, height: 58, borderRadius: r.lg, overflow: 'hidden', backgroundColor: c.brandLight },
    avatarImage: { width: '100%', height: '100%' },
    avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
    avatarFallbackText: { color: c.onBrand, fontSize: 21, fontWeight: '900' },
    cardBody: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    cardTitle: { flex: 1, color: c.textPrimary, fontSize: 15.5, fontWeight: '900' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: r.full },
    joinedBadge: { backgroundColor: c.greenLight },
    privateBadge: { backgroundColor: c.amberLight },
    badgeText: { fontSize: 10.5, fontWeight: '900' },
    cardDescription: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: c.textTertiary, fontSize: 11.5, fontWeight: '700' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    actionButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      minHeight: 40, borderRadius: r.lg, paddingHorizontal: s.md, borderWidth: 1,
    },
    actionPrimary: { flex: 1, backgroundColor: c.brand, borderColor: c.brand },
    actionSecondary: { backgroundColor: c.surfaceSecondary, borderColor: c.borderDefault },
    actionJoined: { flex: 1, backgroundColor: c.greenLight, borderColor: c.green },
    actionRequested: { flex: 1, backgroundColor: c.amberLight, borderColor: c.amber },
    actionText: { fontSize: 12.5, fontWeight: '900' },
    actionPrimaryText: { color: c.onBrand },
    actionSecondaryText: { color: c.textPrimary },
    actionJoinedText: { color: c.green },
    actionRequestedText: { color: c.amber },
  }));

  const categories = useMemo(() => {
    const values = groups.map((group) => group.category).filter(Boolean);
    return ['All', ...Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b)))];
  }, [groups]);

  const groupStats = useMemo(() => {
    const joined = groups.filter((group) => Boolean(getMembershipRole(group, user, userGroupsById) || joinStates[group.id] === 'joined')).length;
    const open = groups.filter((group) => group.privacy !== 'private').length;
    return { joined, open };
  }, [groups, joinStates, user, userGroupsById]);

  const filteredGroups = useMemo(() => {
    const search = normalize(query);
    return groups.filter((group) => {
      const role = getMembershipRole(group, user, userGroupsById);
      const isJoined = Boolean(role || joinStates[group.id] === 'joined');
      const isRequested = joinStates[group.id] === 'requested';
      const isPrivate = group.privacy === 'private';
      const text = normalize(`${groupTitle(group)} ${groupDescription(group)} ${group.category || ''}`);

      if (search && !text.includes(search)) return false;
      if (categoryFilter !== 'All' && group.category !== categoryFilter) return false;
      if (membershipFilter === 'joined' && !isJoined) return false;
      if (membershipFilter === 'available' && (isJoined || isRequested)) return false;
      if (membershipFilter === 'private' && !isPrivate) return false;
      return true;
    });
  }, [categoryFilter, groups, joinStates, membershipFilter, query, user, userGroupsById]);

  useEffect(() => () => {
    clearTimeout(joinErrorTimer.current);
    clearTimeout(shareTimer.current);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const currentReloadKey = reloadKey;
      if (currentReloadKey < 0) return undefined;
      setLoading(true);
      setError('');
      Promise.all([fetchGroups(), user?.uid ? fetchUserGroups(user.uid) : Promise.resolve([])])
        .then(([items, memberships]) => {
          if (!active) return;
          setGroups(Array.isArray(items) ? items : []);
          setUserGroupsById(
            (Array.isArray(memberships) ? memberships : []).reduce((acc, item) => {
              const id = item.groupId || item.id;
              if (id) acc[id] = item;
              return acc;
            }, {})
          );
        })
        .catch((fetchError) => {
          if (active) {
            animateNext();
            setError(fetchError?.message || 'Could not load groups. Try again.');
          }
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [reloadKey, user?.uid])
  );

  const showTimedMessage = (setter, timerRef, value, ms) => {
    clearTimeout(timerRef.current);
    animateNext();
    setter(value);
    timerRef.current = setTimeout(() => { animateNext(); setter(''); }, ms);
  };

  const handleJoin = async (group) => {
    if (!user) { router.push('/login'); return; }
    const role = getMembershipRole(group, user, userGroupsById);
    if (role || joinStates[group.id] === 'joined' || joinStates[group.id] === 'requested') return;
    clearTimeout(joinErrorTimer.current);
    animateNext();
    setJoinError('');
    setJoiningId(group.id);
    try {
      if (group.privacy === 'private' && group.requireApproval !== false) {
        await requestJoinGroup(group, user, profile || {});
        animateNext();
        setJoinStates((prev) => ({ ...prev, [group.id]: 'requested' }));
      } else {
        await joinPublicGroup(group, user, profile || {});
        animateNext();
        setJoinStates((prev) => ({ ...prev, [group.id]: 'joined' }));
        setUserGroupsById((prev) => ({ ...prev, [group.id]: { groupId: group.id, name: groupTitle(group), role: 'member' } }));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showTimedMessage(setJoinError, joinErrorTimer, err?.message || 'Could not join that group. Try again.', JOIN_ERROR_AUTO_DISMISS_MS);
    } finally {
      setJoiningId(null);
    }
  };

  const handleShare = async (group) => {
    const url = buildShareUrl(`/community/${group.id}`);
    const result = await shareContent({
      title: groupTitle(group),
      text: `Join ${groupTitle(group)} on Unihelp.`,
      url,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showTimedMessage(
      setShareMessage,
      shareTimer,
      result === 'shared' ? 'Group link ready to share.' : 'Group link copied to clipboard.',
      SHARE_MESSAGE_AUTO_DISMISS_MS
    );
  };

  if (error) {
    return (
      <View style={styles.errorScreen}>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setReloadKey((key) => key + 1); }}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
            <Ionicons name="refresh" size={14} color={colors.onBrand} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScreenShell title="Study Groups" subtitle="Find, join, and share campus communities." showBack loading={loading}>
      {joinError ? (
        <Notice icon="alert-circle-outline" color={colors.red} textColor={colors.red} text={joinError} styles={styles} variant="error" onClose={() => setJoinError('')} />
      ) : null}
      {shareMessage ? (
        <Notice icon="checkmark-circle-outline" color={colors.green} textColor={colors.green} text={shareMessage} styles={styles} variant="success" onClose={() => setShareMessage('')} />
      ) : null}

      <View style={[styles.hero, shadows.sm]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Discover useful study groups faster.</Text>
            <Text style={styles.heroSubtitle}>Filter by course focus, see what you have already joined, and invite classmates with one tap.</Text>
          </View>
          <Pressable style={styles.createButton} onPress={() => router.push('/create')} accessibilityLabel="Create group">
            <Ionicons name="add" size={24} color={colors.onBrand} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search groups, topics, categories"
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query ? (
            <Pressable style={styles.clearButton} onPress={() => setQuery('')} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color={colors.iconSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{groups.length}</Text>
            <Text style={styles.statLabel}>Total groups</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{groupStats.joined}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{groupStats.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[
          { key: 'all', label: 'All groups', icon: 'albums-outline' },
          { key: 'joined', label: 'Joined', icon: 'checkmark-circle-outline' },
          { key: 'available', label: 'Available', icon: 'person-add-outline' },
          { key: 'private', label: 'Private', icon: 'lock-closed-outline' },
        ].map((item) => (
          <FilterChip key={item.key} item={item} active={membershipFilter === item.key} onPress={() => setMembershipFilter(item.key)} styles={styles} colors={colors} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categories.map((category) => (
          <FilterChip
            key={category}
            item={{ key: category, label: category, icon: category === 'All' ? 'grid-outline' : 'pricetag-outline' }}
            active={categoryFilter === category}
            onPress={() => setCategoryFilter(category)}
            styles={styles}
            colors={colors}
          />
        ))}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Groups</Text>
        <Text style={styles.resultCount}>{filteredGroups.length} result{filteredGroups.length === 1 ? '' : 's'}</Text>
      </View>

      {filteredGroups.length ? (
        filteredGroups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            role={getMembershipRole(group, user, userGroupsById)}
            joinState={joinStates[group.id]}
            joining={joiningId === group.id}
            onOpen={() => router.push(`/community/${group.id}`)}
            onJoin={() => handleJoin(group)}
            onShare={() => handleShare(group)}
            styles={styles}
            colors={colors}
          />
        ))
      ) : (
        <EmptyState
          title={groups.length ? 'No groups match those filters' : 'No groups yet'}
          description={groups.length ? 'Try a different search, category, or membership filter.' : 'Groups created on the website will appear here.'}
        />
      )}
    </ScreenShell>
  );
}

function Notice({ icon, color, textColor, text, styles, variant, onClose }) {
  return (
    <View style={[styles.noticeBox, variant === 'success' ? styles.noticeSuccess : styles.noticeError]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.noticeText, { color: textColor }]}>{text}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <Ionicons name="close" size={15} color={color} />
      </Pressable>
    </View>
  );
}

function FilterChip({ item, active, onPress, styles, colors }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.82 }]}>
      <Ionicons name={item.icon} size={14} color={active ? colors.onBrand : colors.brand} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
    </Pressable>
  );
}

function GroupCard({ group, role, joinState, joining, onOpen, onJoin, onShare, styles, colors }) {
  const title = groupTitle(group);
  const isJoined = Boolean(role || joinState === 'joined');
  const isRequested = joinState === 'requested';
  const isPrivate = group.privacy === 'private';
  const imageUrl = pickImage(group);
  const safeImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : imageUrl || '';
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setImageFailed(false);
  }, [safeImageUrl]);
  const showImage = Boolean(safeImageUrl) && !imageFailed;
  const memberCount = Number(group.memberCount || group.members?.length || 0);
  const joinLabel = isPrivate ? 'Request access' : 'Join group';

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, shadows.sm, pressed && styles.cardPressed]}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          {showImage ? (
            <Image source={{ uri: safeImageUrl }} style={styles.avatarImage} contentFit="cover" cachePolicy="disk" onError={() => setImageFailed(true)} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            {isJoined ? (
              <View style={[styles.badge, styles.joinedBadge]}>
                <Ionicons name="checkmark" size={11} color={colors.green} />
                <Text style={[styles.badgeText, { color: colors.green }]}>{role === 'owner' || role === 'admin' ? 'Admin' : 'Joined'}</Text>
              </View>
            ) : isPrivate ? (
              <View style={[styles.badge, styles.privateBadge]}>
                <Ionicons name="lock-closed" size={10} color={colors.amber} />
                <Text style={[styles.badgeText, { color: colors.amber }]}>Private</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardDescription} numberOfLines={2}>{groupDescription(group)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Meta icon="people-outline" text={`${memberCount || 0} member${memberCount === 1 ? '' : 's'}`} styles={styles} colors={colors} />
        {group.category ? <Meta icon="pricetag-outline" text={group.category} styles={styles} colors={colors} /> : null}
        <Meta icon={isPrivate ? 'lock-closed-outline' : 'globe-outline'} text={isPrivate ? 'Approval required' : 'Public'} styles={styles} colors={colors} />
      </View>

      <View style={styles.actions}>
        <Pressable onPress={(event) => { event.stopPropagation(); onShare(); }} style={({ pressed }) => [styles.actionButton, styles.actionSecondary, pressed && { opacity: 0.82 }]}>
          <Ionicons name="share-social-outline" size={16} color={colors.textPrimary} />
          <Text style={[styles.actionText, styles.actionSecondaryText]}>Share</Text>
        </Pressable>

        {isJoined ? (
          <Pressable onPress={(event) => { event.stopPropagation(); onOpen(); }} style={({ pressed }) => [styles.actionButton, styles.actionJoined, pressed && { opacity: 0.82 }]}>
            <Ionicons name="chatbubbles-outline" size={16} color={colors.green} />
            <Text style={[styles.actionText, styles.actionJoinedText]}>Open group</Text>
          </Pressable>
        ) : isRequested ? (
          <View style={[styles.actionButton, styles.actionRequested]}>
            <Ionicons name="time-outline" size={16} color={colors.amber} />
            <Text style={[styles.actionText, styles.actionRequestedText]}>Requested</Text>
          </View>
        ) : (
          <Pressable disabled={joining} onPress={(event) => { event.stopPropagation(); onJoin(); }} style={({ pressed }) => [styles.actionButton, styles.actionPrimary, joining && { opacity: 0.7 }, pressed && !joining && { opacity: 0.88 }]}>
            {joining ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="person-add-outline" size={16} color={colors.onBrand} />}
            <Text style={[styles.actionText, styles.actionPrimaryText]}>{joinLabel}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function Meta({ icon, text, styles, colors }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={colors.iconSecondary} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}
