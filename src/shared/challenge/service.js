import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../../firebase/config';
import { CHALLENGE_ACHIEVEMENTS, FALLBACK_QUESTIONS, calculateChallengeScore, getRankForXp, getTodayKey } from './data';

const COLLECTION = 'challenges';
const USERS_COLLECTION = 'challengeUsers';
const QUESTIONS_COLLECTION = 'challengeQuestions';
const ATTEMPTS_COLLECTION = 'attempts';

const mapDocs = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

const asDateKey = (value) => {
  if (!value) return '';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return getTodayKey(date);
};

const defaultStats = (profile = {}) => ({
  uid: auth.currentUser?.uid || profile.uid || '',
  name: profile.username || auth.currentUser?.displayName || 'Student',
  university: profile.school || '',
  department: profile.department || '',
  avatar: profile.photo || auth.currentUser?.photoURL || '',
  xp: 0,
  totalPoints: 0,
  rank: 'Bronze',
  currentStreak: 0,
  longestStreak: 0,
  weeklyStreak: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  attempts: 0,
  averageScore: 0,
  accuracy: 0,
  completionRate: 0,
  streakDates: [],
  activity: [],
  categoryStats: {},
  earlySessions: 0,
  nightSessions: 0,
  updatedAt: null,
});

export async function fetchChallengeStats(profile = {}) {
  if (!auth.currentUser?.uid) return defaultStats(profile);
  const snap = await getDoc(doc(db, USERS_COLLECTION, auth.currentUser.uid));
  return snap.exists() ? { ...defaultStats(profile), ...snap.data(), uid: auth.currentUser.uid } : defaultStats(profile);
}

/**
 * Filter fallback questions based on user profile (department, level, faculty, role).
 * Ensures university students get relevant department/level/faculty challenges.
 */
function filterFallbackByProfile(questions, category, profile = {}) {
  const userLevel = profile?.level?.toLowerCase().replace('l', '') || '';
  const userDept = (profile?.department || '').trim().toLowerCase();
  const userFaculty = (profile?.faculty || '').trim().toLowerCase();
  let pool = category
    ? questions.filter((item) => item.category === category)
    : [...questions];

  // For department category, filter by user's department
  if (category === 'department' && userDept) {
    pool = pool.filter((q) => {
      const qDept = (q.department || q.subject || '').toLowerCase();
      return !qDept || qDept.includes(userDept) || userDept.includes(qDept);
    });
  }

  // For level category, filter by user's academic level
  if (category === 'level' && userLevel) {
    pool = pool.filter((q) => {
      const qLevel = (q.level || '').toLowerCase().replace('l', '');
      return !qLevel || qLevel === userLevel;
    });
  }

  // For faculty category, filter by user's faculty
  if (category === 'faculty' && userFaculty) {
    pool = pool.filter((q) => {
      const qFac = (q.faculty || '').toLowerCase();
      return !qFac || qFac.includes(userFaculty) || userFaculty.includes(qFac);
    });
  }

  // For speed quiz, prefer easier questions
  if (category === 'speed-quiz') {
    pool = pool.filter((q) => q.difficulty !== 'Hard');
  }

  return pool;
}

export async function fetchChallengeQuestions({ category, count = 8, profile = {} } = {}) {
  try {
    const userLevel = profile?.level?.toLowerCase().replace('l', '') || '';
    const userDept = (profile?.department || '').trim().toLowerCase();
    let constraints = [limit(count * 2 + 10)];
    if (category && !['daily', 'random', 'speed-quiz'].includes(category)) {
      constraints.unshift(where('category', '==', category));
    }

    const snap = await getDocs(query(collection(db, QUESTIONS_COLLECTION), ...constraints));
    let remoteQuestions = mapDocs(snap).filter(
      (item) => Array.isArray(item.answers) && item.answers.length >= 2,
    );

    // Filter remote questions by user's department
    if (category === 'department' && userDept) {
      remoteQuestions = remoteQuestions.filter((q) => {
        const qDept = (q.department || q.departmentId || q.subject || '').toLowerCase();
        return !qDept || qDept === userDept || qDept.includes(userDept) || userDept.includes(qDept);
      });
    }

    // Filter remote questions by user's level
    if (category === 'level' && userLevel) {
      remoteQuestions = remoteQuestions.filter((q) => {
        const qLevel = (q.level || '').toLowerCase().replace('l', '');
        return !qLevel || qLevel === userLevel;
      });
    }

    // Filter remote questions by user's faculty
    if (category === 'faculty') {
      const userFaculty = (profile?.faculty || '').trim().toLowerCase();
      if (userFaculty) {
        remoteQuestions = remoteQuestions.filter((q) => {
          const qFac = (q.faculty || '').toLowerCase();
          return !qFac || qFac.includes(userFaculty) || userFaculty.includes(qFac);
        });
      }
    }

    // For speed quiz, prefer easier questions
    if (category === 'speed-quiz') {
      remoteQuestions = remoteQuestions.filter(
        (q) => q.difficulty !== 'Hard' || (q.answers && q.answers.length <= 4),
      );
    }

    if (remoteQuestions.length) {
      return [...remoteQuestions].sort(() => Math.random() - 0.5).slice(0, count);
    }
  } catch (err) {
    console.warn('Failed to fetch challenge questions from Firestore:', err?.message);
  }

  // Fallback to filtered local questions based on user's profile
  const filteredPool = filterFallbackByProfile(FALLBACK_QUESTIONS, category, profile);
  return [...filteredPool].sort(() => Math.random() - 0.5).slice(0, count);
}

export async function fetchChallengeHistory({ category, sort = 'recent', limitCount = 40 } = {}) {
  if (!auth.currentUser?.uid) return [];
  try {
    const sortField = sort === 'score' ? 'score' : sort === 'accuracy' ? 'accuracy' : 'createdAt';
    const snap = await getDocs(
      query(
        collection(db, USERS_COLLECTION, auth.currentUser.uid, ATTEMPTS_COLLECTION),
        orderBy(sortField, 'desc'),
        limit(limitCount)
      )
    );
    return mapDocs(snap).filter((item) => !category || item.category === category);
  } catch {
    return [];
  }
}

export async function fetchChallengeLeaderboard({ scope = 'global', profile = {} } = {}) {
  try {
    const snap = await getDocs(query(collection(db, USERS_COLLECTION), orderBy('xp', 'desc'), limit(50)));
    const rows = mapDocs(snap)
      .filter((item) => {
        if (scope === 'university') return item.university && item.university === profile.school;
        if (scope === 'department') return item.department && item.department === profile.department;
        if (scope === 'friends') return item.friendIds?.includes?.(auth.currentUser?.uid) || item.uid === auth.currentUser?.uid;
        return true;
      })
      .map((item, index) => ({ ...item, position: index + 1 }));
    return rows;
  } catch {
    return [];
  }
}

export async function fetchChallengeDashboard(profile = {}) {
  const [stats, history, leaderboard] = await Promise.all([
    fetchChallengeStats(profile),
    fetchChallengeHistory({ limitCount: 5 }),
    fetchChallengeLeaderboard({ profile }),
  ]);
  const currentUserRank = leaderboard.findIndex((item) => item.uid === auth.currentUser?.uid);
  return {
    stats: { ...stats, leaderboardPosition: currentUserRank >= 0 ? currentUserRank + 1 : null },
    history,
    leaderboard,
  };
}

const calculateNextStreak = (streakDates = [], currentStreak = 0, longestStreak = 0) => {
  const todayKey = getTodayKey();
  const yesterdayKey = getTodayKey(new Date(Date.now() - 86400000));
  const uniqueDates = [...new Set(streakDates)];

  if (uniqueDates.includes(todayKey)) {
    return { streakDates: uniqueDates, currentStreak, longestStreak, streakUpdated: false };
  }

  const nextCurrent = uniqueDates.includes(yesterdayKey) ? currentStreak + 1 : 1;
  const nextDates = [...uniqueDates, todayKey].slice(-180);
  return {
    streakDates: nextDates,
    currentStreak: nextCurrent,
    longestStreak: Math.max(longestStreak || 0, nextCurrent),
    streakUpdated: true,
  };
};

const getTimeSessionBucket = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 9) return 'earlySessions';
  if (hour >= 21 || hour <= 3) return 'nightSessions';
  return null;
};

export async function saveChallengeAttempt({ profile = {}, category = 'daily', questions = [], answers = [], durationSeconds = 0 }) {
  if (!auth.currentUser?.uid) throw new Error('No authenticated user');

  const previous = await fetchChallengeStats(profile);
  const score = calculateChallengeScore({ answers, durationSeconds, totalQuestions: questions.length });
  const previousRank = previous.rank || getRankForXp(previous.xp || 0);
  const nextXp = (previous.xp || 0) + score.xpEarned;
  const nextRank = getRankForXp(nextXp);
  const nextStreak = calculateNextStreak(previous.streakDates || [], previous.currentStreak || 0, previous.longestStreak || 0);
  const sessionMetric = getTimeSessionBucket();
  const categoryKey = category || questions[0]?.category || 'daily';
  const existingCategory = previous.categoryStats?.[categoryKey] || {};
  const totalAttempts = (previous.attempts || 0) + 1;
  const totalQuestions = (previous.questionsAnswered || 0) + questions.length;
  const totalCorrect = (previous.correctAnswers || 0) + score.correct;
  const averageScore = Math.round((((previous.averageScore || 0) * (previous.attempts || 0)) + score.accuracy) / totalAttempts);

  const attempt = {
    category: categoryKey,
    score: score.correct,
    totalQuestions: questions.length,
    accuracy: score.accuracy,
    durationSeconds,
    xpEarned: score.xpEarned,
    pointsEarned: score.pointsEarned,
    status: score.accuracy >= 70 ? 'Passed' : score.accuracy >= 40 ? 'Completed' : 'Practice',
    answers,
    createdAt: serverTimestamp(),
    dateKey: getTodayKey(),
  };

  const statsUpdate = {
    ...previous,
    uid: auth.currentUser.uid,
    name: profile.username || previous.name || auth.currentUser.displayName || 'Student',
    university: profile.school || previous.university || '',
    department: profile.department || previous.department || '',
    avatar: profile.photo || previous.avatar || auth.currentUser.photoURL || '',
    xp: nextXp,
    totalPoints: (previous.totalPoints || 0) + score.pointsEarned,
    rank: nextRank,
    currentStreak: nextStreak.currentStreak,
    longestStreak: nextStreak.longestStreak,
    streakDates: nextStreak.streakDates,
    questionsAnswered: totalQuestions,
    correctAnswers: totalCorrect,
    wrongAnswers: (previous.wrongAnswers || 0) + score.wrong,
    attempts: totalAttempts,
    averageScore,
    accuracy: totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    completionRate: totalQuestions ? Math.round(((totalQuestions - score.skipped) / totalQuestions) * 100) : 0,
    categoryStats: {
      ...(previous.categoryStats || {}),
      [categoryKey]: {
        attempted: (existingCategory.attempted || 0) + questions.length,
        correct: (existingCategory.correct || 0) + score.correct,
      },
    },
    activity: [
      { type: 'challenge_completed', category: categoryKey, accuracy: score.accuracy, dateKey: getTodayKey() },
      ...(previous.activity || []),
    ].slice(0, 12),
    ...(sessionMetric ? { [sessionMetric]: (previous[sessionMetric] || 0) + 1 } : {}),
    ...(score.isPerfect ? { perfectScores: (previous.perfectScores || 0) + 1 } : {}),
    weeklyResetKey: getWeekKey(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, USERS_COLLECTION, auth.currentUser.uid), statsUpdate, { merge: true });
  const attemptRef = await addDoc(collection(db, USERS_COLLECTION, auth.currentUser.uid, ATTEMPTS_COLLECTION), attempt);
  await setDoc(doc(db, COLLECTION, 'latestAttempts', 'items', attemptRef.id), {
    ...attempt,
    uid: auth.currentUser.uid,
    name: statsUpdate.name,
    university: statsUpdate.university,
    department: statsUpdate.department,
  });

  return {
    id: attemptRef.id,
    ...attempt,
    ...score,
    previousRank,
    nextRank,
    rankChanged: previousRank !== nextRank,
    streakUpdated: nextStreak.streakUpdated,
    stats: statsUpdate,
  };
}

export function getChallengeAchievements(stats = {}) {
  return CHALLENGE_ACHIEVEMENTS.map((item) => {
    let value = 0;
    const catMatch = item.metric?.match(/^(.+?)Correct$/);
    if (catMatch) {
      value = stats.categoryStats?.[catMatch[1]]?.correct || 0;
    } else if (item.metric === 'perfectScores') {
      value = stats.perfectScores || 0;
    } else {
      value = stats[item.metric] || 0;
    }
    const progress = Math.min(1, value / item.target);
    return { ...item, value, progress, unlocked: progress >= 1 };
  });
}

export function normalizeAttemptDate(item) {
  return asDateKey(item.createdAt) || item.dateKey || '';
}

function getWeekKey(date = new Date()) {
  const first = new Date(date.getFullYear(), 0, 1);
  const dayNumber = Math.floor((date - first) / 86400000);
  return `${date.getFullYear()}-${Math.ceil((dayNumber + first.getDay() + 1) / 7)}`;
}
