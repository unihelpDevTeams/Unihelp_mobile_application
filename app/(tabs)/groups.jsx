import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { fetchGroupRecommendations, fetchUserGroups } from '../../services/firestoreSync';
import { joinPublicGroup, requestJoinGroup } from '../../src/shared/services/community';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { shadows } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { buildShareUrl, shareContent } from '../../utils/share';
import { useAuth } from '../../context/AuthContext';

/* -------------------------------------------------------------------------- */
/*  Setup + constants                                                         */
/* -------------------------------------------------------------------------- */

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch (_error) {
    // Layout animation is a nicety only.
  }
}

const animateNext = () => {
  try {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  } catch (_error) {
    // ignore
  }
};

// Haptics can reject on unsupported devices; never let that surface.
const haptic = {
  select: () => Haptics.selectionAsync().catch(() => {}),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};

const JOIN_ERROR_AUTO_DISMISS_MS = 4000;
const SHARE_MESSAGE_AUTO_DISMISS_MS = 2600;

const MEMBERSHIP_FILTERS = [
  { key: 'all', label: 'All', icon: 'albums-outline' },
  { key: 'joined', label: 'Joined', icon: 'checkmark-circle-outline' },
  { key: 'available', label: 'Available', icon: 'person-add-outline' },
  { key: 'private', label: 'Private', icon: 'lock-closed-outline' },
];

const SORT_OPTIONS = [
  { key: 'forYou', label: 'For you', icon: 'home' },
  { key: 'popular', label: 'Most members', icon: 'people-outline' },
  { key: 'newest', label: 'Newest', icon: 'time-outline' },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const getMembershipRole = (group = {}, user, userGroupsById = {}) => {
  const uid = user?.uid || user?.id;
  if (!uid) return null;
  if (userGroupsById[group.id]?.role) return userGroupsById[group.id].role;
  const adminIds = [
    group.adminId,
    group.ownerId,
    group.createdBy,
    group.creatorId,
    ...(Array.isArray(group.adminIds) ? group.adminIds : []),
  ].filter(Boolean);
  if (adminIds.includes(uid)) return 'admin';
  const memberList = [group.members, group.memberIds, group.memberUids, group.memberList].find((list) => Array.isArray(list));
  if (memberList?.includes(uid)) return 'member';
  return null;
};

const groupTitle = (group) => group?.name || group?.title || 'Untitled group';
const groupDescription = (group) => group?.description || group?.summary || '';
const normalize = (value = '') => String(value).trim().toLowerCase();
const getMemberCount = (group = {}) => Number(group.memberCount || group.members?.length || 0);
const pluralize = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const toTime = (value) => {
  if (!value) return 0;
  const raw = value?.toDate ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  const time = raw instanceof Date ? raw.getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
};

// Stable per-user jitter so the "For you" order feels personal but doesn't reshuffle on each render.
const personalizedGroupRandom = (uid, groupId) => {
  const value = `${uid || 'guest'}:${groupId}`;
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0) / 0xffffffff;
};

const pickImage = (group = {}) => {
  const candidates = [group.avatarUrl, group.photoURL, group.coverUrl, group.imageUrl, group.avatar, group.cover];
  const found = candidates.find((item) => typeof item === 'string' && item.trim());
  return found ? found.trim() : '';
};

// Single place that decides a group's state for the current user.
const getGroupState = (group, user, userGroupsById, joinStates) => {
  const role = getMembershipRole(group, user, userGroupsById);
  const joinState = joinStates[group.id];
  const isJoined = Boolean(role || joinState === 'joined');
  const isRequested = !isJoined && joinState === 'requested';
  const isPrivate = group.privacy === 'private';
  const needsApproval = isPrivate && group.requireApproval !== false;
  return { role, isJoined, isRequested, isPrivate, needsApproval };
};

const forYouScore = (entry, uid) =>
  Number(entry.group.friendMemberCount || 0) * 100 +
  Math.log1p(entry.memberCount) * 6 +
  personalizedGroupRandom(uid, entry.group.id) * 36;

const sorters = {
  forYou: (uid) => (a, b) => forYouScore(b, uid) - forYouScore(a, uid),
  popular: () => (a, b) => b.memberCount - a.memberCount,
  newest: () => (a, b) => toTime(b.group.createdAt) - toTime(a.group.createdAt),
};

/* -------------------------------------------------------------------------- */
/*  Screen                                                                    */
/* -------------------------------------------------------------------------- */

export default function Groups() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [groups, setGroups] = useState([]);
  const [userGroupsById, setUserGroupsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, setReloadKey] = useState(0);
  const [joiningId, setJoiningId] = useState(null);
  const [joinStates, setJoinStates] = useState({});
  const [joinError, setJoinError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [sortKey, setSortKey] = useState('forYou');
  const joinErrorTimer = useRef(null);
  const shareTimer = useRef(null);
  const hasLoadedRef = useRef(false);

  const styles = useThemeStyles((c, s, r) => ({
    container: { gap: s.md, paddingBottom: s['2xl'] },

    /* notices */
    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.redLight,
      borderRadius: r.xl, padding: s.md, borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { flex: 1, color: c.red, fontSize: 13, fontWeight: '700' },
    retryButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.red,
      borderRadius: r.md, paddingHorizontal: s.md, paddingVertical: 8,
    },
    retryText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },
    noticeBox: { flexDirection: 'row', alignItems: 'center', gap: s.sm, borderRadius: r.lg, padding: s.md, borderWidth: 1 },
    noticeError: { backgroundColor: c.redLight, borderColor: c.redBorder },
    noticeSuccess: { backgroundColor: c.greenLight, borderColor: c.green },
    noticeText: { flex: 1, fontSize: 13, fontWeight: '600' },

    /* header */
    headerBanner: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: r['2xl'], padding: s.md, gap: s.md,
    },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    searchContainer: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.inputBackground,
      borderWidth: 1, borderColor: c.inputBorder, borderRadius: r.xl, paddingHorizontal: s.md, height: 46,
    },
    searchInput: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '500', paddingVertical: 0 },
    clearButton: { padding: 2 },
    createButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 46,
      paddingHorizontal: s.md, borderRadius: r.xl, backgroundColor: c.brand,
    },
    createButtonText: { color: c.onBrand, fontSize: 13, fontWeight: '800' },
    statsGrid: {
      flexDirection: 'row', backgroundColor: c.surfaceSecondary, borderRadius: r.xl,
      padding: s.xs, borderWidth: 1, borderColor: c.borderDefault,
    },
    statCard: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: s.xs },
    statDivider: { width: 1, backgroundColor: c.borderDefault, marginVertical: 4 },
    statValue: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    statLabel: { color: c.textTertiary, fontSize: 11, fontWeight: '600', marginTop: 1 },

    /* filters */
    filterSection: { gap: s.xs },
    chipsScroll: { flexGrow: 0 },
    chipsContainer: { gap: s.xs, paddingVertical: 2, paddingRight: s.md },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: s.md, height: 36,
      borderRadius: r.full, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
    },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { color: c.textSecondary, fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: c.onBrand },
    chipCount: { color: c.textTertiary, fontSize: 11, fontWeight: '800' },
    chipCountActive: { color: c.onBrand, opacity: 0.85 },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: s.xs },
    sortLabel: { color: c.textTertiary, fontSize: 12, fontWeight: '700', marginRight: 2 },
    sortPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: s.sm, paddingVertical: 6,
      borderRadius: r.full,
    },
    sortPillActive: { backgroundColor: c.brandLight },
    sortPillText: { color: c.textSecondary, fontSize: 12, fontWeight: '700' },
    sortPillTextActive: { color: c.brand },

    /* sections */
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: s.xs },
    sectionTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    sectionSubtitle: { color: c.textTertiary, fontSize: 12, marginTop: 1 },
    sectionActions: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    clearFiltersText: { color: c.brand, fontSize: 12, fontWeight: '800' },
    resultBadge: {
      backgroundColor: c.surfaceSecondary, paddingHorizontal: s.sm, paddingVertical: 4,
      borderRadius: r.full, borderWidth: 1, borderColor: c.borderDefault,
    },
    resultCount: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    clearFiltersButton: {
      alignSelf: 'center', paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: r.full,
      borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.card,
    },

    /* your-groups rail */
    rail: { gap: s.sm, paddingRight: s.md },
    railCard: {
      width: 150, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: r['2xl'], padding: s.md, gap: s.sm,
    },
    railName: { color: c.textPrimary, fontSize: 13.5, fontWeight: '800' },
    railMeta: { color: c.textTertiary, fontSize: 11.5, fontWeight: '600' },

    /* cards */
    card: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: r['2xl'], padding: s.md, gap: s.md,
    },
    cardPressed: { opacity: 0.96, transform: [{ scale: 0.995 }] },
    cardHeader: { flexDirection: 'row', gap: s.md },
    avatar: { width: 52, height: 52, borderRadius: r.xl, overflow: 'hidden', backgroundColor: c.brandLight },
    avatarSmall: { width: 40, height: 40, borderRadius: r.lg, overflow: 'hidden', backgroundColor: c.brandLight },
    avatarImage: { width: '100%', height: '100%' },
    avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight },
    avatarFallbackText: { color: c.brand, fontSize: 20, fontWeight: '800' },
    cardContent: { flex: 1, gap: 4 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.xs },
    cardTitle: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '800' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: r.full },
    joinedBadge: { backgroundColor: c.greenLight },
    privateBadge: { backgroundColor: c.amberLight },
    badgeText: { fontSize: 10, fontWeight: '800' },
    cardDescription: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18 },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: s.md, rowGap: 4, paddingTop: 2 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: c.textTertiary, fontSize: 11.5, fontWeight: '600' },
    friendsRow: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: c.brandLight, borderRadius: r.full, paddingHorizontal: 9, paddingVertical: 4,
    },
    friendsText: { color: c.brand, fontSize: 11.5, fontWeight: '800' },
    cardFooter: {
      flexDirection: 'row', alignItems: 'center', gap: s.xs, paddingTop: s.md,
      borderTopWidth: 1, borderTopColor: c.borderDefault,
    },
    iconActionButton: {
      width: 40, height: 40, borderRadius: r.xl, backgroundColor: c.surfaceSecondary,
      borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center',
    },
    actionBase: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: r.xl },
    actionPrimary: { backgroundColor: c.brand },
    actionJoined: { backgroundColor: c.greenLight, borderWidth: 1, borderColor: c.green },
    actionRequested: { backgroundColor: c.amberLight, borderWidth: 1, borderColor: c.amber },
    actionText: { fontSize: 12.5, fontWeight: '800' },

    /* skeleton */
    skeletonBlock: { backgroundColor: c.borderDefault, borderRadius: r.md },
  }));

  /* ------------------------------ derived data ----------------------------- */

  const categories = useMemo(() => {
    const values = groups.map((group) => group.category).filter(Boolean);
    return ['All', ...Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b)))];
  }, [groups]);

  const categoryCounts = useMemo(() => {
    const map = { All: groups.length };
    groups.forEach((group) => {
      if (group.category) map[group.category] = (map[group.category] || 0) + 1;
    });
    return map;
  }, [groups]);

  const resolvedCategoryFilter = categoryFilter === 'All' || categories.includes(categoryFilter) ? categoryFilter : 'All';

  const entries = useMemo(
    () =>
      groups.map((group) => ({
        group,
        memberCount: getMemberCount(group),
        ...getGroupState(group, user, userGroupsById, joinStates),
      })),
    [groups, joinStates, user, userGroupsById],
  );

  const counts = useMemo(
    () => ({
      all: entries.length,
      joined: entries.filter((e) => e.isJoined).length,
      available: entries.filter((e) => !e.isJoined && !e.isRequested).length,
      private: entries.filter((e) => e.isPrivate).length,
      open: entries.filter((e) => !e.isPrivate).length,
    }),
    [entries],
  );

  const searchTerm = normalize(query);
  const hasActiveFilters = Boolean(searchTerm) || resolvedCategoryFilter !== 'All' || membershipFilter !== 'all';

  const filteredEntries = useMemo(() => {
    const compare = sorters[sortKey](user?.uid);
    return entries
      .filter(({ group, isJoined, isRequested, isPrivate }) => {
        if (searchTerm) {
          const text = normalize(`${groupTitle(group)} ${groupDescription(group)} ${group.category || ''}`);
          if (!text.includes(searchTerm)) return false;
        }
        if (resolvedCategoryFilter !== 'All' && group.category !== resolvedCategoryFilter) return false;
        if (membershipFilter === 'joined' && !isJoined) return false;
        if (membershipFilter === 'available' && (isJoined || isRequested)) return false;
        if (membershipFilter === 'private' && !isPrivate) return false;
        return true;
      })
      .sort(compare);
  }, [entries, membershipFilter, resolvedCategoryFilter, searchTerm, sortKey, user?.uid]);

  // With no filters applied, show "Your groups" as a quick-access rail and
  // keep the main list focused on discovery. Any filter switches to one flat list.
  const showSplitView = !hasActiveFilters && counts.joined > 0;
  const myGroups = useMemo(
    () => (showSplitView ? filteredEntries.filter((entry) => entry.isJoined) : []),
    [filteredEntries, showSplitView],
  );
  const listEntries = useMemo(
    () => (showSplitView ? filteredEntries.filter((entry) => !entry.isJoined) : filteredEntries),
    [filteredEntries, showSplitView],
  );

  const resetFilters = () => {
    haptic.select();
    animateNext();
    setQuery('');
    setCategoryFilter('All');
    setMembershipFilter('all');
  };

  /* ------------------------------ data loading ----------------------------- */

  useEffect(
    () => () => {
      clearTimeout(joinErrorTimer.current);
      clearTimeout(shareTimer.current);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Full-screen loading only on the first load; refresh silently afterwards.
      if (!hasLoadedRef.current) setLoading(true);
      setError('');
      Promise.all([
        fetchGroupRecommendations(user?.uid),
        user?.uid ? fetchUserGroups(user.uid) : Promise.resolve([]),
      ])
        .then(([items, memberships]) => {
          if (!active) return;
          hasLoadedRef.current = true;
          setGroups(Array.isArray(items) ? items : []);
          setUserGroupsById(
            (Array.isArray(memberships) ? memberships : []).reduce((acc, item) => {
              const id = item.groupId || item.id;
              if (id) acc[id] = item;
              return acc;
            }, {}),
          );
        })
        .catch((fetchError) => {
          console.error('[Groups] Failed to load recommendations or memberships. Firestore index details, if required, are included in the error:', fetchError);
          if (active) {
            animateNext();
            setError(fetchError?.message || 'Could not load groups. Try again.');
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [user]),
  );

  /* -------------------------------- actions -------------------------------- */

  const showTimedMessage = (setter, timerRef, value, ms) => {
    clearTimeout(timerRef.current);
    animateNext();
    setter(value);
    timerRef.current = setTimeout(() => {
      animateNext();
      setter('');
    }, ms);
  };

  const handleJoin = async (entry) => {
    const { group, isJoined, isRequested, needsApproval } = entry;
    if (!user) {
      router.navigate('/login');
      return;
    }
    if (isJoined || isRequested || joiningId) return;
    clearTimeout(joinErrorTimer.current);
    animateNext();
    setJoinError('');
    setJoiningId(group.id);
    try {
      if (needsApproval) {
        await requestJoinGroup(group, user, profile || {});
        animateNext();
        setJoinStates((prev) => ({ ...prev, [group.id]: 'requested' }));
        showTimedMessage(setShareMessage, shareTimer, `Request sent to ${groupTitle(group)}.`, SHARE_MESSAGE_AUTO_DISMISS_MS);
      } else {
        await joinPublicGroup(group, user, profile || {});
        animateNext();
        setJoinStates((prev) => ({ ...prev, [group.id]: 'joined' }));
        setUserGroupsById((prev) => ({
          ...prev,
          [group.id]: { groupId: group.id, name: groupTitle(group), role: 'member' },
        }));
        showTimedMessage(setShareMessage, shareTimer, `You joined ${groupTitle(group)}.`, SHARE_MESSAGE_AUTO_DISMISS_MS);
      }
      haptic.success();
    } catch (err) {
      haptic.error();
      showTimedMessage(setJoinError, joinErrorTimer, err?.message || 'Could not join that group. Try again.', JOIN_ERROR_AUTO_DISMISS_MS);
    } finally {
      setJoiningId(null);
    }
  };

  const handleShare = async (group) => {
    try {
      const result = await shareContent({
        title: groupTitle(group),
        text: `Join ${groupTitle(group)} on UniHelp.`,
        url: buildShareUrl(`/community/${group.id}`),
      });
      if (result === 'dismissed' || result === 'cancelled') return;
      haptic.light();
      showTimedMessage(
        setShareMessage,
        shareTimer,
        result === 'shared' ? 'Group link ready to share.' : 'Group link copied to clipboard.',
        SHARE_MESSAGE_AUTO_DISMISS_MS,
      );
    } catch (_shareError) {
      showTimedMessage(setJoinError, joinErrorTimer, 'Could not share this group. Try again.', JOIN_ERROR_AUTO_DISMISS_MS);
    }
  };

  const handleRetry = () => {
    haptic.light();
    setReloadKey((key) => key + 1);
  };

  const openGroup = (group) => router.navigate(`/community/${group.id}`);

  const hasNothingToShow = Boolean(error) && !groups.length;

  /* -------------------------------- render --------------------------------- */

  const listTitle = showSplitView ? 'Discover groups' : hasActiveFilters ? 'Results' : 'Picked for you';
  const listCount = listEntries.length;

  return (
    <ScreenShell title="Study Groups" subtitle="Find, join, and share campus communities." showBack>
      <View style={styles.container}>
        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={20} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry loading groups"
              style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="refresh" size={14} color={colors.onBrand} />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {joinError ? (
          <Notice icon="alert-circle-outline" color={colors.red} text={joinError} styles={styles} variant="error" onClose={() => setJoinError('')} />
        ) : null}
        {shareMessage ? (
          <Notice icon="checkmark-circle-outline" color={colors.green} text={shareMessage} styles={styles} variant="success" onClose={() => setShareMessage('')} />
        ) : null}

        {hasNothingToShow ? null : (
          <>
            {/* Search, create, stats */}
            <View style={[styles.headerBanner, shadows.sm]}>
              <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search-outline" size={18} color={colors.iconSecondary} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search groups or topics..."
                    placeholderTextColor={colors.inputPlaceholder}
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    accessibilityLabel="Search groups"
                  />
                  {query ? (
                    <Pressable style={styles.clearButton} onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                      <Ionicons name="close-circle" size={18} color={colors.iconSecondary} />
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.9 }]}
                  onPress={() => router.navigate('/create')}
                  accessibilityRole="button"
                  accessibilityLabel="Create group"
                >
                  <Ionicons name="add" size={18} color={colors.onBrand} />
                  <Text style={styles.createButtonText}>Create</Text>
                </Pressable>
              </View>

              <View style={styles.statsGrid}>
                <Stat value={counts.all} label="Groups" styles={styles} />
                <View style={styles.statDivider} />
                <Stat value={counts.joined} label="Joined" styles={styles} />
                <View style={styles.statDivider} />
                <Stat value={counts.open} label="Public" styles={styles} />
              </View>
            </View>

            {/* Filters + sort */}
            {loading ? null : (
              <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContainer} keyboardShouldPersistTaps="handled">
                  {MEMBERSHIP_FILTERS.map((item) => (
                    <FilterChip
                      key={item.key}
                      item={item}
                      count={counts[item.key]}
                      active={membershipFilter === item.key}
                      onPress={() => {
                        haptic.select();
                        animateNext();
                        setMembershipFilter(item.key);
                      }}
                      styles={styles}
                      colors={colors}
                    />
                  ))}
                </ScrollView>

                {categories.length > 2 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContainer} keyboardShouldPersistTaps="handled">
                    {categories.map((category) => (
                      <FilterChip
                        key={category}
                        item={{ key: category, label: category, icon: category === 'All' ? 'grid-outline' : 'pricetag-outline' }}
                        count={categoryCounts[category]}
                        active={categoryFilter === category}
                        onPress={() => {
                          haptic.select();
                          animateNext();
                          setCategoryFilter(category);
                        }}
                        styles={styles}
                        colors={colors}
                      />
                    ))}
                  </ScrollView>
                ) : null}

                <View style={styles.sortRow}>
                  <Text style={styles.sortLabel}>Sort</Text>
                  {SORT_OPTIONS.map((option) => {
                    const active = sortKey === option.key;
                    return (
                      <Pressable
                        key={option.key}
                        onPress={() => {
                          haptic.select();
                          animateNext();
                          setSortKey(option.key);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[styles.sortPill, active && styles.sortPillActive]}
                      >
                        <Ionicons name={option.icon} size={13} color={active ? colors.brand : colors.iconSecondary} />
                        <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {loading ? (
              <GroupSkeletons styles={styles} />
            ) : (
              <>
                {/* Your groups rail */}
                {myGroups.length ? (
                  <View style={{ gap: 12 }}>
                    <View style={styles.sectionHeader}>
                      <View>
                        <Text style={styles.sectionTitle}>Your groups</Text>
                        <Text style={styles.sectionSubtitle}>Jump back into the conversation</Text>
                      </View>
                      <View style={styles.resultBadge}>
                        <Text style={styles.resultCount}>{myGroups.length}</Text>
                      </View>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                      {myGroups.map((entry) => (
                        <RailCard key={entry.group.id} entry={entry} onOpen={() => openGroup(entry.group)} styles={styles} colors={colors} />
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {/* Main list */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{listTitle}</Text>
                  <View style={styles.sectionActions}>
                    {hasActiveFilters ? (
                      <Pressable onPress={resetFilters} hitSlop={8} accessibilityRole="button">
                        <Text style={styles.clearFiltersText}>Clear filters</Text>
                      </Pressable>
                    ) : null}
                    <View style={styles.resultBadge}>
                      <Text style={styles.resultCount}>{pluralize(listCount, 'group', 'groups')}</Text>
                    </View>
                  </View>
                </View>

                {listEntries.length ? (
                  listEntries.map((entry) => (
                    <GroupCard
                      key={entry.group.id}
                      entry={entry}
                      joining={joiningId === entry.group.id}
                      onOpen={() => openGroup(entry.group)}
                      onJoin={() => handleJoin(entry)}
                      onShare={() => handleShare(entry.group)}
                      styles={styles}
                      colors={colors}
                    />
                  ))
                ) : showSplitView && !groups.length ? null : (
                  <>
                    <EmptyState
                      title={
                        showSplitView
                          ? "You've joined every group"
                          : groups.length
                            ? 'No groups found'
                            : 'No groups yet'
                      }
                      description={
                        showSplitView
                          ? 'Start a new community for your course or hostel.'
                          : groups.length
                            ? 'Try a different search or adjust your filters.'
                            : 'Study groups created on UniHelp will show up here.'
                      }
                      actionLabel={!groups.length || showSplitView ? 'Create group' : undefined}
                      onAction={!groups.length || showSplitView ? () => router.navigate('/create') : undefined}
                    />
                    {groups.length && hasActiveFilters ? (
                      <Pressable onPress={resetFilters} style={({ pressed }) => [styles.clearFiltersButton, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                        <Text style={styles.clearFiltersText}>Clear all filters</Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </>
            )}
          </>
        )}
      </View>
    </ScreenShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                             */
/* -------------------------------------------------------------------------- */

function Notice({ icon, color, text, styles, variant, onClose }) {
  return (
    <View
      style={[styles.noticeBox, variant === 'success' ? styles.noticeSuccess : styles.noticeError]}
      accessibilityRole={variant === 'success' ? undefined : 'alert'}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.noticeText, { color }]}>{text}</Text>
      <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss message">
        <Ionicons name="close" size={16} color={color} />
      </Pressable>
    </View>
  );
}

function Stat({ value, label, styles }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ item, count, active, onPress, styles, colors }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={item.icon} size={14} color={active ? colors.onBrand : colors.iconSecondary} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
      {typeof count === 'number' ? <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text> : null}
    </Pressable>
  );
}

function Meta({ icon, text, styles, colors }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={12} color={colors.iconSecondary} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function GroupAvatar({ group, style, styles, textSize = 20 }) {
  const imageUrl = pickImage(group);
  const [failed, setFailed] = useState(false);
  const previousImageRef = useRef(null);
  useEffect(() => {
    if (previousImageRef.current !== imageUrl) {
      previousImageRef.current = imageUrl;
      setFailed(false);
    }
  }, [imageUrl]);
  const showImage = Boolean(imageUrl) && !failed;
  return (
    <View style={style}>
      {showImage ? (
        <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" cachePolicy="disk" transition={200} onError={() => setFailed(true)} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={[styles.avatarFallbackText, { fontSize: textSize }]}>{groupTitle(group).charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}

function RailCard({ entry, onOpen, styles, colors }) {
  const { group, role, memberCount } = entry;
  const isAdmin = role === 'owner' || role === 'admin';
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open ${groupTitle(group)}`}
      style={({ pressed }) => [styles.railCard, pressed && styles.cardPressed]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <GroupAvatar group={group} style={styles.avatarSmall} styles={styles} textSize={16} />
        {isAdmin ? <Ionicons name="shield-checkmark" size={16} color={colors.green} /> : null}
      </View>
      <View style={{ gap: 2 }}>
        <Text style={styles.railName} numberOfLines={1}>{groupTitle(group)}</Text>
        <Text style={styles.railMeta}>{pluralize(memberCount, 'member', 'members')}</Text>
      </View>
    </Pressable>
  );
}

function GroupCard({ entry, joining, onOpen, onJoin, onShare, styles, colors }) {
  const { group, role, isJoined, isRequested, isPrivate, needsApproval, memberCount } = entry;
  const title = groupTitle(group);
  const description = groupDescription(group);
  const friendMemberCount = Number(group.friendMemberCount || 0);
  const isAdmin = role === 'owner' || role === 'admin';
  const joinLabel = needsApproval ? 'Request access' : 'Join group';

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${pluralize(memberCount, 'member', 'members')}`}
      style={({ pressed }) => [styles.card, shadows.sm, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <GroupAvatar group={group} style={styles.avatar} styles={styles} />
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            {isJoined ? (
              <View style={[styles.badge, styles.joinedBadge]}>
                <Ionicons name={isAdmin ? 'shield-checkmark' : 'checkmark-circle'} size={12} color={colors.green} />
                <Text style={[styles.badgeText, { color: colors.green }]}>{isAdmin ? 'Admin' : 'Joined'}</Text>
              </View>
            ) : isPrivate ? (
              <View style={[styles.badge, styles.privateBadge]}>
                <Ionicons name="lock-closed" size={10} color={colors.amber} />
                <Text style={[styles.badgeText, { color: colors.amber }]}>Private</Text>
              </View>
            ) : null}
          </View>

          {description ? <Text style={styles.cardDescription} numberOfLines={2}>{description}</Text> : null}

          <View style={styles.metaRow}>
            <Meta icon="people-outline" text={pluralize(memberCount, 'member', 'members')} styles={styles} colors={colors} />
            {group.category ? <Meta icon="pricetag-outline" text={group.category} styles={styles} colors={colors} /> : null}
            {group.isPopular ? <Meta icon="flame-outline" text="Popular" styles={styles} colors={colors} /> : null}
            <Meta
              icon={isPrivate ? 'lock-closed-outline' : 'globe-outline'}
              text={needsApproval ? 'Approval required' : isPrivate ? 'Private' : 'Public'}
              styles={styles}
              colors={colors}
            />
          </View>

          {friendMemberCount > 0 ? (
            <View style={styles.friendsRow}>
              <Ionicons name="heart" size={12} color={colors.brand} />
              <Text style={styles.friendsText}>{pluralize(friendMemberCount, 'friend', 'friends')} here</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onShare();
          }}
          style={({ pressed }) => [styles.iconActionButton, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={`Share ${title}`}
        >
          <Ionicons name="share-social-outline" size={16} color={colors.textSecondary} />
        </Pressable>

        {isJoined ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionBase, styles.actionJoined, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="chatbubbles-outline" size={15} color={colors.green} />
            <Text style={[styles.actionText, { color: colors.green }]}>Open discussion</Text>
          </Pressable>
        ) : isRequested ? (
          <View style={[styles.actionBase, styles.actionRequested]} accessibilityRole="text">
            <Ionicons name="time-outline" size={15} color={colors.amber} />
            <Text style={[styles.actionText, { color: colors.amber }]}>Request pending</Text>
          </View>
        ) : (
          <Pressable
            disabled={joining}
            onPress={(event) => {
              event.stopPropagation();
              onJoin();
            }}
            accessibilityRole="button"
            accessibilityState={{ disabled: joining, busy: joining }}
            style={({ pressed }) => [styles.actionBase, styles.actionPrimary, joining && { opacity: 0.7 }, pressed && !joining && { opacity: 0.9 }]}
          >
            {joining ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <>
                <Ionicons name={needsApproval ? 'key-outline' : 'person-add-outline'} size={15} color={colors.onBrand} />
                <Text style={[styles.actionText, { color: colors.onBrand }]}>{joinLabel}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function GroupSkeletons({ styles }) {
  const [pulse] = useState(() => new Animated.Value(0.4));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const bar = (style) => <Animated.View style={[styles.skeletonBlock, { opacity: pulse }, style]} />;
  return (
    <View style={{ gap: 12 }}>
      {[0, 1, 2].map((key) => (
        <View key={key} style={styles.card}>
          <View style={styles.cardHeader}>
            {bar({ width: 52, height: 52, borderRadius: 16 })}
            <View style={{ flex: 1, gap: 8 }}>
              {bar({ width: '60%', height: 14 })}
              {bar({ width: '90%', height: 11 })}
              {bar({ width: '40%', height: 11 })}
            </View>
          </View>
          {bar({ width: '100%', height: 40, borderRadius: 14 })}
        </View>
      ))}
    </View>
  );
}