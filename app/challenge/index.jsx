import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import SectionHeader from '../../src/shared/components/SectionHeader';
import EmptyState from '../../src/shared/components/EmptyState';
import { Button } from '../../src/shared/components/Button';
import { spacing, borderRadius, shadows } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getTodayKey, getRecommendedCategories } from '../../src/shared/challenge/data';
import { fetchChallengeDashboard } from '../../src/shared/challenge/service';
import { AnimatedPressable, ChallengeBadge, ProgressBar, StatCard } from '../../src/shared/challenge/components/ChallengePieces';

export default function ChallengeHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const [dashboard, setDashboard] = useState({ stats: {}, history: [], leaderboard: [] });
  const [loading, setLoading] = useState(true);
  const lastDashboardKeyRef = useRef('');

  useFocusEffect(
    useCallback(() => {
      const dashboardKey = profile?.uid || 'guest';
      if (lastDashboardKeyRef.current === dashboardKey && Object.keys(dashboard.stats || {}).length > 0) {
        return () => {};
      }
      lastDashboardKeyRef.current = dashboardKey;

      let cancelled = false;
      if (!dashboard.stats || Object.keys(dashboard.stats || {}).length === 0) {
        setLoading(true);
      }

      fetchChallengeDashboard(profile || {})
        .then((data) => {
          if (!cancelled) setDashboard(data);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [dashboard.stats, profile])
  );
  
  const styles = useMemo(() => createStyles(colors), [colors]);

  const stats = dashboard.stats || {};
  const completedToday = (stats.streakDates || []).includes(getTodayKey());
  const weeklyProgress = useMemo(() => {
    const dates = new Set(stats.streakDates || []);
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = getTodayKey(date);
      return { key, label: date.toLocaleDateString([], { weekday: 'short' }).slice(0, 1), active: dates.has(key) };
    });
  }, [stats.streakDates]);

  const quickCategories = useMemo(() => getRecommendedCategories(profile).slice(0, 6), [profile]);
  const recentActivity = stats.activity || [];

  return (
    <ScreenShell
      showBack
      title="Challenge"
      subtitle="Daily learning streaks, XP, ranks, and fast practice."
      loading={loading}>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Build your study streak one smart question at a time.</Text>
        <Text style={styles.heroText}>Timed questions, lightweight review, campus ranking, and progress that compounds.</Text>
        <View style={styles.heroActions}>
          <Button label="Start Daily" icon="play" onPress={() => router.push('/challenge/question')} style={styles.heroButton} />
          <Button label="Categories" variant="secondary" icon="grid" onPress={() => router.push('/challenge/categories')} style={styles.heroButton} />
        </View>
      </View>

      <View style={styles.continueCard}>
        <View style={styles.continueBody}>
          <Text style={styles.cardTitle}>Continue Challenge</Text>
          <Text style={styles.cardText}>Pick up with adaptive practice from your strongest categories.</Text>
          <ProgressBar value={Math.min(1, (stats.questionsAnswered || 0) / 500)} tone={colors.brand} />
        </View>
        <Pressable style={styles.roundButton} onPress={() => router.push('/challenge/question')}>
          <Ionicons name="arrow-forward" size={18} color={colors.onBrand} />
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Current Streak" value={stats.currentStreak || 0} icon="flame-outline" tone={colors.orange} />
        <StatCard label="Longest Streak" value={stats.longestStreak || 0} icon="bonfire-outline" tone={colors.red} />
        <StatCard label="XP" value={(stats.xp || 0).toLocaleString()} icon="sparkles-outline" tone={colors.brand} />
        <StatCard label="Total Points" value={(stats.totalPoints || 0).toLocaleString()} icon="star-outline" tone={colors.gold} />
        <StatCard label="Current Rank" value={stats.rank || 'Bronze'} icon="ribbon-outline" tone={colors.purple} />
        <StatCard label="Leaderboard" value={stats.leaderboardPosition ? `#${stats.leaderboardPosition}` : '--'} icon="trophy-outline" tone={colors.green} />
      </View>

      <SectionHeader title="Weekly progress" subtitle="A simple view of completed days this week." icon="calendar-outline" onPress={() => router.push('/challenge/streak')} actionLabel="Calendar" />
      <View style={styles.weekCard}>
        {weeklyProgress.map((item) => (
          <View key={item.key} style={styles.weekDay}>
            <View style={[styles.weekDot, item.active && styles.weekDotActive]}>
              {item.active ? <Ionicons name="checkmark" size={14} color={colors.onBrand} /> : null}
            </View>
            <Text style={styles.weekLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Quick categories" subtitle="Jump into the subjects students practice most." icon="grid-outline" actionLabel="View all" onPress={() => router.push('/challenge/categories')} />
      <View style={styles.quickGrid}>
        {quickCategories.map((item) => (
          <AnimatedPressable key={item.id} style={styles.quickCard} onPress={() => router.push({ pathname: '/challenge/question', params: { category: item.id } })}>
            <View style={[styles.quickIcon, { backgroundColor: `${item.tone}14` }]}>
              <Ionicons name={item.icon} size={18} color={item.tone} />
            </View>
            <Text style={styles.quickTitle}>{item.title}</Text>
            <Text style={styles.quickMeta}>{Math.round(item.progress * 100)}%</Text>
          </AnimatedPressable>
        ))}
      </View>

      <SectionHeader title="Recent activity" subtitle="Your latest challenge movement." icon="pulse-outline" />
      {recentActivity.length ? (
        recentActivity.slice(0, 3).map((item, index) => (
          <View key={`${item.dateKey}-${index}`} style={styles.listCard}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.green} />
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{item.category || 'Challenge'} completed</Text>
              <Text style={styles.listText}>{item.accuracy || 0}% accuracy - {item.dateKey || 'Today'}</Text>
            </View>
          </View>
        ))
      ) : (
        <EmptyState title="No activity yet" description="Start your first challenge to populate this feed." icon="flash-outline" />
      )}

      <SectionHeader title="Challenge history" subtitle="A preview of your recent attempts." icon="time-outline" actionLabel="History" onPress={() => router.push('/challenge/history')} />
      {dashboard.history?.length ? (
        dashboard.history.slice(0, 3).map((item) => (
          <Pressable key={item.id} style={styles.historyCard} onPress={() => router.push('/challenge/history')}>
            <View>
              <Text style={styles.cardTitle}>{item.category || 'Daily Challenge'}</Text>
              <Text style={styles.cardText}>{item.accuracy || 0}% accuracy - {item.xpEarned || 0} XP</Text>
            </View>
            <ChallengeBadge label={item.status || 'Completed'} tone={item.accuracy >= 70 ? colors.green : colors.orange} />
          </Pressable>
        ))
      ) : null}

      <View style={styles.footerActions}>
        <Button label="Leaderboard" variant="outline" icon="trophy-outline" onPress={() => router.push('/challenge/leaderboard')} style={styles.footerButton} />
        <Button label="Achievements" variant="outline" icon="ribbon-outline" onPress={() => router.push('/challenge/achievements')} style={styles.footerButton} />
      </View>
    </ScreenShell>
  );
}

// Built from live theme colors each time colors changes (see useMemo above),
// instead of a StyleSheet.create() bound to a static import.
function createStyles(colors) {
  return StyleSheet.create({
    hero: {
      backgroundColor: colors.brand,
      borderRadius: borderRadius['6xl'],
      padding: spacing.xl,
      marginBottom: spacing.lg,
      ...shadows.brand,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    heroIcon: {
      width: 46,
      height: 46,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.brandDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: { color: colors.onBrand, fontSize: 24, fontWeight: '900', lineHeight: 31 },
    heroText: { color: colors.onBrand, fontSize: 13, lineHeight: 19, marginTop: spacing.sm, fontWeight: '600' },
    heroActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    heroButton: { flex: 1 },
    continueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius['2xl'],
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      ...shadows.md,
    },
    continueBody: { flex: 1, gap: spacing.sm },
    roundButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    weekCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: borderRadius['2xl'],
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    offlineButton: {
      minHeight: 46,
      borderRadius: borderRadius.full,
      backgroundColor: colors.brandLight,
      borderWidth: 1,
      borderColor: colors.brandBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    offlineButtonText: {
      color: colors.brand,
      fontWeight: '900',
      fontSize: 13,
    },
    weekDay: { alignItems: 'center', gap: spacing.xs },
    weekDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.canvasLight, alignItems: 'center', justifyContent: 'center' },
    weekDotActive: { backgroundColor: colors.green },
    weekLabel: { color: colors.grey, fontSize: 11, fontWeight: '800' },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    quickCard: {
      minWidth: '31%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
    },
    quickIcon: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
    quickTitle: { color: colors.ink, fontSize: 11, fontWeight: '900', textAlign: 'center' },
    quickMeta: { color: colors.grey, fontSize: 10, fontWeight: '800' },
    listCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    listBody: { flex: 1 },
    listTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
    listText: { color: colors.grey, fontSize: 12, fontWeight: '600', marginTop: 2 },
    historyCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    cardTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
    cardText: { color: colors.grey, fontSize: 12, fontWeight: '600', marginTop: spacing.xs },
    footerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    footerButton: { flex: 1 },
  });
}
