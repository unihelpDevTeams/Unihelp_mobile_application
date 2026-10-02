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
import { fetchGroupRecommendations, fetchUserGroups } from '../../services/firestoreSync';
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

const MEMBERSHIP_FILTERS = [
  { key: 'all', label: 'All', icon: 'albums-outline' },
  { key: 'joined', label: 'Joined', icon: 'checkmark-circle-outline' },
  { key: 'available', label: 'Available', icon: 'person-add-outline' },
  { key: 'private', label: 'Private', icon: 'lock-closed-outline' },
];

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
  const memberList = [group.members, group.memberIds, group.memberUids, group.memberList].find(
    (list) => Array.isArray(list)
  );
  if (memberList?.includes(uid)) return 'member';
  return null;
};

const groupTitle = (group) => group?.name || group?.title || 'Untitled group';
const groupDescription = (group) => group?.description || group?.summary || 'No description yet.';
const normalize = (value = '') => String(value).trim().toLowerCase();
const getMemberCount = (group = {}) => Number(group.memberCount || group.members?.length || 0);
const personalizedGroupRandom = (uid, groupId) => {
  const value = `${uid || 'guest'}:${groupId}`;
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0) / 0xffffffff;
};

const pickImage = (group = {}) => {
  const candidates = [
    group.avatarUrl,
    group.photoURL,
    group.coverUrl,
    group.imageUrl,
    group.avatar,
    group.cover,
  ];
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
  const hasLoadedRef = useRef(false);

  const styles = useThemeStyles((c, s, r) => ({
    container: {
      gap: s.md,
    },

    // Notices / errors
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      backgroundColor: c.redLight,
      borderRadius: r.xl,
      padding: s.md,
      borderWidth: 1,
      borderColor: c.redBorder,
    },
    errorText: {
      flex: 1,
      color: c.red,
      fontSize: 13,
      fontWeight: '700',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.red,
      borderRadius: r.md,
      paddingHorizontal: s.md,
      paddingVertical: 8,
    },
    retryText: {
      color: c.onBrand,
      fontSize: 12,
      fontWeight: '800',
    },
    noticeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      borderRadius: r.lg,
      padding: s.md,
      borderWidth: 1,
    },
    noticeError: {
      backgroundColor: c.redLight,
      borderColor: c.redBorder,
    },
    noticeSuccess: {
      backgroundColor: c.greenLight,
      borderColor: c.green,
    },
    noticeText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },

    // Header: search + create + stats
    headerBanner: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r['2xl'],
      padding: s.md,
      gap: s.md,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      backgroundColor: c.inputBackground,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: r.xl,
      paddingHorizontal: s.md,
      height: 46,
    },
    searchInput: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '500',
      paddingVertical: 0,
    },
    clearButton: {
      padding: 2,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      height: 46,
      paddingHorizontal: s.md,
      borderRadius: r.xl,
      backgroundColor: c.brand,
    },
    createButtonText: {
      color: c.onBrand,
      fontSize: 13,
      fontWeight: '800',
    },
    statsGrid: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.xl,
      padding: s.xs,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: s.xs,
    },
    statDivider: {
      width: 1,
      backgroundColor: c.borderDefault,
      marginVertical: 4,
    },
    statValue: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    statLabel: {
      color: c.textTertiary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
    },

    // Filters
    filterSection: {
      gap: s.xs,
    },
    chipsScroll: {
      flexGrow: 0,
    },
    chipsContainer: {
      gap: s.xs, // spacing comes from gap only (no extra margin)
      paddingVertical: 2,
      paddingRight: s.md,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: s.md,
      height: 36,
      borderRadius: r.full,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    chipActive: {
      backgroundColor: c.brand,
      borderColor: c.brand,
    },
    chipText: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    chipTextActive: {
      color: c.onBrand,
    },
    chipCount: {
      color: c.textTertiary,
      fontSize: 11,
      fontWeight: '800',
    },
    chipCountActive: {
      color: c.onBrand,
      opacity: 0.85,
    },

    // Section header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: s.xs,
    },
    sectionTitle: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    sectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
    },
    clearFiltersText: {
      color: c.brand,
      fontSize: 12,
      fontWeight: '800',
    },
    resultBadge: {
      backgroundColor: c.surfaceSecondary,
      paddingHorizontal: s.sm,
      paddingVertical: 4,
      borderRadius: r.full,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    resultCount: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    clearFiltersButton: {
      alignSelf: 'center',
      paddingHorizontal: s.md,
      paddingVertical: s.sm,
      borderRadius: r.full,
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.card,
    },

    // Group cards
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r['2xl'],
      padding: s.md,
      gap: s.md,
    },
    cardPressed: {
      opacity: 0.96,
      transform: [{ scale: 0.995 }],
    },
    cardHeader: {
      flexDirection: 'row',
      gap: s.md,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: r.xl,
      overflow: 'hidden',
      backgroundColor: c.brandLight,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brandLight,
    },
    avatarFallbackText: {
      color: c.brand,
      fontSize: 20,
      fontWeight: '800',
    },
    cardContent: {
      flex: 1,
      gap: 4,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s.xs,
    },
    cardTitle: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: r.full,
    },
    joinedBadge: {
      backgroundColor: c.greenLight,
    },
    privateBadge: {
      backgroundColor: c.amberLight,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    cardDescription: {
      color: c.textSecondary,
      fontSize: 12.5,
      lineHeight: 17,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      columnGap: s.md,
      rowGap: 4,
      paddingTop: 2,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      color: c.textTertiary,
      fontSize: 11.5,
      fontWeight: '600',
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
      paddingTop: s.md,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    iconActionButton: {
      width: 40,
      height: 40,
      borderRadius: r.xl,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBase: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: r.xl,
    },
    actionPrimary: {
      backgroundColor: c.brand,
    },
    actionJoined: {
      backgroundColor: c.greenLight,
      borderWidth: 1,
      borderColor: c.green,
    },
    actionRequested: {
      backgroundColor: c.amberLight,
      borderWidth: 1,
      borderColor: c.amber,
    },
    actionText: {
      fontSize: 12.5,
      fontWeight: '800',
    },
  }));

  // ---- Derived data -------------------------------------------------------

  const categories = useMemo(() => {
    const values = groups.map((group) => group.category).filter(Boolean);
    return ['All', ...Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b)))];
  }, [groups]);

  // If a selected category disappears after a refresh, fall back to "All".
  useEffect(() => {
    if (categoryFilter !== 'All' && !categories.includes(categoryFilter)) {
      setCategoryFilter('All');
    }
  }, [categories, categoryFilter]);

  const entries = useMemo(
    () =>
      groups.map((group) => ({
        group,
        memberCount: getMemberCount(group),
        ...getGroupState(group, user, userGroupsById, joinStates),
      })),
    [groups, joinStates, user, userGroupsById]
  );

  const counts = useMemo(
    () => ({
      all: entries.length,
      joined: entries.filter((e) => e.isJoined).length,
      available: entries.filter((e) => !e.isJoined && !e.isRequested).length,
      private: entries.filter((e) => e.isPrivate).length,
      open: entries.filter((e) => !e.isPrivate).length,
    }),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const search = normalize(query);
    return entries
      .filter((entry) => {
        const { group, isJoined, isRequested, isPrivate } = entry;
        const text = normalize(`${groupTitle(group)} ${groupDescription(group)} ${group.category || ''}`);
        if (search && !text.includes(search)) return false;
        if (categoryFilter !== 'All' && group.category !== categoryFilter) return false;
        if (membershipFilter === 'joined' && !isJoined) return false;
        if (membershipFilter === 'available' && (isJoined || isRequested)) return false;
        if (membershipFilter === 'private' && !isPrivate) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.isJoined !== b.isJoined) return a.isJoined ? -1 : 1;
        const score = (entry) => (
          Number(entry.group.friendMemberCount || 0) * 100 +
          Math.log1p(entry.memberCount) * 6 +
          personalizedGroupRandom(user?.uid, entry.group.id) * 36
        );
        return score(b) - score(a);
      });
  }, [categoryFilter, entries, membershipFilter, query, user?.uid]);

  const hasActiveFilters = Boolean(normalize(query)) || categoryFilter !== 'All' || membershipFilter !== 'all';

  const resetFilters = () => {
    Haptics.selectionAsync();
    animateNext();
    setQuery('');
    setCategoryFilter('All');
    setMembershipFilter('all');
  };

  // ---- Data loading -------------------------------------------------------

  useEffect(
    () => () => {
      clearTimeout(joinErrorTimer.current);
      clearTimeout(shareTimer.current);
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      // Only show the full-screen spinner on the first load; refresh silently afterwards.
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
            }, {})
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
    }, [reloadKey, user?.uid])
  );

  // ---- Actions ------------------------------------------------------------

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
    if (isJoined || isRequested) return;
    clearTimeout(joinErrorTimer.current);
    animateNext();
    setJoinError('');
    setJoiningId(group.id);
    try {
      if (needsApproval) {
        await requestJoinGroup(group, user, profile || {});
        animateNext();
        setJoinStates((prev) => ({ ...prev, [group.id]: 'requested' }));
      } else {
        await joinPublicGroup(group, user, profile || {});
        animateNext();
        setJoinStates((prev) => ({ ...prev, [group.id]: 'joined' }));
        setUserGroupsById((prev) => ({
          ...prev,
          [group.id]: { groupId: group.id, name: groupTitle(group), role: 'member' },
        }));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showTimedMessage(
        setJoinError,
        joinErrorTimer,
        err?.message || 'Could not join that group. Try again.',
        JOIN_ERROR_AUTO_DISMISS_MS
      );
    } finally {
      setJoiningId(null);
    }
  };

  const handleShare = async (group) => {
    try {
      const url = buildShareUrl(`/community/${group.id}`);
      const result = await shareContent({
        title: groupTitle(group),
        text: `Join ${groupTitle(group)} on UniHelp.`,
        url,
      });
      if (result === 'dismissed' || result === 'cancelled') return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showTimedMessage(
        setShareMessage,
        shareTimer,
        result === 'shared' ? 'Group link ready to share.' : 'Group link copied to clipboard.',
        SHARE_MESSAGE_AUTO_DISMISS_MS
      );
    } catch (shareError) {
      showTimedMessage(
        setJoinError,
        joinErrorTimer,
        'Could not share this group. Try again.',
        JOIN_ERROR_AUTO_DISMISS_MS
      );
    }
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReloadKey((key) => key + 1);
  };

  // If loading failed and we have nothing to show, the error is the whole screen (inside the shell,
  // so the back button and title stay available).
  const showContent = !(error && !groups.length);

  return (
    <ScreenShell title="Study Groups" subtitle="Find, join, and share campus communities." showBack loading={loading}>
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
          <Notice
            icon="alert-circle-outline"
            color={colors.red}
            text={joinError}
            styles={styles}
            variant="error"
            onClose={() => setJoinError('')}
          />
        ) : null}
        {shareMessage ? (
          <Notice
            icon="checkmark-circle-outline"
            color={colors.green}
            text={shareMessage}
            styles={styles}
            variant="success"
            onClose={() => setShareMessage('')}
          />
        ) : null}

        {showContent ? (
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
                    <Pressable
                      style={styles.clearButton}
                      onPress={() => setQuery('')}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                    >
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
                <Stat value={counts.all} label="Total" styles={styles} />
                <View style={styles.statDivider} />
                <Stat value={counts.joined} label="Joined" styles={styles} />
                <View style={styles.statDivider} />
                <Stat value={counts.open} label="Public" styles={styles} />
              </View>
            </View>

            {/* Filters */}
            <View style={styles.filterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContainer}
              >
                {MEMBERSHIP_FILTERS.map((item) => (
                  <FilterChip
                    key={item.key}
                    item={item}
                    count={counts[item.key]}
                    active={membershipFilter === item.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      animateNext();
                      setMembershipFilter(item.key);
                    }}
                    styles={styles}
                    colors={colors}
                  />
                ))}
              </ScrollView>

              {categories.length > 2 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipsScroll}
                  contentContainerStyle={styles.chipsContainer}
                >
                  {categories.map((category) => (
                    <FilterChip
                      key={category}
                      item={{
                        key: category,
                        label: category,
                        icon: category === 'All' ? 'grid-outline' : 'pricetag-outline',
                      }}
                      active={categoryFilter === category}
                      onPress={() => {
                        Haptics.selectionAsync();
                        animateNext();
                        setCategoryFilter(category);
                      }}
                      styles={styles}
                      colors={colors}
                    />
                  ))}
                </ScrollView>
              ) : null}
            </View>

            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Picked for you</Text>
              <View style={styles.sectionActions}>
                {hasActiveFilters ? (
                  <Pressable onPress={resetFilters} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.clearFiltersText}>Clear filters</Text>
                  </Pressable>
                ) : null}
                <View style={styles.resultBadge}>
                  <Text style={styles.resultCount}>
                    {filteredEntries.length} {filteredEntries.length === 1 ? 'group' : 'groups'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Group list */}
            {filteredEntries.length ? (
              filteredEntries.map((entry) => (
                <GroupCard
                  key={entry.group.id}
                  entry={entry}
                  joining={joiningId === entry.group.id}
                  onOpen={() => router.navigate(`/community/${entry.group.id}`)}
                  onJoin={() => handleJoin(entry)}
                  onShare={() => handleShare(entry.group)}
                  styles={styles}
                  colors={colors}
                />
              ))
            ) : (
              <>
                <EmptyState
                  title={groups.length ? 'No groups found' : 'No groups yet'}
                  description={
                    groups.length
                      ? 'Try adjusting your search or filters.'
                      : 'Study groups created on UniHelp will show up here.'
                  }
                />
                {groups.length && hasActiveFilters ? (
                  <Pressable
                    onPress={resetFilters}
                    style={({ pressed }) => [styles.clearFiltersButton, pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.clearFiltersText}>Clear all filters</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </View>
    </ScreenShell>
  );
}

function Notice({ icon, color, text, styles, variant, onClose }) {
  return (
    <View
      style={[styles.noticeBox, variant === 'success' ? styles.noticeSuccess : styles.noticeError]}
      accessibilityRole={variant === 'success' ? undefined : 'alert'}
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
      {typeof count === 'number' ? (
        <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

function GroupCard({ entry, joining, onOpen, onJoin, onShare, styles, colors }) {
  const { group, role, isJoined, isRequested, isPrivate, needsApproval, memberCount } = entry;
  const title = groupTitle(group);
  const imageUrl = pickImage(group);
  const friendMemberCount = Number(group.friendMemberCount || 0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !imageFailed;
  const isAdmin = role === 'owner' || role === 'admin';
  // Label reflects what will actually happen (private groups can opt out of approval).
  const joinLabel = needsApproval ? 'Request Access' : 'Join Group';

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
      style={({ pressed }) => [styles.card, shadows.sm, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          {showImage ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="disk"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
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

          <Text style={styles.cardDescription} numberOfLines={2}>
            {groupDescription(group)}
          </Text>

          <View style={styles.metaRow}>
            <Meta
              icon="people-outline"
              text={`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
              styles={styles}
              colors={colors}
            />
            {group.category ? (
              <Meta icon="pricetag-outline" text={group.category} styles={styles} colors={colors} />
            ) : null}
            {friendMemberCount > 0 ? (
              <Meta
                icon="people-outline"
                text={`${friendMemberCount} ${friendMemberCount === 1 ? 'friend' : 'friends'} here`}
                styles={styles}
                colors={colors}
              />
            ) : null}
            {group.isPopular ? (
              <Meta icon="flame-outline" text="Popular" styles={styles} colors={colors} />
            ) : null}
            <Meta
              icon={isPrivate ? 'lock-closed-outline' : 'globe-outline'}
              text={needsApproval ? 'Approval required' : isPrivate ? 'Private' : 'Public'}
              styles={styles}
              colors={colors}
            />
          </View>
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
            <Text style={[styles.actionText, { color: colors.green }]}>Open Discussion</Text>
          </Pressable>
        ) : isRequested ? (
          <View style={[styles.actionBase, styles.actionRequested]} accessibilityRole="text">
            <Ionicons name="time-outline" size={15} color={colors.amber} />
            <Text style={[styles.actionText, { color: colors.amber }]}>Request Pending</Text>
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
            style={({ pressed }) => [
              styles.actionBase,
              styles.actionPrimary,
              joining && { opacity: 0.7 },
              pressed && !joining && { opacity: 0.9 },
            ]}
          >
            {joining ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <>
                <Ionicons
                  name={needsApproval ? 'key-outline' : 'person-add-outline'}
                  size={15}
                  color={colors.onBrand}
                />
                <Text style={[styles.actionText, { color: colors.onBrand }]}>{joinLabel}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
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