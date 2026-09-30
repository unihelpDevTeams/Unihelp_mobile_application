import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { spacing, borderRadius, shadows } from '../../src/shared/theme';
import { useAuth } from '../../context/AuthContext';
import { searchUsers } from '../../src/shared/services/community';
import {
  RELATIONSHIP,
  listenRelationship,
  listSuggestedFriends,
  sendFriendRequest,
} from '../../src/shared/services/friendships';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'school', label: 'School' },
  { key: 'department', label: 'Department' },
  { key: 'level', label: 'Level' },
  { key: 'interest', label: 'Interests' },
];

const MISSING_PROFILE_HINT = {
  school: 'Add your school to your profile to filter by school.',
  department: 'Add your department to your profile to filter by department.',
  level: 'Add your level to your profile to filter by level.',
  interest: 'Add your interests to your profile to filter by interests.',
};

const TOAST_DURATION = 2600;

const nameOf = (person = {}) => person.username || person.name || person.email || 'Student';
const schoolOf = (person = {}) => person.school || person.university || '';
const metaOf = (person = {}) => [schoolOf(person), person.department, person.level].filter(Boolean).join(' | ');
const uidOf = (person = {}) => person.id || person.uid;
const norm = (value) => String(value || '').trim().toLowerCase();

const interestsOf = (person = {}) => (
  Array.isArray(person.interests) ? person.interests.map(norm).filter(Boolean) : []
);

const mySchoolOf = (profile) => schoolOf(profile || {});

// Whether the current user has the profile data needed for a given filter.
const isFilterReady = (key, profile) => {
  if (key === 'all') return true;
  if (key === 'school') return !!mySchoolOf(profile);
  if (key === 'department') return !!profile?.department;
  if (key === 'level') return !!profile?.level;
  if (key === 'interest') return interestsOf(profile).length > 0;
  return true;
};

const matchesFilter = (person, key, profile) => {
  if (key === 'all') return true;
  if (key === 'school') return !!schoolOf(person) && norm(schoolOf(person)) === norm(mySchoolOf(profile));
  if (key === 'department') return !!person.department && norm(person.department) === norm(profile?.department);
  if (key === 'level') return !!person.level && norm(person.level) === norm(profile?.level);
  if (key === 'interest') {
    const mine = interestsOf(profile);
    return interestsOf(person).some((item) => mine.includes(item));
  }
  return true;
};

const Avatar = memo(function Avatar({ person, styles }) {
  const uri = person.photo || person.avatar || person.photoURL || '';
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return uri && !failed ? (
    <Image source={{ uri }} style={styles.avatar} onError={() => setFailed(true)} />
  ) : (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitial}>{nameOf(person)[0]?.toUpperCase() || 'S'}</Text>
    </View>
  );
});

function RelationshipAction({ person, currentUid, currentProfile, styles, onNotify }) {
  const { colors } = useTheme();
  const router = useRouter();
  const targetUid = uidOf(person);
  const [relationship, setRelationship] = useState({ state: RELATIONSHIP.NONE });
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUid || !targetUid) return undefined;
    return listenRelationship(currentUid, targetUid, (next) => {
      setRelationship(next || { state: RELATIONSHIP.NONE });
    });
  }, [currentUid, targetUid]);

  const openProfile = () => router.navigate(`/view-user-profile/${targetUid}`);

  const addFriend = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await sendFriendRequest({
        currentUid,
        targetUid,
        currentProfile,
        targetProfile: person,
      });
      onNotify?.(`Friend request sent to ${nameOf(person)}`, 'success');
    } catch (error) {
      onNotify?.(error?.message || 'Could not send the request. Try again.', 'error');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  if (relationship.state === RELATIONSHIP.BLOCKED) return null;

  if (relationship.state === RELATIONSHIP.FRIENDS) {
    return (
      <Pressable
        style={({ pressed }) => [styles.smallButton, styles.friendButton, pressed && styles.buttonPressed]}
        onPress={openProfile}
        accessibilityRole="button"
        accessibilityLabel={`You are friends with ${nameOf(person)}. Open profile`}
      >
        <Ionicons name="checkmark-circle" size={15} color={colors.green} />
        <Text style={styles.friendButtonText}>Friends</Text>
      </Pressable>
    );
  }

  if (relationship.state === RELATIONSHIP.SENT) {
    return (
      <View style={[styles.smallButton, styles.sentButton]} accessibilityLabel="Friend request sent">
        <Ionicons name="time-outline" size={15} color={colors.grey} />
        <Text style={styles.sentButtonText}>Sent</Text>
      </View>
    );
  }

  if (relationship.state === RELATIONSHIP.RECEIVED) {
    return (
      <Pressable
        style={({ pressed }) => [styles.smallButton, styles.secondaryButton, pressed && styles.buttonPressed]}
        onPress={openProfile}
        accessibilityRole="button"
        accessibilityLabel={`Respond to friend request from ${nameOf(person)}`}
      >
        <Ionicons name="mail-unread-outline" size={15} color={colors.brand} />
        <Text style={styles.secondaryButtonText}>Respond</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.smallButton, (pressed || busy) && styles.buttonPressed]}
      onPress={addFriend}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`Add ${nameOf(person)} as a friend`}
      accessibilityState={{ busy, disabled: busy }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.onBrand} />
      ) : (
        <Ionicons name="person-add-outline" size={15} color={colors.onBrand} />
      )}
      <Text style={styles.smallButtonText}>{busy ? 'Sending' : 'Add'}</Text>
    </Pressable>
  );
}

const StudentRow = memo(function StudentRow({ person, currentUid, currentProfile, colors, styles, onNotify }) {
  const router = useRouter();
  const targetUid = uidOf(person);
  const interests = Array.isArray(person.interests) ? person.interests.slice(0, 3).join(', ') : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.navigate(`/view-user-profile/${targetUid}`)}
      accessibilityRole="button"
      accessibilityLabel={`View ${nameOf(person)}'s profile`}
    >
      <Avatar person={person} styles={styles} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>{nameOf(person)}</Text>
          {person.verifiedTutor ? (
            <View style={styles.tutorPill}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.teal} />
              <Text style={styles.tutorText}>Tutor</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>{metaOf(person) || person.email || 'UniHelp student'}</Text>
        {interests ? <Text style={styles.interests} numberOfLines={1}>{interests}</Text> : null}
      </View>
      <RelationshipAction
        person={person}
        currentUid={currentUid}
        currentProfile={currentProfile}
        styles={styles}
        onNotify={onNotify}
      />
    </Pressable>
  );
});

export default function FindFriendsPage() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const uid = user?.uid || profile?.uid;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [toast, setToast] = useState(null);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  const query = search.trim();
  const isSearching = query.length >= 2;

  const showToast = useCallback((message, tone = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, tone });
    Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
    }, TOAST_DURATION);
  }, [toastAnim]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const loadSuggested = useCallback(async () => {
    if (!uid) return;
    try {
      const rows = await listSuggestedFriends({ uid, profile, pageSize: 40 });
      setSuggested(Array.isArray(rows) ? rows : []);
      setLoadError(false);
    } catch (error) {
      setLoadError(true);
    }
  }, [profile, uid]);

  useEffect(() => {
    let active = true;
    loadSuggested().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadSuggested]);

  // Debounced search. The cancelled flag stops a slow older request from overwriting newer results.
  useEffect(() => {
    if (!uid || query.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const rows = await searchUsers(query, uid, 30);
        if (cancelled) return;
        setResults(Array.isArray(rows) ? rows : []);
        setSearchError(false);
      } catch (error) {
        if (cancelled) return;
        setResults([]);
        setSearchError(true);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, uid]);

  const baseRows = useMemo(() => {
    const rows = isSearching ? results : suggested;
    return rows.filter((person) => uidOf(person) && uidOf(person) !== uid);
  }, [isSearching, results, suggested, uid]);

  const filterCounts = useMemo(() => {
    const counts = {};
    FILTERS.forEach(({ key }) => {
      counts[key] = key === 'all'
        ? baseRows.length
        : baseRows.filter((person) => matchesFilter(person, key, profile)).length;
    });
    return counts;
  }, [baseRows, profile]);

  const visibleRows = useMemo(
    () => baseRows.filter((person) => matchesFilter(person, filter, profile)),
    [baseRows, filter, profile],
  );

  const filterReady = isFilterReady(filter, profile);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSuggested();
      if (isSearching && uid) {
        try {
          const rows = await searchUsers(query, uid, 30);
          setResults(Array.isArray(rows) ? rows : []);
          setSearchError(false);
        } catch (error) {
          setSearchError(true);
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  const retry = () => {
    if (isSearching) {
      onRefresh();
    } else {
      setLoading(true);
      loadSuggested().finally(() => setLoading(false));
    }
  };

  const clearSearch = () => setSearch('');

  const renderItem = useCallback(({ item }) => (
    <StudentRow
      person={item}
      currentUid={uid}
      currentProfile={profile}
      colors={colors}
      styles={styles}
      onNotify={showToast}
    />
  ), [colors, profile, showToast, styles, uid]);

  const hasError = isSearching ? searchError : loadError;

  const emptyCopy = (() => {
    if (hasError) {
      return {
        title: isSearching ? 'Search failed' : 'Could not load suggestions',
        description: 'Check your connection, then tap Try again.',
      };
    }
    if (filter !== 'all' && !filterReady) {
      return { title: 'Profile details missing', description: MISSING_PROFILE_HINT[filter] };
    }
    if (filter !== 'all' && baseRows.length > 0) {
      return {
        title: 'No matches for this filter',
        description: 'Switch to All to see everyone in these results.',
      };
    }
    if (isSearching) {
      return { title: 'No students found', description: 'Try another name, school, or department.' };
    }
    return {
      title: 'No suggestions yet',
      description: 'Complete your profile details to improve friend suggestions.',
    };
  })();

  const listTitle = isSearching
    ? `Search results (${visibleRows.length})`
    : `Suggested for you (${visibleRows.length})`;

  return (
    <ScreenShell title="Find Friends" subtitle="Discover classmates and friends in other schools" showBack loading={loading} scrollable={false}>
      <View style={styles.searchCard}>
        <Ionicons name="search-outline" size={18} color={colors.grey} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, school, department..."
          placeholderTextColor={colors.greyLight}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          accessibilityLabel="Search students"
        />
        {searching ? <ActivityIndicator size="small" color={colors.brand} /> : null}
        {search.length > 0 ? (
          <Pressable
            onPress={clearSearch}
            hitSlop={10}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.greyLight} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        style={styles.filtersList}
        contentContainerStyle={styles.filters}
        keyboardShouldPersistTaps="handled"
        extraData={filterCounts}
        renderItem={({ item }) => {
          const active = filter === item.key;
          const count = filterCounts[item.key];
          return (
            <Pressable
              style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.buttonPressed]}
              onPress={() => setFilter(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${item.label} filter, ${count} students`}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              {count > 0 ? (
                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                  <Text style={[styles.countText, active && styles.countTextActive]}>{count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      {filter !== 'all' && !filterReady ? (
        <View style={styles.hintBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.brandText} />
          <Text style={styles.hintText}>{MISSING_PROFILE_HINT[filter]}</Text>
        </View>
      ) : null}

      {hasError && visibleRows.length > 0 ? (
        <View style={styles.hintBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.brandText} />
          <Text style={styles.hintText}>Some results may be out of date.</Text>
          <Pressable onPress={retry} hitSlop={8} accessibilityRole="button" accessibilityLabel="Try again">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={visibleRows}
        keyExtractor={(item, index) => String(uidOf(item) || index)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
        contentContainerStyle={visibleRows.length ? styles.listContent : styles.emptyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={visibleRows.length ? <Text style={styles.sectionTitle}>{listTitle}</Text> : null}
        ListEmptyComponent={!loading ? (
          <View>
            <EmptyState title={emptyCopy.title} description={emptyCopy.description} />
            {hasError ? (
              <Pressable
                style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
                onPress={retry}
                accessibilityRole="button"
                accessibilityLabel="Try again"
              >
                <Ionicons name="refresh-outline" size={16} color={colors.onBrand} />
                <Text style={styles.smallButtonText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      />

      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <Ionicons
            name={toast.tone === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color={toast.tone === 'error' ? colors.greyLight : colors.green}
          />
          <Text style={styles.toastText} numberOfLines={2}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </ScreenShell>
  );
}

const createStyles = (c, s, r) => ({
  searchCard: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    backgroundColor: c.card,
    borderRadius: r['2xl'],
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: s.md,
    marginBottom: s.md,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    color: c.ink,
    fontSize: 14,
    paddingVertical: 10,
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // flexGrow: 0 stops the horizontal list from stretching vertically and pushing the results down.
  filtersList: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filters: {
    gap: s.sm,
    paddingBottom: s.md,
  },
  filterChip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: r.full,
    paddingHorizontal: s.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  filterChipActive: {
    backgroundColor: c.brand,
    borderColor: c.brand,
  },
  filterText: {
    color: c.grey,
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: c.onBrand,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.canvasLight,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    color: c.grey,
    fontSize: 10,
    fontWeight: '900',
  },
  countTextActive: {
    color: c.onBrand,
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    backgroundColor: c.brandLight,
    borderWidth: 1,
    borderColor: c.brandBorder,
    borderRadius: r.xl,
    paddingHorizontal: s.md,
    paddingVertical: s.sm,
    marginBottom: s.md,
  },
  hintText: {
    flex: 1,
    color: c.brandText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  retryText: {
    color: c.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  retryButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    borderRadius: r.full,
    backgroundColor: c.brand,
    paddingHorizontal: s.lg,
    marginTop: s.md,
  },
  sectionTitle: {
    color: c.ink,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: s.sm,
  },
  listContent: {
    paddingBottom: s['3xl'],
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 90,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.md,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r['2xl'],
    padding: s.md,
    marginBottom: s.sm,
    ...shadows.card,
  },
  cardPressed: {
    backgroundColor: c.canvasLight,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: c.brandLight,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: c.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: c.brandDark,
    fontSize: 18,
    fontWeight: '900',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
  },
  name: {
    flexShrink: 1,
    color: c.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  meta: {
    marginTop: 4,
    color: c.grey,
    fontSize: 12.5,
    lineHeight: 17,
  },
  interests: {
    marginTop: 4,
    color: c.brandText,
    fontSize: 11.5,
    fontWeight: '800',
  },
  tutorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.tealLight,
    borderRadius: r.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tutorText: {
    color: c.teal,
    fontSize: 10,
    fontWeight: '900',
  },
  smallButton: {
    minWidth: 76,
    height: 36,
    borderRadius: r.full,
    backgroundColor: c.brand,
    borderWidth: 1,
    borderColor: c.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: s.sm,
  },
  smallButtonText: {
    color: c.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: c.brandLight,
    borderColor: c.brandBorder,
  },
  secondaryButtonText: {
    color: c.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  sentButton: {
    backgroundColor: c.canvasLight,
    borderColor: c.border,
  },
  sentButtonText: {
    color: c.grey,
    fontSize: 12,
    fontWeight: '900',
  },
  friendButton: {
    backgroundColor: c.greenLight,
    borderColor: '#A7F3D0',
  },
  friendButtonText: {
    color: c.green,
    fontSize: 12,
    fontWeight: '900',
  },
  toast: {
    position: 'absolute',
    left: s.md,
    right: s.md,
    bottom: s.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    backgroundColor: c.ink,
    borderRadius: r.xl,
    paddingHorizontal: s.md,
    paddingVertical: 12,
    ...shadows.card,
  },
  toastText: {
    flex: 1,
    color: c.card,
    fontSize: 13,
    fontWeight: '700',
  },
});