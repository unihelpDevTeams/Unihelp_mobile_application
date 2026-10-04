import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenShell from '../../src/shared/components/ScreenShell';
import SectionHeader from '../../src/shared/components/SectionHeader';
import EmptyState from '../../src/shared/components/EmptyState';
import { Button } from '../../src/shared/components/Button';
import { spacing, borderRadius, shadows } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getTodayKey, getRecommendedCategories } from '../../src/shared/challenge/data';
import { AnimatedPressable } from '../../src/shared/challenge/components/ChallengePieces';
import {
  EMPTY_DASHBOARD,
  getCachedDashboard,
  loadDashboard,
  invalidateChallengeDashboard,
} from '../../src/shared/challenge/dashboardCache';

// Kept for backwards compatibility with anything that still imports it from this route.
// Prefer importing from 'src/shared/challenge/dashboardCache' (importing from a route file
// risks circular imports and bundles the whole screen).
export { invalidateChallengeDashboard };

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

// Safe alpha for hex / rgb colours (`${color}15` breaks for anything that isn't #RRGGBB).
function withAlpha(color, alpha) {
  if (typeof color !== 'string') return color;
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255).toString(16).padStart(2, '0');
  const c = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return `${c}${a}`;
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}${a}`;
  if (/^#[0-9a-f]{8}$/i.test(c)) return `${c.slice(0, 7)}${a}`;
  const m = c.match(/^rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n) || 0));
const toPct = (n) => Math.round(clamp01(n) * 100);

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const startOfDay = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

function formatWhen(value) {
  const ms = toMillis(value);
  if (!ms) return '';
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(ms)) / 86400000);
  if (diff <= 0) return 'Today'; // <0 = clock skew / future timestamps
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function greeting(name) {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}` : part;
}

const dayBefore = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
};

/**
 * The stored `currentStreak` can be stale (the user missed yesterday but nothing has
 * reset it yet). Derive what is actually alive from the completion dates.
 */
function resolveStreak(streakDates, serverStreak, todayKey) {
  const stored = Number(serverStreak) || 0;
  if (!Array.isArray(streakDates)) return { streak: stored, doneToday: false, atRisk: false };

  const dates = new Set(streakDates);
  const doneToday = dates.has(todayKey);
  const yesterday = dayBefore(new Date());
  if (!doneToday && !dates.has(getTodayKey(yesterday))) {
    return { streak: 0, doneToday: false, atRisk: false };
  }

  let counted = 0;
  let cursor = doneToday ? new Date() : yesterday;
  while (dates.has(getTodayKey(cursor)) && counted < 400) {
    counted += 1;
    cursor = dayBefore(cursor);
  }
  const streak = Math.max(stored, counted);
  return { streak, doneToday, atRisk: streak > 0 && !doneToday };
}

/* -------------------------------------------------------------------------- */
/*                                 Components                                 */
/* -------------------------------------------------------------------------- */

// The one orchestrated motion on this screen: the hero settles into place on mount.
function HeroReveal({ children, style }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (!alive) return;
        if (reduced) return progress.setValue(1);
        Animated.timing(progress, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    return () => {
      alive = false;
      progress.stopAnimation();
    };
  }, [progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const WeekStrip = memo(function WeekStrip({ days, styles, colors }) {
  return (
    <View style={styles.weekStrip}>
      {days.map((d) => (
        <View
          key={d.key}
          style={styles.weekDay}
          accessible
          accessibilityLabel={`${d.label}${d.isToday ? ', today' : ''}, ${d.active ? 'completed' : 'not completed'}`}
        >
          <View
            style={[
              styles.weekDot,
              d.active && styles.weekDotActive,
              d.isToday && !d.active && styles.weekDotToday,
            ]}
          >
            {d.active ? <Ionicons name="checkmark" size={14} color={colors.brand} /> : null}
          </View>
          <Text style={[styles.weekLabel, d.isToday && styles.weekLabelToday]}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
});

const StatCard = memo(function StatCard({ icon, tone, value, label, styles }) {
  return (
    <View style={styles.miniStatBox}>
      <View style={[styles.miniStatIcon, { backgroundColor: withAlpha(tone, 0.14) }]}>
        <Ionicons name={icon} size={16} color={tone} />
      </View>
      <View style={styles.miniStatText}>
        <Text style={styles.miniStatVal} maxFontSizeMultiplier={1.3}>{value}</Text>
        <Text style={styles.miniStatLbl} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
});

const LinkTile = memo(function LinkTile({ icon, tone, label, onPress, styles, colors }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.linkTile, pressed && styles.linkTilePressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${label.toLowerCase()}`}
    >
      <View style={[styles.linkIcon, { backgroundColor: withAlpha(tone, 0.14) }]}>
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <Text style={styles.linkLabel} numberOfLines={1}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color={colors.greyLight} />
    </Pressable>
  );
});

/* -------------------------------------------------------------------------- */
/*                                   Screen                                   */
/* -------------------------------------------------------------------------- */

export default function ChallengeHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const profileSnapshot = useMemo(
    () => ({
      uid: profile?.uid,
      username: profile?.username,
      school: profile?.school,
      department: profile?.department,
      faculty: profile?.faculty,
      level: profile?.level,
      photo: profile?.photo,
    }),
    [profile?.uid, profile?.username, profile?.school, profile?.department, profile?.faculty, profile?.level, profile?.photo]
  );
  const uid = profileSnapshot.uid;
  const cacheKey = uid || 'guest';

  const [dashboard, setDashboard] = useState(() => getCachedDashboard(cacheKey) || EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(() => Boolean(uid) && !getCachedDashboard(cacheKey));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Guards the manual retry against setState-after-unmount / account switches.
  const retryToken = useRef(0);
  useEffect(() => () => { retryToken.current += 1; }, [cacheKey]);

  // On every focus: serve cache instantly, hit the network only when the cache is stale or missing.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      // No signed-in user yet: nothing to fetch, don't fire a request for a "guest".
      if (!uid) {
        setDashboard(EMPTY_DASHBOARD);
        setLoading(false);
        return undefined;
      }

      const cached = getCachedDashboard(cacheKey);
      setDashboard(cached || EMPTY_DASHBOARD);
      setLoading(!cached);

      loadDashboard(cacheKey, profileSnapshot)
        .then((data) => {
          if (cancelled) return;
          setDashboard(data);
          setError(false);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [uid, cacheKey, profileSnapshot])
  );

  const retry = useCallback(() => {
    if (!uid) return;
    const token = ++retryToken.current;
    setRefreshing(true);
    setError(false);
    loadDashboard(cacheKey, profileSnapshot, true)
      .then((data) => token === retryToken.current && setDashboard(data))
      .catch(() => token === retryToken.current && setError(true))
      .finally(() => {
        if (token !== retryToken.current) return;
        setRefreshing(false);
        setLoading(false);
      });
  }, [uid, cacheKey, profileSnapshot]);

  const stats = dashboard.stats || {};
  const history = Array.isArray(dashboard.history) ? dashboard.history : [];
  const hasData = Object.keys(stats).length > 0 || history.length > 0;

  const todayKey = getTodayKey();
  const streakDates = stats.streakDates;
  const { streak, doneToday, atRisk } = useMemo(
    () => resolveStreak(streakDates, stats.currentStreak, todayKey),
    [streakDates, stats.currentStreak, todayKey]
  );

  const weekDays = useMemo(() => {
    const dates = new Set(Array.isArray(streakDates) ? streakDates : []);
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = getTodayKey(date);
      return {
        key,
        label: date.toLocaleDateString([], { weekday: 'short' }),
        active: dates.has(key),
        isToday: index === 6,
      };
    });
  }, [streakDates, todayKey]);
  const weekCount = weekDays.filter((d) => d.active).length;

  const quickCategories = useMemo(() => getRecommendedCategories(profile || {}).slice(0, 4), [profile]);

  const hero = useMemo(() => {
    if (doneToday) {
      return {
        title: streak > 1 ? `${streak} days strong` : 'Daily challenge complete',
        subtitle: 'Your streak is safe for today. Pick a topic to keep your edge.',
        cta: 'Practise a topic',
        icon: 'grid',
        route: '/challenge/categories',
      };
    }
    if (streak > 0) {
      return {
        title: `Keep your ${streak}-day streak alive`,
        subtitle: 'Finish today’s challenge before midnight to keep it going and earn bonus XP.',
        cta: 'Start daily challenge',
        icon: 'play',
        route: '/challenge/question',
      };
    }
    return {
      title: 'Start a new streak today',
      subtitle: 'Answer today’s questions, practise topics and climb the campus rankings.',
      cta: 'Start daily challenge',
      icon: 'play',
      route: '/challenge/question',
    };
  }, [doneToday, streak]);

  const firstName = (profile?.username || '').trim().split(/\s+/)[0];
  const xp = Number(stats.xp) || 0;
  const xpToNext = Number(stats.xpToNext);
  const go = useCallback((route) => router.navigate(route), [router]);

  return (
    <ScreenShell
      showBack
      title="Challenge"
      subtitle="Master your subjects. Compete with peers."
      loading={loading}
    >
      {error ? (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={18} color={colors.orange} />
          <Text style={styles.errorText}>
            {hasData ? 'Couldn’t refresh. Showing your last saved progress.' : 'Couldn’t load your progress. Check your connection and try again.'}
          </Text>
          <Pressable onPress={retry} disabled={refreshing} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retry loading">
            <Text style={styles.errorRetry}>{refreshing ? 'Retrying…' : 'Retry'}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Hero: the week is the centrepiece, so the streak is something you see, not just read */}
      <HeroReveal style={styles.heroWrap}>
        <LinearGradient
          colors={[colors.brand, colors.purple || colors.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View pointerEvents="none" style={styles.heroHaloTop} />
          <View pointerEvents="none" style={styles.heroHaloBottom} />
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <View style={styles.heroRankBadge}>
                <Ionicons name="ribbon" size={12} color={colors.gold} />
                <Text style={styles.heroRankText}>{stats.rank || 'Bronze'}</Text>
              </View>
              {atRisk ? (
                <View style={styles.heroRiskBadge}>
                  <Ionicons name="time-outline" size={12} color={colors.orange} />
                  <Text style={styles.heroRiskText}>Streak ends tonight</Text>
                </View>
              ) : (
                <View style={styles.heroBadge}>
                  <Ionicons name="flame" size={14} color={colors.orange} />
                  <Text style={styles.heroBadgeText}>{streak} day streak</Text>
                </View>
              )}
            </View>

            <Text style={styles.heroGreeting}>{greeting(firstName)}</Text>
            <Text style={styles.heroTitle} maxFontSizeMultiplier={1.2}>{hero.title}</Text>
            <Text style={styles.heroSubtitle}>{hero.subtitle}</Text>

            <View style={styles.weekPanel}>
              <View style={styles.weekPanelHeader}>
                <Text style={styles.weekPanelTitle}>{weekCount} of 7 days this week</Text>
                <Pressable
                  onPress={() => go('/challenge/streak')}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Open streak calendar"
                >
                  <Text style={styles.weekPanelLink}>Calendar</Text>
                </Pressable>
              </View>
              <WeekStrip days={weekDays} styles={styles} colors={colors} />
            </View>

            <Pressable
              onPress={() => go(hero.route)}
              style={({ pressed }) => [styles.heroPrimaryBtn, pressed && styles.heroBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={hero.cta}
            >
              <Text style={styles.heroPrimaryBtnText}>{hero.cta}</Text>
              <Ionicons name={hero.icon} size={16} color={colors.brandText} />
            </Pressable>
          </View>
        </LinearGradient>
      </HeroReveal>

      {/* Stats */}
      <View style={styles.statsOverview}>
        <View style={styles.mainStatBox}>
          <Text style={styles.mainStatLabel}>Total XP</Text>
          <Text style={styles.mainStatValue} maxFontSizeMultiplier={1.2} adjustsFontSizeToFit numberOfLines={1}>
            {xp.toLocaleString()}
          </Text>
          <View style={styles.mainStatSub}>
            <Ionicons name="sparkles" size={12} color={colors.brand} />
            <Text style={styles.mainStatSubText}>
              {Number.isFinite(xpToNext) && xpToNext > 0 ? `${xpToNext.toLocaleString()} XP to next rank` : 'Keep earning to rank up'}
            </Text>
          </View>
        </View>
        <View style={styles.secondaryStatsCol}>
          <StatCard
            icon="trophy"
            tone={colors.green}
            value={stats.leaderboardPosition ? `#${stats.leaderboardPosition}` : '--'}
            label="Global rank"
            styles={styles}
          />
          <StatCard icon="bonfire" tone={colors.orange} value={Number(stats.longestStreak) || 0} label="Best streak" styles={styles} />
        </View>
      </View>

      {/* Quick links */}
      <View style={styles.linkRow}>
        <LinkTile
          icon="trophy-outline"
          tone={colors.gold || colors.orange}
          label="Leaderboard"
          onPress={() => go('/challenge/leaderboard')}
          styles={styles}
          colors={colors}
        />
        <LinkTile
          icon="ribbon-outline"
          tone={colors.brand}
          label="Achievements"
          onPress={() => go('/challenge/achievements')}
          styles={styles}
          colors={colors}
        />
      </View>

      {/* Targeted practice */}
      {quickCategories.length ? (
        <>
          <SectionHeader
            title="Targeted practice"
            subtitle="Topics picked for your course and level."
            icon="grid-outline"
            actionLabel="View all"
            onPress={() => go('/challenge/categories')}
          />
          <View style={styles.quickGrid}>
            {quickCategories.map((item) => {
              const pct = toPct(item.progress);
              const tone = item.tone || colors.brand;
              return (
                <AnimatedPressable
                  key={item.id}
                  style={styles.quickCard}
                  onPress={() => router.navigate({ pathname: '/challenge/question', params: { category: item.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}, ${pct} percent complete`}
                >
                  <View style={styles.quickCardHeader}>
                    <View style={[styles.quickIcon, { backgroundColor: withAlpha(tone, 0.12) }]}>
                      <Ionicons name={item.icon || 'help-circle-outline'} size={18} color={tone} />
                    </View>
                    <Text style={[styles.quickPercent, { color: tone }]}>{pct}%</Text>
                  </View>
                  <Text style={styles.quickTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.quickProgressTrack}>
                    <View style={[styles.quickProgressFill, { backgroundColor: tone, width: `${pct}%` }]} />
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </>
      ) : null}

      {/* History */}
      <SectionHeader
        title="Recent results"
        subtitle="Your latest challenges."
        icon="time-outline"
        actionLabel="History"
        onPress={() => go('/challenge/history')}
      />
      {history.length ? (
        <View style={styles.historyList}>
          {history.slice(0, 3).map((item, index, list) => {
            const accuracy = Math.min(100, Math.max(0, Math.round(Number(item.accuracy) || 0)));
            const good = accuracy >= 70;
            const tone = good ? colors.green : colors.orange;
            const when = formatWhen(item.completedAt || item.createdAt || item.date);
            const xpEarned = Number(item.xpEarned) || 0;
            return (
              <Pressable
                key={item.id || `${item.category}-${index}`}
                style={({ pressed }) => [styles.historyCard, index === list.length - 1 && styles.historyCardLast, pressed && styles.historyPressed]}
                onPress={() => go('/challenge/history')}
                accessibilityRole="button"
                accessibilityLabel={`${item.category || 'Daily challenge'}, ${accuracy} percent accuracy, ${xpEarned} XP${when ? `, ${when}` : ''}`}
              >
                <View style={styles.historyLeft}>
                  <View style={[styles.historyIcon, { backgroundColor: withAlpha(tone, 0.12) }]}>
                    <Ionicons name={good ? 'checkmark-circle' : 'barbell'} size={20} color={tone} />
                  </View>
                  <View style={styles.historyText}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.category || 'Daily Challenge'}</Text>
                    <Text style={styles.cardText} numberOfLines={1}>
                      {`+${xpEarned} XP${when ? `, ${when}` : ''}`}
                    </Text>
                  </View>
                </View>
                <View style={[styles.accuracyPill, { backgroundColor: withAlpha(tone, 0.14) }]}>
                  <Text style={[styles.accuracyText, { color: tone }]}>{accuracy}%</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          <EmptyState
            title="No results yet"
            description="Finish a challenge and your results will show up here."
            icon="document-text-outline"
          />
          {error && !hasData ? (
            <Button label="Try again" variant="outline" icon="refresh" onPress={retry} style={styles.retryButton} />
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: withAlpha(colors.orange, 0.12),
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      marginBottom: spacing.md,
    },
    errorText: { flex: 1, color: colors.ink, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
    errorRetry: { color: colors.brand, fontSize: 13, fontWeight: '800' },
    retryButton: { marginTop: spacing.md },

    heroWrap: {
      borderRadius: borderRadius['3xl'],
      marginBottom: spacing.lg,
      overflow: 'hidden',
      ...shadows.brand,
    },
    heroGradient: { padding: spacing.xl, position: 'relative' },
    heroHaloTop: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      right: -60,
      top: -80,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    heroHaloBottom: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      left: -40,
      bottom: -40,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    heroContent: { position: 'relative', zIndex: 1 },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.92)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
    },
    heroBadgeText: { color: colors.orange, fontSize: 11.5, fontWeight: '900' },
    heroRiskBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.92)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
    },
    heroRiskText: { color: colors.orange, fontSize: 11.5, fontWeight: '900' },
    heroRankBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.2)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    heroRankText: { color: colors.onBrand, fontSize: 11, fontWeight: '800' },
    heroGreeting: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '700', marginBottom: 4 },
    heroTitle: { color: colors.onBrand, fontSize: 25, fontWeight: '900', lineHeight: 31, letterSpacing: -0.4 },
    heroSubtitle: {
      color: 'rgba(255,255,255,0.9)',
      fontSize: 13.5,
      lineHeight: 20,
      marginTop: spacing.sm,
      fontWeight: '500',
      maxWidth: '94%',
    },

    weekPanel: {
      marginTop: spacing.lg,
      backgroundColor: 'rgba(0,0,0,0.16)',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm + 2,
      paddingBottom: spacing.md,
    },
    weekPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm + 2,
    },
    weekPanelTitle: { color: colors.onBrand, fontSize: 12.5, fontWeight: '800' },
    weekPanelLink: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
    weekStrip: { flexDirection: 'row', justifyContent: 'space-between' },
    weekDay: { alignItems: 'center', gap: 6, flex: 1 },
    weekDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekDotActive: { backgroundColor: '#FFFFFF' },
    weekDotToday: { borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: 'transparent' },
    weekLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10.5, fontWeight: '700' },
    weekLabelToday: { color: '#FFFFFF', fontWeight: '900' },

    heroPrimaryBtn: {
      marginTop: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xl,
      minHeight: 48,
      borderRadius: borderRadius.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    heroBtnPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
    heroPrimaryBtnText: { color: colors.brandText, fontSize: 14.5, fontWeight: '800' },

    statsOverview: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    mainStatBox: {
      flex: 1.2,
      backgroundColor: colors.surface,
      borderRadius: borderRadius['2xl'],
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...shadows.sm,
      justifyContent: 'center',
    },
    mainStatLabel: { color: colors.grey, fontSize: 12.5, fontWeight: '700' },
    mainStatValue: { color: colors.ink, fontSize: 32, fontWeight: '900', marginVertical: spacing.xs },
    mainStatSub: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    mainStatSubText: { color: colors.grey, fontSize: 11, fontWeight: '600', flexShrink: 1 },
    secondaryStatsCol: { flex: 1, gap: spacing.sm },
    miniStatBox: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    miniStatIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    miniStatText: { flexShrink: 1 },
    miniStatVal: { color: colors.ink, fontSize: 16, fontWeight: '900' },
    miniStatLbl: { color: colors.grey, fontSize: 10.5, fontWeight: '700' },

    linkRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    linkTile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    linkTilePressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    linkIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    linkLabel: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '800' },

    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
    quickCard: {
      flexBasis: '47%',
      flexGrow: 1,
      flexShrink: 0,
      minWidth: 140,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      ...shadows.sm,
    },
    quickCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    quickIcon: { width: 34, height: 34, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    quickPercent: { fontSize: 12, fontWeight: '800' },
    quickTitle: { color: colors.ink, fontSize: 13.5, fontWeight: '800', marginBottom: 8 },
    quickProgressTrack: { height: 4, backgroundColor: colors.canvasLight, borderRadius: 2, overflow: 'hidden' },
    quickProgressFill: { height: '100%', borderRadius: 2 },

    historyList: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius['2xl'],
      borderWidth: 1,
      borderColor: colors.borderLight,
      overflow: 'hidden',
      ...shadows.sm,
    },
    historyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    historyCardLast: { borderBottomWidth: 0 },
    historyPressed: { backgroundColor: colors.canvasLight },
    historyLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingRight: spacing.sm },
    historyText: { flex: 1 },
    historyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
    cardText: { color: colors.grey, fontSize: 12, fontWeight: '600', marginTop: 2 },
    accuracyPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, minWidth: 52, alignItems: 'center' },
    accuracyText: { fontSize: 12.5, fontWeight: '900' },
  });
}