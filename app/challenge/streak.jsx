import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import SectionHeader from '../../src/shared/components/SectionHeader';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import { useAuth } from '../../context/AuthContext';
import { buildCalendarDays } from '../../src/shared/challenge/data';
import { fetchChallengeStats } from '../../src/shared/challenge/service';
import { StatCard } from '../../src/shared/challenge/components/ChallengePieces';

export default function ChallengeStreakScreen() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      fetchChallengeStats(profile || {})
        .then((data) => {
          if (!cancelled) setStats(data);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [profile])
  );

  const days = useMemo(() => buildCalendarDays(126, stats.streakDates || []), [stats.streakDates]);
  const monthCount = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return days.filter((item) => item.month === currentMonth && item.active).length;
  }, [days]);

  return (
    <ScreenShell title="Streak Calendar" subtitle="A LinkedIn/GitHub style view of consistency." showBack loading={loading}>
      <View style={styles.heroCard}>
        <View style={styles.flame}>
          <Ionicons name="flame" size={34} color={colors.orange} />
        </View>
        <Text style={styles.heroValue}>{stats.currentStreak || 0}</Text>
        <Text style={styles.heroLabel}>Current challenge streak</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Current Streak" value={stats.currentStreak || 0} icon="flame-outline" tone={colors.orange} />
        <StatCard label="Longest Streak" value={stats.longestStreak || 0} icon="bonfire-outline" tone={colors.red} />
        <StatCard label="Monthly Activity" value={monthCount} icon="calendar-outline" tone={colors.green} />
      </View>

      <SectionHeader title="Activity calendar" subtitle="Completed days are filled. Missed days stay quiet." icon="calendar-number-outline" />
      <View style={styles.calendarCard}>
        <View style={styles.calendarGrid}>
          {days.map((item) => (
            <View
              key={item.key}
              style={[
                styles.day,
                item.active && styles.dayActive,
                item.isToday && styles.dayToday,
              ]}
            />
          ))}
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendText}>Missed</Text>
          <View style={styles.legendDot} />
          <View style={[styles.legendDot, styles.dayActive]} />
          <Text style={styles.legendText}>Completed</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  flame: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.orangeLight, alignItems: 'center', justifyContent: 'center' },
  heroValue: { color: colors.ink, fontSize: 44, fontWeight: '900', marginTop: spacing.md },
  heroLabel: { color: colors.grey, fontSize: 13, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    ...shadows.sm,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  day: { width: 13, height: 13, borderRadius: 4, backgroundColor: colors.canvasLight, borderWidth: 1, borderColor: colors.borderLight },
  dayActive: { backgroundColor: colors.green, borderColor: colors.green },
  dayToday: { borderColor: colors.brand, borderWidth: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs, marginTop: spacing.lg },
  legendDot: { width: 13, height: 13, borderRadius: 4, backgroundColor: colors.canvasLight, borderWidth: 1, borderColor: colors.borderLight },
  legendText: { color: colors.grey, fontSize: 11, fontWeight: '800' },
});
