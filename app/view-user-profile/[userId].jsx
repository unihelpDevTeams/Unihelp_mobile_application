import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EvosAura from '../../src/shared/components/EvosAura';
import ConfirmDialog from '../../src/shared/components/ConfirmDialog';
import { PageLoader } from '../../src/shared/components/AILoaders';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { isPremiumActive } from '../../src/shared/services/premium';
import { GENDER_OPTIONS, parseDateOfBirth } from '../../src/signup/validation';
import {
  RELATIONSHIP,
  acceptFriendRequest,
  blockStudent,
  cancelFriendRequest,
  createOrOpenFriendConversation,
  declineFriendRequest,
  fetchFriendStats,
  fetchUserFriends,
  listenRelationship,
  removeFriend,
  sendFriendRequest,
  sendMessageRequest,
  unblockStudent,
  getUserProfileById,
} from '../../src/shared/services/friendships';

/* -------------------------------------------------------------------------- */
/*                         Constants & in-memory caches                       */
/* -------------------------------------------------------------------------- */

const INTRO_MAX = 500;
const FRIENDS_PAGE_SIZE = 12;
const REFRESH_COOLDOWN_MS = 5000;
const RELATIONSHIP_TIMEOUT_MS = 4000;

// Re-opening a profile (or coming back from a chat) used to re-read the profile, the stats and the
// first page of friends every single time. These caches make those repeat visits free.
const PROFILE_TTL_MS = 2 * 60 * 1000;
const STATS_TTL_MS = 60 * 1000;
const FRIENDS_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX_ENTRIES = 20;

const PROFILE_CACHE = new Map();
const STATS_CACHE = new Map();
const FRIENDS_CACHE = new Map();
const RELATIONSHIP_CACHE = new Map();
const INTRO_SENT = new Set(); // session-only: stops repeated message requests to the same student

const writeCache = (map, key, value) => {
  if (!key) return;
  map.delete(key);
  map.set(key, { value, ts: Date.now() });
  while (map.size > CACHE_MAX_ENTRIES) map.delete(map.keys().next().value);
};
const isFresh = (entry, ttl) => Boolean(entry && Date.now() - entry.ts < ttl);

export default function ViewUserProfile() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { user, profile: currentProfile } = useAuth();
  const { colors } = useTheme();

  // Route params can be string | string[]
  const rawId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const targetUid = String(rawId || '');
  const isSelf = Boolean(user?.uid) && user.uid === targetUid;
  const selfProfileReady = isSelf && Boolean(currentProfile);
  const relationshipKey = `${user?.uid || ''}:${targetUid}`;

  const seedProfile = () => (selfProfileReady ? currentProfile : PROFILE_CACHE.get(targetUid)?.value || null);

  const [profile, setProfile] = useState(seedProfile);
  const [loading, setLoading] = useState(() => !seedProfile());
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [relationship, setRelationship] = useState(() => RELATIONSHIP_CACHE.get(relationshipKey) || { state: RELATIONSHIP.NONE });
  const [relationshipLoaded, setRelationshipLoaded] = useState(() => isSelf || RELATIONSHIP_CACHE.has(relationshipKey));
  const [busy, setBusy] = useState('');
  const [messageModal, setMessageModal] = useState(false);
  const [intro, setIntro] = useState('');
  const [messageError, setMessageError] = useState('');
  const [introSent, setIntroSent] = useState(() => INTRO_SENT.has(relationshipKey));
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [friendStats, setFriendStats] = useState(() => STATS_CACHE.get(targetUid)?.value || null);
  const [profileTab, setProfileTab] = useState('information');
  const [friends, setFriends] = useState([]);
  const [friendsTotal, setFriendsTotal] = useState(null);
  const [friendsCursor, setFriendsCursor] = useState(null);
  const [friendsHasMore, setFriendsHasMore] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsLoadingMore, setFriendsLoadingMore] = useState(false);
  const [friendsUnavailable, setFriendsUnavailable] = useState(false);
  const [friendsError, setFriendsError] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [imageViewer, setImageViewer] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const targetRef = useRef(targetUid);
  targetRef.current = targetUid;
  const friendsRequestRef = useRef(0);
  const lastRefreshRef = useRef(0);
  const wasFriendRef = useRef(null);

  // Theme-safe danger colours (the file mixed colors.error / colors.red / colors.danger)
  const danger = colors.error ?? colors.danger ?? colors.red;
  const dangerSoft = colors.dangerLight ?? colors.redLight ?? colors.surfaceSecondary;
  const success = colors.success ?? colors.brand;
  const successSoft = colors.successLight ?? colors.brandLight;

  /* ---------- profile ---------- */

  // Your own profile is already in memory: zero reads.
  useEffect(() => {
    if (!selfProfileReady) return;
    setProfile(currentProfile);
    setLoading(false);
    setLoadError(false);
  }, [selfProfileReady, currentProfile]);

  // Other students: serve a fresh cache hit instantly, otherwise show the cached copy while refreshing.
  useEffect(() => {
    if (!targetUid) {
      setLoading(false); // previously stayed on the loader forever without a userId
      return undefined;
    }
    if (selfProfileReady) return undefined;

    const entry = PROFILE_CACHE.get(targetUid);
    setLoadError(false);
    if (entry) {
      setProfile(entry.value);
      setLoading(false);
      if (reloadKey === 0 && isFresh(entry, PROFILE_TTL_MS)) return undefined;
    } else {
      setProfile(null);
      setLoading(true);
    }

    let cancelled = false;
    getUserProfileById(targetUid)
      .then((data) => {
        if (cancelled) return;
        if (data) writeCache(PROFILE_CACHE, targetUid, data);
        else PROFILE_CACHE.delete(targetUid);
        setProfile(data || null);
      })
      .catch((error) => {
        console.warn('Failed to load user profile', error);
        if (!cancelled && !entry) setLoadError(true); // keep showing the cached copy if we have one
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetUid, reloadKey, selfProfileReady]);

  // Silent re-read used after the friendship changes (e.g. email becomes visible to friends).
  const refreshProfile = useCallback(async () => {
    if (!targetUid || selfProfileReady) return;
    try {
      const data = await getUserProfileById(targetUid);
      if (targetRef.current !== targetUid || !data) return;
      writeCache(PROFILE_CACHE, targetUid, data);
      setProfile(data);
    } catch (error) {
      console.warn('Failed to refresh user profile', error);
    }
  }, [targetUid, selfProfileReady]);

  /* ---------- relationship ---------- */

  useEffect(() => {
    const cached = RELATIONSHIP_CACHE.get(relationshipKey);
    setRelationship(cached || { state: RELATIONSHIP.NONE });
    setIntroSent(INTRO_SENT.has(relationshipKey));
    if (!user?.uid || !targetUid || isSelf) {
      setRelationshipLoaded(true);
      return undefined;
    }
    setRelationshipLoaded(Boolean(cached));

    // Never leave the screen on the loader if the listener is slow or fails.
    const fallback = setTimeout(() => setRelationshipLoaded(true), RELATIONSHIP_TIMEOUT_MS);
    const unsubscribe = listenRelationship(user.uid, targetUid, (next) => {
      RELATIONSHIP_CACHE.set(relationshipKey, next);
      setRelationship((prev) =>
        prev.state === next.state && prev.request?.id === next.request?.id && prev.blockedByMe === next.blockedByMe ? prev : next
      );
      setRelationshipLoaded(true);
    });
    return () => {
      clearTimeout(fallback);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [relationshipKey, targetUid, user?.uid, isSelf]);

  const isBlocked = relationship.state === RELATIONSHIP.BLOCKED;
  const blockedByMe = isBlocked && relationship.blockedByMe;
  const isFriend = relationship.state === RELATIONSHIP.FRIENDS;

  /* ---------- friend stats ---------- */

  const loadStats = useCallback(
    async (force = false) => {
      if (!targetUid) return;
      const entry = STATS_CACHE.get(targetUid);
      setFriendStats(entry ? entry.value : null);
      if (!force && isFresh(entry, STATS_TTL_MS)) return;
      try {
        const stats = await fetchFriendStats(targetUid);
        if (targetRef.current !== targetUid) return;
        writeCache(STATS_CACHE, targetUid, stats);
        setFriendStats(stats);
      } catch (error) {
        console.warn('Failed to load friend stats', error);
        if (targetRef.current === targetUid && !entry) setFriendStats({ friendCount: null, mutualCount: 0 });
      }
    },
    [targetUid]
  );

  // Coming back from a chat no longer refetches: the cache is honoured for a minute.
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  /* ---------- friends list (lazy: only when the Friends tab is opened) ---------- */

  const applyFriendsState = (state) => {
    setFriends(state.friends);
    setFriendsTotal(state.total);
    setFriendsCursor(state.cursor);
    setFriendsHasMore(state.hasMore);
    setFriendsUnavailable(state.unavailable);
    setFriendsError(false);
  };

  const loadFriends = useCallback(
    async ({ force = false } = {}) => {
      if (!targetUid) return;
      const entry = FRIENDS_CACHE.get(targetUid);
      if (entry) applyFriendsState(entry.value);
      if (!force && isFresh(entry, FRIENDS_TTL_MS)) return;

      const token = ++friendsRequestRef.current;
      if (!entry) {
        setFriends([]);
        setFriendsTotal(null);
        setFriendsUnavailable(false);
      }
      setFriendsLoading(!entry);
      setFriendsError(false);
      try {
        const page = await fetchUserFriends(targetUid, { pageSize: FRIENDS_PAGE_SIZE });
        if (token !== friendsRequestRef.current || targetRef.current !== targetUid) return;
        const state = {
          friends: page.friends || [],
          total: Number(page.total) || 0,
          cursor: page.nextCursor || null,
          hasMore: Boolean(page.hasMore),
          unavailable: false,
        };
        writeCache(FRIENDS_CACHE, targetUid, state);
        applyFriendsState(state);
      } catch (error) {
        if (token !== friendsRequestRef.current || targetRef.current !== targetUid) return;
        if (error?.status === 403) {
          const state = { friends: [], total: 0, cursor: null, hasMore: false, unavailable: true };
          writeCache(FRIENDS_CACHE, targetUid, state);
          applyFriendsState(state);
        } else if (!entry) {
          setFriends([]);
          setFriendsError(true);
        }
      } finally {
        if (token === friendsRequestRef.current) setFriendsLoading(false);
      }
    },
    [targetUid]
  );

  useEffect(() => {
    if (profileTab !== 'friends' || isBlocked || !relationshipLoaded) return;
    loadFriends();
  }, [profileTab, isBlocked, relationshipLoaded, loadFriends]);

  const loadMoreFriends = async () => {
    if (!friendsCursor || !friendsHasMore || friendsLoadingMore) return;
    const uid = targetUid;
    setFriendsLoadingMore(true);
    try {
      const page = await fetchUserFriends(uid, { cursor: friendsCursor, pageSize: FRIENDS_PAGE_SIZE });
      if (targetRef.current !== uid) return;
      const seen = new Set(friends.map((friend) => friend.uid));
      const merged = [...friends, ...(page.friends || []).filter((friend) => !seen.has(friend.uid))];
      const state = {
        friends: merged,
        total: Number(page.total) || friendsTotal || 0,
        cursor: page.nextCursor || null,
        hasMore: Boolean(page.hasMore),
        unavailable: false,
      };
      writeCache(FRIENDS_CACHE, uid, state);
      applyFriendsState(state);
    } catch (error) {
      setFeedback({ type: 'error', text: error?.message || 'Could not load more friends.' });
    } finally {
      setFriendsLoadingMore(false);
    }
  };

  // When the friendship starts/ends, the counts, the friends list and what the server reveals
  // (like the email) are out of date: drop those caches and refresh just what is on screen.
  useEffect(() => {
    if (!relationshipLoaded || isSelf) return;
    if (wasFriendRef.current !== null && wasFriendRef.current !== isFriend) {
      STATS_CACHE.delete(targetUid);
      FRIENDS_CACHE.delete(targetUid);
      PROFILE_CACHE.delete(targetUid);
      loadStats(true);
      refreshProfile();
      if (profileTab === 'friends') loadFriends({ force: true });
    }
    wasFriendRef.current = isFriend;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFriend, relationshipLoaded]);

  const onRefresh = useCallback(async () => {
    if (Date.now() - lastRefreshRef.current < REFRESH_COOLDOWN_MS) return; // protects against read spam
    lastRefreshRef.current = Date.now();
    setRefreshing(true);
    try {
      FRIENDS_CACHE.delete(targetUid);
      await Promise.all([
        refreshProfile(),
        loadStats(true),
        profileTab === 'friends' && !isBlocked ? loadFriends({ force: true }) : null,
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [targetUid, refreshProfile, loadStats, loadFriends, profileTab, isBlocked]);

  /* ---------- derived ---------- */

  const friendCount = Number(friendStats?.friendCount ?? profile?.friendCount ?? 0) || 0;
  const mutualCount = Number(friendStats?.mutualCount ?? 0) || 0;

  const avatarUrl = String(profile?.photo || profile?.photoURL || '').trim();
  const avatarThumbUrl = String(profile?.photoThumb || avatarUrl).trim();
  const coverUrl = String(profile?.coverPhoto || profile?.cover || profile?.coverUrl || profile?.banner || '').trim();

  // Keyed on the URL that is actually displayed (it used to watch a different one).
  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarThumbUrl]);
  useEffect(() => {
    setCoverFailed(false);
  }, [coverUrl]);

  // Success messages fade out on their own; errors stay until the next action.
  useEffect(() => {
    if (feedback?.type !== 'success') return undefined;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const initials = useMemo(() => {
    const source = profile?.username || profile?.email || 'S';
    return (
      source
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || 'S'
    );
  }, [profile]);

  const premiumActive = isPremiumActive(profile);
  // Email is private: only the owner and friends see it.
  const showEmail = !isBlocked && !!profile?.email && (isSelf || isFriend);

  const academicItems = [
    { icon: 'school-outline', label: 'Institution', value: profile?.school },
    { icon: 'library-outline', label: 'Department', value: profile?.department },
    { icon: 'ribbon-outline', label: 'Level', value: profile?.level },
    { icon: 'location-outline', label: 'Location', value: profile?.location },
  ].filter((item) => String(item.value || '').trim());

  const rawDateOfBirth = profile?.dateOfBirth || profile?.date_of_birth || '';
  const parsedBirthDate = parseDateOfBirth(rawDateOfBirth);
  const personalItems = isSelf
    ? [
        {
          icon: 'person-circle-outline',
          label: 'Gender',
          value: GENDER_OPTIONS.find((item) => item.value === profile?.gender)?.label || '',
        },
        {
          icon: 'calendar-outline',
          label: 'Date of birth',
          value: parsedBirthDate && !Number.isNaN(parsedBirthDate.getTime())
            ? parsedBirthDate.toLocaleDateString()
            : '',
        },
      ].filter((item) => String(item.value || '').trim())
    : [];

  // Don't hardcode a department in the placeholder: build it from the current student.
  const introPlaceholder = `Hi, I'm ${currentProfile?.username || 'a fellow student'}${
    currentProfile?.department ? ` from ${currentProfile.department}` : ''
  }...`;

  // Wait for the relationship before showing a profile, so a blocked student's details never flash
  // and the wrong action (e.g. "Add friend" for an existing friend) never appears.
  const showLoader = loading || (Boolean(profile) && !isSelf && !relationshipLoaded);

  /* ---------- actions ---------- */

  const runAction = useCallback(async (key, task, successText) => {
    setBusy(key);
    setFeedback(null);
    try {
      await task();
      if (successText) setFeedback({ type: 'success', text: successText });
    } catch (error) {
      setFeedback({ type: 'error', text: error?.message || 'Something went wrong. Please try again.' });
    } finally {
      setBusy('');
    }
  }, []);

  const openChat = () =>
    runAction('message', async () => {
      const conversationId = await createOrOpenFriendConversation({
        currentUser: user,
        otherUser: { id: targetUid, ...profile },
        currentProfile,
        otherProfile: profile,
      });
      router.navigate(`/messages/${conversationId}`);
    });

  const closeMessageModal = () => {
    Keyboard.dismiss();
    setMessageModal(false);
    setMessageError('');
  };

  // Errors show inside the sheet, and an empty intro can't be sent.
  const submitMessageRequest = async () => {
    const text = intro.trim();
    if (!text) {
      setMessageError('Write a short introduction first.');
      return;
    }
    setBusy('messageRequest');
    setMessageError('');
    try {
      await sendMessageRequest({
        currentUid: user.uid,
        targetUid,
        message: text,
        currentProfile,
        targetProfile: profile,
      });
      INTRO_SENT.add(relationshipKey);
      setIntroSent(true);
      setIntro('');
      closeMessageModal();
      setFeedback({ type: 'success', text: 'Message request sent.' });
    } catch (error) {
      setMessageError(error?.message || 'Could not send the request. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const confirmRemove = () =>
    setConfirmDialog({
      title: 'Remove friend?',
      message: 'This student will no longer be able to chat with you freely.',
      confirmLabel: 'Remove',
      variant: 'destructive',
      icon: 'person-remove-outline',
      onConfirm: () =>
        runAction('remove', () => removeFriend({ currentUid: user.uid, friendUid: targetUid, currentProfile }), 'Friend removed.'),
    });

  const confirmBlock = () =>
    setConfirmDialog({
      title: 'Block this student?',
      message: 'They will not be able to send requests or message you until you unblock them.',
      confirmLabel: 'Block',
      variant: 'destructive',
      icon: 'ban-outline',
      onConfirm: () =>
        runAction(
          'block',
          () => blockStudent({ currentUid: user.uid, targetUid, currentProfile, targetProfile: profile }),
          'Student blocked.',
        ),
    });

  const handleUnblock = () =>
    runAction('unblock', () => unblockStudent({ currentUid: user.uid, targetUid }), 'Student unblocked.');

  const anyBusy = !!busy;

  const renderActions = () => {
    if (isSelf || isBlocked) return null;
    const request = relationship.request;

    if (relationship.state === RELATIONSHIP.SENT) {
      return (
        <View style={styles.actionContainer}>
          <View style={[styles.badgeSent, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="time-outline" size={16} color={colors.brand} />
            <Text style={[styles.badgeSentText, { color: colors.brand }]}>Request sent</Text>
          </View>
          <ActionButton
            label="Cancel request"
            icon="close-circle-outline"
            variant="ghost"
            loading={busy === 'cancel'}
            disabled={anyBusy || !request?.id}
            onPress={() => runAction('cancel', () => cancelFriendRequest({ requestId: request.id, currentUid: user.uid }), 'Request cancelled.')}
          />
        </View>
      );
    }

    if (relationship.state === RELATIONSHIP.RECEIVED) {
      return (
        <View style={styles.actionContainer}>
          <ActionButton
            label="Accept"
            icon="checkmark-circle-outline"
            variant="primary"
            loading={busy === 'accept'}
            disabled={anyBusy || !request}
            onPress={() => runAction('accept', () => acceptFriendRequest({ request, currentUid: user.uid, currentProfile }), 'You are now friends.')}
          />
          <ActionButton
            label="Decline"
            icon="close-outline"
            variant="secondary"
            loading={busy === 'decline'}
            disabled={anyBusy || !request}
            onPress={() => runAction('decline', () => declineFriendRequest({ request, currentUid: user.uid, currentProfile }), 'Request declined.')}
          />
        </View>
      );
    }

    if (isFriend) {
      return (
        <View style={styles.actionContainer}>
          <ActionButton label="Message" icon="chatbubble-ellipses-outline" variant="primary" loading={busy === 'message'} disabled={anyBusy} onPress={openChat} />
          <ActionButton label="Remove" icon="person-remove-outline" variant="secondary" loading={busy === 'remove'} disabled={anyBusy} onPress={confirmRemove} />
          <ActionButton icon="ban-outline" variant="icon" accessibilityLabel="Block student" loading={busy === 'block'} disabled={anyBusy} onPress={confirmBlock} />
        </View>
      );
    }

    return (
      <View style={styles.actionContainer}>
        <ActionButton
          label="Add friend"
          icon="person-add-outline"
          variant="primary"
          loading={busy === 'add'}
          disabled={anyBusy}
          onPress={() =>
            runAction(
              'add',
              () => sendFriendRequest({ currentUid: user.uid, targetUid, currentProfile, targetProfile: profile }),
              'Friend request sent.',
            )
          }
        />
        <ActionButton
          label={introSent ? 'Requested' : 'Message'}
          icon={introSent ? 'checkmark-done-outline' : 'mail-outline'}
          variant="secondary"
          disabled={anyBusy || introSent}
          onPress={() => setMessageModal(true)}
        />
        <ActionButton icon="ban-outline" variant="icon" accessibilityLabel="Block student" loading={busy === 'block'} disabled={anyBusy} onPress={confirmBlock} />
      </View>
    );
  };

  /* ---------- render ---------- */

  const cardStyle = { backgroundColor: colors.card, borderColor: colors.borderDefault, shadowColor: colors.shadow };
  const subtitle = [
    profile?.school || profile?.university || profile?.universityName,
    profile?.department || profile?.departmentName,
    profile?.level,
  ].filter(Boolean).join(' • ');
  const profileName = isBlocked
    ? 'Blocked student'
    : (
        profile?.displayName
        || profile?.display_name
        || profile?.username
        || profile?.name
        || (profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : '')
        || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : '')
        || (profile?.email ? profile.email.split('@')[0] : '')
        || 'Student'
      );
  const friendsTabCount = friendsTotal ?? friendCount;

  return (
    <ScreenShell title="Profile" showBack>
      {showLoader ? (
        <View style={[styles.loadingCard, cardStyle]}>
          <PageLoader label="Fetching student profile..." />
        </View>
      ) : profile ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
        >
          <View style={styles.headerContainer}>
            <Pressable
              style={[styles.coverBanner, { backgroundColor: colors.brandLight }]}
              onPress={() => setImageViewer({ uri: coverUrl, label: 'Cover photo' })}
              disabled={!coverUrl || coverFailed || isBlocked}
              accessibilityRole="imagebutton"
              accessibilityLabel="View full-size cover photo"
            >
              {coverUrl && !coverFailed && !isBlocked ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.coverImage}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={220}
                  onError={() => setCoverFailed(true)}
                />
              ) : (
                <View style={styles.coverFallback}>
                  <Ionicons name={isBlocked ? 'ban-outline' : 'school-outline'} size={30} color={isBlocked ? danger : colors.brand} />
                  <Text style={[styles.coverFallbackText, { color: isBlocked ? danger : colors.brand }]} numberOfLines={1}>
                    {isBlocked ? 'Profile hidden' : profile?.school || profile?.department || 'UniHelp student'}
                  </Text>
                </View>
              )}
              <View style={styles.coverScrim} />
            </Pressable>
            <View style={styles.avatarWrapper}>
              <EvosAura size={104} active={premiumActive || profile?.role === 'admin'}>
                <Pressable
                  style={[styles.avatarBorder, { backgroundColor: colors.surfacePrimary, shadowColor: colors.shadow }]}
                  onPress={() => setImageViewer({ uri: avatarUrl || avatarThumbUrl, label: 'Profile photo' })}
                  disabled={!avatarThumbUrl || avatarFailed || isBlocked}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="View full-size profile photo"
                >
                  {avatarThumbUrl && !avatarFailed && !isBlocked ? (
                    <Image
                      source={{ uri: avatarThumbUrl }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      accessibilityLabel={`${profile?.username || 'Student'} profile photo`}
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: isBlocked ? dangerSoft : colors.brand }]}>
                      {isBlocked ? (
                        <Ionicons name="ban-outline" size={34} color={danger} />
                      ) : (
                        <Text style={[styles.avatarText, { color: colors.onBrand }]}>{initials}</Text>
                      )}
                    </View>
                  )}
                </Pressable>
              </EvosAura>
            </View>
          </View>

          <View style={styles.profileMeta}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textPrimary }]} accessibilityRole="header" numberOfLines={2}>
                {profileName}
              </Text>
              {!isBlocked && premiumActive ? (
                <Ionicons name="checkmark-circle" size={19} color={colors.brand} accessibilityLabel="Verified Premium student" />
              ) : null}
            </View>
            {!isBlocked && subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text> : null}
            {showEmail ? <Text style={[styles.email, { color: colors.textTertiary }]} selectable>{profile.email}</Text> : null}
          </View>

          {feedback ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: feedback.type === 'error' ? dangerSoft : successSoft,
                  borderColor: feedback.type === 'error' ? danger : success,
                },
              ]}
            >
              <Ionicons
                name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={17}
                color={feedback.type === 'error' ? danger : success}
              />
              <Text style={[styles.feedbackText, { color: feedback.type === 'error' ? danger : success }]}>{feedback.text}</Text>
              {feedback.type === 'error' ? (
                <Pressable onPress={() => setFeedback(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss message">
                  <Ionicons name="close" size={16} color={danger} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {isBlocked ? (
            <View style={[styles.blockedCard, cardStyle]}>
              <View style={[styles.blockedIcon, { backgroundColor: dangerSoft }]}>
                <Ionicons name="ban-outline" size={28} color={danger} />
              </View>
              <Text style={[styles.blockedTitle, { color: colors.textPrimary }]}>
                {blockedByMe ? 'You blocked this student' : 'Profile unavailable'}
              </Text>
              <Text style={[styles.blockedText, { color: colors.textSecondary }]}>
                {blockedByMe
                  ? 'Their profile and messaging are hidden until you unblock them.'
                  : 'You cannot view this profile or start a chat right now.'}
              </Text>
              {blockedByMe ? (
                <ActionButton label="Unblock" icon="lock-open-outline" variant="primary" loading={busy === 'unblock'} disabled={anyBusy} onPress={handleUnblock} />
              ) : null}
            </View>
          ) : (
            <>
              {renderActions()}

              <View style={[styles.statsCard, cardStyle]}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={20} color={colors.brand} />
                  <View>
                    <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{friendCount}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{friendCount === 1 ? 'Friend' : 'Friends'}</Text>
                  </View>
                </View>
                {!isSelf ? <View style={[styles.statDivider, { backgroundColor: colors.borderDefault }]} /> : null}
                {!isSelf ? (
                  <View style={styles.statItem}>
                    <Ionicons name="git-network-outline" size={20} color={colors.gold || colors.brand} />
                    <View>
                      <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{mutualCount}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mutual</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={[styles.profileTabs, { backgroundColor: colors.surfaceSecondary }]} accessibilityRole="tablist">
                {[
                  { key: 'information', label: 'Information', icon: 'person-outline' },
                  { key: 'friends', label: friendsTabCount ? `Friends (${friendsTabCount})` : 'Friends', icon: 'people-outline' },
                ].map((tab) => {
                  const selected = profileTab === tab.key;
                  return (
                    <Pressable
                      key={tab.key}
                      style={[styles.profileTab, selected && { backgroundColor: colors.brand }]}
                      onPress={() => setProfileTab(tab.key)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                    >
                      <Ionicons name={tab.icon} size={16} color={selected ? colors.onBrand : colors.textSecondary} />
                      <Text style={[styles.profileTabText, { color: selected ? colors.onBrand : colors.textSecondary }]}>{tab.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {profileTab === 'friends' ? (
                <View style={[styles.sectionCard, cardStyle]}>
                  {friendsUnavailable ? (
                    <Text style={[styles.bioText, { color: colors.textTertiary }]}>This friend list is unavailable.</Text>
                  ) : friendsLoading ? (
                    <ActivityIndicator color={colors.brand} />
                  ) : friendsError ? (
                    <View style={styles.friendsErrorBox}>
                      <Text style={[styles.bioText, { color: colors.textTertiary }]}>Couldn't load friends.</Text>
                      <ActionButton label="Try again" icon="refresh-outline" variant="secondary" onPress={() => loadFriends({ force: true })} />
                    </View>
                  ) : friends.length ? (
                    <View style={styles.friendList}>
                      {friends.map((friend) => {
                        const friendPhoto = friend.photoThumb || friend.photoURL || friend.photo || '';
                        const friendName = friend.displayName || friend.username || 'Student';
                        return (
                          <Pressable
                            key={friend.uid}
                            style={({ pressed }) => [styles.friendRow, pressed && styles.friendRowPressed]}
                            onPress={() => router.push(`/view-user-profile/${friend.uid}`)}
                            accessibilityRole="button"
                            accessibilityLabel={`View ${friendName}'s profile`}
                          >
                            {friendPhoto ? (
                              <Image source={{ uri: friendPhoto }} style={styles.friendAvatar} contentFit="cover" cachePolicy="memory-disk" />
                            ) : (
                              <View style={[styles.friendAvatar, styles.friendAvatarFallback, { backgroundColor: colors.brandLight }]}>
                                <Text style={[styles.friendAvatarInitial, { color: colors.brandText }]}>{friendName.trim().charAt(0).toUpperCase() || 'S'}</Text>
                              </View>
                            )}
                            <View style={styles.friendDetails}>
                              <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>{friendName}</Text>
                              <Text style={[styles.friendSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                {[friend.school, friend.department].filter(Boolean).join(' · ') || 'UniHelp student'}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                          </Pressable>
                        );
                      })}
                      {friendsHasMore ? (
                        <Pressable style={styles.loadMoreFriends} onPress={loadMoreFriends} disabled={friendsLoadingMore} accessibilityRole="button">
                          {friendsLoadingMore ? <ActivityIndicator size="small" color={colors.brand} /> : <Text style={[styles.loadMoreFriendsText, { color: colors.brand }]}>Load more friends</Text>}
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={[styles.bioText, { color: colors.textTertiary }]}>No friends to show yet.</Text>
                  )}
                </View>
              ) : (
                <>
                  <View style={[styles.sectionCard, cardStyle]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Academic profile</Text>
                    {academicItems.length ? (
                      <View style={styles.infoGrid}>
                        {academicItems.map((item) => <InfoTile key={item.label} {...item} />)}
                      </View>
                    ) : (
                      <Text style={[styles.bioText, { color: colors.textTertiary }]}>This student hasn't added academic details yet.</Text>
                    )}
                  </View>

                  {personalItems.length ? (
                    <View style={[styles.sectionCard, cardStyle]}>
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Personal details</Text>
                      <View style={styles.infoGrid}>
                        {personalItems.map((item) => <InfoTile key={item.label} {...item} />)}
                      </View>
                      <Text style={[styles.bioText, { color: colors.textTertiary, fontSize: 12, marginTop: 10 }]}>Only you can see these details.</Text>
                    </View>
                  ) : null}

                  {String(profile?.bio || '').trim() ? (
                    <View style={[styles.sectionCard, cardStyle]}>
                      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
                      <Text style={[styles.bioText, { color: colors.textSecondary }]}>{String(profile.bio).trim()}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <View style={[styles.emptyCard, cardStyle]}>
          <Ionicons name={loadError ? 'cloud-offline-outline' : 'person-circle-outline'} size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {loadError ? "Couldn't load profile" : 'Student not found'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {loadError
              ? 'Check your connection and try again.'
              : 'This profile might have been removed or is no longer accessible.'}
          </Text>
          <View style={styles.emptyActions}>
            {loadError ? <ActionButton label="Try again" icon="refresh-outline" variant="primary" onPress={() => setReloadKey((k) => k + 1)} /> : null}
            <ActionButton label="Go back" icon="arrow-back" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      )}

      {/* Full-size photo viewer: pinch to zoom, tap anywhere to close */}
      <Modal visible={!!imageViewer} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setImageViewer(null)}>
        <View style={styles.imageViewerRoot}>
          <View style={styles.imageViewerBackdrop} />
          {imageViewer?.uri ? (
            <ScrollView
              style={styles.imageViewerScroll}
              contentContainerStyle={styles.imageViewerScrollContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              bouncesZoom
              centerContent
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <Pressable
                onPress={() => setImageViewer(null)}
                style={{ width: windowWidth, height: windowHeight }}
                accessibilityRole="button"
                accessibilityLabel="Close full-size image"
              >
                <Image
                  source={{ uri: imageViewer.uri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  transition={180}
                  accessibilityLabel={imageViewer.label}
                />
              </Pressable>
            </ScrollView>
          ) : null}
          <Pressable
            style={[styles.imageViewerClose, { top: insets.top + 10 }]}
            onPress={() => setImageViewer(null)}
            accessibilityRole="button"
            accessibilityLabel="Close image"
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>

      {/* Message request sheet — KeyboardAvoidingView keeps the input above the keyboard */}
      <Modal visible={messageModal} transparent animationType="slide" statusBarTranslucent onRequestClose={closeMessageModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
            onPress={closeMessageModal}
            accessibilityLabel="Close message request"
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBackground, paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.borderDefault }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Send message request</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Introduce yourself to {profile?.username || 'this student'}.
            </Text>
            <TextInput
              value={intro}
              onChangeText={(t) => {
                setIntro(t);
                if (messageError) setMessageError('');
              }}
              placeholder={introPlaceholder}
              placeholderTextColor={colors.placeholder}
              style={[
                styles.messageInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: messageError ? danger : colors.borderDefault,
                  color: colors.textPrimary,
                },
              ]}
              multiline
              maxLength={INTRO_MAX}
              autoFocus
              accessibilityLabel="Introduction message"
            />
            <View style={styles.inputMeta}>
              <Text style={[styles.inputError, { color: danger }]} accessibilityLiveRegion="polite">{messageError}</Text>
              <Text style={[styles.counter, { color: colors.textTertiary }]}>{intro.length}/{INTRO_MAX}</Text>
            </View>
            <View style={styles.modalActions}>
              <ActionButton label="Cancel" variant="secondary" disabled={busy === 'messageRequest'} onPress={closeMessageModal} />
              <ActionButton
                label="Send request"
                icon="paper-plane-outline"
                variant="primary"
                loading={busy === 'messageRequest'}
                disabled={!intro.trim() || busy === 'messageRequest'}
                onPress={submitMessageRequest}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        variant={confirmDialog?.variant}
        icon={confirmDialog?.icon}
        loading={['remove', 'block'].includes(busy)}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          await action?.();
        }}
      />
    </ScreenShell>
  );
}

function InfoTile({ icon, label, value }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoTile, { backgroundColor: colors.canvasLight }]}>
      <View style={[styles.infoIconContainer, { backgroundColor: colors.brandLight }]}>
        <Ionicons name={icon} size={16} color={colors.brand} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({ label, icon, variant = 'primary', loading, disabled, onPress, accessibilityLabel }) {
  const { colors } = useTheme();
  const danger = colors.error ?? colors.danger ?? colors.red;
  const dangerSoft = colors.dangerLight ?? colors.redLight ?? colors.surfaceSecondary;
  const isIconOnly = variant === 'icon';

  const bg = { primary: colors.brand, secondary: colors.brandLight, ghost: dangerSoft, icon: colors.surfaceSecondary }[variant];
  const fg = variant === 'primary' ? colors.onBrand : variant === 'ghost' ? danger : variant === 'icon' ? danger : colors.brand;
  const inactive = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        isIconOnly && styles.btnIconOnly,
        { backgroundColor: bg },
        pressed && styles.btnPressed,
        disabled && !loading && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      hitSlop={6}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          {label ? <Text style={[styles.btnText, { color: fg }]}>{label}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  loadingCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  headerContainer: { alignItems: 'center', marginBottom: 12 },
  coverBanner: { height: 150, width: '100%', borderRadius: 22, overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  coverFallbackText: { fontSize: 13, fontWeight: '800' },
  coverScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.08)' },
  avatarWrapper: { marginTop: -52 },
  avatarBorder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 48 },
  avatarFallback: { width: '100%', height: '100%', borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '800' },

  profileMeta: { alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  name: { fontSize: 23, fontWeight: '800', textAlign: 'center', letterSpacing: -0.2, flexShrink: 1 },
  subtitle: { marginTop: 3, fontSize: 14, fontWeight: '600' },
  email: { marginTop: 3, fontSize: 12.5, fontWeight: '500' },

  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  btn: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
  },
  btnIconOnly: { width: 46, paddingHorizontal: 0, flexGrow: 0, flexShrink: 0 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: '700', fontSize: 14 },
  badgeSent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  badgeSentText: { fontWeight: '700', fontSize: 13 },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  statDivider: { width: 1, height: 30, marginHorizontal: 8 },
  statNumber: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, fontWeight: '600' },

  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  feedbackText: { flex: 1, fontSize: 13, fontWeight: '700' },

  blockedCard: {
    borderRadius: 20,
    padding: 22,
    marginHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  blockedIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  blockedTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  blockedText: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 6, marginBottom: 18 },

  sectionCard: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  profileTabs: { flexDirection: 'row', gap: 4, marginHorizontal: 16, marginBottom: 16, padding: 4, borderRadius: 12 },
  profileTab: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8, borderRadius: 9 },
  profileTabText: { fontSize: 12.5, fontWeight: '800' },
  friendList: { gap: 8 },
  friendsErrorBox: { alignItems: 'center', gap: 12 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 5 },
  friendRowPressed: { opacity: 0.72 },
  friendAvatar: { width: 44, height: 44, borderRadius: 22 },
  friendAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  friendAvatarInitial: { fontSize: 17, fontWeight: '800' },
  friendDetails: { flex: 1, gap: 3 },
  friendName: { fontSize: 14, fontWeight: '800' },
  friendSubtitle: { fontSize: 12 },
  loadMoreFriends: { alignItems: 'center', justifyContent: 'center', minHeight: 40, marginTop: 4 },
  loadMoreFriendsText: { fontSize: 13, fontWeight: '800' },
  infoGrid: { gap: 10 },
  infoTile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
  infoIconContainer: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '700' },
  infoValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  bioText: { fontSize: 14.5, lineHeight: 22 },

  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
    marginHorizontal: 16,
    gap: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyActions: { flexDirection: 'row', gap: 10, marginTop: 14, alignSelf: 'stretch' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  imageViewerRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageViewerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.96)' },
  imageViewerScroll: { flex: 1, width: '100%' },
  imageViewerScrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  imageViewerClose: { position: 'absolute', right: 20, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30, 30, 30, 0.85)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSubtitle: { fontSize: 13, marginTop: 4 },
  messageInput: {
    minHeight: 100,
    maxHeight: 180,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    textAlignVertical: 'top',
    marginTop: 16,
    fontSize: 14.5,
  },
  inputMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, minHeight: 18 },
  inputError: { flex: 1, fontSize: 12.5, fontWeight: '700' },
  counter: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});