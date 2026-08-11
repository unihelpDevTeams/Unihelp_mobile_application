import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  SafeAreaView
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

const STATUS_META = {
  [STATUS.NOT_VISITED]: { label: 'Unvisited', color: '#64748B', bg: 'bg-slate-500' },
  [STATUS.NOT_ANSWERED]: { label: 'Unanswered', color: '#EF4444', bg: 'bg-rose-500' },
  [STATUS.ANSWERED]: { label: 'Answered', color: '#10B981', bg: 'bg-emerald-500' },
  [STATUS.MARKED]: { label: 'Review Later', color: '#F59E0B', bg: 'bg-amber-500' },
  [STATUS.ANSWERED_MARKED]: { label: 'Ans & Flagged', color: '#6366F1', bg: 'bg-indigo-500' },
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

export default function CBTPracticeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

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

  // Sync History
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await AsyncStorage.getItem('cbt_history_v2');
        if (saved) setHistory(JSON.parse(saved));
      } catch (e) {}
    };
    loadHistory();
  }, [showHistory, stage]);

  // Exam Back-button Safety Guard
  useEffect(() => {
    const backAction = () => {
      if (stage === 'exam') {
        Alert.alert(
          '⚠️ Active Exam Session',
          'Are you sure you want to exit? Your answers will be submitted and graded immediately.',
          [
            { text: 'Resume Exam', onPress: () => null, style: 'cancel' },
            { text: 'Submit & Exit', onPress: () => finishExam(false) },
            { text: 'Discard Session', onPress: () => finishExam(true), style: 'destructive' }
          ]
        );
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
  }, [stage]);

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
      Alert.alert("⏰ Time Elapsed", "Official examination duration has concluded. Submitting your test paper...");
      finishExam();
    }
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
        Alert.alert('Unable to Start', 'Could not parse the test paper from server.');
      }
    } catch (error) {
      setStage('setup');
      Alert.alert('Network Failure', 'Verify your active internet connection and retry.');
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
      await AsyncStorage.setItem('cbt_history_v2', JSON.stringify(saved.slice(0, 50)));
    } catch (e) {}
  };

  const requestSubmit = () => {
    const unansweredCount = questions.length - Object.keys(answers).length;
    const msg = unansweredCount > 0 
      ? `You have ${unansweredCount} unanswered questions remaining! Are you sure you want to submit now?`
      : 'Are you sure you wish to submit your test paper?';

    Alert.alert('Submit Test Paper', msg, [
      { text: 'Continue Exam', style: 'cancel' },
      { text: 'Yes, Submit', onPress: () => finishExam() }
    ]);
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

  // Stage Renderers
  if (loading) {
    return (
      <ScreenShell title="CBT Terminal" onBack={() => router.back()}>
        <View className="flex-1 items-center justify-center pt-20">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="text-slate-500 font-bold tracking-widest uppercase text-xs mt-4">Initializing Test Engine...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (loadError) {
    return (
      <ScreenShell title="CBT Terminal" onBack={() => router.back()}>
        <View className="flex-1 items-center justify-center pt-20 px-6">
          <Ionicons name="cloud-offline-outline" size={60} color="#F43F5E" />
          <Text className="text-xl font-black text-slate-900 dark:text-white mt-4">Server Unreachable</Text>
          <Text className="text-center text-slate-500 mt-2">Failed to sync question banks from terminal host.</Text>
        </View>
      </ScreenShell>
    );
  }

  if (showHistory) {
    return (
      <ScreenShell title="Mock Test History" onBack={() => setShowHistory(false)}>
        <ScrollView className="flex-1 px-4 pt-4">
          {history.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="documents-outline" size={56} color="#94A3B8" />
              <Text className="text-slate-500 font-semibold mt-3">No prior test attempts recorded.</Text>
            </View>
          ) : (
            history.map((item) => {
              const pct = Math.round((item.score / item.totalQuestions) * 100);
              const isPass = pct >= 50;
              return (
                <View key={item.id || item.date} className="bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800 shadow-sm flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="font-bold text-base text-slate-900 dark:text-white" numberOfLines={1}>{item.courseTitle}</Text>
                    <Text className="text-xs text-indigo-500 font-medium mt-0.5">Candidate: {item.candidate || 'Default'}</Text>
                    <Text className="text-[11px] text-slate-400 mt-1">
                      {new Date(item.date).toLocaleDateString()} • Duration: {formatClock(item.timeTaken || 0)}
                    </Text>
                  </View>
                  <View className="items-end bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl">
                    <Text className={`font-black text-lg ${isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {item.score}/{item.totalQuestions}
                    </Text>
                    <Text className="text-[10px] text-slate-400 font-bold uppercase">{pct}% Overall</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </ScreenShell>
    );
  }

  if (stage === 'browse') {
    return (
      <ScreenShell title="UTME / WAEC CBT Simulator" onBack={() => router.back()}>
        <ScrollView className="flex-1 px-4 pt-3 pb-10" showsVerticalScrollIndicator={false}>
          {/* Hero Banner */}
          <View className="bg-indigo-600 rounded-3xl p-5 mb-6 shadow-xl shadow-indigo-500/20">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Mock Simulator</Text>
                <Text className="text-white text-2xl font-black mt-1">Ready for Practice?</Text>
                <Text className="text-indigo-100 text-xs mt-1.5 leading-relaxed">Prepare with standard UTME & JAMB mock test papers.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistory(true)} className="bg-white/20 p-3 rounded-2xl">
                <Ionicons name="bar-chart-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-white dark:bg-slate-900 rounded-2xl px-4 py-3 mb-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              className="flex-1 ml-3 text-base text-slate-900 dark:text-white"
              placeholder="Search subject or course code..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          {/* Course Grid */}
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Available Papers ({filteredCourses.length})</Text>
          <View className="flex-row flex-wrap justify-between">
            {filteredCourses.map(course => (
              <TouchableOpacity
                key={course.id}
                onPress={() => beginSetup(course.id)}
                className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <View className="bg-indigo-50 dark:bg-indigo-950 w-10 h-10 rounded-xl items-center justify-center mb-3">
                  <MaterialCommunityIcons name="file-document-edit-outline" size={22} color="#6366F1" />
                </View>
                <Text className="font-bold text-slate-900 dark:text-white text-base mb-1" numberOfLines={2}>{course.title}</Text>
                <Text className="text-xs text-slate-400 font-semibold">{course.question_count} Questions</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  if (stage === 'setup') {
    const course = courses.find(c => c.id === setupCourse);
    return (
      <ScreenShell title="Paper Configuration" onBack={() => setStage('browse')}>
        <ScrollView className="flex-1 px-4 pt-4">
          <View className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <View className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <Text className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-1">CBT Setup Desk</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{course?.title}</Text>
            </View>

            <View className="mb-5">
              <Text className="font-bold text-slate-700 dark:text-slate-300 mb-2">Username / Candidate Display Name</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-base border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                placeholder="Enter your name..."
                placeholderTextColor="#94A3B8"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View className="mb-5">
              <Text className="font-bold text-slate-700 dark:text-slate-300 mb-2">Question Quantity</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-base border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                keyboardType="numeric"
                value={numQuestions}
                onChangeText={setNumQuestions}
              />
              <Text className="text-xs text-slate-400 mt-1">Maximum available: {course?.question_count}</Text>
            </View>

            <View className="mb-6">
              <Text className="font-bold text-slate-700 dark:text-slate-300 mb-2">Duration (Minutes)</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-base border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                keyboardType="numeric"
                value={timeLimit}
                onChangeText={setTimeLimit}
              />
            </View>

            <TouchableOpacity 
              onPress={() => { setAgreed(false); setStage('instructions'); }}
              className="bg-indigo-600 py-4 rounded-2xl items-center shadow-lg shadow-indigo-500/30"
            >
              <Text className="text-white font-black text-base">Proceed to Candidate Rules</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  if (stage === 'instructions') {
    return (
      <ScreenShell title="Candidate Rules" onBack={() => setStage('setup')}>
        <ScrollView className="flex-1 px-4 pt-4">
          <View className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <Text className="text-xl font-black text-slate-900 dark:text-white mb-4">Official Examination Guidelines</Text>

            <View className="space-y-4 mb-6">
              <View className="flex-row items-start gap-3">
                <Ionicons name="time" size={20} color="#6366F1" />
                <Text className="flex-1 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">Timer countdown will initiate immediately upon clicking "Launch Test Session".</Text>
              </View>
              <View className="flex-row items-start gap-3 mt-3">
                <Ionicons name="grid" size={20} color="#6366F1" />
                <Text className="flex-1 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">Use the top grid navigator to inspect answered vs unvisited questions.</Text>
              </View>
              <View className="flex-row items-start gap-3 mt-3">
                <Ionicons name="calculator" size={20} color="#6366F1" />
                <Text className="flex-1 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">In-app Scientific Calculator is available in the top utility toolbar.</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setAgreed(!agreed)}
              className="flex-row items-center gap-3 mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700"
            >
              <View className={`w-6 h-6 rounded-lg border items-center justify-center ${agreed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400'}`}>
                {agreed && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text className="flex-1 font-semibold text-slate-800 dark:text-slate-200 text-sm">I certify that I am ready for this mock examination.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={startExam}
              disabled={!agreed}
              className={`py-4 rounded-2xl items-center shadow-lg ${agreed ? 'bg-indigo-600 shadow-indigo-500/30' : 'bg-slate-300 dark:bg-slate-800'}`}
            >
              <Text className={`font-black text-base ${agreed ? 'text-white' : 'text-slate-500'}`}>Launch Test Session</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  if (stage === 'exam') {
    if (loadingQuestions) {
      return (
        <ScreenShell title="Loading Room" onBack={() => finishExam(true)}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#6366F1" />
            <Text className="text-slate-500 dark:text-slate-400 mt-4 font-mono uppercase text-xs tracking-widest">Preparing Examination Paper...</Text>
          </View>
        </ScreenShell>
      );
    }

    const currentQ = questions[currentIndex];
    const isMarked = markedForReview[currentIndex];
    const baseFontSize = 16 + fontSizeOffset;

    return (
      <ScreenShell 
        title={activeCourse?.title || "CBT Practice Room"} 
        onBack={() => {
          Alert.alert(
            '⚠️ Exit Active Exam',
            'Are you sure you want to exit? Your test paper will be finalized immediately.',
            [
              { text: 'Resume', style: 'cancel' },
              { text: 'Submit & Exit', onPress: () => finishExam() }
            ]
          );
        }}
      >
        <View className="flex-1 bg-slate-100 dark:bg-slate-950">
          {/* Authentic CBT Desktop Top Bar */}
          <View className="bg-slate-900 px-4 py-3 flex-row items-center justify-between border-b border-slate-800">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-9 h-9 rounded-full bg-indigo-600 items-center justify-center mr-3 border border-indigo-400">
                <Ionicons name="person" size={18} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-xs" numberOfLines={1}>{username}</Text>
                <Text className="text-slate-400 font-mono text-[10px]" numberOfLines={1}>{activeCourse?.title}</Text>
              </View>
            </View>

            {/* Quick Utility Toolbar */}
            <View className="flex-row items-center gap-2">
              <TouchableOpacity onPress={() => setShowCalc(!showCalc)} className={`p-2 rounded-lg ${showCalc ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                <Ionicons name="calculator" size={18} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setFontSizeOffset(prev => (prev >= 4 ? -2 : prev + 2))} className="p-2 bg-slate-800 rounded-lg">
                <Text className="text-white font-bold text-xs">A{fontSizeOffset > 0 ? `+${fontSizeOffset}` : ''}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowPalette(true)} className="p-2 bg-indigo-600 rounded-lg flex-row items-center gap-1">
                <Ionicons name="grid" size={16} color="white" />
                <Text className="text-white font-bold text-xs">{currentIndex + 1}/{questions.length}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dynamic Countdown Banner */}
          <View className={`py-2 px-4 flex-row items-center justify-between ${timeLeft < 180 ? 'bg-rose-600' : 'bg-slate-800'}`}>
            <Text className="text-white font-mono text-xs font-bold uppercase tracking-wider">Time Remaining</Text>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={16} color="white" />
              <Text className="text-white font-mono font-black text-base">{formatClock(timeLeft)}</Text>
            </View>
          </View>

          {/* Built-in Scientific Calculator Floating Overlay */}
          {showCalc && (
            <View className="absolute top-28 right-4 z-50 bg-slate-900 border border-slate-700 p-4 rounded-2xl w-64 shadow-2xl">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-slate-400 font-mono text-xs uppercase">CBT Calculator</Text>
                <TouchableOpacity onPress={() => setShowCalc(false)}><Ionicons name="close" size={18} color="#94A3B8" /></TouchableOpacity>
              </View>
              <View className="bg-black/60 p-3 rounded-xl mb-3 items-end">
                <Text className="text-emerald-400 font-mono text-xl font-bold">{calcDisplay}</Text>
              </View>
              <View className="flex-row flex-wrap gap-2 justify-between">
                {['7','8','9','÷','4','5','6','×','1','2','3','-','C','0','=','+'].map((btn) => (
                  <TouchableOpacity key={btn} onPress={() => handleCalcPress(btn)} className="w-[22%] bg-slate-800 py-2.5 rounded-lg items-center">
                    <Text className="text-white font-bold text-base">{btn}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Palette Modal Navigation */}
          <Modal visible={showPalette} animationType="slide" transparent={true} onRequestClose={() => setShowPalette(false)}>
            <View className="flex-1 justify-end bg-black/70">
              <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 max-h-[80%] shadow-2xl">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-xl font-black text-slate-900 dark:text-white">Question Navigator Grid</Text>
                  <TouchableOpacity onPress={() => setShowPalette(false)} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="flex-row flex-wrap gap-2.5 justify-center mb-6">
                    {questions.map((_, idx) => {
                      const st = statusFor(idx);
                      const isCurrent = idx === currentIndex;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => goToQuestion(idx)}
                          className={`w-11 h-11 rounded-xl items-center justify-center border-2 ${STATUS_META[st].bg} ${isCurrent ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                        >
                          <Text className="text-white font-bold">{idx + 1}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Legend */}
                  <View className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex-row flex-wrap justify-between gap-y-3">
                    {Object.values(STATUS_META).map((meta, idx) => (
                      <View key={idx} className="flex-row items-center w-[48%]">
                        <View className={`w-3 h-3 rounded-full mr-2 ${meta.bg}`} />
                        <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">{meta.label}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Primary Question View Surface */}
          <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 120 }}>
            <View className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xs font-black uppercase tracking-widest text-indigo-500">Question {currentIndex + 1}</Text>
                {isMarked && (
                  <View className="bg-amber-100 dark:bg-amber-950/50 px-3 py-1 rounded-full flex-row items-center gap-1">
                    <Ionicons name="bookmark" size={12} color="#F59E0B" />
                    <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Flagged</Text>
                  </View>
                )}
              </View>

              <Text style={{ fontSize: baseFontSize }} className="text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                {currentQ?.question}
              </Text>
            </View>

            {/* Options Grid */}
            <View className="space-y-3">
              {currentQ?.options.map((opt, idx) => {
                const letters = ['A', 'B', 'C', 'D', 'E'];
                const isSelected = answers[currentIndex] === opt;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => selectOption(opt)}
                    className={`flex-row items-center p-4 rounded-2xl border ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                  >
                    <View className={`w-8 h-8 rounded-xl items-center justify-center mr-3 ${isSelected ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Text className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {letters[idx]}
                      </Text>
                    </View>
                    <Text style={{ fontSize: baseFontSize - 1 }} className={`flex-1 font-medium ${isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Authentic CBT Navigation Dock */}
          <View className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex-row items-center justify-between">
            <TouchableOpacity 
              onPress={goBack}
              disabled={currentIndex === 0}
              className={`px-4 py-3 rounded-xl flex-row items-center gap-1 ${currentIndex === 0 ? 'opacity-30' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              <Ionicons name="chevron-back" size={20} color="#6366F1" />
              <Text className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={toggleMarkForReview}
              className={`px-4 py-3 rounded-xl border flex-row items-center gap-1 ${isMarked ? 'bg-amber-500 border-amber-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
            >
              <Ionicons name="bookmark-outline" size={18} color={isMarked ? "white" : "#64748B"} />
              <Text className={`font-bold text-xs uppercase ${isMarked ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>Review</Text>
            </TouchableOpacity>

            {currentIndex === questions.length - 1 ? (
              <TouchableOpacity onPress={requestSubmit} className="bg-emerald-600 px-5 py-3 rounded-xl flex-row items-center gap-1">
                <Text className="text-white font-black text-xs uppercase">Submit</Text>
                <Ionicons name="checkmark-done" size={18} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={goNext} className="bg-indigo-600 px-5 py-3 rounded-xl flex-row items-center gap-1">
                <Text className="text-white font-black text-xs uppercase">Next</Text>
                <Ionicons name="chevron-forward" size={18} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScreenShell>
    );
  }

  if (stage === 'results') {
    const isPass = completionPercent >= 50;
    return (
      <ScreenShell title="Test Diagnostics" onBack={resetAll}>
        <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
          {/* Diagnostic Result Card */}
          <View className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm items-center mb-6">
            <View className={`w-20 h-20 rounded-full items-center justify-center mb-3 ${isPass ? 'bg-emerald-100 dark:bg-emerald-950/50' : 'bg-rose-100 dark:bg-rose-950/50'}`}>
              <Ionicons name={isPass ? "trophy" : "alert-circle"} size={40} color={isPass ? "#10B981" : "#F43F5E"} />
            </View>

            <Text className="text-sm font-bold text-indigo-500 mb-1">{username}</Text>
            <Text className="text-3xl font-black text-slate-900 dark:text-white">
              {score} <Text className="text-slate-400 text-lg font-medium">/ {questions.length}</Text>
            </Text>
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{completionPercent}% Accuracy Score</Text>

            {/* Metrics Breakdown */}
            <View className="flex-row justify-around w-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <View className="items-center">
                <Text className="text-xs text-slate-400 font-bold uppercase">Time Spent</Text>
                <Text className="text-base font-black text-slate-800 dark:text-slate-200 mt-1">{formatClock(timeSpentSeconds)}</Text>
              </View>
              <View className="items-center">
                <Text className="text-xs text-slate-400 font-bold uppercase">Outcome</Text>
                <Text className={`text-base font-black mt-1 ${isPass ? 'text-emerald-500' : 'text-rose-500'}`}>{isPass ? 'PASSED' : 'RETAKE'}</Text>
              </View>
            </View>

            <View className="flex-row gap-3 mt-6 w-full">
              <TouchableOpacity onPress={resetAll} className="flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center">
                <Text className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">Retake Paper</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/')} className="flex-1 bg-indigo-600 py-3.5 rounded-2xl items-center shadow-lg shadow-indigo-500/30">
                <Text className="font-black text-white text-xs uppercase">Exit Terminal</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Diagnostic Filter Bar */}
          <Text className="font-black text-lg text-slate-900 dark:text-white mb-3">Questions Review & Explanations</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {['all', 'correct', 'incorrect', 'skipped', 'marked'].map(filterKey => (
                <TouchableOpacity
                  key={filterKey}
                  onPress={() => setReviewFilter(filterKey)}
                  className={`px-4 py-2 rounded-full border ${reviewFilter === filterKey ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
                >
                  <Text className={`text-xs font-bold capitalize ${reviewFilter === filterKey ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>{filterKey}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Filtered Explanation Cards */}
          {filteredReviewList.map((r) => (
            <View key={r.idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Question {r.idx + 1}</Text>
                {r.isSkipped ? (
                  <View className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md"><Text className="text-[10px] font-bold text-slate-500">Skipped</Text></View>
                ) : r.isCorrect ? (
                  <View className="bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800"><Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Correct</Text></View>
                ) : (
                  <View className="bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-800"><Text className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Incorrect</Text></View>
                )}
              </View>

              <Text className="text-base text-slate-800 dark:text-slate-200 font-medium mb-4">{r.q.question}</Text>

              <View className="space-y-2 mb-4">
                {!r.isSkipped && !r.isCorrect && (
                  <View className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                    <Text className="text-[10px] text-rose-500 font-bold uppercase mb-0.5">Your Choice</Text>
                    <Text className="text-rose-900 dark:text-rose-200 text-sm font-medium">{r.selected}</Text>
                  </View>
                )}
                <View className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <Text className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-0.5">Correct Answer</Text>
                  <Text className="text-emerald-900 dark:text-emerald-200 text-sm font-medium">{r.q.correctAnswer}</Text>
                </View>
              </View>

              {r.q.explanation && (
                <View className="bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/40">
                  <Text className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Official Explanation</Text>
                  <Text className="text-sm text-indigo-950 dark:text-indigo-200 leading-relaxed">{r.q.explanation}</Text>
                </View>
              )}
            </View>
          ))}
          <View className="h-10" />
        </ScrollView>
      </ScreenShell>
    );
  }

  return null;
}