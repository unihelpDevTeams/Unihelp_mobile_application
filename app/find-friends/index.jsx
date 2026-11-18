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
import { shadows } from '../../src/shared/theme';
import { useAuth } from '../../context/AuthContext';
import { searchUsers } from '../../src/shared/services/community';
import * as friendships from '../../src/shared/services/friendships';

const { RELATIONSHIP, listenRelationship, listSuggestedFriends, sendFriendRequest } = friendships;

// Optional service functions. If your friendships service exports any of these names, the
// matching action (Cancel request / Confirm / Delete) is performed right from the list.
// If none exist, the button simply opens the person's profile, where those actions live.
// Each one is called with { currentUid, targetUid, currentProfile, targetProfile }.
const pickFn = (...names) => names.map((name) => friendships[name]).find((fn) => typeof fn === 'function');
const cancelRequestFn = pickFn('cancelFriendRequest', 'cancelSentFriendRequest', 'withdrawFriendRequest');
const acceptRequestFn = pickFn('acceptFriendRequest', 'confirmFriendRequest');
const declineRequestFn = pickFn('declineFriendRequest', 'rejectFriendRequest', 'deleteFriendRequest', 'ignoreFriendRequest');

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
const TOAST_DURATION_WITH_ACTION = 4200;
const OVERRIDE_FALLBACK_MS = 4000;
const RELATIONSHIP_TIMEOUT_MS = 1500;
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_DEBOUNCE_CACHED_MS = 120;
const SEARCH_CACHE_LIMIT = 25;
const SKELETON_ROWS = [0, 1, 2, 3, 4];

/* ------------------------------ helpers ------------------------------ */

const nameOf = (person = {}) => {
  const possible = (
    person.displayName
    || person.display_name
    || person.username
    || person.name
    || (person.firstName ? `${person.firstName} ${person.lastName || ''}`.trim() : '')
    || (person.first_name ? `${person.first_name} ${person.last_name || ''}`.trim() : '')
    || (person.email ? person.email.split('@')[0] : '')
  );
  return (possible && String(possible).trim()) || 'Student';
};

const schoolOf = (person = {}) => (
  person.school
  || person.university
  || person.universityName
  || person.university_name
  || ''
);

const departmentOf = (person = {}) => (
  person.department
  || person.departmentName
  || person.department_name
  || ''
);

const metaOf = (person = {}) => [
  schoolOf(person),
  departmentOf(person),
  person.level,
].filter(Boolean).join(' | ');

const uidOf = (person = {}) => person.id || person.uid;
const norm = (value) => String(value || '').trim().toLowerCase();

const interestsOf = (person = {}) => (
  Array.isArray(person.interests) ? person.interests.map(norm).filter(Boolean) : []
);

const mySchoolOf = (profile) => schoolOf(profile || {});

const omitKey = (obj, key) => {
  const next = { ...obj };
  delete next[key];
  return next;
};

// Whether the current user has the profile data needed for a given filter.
const isFilterReady = (key, profile) => {
  if (key === 'all') return true;
  if (key === 'school') return !!mySchoolOf(profile);
  if (key === 'department') return !!departmentOf(profile);
  if (key === 'level') return !!profile?.level;
  if (key === 'interest') return interestsOf(profile).length > 0;
  return true;
};

const matchesFilter = (person, key, profile) => {
  if (key === 'all') return true;
  if (key === 'school') return !!schoolOf(person) && norm(schoolOf(person)) === norm(mySchoolOf(profile));
  if (key === 'department') return !!departmentOf(person) && norm(departmentOf(person)) === norm(departmentOf(profile));
  if (key === 'level') return !!person.level && norm(person.level) === norm(profile?.level);
  if (key === 'interest') {
    const mine = interestsOf(profile);
    return interestsOf(person).some((item) => mine.includes(item));
  }
  return true;
};

// Facebook-style "mutual friends" line, built from what students actually share.
const commonalityOf = (person, profile) => {
  const parts = [];
  const sameSchool = !!schoolOf(person) && norm(schoolOf(person)) === norm(mySchoolOf(profile));
  const sameDept = !!departmentOf(person) && norm(departmentOf(person)) === norm(departmentOf(profile));
  const sameLevel = !!person.level && norm(person.level) === norm(profile?.level);
  const mine = interestsOf(profile);
  const shared = mine.length ? interestsOf(person).filter((item) => mine.includes(item)).length : 0;

  if (sameDept) parts.push('Same department');
  else if (sameSchool) parts.push('Same school');
  if (shared > 0) parts.push(`${shared} shared interest${shared > 1 ? 's' : ''}`);
  if (sameLevel) parts.push('Same level');
  return parts.slice(0, 2).join(' | ');
};

/* ------------------------------ small components ------------------------------ */

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

// Gives the action area a quick spring "pop" whenever the relationship state changes,
// so the swap (Add friend -> Cancel request) feels alive instead of just blinking.
function Pop({ trigger, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(trigger);

  useEffect(() => {
    const before = previous.current;
    previous.current = trigger;
    if (before == null || before === trigger) return;
    scale.setValue(0.94);
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
  }, [trigger, scale]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

const ActionButton = memo(function ActionButton({
  label,
  icon,
  variant = 'primary',
  onPress,
  styles,
  colors,
  accessibilityLabel,
}) {
  const foreground = variant === 'primary'
    ? colors.onBrand
    : variant === 'friend'
      ? colors.green
      : colors.ink;
  const variantStyle = variant === 'primary'
    ? styles.btnPrimary
    : variant === 'friend'
      ? styles.btnFriend
      : styles.btnSecondary;

  return (
    <Pressable
      style={({ pressed }) => [styles.btn, variantStyle, pressed && styles.btnPressed]}
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
    >
      <Ionicons name={icon} size={16} color={foreground} />
      <Text style={[styles.btnText, { color: foreground }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
});

const SkeletonRow = memo(function SkeletonRow({ styles }) {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { width: '55%', height: 14 }]} />
        <View style={[styles.skeletonLine, { width: '80%', marginTop: 8 }]} />
        <View style={styles.actions}>
          <View style={styles.skeletonButton} />
          <View style={styles.skeletonButton} />
        </View>
      </View>
    </View>
  );
});

function SkeletonList({ styles }) {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.skeletonWrap, { opacity: pulse }]}>
      {SKELETON_ROWS.map((key) => <SkeletonRow key={key} styles={styles} />)}
    </Animated.View>
  );
}

/* ------------------------------ student row ------------------------------ */

const StudentRow = memo(function StudentRow({
  person,
  currentUid,
  currentProfile,
  mode,
  override,
  colors,
  styles,
  onAction,
  onDismiss,
  onOpenProfile,
  onRelationship,
}) {
  const targetUid = uidOf(person);
  const name = nameOf(person);
  const [relState, setRelState] = useState(RELATIONSHIP.NONE);
  const [ready, setReady] = useState(false);

  // One listener per visible row. If the first snapshot never arrives, fall back to "none"
  // after a short wait so the row never gets stuck on placeholders.
  useEffect(() => {
    if (!currentUid || !targetUid) return undefined;
    setReady(false);
    const timer = setTimeout(() => setReady(true), RELATIONSHIP_TIMEOUT_MS);
    const unsubscribe = listenRelationship(currentUid, targetUid, (next) => {
      clearTimeout(timer);
      const state = next?.state || RELATIONSHIP.NONE;
      setRelState(state);
      setReady(true);
      onRelationship?.(targetUid, state);
    });
    return () => {
      clearTimeout(timer);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUid, targetUid, onRelationship]);

  // Optimistic state wins until the real listener catches up.
  const state = override ?? (ready ? relState : null);

  const context = useMemo(() => commonalityOf(person, currentProfile), [person, currentProfile]);
  const interests = Array.isArray(person.interests) ? person.interests.slice(0, 3).join(', ') : '';

  let statusLine = context || interests;
  let statusIsAccent = false;
  if (state === RELATIONSHIP.RECEIVED) {
    statusLine = 'Sent you a friend request';
    statusIsAccent = true;
  } else if (state === RELATIONSHIP.SENT) {
    statusLine = 'Friend request sent';
    statusIsAccent = true;
  }

  const open = useCallback(() => onOpenProfile(targetUid), [onOpenProfile, targetUid]);
  const add = useCallback(() => onAction(person, 'add'), [onAction, person]);
  const cancel = useCallback(() => onAction(person, 'cancel'), [onAction, person]);
  const confirm = useCallback(() => onAction(person, 'confirm'), [onAction, person]);
  const remove = useCallback(() => onAction(person, 'delete'), [onAction, person]);
  const dismiss = useCallback(() => onDismiss(targetUid), [onDismiss, targetUid]);

  let buttons = null;
  if (state === null) {
    buttons = (
      <>
        <View style={styles.btnPlaceholder} />
        {mode === 'suggested' ? <View style={styles.btnPlaceholder} /> : null}
      </>
    );
  } else if (state === RELATIONSHIP.FRIENDS) {
    buttons = (
      <ActionButton
        label="Friends"
        icon="checkmark-circle"
        variant="friend"
        onPress={open}
        styles={styles}
        colors={colors}
        accessibilityLabel={`You are friends with ${name}. Open profile`}
      />
    );
  } else if (state === RELATIONSHIP.SENT) {
    buttons = (
      <ActionButton
        label={cancelRequestFn ? 'Cancel request' : 'Request sent'}
        icon={cancelRequestFn ? 'close' : 'time-outline'}
        variant="secondary"
        onPress={cancelRequestFn ? cancel : open}
        styles={styles}
        colors={colors}
        accessibilityLabel={cancelRequestFn ? `Cancel friend request to ${name}` : `Friend request sent to ${name}. Open profile`}
      />
    );
  } else if (state === RELATIONSHIP.RECEIVED) {
    buttons = (
      <>
        <ActionButton
          label="Confirm"
          icon="checkmark"
          variant="primary"
          onPress={acceptRequestFn ? confirm : open}
          styles={styles}
          colors={colors}
          accessibilityLabel={`Confirm friend request from ${name}`}
        />
        <ActionButton
          label="Delete"
          icon="trash-outline"
          variant="secondary"
          onPress={declineRequestFn ? remove : open}
          styles={styles}
          colors={colors}
          accessibilityLabel={`Delete friend request from ${name}`}
        />
      </>
    );
  } else {
    buttons = (
      <>
        <ActionButton
          label="Add friend"
          icon="person-add"
          variant="primary"
          onPress={add}
          styles={styles}
          colors={colors}
          accessibilityLabel={`Add ${name} as a friend`}
        />
        {mode === 'suggested' ? (
          <ActionButton
            label="Remove"
            icon="close"
            variant="secondary"
            onPress={dismiss}
            styles={styles}
            colors={colors}
            accessibilityLabel={`Remove ${name} from suggestions`}
          />
        ) : null}
      </>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`View ${name}'s profile`}
    >
      <Avatar person={person} styles={styles} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {person.verifiedTutor ? (
            <View style={styles.tutorPill}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.teal} />
              <Text style={styles.tutorText}>Tutor</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>{metaOf(person) || person.email || 'UniHelp student'}</Text>
        {statusLine ? (
          <View style={styles.statusRow}>
            <Ionicons
              name={statusIsAccent ? 'person-outline' : 'people-outline'}
              size={13}
              color={statusIsAccent ? colors.brand : colors.brandText}
            />
            <Text style={[styles.statusText, statusIsAccent && styles.statusTextAccent]} numberOfLines={1}>
              {statusLine}
            </Text>
          </View>
        ) : null}
        <Pop trigger={state} style={styles.actions}>
          {buttons}
        </Pop>
      </View>
    </Pressable>
  );
});

/* ------------------------------ screen ------------------------------ */

export default function FindFriendsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const uid = user?.uid || profile?.uid;

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filter, setFilter] = useState('all');
  const [suggested, setSuggested] = useState([]);
  const [searchState, setSearchState] = useState({ key: '', rows: [], error: false });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState(null);
  // Optimistic relationship overrides: { [uid]: { state, id } }
  const [overrides, setOverrides] = useState({});
  const [blocked, setBlocked] = useState({});
  const [dismissed, setDismissed] = useState({});

  const mounted = useRef(true);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const suggestRequest = useRef(0);
  const latestSearchKey = useRef('');
  const searchCache = useRef(new Map());
  const actionQueue = useRef({});
  const overrideCounter = useRef(0);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const query = search.trim();
  const queryKey = query.toLowerCase();
  const isSearching = query.length >= 2;
  const mode = isSearching ? 'search' : 'suggested';
  latestSearchKey.current = isSearching ? queryKey : '';

  // Only refetch suggestions when something that affects them changes, not on every
  // auth-context object refresh.
  const profileKey = [
    uid,
    mySchoolOf(profile),
    departmentOf(profile),
    profile?.level,
    interestsOf(profile).join(','),
  ].join('|');

  /* ---- toast ---- */

  const hideToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.timing(toastAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      // An interrupted animation means a newer toast took over; don't wipe it.
      if (finished && mounted.current) setToast(null);
    });
  }, [toastAnim]);

  const showToast = useCallback((message, tone = 'success', action = null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone, action });
    Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(hideToast, action ? TOAST_DURATION_WITH_ACTION : TOAST_DURATION);
  }, [hideToast, toastAnim]);

  /* ---- suggestions ---- */

  const loadSuggested = useCallback(async () => {
    if (!uid) return;
    const requestId = ++suggestRequest.current;
    try {
      const rows = await listSuggestedFriends({ uid, profile: profileRef.current, pageSize: 40 });
      if (requestId !== suggestRequest.current || !mounted.current) return;
      setSuggested(Array.isArray(rows) ? rows : []);
      setLoadError(false);
    } catch (error) {
      if (requestId !== suggestRequest.current || !mounted.current) return;
      setLoadError(true);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    loadSuggested().finally(() => {
      if (mounted.current) setLoading(false);
    });
  }, [loadSuggested, profileKey, uid]);

  /* ---- search (debounced, cached, race-safe) ---- */

  const runSearch = useCallback(async (key, text) => {
    if (!uid) return;
    try {
      const rows = await searchUsers(text, uid, 30);
      const list = Array.isArray(rows) ? rows : [];
      const cache = searchCache.current;
      cache.delete(key);
      cache.set(key, list);
      if (cache.size > SEARCH_CACHE_LIMIT) cache.delete(cache.keys().next().value);
      if (mounted.current && latestSearchKey.current === key) {
        setSearchState({ key, rows: list, error: false });
      }
    } catch (error) {
      if (mounted.current && latestSearchKey.current === key) {
        setSearchState({ key, rows: searchCache.current.get(key) || [], error: true });
      }
    }
  }, [uid]);

  useEffect(() => {
    if (!uid || !isSearching) {
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);
    const delay = searchCache.current.has(queryKey) ? SEARCH_DEBOUNCE_CACHED_MS : SEARCH_DEBOUNCE_MS;

    const timer = setTimeout(async () => {
      await runSearch(queryKey, query);
      if (!cancelled && mounted.current) setSearching(false);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // query is derived from queryKey for the trimmed text; both change together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, uid, isSearching, runSearch]);

  // Cached results show instantly while a fresh request revalidates in the background.
  const searchRows = isSearching
    ? (searchState.key === queryKey ? searchState.rows : searchCache.current.get(queryKey) || null)
    : null;
  const searchError = isSearching && searchState.key === queryKey && searchState.error;

  /* ---- relationship callbacks ---- */

  const handleRelationship = useCallback((targetUid, state) => {
    setOverrides((prev) => (
      prev[targetUid] && prev[targetUid].state === state ? omitKey(prev, targetUid) : prev
    ));
    setBlocked((prev) => {
      const isBlocked = !!prev[targetUid];
      if (state === RELATIONSHIP.BLOCKED) return isBlocked ? prev : { ...prev, [targetUid]: true };
      return isBlocked ? omitKey(prev, targetUid) : prev;
    });
  }, []);

  const clearOverride = useCallback((targetUid, id) => {
    if (!mounted.current) return;
    setOverrides((prev) => (
      prev[targetUid] && (id === undefined || prev[targetUid].id === id) ? omitKey(prev, targetUid) : prev
    ));
  }, []);

  // Actions on the same person run one after another so rapid taps can't race each other.
  const enqueue = useCallback((targetUid, task) => {
    const previous = actionQueue.current[targetUid] || Promise.resolve();
    const next = previous.then(task, task);
    actionQueue.current[targetUid] = next;
    next.then(() => {
      if (actionQueue.current[targetUid] === next) delete actionQueue.current[targetUid];
    });
    return next;
  }, []);

  const openProfile = useCallback((targetUid) => {
    if (targetUid) router.push(`/view-user-profile/${targetUid}`);
  }, [router]);

  const handleAction = useCallback((person, kind) => {
    const targetUid = uidOf(person);
    if (!uid || !targetUid) return;
    const name = nameOf(person);
    const payload = {
      currentUid: uid,
      targetUid,
      currentProfile: profileRef.current,
      targetProfile: person,
    };

    const plans = {
      add: {
        next: RELATIONSHIP.SENT,
        run: () => sendFriendRequest(payload),
        message: `Friend request sent to ${name}`,
        failure: 'Could not send the request. Try again.',
      },
      cancel: {
        next: RELATIONSHIP.NONE,
        run: cancelRequestFn && (() => cancelRequestFn(payload)),
        message: 'Friend request cancelled',
        failure: 'Could not cancel the request. Try again.',
      },
      confirm: {
        next: RELATIONSHIP.FRIENDS,
        run: acceptRequestFn && (() => acceptRequestFn(payload)),
        message: `You and ${name} are now friends`,
        failure: 'Could not confirm the request. Try again.',
      },
      delete: {
        next: RELATIONSHIP.NONE,
        run: declineRequestFn && (() => declineRequestFn(payload)),
        message: 'Friend request deleted',
        failure: 'Could not delete the request. Try again.',
      },
    };

    const plan = plans[kind];
    if (!plan) return;
    if (!plan.run) {
      openProfile(targetUid);
      return;
    }

    // Instant feedback: flip the UI first, talk to the server second.
    const id = ++overrideCounter.current;
    setOverrides((prev) => ({ ...prev, [targetUid]: { state: plan.next, id } }));

    const undo = kind === 'add' && cancelRequestFn
      ? { label: 'Undo', onPress: () => handleAction(person, 'cancel') }
      : null;
    showToast(plan.message, 'success', undo);

    enqueue(targetUid, async () => {
      try {
        await plan.run();
        // The listener normally clears the override; this is only a safety net.
        setTimeout(() => clearOverride(targetUid, id), OVERRIDE_FALLBACK_MS);
      } catch (error) {
        clearOverride(targetUid, id);
        if (mounted.current) showToast(error?.message || plan.failure, 'error');
      }
    });
  }, [clearOverride, enqueue, openProfile, showToast, uid]);

  const handleDismiss = useCallback((targetUid) => {
    setDismissed((prev) => (prev[targetUid] ? prev : { ...prev, [targetUid]: true }));
  }, []);

  /* ---- derived lists ---- */

  const baseRows = useMemo(() => {
    const rows = isSearching ? (searchRows || []) : suggested;
    return rows.filter((person) => {
      const id = uidOf(person);
      if (!id || id === uid || blocked[id]) return false;
      if (!isSearching && dismissed[id]) return false;
      return true;
    });
  }, [blocked, dismissed, isSearching, searchRows, suggested, uid]);

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
  const hasError = isSearching ? searchError : loadError;
  const showSkeleton = isSearching
    ? searchRows === null && !searchError
    : loading && suggested.length === 0;

  /* ---- refresh / retry ---- */

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadSuggested(),
        isSearching ? runSearch(queryKey, query) : Promise.resolve(),
      ]);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [isSearching, loadSuggested, query, queryKey, runSearch]);

  const retry = useCallback(() => {
    if (isSearching) {
      onRefresh();
    } else {
      setLoading(true);
      loadSuggested().finally(() => {
        if (mounted.current) setLoading(false);
      });
    }
  }, [isSearching, loadSuggested, onRefresh]);

  const clearSearch = useCallback(() => setSearch(''), []);

  /* ---- render ---- */

  const renderItem = useCallback(({ item }) => (
    <StudentRow
      person={item}
      currentUid={uid}
      currentProfile={profile}
      mode={mode}
      override={overrides[uidOf(item)]?.state}
      colors={colors}
      styles={styles}
      onAction={handleAction}
      onDismiss={handleDismiss}
      onOpenProfile={openProfile}
      onRelationship={handleRelationship}
    />
  ), [colors, handleAction, handleDismiss, handleRelationship, mode, openProfile, overrides, profile, styles, uid]);

  const renderFilter = useCallback(({ item }) => {
    const active = filter === item.key;
    const count = filterCounts[item.key];
    return (
      <Pressable
        style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.btnPressed]}
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
  }, [filter, filterCounts, styles]);

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
    if (suggested.length > 0) {
      return { title: 'You are all caught up', description: 'Pull down to refresh for new suggestions.' };
    }
    return {
      title: 'No suggestions yet',
      description: 'Complete your profile details to improve friend suggestions.',
    };
  })();

  const listTitle = isSearching
    ? `Search results (${visibleRows.length})`
    : `People you may know (${visibleRows.length})`;

  return (
    <ScreenShell title="Find Friends" subtitle="Discover classmates and friends in other schools" showBack scrollable={false}>
      <View style={[styles.searchCard, searchFocused && styles.searchCardFocused]}>
        <Ionicons name="search" size={18} color={searchFocused ? colors.brand : colors.grey} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
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
        extraData={`${filter}|${JSON.stringify(filterCounts)}`}
        renderItem={renderFilter}
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

      {showSkeleton ? (
        <SkeletonList styles={styles} />
      ) : (
        <FlatList
          data={visibleRows}
          extraData={overrides}
          keyExtractor={(item, index) => String(uidOf(item) || index)}
          renderItem={renderItem}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          )}
          contentContainerStyle={visibleRows.length ? styles.listContent : styles.emptyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={visibleRows.length ? <Text style={styles.sectionTitle}>{listTitle}</Text> : null}
          ListEmptyComponent={(
            <View>
              <EmptyState title={emptyCopy.title} description={emptyCopy.description} />
              {hasError ? (
                <Pressable
                  style={({ pressed }) => [styles.retryButton, pressed && styles.btnPressed]}
                  onPress={retry}
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.onBrand} />
                  <Text style={styles.btnTextOnBrand}>Try again</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />
      )}

      {toast ? (
        <Animated.View
          pointerEvents={toast.action ? 'auto' : 'none'}
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
          {toast.action ? (
            <Pressable
              hitSlop={10}
              onPress={() => {
                toast.action.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
            >
              <Text style={styles.toastAction}>{toast.action.label}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </ScreenShell>
  );
}

const createStyles = (c, s, r) => ({
  searchCard: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    backgroundColor: c.surface,
    borderRadius: r.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: s.md,
    marginBottom: s.md,
  },
  searchCardFocused: {
    backgroundColor: c.card,
    borderColor: c.brand,
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
  btnTextOnBrand: {
    color: c.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: {
    color: c.ink,
    fontSize: 16,
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
    alignItems: 'flex-start',
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
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: c.brandLight,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: c.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: c.brandDark,
    fontSize: 22,
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
    fontSize: 16,
    fontWeight: '900',
  },
  meta: {
    marginTop: 3,
    color: c.grey,
    fontSize: 12.5,
    lineHeight: 17,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusText: {
    flexShrink: 1,
    color: c.brandText,
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextAccent: {
    color: c.brand,
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
  actions: {
    flexDirection: 'row',
    gap: s.sm,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: s.sm,
  },
  btnPrimary: {
    backgroundColor: c.brand,
    borderColor: c.brand,
  },
  btnSecondary: {
    backgroundColor: c.canvasLight,
    borderColor: c.border,
  },
  btnFriend: {
    backgroundColor: c.greenLight,
    borderColor: '#A7F3D0',
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  btnText: {
    fontSize: 13,
    fontWeight: '900',
  },
  btnPlaceholder: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: c.canvasLight,
  },
  skeletonWrap: {
    flex: 1,
  },
  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: c.canvasLight,
  },
  skeletonLine: {
    height: 11,
    borderRadius: 6,
    backgroundColor: c.canvasLight,
  },
  skeletonButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: c.canvasLight,
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
  toastAction: {
    color: c.card,
    fontSize: 13,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
});