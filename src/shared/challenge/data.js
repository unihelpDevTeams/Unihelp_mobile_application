export const CHALLENGE_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
export const CHALLENGE_CATEGORIES = [
  {
    id: 'daily',
    title: 'Daily Challenge',
    subtitle: 'New questions every day',
    icon: 'calendar-outline',
    tone: '#6366F1',
    difficulty: 'Mixed',
    questionCount: 1000,
  },
  {
    id: 'weekly',
    title: 'Weekly Quiz',
    subtitle: 'Test your weekly knowledge',
    icon: 'trophy-outline',
    tone: '#F97316',
    difficulty: 'Mixed',
    questionCount: 500,
  },
  {
    id: 'department',
    title: 'Department',
    subtitle: 'Your course materials',
    icon: 'library-outline',
    tone: '#10B981',
    difficulty: 'Mixed',
    questionCount: 1500,
  },
  {
    id: 'level',
    title: 'Level',
    subtitle: 'Your academic level',
    icon: 'layers-outline',
    tone: '#9333EA',
    difficulty: 'Mixed',
    questionCount: 1200,
  },
  {
    id: 'faculty',
    title: 'Faculty',
    subtitle: 'Cross-department knowledge',
    icon: 'business-outline',
    tone: '#EC4899',
    difficulty: 'Mixed',
    questionCount: 800,
  },
  {
    id: 'speed-quiz',
    title: 'Speed Quiz',
    subtitle: 'Answer fast, score big',
    icon: 'timer-outline',
    tone: '#EF4444',
    difficulty: 'Mixed',
    questionCount: 600,
  },
  {
    id: 'aptitude',
    title: 'Aptitude',
    subtitle: 'Logic & reasoning',
    icon: 'bulb-outline',
    tone: '#14B8A6',
    difficulty: 'Mixed',
    questionCount: 700,
  },
  {
    id: 'general-knowledge',
    title: 'General Knowledge',
    subtitle: 'Current affairs & GK',
    icon: 'globe-outline',
    tone: '#F59E0B',
    difficulty: 'Mixed',
    questionCount: 900,
  },
];

export const getRecommendedCategories = (profile = {}) => {
  const priority = ['daily', 'department', 'level', 'faculty', 'weekly', 'speed-quiz', 'aptitude', 'general-knowledge'];
  return priority.map((id) => CHALLENGE_CATEGORIES.find((c) => c.id === id)).filter(Boolean);
};

export const CHALLENGE_ACHIEVEMENTS = [
  { id: 'first-challenge', title: 'First Challenge', icon: 'flag-outline', target: 1, metric: 'attempts' },
  { id: 'seven-day-streak', title: '7 Day Streak', icon: 'flame-outline', target: 7, metric: 'currentStreak' },
  { id: 'thirty-day-streak', title: '30 Day Streak', icon: 'bonfire-outline', target: 30, metric: 'currentStreak' },
  { id: 'hundred-questions', title: '100 Questions', icon: 'checkmark-done-outline', target: 100, metric: 'questionsAnswered' },
  { id: 'five-hundred-questions', title: '500 Questions', icon: 'layers-outline', target: 500, metric: 'questionsAnswered' },
  { id: 'thousand-questions', title: '1,000 Questions', icon: 'trophy-outline', target: 1000, metric: 'questionsAnswered' },
  { id: 'daily-dedicated', title: 'Daily Dedicated', icon: 'flame-outline', target: 30, metric: 'dailyCorrect' },
  { id: 'department-expert', title: 'Department Expert', icon: 'library-outline', target: 50, metric: 'departmentCorrect' },
  { id: 'aptitude-ace', title: 'Aptitude Ace', icon: 'bulb-outline', target: 30, metric: 'aptitudeCorrect' },
  { id: 'speed-demon', title: 'Speed Demon', icon: 'timer-outline', target: 20, metric: 'speed-quizCorrect' },
  { id: 'weekly-warrior', title: 'Weekly Warrior', icon: 'trophy-outline', target: 10, metric: 'weeklyCorrect' },
  { id: 'top-performer', title: 'Top Performer', icon: 'trophy-outline', target: 5000, metric: 'xp' },
  { id: 'early-bird', title: 'Early Bird', icon: 'sunny-outline', target: 3, metric: 'earlySessions' },
  { id: 'night-owl', title: 'Night Owl', icon: 'moon-outline', target: 3, metric: 'nightSessions' },
  { id: 'perfect-score', title: 'Perfect Score', icon: 'star-outline', target: 1, metric: 'perfectScores' },
];

export const getTodayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const getRankForXp = (xp = 0) => {
  if (xp >= 20000) return 'Legend';
  if (xp >= 12000) return 'Diamond';
  if (xp >= 7000) return 'Platinum';
  if (xp >= 3500) return 'Gold';
  if (xp >= 1200) return 'Silver';
  return 'Bronze';
};

export const calculateChallengeScore = ({ answers = [], durationSeconds = 0, totalQuestions = 1 }) => {
  const correct = answers.filter((item) => item.isCorrect).length;
  const wrong = answers.filter((item) => item.selectedIndex !== null && !item.isCorrect).length;
  const skipped = answers.filter((item) => item.selectedIndex === null).length;
  const accuracy = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
  const difficultyBonus = answers.reduce((sum, item) => {
    if (!item.isCorrect) return sum;
    if (item.difficulty === 'Hard') return sum + 8;
    if (item.difficulty === 'Medium') return sum + 5;
    return sum + 3;
  }, 0);
  const speedBonus = Math.max(0, 60 - Math.round(durationSeconds / Math.max(totalQuestions, 1)));
  const xpEarned = correct * 12 + difficultyBonus + Math.round(speedBonus / 2);
  const pointsEarned = correct * 100 + difficultyBonus * 5 + speedBonus;
  const isPerfect = correct === totalQuestions;

  return { correct, wrong, skipped, accuracy, xpEarned, pointsEarned, isPerfect };
};

export const buildCalendarDays = (daysBack = 120, activeDates = []) => {
  const activeSet = new Set(activeDates);
  return Array.from({ length: daysBack }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (daysBack - index - 1));
    const key = getTodayKey(date);
    return { key, day: date.getDate(), month: date.getMonth(), active: activeSet.has(key), isToday: key === getTodayKey() };
  });
};
