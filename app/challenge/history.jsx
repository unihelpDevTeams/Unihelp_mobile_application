import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { CHALLENGE_CATEGORIES } from '../../src/shared/challenge/data';
import { fetchChallengeHistory, normalizeAttemptDate } from '../../src/shared/challenge/service';
import { ChallengeBadge, ProgressBar } from '../../src/shared/challenge/components/ChallengePieces';

const SORTS = [
  { key: 'recent', label: 'Recent', icon: 'time-outline' },
  { key: 'score', label: 'Score', icon: 'trophy-outline' },
  { key: 'accuracy', label: 'Accuracy', icon: 'analytics-outline' },
];

const formatDuration = (seconds) => {
  const minutes = Math.max(0, Math.round((Number(seconds) || 0) / 60));
  return minutes < 1 ? '<1m' : `${minutes}m`;
};

export default function ChallengeHistoryScreen() {
  const { colors } = useTheme();
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recent');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const lastLoadedKeyRef = useRef('');

  const styles = useThemeStyles((c, s, r) => ({
    content: { gap: s.md, paddingBottom: s['3xl'] },
    summaryCard: {
      overflow: 'hidden',
      backgroundColor: c.surfacePrimary,
      borderRadius: r['3xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
    summaryTop: { flexDirection: 'row', alignItems: 'center', gap: s.md },
    summaryIcon: { width: 44, height: 44, borderRadius: r.lg, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    summaryCopy: { flex: 1 },
    summaryTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    summarySubtitle: { color: c.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17 },
    summaryMetrics: { flexDirection: 'row', marginTop: s.lg, paddingTop: s.md, borderTopWidth: 1, borderTopColor: c.borderDefault },
    summaryMetric: { flex: 1, alignItems: 'center', gap: 3 },
    summaryMetricValue: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    summaryMetricLabel: { color: c.textTertiary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
    sectionLabel: { color: c.textTertiary, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: s.xs },
    filterScroll: { flexDirection: 'row', gap: s.sm, paddingRight: s.lg, paddingBottom: 2 },
    chip: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: r.full,
      backgroundColor: c.surfacePrimary,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingHorizontal: s.md,
    },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    categoryChip: { flexShrink: 0 },
    sortChip: { flex: 1 },
    chipText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
    chipTextActive: { color: c.onBrand },
    sortRow: { flexDirection: 'row', gap: s.sm },
    listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: s.xs },
    listTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '900' },
    listCount: { color: c.textTertiary, fontSize: 12, fontWeight: '800' },
    historyCard: {
      backgroundColor: c.surfacePrimary,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
      gap: s.md,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 7,
      elevation: 1,
    },
    historyTop: { flexDirection: 'row', alignItems: 'center', gap: s.md },
    historyIcon: { width: 42, height: 42, borderRadius: r.lg, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    historyBody: { flex: 1, minWidth: 0 },
    historyTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '900' },
    historyDate: { color: c.textTertiary, fontSize: 11, fontWeight: '700', marginTop: 3 },
    accuracyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.xs },
    accuracyLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '800' },
    accuracyValue: { color: c.textPrimary, fontSize: 11, fontWeight: '900' },
    metricRow: { flexDirection: 'row', gap: s.xs },
    metric: { flex: 1, minWidth: 0, alignItems: 'center', backgroundColor: c.surfaceSecondary, borderRadius: r.md, paddingVertical: s.sm, paddingHorizontal: 3 },
    metricValue: { color: c.textPrimary, fontSize: 13, fontWeight: '900' },
    metricLabel: { color: c.textTertiary, fontSize: 9, fontWeight: '800', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.3 },
    errorCard: { flexDirection: 'row', alignItems: 'center', gap: s.md, padding: s.md, borderRadius: r.xl, backgroundColor: c.dangerLight, borderWidth: 1, borderColor: c.dangerBorder },
    errorCopy: { flex: 1, color: c.danger, fontSize: 12, lineHeight: 17 },
    retryButton: { minHeight: 42, paddingHorizontal: s.md, borderRadius: r.md, backgroundColor: c.surfacePrimary, justifyContent: 'center' },
    retryText: { color: c.danger, fontSize: 12, fontWeight: '900' },
  }));

  useFocusEffect(
    useCallback(() => {
      const currentKey = `${category || 'all'}:${sort}:${retryKey}`;
      if (lastLoadedKeyRef.current === currentKey) return undefined;

      lastLoadedKeyRef.current = currentKey;
      let cancelled = false;
      setLoading(true);
      setLoadError('');
      fetchChallengeHistory({ category, sort })
        .then((data) => {
          if (!cancelled) {
            const safeItems = Array.isArray(data) ? data : [];
            setItems(safeItems);
          }
        })
        .catch((error) => {
          console.warn('Could not load challenge history:', error?.message || error);
          if (!cancelled) {
            setLoadError('Your challenge history could not be loaded. Check your connection and try again.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [category, retryKey, sort])
  );

  const filters = useMemo(() => [{ id: '', title: 'All' }, ...CHALLENGE_CATEGORIES], []);
  const averageAccuracy = items.length
    ? Math.round(items.reduce((total, item) => total + (Number(item.accuracy) || 0), 0) / items.length)
    : 0;
  const totalXp = items.reduce((total, item) => total + (Number(item.xpEarned) || 0), 0);

  return (
    <ScreenShell title="History" subtitle="Your challenge progress and past attempts." showBack loading={loading && !items.length}>
      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryIcon}>
              <Ionicons name="bar-chart-outline" size={21} color={colors.brand} />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryTitle}>Progress at a glance</Text>
              <Text style={styles.summarySubtitle}>Every attempt is a step toward stronger recall.</Text>
            </View>
          </View>
          <View style={styles.summaryMetrics}>
            <SummaryMetric label="Attempts" value={items.length.toLocaleString()} styles={styles} />
            <SummaryMetric label="Avg. accuracy" value={`${averageAccuracy}%`} styles={styles} />
            <SummaryMetric label="XP earned" value={totalXp.toLocaleString()} styles={styles} />
          </View>
        </View>

        <View>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollFilters
            filters={filters.slice(0, 7)}
            selected={category}
            onSelect={setCategory}
            styles={styles}
            accessibilityLabel="Challenge category filters"
          />
        </View>

        <View>
          <Text style={styles.sectionLabel}>Sort by</Text>
          <View style={styles.sortRow}>
            {SORTS.map((item) => {
              const selected = sort === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSort(item.key)}
                  style={({ pressed }) => [styles.chip, styles.sortChip, selected && styles.chipActive, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name={item.icon} size={14} color={selected ? colors.onBrand : colors.textSecondary} />
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Past attempts</Text>
          <Text style={styles.listCount}>{loading ? 'Updating…' : `${items.length} ${items.length === 1 ? 'attempt' : 'attempts'}`}</Text>
        </View>

        {loadError ? (
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={19} color={colors.danger} />
            <Text style={styles.errorCopy}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading challenge history"
              onPress={() => setRetryKey((value) => value + 1)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : items.length ? (
          items.map((item) => (
            <HistoryCard key={item.id} item={item} styles={styles} colors={colors} />
          ))
        ) : (
          <EmptyState
            title="No attempts yet"
            description="Complete a challenge and your scores, accuracy, and XP will appear here."
            icon="time-outline"
          />
        )}
      </View>
    </ScreenShell>
  );
}

function ScrollFilters({ filters, selected, onSelect, styles, accessibilityLabel }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      accessibilityLabel={accessibilityLabel}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScroll}
    >
      {filters.map((item) => {
        const active = selected === item.id;
        return (
          <Pressable
            key={item.id || 'all'}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [styles.chip, styles.categoryChip, active && styles.chipActive, pressed && { opacity: 0.8 }]}
          >
            {active ? <Ionicons name="checkmark" size={14} color={colors.onBrand} /> : null}
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.title}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SummaryMetric({ label, value, styles }) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryMetricValue}>{value}</Text>
      <Text style={styles.summaryMetricLabel}>{label}</Text>
    </View>
  );
}

function HistoryCard({ item, styles, colors }) {
  const accuracy = Math.min(100, Math.max(0, Number(item.accuracy) || 0));
  const tone = accuracy >= 70 ? colors.success : colors.warning;
  const totalQuestions = Number(item.totalQuestions) || 0;
  const score = Number(item.score) || 0;
  const xp = Number(item.xpEarned) || 0;
  const title = CHALLENGE_CATEGORIES.find((category) => category.id === item.category)?.title
    || item.category
    || 'Daily Challenge';

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTop}>
        <View style={styles.historyIcon}>
          <Ionicons name="flash-outline" size={19} color={colors.brand} />
        </View>
        <View style={styles.historyBody}>
          <Text style={styles.historyTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.historyDate} numberOfLines={1}>{normalizeAttemptDate(item) || 'Recently'}</Text>
        </View>
        <ChallengeBadge
          label={item.status || 'Completed'}
          tone={accuracy >= 70 ? colors.success : colors.warning}
        />
      </View>
      <View>
        <View style={styles.accuracyRow}>
          <Text style={styles.accuracyLabel}>Accuracy</Text>
          <Text style={[styles.accuracyValue, { color: tone }]}>{accuracy}%</Text>
        </View>
        <ProgressBar value={accuracy / 100} tone={tone} height={7} />
      </View>
      <View style={styles.metricRow}>
        <Metric label="Score" value={`${score}/${totalQuestions}`} styles={styles} />
        <Metric label="Duration" value={formatDuration(item.durationSeconds)} styles={styles} />
        <Metric label="XP" value={`+${xp}`} styles={styles} />
      </View>
    </View>
  );
}

function Metric({ label, value, styles }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
