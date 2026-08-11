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
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  [STATUS.NOT_VISITED]: { label: 'Not visited', color: '#94A3B8' },
  [STATUS.NOT_ANSWERED]: { label: 'Not answered', color: '#F43F5E' },
  [STATUS.ANSWERED]: { label: 'Answered', color: '#6366F1' },
  [STATUS.MARKED]: { label: 'Marked', color: '#8B5CF6' },
  [STATUS.ANSWERED_MARKED]: { label: 'Ans & Marked', color: '#8B5CF6' },
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

  // Data
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Stage: 'browse' | 'setup' | 'instructions' | 'exam' | 'results' | 'history'
  const [stage, setStage] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  // Setup
  const [setupCourse, setSetupCourse] = useState(null);
  const [numQuestions, setNumQuestions] = useState('20');
  const [timeLimit, setTimeLimit] = useState('18');
  const [candidateName, setCandidateName] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Active Session
  const [activeCourse, setActiveCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [visited, setVisited] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [showPalette, setShowPalette] = useState(false);
  
  // Results
  const [reviewFilter, setReviewFilter] = useState('all');

  const timerRef = useRef(null);

  // Load courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
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
    fetchCourses();
  }, []);

  // Load history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await AsyncStorage.getItem('cbt_history');
        if (saved) setHistory(JSON.parse(saved));
      } catch (e) {}
    };
    loadHistory();
  }, [showHistory, stage]);

  // Handle hardware back button during exam
  useEffect(() => {
    const backAction = () => {
      if (stage === 'exam') {
        Alert.alert('Hold on!', 'Are you sure you want to end this exam? Your progress will be lost.', [
          { text: 'Cancel', onPress: () => null, style: 'cancel' },
          { text: 'YES', onPress: () => finishExam(true) }
        ]);
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

  // Timer
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

  // Auto-submit
  useEffect(() => {
    if (stage === 'exam' && timeLeft === 0 && startedAt) {
      Alert.alert("Time's up!", "Your exam has been automatically submitted.");
      finishExam();
    }
  }, [timeLeft, stage]);

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

  const counts = useMemo(() => {
    const base = { [STATUS.NOT_VISITED]: 0, [STATUS.NOT_ANSWERED]: 0, [STATUS.ANSWERED]: 0, [STATUS.MARKED]: 0, [STATUS.ANSWERED_MARKED]: 0 };
    questions.forEach((_, idx) => base[statusFor(idx)] += 1);
    return base;
  }, [questions, statusFor]);

  const score = useMemo(() => {
    return questions.reduce((acc, q, idx) => (answers[idx] === q.correctAnswer ? acc + 1 : acc), 0);
  }, [questions, answers]);

  const completionPercent = questions.length ? Math.round((score / questions.length) * 100) : 0;

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
    return reviewList;
  }, [reviewList, reviewFilter]);

  // Actions
  const beginSetup = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    setSetupCourse(courseId);
    setNumQuestions(String(Math.min(20, course?.question_count || 20)));
    setTimeLimit('18');
    setStage('setup');
  };

  const startExam = async () => {
    const course = courses.find(c => c.id === setupCourse);
    if (!course) return;
    setLoadingQuestions(true);
    setStage('exam');
    try {
      const response = await fetch(course.endpoint);
      const data = await response.json();
      if (data.status === 'success') {
        const shuffled = [...data.data].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, parseInt(numQuestions) || 20);
        const formatted = selected.map(q => {
          const options = [];
          if (q.a) options.push(q.a);
          if (q.b) options.push(q.b);
          if (q.c) options.push(q.c);
          if (q.d) options.push(q.d);
          if (q.e) options.push(q.e);
          const correctKey = q.correct?.toLowerCase();
          const correctAnswer = correctKey && q[correctKey] ? q[correctKey] : '';
          return {
            id: Math.random().toString(36).substring(7),
            courseTitle: course.title,
            question: q.question,
            options,
            correctAnswer,
            explanation: q.explanation || 'No explanation available.',
          };
        });
        setActiveCourse(course);
        setQuestions(formatted);
        setCurrentIndex(0);
        setAnswers({});
        setMarkedForReview({});
        setVisited({ 0: true });
        setTimeLeft((parseInt(timeLimit) || 18) * 60);
        setStartedAt(Date.now());
      } else {
        setStage('setup');
        Alert.alert('Error', 'Could not load questions.');
      }
    } catch (error) {
      setStage('setup');
      Alert.alert('Error', 'Failed to fetch questions.');
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
  const clearResponse = () => setAnswers(prev => { const next = { ...prev }; delete next[currentIndex]; return next; });
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
      const saved = JSON.parse(await AsyncStorage.getItem('cbt_history')) || [];
      saved.unshift({
        courseTitle: activeCourse?.title,
        score: questions.reduce((acc, q, idx) => (answers[idx] === q.correctAnswer ? acc + 1 : acc), 0),
        totalQuestions: questions.length,
        date: new Date().toISOString(),
      });
      await AsyncStorage.setItem('cbt_history', JSON.stringify(saved.slice(0, 50)));
    } catch (e) {}
  };

  const requestSubmit = () => {
    Alert.alert('Submit Exam', 'Are you sure you want to submit your answers?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', onPress: () => finishExam() }
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
  };

  // Renderers
  if (loading) {
    return (
      <ScreenShell title="CBT Practice" onBack={() => router.back()}>
        <View className="flex-1 items-center justify-center pt-20">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="text-gray-500 mt-4 font-bold tracking-widest uppercase">Loading CBT Engine...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (loadError) {
    return (
      <ScreenShell title="CBT Practice" onBack={() => router.back()}>
        <View className="flex-1 items-center justify-center pt-20 px-6">
          <Ionicons name="warning" size={48} color="#F43F5E" />
          <Text className="text-xl font-bold text-center mt-4">Connection Error</Text>
          <Text className="text-center text-gray-500 mt-2">Could not reach the CBT question bank. Please try again later.</Text>
        </View>
      </ScreenShell>
    );
  }

  if (showHistory) {
    return (
      <ScreenShell title="Performance History" onBack={() => setShowHistory(false)}>
        <ScrollView className="flex-1 px-4 pt-4">
          {history.length === 0 ? (
            <Text className="text-center text-gray-500 mt-10">No sessions recorded yet.</Text>
          ) : (
            history.map((item, idx) => {
              const pct = Math.round((item.score / item.totalQuestions) * 100);
              const isGood = pct >= 50;
              return (
                <View key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-2xl mb-4 border border-gray-100 dark:border-slate-700 shadow-sm flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-lg text-slate-900 dark:text-white">{item.courseTitle}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{new Date(item.date).toLocaleString()}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-gray-500 font-bold tracking-widest uppercase">Score</Text>
                    <Text className={`font-bold text-lg ${isGood ? 'text-indigo-600' : 'text-rose-500'}`}>
                      {item.score}/{item.totalQuestions}
                    </Text>
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
      <ScreenShell title="CBT Practice" onBack={() => router.back()}>
        <ScrollView className="flex-1 px-4 pt-2 pb-10">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">Select Subject</Text>
              <Text className="text-gray-500 mt-1 text-sm">Practice standard Jamb/Post UTME questions</Text>
            </View>
            <TouchableOpacity onPress={() => setShowHistory(true)} className="bg-indigo-100 dark:bg-indigo-900/30 p-2.5 rounded-full">
              <Ionicons name="time" size={22} color="#6366F1" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 mb-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-3 text-base text-slate-900 dark:text-white"
              placeholder="Search subjects..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          <View className="flex-row flex-wrap justify-between">
            {filteredCourses.map(course => (
              <TouchableOpacity
                key={course.id}
                onPress={() => beginSetup(course.id)}
                className="w-[48%] bg-white dark:bg-slate-800 p-4 rounded-2xl mb-4 border border-gray-100 dark:border-slate-700 shadow-sm active:scale-95 transition-transform"
              >
                <View className="bg-indigo-50 dark:bg-slate-700 w-10 h-10 rounded-xl items-center justify-center mb-3">
                  <Ionicons name="book" size={20} color="#6366F1" />
                </View>
                <Text className="font-bold text-slate-900 dark:text-white text-base mb-1" numberOfLines={2}>{course.title}</Text>
                <Text className="text-xs text-gray-500">{course.question_count} Qs available</Text>
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
      <ScreenShell title="Session Setup" onBack={() => setStage('browse')}>
        <ScrollView className="flex-1 px-4 pt-4">
          <View className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <View className="mb-6 border-b border-gray-100 dark:border-slate-700 pb-4">
              <Text className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">Step 1 of 2</Text>
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{course?.title}</Text>
              <Text className="text-gray-500 mt-1">Configure your mock exam parameters</Text>
            </View>

            <View className="mb-5">
              <Text className="font-bold mb-2 text-slate-700 dark:text-slate-300">Number of Questions</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 rounded-xl px-4 py-3.5 text-base border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
                keyboardType="numeric"
                value={numQuestions}
                onChangeText={setNumQuestions}
              />
              <Text className="text-xs text-gray-500 mt-2 ml-1">Max available: {course?.question_count}</Text>
            </View>

            <View className="mb-6">
              <Text className="font-bold mb-2 text-slate-700 dark:text-slate-300">Time Limit (minutes)</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 rounded-xl px-4 py-3.5 text-base border border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white"
                keyboardType="numeric"
                value={timeLimit}
                onChangeText={setTimeLimit}
              />
            </View>

            <TouchableOpacity 
              onPress={() => { setAgreed(false); setStage('instructions'); }}
              className="bg-indigo-600 py-4 rounded-xl items-center shadow-lg shadow-indigo-500/30"
            >
              <Text className="text-white font-bold text-base">Continue to Instructions</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  if (stage === 'instructions') {
    return (
      <ScreenShell title="Instructions" onBack={() => setStage('setup')}>
        <ScrollView className="flex-1 px-4 pt-4">
          <View className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <View className="mb-6 flex-row items-center gap-3 border-b border-gray-100 dark:border-slate-700 pb-4">
              <Ionicons name="information-circle" size={32} color="#6366F1" />
              <View>
                <Text className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">Step 2 of 2</Text>
                <Text className="text-xl font-black text-slate-900 dark:text-white">Exam Guidelines</Text>
              </View>
            </View>

            <View className="space-y-4 mb-8">
              <View className="flex-row gap-3">
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text className="flex-1 text-slate-700 dark:text-slate-300 leading-6">This is a timed mock. Once started, the timer cannot be paused.</Text>
              </View>
              <View className="flex-row gap-3 mt-3">
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text className="flex-1 text-slate-700 dark:text-slate-300 leading-6">Use the "Mark for Review" button if you're unsure and want to return to a question later.</Text>
              </View>
              <View className="flex-row gap-3 mt-3">
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text className="flex-1 text-slate-700 dark:text-slate-300 leading-6">Your test will automatically submit when the timer hits zero.</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setAgreed(!agreed)}
              className="flex-row items-center gap-3 mb-6 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700"
            >
              <View className={`w-6 h-6 rounded border items-center justify-center ${agreed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400'}`}>
                {agreed && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text className="flex-1 font-semibold text-slate-800 dark:text-slate-200">I have read and agree to the instructions above.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={startExam}
              disabled={!agreed}
              className={`py-4 rounded-xl items-center shadow-lg ${agreed ? 'bg-indigo-600 shadow-indigo-500/30' : 'bg-gray-300 dark:bg-slate-700 shadow-none'}`}
            >
              <Text className={`font-bold text-base ${agreed ? 'text-white' : 'text-gray-500'}`}>Start Exam Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenShell>
    );
  }

  if (stage === 'exam') {
    if (loadingQuestions) {
      return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="text-gray-500 mt-4 font-bold tracking-widest uppercase">Preparing Exam...</Text>
        </View>
      );
    }

    const currentQ = questions[currentIndex];
    const isMarked = markedForReview[currentIndex];
    
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
        {/* Exam Header */}
        <View className="bg-white dark:bg-slate-900 pt-12 pb-4 px-4 shadow-sm border-b border-gray-200 dark:border-slate-800 flex-row items-center justify-between z-10">
          <View>
            <Text className="font-bold text-slate-900 dark:text-white">{activeCourse?.title}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Q {currentIndex + 1} of {questions.length}</Text>
          </View>
          <View className="bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-full flex-row items-center gap-2">
            <Ionicons name="time" size={16} color="#6366F1" />
            <Text className={`font-mono font-bold text-base ${timeLeft < 300 ? 'text-rose-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {formatClock(timeLeft)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowPalette(!showPalette)} className="p-2">
            <Ionicons name="grid" size={22} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View className="h-1 w-full bg-gray-200 dark:bg-slate-800">
          <View className="h-full bg-indigo-500" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </View>

        {/* Palette Modal (Overlay) */}
        {showPalette && (
          <View className="absolute inset-0 z-50 bg-black/50 pt-[100px]">
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl flex-1 p-6 shadow-2xl">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Question Grid</Text>
                <TouchableOpacity onPress={() => setShowPalette(false)} className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full">
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView>
                <View className="flex-row flex-wrap gap-2 justify-center mb-6">
                  {questions.map((_, idx) => {
                    const st = statusFor(idx);
                    const color = STATUS_META[st].color;
                    const isCurrent = idx === currentIndex;
                    return (
                      <TouchableOpacity 
                        key={idx} 
                        onPress={() => goToQuestion(idx)}
                        className={`w-[45px] h-[45px] rounded-xl items-center justify-center border-2 ${isCurrent ? 'border-indigo-900 dark:border-indigo-300' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      >
                        <Text className="text-white font-bold">{idx + 1}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Legend */}
                <View className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl flex-row flex-wrap justify-between gap-y-3">
                  {Object.values(STATUS_META).map((meta, idx) => (
                    <View key={idx} className="flex-row items-center w-[48%]">
                      <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: meta.color }} />
                      <Text className="text-xs text-gray-600 dark:text-gray-300">{meta.label}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        <ScrollView className="flex-1 px-5 pt-6 pb-24">
          <Text className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed font-medium mb-6">
            {currentQ?.question}
          </Text>

          <View className="space-y-3 mb-10">
            {currentQ?.options.map((opt, idx) => {
              const isSelected = answers[currentIndex] === opt;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => selectOption(opt)}
                  className={`flex-row p-4 rounded-2xl border ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
                >
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 mt-0.5 ${isSelected ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {isSelected && <View className="w-3 h-3 rounded-full bg-indigo-500" />}
                  </View>
                  <Text className={`flex-1 text-base ${isSelected ? 'text-indigo-900 dark:text-indigo-200 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 p-4 flex-row items-center justify-between pb-8">
          <TouchableOpacity 
            onPress={goBack} 
            disabled={currentIndex === 0}
            className={`p-3 rounded-xl ${currentIndex === 0 ? 'opacity-30' : 'bg-gray-100 dark:bg-slate-800'}`}
          >
            <Ionicons name="chevron-back" size={24} color="#6366F1" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={toggleMarkForReview}
            className={`flex-row items-center px-4 py-3 rounded-xl border ${isMarked ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}
          >
            <Ionicons name={isMarked ? "flag" : "flag-outline"} size={18} color={isMarked ? "#F59E0B" : "#64748b"} />
            <Text className={`ml-2 font-bold ${isMarked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>Review</Text>
          </TouchableOpacity>

          {currentIndex === questions.length - 1 ? (
            <TouchableOpacity 
              onPress={requestSubmit}
              className="bg-indigo-600 px-6 py-3 rounded-xl flex-row items-center shadow-lg shadow-indigo-500/30"
            >
              <Text className="text-white font-bold mr-2">Submit</Text>
              <Ionicons name="checkmark-done" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={goNext}
              className="bg-gray-100 dark:bg-slate-800 p-3 rounded-xl"
            >
              <Ionicons name="chevron-forward" size={24} color="#6366F1" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (stage === 'results') {
    const isGood = completionPercent >= 50;
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="bg-white dark:bg-slate-900 pt-16 pb-6 px-6 items-center shadow-sm border-b border-gray-200 dark:border-slate-800">
          <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isGood ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-rose-100 dark:bg-rose-900/40'}`}>
            <Ionicons name={isGood ? "trophy" : "alert-circle"} size={36} color={isGood ? "#10B981" : "#F43F5E"} />
          </View>
          <Text className="text-3xl font-black text-slate-900 dark:text-white mb-1">{score} <Text className="text-xl text-gray-500 font-medium">/ {questions.length}</Text></Text>
          <Text className="text-base font-bold text-slate-500 uppercase tracking-widest">{completionPercent}% Score</Text>
          
          <View className="flex-row gap-3 mt-6 w-full">
            <TouchableOpacity onPress={resetAll} className="flex-1 bg-gray-100 dark:bg-slate-800 py-3.5 rounded-xl items-center">
              <Text className="font-bold text-slate-700 dark:text-slate-300">Take Another</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/')} className="flex-1 bg-indigo-600 py-3.5 rounded-xl items-center shadow-md shadow-indigo-500/30">
              <Text className="font-bold text-white">Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-1 px-4 pt-4">
          <View className="flex-row justify-between mb-4">
            <Text className="font-black text-lg text-slate-900 dark:text-white">Review Answers</Text>
          </View>
          
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {reviewList.map((r, idx) => (
              <View key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl mb-4 border border-gray-100 dark:border-slate-800 shadow-sm">
                <View className="flex-row items-start justify-between mb-3">
                  <Text className="text-sm font-bold text-indigo-500">Question {idx + 1}</Text>
                  {r.isSkipped ? (
                    <View className="bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-md"><Text className="text-xs font-bold text-gray-500">Skipped</Text></View>
                  ) : r.isCorrect ? (
                    <View className="bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-md"><Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Correct</Text></View>
                  ) : (
                    <View className="bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-md"><Text className="text-xs font-bold text-rose-600 dark:text-rose-400">Incorrect</Text></View>
                  )}
                </View>
                
                <Text className="text-base text-slate-800 dark:text-slate-200 mb-4">{r.q.question}</Text>
                
                <View className="space-y-2 mb-4">
                  {!r.isSkipped && !r.isCorrect && (
                    <View className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                      <Text className="text-xs text-rose-500 font-bold mb-1 uppercase tracking-wider">Your Answer</Text>
                      <Text className="text-rose-900 dark:text-rose-200">{r.selected}</Text>
                    </View>
                  )}
                  <View className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <Text className="text-xs text-emerald-600 font-bold mb-1 uppercase tracking-wider">Correct Answer</Text>
                    <Text className="text-emerald-900 dark:text-emerald-200">{r.q.correctAnswer}</Text>
                  </View>
                </View>

                {r.q.explanation && (
                  <View className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
                    <Text className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Explanation</Text>
                    <Text className="text-sm text-indigo-900 dark:text-indigo-200">{r.q.explanation}</Text>
                  </View>
                )}
              </View>
            ))}
            <View className="h-10" />
          </ScrollView>
        </View>
      </View>
    );
  }

  return null;
}
