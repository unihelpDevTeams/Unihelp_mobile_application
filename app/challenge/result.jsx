import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { Button } from '../../src/shared/components/Button';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import { CelebrationBurst, ChallengeBadge, ProgressBar, StatCard } from '../../src/shared/challenge/components/ChallengePieces';

export default function ChallengeResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const result = useMemo(() => {
    try {
      return JSON.parse(decodeURIComponent(params.result || ''));
    } catch {
      return {};
    }
  }, [params.result]);

  const [reviewOpen, setReviewOpen] = React.useState(false);
  const success = (result.accuracy || 0) >= 70;

  return (
    <ScreenShell title="Result" subtitle="Challenge completed" showBack={false}>
      <View style={styles.hero}>
        <CelebrationBurst visible />
        <View style={[styles.resultRing, success ? styles.resultRingSuccess : styles.resultRingPractice]}>
          <Text style={styles.resultScore}>{result.score || 0}/{result.totalQuestions || 0}</Text>
          <Text style={styles.resultLabel}>Score</Text>
        </View>
        <Text style={styles.heroTitle}>{success ? 'Strong finish' : 'Practice logged'}</Text>
        <Text style={styles.heroText}>Accuracy, XP, rank, and streak have been updated.</Text>
        <ProgressBar value={(result.accuracy || 0) / 100} tone={success ? colors.green : colors.orange} />
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Accuracy" value={`${result.accuracy || 0}%`} icon="analytics-outline" tone={success ? colors.green : colors.orange} />
        <StatCard label="XP Earned" value={`+${result.xpEarned || 0}`} icon="sparkles-outline" tone={colors.brand} />
        <StatCard label="Points Earned" value={`+${result.pointsEarned || 0}`} icon="star-outline" tone={colors.gold} />
        <StatCard label="Current Streak" value={result.currentStreak || 0} icon="flame-outline" tone={colors.orange} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Rank change</Text>
          <ChallengeBadge label={result.rankChanged ? `${result.previousRank} to ${result.nextRank}` : result.nextRank || 'Bronze'} tone={result.rankChanged ? colors.green : colors.brand} icon="ribbon-outline" />
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Streak updated</Text>
          <ChallengeBadge label={result.streakUpdated ? 'Yes' : 'Already counted'} tone={result.streakUpdated ? colors.orange : colors.grey} icon="flame-outline" />
        </View>
        <View style={styles.answerSplit}>
          <View style={styles.answerStat}>
            <Text style={styles.answerValue}>{result.correct || 0}</Text>
            <Text style={styles.answerLabel}>Correct</Text>
          </View>
          <View style={styles.answerStat}>
            <Text style={styles.answerValue}>{result.wrong || 0}</Text>
            <Text style={styles.answerLabel}>Wrong</Text>
          </View>
          <View style={styles.answerStat}>
            <Text style={styles.answerValue}>{result.skipped || 0}</Text>
            <Text style={styles.answerLabel}>Skipped</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="Continue" icon="arrow-forward" iconPosition="right" onPress={() => router.replace('/challenge')} style={styles.actionButton} />
        <Button label="Review Answers" variant="secondary" icon="document-text-outline" onPress={() => setReviewOpen(true)} style={styles.actionButton} />
      </View>

      <Modal visible={reviewOpen} animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <ScreenShell title="Review" subtitle="Your answers and explanations" showBack={false} actions={<Pressable style={styles.closeButton} onPress={() => setReviewOpen(false)}><Ionicons name="close" size={18} color={colors.ink} /></Pressable>}>
          {(result.answers || []).map((item, index) => (
            <View key={`${item.questionId}-${index}`} style={styles.reviewCard}>
              <Text style={styles.reviewCounter}>Question {index + 1}</Text>
              <Text style={styles.reviewPrompt}>{item.prompt}</Text>
              <Text style={styles.reviewLine}>Your answer: {item.selectedIndex === null ? 'Skipped' : item.answers?.[item.selectedIndex]}</Text>
              <Text style={styles.reviewLine}>Correct answer: {item.answers?.[item.correctIndex]}</Text>
              {item.explanation ? <Text style={styles.reviewExplanation}>{item.explanation}</Text> : null}
            </View>
          ))}
        </ScreenShell>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  resultRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    backgroundColor: colors.surface,
    zIndex: 1,
  },
  resultRingSuccess: { borderColor: colors.green },
  resultRingPractice: { borderColor: colors.orange },
  resultScore: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  resultLabel: { color: colors.grey, fontSize: 12, fontWeight: '800', marginTop: spacing.xs },
  heroTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', zIndex: 1 },
  heroText: { color: colors.grey, fontSize: 13, fontWeight: '600', textAlign: 'center', zIndex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  summaryLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  answerSplit: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  answerStat: { flex: 1, alignItems: 'center', backgroundColor: colors.canvasLight, borderRadius: borderRadius.xl, padding: spacing.md },
  answerValue: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  answerLabel: { color: colors.grey, fontSize: 11, fontWeight: '800', marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionButton: { flex: 1 },
  closeButton: { width: 38, height: 38, borderRadius: borderRadius.md, backgroundColor: colors.canvasLight, alignItems: 'center', justifyContent: 'center' },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  reviewCounter: { color: colors.brand, fontSize: 12, fontWeight: '900', marginBottom: spacing.sm },
  reviewPrompt: { color: colors.ink, fontSize: 15, fontWeight: '900', lineHeight: 22, marginBottom: spacing.md },
  reviewLine: { color: colors.inkMuted, fontSize: 13, fontWeight: '700', marginBottom: spacing.xs },
  reviewExplanation: { color: colors.grey, fontSize: 12.5, lineHeight: 18, marginTop: spacing.sm },
});
