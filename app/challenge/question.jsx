import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle } from 'react-native-reanimated';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { Button } from '../../src/shared/components/Button';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { useChallengeSession } from '../../src/shared/challenge/useChallengeSession';
import { CHALLENGE_CATEGORIES } from '../../src/shared/challenge/data';
import { AnswerOption, ChallengeBadge, ProgressBar } from '../../src/shared/challenge/components/ChallengePieces';

// Safe alpha: only appends hex alpha to #RRGGBB, otherwise returns the colour untouched.
// (The old `${color}14` trick silently produced invalid colours for rgb()/named/8-digit values.)
const withAlpha = (color, alpha = '14') =>
  typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;

export default function ChallengeQuestionScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();

  // Expo Router can hand back string | string[] — normalise it.
  const category = Array.isArray(params.category) ? params.category[0] : typeof params.category === 'string' ? params.category : undefined;

  const session = useChallengeSession({ category, profile });
  const question = session.currentQuestion;
  const total = session.questions?.length ?? 0;
  const isLast = session.index === total - 1;

  const styles = useThemeStyles((c, s, r) => ({
    screenBody: { gap: s.md, paddingBottom: s['2xl'] },
    topCard: {
      backgroundColor: c.surfacePrimary,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
      gap: s.md,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.sm },
    timerBubble: { flexDirection: 'row', alignItems: 'center', gap: s.xs, borderRadius: r.full, paddingHorizontal: s.md, paddingVertical: s.sm },
    timerText: { fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'], minWidth: 28 },
    counter: { color: c.textSecondary, fontSize: 12, fontWeight: '800', flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
    questionCard: {
      backgroundColor: c.surfacePrimary,
      borderRadius: r['3xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.xl,
      minHeight: 190,
      justifyContent: 'space-between',
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 2,
    },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginBottom: s.lg },
    questionText: { color: c.textPrimary, fontSize: 21, fontWeight: '900', lineHeight: 30 },
    answers: { gap: s.sm },
    feedbackCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      borderRadius: r.xl,
      borderWidth: 1,
      paddingHorizontal: s.md,
      paddingVertical: s.sm,
    },
    feedbackText: { flex: 1, fontSize: 14, fontWeight: '900' },
    explanationCard: {
      flexDirection: 'row',
      gap: s.sm,
      backgroundColor: c.amberLight,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.gold,
      padding: s.md,
    },
    explanationText: { flex: 1, color: c.textSecondary, fontSize: 13, lineHeight: 19, fontWeight: '600' },
    bottomActions: { flexDirection: 'row', gap: s.sm, paddingTop: s.xs },
    actionButton: { flex: 1, minWidth: 0 },
    emptyCard: {
      backgroundColor: c.surfacePrimary,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s['2xl'],
      alignItems: 'center',
      gap: s.sm,
    },
    emptyTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    emptyText: { color: c.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    emptyAction: { marginTop: s.sm, alignSelf: 'stretch' },
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: session.transition.value,
    transform: [{ translateY: (1 - session.transition.value) * 14 }, { scale: 0.98 + session.transition.value * 0.02 }],
  }));

  const categoryTitle = CHALLENGE_CATEGORIES.find((item) => item.id === category)?.title || 'Daily Challenge';
  const timerTone = session.secondsLeft <= 8 ? colors.danger : session.secondsLeft <= 15 ? colors.warning : colors.brand;
  const difficultyTone = question?.difficulty === 'Hard' ? colors.danger : question?.difficulty === 'Medium' ? colors.warning : colors.success;

  // Result banner: correct / wrong / timed out or skipped
  const feedback = useMemo(() => {
    if (!session.revealed || !question) return null;
    if (session.selectedIndex == null) return { tone: colors.warning, icon: 'time-outline', text: "Time's up — here's the answer." };
    if (session.selectedIndex === question.correctIndex) return { tone: colors.success, icon: 'checkmark-circle', text: 'Correct! Nicely done.' };
    return { tone: colors.danger, icon: 'close-circle', text: 'Not quite — the right answer is highlighted.' };
  }, [session.revealed, session.selectedIndex, question, colors]);

  const nextLabel = session.revealed ? (isLast ? 'Finish' : 'Next question') : 'Next';
  const answersLocked = session.revealed || session.saving;

  return (
    <ScreenShell title={categoryTitle} subtitle="Answer quickly, learn deliberately." showBack loading={session.loading}>
      {question ? (
        <View style={styles.screenBody}>
          <View style={styles.topCard}>
            <View style={styles.timerRow}>
              <View
                style={[styles.timerBubble, { backgroundColor: withAlpha(timerTone) }]}
                accessible
                accessibilityRole="timer"
                accessibilityLabel={`${session.secondsLeft} seconds left`}
              >
                <Ionicons name="timer-outline" size={16} color={timerTone} />
                <Text style={[styles.timerText, { color: timerTone }]}>{session.secondsLeft}s</Text>
              </View>
              <Text style={styles.counter}>Question {session.index + 1} of {total}</Text>
            </View>
            <ProgressBar value={session.progress} tone={colors.brand} />
          </View>

          <Animated.View style={[styles.questionCard, cardStyle]}>
            <View style={styles.badgeRow}>
              <ChallengeBadge label={question.subject || 'Challenge'} icon="book-outline" tone={colors.brand} />
              <ChallengeBadge label={question.difficulty || 'Easy'} icon="speedometer-outline" tone={difficultyTone} />
            </View>
            <Text style={styles.questionText} accessibilityRole="header">{question.prompt}</Text>
          </Animated.View>

          <View style={styles.answers}>
            {(question.answers || []).map((answer, index) => (
              <AnswerOption
                // index in key: duplicate answer text no longer collides
                key={`${question.id}-${index}`}
                label={answer}
                selected={session.selectedIndex === index}
                correct={question.correctIndex === index}
                revealed={session.revealed}
                disabled={answersLocked}
                onPress={() => session.answer(index)}
              />
            ))}
          </View>

          {feedback ? (
            <Animated.View
              entering={FadeInDown.duration(220)}
              style={[styles.feedbackCard, { backgroundColor: withAlpha(feedback.tone), borderColor: feedback.tone }]}
              accessibilityLiveRegion="polite"
            >
              <Ionicons name={feedback.icon} size={20} color={feedback.tone} />
              <Text style={[styles.feedbackText, { color: feedback.tone }]}>{feedback.text}</Text>
            </Animated.View>
          ) : null}

          {session.revealed && question.explanation ? (
            <Animated.View entering={FadeInDown.delay(80).duration(220)} style={styles.explanationCard}>
              <Ionicons name="bulb-outline" size={18} color={colors.amber} />
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </Animated.View>
          ) : null}

          <View style={styles.bottomActions}>
            <Button
              label="Skip"
              variant="outline"
              icon="play-skip-forward-outline"
              disabled={answersLocked}
              onPress={session.skip}
              style={styles.actionButton}
            />
            <Button
              label={nextLabel}
              icon={session.revealed && isLast ? 'checkmark' : 'arrow-forward'}
              iconPosition="right"
              // Next only makes sense once the answer is revealed; Skip covers moving on without answering.
              disabled={!session.revealed}
              loading={session.saving}
              onPress={session.next}
              style={styles.actionButton}
            />
          </View>
        </View>
      ) : !session.loading ? (
        <View style={styles.emptyCard}>
          <Ionicons name="help-circle-outline" size={30} color={colors.greyLight} />
          <Text style={styles.emptyTitle}>No questions available</Text>
          <Text style={styles.emptyText}>Try another category or come back later.</Text>
          <Button label="Back to categories" variant="outline" icon="arrow-back" onPress={() => router.back()} style={styles.emptyAction} />
        </View>
      ) : null}
    </ScreenShell>
  );
}