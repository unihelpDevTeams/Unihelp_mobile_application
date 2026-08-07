import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import DailyStreakBanner from '../../src/shared/components/DailyStreakBanner';
import { useAuth } from '../../context/AuthContext';
import { fetchDailyStreak, recordDailyStreak } from '../../services/firestoreSync';
import { useRouter } from 'expo-router';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getStreakMilestones(streakCount) {
  const milestones = [3, 7, 14, 21, 30, 60, 90, 180, 365];
  const next = milestones.find((m) => m > streakCount);
  return { nextMilestone: next || null, progress: next ? ((streakCount % next) / next) * 100 : 100 };
}

export default function StreakScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [streakData, setStreakData] = useState(null);
  const [today, setToday] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const styles = useThemeStyles((c, s, r) => ({
    statsRow: { flexDirection: 'row', gap: s.sm, marginBottom: s['2xl'] },
    statCard: { flex: 1, backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s.lg, alignItems: 'center', gap: 4 },
    statIcon: { marginBottom: 2 },
    statValue: { fontSize: 22, fontWeight: '900', color: c.textPrimary },
    statLabel: { fontSize: 11, fontWeight: '700', color: c.textSecondary, textAlign: 'center' },
    calendarCard: { backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s.lg, marginBottom: s.lg },
    monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.md },
    monthText: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    monthNav: { padding: 4 },
    weekdayRow: { flexDirection: 'row', marginBottom: s.xs },
    weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    weekdayText: { fontSize: 11, fontWeight: '700', color: c.textTertiary },
    dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    dayText: { fontSize: 12, fontWeight: '600', color: c.textPrimary },
    dayDone: { backgroundColor: c.brand, borderRadius: 20, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    dayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.brand },
    milestoneCard: { backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s.lg, marginBottom: s.lg },
    milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: s.md },
    milestoneIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.orangeLight, alignItems: 'center', justifyContent: 'center' },
    milestoneTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary, flex: 1 },
    milestoneValue: { fontSize: 14, fontWeight: '800', color: c.orange },
    studyButton: { backgroundColor: c.brand, borderRadius: r.full, paddingVertical: 15, alignItems: 'center', marginBottom: s.lg },
    studyButtonPressed: { opacity: 0.9 },
    studyButtonText: { color: c.onBrand, fontSize: 15, fontWeight: '800' },
  }));

  useEffect(() => {
    fetchDailyStreak().then((data) => {
      setStreakData(data); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleStudyNow = async () => {
    try {
      const result = await recordDailyStreak();
      setStreakData(result);
      router.push('/challenge/categories');
    } catch {}
  };

  const streakCount = streakData?.streakCount || 0;
  const streakDates = streakData?.streakDates || [];
  const { nextMilestone, progress } = getStreakMilestones(streakCount);
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  return (
    <ScreenShell title="Daily Streak" subtitle="Keep your learning momentum going" showBack loading={loading}>
      <DailyStreakBanner streakCount={streakCount} streakDates={streakDates} onPress={() => {}} onStudyNow={handleStudyNow} />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={24} color={colors.orange} style={styles.statIcon} />
          <Text style={styles.statValue}>{streakCount}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color={colors.brand} style={styles.statIcon} />
          <Text style={styles.statValue}>{streakDates.length}</Text>
          <Text style={styles.statLabel}>Total Days</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={24} color={colors.gold} style={styles.statIcon} />
          <Text style={styles.statValue}>{nextMilestone ? `${streakCount}/${nextMilestone}` : 'Max'}</Text>
          <Text style={styles.statLabel}>Milestone</Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => setToday(new Date(year, month - 1))} style={styles.monthNav}>
            <Ionicons name="chevron-back" size={18} color={colors.icon} />
          </Pressable>
          <Text style={styles.monthText}>{MONTHS[month]} {year}</Text>
          <Pressable onPress={() => setToday(new Date(year, month + 1))} style={styles.monthNav}>
            <Ionicons name="chevron-forward" size={18} color={colors.icon} />
          </Pressable>
        </View>
        <View style={styles.weekdayRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <View key={d} style={styles.weekdayCell}><Text style={styles.weekdayText}>{d}</Text></View>
          ))}
        </View>
        <View style={styles.dayGrid}>
          {Array.from({ length: firstDay }).map((_, i) => <View key={`empty-${i}`} style={styles.dayCell} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isDone = streakDates.includes(dateStr);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            return (
              <View key={day} style={styles.dayCell}>
                {isDone ? (
                  <View style={styles.dayDone}>
                    <Ionicons name="checkmark" size={14} color={colors.onBrand} />
                  </View>
                ) : (
                  <Text style={[styles.dayText, isToday && { color: colors.brand, fontWeight: '800' }]}>{day}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {nextMilestone && (
        <View style={styles.milestoneCard}>
          <View style={styles.milestoneRow}>
            <View style={styles.milestoneIconWrap}>
              <Ionicons name="flag" size={18} color={colors.orange} />
            </View>
            <Text style={styles.milestoneTitle}>Next milestone: {nextMilestone} days</Text>
            <Text style={styles.milestoneValue}>{Math.round(progress)}%</Text>
          </View>
          <View style={{ height: 4, backgroundColor: colors.borderDefault, borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(progress, 100)}%`, height: '100%', backgroundColor: colors.brand, borderRadius: 2 }} />
          </View>
        </View>
      )}

      <Pressable onPress={handleStudyNow} style={({ pressed }) => [styles.studyButton, pressed && styles.studyButtonPressed]}>
        <Text style={styles.studyButtonText}>Study Now & Record Streak</Text>
      </Pressable>
    </ScreenShell>
  );
}
