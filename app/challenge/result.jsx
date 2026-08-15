import React, { useMemo } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { Button } from '../../src/shared/components/Button';
import { shadows, typography } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
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
  const { colors } = useTheme();
  const success = (result.accuracy || 0) >= 70;
  const skipped = result.skipped || 0;
  const wrong = result.wrong || 0;
  const correct = result.correct || 0;
  const totalQuestions = result.totalQuestions || 0;
  const resultTone = success ? colors.green : colors.orange;
  const resultSoftTone = success ? colors.greenLight : colors.orangeLight;

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
    heroAccent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 6,
      backgroundColor: resultTone,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
      backgroundColor: resultSoftTone,
      borderWidth: 1,
      borderColor: `${resultTone}44`,
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
    resultScore: { color: c.textPrimary, fontSize: 25, fontWeight: '900' },
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
    answerValue: { color: c.textPrimary, fontSize: 20, fontWeight: '900' },
    answerLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '800', marginTop: s.xs },
    actions: { flexDirection: 'row', gap: s.sm, marginTop: s.lg },
    actionButton: { flex: 1 },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: r.md,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    closeButtonPressed: { opacity: 0.75 },
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
    reviewLine: { color: c.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: s.xs, lineHeight: 19 },
    reviewExplanation: {
      color: c.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      marginTop: s.sm,
      backgroundColor: c.background,
      borderRadius: r.lg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
    },
  }), [resultTone, resultSoftTone]);

  return (
    <ScreenShell title="Result" subtitle="Challenge completed" showBack={false}>
      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <CelebrationBurst visible />
        <View style={styles.statusPill}>
          <Ionicons name={success ? 'trophy-outline' : 'barbell-outline'} size={13} color={resultTone} />
          <Text style={styles.statusPillText}>{success ? 'PASSED' : 'PRACTICE SAVED'}</Text>
        </View>
        <View style={styles.resultRing}>
          <Text style={styles.resultScore}>{result.score || 0}/{totalQuestions}</Text>
          <Text style={styles.resultLabel}>Score</Text>
        </View>
        <Text style={styles.heroTitle}>{success ? 'Strong finish' : 'Practice logged'}</Text>
        <Text style={styles.heroText}>Accuracy, XP, rank, and streak have been updated.</Text>
        <View style={styles.progressWrap}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressText}>Accuracy</Text>
            <Text style={styles.progressText}>{result.accuracy || 0}%</Text>
          </View>
          <ProgressBar value={(result.accuracy || 0) / 100} tone={resultTone} />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Accuracy" value={`${result.accuracy || 0}%`} icon="analytics-outline" tone={resultTone} />
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
            <Text style={styles.answerValue}>{correct}</Text>
            <Text style={styles.answerLabel}>Correct</Text>
          </View>
          <View style={styles.answerStat}>
            <Text style={styles.answerValue}>{wrong}</Text>
            <Text style={styles.answerLabel}>Wrong</Text>
          </View>
          <View style={styles.answerStat}>
            <Text style={styles.answerValue}>{skipped}</Text>
            <Text style={styles.answerLabel}>Skipped</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="Continue" icon="arrow-forward" iconPosition="right" onPress={() => router.replace('/challenge')} style={styles.actionButton} />
        <Button label="Review Answers" variant="secondary" icon="document-text-outline" onPress={() => setReviewOpen(true)} style={styles.actionButton} />
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
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          )}
        >
          {(result.answers || []).map((item, index) => (
            <View key={`${item.questionId}-${index}`} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewCounter}>Question {index + 1}</Text>
                <ChallengeBadge
                  label={item.isCorrect ? 'Correct' : item.selectedIndex === null ? 'Skipped' : 'Wrong'}
                  tone={item.isCorrect ? colors.green : item.selectedIndex === null ? colors.orange : colors.red}
                  icon={item.isCorrect ? 'checkmark-circle-outline' : item.selectedIndex === null ? 'play-skip-forward-outline' : 'close-circle-outline'}
                />
              </View>
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
