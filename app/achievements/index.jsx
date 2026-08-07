import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchAchievements, fetchUserStats } from '../../services/firestoreSync';

const ACHIEVEMENTS = [
  { id: '1', title: 'First Upload', description: 'Upload your first note', icon: 'cloud-upload-outline', points: 50, unlocked: true },
  { id: '2', title: 'Study Streak', description: 'Study for 7 days in a row', icon: 'flame-outline', points: 100, unlocked: true },
  { id: '3', title: 'Popular Upload', description: 'Get 100 downloads on one note', icon: 'trending-up-outline', points: 150, unlocked: false },
  { id: '4', title: 'Community Helper', description: 'Join 5 study groups', icon: 'people-outline', points: 75, unlocked: true },
  { id: '5', title: 'AI Master', description: 'Ask AI 50 questions', icon: 'sparkles-outline', points: 200, unlocked: false },
  { id: '6', title: 'Quiz Champion', description: 'Score 90%+ on 10 quizzes', icon: 'trophy-outline', points: 300, unlocked: false },
];

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState([]);
  const [userStats, setUserStats] = useState({ level: 1, xp: 0, nextLevelXp: 500 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userAchievements, stats] = await Promise.all([
        fetchAchievements(),
        fetchUserStats(),
      ]);
      setAchievements(userAchievements?.length ? userAchievements : ACHIEVEMENTS);
      setUserStats(stats || { level: 1, xp: 0, nextLevelXp: 500 });
    } catch {
      setAchievements(ACHIEVEMENTS);
      setUserStats({ level: 1, xp: 0, nextLevelXp: 500 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const progress = Math.min(userStats.xp / userStats.nextLevelXp, 1);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const unlockStyle = (unlocked) => ({
    opacity: unlocked ? 1 : 0.5,
    ...(unlocked ? shadows.lg : {}),
  });

  return (
    <ScreenShell title="Achievements" subtitle="Track your progress and earn rewards" showBack>
      {/* Level Progress */}
      <View style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>Level {userStats.level}</Text>
            <Text style={styles.levelSubtitle}>{userStats.xp} XP • {unlockedCount} badges</Text>
          </View>
          <View style={styles.levelBadge}>
            <Ionicons name="star" size={16} color={colors.gold} />
          </View>
        </View>
        
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        
        <Text style={styles.progressText}>
          {Math.round((1 - progress) * userStats.nextLevelXp)} XP to next level
        </Text>
      </View>

      {/* Achievements Grid */}
      <View style={styles.achievementsGrid}>
        {achievements.map((achievement) => (
          <View key={achievement.id} style={[styles.achievementCard, unlockStyle(achievement.unlocked)]}>
            <View style={[styles.achievementIcon, { backgroundColor: achievement.unlocked ? colors.brandLight : colors.canvasLight }]}>
              <Ionicons 
                name={achievement.unlocked ? achievement.icon : 'lock-closed-outline'} 
                size={24} 
                color={achievement.unlocked ? colors.brand : colors.greyLight} 
              />
            </View>
            <Text style={styles.achievementTitle} numberOfLines={1}>
              {achievement.title}
            </Text>
            <Text style={styles.achievementDesc} numberOfLines={2}>
              {achievement.description}
            </Text>
            <View style={styles.pointsPill}>
              <Ionicons name="star" size={10} color={achievement.unlocked ? colors.gold : colors.greyLight} />
              <Text style={[styles.pointsText, !achievement.unlocked && styles.pointsTextLocked]}>
                {achievement.points} pts
              </Text>
            </View>
          </View>
        ))}
      </View>

      {!achievements.length && !loading && (
        <EmptyState
          title="No achievements yet"
          description="Start using Unihelp to unlock badges and earn points!"
          illustration="achievements"
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  levelSubtitle: {
    fontSize: 13,
    color: colors.grey,
    marginTop: 2,
  },
  levelBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: 10,
    backgroundColor: colors.canvasLight,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: colors.grey,
    textAlign: 'right',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  achievementCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 11,
    color: colors.grey,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: spacing.sm,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.canvasLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
  },
  pointsTextLocked: {
    color: colors.greyLight,
  },
});