import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import SectionHeader from '../../src/shared/components/SectionHeader';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import { useAuth } from '../../context/AuthContext';
import { fetchChallengeLeaderboard, fetchChallengeStats, getChallengeAchievements } from '../../src/shared/challenge/service';
import { AchievementTile, ProgressBar, StatCard } from '../../src/shared/challenge/components/ChallengePieces';

export default function ChallengeProfileScreen() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({});
  const [ranks, setRanks] = useState({ university: null, department: null });
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      Promise.all([
        fetchChallengeStats(profile || {}),
        fetchChallengeLeaderboard({ scope: 'university', profile: profile || {} }),
        fetchChallengeLeaderboard({ scope: 'department', profile: profile || {} }),
      ])
        .then(([nextStats, universityRows, departmentRows]) => {
          if (cancelled) return;
          setStats(nextStats);
          setAchievements(getChallengeAchievements(nextStats).filter((item) => item.unlocked).slice(0, 4));
          setRanks({
            university: universityRows.findIndex((item) => item.uid === profile?.uid) + 1 || null,
            department: departmentRows.findIndex((item) => item.uid === profile?.uid) + 1 || null,
          });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [profile])
  );

  return (
    <ScreenShell title="Challenge Profile" subtitle="Your learning performance snapshot." showBack loading={loading}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(profile?.username || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileBody}>
          <Text style={styles.name}>{profile?.username || 'Student'}</Text>
          <Text style={styles.meta}>{[profile?.school, profile?.department].filter(Boolean).join(' - ') || 'UniHelp learner'}</Text>
          <View style={styles.rankPill}>
            <Ionicons name="ribbon-outline" size={14} color={colors.brandText} />
            <Text style={styles.rankText}>{stats.rank || 'Bronze'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Total XP" value={(stats.xp || 0).toLocaleString()} icon="sparkles-outline" tone={colors.brand} />
        <StatCard label="Current Rank" value={stats.rank || 'Bronze'} icon="ribbon-outline" tone={colors.purple} />
        <StatCard label="Department Rank" value={ranks.department ? `#${ranks.department}` : '--'} icon="people-outline" tone={colors.blue} />
        <StatCard label="University Rank" value={ranks.university ? `#${ranks.university}` : '--'} icon="business-outline" tone={colors.green} />
        <StatCard label="Questions Answered" value={stats.questionsAnswered || 0} icon="checkmark-done-outline" tone={colors.orange} />
        <StatCard label="Accuracy" value={`${stats.accuracy || 0}%`} icon="analytics-outline" tone={colors.teal} />
        <StatCard label="Average Score" value={`${stats.averageScore || 0}%`} icon="speedometer-outline" tone={colors.gold} />
        <StatCard label="Current Streak" value={stats.currentStreak || 0} icon="flame-outline" tone={colors.red} />
        <StatCard label="Longest Streak" value={stats.longestStreak || 0} icon="bonfire-outline" tone={colors.orange} />
      </View>

      <View style={styles.completionCard}>
        <View style={styles.completionTop}>
          <Text style={styles.completionTitle}>Completion rate</Text>
          <Text style={styles.completionValue}>{stats.completionRate || 0}%</Text>
        </View>
        <ProgressBar value={(stats.completionRate || 0) / 100} tone={colors.brand} />
      </View>

      <SectionHeader title="Badges" subtitle="Unlocked achievements from your challenge journey." icon="ribbon-outline" />
      <View style={styles.badgeGrid}>
        {achievements.length ? achievements.map((item) => <AchievementTile key={item.id} item={item} />) : (
          <View style={styles.emptyBadge}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.greyLight} />
            <Text style={styles.emptyBadgeText}>Complete a challenge to unlock your first badge.</Text>
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.surface, fontSize: 24, fontWeight: '900' },
  profileBody: { flex: 1 },
  name: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  meta: { color: colors.grey, fontSize: 12, fontWeight: '700', marginTop: spacing.xs },
  rankPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs, backgroundColor: colors.brandLight, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.sm },
  rankText: { color: colors.brandText, fontSize: 12, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  completionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  completionTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  completionTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  completionValue: { color: colors.brandText, fontSize: 14, fontWeight: '900' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emptyBadge: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
  },
  emptyBadgeText: { color: colors.grey, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
