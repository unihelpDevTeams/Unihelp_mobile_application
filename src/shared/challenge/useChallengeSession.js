import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { fetchChallengeQuestions, saveChallengeAttempt } from './service';

const QUESTION_SECONDS = 30;

export function useChallengeSession({ category, profile }) {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const answersRef = useRef([]);
  const lastLoadKeyRef = useRef('');
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const secondsLeftRef = useRef(QUESTION_SECONDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startedAt] = useState(Date.now());
  const transition = useSharedValue(1);

  useEffect(() => {
    const loadKey = `${category || 'daily'}:${profile?.uid || 'guest'}`;
    if (lastLoadKeyRef.current === loadKey && questions.length) {
      return undefined;
    }
    lastLoadKeyRef.current = loadKey;

    let cancelled = false;
    setLoading(true);
    fetchChallengeQuestions({ category, count: 8, profile })
      .then((items) => {
        if (!cancelled) {
          setQuestions(items);
          answersRef.current = [];
          setAnswers([]);
          setIndex(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, profile?.uid, questions.length]);

  const currentQuestion = questions[index];
  const progress = questions.length ? (index + 1) / questions.length : 0;

  useEffect(() => {
    setSecondsLeft(QUESTION_SECONDS);
    secondsLeftRef.current = QUESTION_SECONDS;
    setSelectedIndex(null);
    setRevealed(false);
    transition.value = 0;
    transition.value = withTiming(1, { duration: 280 });
  }, [index, transition]);

  const recordAnswer = useCallback((choiceIndex, skipped = false) => {
    if (!currentQuestion || revealed) return;
    const isCorrect = choiceIndex === currentQuestion.correctIndex;
    setSelectedIndex(choiceIndex);
    setRevealed(true);
    const nextAnswer = {
      questionId: currentQuestion.id,
      prompt: currentQuestion.prompt,
      subject: currentQuestion.subject,
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
      answers: currentQuestion.answers,
      selectedIndex: skipped ? null : choiceIndex,
      correctIndex: currentQuestion.correctIndex,
      explanation: currentQuestion.explanation || '',
      isCorrect,
      secondsUsed: QUESTION_SECONDS - secondsLeftRef.current,
    };
    answersRef.current = [...answersRef.current, nextAnswer];
    setAnswers(answersRef.current);
  }, [currentQuestion, revealed]);

  useEffect(() => {
    if (!currentQuestion || revealed || saving) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          secondsLeftRef.current = 0;
          clearInterval(timer);
          recordAnswer(null, true);
          return 0;
        }
        secondsLeftRef.current = current - 1;
        return current - 1;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [currentQuestion, recordAnswer, revealed, saving]);

  const goNext = useCallback(async () => {
    if (!questions.length) return;
    if (!revealed) {
      recordAnswer(null, true);
      return;
    }
    if (index < questions.length - 1) {
      setIndex((current) => current + 1);
      return;
    }
    setSaving(true);
    try {
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const finalAnswers = answersRef.current;
      const result = await saveChallengeAttempt({
        profile,
        category: category || currentQuestion?.category || 'daily',
        questions,
        answers: finalAnswers,
        durationSeconds,
      });
      const displayResult = {
        id: result.id,
        category: result.category,
        score: result.correct,
        totalQuestions: questions.length,
        accuracy: result.accuracy,
        xpEarned: result.xpEarned,
        pointsEarned: result.pointsEarned,
        previousRank: result.previousRank,
        nextRank: result.nextRank,
        rankChanged: result.rankChanged,
        streakUpdated: result.streakUpdated,
        currentStreak: result.stats?.currentStreak || 0,
        correct: result.correct,
        wrong: result.wrong,
        skipped: result.skipped,
        answers: finalAnswers,
      };
      router.replace({ pathname: '/challenge/result', params: { result: encodeURIComponent(JSON.stringify(displayResult)) } });
    } finally {
      setSaving(false);
    }
  }, [category, currentQuestion?.category, index, profile, questions, recordAnswer, revealed, router, startedAt]);

  const reviewItems = useMemo(() => answers, [answers]);

  return {
    questions,
    currentQuestion,
    answers: reviewItems,
    index,
    selectedIndex,
    revealed,
    secondsLeft,
    loading,
    saving,
    progress,
    transition,
    answer: recordAnswer,
    next: goNext,
    skip: () => recordAnswer(null, true),
  };
}
