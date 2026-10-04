import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { Button } from '../../src/shared/components/Button';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { useAuth } from '../../context/AuthContext';
import { LeaderboardRow } from '../../src/shared/challenge/components/ChallengePieces';
import { EMPTY_ROWS, getCachedLeaderboard, loadLeaderboard } from '../../src/shared/challenge/leaderboardCache';

const TABS = [
  { key: 'global', label: 'Global', icon: 'earth-outline', needs: null },
  { key: 'university', label: 'University', icon: 'school-outline', needs: 'school' },
  { key: 'department', label: 'Department', icon: 'library-outline', needs: 'department' },
  { key: 'friends', label: 'Friends', icon: 'people-outline', needs: null },
];

// Rendered 2nd, 1st, 3rd so the winner stands in the middle.
const PODIUM = [
  { position: 2, color: 'greyLight', surface: 'surfaceSecondary', base: 62, avatar: 52 },
  { position: 1, color: 'gold', surface: 'goldLight', base: 88, avatar: 64 },
  { position: 3, color: 'orange', surface: 'orangeLight', base: 46, avatar: 52 },
];

const SKELETON_ROWS = [0, 1, 2, 3, 4];

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const fmt = (n) => (Number(n) || 0).toLocaleString();
const rowId = (item) => item?.uid || item?.id;
const rowKey = (item, index) => `${rowId(item) || 'row'}-${index}`;
const displayName = (item) => (item?.name || item?.username || 'Student').trim() || 'Student';

function initialsOf(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'S';
}

function emptyCopy(tab, missingProfileField) {
  if (missingProfileField) {
    return {
      title: `Add your ${missingProfileField} to see this`,
      description: `This ranking compares you with people in your ${missingProfileField}. Add it in your profile to join.`,
      icon: tab.icon,
    };
  }
  if (tab.key === 'friends') {
    return { title: 'No friends ranked yet', description: 'Connect with classmates to see how your XP compares.', icon: 'people-outline' };
  }
  return { title: 'No entries yet', description: 'Complete a challenge to appear in this ranking.', icon: 'trophy-outline' };
}

/* -------------------------------------------------------------------------- */
/*                                 Components                                 */
/* -------------------------------------------------------------------------- */

const Avatar = memo(function Avatar({ item, size, tone, styles }) {
  const [failed, setFailed] = useState(false);
  const uri = item.photo || item.photoURL || item.avatar;
  const name = displayName(item);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, borderColor: tone }]}>
      {uri && !failed ? (
        <Image source={{ uri }} style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }} onError={() => setFailed(true)} />
      ) : (
        <Text style={[styles.avatarInitials, { fontSize: size * 0.34 }]}>{initialsOf(name)}</Text>
      )}
    </View>
  );
});

const PodiumColumn = memo(function PodiumColumn({ place, item, isMe, styles, colors }) {
  const tone = colors[place.color] || colors.brand;
  const surface = colors[place.surface] || colors.surfaceSecondary;
  const name = displayName(item);
  return (
    <View
      style={styles.podiumCol}
      accessible
      accessibilityLabel={`Rank ${place.position}, ${name}, ${fmt(item.xp)} XP${isMe ? ', you' : ''}`}
    >
      {place.position === 1 ? <Ionicons name="trophy" size={20} color={tone} style={styles.podiumCrown} /> : null}
      <Avatar item={item} size={place.avatar} tone={isMe ? colors.brand : tone} styles={styles} />
      <Text style={styles.podiumName} numberOfLines={1}>{name}</Text>
      {isMe ? (
        <View style={styles.youPill}><Text style={styles.youPillText}>You</Text></View>
      ) : null}
      <Text style={styles.podiumXp}>{fmt(item.xp)} XP</Text>
      <View style={[styles.podiumBase, { height: place.base, backgroundColor: surface }]}>
        <Text style={[styles.podiumBaseText, { color: tone }]}>{place.position}</Text>
      </View>
    </View>
  );
});

const SkeletonList = memo(function SkeletonList({ styles }) {
  return (
    <View style={styles.skeletonWrap} accessible accessibilityLabel="Loading leaderboard" accessibilityRole="progressbar">
      {SKELETON_ROWS.map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonDot} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: `${62 - i * 6}%` }]} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          </View>
        </View>
      ))}
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

// Module-level so the reference is stable across renders (an inline arrow would defeat memoisation in useThemeStyles).
const createStyles = (c, s, r) => ({
  content: { gap: s.md, paddingBottom: s['3xl'] },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    backgroundColor: c.orangeLight || c.surfaceSecondary,
    borderRadius: r.xl,
    paddingHorizontal: s.md,
    paddingVertical: 10,
  },
  errorText: { flex: 1, color: c.textPrimary, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  errorRetry: { color: c.brand, fontSize: 13, fontWeight: '800' },

  standing: {
    borderRadius: r['3xl'],
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  standingBody: { padding: s.lg },
  standingTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  standingLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 12.5, fontWeight: '700' },
  standingRank: { color: c.onBrand || '#FFFFFF', fontSize: 40, fontWeight: '900', letterSpacing: -1, lineHeight: 46 },
  standingXpWrap: { alignItems: 'flex-end' },
  standingXp: { color: c.onBrand || '#FFFFFF', fontSize: 22, fontWeight: '900' },
  standingXpLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700' },
  standingNote: { color: c.onBrand || '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: s.md, lineHeight: 19 },
  standingTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: s.sm, overflow: 'hidden' },
  standingFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFFFFF' },

  tabs: {
    flexDirection: 'row',
    gap: s.xs,
    backgroundColor: c.surfaceSecondary,
    borderRadius: r.xl,
    borderWidth: 1,
    borderColor: c.borderDefault,
    padding: 4,
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: r.lg, paddingHorizontal: 2, gap: 3 },
  tabActive: { backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
  tabText: { color: c.textTertiary, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  tabTextActive: { color: c.brand, fontWeight: '900' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: s.xs },
  sectionTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '900' },
  sectionMeta: { color: c.textTertiary, fontSize: 12, fontWeight: '700' },

  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: s.sm, marginTop: s.sm },
  podiumCol: { flex: 1, alignItems: 'center' },
  podiumSlot: { flex: 1 },
  podiumCrown: { marginBottom: 4 },
  podiumName: { color: c.textPrimary, fontSize: 12, fontWeight: '800', textAlign: 'center', width: '100%', marginTop: s.sm, paddingHorizontal: 2 },
  podiumXp: { color: c.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 2, marginBottom: s.sm },
  podiumBase: {
    width: '100%',
    borderTopLeftRadius: r.lg,
    borderTopRightRadius: r.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: c.borderDefault,
  },
  podiumBaseText: { fontSize: 22, fontWeight: '900' },
  youPill: { backgroundColor: c.brandLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, marginTop: 3 },
  youPillText: { color: c.brand, fontSize: 10.5, fontWeight: '900' },

  avatar: { borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceSecondary },
  avatarInitials: { color: c.textSecondary, fontWeight: '900' },

  note: { color: c.textTertiary, fontSize: 11, lineHeight: 16, textAlign: 'center' },

  skeletonWrap: {
    backgroundColor: c.surfacePrimary,
    borderRadius: r['2xl'],
    borderWidth: 1,
    borderColor: c.borderDefault,
    padding: s.md,
    gap: s.md,
  },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: s.md },
  skeletonDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceSecondary },
  skeletonLines: { flex: 1, gap: 8 },
  skeletonLine: { height: 10, borderRadius: 5, backgroundColor: c.surfaceSecondary },
  skeletonLineShort: { width: '28%' },
});

/* -------------------------------------------------------------------------- */
/*                                   Screen                                   */
/* -------------------------------------------------------------------------- */

export default function ChallengeLeaderboardScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);

  const profileSnapshot = useMemo(
    () => ({
      uid: profile?.uid,
      username: profile?.username,
      school: profile?.school,
      department: profile?.department,
      photo: profile?.photo,
      faculty: profile?.faculty,
      level: profile?.level,
    }),
    [profile?.uid, profile?.username, profile?.school, profile?.department, profile?.photo, profile?.faculty, profile?.level]
  );
  const uid = profileSnapshot.uid;

  const [scope, setScope] = useState('global');
  const selectedTab = TABS.find((t) => t.key === scope) || TABS[0];
  const missingField = selectedTab.needs && !profileSnapshot[selectedTab.needs] ? selectedTab.needs : null;
  const canLoad = Boolean(uid) && !missingField;
  const key = `${uid || 'guest'}:${scope}`;

  // `snap` belongs to one key. When the tab changes we derive the view from the cache in the same
  // render, so the previous tab's rows never flash under the new tab's label.
  const [snap, setSnap] = useState({ key: null, rows: EMPTY_ROWS, pending: true, syncing: false, error: false });
  const view = useMemo(() => {
    if (snap.key === key) return snap;
    const cached = getCachedLeaderboard(key);
    return { key, rows: cached || EMPTY_ROWS, pending: canLoad && !cached, syncing: false, error: false };
  }, [snap, key, canLoad]);
  const { rows, pending, syncing, error } = view;

  const requestToken = useRef(0);

  const fetchRows = useCallback(
    (force) => {
      const token = ++requestToken.current;
      const cached = getCachedLeaderboard(key);
      setSnap({ key, rows: cached || EMPTY_ROWS, pending: !cached, syncing: true, error: false });
      loadLeaderboard(key, { scope, profile: profileSnapshot }, force)
        .then((data) => {
          if (token === requestToken.current) setSnap({ key, rows: data, pending: false, syncing: false, error: false });
        })
        .catch((e) => {
          console.warn('Could not load challenge leaderboard:', e?.message || e);
          if (token !== requestToken.current) return;
          setSnap({ key, rows: getCachedLeaderboard(key) || EMPTY_ROWS, pending: false, syncing: false, error: true });
        });
    },
    [key, scope, profileSnapshot]
  );

  // Revalidate on every focus (the loader dedupes and honours a 60s TTL), so returning from a
  // challenge shows fresh standings without hammering the network.
  useFocusEffect(
    useCallback(() => {
      if (!canLoad) {
        requestToken.current += 1;
        setSnap({ key, rows: EMPTY_ROWS, pending: false, syncing: false, error: false });
        return undefined;
      }
      fetchRows(false);
      return () => {
        requestToken.current += 1; // drop any response that lands after blur / tab switch
      };
    }, [canLoad, key, fetchRows])
  );

  const isMe = useCallback((item) => Boolean(uid) && rowId(item) === uid, [uid]);

  const meIndex = useMemo(() => rows.findIndex(isMe), [rows, isMe]);
  const me = meIndex >= 0 ? rows[meIndex] : null;

  // What it takes to climb one place (or how far ahead you are), computed from the visible board.
  const standing = useMemo(() => {
    if (!me) return null;
    const xp = Number(me.xp) || 0;
    const above = meIndex > 0 ? rows[meIndex - 1] : null;
    const below = rows[meIndex + 1];
    if (above) {
      const aboveXp = Number(above.xp) || 0;
      const gap = aboveXp - xp;
      return {
        note: gap > 0 ? `${fmt(gap)} XP to pass ${displayName(above)}` : `Level with ${displayName(above)}. One more answer takes the spot`,
        progress: aboveXp > 0 ? Math.min(1, xp / aboveXp) : 0,
      };
    }
    if (below) {
      const lead = xp - (Number(below.xp) || 0);
      return { note: lead > 0 ? `You lead ${displayName(below)} by ${fmt(lead)} XP` : `Level with ${displayName(below)} at the top`, progress: 1 };
    }
    return { note: 'You are the only one on this board so far', progress: 1 };
  }, [me, meIndex, rows]);

  const topThree = rows.slice(0, 3);
  const remainingRows = rows.slice(3);
  const empty = emptyCopy(selectedTab, missingField);

  return (
    <ScreenShell title="Leaderboard" subtitle="Celebrate progress with your community." showBack loading={false}>
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Ionicons name="cloud-offline-outline" size={18} color={colors.orange} />
            <Text style={styles.errorText}>
              {rows.length ? 'Couldn’t refresh. Showing the last standings we have.' : 'Couldn’t load this leaderboard. Check your connection and try again.'}
            </Text>
            <Pressable onPress={() => fetchRows(true)} disabled={syncing} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retry loading leaderboard">
              <Text style={styles.errorRetry}>{syncing ? 'Retrying…' : 'Retry'}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Your standing: the one card that answers "where am I and what's next?" */}
        <View style={styles.standing}>
          <LinearGradient colors={[colors.brand, colors.purple || colors.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.standingBody} accessible accessibilityLabel={me ? `Your ${selectedTab.label} rank is ${meIndex + 1}, with ${fmt(me.xp)} XP. ${standing?.note || ''}` : `You are not ranked on the ${selectedTab.label} leaderboard yet`}>
              <View style={styles.standingTop}>
                <View>
                  <Text style={styles.standingLabel}>Your {selectedTab.label.toLowerCase()} rank</Text>
                  <Text style={styles.standingRank} maxFontSizeMultiplier={1.2}>{me ? `#${meIndex + 1}` : '--'}</Text>
                </View>
                {me ? (
                  <View style={styles.standingXpWrap}>
                    <Text style={styles.standingXp} maxFontSizeMultiplier={1.2}>{fmt(me.xp)}</Text>
                    <Text style={styles.standingXpLabel}>Total XP</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.standingNote}>
                {me
                  ? standing?.note
                  : pending
                    ? 'Finding your place…'
                    : missingField
                      ? `Add your ${missingField} to join this ranking`
                      : 'Complete a challenge to get on this board'}
              </Text>
              {me && standing ? (
                <View style={styles.standingTrack}>
                  <View style={[styles.standingFill, { width: `${Math.round(standing.progress * 100)}%` }]} />
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Leaderboard scope">
          {TABS.map((tab) => {
            const selected = scope === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${tab.label} leaderboard`}
                style={({ pressed }) => [styles.tab, selected && styles.tabActive, pressed && { opacity: 0.8 }]}
                onPress={() => setScope(tab.key)}
              >
                <Ionicons name={tab.icon} size={17} color={selected ? colors.brand : colors.textTertiary} />
                <Text numberOfLines={1} style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top learners</Text>
          <Text style={styles.sectionMeta} accessibilityLiveRegion="polite">
            {syncing && rows.length ? 'Updating…' : rows.length ? `${rows.length} ranked` : ''}
          </Text>
        </View>

        {pending ? <SkeletonList styles={styles} /> : null}

        {!pending && topThree.length ? (
          <>
            <View style={styles.podium}>
              {PODIUM.map((place) => {
                const item = topThree[place.position - 1];
                if (!item) return <View key={place.position} style={styles.podiumSlot} />;
                return (
                  <PodiumColumn
                    key={rowKey(item, place.position)}
                    place={place}
                    item={item}
                    isMe={isMe(item)}
                    styles={styles}
                    colors={colors}
                  />
                );
              })}
            </View>
            <Text style={styles.note}>XP reflects challenge practice and completed sessions.</Text>
          </>
        ) : null}

        {!pending && remainingRows.length ? (
          <View>
            <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
              <Text style={styles.sectionTitle}>Rankings</Text>
              <Text style={styles.sectionMeta}>From #4</Text>
            </View>
            {remainingRows.map((item, index) => (
              <LeaderboardRow key={rowKey(item, index + 3)} item={item} index={index + 3} isCurrentUser={isMe(item)} />
            ))}
          </View>
        ) : null}

        {!pending && !rows.length ? (
          <>
            <EmptyState title={empty.title} description={empty.description} icon={empty.icon} />
            {error ? <Button label="Try again" variant="outline" icon="refresh" onPress={() => fetchRows(true)} /> : null}
          </>
        ) : null}
      </View>
    </ScreenShell>
  );
}