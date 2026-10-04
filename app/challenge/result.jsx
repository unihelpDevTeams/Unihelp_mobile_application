import React, { useCallback, useMemo, useState } from 'react';
import { BackHandler, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { Button } from '../../src/shared/components/Button';
import { shadows, typography } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { CelebrationBurst, ChallengeBadge, ProgressBar, StatCard } from '../../src/shared/challenge/components/ChallengePieces';

// Only appends hex alpha to #RRGGBB; leaves other colour formats untouched.
const withAlpha = (color, alpha = '22') =>
  typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Route params may be string | string[], already decoded or still encoded.
// Previously a double-decode (or a literal "null") threw / crashed on `result.accuracy`.
function parseResult(raw) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || !value) return {};
  const attempts = [() => JSON.parse(value), () => JSON.parse(decodeURIComponent(value))];
  for (const attempt of attempts) {
    try {
      const parsed = attempt();
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* try next */
    }
  }
  return {};
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'wrong', label: 'Wrong' },
  { id: 'skipped', label: 'Skipped' },
  { id: 'correct', label: 'Correct' },
];

const getStatus = (item) => (item.selectedIndex == null ? 'skipped' : item.isCorrect ? 'correct' : 'wrong');

export default function ChallengeResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const result = useMemo(() => parseResult(params.result), [params.result]);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  const correct = num(result.correct);
  const wrong = num(result.wrong);
  const skipped = num(result.skipped);
  const totalQuestions = num(result.totalQuestions) || correct + wrong + skipped;
  const accuracy = Math.min(100, Math.max(0, Math.round(result.accuracy != null ? num(result.accuracy) : totalQuestions ? (correct / totalQuestions) * 100 : 0)));
  const hasResult = totalQuestions > 0;
  const success = accuracy >= 70;
  const perfect = hasResult && accuracy === 100;
  const resultTone = success ? colors.green : colors.orange;
  const resultSoftTone = success ? colors.greenLight : colors.orangeLight;

  const title = perfect ? 'Perfect run' : success ? 'Strong finish' : accuracy >= 40 ? 'Good effort' : 'Practice logged';
  const message = perfect
    ? 'Every answer was right. Your progress has been updated.'
    : success
      ? 'You passed. Your XP, rank, and streak have been updated.'
      : 'Review your answers to improve next time. Your progress has been saved.';

  const goContinue = useCallback(() => router.replace('/challenge'), [router]);

  // Hardware back on Android would return to the finished quiz — send people to the challenge hub instead.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (reviewOpen) return false; // Modal handles its own close
        goContinue();
        return true;
      });
      return () => sub.remove();
    }, [goContinue, reviewOpen]),
  );

  const answers = Array.isArray(result.answers) ? result.answers : [];
  const counts = useMemo(
    () => answers.reduce((acc, item) => ({ ...acc, [getStatus(item)]: (acc[getStatus(item)] || 0) + 1 }), { all: answers.length }),
    [answers],
  );
  const visibleAnswers = useMemo(
    () => answers.map((item, index) => ({ item, index })).filter(({ item }) => filter === 'all' || getStatus(item) === filter),
    [answers, filter],
  );

  const styles = useThemeStyles((c, s, r) => ({
    hero: {
      backgroundColor: c.surfacePrimary,
      borderRadius: r['3xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.xl,
      alignItems: 'center',
      gap: s.md,
      marginBottom: s.lg,
      overflow: 'hidden',
      ...shadows.md,
    },
    heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: resultTone },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
      backgroundColor: resultSoftTone,
      borderWidth: 1,
      borderColor: withAlpha(resultTone, '44'),
      paddingHorizontal: s.md,
      paddingVertical: s.xs,
      borderRadius: r.full,
      zIndex: 1,
    },
    statusPillText: { ...typography.xs, ...typography.extrabold, color: resultTone },
    resultRing: {
      width: 136,
      height: 136,
      borderRadius: 68,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 9,
      borderColor: resultTone,
      backgroundColor: c.surfacePrimary,
      zIndex: 1,
      shadowColor: resultTone,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 5,
    },
    resultScore: { color: c.textPrimary, fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
    resultLabel: { color: c.textSecondary, fontSize: 12, fontWeight: '800', marginTop: s.xs },
    heroTitle: { color: c.textPrimary, fontSize: 23, fontWeight: '900', zIndex: 1, letterSpacing: -0.2 },
    heroText: { color: c.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center', zIndex: 1, lineHeight: 19 },
    progressWrap: { width: '100%', gap: s.xs, zIndex: 1 },
    progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressText: { ...typography.xs, ...typography.extrabold, color: c.textSecondary },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginBottom: s.lg },
    summaryCard: {
      backgroundColor: c.surfacePrimary,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      gap: s.md,
      ...shadows.sm,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.md },
    summaryLabel: { color: c.textPrimary, fontSize: 13, fontWeight: '800' },
    answerSplit: { flexDirection: 'row', gap: s.sm, marginTop: s.sm },
    answerStat: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: c.background,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
    },
    answerValue: { fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
    answerLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '800', marginTop: s.xs },
    actions: { flexDirection: 'row', gap: s.sm, marginTop: s.lg, paddingBottom: s.xl },
    actionButton: { flex: 1 },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: r.md,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    closeButtonPressed: { opacity: 0.75 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginBottom: s.md },
    filterChip: {
      paddingHorizontal: s.md,
      paddingVertical: s.sm,
      borderRadius: r.full,
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.surfacePrimary,
    },
    filterChipActive: { backgroundColor: c.brand, borderColor: c.brand },
    filterText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
    filterTextActive: { color: '#FFFFFF' },
    reviewCard: {
      backgroundColor: c.surfacePrimary,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginBottom: s.md,
      ...shadows.sm,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.sm, marginBottom: s.sm },
    reviewCounter: { color: c.brand, fontSize: 12, fontWeight: '900' },
    reviewPrompt: { color: c.textPrimary, fontSize: 15, fontWeight: '900', lineHeight: 22, marginBottom: s.md },
    answerBox: { borderRadius: r.lg, borderWidth: 1, padding: s.md, marginBottom: s.sm, gap: 2 },
    answerBoxLabel: { fontSize: 11, fontWeight: '800', color: c.textSecondary },
    answerBoxText: { fontSize: 14, fontWeight: '800', lineHeight: 20, color: c.textPrimary },
    reviewExplanation: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: s.xs,
      backgroundColor: c.background,
      borderRadius: r.lg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
    },
    emptyBox: { alignItems: 'center', gap: s.sm, padding: s['2xl'] },
    emptyText: { color: c.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  }), [resultTone, resultSoftTone]);

  const statusMeta = {
    correct: { label: 'Correct', tone: colors.green, icon: 'checkmark-circle-outline' },
    wrong: { label: 'Wrong', tone: colors.red, icon: 'close-circle-outline' },
    skipped: { label: 'Skipped', tone: colors.orange, icon: 'play-skip-forward-outline' },
  };

  const rankLabel = result.rankChanged && result.previousRank
    ? `${result.previousRank} to ${result.nextRank}`
    : result.nextRank || 'Bronze';

  return (
    <ScreenShell title="Result" subtitle="Challenge completed" showBack={false}>
      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        {success ? <CelebrationBurst visible /> : null}
        <View style={styles.statusPill}>
          <Ionicons name={success ? 'trophy-outline' : 'barbell-outline'} size={13} color={resultTone} />
          <Text style={styles.statusPillText}>{success ? 'Passed' : 'Practice saved'}</Text>
        </View>
        <View style={styles.resultRing} accessible accessibilityLabel={`Score ${num(result.score)} out of ${totalQuestions}`}>
          <Text style={styles.resultScore}>{num(result.score)}/{totalQuestions}</Text>
          <Text style={styles.resultLabel}>Score</Text>
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroText}>{message}</Text>
        <View style={styles.progressWrap}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressText}>Accuracy</Text>
            <Text style={styles.progressText}>{accuracy}%</Text>
          </View>
          <ProgressBar value={accuracy / 100} tone={resultTone} />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Accuracy" value={`${accuracy}%`} icon="analytics-outline" tone={resultTone} />
        <StatCard label="XP earned" value={`+${num(result.xpEarned)}`} icon="sparkles-outline" tone={colors.brand} />
        <StatCard label="Points earned" value={`+${num(result.pointsEarned)}`} icon="star-outline" tone={colors.gold} />
        <StatCard label="Current streak" value={String(num(result.currentStreak))} icon="flame-outline" tone={colors.orange} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Rank</Text>
          <ChallengeBadge label={rankLabel} tone={result.rankChanged ? colors.green : colors.brand} icon="ribbon-outline" />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Streak</Text>
          <ChallengeBadge label={result.streakUpdated ? 'Extended today' : 'Already counted today'} tone={result.streakUpdated ? colors.orange : colors.grey} icon="flame-outline" />
        </View>
        <View style={styles.answerSplit}>
          <View style={styles.answerStat}>
            <Text style={[styles.answerValue, { color: colors.green }]}>{correct}</Text>
            <Text style={styles.answerLabel}>Correct</Text>
          </View>
          <View style={styles.answerStat}>
            <Text style={[styles.answerValue, { color: colors.red }]}>{wrong}</Text>
            <Text style={styles.answerLabel}>Wrong</Text>
          </View>
          <View style={styles.answerStat}>
            <Text style={[styles.answerValue, { color: colors.orange }]}>{skipped}</Text>
            <Text style={styles.answerLabel}>Skipped</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="Continue" icon="arrow-forward" iconPosition="right" onPress={goContinue} style={styles.actionButton} />
        <Button
          label="Review answers"
          variant="secondary"
          icon="document-text-outline"
          disabled={!answers.length}
          onPress={() => { setFilter('all'); setReviewOpen(true); }}
          style={styles.actionButton}
        />
      </View>

      <Modal visible={reviewOpen} animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <ScreenShell
          title="Review"
          subtitle="Your answers and explanations"
          showBack={false}
          actions={(
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              onPress={() => setReviewOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close review"
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          )}
        >
          <View style={styles.filterRow}>
            {FILTERS.filter((f) => f.id === 'all' || counts[f.id]).map((f) => {
              const active = filter === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label} ({counts[f.id] || 0})</Text>
                </Pressable>
              );
            })}
          </View>

          {visibleAnswers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-done-outline" size={28} color={colors.greyLight} />
              <Text style={styles.emptyText}>Nothing to show here.</Text>
            </View>
          ) : visibleAnswers.map(({ item, index }) => {
            const status = getStatus(item);
            const meta = statusMeta[status];
            const yourAnswer = status === 'skipped' ? 'Skipped' : item.answers?.[item.selectedIndex] ?? 'Not recorded';
            const correctAnswer = item.answers?.[item.correctIndex] ?? 'Not recorded';
            return (
              <View key={`${item.questionId ?? 'q'}-${index}`} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewCounter}>Question {index + 1}</Text>
                  <ChallengeBadge label={meta.label} tone={meta.tone} icon={meta.icon} />
                </View>
                <Text style={styles.reviewPrompt}>{item.prompt}</Text>
                <View style={[styles.answerBox, { borderColor: meta.tone, backgroundColor: withAlpha(meta.tone, '14') }]}>
                  <Text style={styles.answerBoxLabel}>Your answer</Text>
                  <Text style={styles.answerBoxText}>{yourAnswer}</Text>
                </View>
                {status !== 'correct' ? (
                  <View style={[styles.answerBox, { borderColor: colors.green, backgroundColor: withAlpha(colors.green, '14') }]}>
                    <Text style={styles.answerBoxLabel}>Correct answer</Text>
                    <Text style={styles.answerBoxText}>{correctAnswer}</Text>
                  </View>
                ) : null}
                {item.explanation ? <Text style={styles.reviewExplanation}>{item.explanation}</Text> : null}
              </View>
            );
          })}
        </ScreenShell>
      </Modal>
    </ScreenShell>
  );
}