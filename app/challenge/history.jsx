import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import { CHALLENGE_CATEGORIES } from '../../src/shared/challenge/data';
import { fetchChallengeHistory, normalizeAttemptDate } from '../../src/shared/challenge/service';
import { ChallengeBadge } from '../../src/shared/challenge/components/ChallengePieces';

const SORTS = [
  { key: 'recent', label: 'Recent' },
  { key: 'score', label: 'Score' },
  { key: 'accuracy', label: 'Accuracy' },
];

export default function ChallengeHistoryScreen() {
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recent');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const lastLoadedKeyRef = useRef('');
  const itemsRef = useRef([]);

  useFocusEffect(
    useCallback(() => {
      const currentKey = `${category || 'all'}:${sort}`;
      const hasLoadedItems = lastLoadedKeyRef.current === currentKey && itemsRef.current.length >= 0;

      if (hasLoadedItems) {
        return () => {};
      }

      lastLoadedKeyRef.current = currentKey;
      let cancelled = false;
      setLoading(true);
      fetchChallengeHistory({ category, sort })
        .then((data) => {
          if (!cancelled) {
            itemsRef.current = data;
            setItems(data);
          }
        })
        .catch(() => {
          if (!cancelled) {
            itemsRef.current = [];
            setItems([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [category, sort])
  );

  const filters = useMemo(() => [{ id: '', title: 'All' }, ...CHALLENGE_CATEGORIES], []);

  return (
    <ScreenShell title="History" subtitle="Past attempts, scores, XP, and timing." showBack loading={loading}>
      <View style={styles.filterWrap}>
        {filters.slice(0, 7).map((item) => (
          <Pressable key={item.id || 'all'} style={[styles.chip, category === item.id && styles.chipActive]} onPress={() => setCategory(item.id)}>
            <Text style={[styles.chipText, category === item.id && styles.chipTextActive]}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.filterWrap}>
        {SORTS.map((item) => (
          <Pressable key={item.key} style={[styles.sortChip, sort === item.key && styles.chipActive]} onPress={() => setSort(item.key)}>
            <Text style={[styles.chipText, sort === item.key && styles.chipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {items.length ? (
        items.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <View style={styles.historyIcon}>
                <Ionicons name="flash-outline" size={18} color={colors.brand} />
              </View>
              <View style={styles.historyBody}>
                <Text style={styles.historyTitle}>{item.category || 'Daily Challenge'}</Text>
                <Text style={styles.historyDate}>{normalizeAttemptDate(item) || 'Recently'}</Text>
              </View>
              <ChallengeBadge label={item.status || 'Completed'} tone={(item.accuracy || 0) >= 70 ? colors.green : colors.orange} />
            </View>
            <View style={styles.metricRow}>
              <Metric label="Score" value={`${item.score || 0}/${item.totalQuestions || 0}`} />
              <Metric label="Accuracy" value={`${item.accuracy || 0}%`} />
              <Metric label="Duration" value={`${Math.round((item.durationSeconds || 0) / 60)}m`} />
              <Metric label="XP" value={`+${item.xpEarned || 0}`} />
            </View>
          </View>
        ))
      ) : (
        <EmptyState title="No attempts yet" description="Your challenge attempts will appear here after completion." icon="time-outline" />
      )}
    </ScreenShell>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.grey, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: colors.surface },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyIcon: { width: 40, height: 40, borderRadius: borderRadius.md, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center' },
  historyBody: { flex: 1 },
  historyTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  historyDate: { color: colors.grey, fontSize: 12, fontWeight: '700', marginTop: 2 },
  metricRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  metric: { flex: 1, alignItems: 'center', backgroundColor: colors.canvasLight, borderRadius: borderRadius.lg, padding: spacing.sm },
  metricValue: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  metricLabel: { color: colors.grey, fontSize: 10, fontWeight: '800', marginTop: 2 },
});
