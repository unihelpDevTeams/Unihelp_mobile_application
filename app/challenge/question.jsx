import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { Button } from '../../src/shared/components/Button';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import { useAuth } from '../../context/AuthContext';
import { useChallengeSession } from '../../src/shared/challenge/useChallengeSession';
import { CHALLENGE_CATEGORIES } from '../../src/shared/challenge/data';
import { AnswerOption, ChallengeBadge, ProgressBar } from '../../src/shared/challenge/components/ChallengePieces';

export default function ChallengeQuestionScreen() {
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const category = typeof params.category === 'string' ? params.category : undefined;
  const session = useChallengeSession({ category, profile });
  const question = session.currentQuestion;

  const cardStyle = useAnimatedStyle(() => ({
    opacity: session.transition.value,
    transform: [{ translateY: (1 - session.transition.value) * 14 }],
  }));
  
  const categoryTitle = CHALLENGE_CATEGORIES.find((item) => item.id === category)?.title || 'Daily Challenge';
  const timerTone = session.secondsLeft <= 8 ? colors.red : session.secondsLeft <= 15 ? colors.orange : colors.brand;

  return (
    <ScreenShell title={categoryTitle} subtitle="Answer quickly, learn deliberately." showBack loading={session.loading} scrollable={false}>
      {question ? (
        <View style={styles.screenBody}>
          <View style={styles.topCard}>
            <View style={styles.timerRow}>
              <View style={[styles.timerBubble, { backgroundColor: `${timerTone}14` }]}>
                <Ionicons name="timer-outline" size={16} color={timerTone} />
                <Text style={[styles.timerText, { color: timerTone }]}>{session.secondsLeft}s</Text>
              </View>
              <Text style={styles.counter}>Question {session.index + 1} of {session.questions.length}</Text>
            </View>
            <ProgressBar value={session.progress} tone={colors.brand} />
          </View>

          <Animated.View style={[styles.questionCard, cardStyle]}>
            <View style={styles.badgeRow}>
              <ChallengeBadge label={question.subject || 'Challenge'} icon="book-outline" tone={colors.brand} />
              <ChallengeBadge label={question.difficulty || 'Easy'} icon="speedometer-outline" tone={question.difficulty === 'Hard' ? colors.red : question.difficulty === 'Medium' ? colors.orange : colors.green} />
            </View>
            <Text style={styles.questionText}>{question.prompt}</Text>
          </Animated.View>

          <View style={styles.answers}>
            {question.answers.map((answer, index) => (
              <AnswerOption
                key={`${question.id}-${answer}`}
                label={answer}
                selected={session.selectedIndex === index}
                correct={question.correctIndex === index}
                revealed={session.revealed}
                disabled={session.revealed || session.saving}
                onPress={() => session.answer(index)}
              />
            ))}
          </View>

          {session.revealed && question.explanation ? (
            <View style={styles.explanationCard}>
              <Ionicons name="bulb-outline" size={18} color={colors.amber} />
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </View>
          ) : null}

          <View style={styles.bottomActions}>
            <Button label="Skip" variant="outline" icon="play-skip-forward-outline" disabled={session.revealed || session.saving} onPress={session.skip} style={styles.actionButton} />
            <Button
              label={session.index === session.questions.length - 1 && session.revealed ? 'Finish' : session.revealed ? 'Next' : 'Next'}
              icon={session.index === session.questions.length - 1 && session.revealed ? 'checkmark' : 'arrow-forward'}
              iconPosition="right"
              loading={session.saving}
              onPress={session.next}
              style={styles.actionButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="help-circle-outline" size={30} color={colors.greyLight} />
          <Text style={styles.emptyTitle}>No questions available</Text>
          <Text style={styles.emptyText}>Try another category or come back later.</Text>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screenBody: { flex: 1, gap: spacing.md },
  topCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  timerText: { fontSize: 13, fontWeight: '900' },
  counter: { color: colors.grey, fontSize: 12, fontWeight: '800' },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['3xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
    minHeight: 190,
    justifyContent: 'space-between',
    ...shadows.md,
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  questionText: { color: colors.ink, fontSize: 21, fontWeight: '900', lineHeight: 30 },
  answers: { gap: spacing.sm },
  explanationCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.amberLight,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.goldLight,
    padding: spacing.md,
  },
  explanationText: { flex: 1, color: colors.inkMuted, fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  bottomActions: { flexDirection: 'row', gap: spacing.sm, marginTop: 'auto' },
  actionButton: { flex: 1 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  emptyText: { color: colors.grey, fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
