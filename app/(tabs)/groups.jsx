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

const pickImage = (group = {}) => {
  const candidates = [
    group.avatarUrl,
    group.photoURL,
    group.coverUrl,
    group.imageUrl,
    group.avatar,
    group.cover,
  ];
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
    container: {
      gap: s.md,
    },
    errorScreen: {
      flex: 1,
      padding: s.lg,
      justify: 'center',
      backgroundColor: c.background,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      backgroundColor: c.redLight,
      borderRadius: r.xl,
      padding: s.lg,
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
    retryButtonPressed: {
      opacity: 0.85,
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
      marginBottom: s.sm,
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
    // Modernized Header Banner
    headerBanner: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r['2xl'],
      padding: s.lg,
      gap: s.md,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: s.md,
    },
    headerTextWrapper: {
      flex: 1,
      gap: 4,
    },
    headerTitle: {
      color: c.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    headerSubtitle: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 40,
      paddingHorizontal: s.md,
      borderRadius: r.full,
      backgroundColor: c.brand,
    },
    createButtonText: {
      color: c.onBrand,
      fontSize: 13,
      fontWeight: '700',
    },
    searchContainer: {
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
    },
    clearButton: {
      padding: 4,
    },
    // Modern Metrics Bar
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
    // Filter Section
    filterSection: {
      gap: s.xs,
    },
    chipsContainer: {
      gap: s.xs,
      paddingVertical: 2,
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
      marginRight: s.xs,
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
    // Group Cards
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
      backgroundColor: c.brand,
    },
    avatarFallbackText: {
      color: c.onBrand,
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
      gap: s.sm,
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
      paddingTop: s.xs,
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
    actionPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: r.xl,
      backgroundColor: c.brand,
    },
    actionJoined: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: r.xl,
      backgroundColor: c.greenLight,
      borderWidth: 1,
      borderColor: c.green,
    },
    actionRequested: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      borderRadius: r.xl,
      backgroundColor: c.amberLight,
      borderWidth: 1,
      borderColor: c.amber,
    },
    actionText: {
      fontSize: 12.5,
      fontWeight: '800',
    },
  }));

  const categories = useMemo(() => {
    const values = groups.map((group) => group.category).filter(Boolean);
    return ['All', ...Array.from(new Set(values)).sort((a, b) => String(a).localeCompare(String(b)))];
  }, [groups]);

  const groupStats = useMemo(() => {
    const joined = groups.filter((group) =>
      Boolean(getMembershipRole(group, user, userGroupsById) || joinStates[group.id] === 'joined')
    ).length;
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
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [reloadKey, user?.uid])
  );

  const showTimedMessage = (setter, timerRef, value, ms) => {
    clearTimeout(timerRef.current);
    animateNext();
    setter(value);
    timerRef.current = setTimeout(() => {
      animateNext();
      setter('');
    }, ms);
  };

  const handleJoin = async (group) => {
    if (!user) {
      router.navigate('/login');
      return;
    }
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
    const url = buildShareUrl(`/community/${group.id}`);
    const result = await shareContent({
      title: groupTitle(group),
      text: `Join ${groupTitle(group)} on UniHelp.`,
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
          <Ionicons name="alert-circle-outline" size={20} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setReloadKey((key) => key + 1);
            }}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          >
            <Ionicons name="refresh" size={14} color={colors.onBrand} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScreenShell title="Study Groups" subtitle="Find, join, and share campus communities." showBack loading={loading}>
      <View style={styles.container}>
        {joinError ? (
          <Notice
            icon="alert-circle-outline"
            color={colors.red}
            textColor={colors.red}
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
            textColor={colors.green}
            text={shareMessage}
            styles={styles}
            variant="success"
            onClose={() => setShareMessage('')}
          />
        ) : null}

        {/* Hero Header Section */}
        <View style={[styles.headerBanner, shadows.sm]}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>Study Groups</Text>
              <Text style={styles.headerSubtitle}>
                Collaborate with peers, study together, and share course notes.
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.9 }]}
              onPress={() => router.navigate('/create')}
              accessibilityLabel="Create group"
            >
              <Ionicons name="add" size={18} color={colors.onBrand} />
              <Text style={styles.createButtonText}>Create</Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.iconSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search groups or topics..."
              placeholderTextColor={colors.inputPlaceholder}
              style={styles.searchInput}
              autoCorrect={false}
            />
            {query ? (
              <Pressable style={styles.clearButton} onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.iconSecondary} />
              </Pressable>
            ) : null}
          </View>

          {/* Metrics Bar */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{groups.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{groupStats.joined}</Text>
              <Text style={styles.statLabel}>Joined</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{groupStats.open}</Text>
              <Text style={styles.statLabel}>Public</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
            {[
              { key: 'all', label: 'All', icon: 'albums-outline' },
              { key: 'joined', label: 'Joined', icon: 'checkmark-circle-outline' },
              { key: 'available', label: 'Available', icon: 'person-add-outline' },
              { key: 'private', label: 'Private', icon: 'lock-closed-outline' },
            ].map((item) => (
              <FilterChip
                key={item.key}
                item={item}
                active={membershipFilter === item.key}
                onPress={() => setMembershipFilter(item.key)}
                styles={styles}
                colors={colors}
              />
            ))}
          </ScrollView>

          {categories.length > 2 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
              {categories.map((category) => (
                <FilterChip
                  key={category}
                  item={{
                    key: category,
                    label: category,
                    icon: category === 'All' ? 'grid-outline' : 'pricetag-outline',
                  }}
                  active={categoryFilter === category}
                  onPress={() => setCategoryFilter(category)}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Groups</Text>
          <View style={styles.resultBadge}>
            <Text style={styles.resultCount}>
              {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'}
            </Text>
          </View>
        </View>

        {/* List of Groups */}
        {filteredGroups.length ? (
          filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              role={getMembershipRole(group, user, userGroupsById)}
              joinState={joinStates[group.id]}
              joining={joiningId === group.id}
              onOpen={() => router.navigate(`/community/${group.id}`)}
              onJoin={() => handleJoin(group)}
              onShare={() => handleShare(group)}
              styles={styles}
              colors={colors}
            />
          ))
        ) : (
          <EmptyState
            title={groups.length ? 'No groups found' : 'No groups yet'}
            description={
              groups.length
                ? 'Try adjusting your search query or active category filters.'
                : 'Study groups created on UniHelp will show up here.'
            }
          />
        )}
      </View>
    </ScreenShell>
  );
}

function Notice({ icon, color, textColor, text, styles, variant, onClose }) {
  return (
    <View style={[styles.noticeBox, variant === 'success' ? styles.noticeSuccess : styles.noticeError]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.noticeText, { color: textColor }]}>{text}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <Ionicons name="close" size={16} color={color} />
      </Pressable>
    </View>
  );
}

function FilterChip({ item, active, onPress, styles, colors }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={item.icon} size={14} color={active ? colors.onBrand : colors.iconSecondary} />
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
  const joinLabel = isPrivate ? 'Request Access' : 'Join Group';

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, shadows.sm, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          {showImage ? (
            <Image
              source={{ uri: safeImageUrl }}
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
                <Ionicons name="checkmark-circle" size={12} color={colors.green} />
                <Text style={[styles.badgeText, { color: colors.green }]}>
                  {role === 'owner' || role === 'admin' ? 'Admin' : 'Joined'}
                </Text>
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
            <Meta icon="people-outline" text={`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`} colors={colors} />
            {group.category ? <Meta icon="pricetag-outline" text={group.category} colors={colors} /> : null}
            <Meta
              icon={isPrivate ? 'lock-closed-outline' : 'globe-outline'}
              text={isPrivate ? 'Approval Required' : 'Public'}
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
          accessibilityLabel="Share Group"
        >
          <Ionicons name="share-social-outline" size={16} color={colors.textSecondary} />
        </Pressable>

        {isJoined ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            style={({ pressed }) => [styles.actionJoined, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="chatbubbles-outline" size={15} color={colors.green} />
            <Text style={[styles.actionText, { color: colors.green }]}>Open Discussion</Text>
          </Pressable>
        ) : isRequested ? (
          <View style={styles.actionRequested}>
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
            style={({ pressed }) => [
              styles.actionPrimary,
              joining && { opacity: 0.7 },
              pressed && !joining && { opacity: 0.9 },
            ]}
          >
            {joining ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={15} color={colors.onBrand} />
                <Text style={[styles.actionText, { color: colors.onBrand }]}>{joinLabel}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function Meta({ icon, text, colors }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={12} color={colors.iconSecondary} />
      <Text style={{ color: colors.textTertiary, fontSize: 11.5, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
