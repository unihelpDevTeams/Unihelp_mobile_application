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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

if (Platform.OS === 'android' && !global.nativeFabricUIManager && UIManager.setLayoutAnimationEnabledExperimental) {
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
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};

const JOIN_ERROR_AUTO_DISMISS_MS = 4000;
const SHARE_MESSAGE_AUTO_DISMISS_MS = 2600;
const FAB_LABEL_VISIBLE_MS = 3500;
const RAIL_PREVIEW_LIMIT = 3;
const NEW_GROUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const MEMBERSHIP_FILTERS = [
  { key: 'all', label: 'All', icon: 'albums-outline' },
  { key: 'joined', label: 'Joined', icon: 'checkmark-circle-outline' },
  { key: 'available', label: 'Available', icon: 'person-add-outline' },
  { key: 'private', label: 'Private', icon: 'lock-closed-outline' },
];

const SORT_OPTIONS = [
  { key: 'forYou', label: 'For you', icon: 'sparkles-outline' },
  { key: 'popular', label: 'Most members', icon: 'people-outline' },
  { key: 'newest', label: 'Newest', icon: 'time-outline' },
];

// Accent tones for avatar fallbacks. Backgrounds use the same hue with alpha,
// so they stay readable in both light and dark themes.
const AVATAR_TONES = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#6366F1'];

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

const formatCount = (value) => {
  const n = Number(value) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
};

const hashString = (value) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return hash >>> 0;
};

// Stable per-user jitter so the order feels personal but doesn't reshuffle on each render.
const personalizedGroupRandom = (uid, groupId) => hashString(`${uid || 'guest'}:${groupId}`) / 0xffffffff;

const avatarTone = (group) => AVATAR_TONES[hashString(String(group?.id || groupTitle(group))) % AVATAR_TONES.length];

const pickImage = (group = {}) => {
  const candidates = [group.avatarUrl, group.photoURL, group.coverUrl, group.imageUrl, group.avatar, group.cover];
  const found = candidates.find((item) => typeof item === 'string' && item.trim());
  return found ? found.trim() : '';
};

const toTime = (value) => {
  if (!value) return 0;
  const raw = value?.toDate ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  const time = raw instanceof Date ? raw.getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
};

const isRecentlyCreated = (group) => {
  const created = toTime(group?.createdAt);
  return created > 0 && Date.now() - created < NEW_GROUP_WINDOW_MS;
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
  const insets = useSafeAreaInsets();
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
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [sortKey, setSortKey] = useState('forYou');
  const [showAllMine, setShowAllMine] = useState(false);
  const joinErrorTimer = useRef(null);
  const shareTimer = useRef(null);
  const hasLoadedRef = useRef(false);

  const styles = useThemeStyles((c, s, r) => ({
    container: { gap: s.lg, paddingBottom: 120 },

    /* notices */
    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.redLight,
      borderRadius: r.xl, padding: s.md, borderWidth: 1, borderColor: c.redBorder,
    },
    errorText: { flex: 1, color: c.red, fontSize: 13, fontWeight: '600' },
    retryButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.red,
      borderRadius: r.md, paddingHorizontal: s.md, paddingVertical: 8,
    },
    retryText: { color: c.onBrand, fontSize: 12, fontWeight: '700' },
    noticeBox: { flexDirection: 'row', alignItems: 'center', gap: s.sm, borderRadius: r.lg, padding: s.md, borderWidth: 1 },
    noticeError: { backgroundColor: c.redLight, borderColor: c.redBorder },
    noticeSuccess: { backgroundColor: c.greenLight, borderColor: c.green },
    noticeText: { flex: 1, fontSize: 13, fontWeight: '600' },

    /* toolbar */
    toolbar: { gap: s.sm },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    searchContainer: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.inputBackground,
      borderWidth: 1, borderColor: c.inputBorder, borderRadius: r.full, paddingHorizontal: s.md, height: 48,
    },
    searchInput: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '500', paddingVertical: 0 },
    clearButton: { padding: 2 },
    filterToggle: {
      width: 48, height: 48, borderRadius: r.full, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
    },
    filterToggleActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    filterDot: {
      position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5,
      backgroundColor: c.brand, borderWidth: 1.5, borderColor: c.card,
    },

    /* always-visible membership chips */
    quickChips: { flexGrow: 0 },
    quickChipsContent: { gap: s.xs, paddingRight: s.md },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: s.md, height: 36,
      borderRadius: r.full, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault,
    },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { color: c.textSecondary, fontSize: 12.5, fontWeight: '600' },
    chipTextActive: { color: c.onBrand },
    chipCount: {
      minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.card,
    },
    chipCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
    chipCountText: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    chipCountTextActive: { color: c.onBrand },

    /* filter panel */
    filterPanel: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: r['2xl'], padding: s.md, gap: s.md,
    },
    filterGroup: { gap: s.xs },
    filterLabel: { color: c.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
    chipsScroll: { flexGrow: 0 },
    chipsContainer: { gap: s.xs, paddingRight: s.md },
    sortRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: s.xs },
    sortPill: {
      flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: s.sm, paddingVertical: 7,
      borderRadius: r.full,
    },
    sortPillActive: { backgroundColor: c.brandLight },
    sortPillText: { color: c.textSecondary, fontSize: 12.5, fontWeight: '600' },
    sortPillTextActive: { color: c.brand },
    panelFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
    clearFiltersText: { color: c.brand, fontSize: 13, fontWeight: '700' },

    /* sections */
    section: { gap: s.sm },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: s.sm },
    sectionHeader: { flex: 1, gap: 2 },
    sectionTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
    sectionSubtitle: { color: c.textTertiary, fontSize: 13 },
    sectionAction: { color: c.brand, fontSize: 13, fontWeight: '700' },

    /* joined groups: compact vertical list for one calm reading flow */
    rail: { gap: s.sm },
    railCard: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.card,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: r['2xl'], padding: s.sm + 2,
    },
    railMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s.sm },
    railCopy: { flex: 1, gap: 2 },
    railName: { color: c.textPrimary, fontSize: 14.5, fontWeight: '700' },
    railRole: { color: c.textTertiary, fontSize: 12, fontWeight: '500' },

    /* cards */
    list: { gap: s.md },
    card: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: r['2xl'], padding: s.md, gap: s.md,
    },
    cardPressed: { opacity: 0.96, transform: [{ scale: 0.99 }] },
    cardHeader: { flexDirection: 'row', gap: s.md },
    avatar: { width: 56, height: 56, borderRadius: r.xl, overflow: 'hidden' },
    avatarSmall: { width: 44, height: 44, borderRadius: r.lg, overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%' },
    avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    avatarFallbackText: { fontSize: 20, fontWeight: '800' },
    cardContent: { flex: 1, gap: 6 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: s.xs },
    cardTitle: { flexShrink: 1, color: c.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: -0.15 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: r.full },
    joinedBadge: { backgroundColor: c.greenLight },
    privateBadge: { backgroundColor: c.amberLight },
    newBadge: { backgroundColor: c.brandLight },
    badgeText: { fontSize: 10.5, fontWeight: '700' },
    cardDescription: { color: c.textSecondary, fontSize: 13, lineHeight: 19 },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: s.md, rowGap: 4 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: c.textTertiary, fontSize: 12, fontWeight: '500' },
    divider: { height: 1, backgroundColor: c.borderDefault, opacity: 0.6 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: s.xs },
    iconActionButton: {
      width: 42, height: 42, borderRadius: r.xl, backgroundColor: c.surfaceSecondary,
      borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center',
    },
    actionBase: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: r.xl },
    actionPrimary: { backgroundColor: c.brand },
    actionJoined: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault },
    actionRequested: { backgroundColor: c.amberLight, borderWidth: 1, borderColor: c.amber },
    actionText: { fontSize: 13, fontWeight: '700' },

    /* misc */
    clearSearchButton: {
      alignSelf: 'center', paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: r.full,
      borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.card,
    },
    clearSearchText: { color: c.brand, fontSize: 13, fontWeight: '700' },
    skeletonBlock: { backgroundColor: c.borderDefault, borderRadius: r.md },

    /* floating action button */
    fabWrap: { position: 'absolute', right: 18 },
    fab: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      height: 58, minWidth: 58, paddingHorizontal: 17, borderRadius: 29, backgroundColor: c.brand,
    },
    fabLabel: { color: c.onBrand, fontSize: 14.5, fontWeight: '700', letterSpacing: 0.1 },
  }));

  /* ------------------------------ derived data ----------------------------- */

  const entries = useMemo(
    () =>
      groups.map((group) => ({
        group,
        memberCount: getMemberCount(group),
        ...getGroupState(group, user, userGroupsById, joinStates),
      })),
    [groups, joinStates, user, userGroupsById],
  );

  const membershipCounts = useMemo(
    () => ({
      all: entries.length,
      joined: entries.filter((e) => e.isJoined).length,
      available: entries.filter((e) => !e.isJoined && !e.isRequested).length,
      private: entries.filter((e) => e.isPrivate).length,
    }),
    [entries],
  );

  const categories = useMemo(() => {
    const values = groups.map((group) => group.category).filter(Boolean);
    return ['All', ...Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b)))];
  }, [groups]);

  const resolvedCategoryFilter = categoryFilter === 'All' || categories.includes(categoryFilter) ? categoryFilter : 'All';

  const searchTerm = normalize(query);
  const isSearching = Boolean(searchTerm);
  const hasActiveFilters = resolvedCategoryFilter !== 'All' || membershipFilter !== 'all';
  const hasPanelRefinements = resolvedCategoryFilter !== 'All' || sortKey !== 'forYou';
  const isRefined = isSearching || hasActiveFilters || sortKey !== 'forYou';

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

  // With nothing applied, "Your groups" is a quick-access section and the main
  // list focuses on discovery. Any search or filter switches to one flat list.
  const hasJoined = membershipCounts.joined > 0;
  const showSplitView = !isSearching && !hasActiveFilters && hasJoined;
  const myGroups = useMemo(
    () => (showSplitView ? filteredEntries.filter((entry) => entry.isJoined) : []),
    [filteredEntries, showSplitView],
  );
  const visibleMyGroups = showAllMine ? myGroups : myGroups.slice(0, RAIL_PREVIEW_LIMIT);
  const listEntries = useMemo(
    () => (showSplitView ? filteredEntries.filter((entry) => !entry.isJoined) : filteredEntries),
    [filteredEntries, showSplitView],
  );

  /* ------------------------------ data loading ----------------------------- */

  useEffect(
    () => () => {
      clearTimeout(joinErrorTimer.current);
      clearTimeout(shareTimer.current);
    },
    [],
  );

  const uid = user?.uid;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Full-screen loading only on the first load; refresh silently afterwards.
      if (!hasLoadedRef.current) setLoading(true);
      setError('');
      Promise.all([
        fetchGroupRecommendations(uid),
        uid ? fetchUserGroups(uid) : Promise.resolve([]),
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
    }, [uid, reloadKey]),
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
      const requiresApproval = group?.privacy === 'private' && group?.requireApproval !== false;
      const result = await shareContent({
        title: groupTitle(group),
        text: requiresApproval
          ? `Request to join ${groupTitle(group)} on UniHelp.`
          : `Join ${groupTitle(group)} on UniHelp.`,
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

  const toggleFilters = () => {
    haptic.select();
    animateNext();
    setShowFilters((value) => !value);
  };

  const resetFilters = () => {
    haptic.select();
    animateNext();
    setQuery('');
    setCategoryFilter('All');
    setMembershipFilter('all');
    setSortKey('forYou');
  };

  const handleCreate = () => {
    haptic.medium();
    if (!user) {
      router.navigate('/login');
      return;
    }
    router.navigate('/create');
  };

  const openGroup = (group) => router.navigate(`/community/${group.id}`);

  const hasNothingToShow = Boolean(error) && !groups.length;
  const resultCount = filteredEntries.length;
  const listTitle = showSplitView ? 'Discover' : isSearching || hasActiveFilters ? 'Results' : 'Recommended for you';
  const listSubtitle = showSplitView
    ? 'Communities you might like'
    : isSearching || hasActiveFilters
      ? `${resultCount} ${resultCount === 1 ? 'group' : 'groups'} matching your search and filters`
      : 'Based on your campus and connections';

  /* -------------------------------- render --------------------------------- */

  return (
    <View style={{ flex: 1 }}>
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
              {/* Search + quick filters */}
              <View style={styles.toolbar}>
                <View style={styles.searchRow}>
                  <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color={colors.iconSecondary} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search groups or topics"
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
                    onPress={toggleFilters}
                    accessibilityRole="button"
                    accessibilityLabel={showFilters ? 'Hide filters' : 'Show filters'}
                    accessibilityState={{ expanded: showFilters }}
                    style={({ pressed }) => [styles.filterToggle, showFilters && styles.filterToggleActive, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons
                      name={showFilters ? 'options' : 'options-outline'}
                      size={20}
                      color={showFilters ? colors.brand : colors.textSecondary}
                    />
                    {!showFilters && hasPanelRefinements ? <View style={styles.filterDot} /> : null}
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickChips}
                  contentContainerStyle={styles.quickChipsContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {MEMBERSHIP_FILTERS.map((item) => (
                    <FilterChip
                      key={item.key}
                      item={item}
                      count={loading ? undefined : membershipCounts[item.key]}
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
              </View>

              {/* Collapsible category + sort */}
              {showFilters && !loading ? (
                <View style={styles.filterPanel}>
                  {categories.length > 2 ? (
                    <View style={styles.filterGroup}>
                      <Text style={styles.filterLabel}>Category</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContainer} keyboardShouldPersistTaps="handled">
                        {categories.map((category) => (
                          <FilterChip
                            key={category}
                            item={{ key: category, label: category, icon: category === 'All' ? 'grid-outline' : 'pricetag-outline' }}
                            active={resolvedCategoryFilter === category}
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
                    </View>
                  ) : null}

                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Sort by</Text>
                    <View style={styles.sortRow}>
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
                            <Ionicons name={option.icon} size={14} color={active ? colors.brand : colors.iconSecondary} />
                            <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>{option.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {isRefined ? (
                    <View style={styles.panelFooter}>
                      <Pressable onPress={resetFilters} hitSlop={8} accessibilityRole="button">
                        <Text style={styles.clearFiltersText}>Reset all</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {loading ? (
                <GroupSkeletons styles={styles} />
              ) : (
                <>
                  {/* Your groups */}
                  {myGroups.length ? (
                    <View style={styles.section}>
                      <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>Your groups</Text>
                          <Text style={styles.sectionSubtitle}>Jump back into the conversation</Text>
                        </View>
                        {myGroups.length > RAIL_PREVIEW_LIMIT ? (
                          <Pressable
                            onPress={() => {
                              haptic.select();
                              animateNext();
                              setShowAllMine((value) => !value);
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={showAllMine ? 'Show fewer of your groups' : 'See all of your groups'}
                          >
                            <Text style={styles.sectionAction}>{showAllMine ? 'Show less' : `See all (${myGroups.length})`}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                      <View style={styles.rail}>
                        {visibleMyGroups.map((entry) => (
                          <RailCard key={entry.group.id} entry={entry} onOpen={() => openGroup(entry.group)} onShare={() => handleShare(entry.group)} styles={styles} colors={colors} />
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* Main list */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>{listTitle}</Text>
                      <Text style={styles.sectionSubtitle}>{listSubtitle}</Text>
                    </View>

                    {listEntries.length ? (
                      <View style={styles.list}>
                        {listEntries.map((entry) => (
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
                        ))}
                      </View>
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
                          onAction={!groups.length || showSplitView ? handleCreate : undefined}
                        />
                        {groups.length && (isSearching || hasActiveFilters) ? (
                          <Pressable onPress={resetFilters} style={({ pressed }) => [styles.clearSearchButton, pressed && { opacity: 0.85 }]} accessibilityRole="button">
                            <Text style={styles.clearSearchText}>Clear all filters</Text>
                          </Pressable>
                        ) : null}
                      </>
                    )}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </ScreenShell>

      <CreateFab onPress={handleCreate} bottomInset={insets.bottom} styles={styles} colors={colors} />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Subcomponents                                                             */
/* -------------------------------------------------------------------------- */

// WhatsApp-style floating action button: pops in, shows its label briefly, then
// collapses to a round icon button.
function CreateFab({ onPress, bottomInset, styles, colors }) {
  const [expanded, setExpanded] = useState(true);
  const scale = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const popIn = Animated.spring(scale, {
      toValue: 1,
      delay: 250,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    });
    popIn.start();
    const timer = setTimeout(() => {
      animateNext();
      setExpanded(false);
    }, FAB_LABEL_VISIBLE_MS);
    return () => {
      popIn.stop();
      clearTimeout(timer);
    };
  }, [scale]);

  const animatePress = (toValue) =>
    Animated.spring(pressScale, { toValue, friction: 7, tension: 200, useNativeDriver: true }).start();

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.fabWrap,
        { bottom: Math.max(bottomInset, 12) + 16, transform: [{ scale: Animated.multiply(scale, pressScale) }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => animatePress(0.92)}
        onPressOut={() => animatePress(1)}
        accessibilityRole="button"
        accessibilityLabel="Create group"
        style={[
          styles.fab,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 10,
            elevation: 8,
          },
        ]}
      >
        <Ionicons name={expanded ? 'people' : 'add'} size={expanded ? 22 : 28} color={colors.onBrand} />
        {expanded ? <Text style={styles.fabLabel}>New group</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

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

function FilterChip({ item, active, count, onPress, styles, colors }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count === undefined ? item.label : `${item.label}, ${count}`}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={item.icon} size={14} color={active ? colors.onBrand : colors.iconSecondary} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
      {count !== undefined ? (
        <View style={[styles.chipCount, active && styles.chipCountActive]}>
          <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>{formatCount(count)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Meta({ icon, text, styles, colors, tint }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={tint || colors.iconSecondary} />
      <Text style={[styles.metaText, tint ? { color: tint, fontWeight: '600' } : null]}>{text}</Text>
    </View>
  );
}

function GroupAvatar({ group, style, styles, textSize = 20 }) {
  const imageUrl = pickImage(group);
  const tone = avatarTone(group);
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
    <View style={[style, { backgroundColor: `${tone}26` }]}>
      {showImage ? (
        <Image source={{ uri: imageUrl }} style={styles.avatarImage} contentFit="cover" cachePolicy="disk" transition={200} onError={() => setFailed(true)} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={[styles.avatarFallbackText, { fontSize: textSize, color: tone }]}>{groupTitle(group).charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}

function RailCard({ entry, onOpen, onShare, styles, colors }) {
  const { group, role, memberCount } = entry;
  const isAdmin = role === 'owner' || role === 'admin';
  const roleLabel = isAdmin ? 'Admin' : 'Member';
  return (
    <View style={[styles.railCard, shadows.sm]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Open ${groupTitle(group)}`}
        style={({ pressed }) => [styles.railMain, pressed && styles.cardPressed]}
      >
        <GroupAvatar group={group} style={styles.avatarSmall} styles={styles} textSize={16} />
        <View style={styles.railCopy}>
          <Text style={styles.railName} numberOfLines={1}>{groupTitle(group)}</Text>
          <Text style={styles.railRole} numberOfLines={1}>
            {memberCount > 0 ? `${roleLabel} · ${formatCount(memberCount)} ${memberCount === 1 ? 'member' : 'members'}` : roleLabel}
          </Text>
        </View>
        {isAdmin ? <Ionicons name="shield-checkmark" size={16} color={colors.green} /> : null}
        <Ionicons name="chevron-forward" size={16} color={colors.iconSecondary} />
      </Pressable>
      <Pressable
        onPress={onShare}
        hitSlop={6}
        style={({ pressed }) => [styles.iconActionButton, pressed && { opacity: 0.75 }]}
        accessibilityRole="button"
        accessibilityLabel={`Share ${groupTitle(group)}`}
      >
        <Ionicons name="share-social-outline" size={17} color={colors.brand} />
      </Pressable>
    </View>
  );
}

function GroupCard({ entry, joining, onOpen, onJoin, onShare, styles, colors }) {
  const { group, role, memberCount, isJoined, isRequested, isPrivate, needsApproval } = entry;
  const title = groupTitle(group);
  const description = groupDescription(group);
  const isAdmin = role === 'owner' || role === 'admin';
  const joinLabel = needsApproval ? 'Request access' : 'Join group';
  const friendCount = Number(group.friendMemberCount || 0);
  const isNew = isRecentlyCreated(group);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.card, shadows.sm, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <GroupAvatar group={group} style={styles.avatar} styles={styles} />
        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            {isJoined ? (
              <View style={[styles.badge, styles.joinedBadge]}>
                <Ionicons name={isAdmin ? 'shield-checkmark' : 'checkmark-circle'} size={11} color={colors.green} />
                <Text style={[styles.badgeText, { color: colors.green }]}>{isAdmin ? 'Admin' : 'Joined'}</Text>
              </View>
            ) : isPrivate ? (
              <View style={[styles.badge, styles.privateBadge]}>
                <Ionicons name="lock-closed" size={10} color={colors.amber} />
                <Text style={[styles.badgeText, { color: colors.amber }]}>Private</Text>
              </View>
            ) : isNew ? (
              <View style={[styles.badge, styles.newBadge]}>
                <Ionicons name="sparkles" size={10} color={colors.brand} />
                <Text style={[styles.badgeText, { color: colors.brand }]}>New</Text>
              </View>
            ) : null}
          </View>

          {description ? <Text style={styles.cardDescription} numberOfLines={2}>{description}</Text> : null}

          <View style={styles.metaRow}>
            <Meta
              icon="people-outline"
              text={`${formatCount(memberCount)} ${memberCount === 1 ? 'member' : 'members'}`}
              styles={styles}
              colors={colors}
            />
            {group.category ? <Meta icon="pricetag-outline" text={group.category} styles={styles} colors={colors} /> : null}
            <Meta
              icon={isPrivate ? 'lock-closed-outline' : 'globe-outline'}
              text={needsApproval ? 'Approval required' : isPrivate ? 'Private' : 'Public'}
              styles={styles}
              colors={colors}
            />
            {friendCount > 0 ? (
              <Meta
                icon="people-circle-outline"
                text={`${friendCount} ${friendCount === 1 ? 'friend' : 'friends'} here`}
                styles={styles}
                colors={colors}
                tint={colors.brand}
              />
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        {isJoined ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Open ${title}`}
            style={({ pressed }) => [styles.actionBase, styles.actionJoined, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="chatbubbles-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Open discussion</Text>
          </Pressable>
        ) : isRequested ? (
          <View style={[styles.actionBase, styles.actionRequested]} accessibilityRole="text">
            <Ionicons name="time-outline" size={16} color={colors.amber} />
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
            accessibilityLabel={joinLabel}
            accessibilityState={{ disabled: joining, busy: joining }}
            style={({ pressed }) => [styles.actionBase, styles.actionPrimary, joining && { opacity: 0.7 }, pressed && !joining && { opacity: 0.9 }]}
          >
            {joining ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <>
                <Ionicons name={needsApproval ? 'key-outline' : 'person-add-outline'} size={16} color={colors.onBrand} />
                <Text style={[styles.actionText, { color: colors.onBrand }]}>{joinLabel}</Text>
              </>
            )}
          </Pressable>
        )}
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onShare();
          }}
          hitSlop={6}
          style={({ pressed }) => [styles.iconActionButton, pressed && { opacity: 0.75 }]}
          accessibilityRole="button"
          accessibilityLabel={`Share ${title}`}
        >
          <Ionicons name="share-social-outline" size={18} color={colors.brand} />
        </Pressable>
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
            {bar({ width: 56, height: 56, borderRadius: 16 })}
            <View style={{ flex: 1, gap: 8 }}>
              {bar({ width: '60%', height: 14 })}
              {bar({ width: '90%', height: 11 })}
              {bar({ width: '40%', height: 11 })}
            </View>
          </View>
          {bar({ width: '100%', height: 42, borderRadius: 14 })}
        </View>
      ))}
    </View>
  );
}