import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchLeaderboard } from '../../services/firestoreSync';

const RANK_BADGES = [
  { icon: '🥇', color: '#F59E0B' },
  { icon: '🥈', color: '#94A3B8' },
  { icon: '🥉', color: '#D97706' },
];

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('weekly');

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLeaderboard(timeframe);
      setLeaders(Array.isArray(data) ? data : []);
    } catch {
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const renderLeader = ({ item, index }) => {
    const isTopThree = index < 3;
    const badge = RANK_BADGES[index];
    
    return (
      <View style={[styles.leaderCard, isTopThree && styles.leaderCardTop]}>
        <View style={styles.leaderRank}>
          {isTopThree ? (
            <Text style={styles.rankBadge}>{badge.icon}</Text>
          ) : (
            <Text style={styles.rankText}>{index + 1}</Text>
          )}
        </View>
        
        <View style={[styles.avatar, { backgroundColor: isTopThree ? colors.brand : colors.canvasLight }]}>
          <Text style={[styles.avatarText, isTopThree && styles.avatarTextTop]}>
            {item.username?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        
        <View style={styles.leaderInfo}>
          <Text style={styles.leaderName} numberOfLines={1}>
            {item.username || 'Anonymous'}
          </Text>
          <Text style={styles.leaderStats}>
            {item.uploads || 0} uploads • {item.contributions || 0} contributions
          </Text>
        </View>
        
        <View style={styles.pointsContainer}>
          <Ionicons name="star" size={14} color={isTopThree ? colors.gold : colors.greyLight} />
          <Text style={[styles.points, isTopThree && styles.pointsTop]}>
            {item.points?.toLocaleString() || 0}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenShell title="Leaderboard" subtitle="Top contributors this week" showBack>
      {/* Timeframe Selector */}
      <View style={styles.timeframeContainer}>
        {['weekly', 'monthly', 'alltime'].map((period) => (
          <View
            key={period}
            style={[styles.timeframeButton, timeframe === period && styles.timeframeButtonActive]}
          >
            <Text style={[styles.timeframeText, timeframe === period && styles.timeframeTextActive]}>
              {period === 'weekly' ? 'This Week' : period === 'monthly' ? 'This Month' : 'All Time'}
            </Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : leaders.length ? (
        <FlatList
          data={leaders}
          keyExtractor={(item) => item.id || item.uid}
          renderItem={renderLeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title="No rankings yet"
          description="Contribute by uploading notes, answering questions, and helping other students."
          illustration="leaderboard"
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  timeframeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
    ...shadows.sm,
  },
  timeframeButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  timeframeButtonActive: {
    backgroundColor: colors.brandLight,
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.grey,
  },
  timeframeTextActive: {
    color: colors.brandText,
  },
  list: {
    paddingBottom: spacing['3xl'],
  },
  loadingContainer: {
    gap: spacing.sm,
  },
  skeletonCard: {
    height: 72,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  leaderCardTop: {
    borderColor: colors.brand,
    backgroundColor: colors.brandLight,
  },
  leaderRank: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    fontSize: 20,
  },
  rankText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.grey,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  avatarTextTop: {
    color: colors.surface,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  leaderStats: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 2,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  points: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.grey,
  },
  pointsTop: {
    color: colors.ink,
  },
});