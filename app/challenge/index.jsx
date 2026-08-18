import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { fetchChallengeDashboard } from '../../src/shared/challenge/service';
import { AnimatedPressable } from '../../src/shared/challenge/components/ChallengePieces';

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

  const quickCategories = useMemo(() => getRecommendedCategories(profile).slice(0, 4), [profile]);

  return (
    <ScreenShell
      showBack
      title="Challenge"
      subtitle="Master your subjects. Compete with peers."
      loading={loading}>
        
      <View style={styles.footerActions}>
        <Button label="Leaderboard" variant="outline" icon="trophy-outline" onPress={() => router.push('/challenge/leaderboard')} style={styles.footerButton} />
        <Button label="Achievements" variant="outline" icon="ribbon-outline" onPress={() => router.push('/challenge/achievements')} style={styles.footerButton} />
      </View>
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={[colors.brand, colors.purple || colors.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroHaloTop} />
          <View style={styles.heroHaloBottom} />
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <View style={styles.heroBadge}>
                <Ionicons name="flame" size={14} color={colors.orange} />
                <Text style={styles.heroBadgeText}>{stats.currentStreak || 0} Day Streak</Text>
              </View>
              <View style={styles.heroRankBadge}>
                <Ionicons name="ribbon" size={12} color={colors.gold} />
                <Text style={styles.heroRankText}>{stats.rank || 'Bronze'}</Text>
              </View>
            </View>
            
            <Text style={styles.heroTitle}>
              {completedToday ? "You're on fire today! Keep it up." : "Ready to test your limits?"}
            </Text>
            <Text style={styles.heroSubtitle}>
              Daily questions, targeted practice, and campus-wide rankings.
            </Text>

            <View style={styles.heroActions}>
              <Pressable
                onPress={() => router.push('/challenge/question')}
                style={({ pressed }) => [styles.heroPrimaryBtn, pressed && styles.heroBtnPressed]}
              >
                <Text style={styles.heroPrimaryBtnText}>Start Daily Challenge</Text>
                <Ionicons name="play" size={16} color={colors.brandText} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.statsOverview}>
        <View style={styles.mainStatBox}>
          <Text style={styles.mainStatLabel}>Total XP</Text>
          <Text style={styles.mainStatValue}>{(stats.xp || 0).toLocaleString()}</Text>
          <View style={styles.mainStatSub}>
            <Ionicons name="sparkles" size={12} color={colors.brand} />
            <Text style={styles.mainStatSubText}>Keep earning to rank up</Text>
          </View>
        </View>
        <View style={styles.secondaryStatsCol}>
          <View style={styles.miniStatBox}>
            <View style={[styles.miniStatIcon, { backgroundColor: `${colors.green}15` }]}>
              <Ionicons name="trophy" size={16} color={colors.green} />
            </View>
            <View>
              <Text style={styles.miniStatVal}>{stats.leaderboardPosition ? `#${stats.leaderboardPosition}` : '--'}</Text>
              <Text style={styles.miniStatLbl}>Global Rank</Text>
            </View>
          </View>
          <View style={styles.miniStatBox}>
            <View style={[styles.miniStatIcon, { backgroundColor: `${colors.orange}15` }]}>
              <Ionicons name="bonfire" size={16} color={colors.orange} />
            </View>
            <View>
              <Text style={styles.miniStatVal}>{stats.longestStreak || 0}</Text>
              <Text style={styles.miniStatLbl}>Best Streak</Text>
            </View>
          </View>
        </View>
      </View>

      <SectionHeader title="Weekly progress" subtitle="Consistency builds mastery." icon="calendar-outline" onPress={() => router.push('/challenge/streak')} actionLabel="Calendar" />
      <View style={styles.weekCard}>
        {weeklyProgress.map((item) => (
          <View key={item.key} style={styles.weekDay}>
            <View style={[styles.weekDot, item.active && { backgroundColor: colors.brand }]}>
              {item.active ? <Ionicons name="checkmark" size={12} color={colors.onBrand} /> : <View style={styles.weekDotEmpty} />}
            </View>
            <Text style={[styles.weekLabel, item.active && { color: colors.ink }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Targeted practice" subtitle="Focus on specific topics." icon="grid-outline" actionLabel="View all" onPress={() => router.push('/challenge/categories')} />
      <View style={styles.quickGrid}>
        {quickCategories.map((item) => (
          <AnimatedPressable key={item.id} style={styles.quickCard} onPress={() => router.push({ pathname: '/challenge/question', params: { category: item.id } })}>
            <View style={styles.quickCardHeader}>
              <View style={[styles.quickIcon, { backgroundColor: `${item.tone}14` }]}>
                <Ionicons name={item.icon} size={18} color={item.tone} />
              </View>
              <Ionicons name="arrow-forward" size={14} color={colors.greyLight} />
            </View>
            <Text style={styles.quickTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.quickProgressTrack}>
              <View style={[styles.quickProgressFill, { backgroundColor: item.tone, width: `${Math.round(item.progress * 100)}%` }]} />
            </View>
          </AnimatedPressable>
        ))}
      </View>

      <SectionHeader title="Challenge history" subtitle="Your recent results." icon="time-outline" actionLabel="History" onPress={() => router.push('/challenge/history')} />
      {dashboard.history?.length ? (
        <View style={styles.historyList}>
          {dashboard.history.slice(0, 3).map((item, index) => (
            <Pressable key={item.id} style={[styles.historyCard, index === 2 && styles.historyCardLast]} onPress={() => router.push('/challenge/history')}>
              <View style={styles.historyLeft}>
                <View style={[styles.historyIcon, { backgroundColor: item.accuracy >= 70 ? `${colors.green}15` : `${colors.orange}15` }]}>
                  <Ionicons name={item.accuracy >= 70 ? "checkmark-circle" : "barbell"} size={20} color={item.accuracy >= 70 ? colors.green : colors.orange} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>{item.category || 'Daily Challenge'}</Text>
                  <Text style={styles.cardText}>{item.accuracy || 0}% accuracy • {item.xpEarned || 0} XP</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState title="No history yet" description="Start a challenge to see your records here." icon="document-text-outline" />
      )}
    </ScreenShell>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    heroWrap: {
      borderRadius: borderRadius['3xl'],
      marginBottom: spacing.xl,
      overflow: 'hidden',
      ...shadows.brand,
    },
    heroGradient: {
      padding: spacing.xl,
      position: 'relative',
    },
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
    heroContent: {
      position: 'relative',
      zIndex: 1,
    },
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
      backgroundColor: 'rgba(255,255,255,0.9)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
    },
    heroBadgeText: {
      color: colors.orange,
      fontSize: 11,
      fontWeight: '900',
    },
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
    heroRankText: {
      color: colors.onBrand,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: colors.onBrand,
      fontSize: 26,
      fontWeight: '900',
      lineHeight: 32,
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13.5,
      lineHeight: 20,
      marginTop: spacing.sm,
      fontWeight: '500',
      maxWidth: '90%',
    },
    heroActions: {
      marginTop: spacing.xl,
      flexDirection: 'row',
    },
    heroPrimaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.xl,
      paddingVertical: 12,
      borderRadius: borderRadius.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    heroBtnPressed: {
      transform: [{ scale: 0.97 }],
      opacity: 0.9,
    },
    heroPrimaryBtnText: {
      color: colors.brandText,
      fontSize: 14,
      fontWeight: '800',
    },
    statsOverview: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
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
    mainStatLabel: {
      color: colors.grey,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    mainStatValue: {
      color: colors.ink,
      fontSize: 32,
      fontWeight: '900',
      marginVertical: spacing.xs,
    },
    mainStatSub: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    mainStatSubText: {
      color: colors.grey,
      fontSize: 11,
      fontWeight: '600',
    },
    secondaryStatsCol: {
      flex: 1,
      gap: spacing.sm,
    },
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
    miniStatIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniStatVal: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '900',
    },
    miniStatLbl: {
      color: colors.grey,
      fontSize: 10,
      fontWeight: '700',
    },
    weekCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: borderRadius['2xl'],
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    weekDay: { alignItems: 'center', gap: spacing.sm },
    weekDot: { 
      width: 26, 
      height: 26, 
      borderRadius: 13, 
      backgroundColor: colors.canvasLight, 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    weekDotEmpty: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.borderDefault,
    },
    weekLabel: { color: colors.grey, fontSize: 11, fontWeight: '800' },
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
    quickTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 8 },
    quickProgressTrack: {
      height: 4,
      backgroundColor: colors.canvasLight,
      borderRadius: 2,
      overflow: 'hidden',
    },
    quickProgressFill: {
      height: '100%',
      borderRadius: 2,
    },
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
    historyCardLast: {
      borderBottomWidth: 0,
    },
    historyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    historyIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
    cardText: { color: colors.grey, fontSize: 12, fontWeight: '600', marginTop: 2 },
    footerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md },
    footerButton: { flex: 1 },
  });
}
