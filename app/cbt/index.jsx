import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  BackHandler,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';

const STATUS = {
  NOT_VISITED: 'not-visited',
  NOT_ANSWERED: 'not-answered',
  ANSWERED: 'answered',
  MARKED: 'marked',
  ANSWERED_MARKED: 'answered-marked',
};

function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// THEME
// ---------------------------------------------------------------------------
// This screen previously styled itself with NativeWind `dark:` classes,
// which follow the *device's* system color scheme rather than this app's
// in-app theme toggle (ThemeContext). Everything below is resolved from
// `isDark` (sourced from useTheme() inside the component, never at module
// scope) so the screen always matches the app's own theme switch.
//
// Tokens marked "confirmed" are pulled straight from `colors` because
// they're already used the same way elsewhere in the app. Tokens marked
// "fallback" aren't guaranteed to exist on your `colors` object yet — they
// fall back to a hand-picked hex so nothing breaks, but if your theme.js
// already defines equivalents, swap them in here (this is the only place
// they're defined, so it's a one-line change per token).
function useCbtTheme(colors, isDark) {
  return useMemo(() => {
    const c = colors || {};
    return {
      // confirmed tokens
      textPrimary: c.textPrimary ?? (isDark ? '#F8FAFC' : '#0F172A'),
      textSecondary: c.textSecondary ?? (isDark ? '#CBD5E1' : '#475569'),
      textMuted: c.inkMuted ?? (isDark ? '#94A3B8' : '#94A3B8'),
      border: c.borderDefault ?? (isDark ? '#1E293B' : '#F1F5F9'),
      surface: c.surfaceSecondary ?? (isDark ? '#0F172A' : '#FFFFFF'),
      greenTint: c.greenLight ?? (isDark ? 'rgba(16,185,129,0.16)' : 'rgba(16,185,129,0.10)'),
      dangerTint: c.dangerLight ?? (isDark ? 'rgba(244,63,94,0.16)' : 'rgba(244,63,94,0.10)'),

      // fallback tokens (verify against your theme.js)
      bg: c.background ?? (isDark ? '#020617' : '#F8FAFC'),
      card: c.surfacePrimary ?? c.surfaceSecondary ?? (isDark ? '#0F172A' : '#FFFFFF'),
      input: c.surfaceInput ?? (isDark ? '#1E293B' : '#F8FAFC'),
      chip: c.surfaceChip ?? (isDark ? '#1E293B' : '#F1F5F9'),
      overlay: 'rgba(0,0,0,0.6)',

      // semantic accent colors — deliberately kept constant across themes,
      // only their *tint* (badge/pill background) shifts with isDark
      indigo: '#4F46E5',
      indigoTint: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)',
      green: '#10B981',
      rose: '#F43F5E',
      amber: '#F59E0B',
      amberTint: isDark ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.10)',
      slate: '#64748B',
      white: '#FFFFFF',
    };
  }, [colors, isDark]);
}

const STATUS_META = (T) => ({
  [STATUS.NOT_VISITED]: { label: 'Unvisited', color: T.white, bg: T.slate },
  [STATUS.NOT_ANSWERED]: { label: 'Unanswered', color: T.white, bg: T.rose },
  [STATUS.ANSWERED]: { label: 'Answered', color: T.white, bg: T.green },
  [STATUS.MARKED]: { label: 'Review Later', color: T.white, bg: T.amber },
  [STATUS.ANSWERED_MARKED]: { label: 'Ans & Flagged', color: T.white, bg: T.indigo },
});

// ---------------------------------------------------------------------------
// In-app confirmation / notice modal — replaces every Alert.alert() in this
// screen so prompts match the app's own rounded-card, indigo-accent look in
// both light and dark mode instead of the OS-default alert box.
//
// Usage: setDialog({ icon, iconColor, iconBg, title, message, actions: [...] })
// where each action is { key, label, variant: 'primary' | 'secondary' | 'destructive', onPress }.
// Tapping the backdrop always behaves like a safe "cancel" (just closes the
// modal) — it never triggers a destructive action on its own.
// ---------------------------------------------------------------------------
function ConfirmDialogModal({ dialog, onClose, T }) {
  const visible = !!dialog;
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.92);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 }),
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [visible, dialog]);

  if (!dialog) return null;

  const { icon, iconColor = T.indigo, iconBg = T.indigoTint, title, message, actions = [] } = dialog;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
      >
        <Animated.View style={{ transform: [{ scale }], opacity, width: '100%', maxWidth: 360 }}>
          {/* Inner Pressable with a no-op onPress absorbs taps so they don't bubble to the backdrop */}
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: T.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 }}
          >
            {icon ? (
              <View style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center', backgroundColor: iconBg }}>
                <Ionicons name={icon} size={26} color={iconColor} />
              </View>
            ) : null}
            {title ? (
              <Text style={{ fontSize: 18, fontWeight: '900', color: T.textPrimary, textAlign: 'center', marginBottom: 8 }}>{title}</Text>
            ) : null}
            {message ? (
              <Text style={{ fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>{message}</Text>
            ) : null}

            <View style={{ gap: 10 }}>
              {actions.map((action) => {
                const bg =
                  action.variant === 'destructive' ? T.rose :
                  action.variant === 'secondary' ? T.chip :
                  T.indigo;
                const textColor = action.variant === 'secondary' ? T.textSecondary : T.white;
                return (
                  <TouchableOpacity
                    key={action.key}
                    onPress={action.onPress}
                    style={{ paddingVertical: 14, borderRadius: 16, alignItems: 'center', backgroundColor: bg }}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <Text style={{ fontWeight: '700', fontSize: 14, color: textColor }}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export default function CBTPracticeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const T = useCbtTheme(colors, isDark);
  const statusMeta = useMemo(() => STATUS_META(T), [T]);

  // Primary State
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // App Stages: 'browse' | 'setup' | 'instructions' | 'exam' | 'results' | 'history'
  const [stage, setStage] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  // Session Config & Identity
  const [setupCourse, setSetupCourse] = useState(null);
  const [numQuestions, setNumQuestions] = useState('20');
  const [timeLimit, setTimeLimit] = useState('15');
  const [agreed, setAgreed] = useState(false);
  const [username, setUsername] = useState('Candidate User');

  // Active Session Engine
  const [activeCourse, setActiveCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [visited, setVisited] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTimeAllocated, setTotalTimeAllocated] = useState(0);
  const [startedAt, setStartedAt] = useState(null);

  // Auxiliary CBT Controls
  const [showPalette, setShowPalette] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [fontSizeOffset, setFontSizeOffset] = useState(0);

  // Results Diagnostic
  const [reviewFilter, setReviewFilter] = useState('all');

  // In-app pop-up (replaces Alert.alert everywhere in this screen)
  const [dialog, setDialog] = useState(null);
  const closeDialog = () => setDialog(null);

  const timerRef = useRef(null);

  // Fetch Saved Username & Courses
  useEffect(() => {
    const fetchCoursesAndUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('cbt_username');
        if (savedUser) setUsername(savedUser);

        const response = await fetch('https://taired-cbt.puter.site/api/v1/courses.json');
        const data = await response.json();
        if (data.status === 'success') {
          setCourses(data.courses);
        } else {
          setLoadError(true);
        }
      } catch (error) {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchCoursesAndUser();
  }, []);

  // Sync History — load once on mount and again whenever the history panel
  // is opened. (Previously this re-read AsyncStorage on every single stage
  // change, e.g. every navigation between exam questions.)
  const loadHistory = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('cbt_history_v2');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  // finishExam is recreated every render (it closes over current exam
  // state). confirmExitExam is memoized with an empty dep array so its
  // dialog actions can be triggered from the hardware back handler without
  // resubscribing that handler on every render — but that means we can't
  // let it close over `finishExam` directly, or it would submit whatever
  // exam state existed on first mount (i.e. nothing). Routing the call
  // through a ref keeps confirmExitExam stable while always invoking the
  // *current* finishExam.
  const finishExamRef = useRef(null);

  // Shared "leave an active exam" pop-up — used by both the hardware back
  // button and the header back button, so the two entry points stay in sync.
  const confirmExitExam = useCallback(() => {
    setDialog({
      icon: 'warning',
      iconColor: T.amber,
      iconBg: T.amberTint,
      title: 'Active Exam Session',
      message: 'Are you sure you want to exit? You can submit your current answers for grading, or discard this session entirely.',
      actions: [
        { key: 'resume', label: 'Resume Exam', variant: 'secondary', onPress: closeDialog },
        { key: 'submit', label: 'Submit & Exit', variant: 'primary', onPress: () => { closeDialog(); finishExamRef.current?.(false); } },
        { key: 'discard', label: 'Discard Session', variant: 'destructive', onPress: () => { closeDialog(); finishExamRef.current?.(true); } },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T]);

  // Exam Back-button Safety Guard
  useEffect(() => {
    const backAction = () => {
      if (stage === 'exam') {
        confirmExitExam();
        return true;
      }
      if (stage !== 'browse') {
        setStage('browse');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [stage, confirmExitExam]);

  // Timer Tick
  useEffect(() => {
    if (stage !== 'exam') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [stage]);

  // Auto-Submit Handler
  useEffect(() => {
    if (stage === 'exam' && timeLeft === 0 && startedAt) {
      setDialog({
        icon: 'time',
        iconColor: T.indigo,
        iconBg: T.indigoTint,
        title: 'Time Elapsed',
        message: 'The official examination duration has concluded. Your test paper has been submitted automatically.',
        actions: [{ key: 'ok', label: 'View Results', variant: 'primary', onPress: closeDialog }],
      });
      finishExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, stage]);

  // Scientific Calculator Logic
  const handleCalcPress = (val) => {
    if (val === 'C') {
      setCalcDisplay('0');
      return;
    }
    if (val === '=') {
      try {
        const sanitized = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
        if (!/^[0-9+\-*/.\s]+$/.test(sanitized)) throw new Error('invalid');
        // eslint-disable-next-line no-new-func
        const res = Function(`'use strict'; return (${sanitized})`)();
        setCalcDisplay(String(res));
      } catch (e) {
        setCalcDisplay('Error');
      }
      return;
    }
    setCalcDisplay(prev => (prev === '0' || prev === 'Error' ? val : prev + val));
  };

  const filteredCourses = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return courses.filter(c => c.title.toLowerCase().includes(term) || c.id.toLowerCase().includes(term));
  }, [courses, searchTerm]);

  const statusFor = useCallback((index) => {
    const isAnswered = Boolean(answers[index]);
    const isMarked = Boolean(markedForReview[index]);
    const isVisited = Boolean(visited[index]);
    if (isAnswered && isMarked) return STATUS.ANSWERED_MARKED;
    if (isMarked) return STATUS.MARKED;
    if (isAnswered) return STATUS.ANSWERED;
    if (isVisited) return STATUS.NOT_ANSWERED;
    return STATUS.NOT_VISITED;
  }, [answers, markedForReview, visited]);

  const score = useMemo(() => {
    return questions.reduce((acc, q, idx) => (answers[idx] === q.correctAnswer ? acc + 1 : acc), 0);
  }, [questions, answers]);

  const completionPercent = questions.length ? Math.round((score / questions.length) * 100) : 0;

  const timeSpentSeconds = useMemo(() => {
    return Math.max(0, totalTimeAllocated - timeLeft);
  }, [totalTimeAllocated, timeLeft]);

  const reviewList = useMemo(() => {
    return questions.map((q, idx) => {
      const selected = answers[idx];
      const isSkipped = !selected;
      const isCorrect = selected === q.correctAnswer;
      return { q, idx, selected, isSkipped, isCorrect };
    });
  }, [questions, answers]);

  const filteredReviewList = useMemo(() => {
    if (reviewFilter === 'correct') return reviewList.filter(r => r.isCorrect);
    if (reviewFilter === 'incorrect') return reviewList.filter(r => !r.isCorrect && !r.isSkipped);
    if (reviewFilter === 'skipped') return reviewList.filter(r => r.isSkipped);
    if (reviewFilter === 'marked') return reviewList.filter(r => markedForReview[r.idx]);
    return reviewList;
  }, [reviewList, reviewFilter, markedForReview]);

  // Actions
  const beginSetup = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    setSetupCourse(courseId);
    setNumQuestions(String(Math.min(20, course?.question_count || 20)));
    setTimeLimit('15');
    setStage('setup');
  };

  const startExam = async () => {
    const course = courses.find(c => c.id === setupCourse);
    if (!course) return;

    if (username.trim()) {
      await AsyncStorage.setItem('cbt_username', username.trim());
    }

    setLoadingQuestions(true);
    setStage('exam');
    try {
      const response = await fetch(course.endpoint);
      const data = await response.json();
      if (data.status === 'success') {
        const shuffled = [...data.data].sort(() => 0.5 - Math.random());
        const limit = parseInt(numQuestions) || 20;
        const selected = shuffled.slice(0, limit);

        const formatted = selected.map((q, index) => {
          const rawOpts = [q.a, q.b, q.c, q.d, q.e].filter(Boolean);
          const correctKey = q.correct?.toLowerCase();
          const correctAnswer = correctKey && q[correctKey] ? q[correctKey] : rawOpts[0] || '';

          return {
            id: `Q-${index + 1}-${Math.random().toString(36).substring(7)}`,
            courseTitle: course.title,
            question: q.question,
            options: rawOpts,
            correctAnswer,
            explanation: q.explanation || 'Official explanation for this option selection is currently under review.',
          };
        });

        const allocatedSeconds = (parseInt(timeLimit) || 15) * 60;
        setActiveCourse(course);
        setQuestions(formatted);
        setCurrentIndex(0);
        setAnswers({});
        setMarkedForReview({});
        setVisited({ 0: true });
        setTimeLeft(allocatedSeconds);
        setTotalTimeAllocated(allocatedSeconds);
        setStartedAt(Date.now());
      } else {
        setStage('setup');
        setDialog({
          icon: 'close-circle',
          iconColor: T.rose,
          iconBg: T.dangerTint,
          title: 'Unable to Start',
          message: 'Could not parse the test paper from server. Please try again.',
          actions: [{ key: 'ok', label: 'OK', variant: 'primary', onPress: closeDialog }],
        });
      }
    } catch (error) {
      setStage('setup');
      setDialog({
        icon: 'cloud-offline',
        iconColor: T.rose,
        iconBg: T.dangerTint,
        title: 'Network Failure',
        message: 'Verify your active internet connection and retry.',
        actions: [{ key: 'ok', label: 'OK', variant: 'primary', onPress: closeDialog }],
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const goToQuestion = (index) => {
    setCurrentIndex(index);
    setVisited(prev => ({ ...prev, [index]: true }));
    setShowPalette(false);
  };

  const selectOption = (option) => setAnswers(prev => ({ ...prev, [currentIndex]: option }));
  const toggleMarkForReview = () => setMarkedForReview(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
  const goNext = () => { if (currentIndex < questions.length - 1) goToQuestion(currentIndex + 1); };
  const goBack = () => { if (currentIndex > 0) goToQuestion(currentIndex - 1); };

  const finishExam = async (abandoned = false) => {
    clearInterval(timerRef.current);
    if (abandoned) {
      setStage('browse');
      return;
    }
    setStage('results');
    try {
      const saved = JSON.parse(await AsyncStorage.getItem('cbt_history_v2')) || [];
      const record = {
        id: Date.now().toString(),
        candidate: username,
        courseTitle: activeCourse?.title,
        score: questions.reduce((acc, q, idx) => (answers[idx] === q.correctAnswer ? acc + 1 : acc), 0),
        totalQuestions: questions.length,
        timeTaken: totalTimeAllocated - timeLeft,
        date: new Date().toISOString(),
      };
      saved.unshift(record);
      const trimmed = saved.slice(0, 50);
      await AsyncStorage.setItem('cbt_history_v2', JSON.stringify(trimmed));
      setHistory(trimmed);
    } catch (e) {}
  };

  // Keep the ref pointed at the latest finishExam on every render, so
  // confirmExitExam (memoized once) always triggers a fresh submission.
  useEffect(() => {
    finishExamRef.current = finishExam;
  });

  const requestSubmit = () => {
    const unansweredCount = questions.length - Object.keys(answers).length;
    const message = unansweredCount > 0
      ? `You have ${unansweredCount} unanswered question${unansweredCount === 1 ? '' : 's'} remaining. Are you sure you want to submit now?`
      : 'Are you sure you wish to submit your test paper?';

    setDialog({
      icon: unansweredCount > 0 ? 'alert-circle' : 'checkmark-circle',
      iconColor: unansweredCount > 0 ? T.amber : T.green,
      iconBg: unansweredCount > 0 ? T.amberTint : T.greenTint,
      title: 'Submit Test Paper',
      message,
      actions: [
        { key: 'continue', label: 'Continue Exam', variant: 'secondary', onPress: closeDialog },
        { key: 'submit', label: 'Yes, Submit', variant: 'primary', onPress: () => { closeDialog(); finishExam(); } },
      ],
    });
  };

  const resetAll = () => {
    setStage('browse');
    setSetupCourse(null);
    setActiveCourse(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setMarkedForReview({});
    setVisited({});
    setReviewFilter('all');
  };

  // Validate config before moving to the rules screen — previously you
  // could type "0" or leave the field empty/non-numeric and still proceed,
  // which produced a broken exam with no questions or no timer.
  const proceedToInstructions = () => {
    const qty = parseInt(numQuestions, 10);
    const mins = parseInt(timeLimit, 10);
    const course = courses.find(c => c.id === setupCourse);
    const max = course?.question_count || Infinity;

    if (!qty || qty < 1) {
      setDialog({
        icon: 'alert-circle',
        iconColor: T.rose,
        iconBg: T.dangerTint,
        title: 'Invalid Question Count',
        message: 'Enter a whole number of at least 1 question.',
        actions: [{ key: 'ok', label: 'OK', variant: 'primary', onPress: closeDialog }],
      });
      return;
    }
    if (qty > max) {
      setDialog({
        icon: 'alert-circle',
        iconColor: T.rose,
        iconBg: T.dangerTint,
        title: 'Too Many Questions',
        message: `This paper only has ${max} questions available.`,
        actions: [{ key: 'ok', label: 'OK', variant: 'primary', onPress: closeDialog }],
      });
      return;
    }
    if (!mins || mins < 1) {
      setDialog({
        icon: 'alert-circle',
        iconColor: T.rose,
        iconBg: T.dangerTint,
        title: 'Invalid Duration',
        message: 'Enter a whole number of at least 1 minute.',
        actions: [{ key: 'ok', label: 'OK', variant: 'primary', onPress: closeDialog }],
      });
      return;
    }

    setAgreed(false);
    setStage('instructions');
  };

  const dialogModal = <ConfirmDialogModal dialog={dialog} onClose={closeDialog} T={T} />;

  if (loading) {
    return (
      <>
        <ScreenShell showBack title="CBT Terminal" onBack={() => router.back()}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <ActivityIndicator size="large" color={T.indigo} />
            <Text style={{ color: T.textMuted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12, marginTop: 16 }}>
              Initializing Test Engine...
            </Text>
          </View>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <ScreenShell showBack title="CBT Terminal" onBack={() => router.back()}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 24 }}>
            <Ionicons name="cloud-offline-outline" size={60} color={T.rose} />
            <Text style={{ fontSize: 20, fontWeight: '900', color: T.textPrimary, marginTop: 16 }}>Server Unreachable</Text>
            <Text style={{ textAlign: 'center', color: T.textMuted, marginTop: 8 }}>Failed to sync question banks from terminal host.</Text>
          </View>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  if (showHistory) {
    return (
      <>
        <ScreenShell showBack title="Mock Test History" onBack={() => setShowHistory(false)}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
            {history.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                <Ionicons name="documents-outline" size={56} color={T.slate} />
                <Text style={{ color: T.textMuted, fontWeight: '600', marginTop: 12 }}>No prior test attempts recorded.</Text>
              </View>
            ) : (
              history.map((item) => {
                const pct = Math.round((item.score / item.totalQuestions) * 100);
                const isPass = pct >= 50;
                return (
                  <View
                    key={item.id || item.date}
                    style={{ backgroundColor: T.card, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, color: T.textPrimary }} numberOfLines={1}>{item.courseTitle}</Text>
                      <Text style={{ fontSize: 12, color: T.indigo, fontWeight: '600', marginTop: 2 }}>Candidate: {item.candidate || 'Default'}</Text>
                      <Text style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
                        {new Date(item.date).toLocaleDateString()} • Duration: {formatClock(item.timeTaken || 0)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', backgroundColor: T.chip, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                      <Text style={{ fontWeight: '900', fontSize: 18, color: isPass ? T.green : T.rose }}>
                        {item.score}/{item.totalQuestions}
                      </Text>
                      <Text style={{ fontSize: 10, color: T.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>{pct}% Overall</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  if (stage === 'browse') {
    return (
      <>
        <ScreenShell showBack title="MockCBT Simulator" onBack={() => router.back()}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Hero Banner */}
            <View style={{ backgroundColor: T.indigo, borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: T.indigo, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Mock Simulator</Text>
                  <Text style={{ color: T.white, fontSize: 24, fontWeight: '900', marginTop: 4 }}>Ready for Practice?</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 6, lineHeight: 18 }}>Level-up your exam performance with our interactive mock tests.</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowHistory(true)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 16 }}
                  accessibilityRole="button"
                  accessibilityLabel="View test history"
                >
                  <Ionicons name="time-outline" size={22} color={'red'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, borderWidth: 1, borderColor: T.border }}>
              <Ionicons name="search" size={20} color={T.textMuted} />
              <TextInput
                style={{ flex: 1, marginLeft: 12, fontSize: 16, color: T.textPrimary }}
                placeholder="Search subject or course code..."
                placeholderTextColor={T.textMuted}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            {/* Course Grid */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Available Papers ({filteredCourses.length})
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {filteredCourses.map(course => (
                <TouchableOpacity
                  key={course.id}
                  onPress={() => beginSetup(course.id)}
                  style={{ width: '48%', backgroundColor: T.card, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border }}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${course.title} practice`}
                >
                  <View style={{ backgroundColor: T.indigoTint, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <MaterialCommunityIcons name="file-document-edit-outline" size={22} color={T.indigo} />
                  </View>
                  <Text style={{ fontWeight: '700', color: T.textPrimary, fontSize: 15, marginBottom: 4 }} numberOfLines={2}>{course.title}</Text>
                  <Text style={{ fontSize: 12, color: T.textMuted, fontWeight: '600' }}>{course.question_count} Questions</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  if (stage === 'setup') {
    const course = courses.find(c => c.id === setupCourse);
    return (
      <>
        <ScreenShell showBack title="Paper Configuration" onBack={() => setStage('browse')}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
            <View style={{ backgroundColor: T.card, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: T.border }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: T.border, paddingBottom: 16, marginBottom: 24 }}>
                <Text style={{ fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: T.indigo, marginBottom: 4 }}>CBT Setup Desk</Text>
                <Text style={{ fontSize: 24, fontWeight: '900', color: T.textPrimary }}>{course?.title}</Text>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontWeight: '700', color: T.textSecondary, marginBottom: 8 }}>Username / Candidate Display Name</Text>
                <TextInput
                  style={{ backgroundColor: T.input, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: T.border, color: T.textPrimary }}
                  placeholder="Enter your name..."
                  placeholderTextColor={T.textMuted}
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontWeight: '700', color: T.textSecondary, marginBottom: 8 }}>Question Quantity</Text>
                <TextInput
                  style={{ backgroundColor: T.input, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: T.border, color: T.textPrimary }}
                  keyboardType="number-pad"
                  value={numQuestions}
                  onChangeText={setNumQuestions}
                />
                <Text style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Maximum available: {course?.question_count}</Text>
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontWeight: '700', color: T.textSecondary, marginBottom: 8 }}>Duration (Minutes)</Text>
                <TextInput
                  style={{ backgroundColor: T.input, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: T.border, color: T.textPrimary }}
                  keyboardType="number-pad"
                  value={timeLimit}
                  onChangeText={setTimeLimit}
                />
              </View>

              <TouchableOpacity
                onPress={proceedToInstructions}
                style={{ backgroundColor: T.indigo, paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: T.indigo, shadowOpacity: 0.3, shadowRadius: 10, elevation: 3 }}
                accessibilityRole="button"
              >
                <Text style={{ color: T.white, fontWeight: '900', fontSize: 15 }}>Proceed to Candidate Rules</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  if (stage === 'instructions') {
    return (
      <>
        <ScreenShell showBack title="Candidate Rules" onBack={() => setStage('setup')}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
            <View style={{ backgroundColor: T.card, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: T.border }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: T.textPrimary, marginBottom: 16 }}>Official Examination Guidelines</Text>

              <View style={{ marginBottom: 24, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <Ionicons name="time" size={20} color={T.indigo} />
                  <Text style={{ flex: 1, color: T.textSecondary, fontSize: 14, lineHeight: 20 }}>Timer countdown will initiate immediately upon clicking &#34;Launch Test Session&#34;.</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <Ionicons name="grid" size={20} color={T.indigo} />
                  <Text style={{ flex: 1, color: T.textSecondary, fontSize: 14, lineHeight: 20 }}>Use the top grid navigator to inspect answered vs unvisited questions.</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <Ionicons name="calculator" size={20} color={T.indigo} />
                  <Text style={{ flex: 1, color: T.textSecondary, fontSize: 14, lineHeight: 20 }}>In-app Scientific Calculator is available in the top utility toolbar.</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setAgreed(!agreed)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, backgroundColor: T.input, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: T.border }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
              >
                <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: agreed ? 0 : 1, alignItems: 'center', justifyContent: 'center', backgroundColor: agreed ? T.indigo : 'transparent', borderColor: T.slate }}>
                  {agreed && <Ionicons name="checkmark" size={16} color={T.white} />}
                </View>
                <Text style={{ flex: 1, fontWeight: '600', color: T.textPrimary, fontSize: 14 }}>I certify that I am ready for this mock examination.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={startExam}
                disabled={!agreed}
                style={{ paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: agreed ? T.indigo : T.chip, shadowColor: agreed ? T.indigo : 'transparent', shadowOpacity: agreed ? 0.3 : 0, shadowRadius: 10, elevation: agreed ? 3 : 0 }}
                accessibilityRole="button"
                accessibilityState={{ disabled: !agreed }}
              >
                <Text style={{ fontWeight: '900', fontSize: 15, color: agreed ? T.white : T.textMuted }}>Launch Test Session</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  if (stage === 'exam') {
    if (loadingQuestions) {
      return (
        <>
          <ScreenShell showBack title="Loading Room" onBack={() => finishExam(true)}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={T.indigo} />
              <Text style={{ color: T.textMuted, marginTop: 16, fontFamily: 'monospace', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>
                Preparing Examination Paper...
              </Text>
            </View>
          </ScreenShell>
          {dialogModal}
        </>
      );
    }

    const currentQ = questions[currentIndex];
    const isMarked = markedForReview[currentIndex];
    const baseFontSize = 16 + fontSizeOffset;

    return (
      <>
        <ScreenShell showBack
          title={activeCourse?.title || "CBT Practice Room"}
          onBack={confirmExitExam}
        >
          <View style={{ flex: 1, backgroundColor: T.bg }}>
            {/* Authentic CBT Desktop Top Bar */}
            <View style={{ backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1E293B' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.indigo, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#818CF8' }}>
                  <Ionicons name="person" size={18} color={T.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.white, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>{username}</Text>
                  <Text style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: 10 }} numberOfLines={1}>{activeCourse?.title}</Text>
                </View>
              </View>

              {/* Quick Utility Toolbar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowCalc(!showCalc)}
                  style={{ padding: 8, borderRadius: 10, backgroundColor: showCalc ? T.indigo : '#1E293B' }}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle calculator"
                >
                  <Ionicons name="calculator" size={18} color={T.white} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFontSizeOffset(prev => (prev >= 4 ? -2 : prev + 2))}
                  style={{ padding: 8, backgroundColor: '#1E293B', borderRadius: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Adjust text size"
                >
                  <Text style={{ color: T.white, fontWeight: '700', fontSize: 12 }}>A{fontSizeOffset > 0 ? `+${fontSizeOffset}` : ''}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowPalette(true)}
                  style={{ padding: 8, backgroundColor: T.indigo, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Open question navigator"
                >
                  <Ionicons name="grid" size={16} color={T.white} />
                  <Text style={{ color: T.white, fontWeight: '700', fontSize: 12 }}>{currentIndex + 1}/{questions.length}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dynamic Countdown Banner */}
            <View style={{ paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: timeLeft < 180 ? T.rose : '#1E293B' }}>
              <Text style={{ color: T.white, fontFamily: 'monospace', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Time Remaining</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={16} color={T.white} />
                <Text style={{ color: T.white, fontFamily: 'monospace', fontWeight: '900', fontSize: 16 }}>{formatClock(timeLeft)}</Text>
              </View>
            </View>

            {/* Built-in Scientific Calculator Floating Overlay */}
            {showCalc && (
              <View style={{ position: 'absolute', top: 112, right: 16, zIndex: 50, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', padding: 16, borderRadius: 20, width: 256, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: 12, textTransform: 'uppercase' }}>CBT Calculator</Text>
                  <TouchableOpacity onPress={() => setShowCalc(false)} accessibilityRole="button" accessibilityLabel="Close calculator">
                    <Ionicons name="close" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'flex-end' }}>
                  <Text style={{ color: T.green, fontFamily: 'monospace', fontSize: 20, fontWeight: '700' }}>{calcDisplay}</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
                  {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', 'C', '0', '=', '+'].map((btn) => (
                    <TouchableOpacity
                      key={btn}
                      onPress={() => handleCalcPress(btn)}
                      style={{ width: '22%', backgroundColor: '#1E293B', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                      accessibilityRole="button"
                      accessibilityLabel={`Calculator ${btn}`}
                    >
                      <Text style={{ color: T.white, fontWeight: '700', fontSize: 16 }}>{btn}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Palette Modal Navigation */}
            <Modal visible={showPalette} animationType="slide" transparent onRequestClose={() => setShowPalette(false)}>
              <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: T.overlay }}>
                <View style={{ backgroundColor: T.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: T.textPrimary }}>Question Navigator Grid</Text>
                    <TouchableOpacity
                      onPress={() => setShowPalette(false)}
                      style={{ backgroundColor: T.chip, padding: 8, borderRadius: 999 }}
                      accessibilityRole="button"
                      accessibilityLabel="Close navigator"
                    >
                      <Ionicons name="close" size={20} color={T.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
                      {questions.map((_, idx) => {
                        const st = statusFor(idx);
                        const isCurrent = idx === currentIndex;
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => goToQuestion(idx)}
                            style={{
                              width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                              borderWidth: 2, backgroundColor: statusMeta[st].bg,
                              borderColor: isCurrent ? T.textPrimary : 'transparent',
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Question ${idx + 1}, ${statusMeta[st].label}`}
                          >
                            <Text style={{ color: T.white, fontWeight: '700' }}>{idx + 1}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Legend */}
                    <View style={{ backgroundColor: T.input, padding: 16, borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
                      {Object.values(statusMeta).map((meta, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', width: '48%' }}>
                          <View style={{ width: 12, height: 12, borderRadius: 6, marginRight: 8, backgroundColor: meta.bg }} />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: T.textSecondary }}>{meta.label}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            {/* Primary Question View Surface */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }} contentContainerStyle={{ paddingBottom: 120 }}>
              <View style={{ backgroundColor: T.card, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: T.border, marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: T.indigo }}>Question {currentIndex + 1}</Text>
                  {isMarked && (
                    <View style={{ backgroundColor: T.amberTint, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="bookmark" size={12} color={T.amber} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: T.amber, textTransform: 'uppercase' }}>Flagged</Text>
                    </View>
                  )}
                </View>

                <Text style={{ fontSize: baseFontSize, color: T.textPrimary, fontWeight: '500', lineHeight: baseFontSize * 1.5 }}>
                  {currentQ?.question}
                </Text>
              </View>

              {/* Options Grid */}
              <View style={{ gap: 12 }}>
                {currentQ?.options.map((opt, idx) => {
                  const letters = ['A', 'B', 'C', 'D', 'E'];
                  const isSelected = answers[currentIndex] === opt;
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => selectOption(opt)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1,
                        borderColor: isSelected ? T.indigo : T.border,
                        backgroundColor: isSelected ? T.indigoTint : T.card,
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`Option ${letters[idx]}: ${opt}`}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: isSelected ? T.indigo : T.chip }}>
                        <Text style={{ fontWeight: '700', fontSize: 12, color: isSelected ? T.white : T.textSecondary }}>{letters[idx]}</Text>
                      </View>
                      <Text style={{ fontSize: baseFontSize - 1, flex: 1, fontWeight: '500', color: isSelected ? T.indigo : T.textPrimary }}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Authentic CBT Navigation Dock */}
            <View style={{ backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.border, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', bottom: 0, left: 0, right: 0, position: 'absolute' }}>
              <TouchableOpacity
                onPress={goBack}
                disabled={currentIndex === 0}
                style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: currentIndex === 0 ? 0.3 : 1, backgroundColor: T.chip }}
                accessibilityRole="button"
                accessibilityLabel="Previous question"
                accessibilityState={{ disabled: currentIndex === 0 }}
              >
                <Ionicons name="chevron-back" size={20} color={T.indigo} />
                <Text style={{ fontWeight: '700', color: T.textSecondary, fontSize: 12, textTransform: 'uppercase' }}>Prev</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleMarkForReview}
                style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isMarked ? T.amber : T.input, borderColor: isMarked ? T.amber : T.border }}
                accessibilityRole="button"
                accessibilityLabel={isMarked ? 'Unmark for review' : 'Mark for review'}
              >
                <Ionicons name="bookmark-outline" size={18} color={isMarked ? T.white : T.textMuted} />
                <Text style={{ fontWeight: '700', fontSize: 12, textTransform: 'uppercase', color: isMarked ? T.white : T.textSecondary }}>Review</Text>
              </TouchableOpacity>

              {currentIndex === questions.length - 1 ? (
                <TouchableOpacity
                  onPress={requestSubmit}
                  style={{ backgroundColor: T.green, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Submit exam"
                >
                  <Text style={{ color: T.white, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' }}>Submit</Text>
                  <Ionicons name="checkmark-done" size={18} color={T.white} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={goNext}
                  style={{ backgroundColor: T.indigo, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Next question"
                >
                  <Text style={{ color: T.white, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' }}>Next</Text>
                  <Ionicons name="chevron-forward" size={18} color={T.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  if (stage === 'results') {
    const isPass = completionPercent >= 50;
    return (
      <>
        <ScreenShell showBack title="Test Diagnostics" onBack={resetAll}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
            {/* Diagnostic Result Card */}
            <View style={{ backgroundColor: T.card, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: T.border, alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: isPass ? T.greenTint : T.dangerTint }}>
                <Ionicons name={isPass ? 'trophy' : 'alert-circle'} size={40} color={isPass ? T.green : T.rose} />
              </View>

              <Text style={{ fontSize: 14, fontWeight: '700', color: T.indigo, marginBottom: 4 }}>{username}</Text>
              <Text style={{ fontSize: 30, fontWeight: '900', color: T.textPrimary }}>
                {score} <Text style={{ color: T.textMuted, fontSize: 18, fontWeight: '500' }}>/ {questions.length}</Text>
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{completionPercent}% Accuracy Score</Text>

              {/* Metrics Breakdown */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: T.border }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: T.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Time Spent</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: T.textPrimary, marginTop: 4 }}>{formatClock(timeSpentSeconds)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: T.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Outcome</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', marginTop: 4, color: isPass ? T.green : T.rose }}>{isPass ? 'PASSED' : 'RETAKE'}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
                <TouchableOpacity
                  onPress={resetAll}
                  style={{ flex: 1, backgroundColor: T.chip, paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}
                  accessibilityRole="button"
                >
                  <Text style={{ fontWeight: '700', color: T.textSecondary, fontSize: 12, textTransform: 'uppercase' }}>Retake Paper</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/')}
                  style={{ flex: 1, backgroundColor: T.indigo, paddingVertical: 14, borderRadius: 16, alignItems: 'center', shadowColor: T.indigo, shadowOpacity: 0.3, shadowRadius: 10, elevation: 3 }}
                  accessibilityRole="button"
                >
                  <Text style={{ fontWeight: '900', color: T.white, fontSize: 12, textTransform: 'uppercase' }}>Exit Terminal</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Diagnostic Filter Bar */}
            <Text style={{ fontWeight: '900', fontSize: 18, color: T.textPrimary, marginBottom: 12 }}>Questions Review & Explanations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['all', 'correct', 'incorrect', 'skipped', 'marked'].map(filterKey => (
                  <TouchableOpacity
                    key={filterKey}
                    onPress={() => setReviewFilter(filterKey)}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
                      backgroundColor: reviewFilter === filterKey ? T.indigo : T.card,
                      borderColor: reviewFilter === filterKey ? T.indigo : T.border,
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: reviewFilter === filterKey }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', textTransform: 'capitalize', color: reviewFilter === filterKey ? T.white : T.textMuted }}>{filterKey}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Filtered Explanation Cards */}
            {filteredReviewList.map((r) => (
              <View key={r.idx} style={{ backgroundColor: T.card, padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: T.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: T.indigo, textTransform: 'uppercase', letterSpacing: 1 }}>Question {r.idx + 1}</Text>
                  {r.isSkipped ? (
                    <View style={{ backgroundColor: T.chip, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: T.textMuted }}>Skipped</Text>
                    </View>
                  ) : r.isCorrect ? (
                    <View style={{ backgroundColor: T.greenTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: T.green }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: T.green }}>Correct</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: T.dangerTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: T.rose }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: T.rose }}>Incorrect</Text>
                    </View>
                  )}
                </View>

                <Text style={{ fontSize: 16, color: T.textPrimary, fontWeight: '500', marginBottom: 16 }}>{r.q.question}</Text>

                <View style={{ gap: 8, marginBottom: 16 }}>
                  {!r.isSkipped && !r.isCorrect && (
                    <View style={{ backgroundColor: T.dangerTint, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: T.rose }}>
                      <Text style={{ fontSize: 10, color: T.rose, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Your Choice</Text>
                      <Text style={{ color: T.textPrimary, fontSize: 14, fontWeight: '500' }}>{r.selected}</Text>
                    </View>
                  )}
                  <View style={{ backgroundColor: T.greenTint, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: T.green }}>
                    <Text style={{ fontSize: 10, color: T.green, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}>Correct Answer</Text>
                    <Text style={{ color: T.textPrimary, fontSize: 14, fontWeight: '500' }}>{r.q.correctAnswer}</Text>
                  </View>
                </View>

                {r.q.explanation && (
                  <View style={{ backgroundColor: T.indigoTint, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: T.indigo }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: T.indigo, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Official Explanation</Text>
                    <Text style={{ fontSize: 14, color: T.textPrimary, lineHeight: 20 }}>{r.q.explanation}</Text>
                  </View>
                )}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  return null;
}