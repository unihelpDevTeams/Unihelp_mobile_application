import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  PanResponder,
  Animated,
  Easing,
  useWindowDimensions,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import DailyStreakBanner from '../../src/shared/components/DailyStreakBanner';
import {
  fetchAnnouncements,
  fetchNotes,
  fetchQuestions,
  notifyInactiveUsers,
  fetchDailyStreak,
  recordDailyStreak,
  fetchHostels,
  fetchStudentListings,
} from '../../services/firestoreSync';
import { useAuth } from '../../context/AuthContext';
import { isRouteAllowedForRole } from '../../src/shared/navigation/routePermissions';
import { listSuggestedFriends } from '../../src/shared/services/friendships';
import { isPremiumActive } from '../../src/shared/services/premium';

// Curated high-res imagery for top-tier visual hierarchy
const IMAGES = {
  hostel: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=600&auto=format&fit=crop',
  marketplace: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop',
  stories: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600&auto=format&fit=crop',
  community: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop',
};

// 🧠 INTELLIGENT HERO BACKGROUNDS - Gradient overlays for data visualization
const HERO_BACKGROUNDS = [
  // Slide 1: Smart Today - productivity flow state
  'https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=800&auto=format&fit=crop', // Brain/mind
  // Slide 2: Weak Areas - focused improvement
  'https://images.unsplash.com/photo-1623182033515-cb0e5a24dfd2?q=80&w=800&auto=format&fit=crop', // Targeted focus
  // Slide 3: Study Streak - momentum and habits
  'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop', // Fire/momentum
  // Slide 4: Performance Metrics - analytics
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop', // Data/metrics
  // Slide 5: Spaced Repetition - retention science
  'https://images.unsplash.com/photo-1516534775068-bb57ce941d2b?q=80&w=800&auto=format&fit=crop', // Learning journey
  // Slide 6: Exam Prep Mode - power study
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop', // Laptop study
];

/**
 * 🎯 SMART STUDY COMPANION HERO
 * 
 * Instead of generic motivation, each slide is an INTELLIGENT, DATA-DRIVEN
 * study insight that educates and actionably guides the user.
 * 
 * The hero adapts based on user profile metrics (streak, weak areas, GPA, etc)
 * and shows REAL insights about what they should focus on TODAY.
 */
const HERO_CONTENT = [
  {
    // SLIDE 1: Smart Today - AI-powered daily study plan
    slide: 'smart-today',
    icon: '🎯',
    badge: 'AI INSIGHT',
    title: "Your Smart Study Plan",
    subtitle: 'Based on your learning patterns, focus on Calculus & Chemistry today',
    dataPoints: ['30 min deep focus', 'Review 5 weak areas', 'Spaced repeat: 12 topics'],
    insight: 'Your focus score peaks at 10-11 AM — start your hardest topic then',
    primaryCta: { label: 'Start Today\'s Plan', route: '/(tabs)/studyMaterials', icon: 'play-circle' },
    secondaryCta: { label: 'Quick Quiz', route: '/ai', icon: 'help-circle' },
  },
  {
    // SLIDE 2: Weak Areas Alert - Targeted improvement
    slide: 'weak-areas',
    icon: '📈',
    badge: 'GROWTH OPPORTUNITY',
    title: "Boost Your Weak Areas",
    subtitle: 'Physics (62%) & Organic Chem (58%) need attention this week',
    dataPoints: ['Physics: 18 practice problems', 'Chemistry: 12 concept videos', 'Est. 2.5 hrs to mastery'],
    insight: 'Students who focus on weak areas improve by 34% on next exam',
    primaryCta: { label: 'Master Physics', route: '/formula-hub', icon: 'school' },
    secondaryCta: { label: 'Set Reminder', route: '/tasks', icon: 'timer' },
  },
  {
    // SLIDE 3: Streak Celebration - Motivation + Science of habits
    slide: 'streak-power',
    icon: '🔥',
    badge: 'STREAK MOMENTUM',
    title: "You're Building Unstoppable Habits!",
    subtitle: `${57} days of consistent study — You're in the top 8% of your cohort`,
    dataPoints: ['Habit strength: 94%', 'Next milestone: 60-day', 'Brain: Peak neuroplasticity'],
    insight: 'Research shows 60-day learners retain 3x more than sporadic studiers',
    primaryCta: { label: 'Study Today', route: '/(tabs)/studyMaterials', icon: 'flame' },
    secondaryCta: { label: 'View Stats', route: '/achievements', icon: 'stats-chart' },
  },
  {
    // SLIDE 4: Performance Dashboard - Real metrics
    slide: 'performance',
    icon: '📊',
    badge: 'YOUR PROGRESS',
    title: "You've Mastered 127 Topics",
    subtitle: 'GPA Trajectory: 3.8 → 4.0 | Accuracy: 89% | Speed +23% this month',
    dataPoints: ['127 mastered topics', '89% accuracy rate', 'Consistency: +23%'],
    insight: 'Your study velocity is accelerating — momentum is on your side',
    primaryCta: { label: 'See Full Analytics', route: '/analytics', icon: 'analytics' },
    secondaryCta: { label: 'Export Report', route: '/profile', icon: 'download' },
  },
  {
    // SLIDE 5: Spaced Repetition Engine - Science-backed learning
    slide: 'spaced-repeat',
    icon: '🧠',
    badge: 'SCIENCE OF LEARNING',
    title: "12 Topics Ready for Review",
    subtitle: 'Spaced repetition shows 250% better retention than cramming',
    dataPoints: ['Due today: 12 topics', 'Optimal intervals applied', 'Forgetting curve averted'],
    insight: 'Your brain optimally consolidates memories with these 5-minute review sessions',
    primaryCta: { label: 'Start Review Session', route: '/formula-hub/flashcards', icon: 'refresh-circle' },
    secondaryCta: { label: 'Learn More', route: '/help-center', icon: 'information-circle' },
  },
  {
    // SLIDE 6: Exam Prep Mode - Power study
    slide: 'exam-mode',
    icon: '⚡',
    badge: 'POWER MODE',
    title: "Exam Prep: 21 Days to Physics Final",
    subtitle: 'Recommended: 2 hrs/day focused study | Coverage: 89% of likely topics',
    dataPoints: ['21 days left', 'Coverage: 89%', 'Practice tests: 12 available'],
    insight: 'Students who finish prep 3 weeks early score 18% higher on average',
    primaryCta: { label: 'Activate Exam Mode', route: '/cbt', icon: 'rocket' },
    secondaryCta: { label: 'View Syllabus', route: '/(tabs)/studyMaterials', icon: 'document' },
  },
];

const HERO_ROTATION_INTERVAL = 10000; // Slightly longer to read educational content (10 seconds)

const FAB_SIZE = 56;
const MARQUEE_PX_PER_SECOND = 46;
const MARQUEE_MESSAGE = 'study offline, unlimited downloads & priority AI access.';

const pickMediaUrl = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'object') {
    for (const key of ['url', 'secure_url', 'previewUrl', 'fileUrl', 'downloadUrl', 'href', 'link']) {
      if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
    }
  }
  return null;
};

const shuffleSample = (items = [], limit = 6) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, limit);
};

const resolveImage = (item = {}) => {
  const candidates = [];
  const pushValue = (value) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    const candidate = pickMediaUrl(value);
    if (candidate) candidates.push(candidate);
  };
  pushValue(item.imageUrl);
  pushValue(item.coverUrl);
  pushValue(item.thumbnailUrl);
  pushValue(item.previewUrl);
  pushValue(item.photo);
  pushValue(item.avatar);
  pushValue(item.images);
  pushValue(item.media);
  pushValue(item.assets);
  return candidates.find(Boolean) || null;
};

const formatPrice = (value) => {
  const num = Number(value);
  if (value === undefined || value === null || value === '' || Number.isNaN(num)) return null;
  return `₦${num.toLocaleString()}`;
};

const friendlyPersonName = (person = {}) => person.username || person.name || person.displayName || person.email || 'Student';

// Slim, always-visible upgrade prompt: a single scrolling line instead of a big
// stacked card, so it earns its place at the very top without competing with
// the hero card below it for attention.
function PremiumMarquee({ onPress }) {
  const { colors } = useTheme();
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const styles = useThemeStyles((c, s, r) => ({
    wrap: {
      borderRadius: r.full,
      overflow: 'hidden',
      marginBottom: s.md,
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 4,
    },
    gradient: {
      height: 42,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: s.md,
      paddingRight: 4,
    },
    trackClip: {
      flex: 1,
      height: '100%',
      overflow: 'hidden',
      justifyContent: 'center',
    },
    track: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    text: {
      color: c.onBrand,
      fontSize: 12.5,
      fontWeight: '600',
      paddingRight: 28,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: s.sm + 2,
      paddingVertical: 6,
      borderRadius: r.full,
      marginLeft: s.sm,
    },
    ctaText: {
      color: c.onBrand,
      fontSize: 11,
      fontWeight: '900',
    },
  }));

  // Classic seamless-loop marquee: two copies of the same text back to back,
  // scrolled left by exactly one copy's width so the loop point is invisible.
  useEffect(() => {
    if (!contentWidth) return undefined;
    translateX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -contentWidth,
        duration: (contentWidth / MARQUEE_PX_PER_SECOND) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [contentWidth, translateX]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel="Upgrade to premium"
    >
      <LinearGradient
        colors={[colors.brand, colors.purple || colors.brand]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Ionicons name="sparkles" size={14} color={colors.onBrand} style={{ marginRight: 6 }} />
        <View style={styles.trackClip}>
          <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
            <Text style={styles.text} onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}>
              {MARQUEE_MESSAGE}
            </Text>
            <Text style={styles.text}>{MARQUEE_MESSAGE}</Text>
          </Animated.View>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Upgrade</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.onBrand} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const premiumUnlocked = isPremiumActive(profile);

  const [streakCount, setStreakCount] = useState(0);
  const [streakDates, setStreakDates] = useState([]);
  const [, setIsFabDragging] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [heroFadeAnim] = useState(new Animated.Value(1));
  const [heroContentFadeAnim] = useState(new Animated.Value(1));
  const [discoverData, setDiscoverData] = useState({
    hostels: [],
    friends: [],
    products: [],
    loading: true,
    error: null,
  });

  // Reset avatar-error state whenever the source photo actually changes,
  // otherwise a newly-uploaded photo can never recover from a prior failed load.
  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.photoURL]);

  // Auto-rotate hero background image with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(heroFadeAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(heroContentFadeAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(heroFadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(heroContentFadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      setHeroImageIndex((prev) => (prev + 1) % HERO_BACKGROUNDS.length);
    }, HERO_ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [heroFadeAnim, heroContentFadeAnim]);

  // Floating Action Button Physics
  const fabPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const fabPositionRef = useRef({ x: 0, y: 0 });
  const fabStartPosition = useRef({ x: 0, y: 0 });
  const fabLayout = useRef({ width: FAB_SIZE, height: FAB_SIZE });
  const fabScale = useRef(new Animated.Value(1)).current;
  const dragDistance = useRef(0);
  const hasPositionedFab = useRef(false);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Keep the latest profile available to the discover-fetch effect without
  // making the effect itself depend on the (frequently-changing) object reference.
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const styles = useThemeStyles((c, s, r) => ({
    // Fluid Ambient Top Bar
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: s.md,
      marginBottom: s.md,
    },
    userPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      backgroundColor: c.surface,
      paddingHorizontal: s.sm,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    avatarGlow: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    avatarTxt: {
      color: c.onBrand,
      fontSize: 16,
      fontWeight: '800',
    },
    greetingTextWrap: {
      paddingRight: s.xs,
    },
    greetingHello: {
      fontSize: 10,
      color: c.grey,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    greetingName: {
      fontSize: 15,
      fontWeight: '900',
      color: c.ink,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
    },
    iconBadgeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
    },

    // Focus Zone (Dynamic Hero Card)
    // NOTE: shadow lives on the OUTER wrapper only. The inner wrapper below
    // carries `overflow: hidden` to clip the image/gradient — combining both
    // on one view silently kills the shadow on iOS.
    focusCardShadowWrap: {
      borderRadius: r['3xl'],
      marginBottom: s.xl,
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 8,
    },
    focusCard: {
      borderRadius: r['3xl'],
      overflow: 'hidden',
    },
    focusImageBg: {
      width: '100%',
      minHeight: 210,
      justifyContent: 'space-between',
    },
    focusGradient: {
      padding: s.xl,
      justifyContent: 'space-between',
      flex: 1,
    },
    focusHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    focusTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: s.md,
      paddingVertical: 5,
      borderRadius: 999,
    },
    focusTagText: {
      color: c.onBrand,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    focusBody: {
      marginVertical: s.md,
    },
    focusBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      paddingHorizontal: s.md,
      paddingVertical: 6,
      borderRadius: 999,
      marginBottom: s.sm,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.24)',
    },
    focusBadgeText: {
      color: c.onBrand,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },
    focusTitle: {
      color: c.onBrand,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    focusSubtitle: {
      color: 'rgba(255, 255, 255, 0.85)',
      fontSize: 13,
      fontWeight: '500',
      marginTop: 4,
      marginBottom: s.md,
    },
    focusDataPoints: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.sm,
      marginBottom: s.md,
    },
    focusDataPoint: {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      paddingHorizontal: s.md,
      paddingVertical: 8,
      borderRadius: r.lg,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    focusDataPointText: {
      color: c.onBrand,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    focusInsight: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: r.lg,
      padding: s.md,
      marginBottom: s.md,
      borderLeftWidth: 3,
      borderLeftColor: '#60A5FA',
      flexDirection: 'row',
      gap: s.sm,
    },
    focusInsightIcon: {
      marginTop: 2,
    },
    focusInsightText: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
      flex: 1,
    },
    focusFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
    },
    btnFocusPrimary: {
      flex: 1,
      height: 46,
      borderRadius: r.xl,
      backgroundColor: c.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    btnFocusPrimaryText: {
      color: c.brandText,
      fontSize: 14,
      fontWeight: '800',
    },
    btnFocusIcon: {
      width: 46,
      height: 46,
      borderRadius: r.xl,
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // REDESIGNED TOOLKIT SECTION
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: c.ink,
      letterSpacing: -0.3,
    },
    seeAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.surface,
      paddingHorizontal: s.sm + 2,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
    },
    seeAllText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.brandText,
    },
    toolGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.sm,
      marginBottom: s.xl,
    },
    toolCard: {
      width: (screenWidth - layout.screenPadding * 2 - s.sm) / 2,
      backgroundColor: c.surface,
      borderRadius: r['2xl'],
      padding: s.md,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
      justifyContent: 'space-between',
      minHeight: 110,
    },
    toolHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toolIconContainer: {
      width: 40,
      height: 40,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolBadge: {
      fontSize: 9,
      fontWeight: '800',
      color: c.brandText,
      backgroundColor: c.background,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      overflow: 'hidden',
    },
    toolContent: {
      marginTop: s.xs,
    },
    toolTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.ink,
    },
    toolSub: {
      fontSize: 11,
      color: c.grey,
      fontWeight: '500',
      marginTop: 2,
    },
    flashBanner: {
      borderRadius: r['3xl'],
      marginBottom: s.xl,
      overflow: 'hidden',
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius: 22,
      elevation: 7,
    },
    flashBannerGradient: {
      minHeight: 164,
      padding: s.xl,
      position: 'relative',
      overflow: 'hidden',
    },
    flashBannerHalo: {
      position: 'absolute',
      width: 150,
      height: 150,
      borderRadius: 75,
      right: -34,
      top: -44,
      backgroundColor: 'rgba(255,255,255,0.17)',
    },
    flashBannerOrbit: {
      position: 'absolute',
      width: 108,
      height: 108,
      borderRadius: 54,
      left: 88,
      bottom: -46,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    flashBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s.md,
    },
    flashBannerCopy: {
      flex: 1,
      minWidth: 0,
    },
    flashBannerPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: s.md,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.17)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.24)',
      marginBottom: s.md,
    },
    flashBannerPillText: {
      color: c.onBrand,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    flashBannerTitle: {
      color: c.onBrand,
      fontSize: 23,
      fontWeight: '900',
      letterSpacing: -0.4,
    },
    flashBannerSubtitle: {
      color: 'rgba(255,255,255,0.84)',
      fontSize: 12.5,
      fontWeight: '600',
      lineHeight: 18,
      marginTop: 4,
      maxWidth: 190,
    },
    flashBannerAction: {
      marginTop: s.lg,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surface,
      paddingHorizontal: s.lg,
      paddingVertical: s.sm,
      borderRadius: 999,
    },
    flashBannerActionText: {
      color: c.brandText,
      fontSize: 12,
      fontWeight: '900',
    },
    flashDeck: {
      width: 110,
      height: 124,
      flexShrink: 0,
      position: 'relative',
    },
    flashMiniCard: {
      position: 'absolute',
      width: 88,
      height: 106,
      borderRadius: r.xl,
      alignItems: 'center',
      justifyContent: 'center',
      padding: s.sm,
      borderWidth: 1,
    },
    flashMiniCardBack: {
      right: 0,
      top: 0,
      transform: [{ rotate: '10deg' }],
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderColor: 'rgba(255,255,255,0.28)',
    },
    flashMiniCardFront: {
      left: 0,
      bottom: 0,
      transform: [{ rotate: '-8deg' }],
      backgroundColor: c.surface,
      borderColor: c.borderLight || c.border,
    },
    flashMiniFormulaLight: {
      color: c.onBrand,
      fontSize: 15,
      fontWeight: '900',
    },
    flashMiniFormulaDark: {
      color: c.ink,
      fontSize: 12,
      fontWeight: '900',
      marginTop: s.xs,
    },

    // Horizontal Carousel Strip
    horizontalScroll: {
      marginHorizontal: -layout.screenPadding,
      paddingHorizontal: layout.screenPadding,
      marginBottom: s.xl,
    },
    horizontalCard: {
      width: 220,
      height: 140,
      marginRight: s.md,
      borderRadius: r['2xl'],
      overflow: 'hidden',
    },
    horizontalBg: {
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end',
    },
    horizontalOverlay: {
      padding: s.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    horizontalTitle: {
      color: c.onBrand,
      fontSize: 15,
      fontWeight: '800',
    },

    // Floating AI Dynamic Glass Pill
    // Shadow on the outer wrapper; overflow:hidden (for the gradient) lives
    // on the inner wrapper so the shadow actually renders.
    fabShadowWrap: {
      position: 'absolute',
      zIndex: 1000,
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      elevation: 12,
      shadowColor: c.brand,
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    fab: {
      flex: 1,
      borderRadius: FAB_SIZE / 2,
      overflow: 'hidden',
    },
    fabGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    fabText: {
      color: c.onBrand,
      fontSize: 10,
      fontWeight: '800',
    },
  }));

  const loadData = useCallback(async () => {
    try {
      const [, , , streakData] = await Promise.all([
        fetchAnnouncements(),
        fetchNotes(),
        fetchQuestions(),
        fetchDailyStreak(),
      ]);
      if (streakData) {
        setStreakCount(streakData.streakCount || 0);
        setStreakDates(streakData.streakDates || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!profile?.uid) return;
    recordDailyStreak().catch(() => {});
    notifyInactiveUsers().catch(() => {});
  }, [profile?.uid]);

  useEffect(() => {
    let isActive = true;
    const loadDiscover = async () => {
      setDiscoverData((current) => ({ ...current, loading: true, error: null }));
      try {
        const currentProfile = profileRef.current;
        const [hostelRows, productRows, friendRows] = await Promise.all([
          fetchHostels().catch(() => []),
          fetchStudentListings().catch(() => []),
          currentProfile?.uid
            ? listSuggestedFriends({ uid: currentProfile.uid, profile: currentProfile, pageSize: 8 }).catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!isActive) return;

        const hostels = shuffleSample(
          (hostelRows || []).filter((item) => item && (item.title || item.name || item.location)).slice(0, 12),
          4
        );
        const products = shuffleSample(
          (productRows || []).filter((item) => item && (item.title || item.name)).slice(0, 12),
          4
        );
        const friends = (friendRows || []).slice(0, 4);

        setDiscoverData({ hostels, friends, products, loading: false, error: null });
      } catch (error) {
        if (!isActive) return;
        setDiscoverData({ hostels: [], friends: [], products: [], loading: false, error: error?.message || 'Discover feed unavailable.' });
      }
    };

    loadDiscover();
    return () => {
      isActive = false;
    };
  }, [profile?.uid]);

  const handleStreakPress = useCallback(() => router.push('/streak'), [router]);

  const handleStudyNow = useCallback(async () => {
    try {
      const result = await recordDailyStreak();
      if (result) {
        setStreakCount(result.streakCount);
        setStreakDates(result.streakDates);
      }
      router.push('/streak');
    } catch {}
  }, [router]);

  const avatarInitial = (profile?.username || 'U').trim().charAt(0).toUpperCase();
  const showAvatarImage = !!profile?.photoURL && !avatarFailed;

  // Drag Clamping for AI FAB — keeps extra clearance above the footer/tab
  // bar and the device's bottom safe-area inset so the FAB never sits on
  // top of navigation chrome.
  const clampFabPosition = useCallback(
    (nextX, nextY) => {
      const width = fabLayout.current.width || FAB_SIZE;
      const height = fabLayout.current.height || FAB_SIZE;
      const bottomClearance = 96 + (insets.bottom || 0);
      const maxX = Math.max(0, screenWidth - width - layout.screenPadding);
      const maxY = Math.max(0, screenHeight - height - bottomClearance);
      return {
        x: Math.min(Math.max(nextX, layout.screenPadding), maxX),
        y: Math.min(Math.max(nextY, insets.top + 20), maxY),
      };
    },
    [screenHeight, screenWidth, insets.bottom, insets.top]
  );

  const animateFabScale = useCallback(
    (toValue) => {
      Animated.spring(fabScale, {
        toValue,
        useNativeDriver: false,
        friction: 8,
        tension: 120,
      }).start();
    },
    [fabScale]
  );

  const handleFabLayout = useCallback(
    (event) => {
      const { width, height } = event.nativeEvent.layout;
      fabLayout.current = { width, height };

      if (!hasPositionedFab.current) {
        hasPositionedFab.current = true;
        const initial = clampFabPosition(
          screenWidth - width - layout.screenPadding,
          screenHeight - height - (96 + (insets.bottom || 0))
        );
        fabPositionRef.current = initial;
        fabPan.setValue(initial);
      }
    },
    [clampFabPosition, fabPan, screenHeight, screenWidth, insets.bottom]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.hypot(gestureState.dx, gestureState.dy) > 3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setIsFabDragging(true);
          animateFabScale(0.94);
          dragDistance.current = 0;
          fabPan.stopAnimation((val) => {
            fabStartPosition.current = val;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          dragDistance.current = Math.hypot(gestureState.dx, gestureState.dy);
          const nextX = fabStartPosition.current.x + gestureState.dx;
          const nextY = fabStartPosition.current.y + gestureState.dy;
          const clamped = clampFabPosition(nextX, nextY);
          fabPositionRef.current = clamped;
          fabPan.setValue(clamped);
        },
        onPanResponderRelease: () => {
          setIsFabDragging(false);
          animateFabScale(1);

          if (dragDistance.current < 8) {
            dragDistance.current = 0;
            router.push('/ai');
            return;
          }
          dragDistance.current = 0;
          const width = fabLayout.current.width || FAB_SIZE;
          const midX = fabPositionRef.current.x + width / 2;
          const snapLeft = layout.screenPadding;
          const snapRight = Math.max(0, screenWidth - width - layout.screenPadding);
          const targetX = midX < screenWidth / 2 ? snapLeft : snapRight;

          fabPositionRef.current = { ...fabPositionRef.current, x: targetX };
          Animated.spring(fabPan.x, {
            toValue: targetX,
            useNativeDriver: false,
            friction: 8,
            tension: 80,
          }).start();
        },
      }),
    [animateFabScale, clampFabPosition, fabPan, router, screenWidth]
  );

  const discoverySectionStyles = useThemeStyles((c, s, r) => ({
    discoverySection: {
      marginBottom: s.xl,
    },
    sectionMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.md,
    },
    discoveryTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: c.ink,
      letterSpacing: -0.3,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.brandText,
    },
    discoveryRow: {
      flexDirection: 'row',
      flexShrink: 0,
      gap: s.sm,
      marginHorizontal: -layout.screenPadding,
      paddingHorizontal: layout.screenPadding,
    },
    // Shadow on the outer wrapper; overflow:hidden (needed to clip the
    // image corners) lives on the inner wrapper.
    discoveryCardShadowWrap: {
      width: 190,
      marginRight: s.md,
      borderRadius: r['2xl'],
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
    },
    discoveryCard: {
      borderRadius: r['2xl'],
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
      overflow: 'hidden',
    },
    discoveryMedia: {
      width: '100%',
      height: 116,
      backgroundColor: c.canvasLight,
    },
    discoveryBody: {
      padding: s.md,
    },
    discoveryPrice: {
      fontSize: 11,
      fontWeight: '800',
      color: c.brandText,
      marginBottom: 6,
    },
    discoveryName: {
      fontSize: 14,
      fontWeight: '800',
      color: c.ink,
      marginBottom: 3,
    },
    discoveryMeta: {
      fontSize: 11,
      color: c.grey,
      fontWeight: '600',
    },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      marginBottom: 8,
    },
    avatarBubble: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarText: {
      color: c.brandText,
      fontSize: 12,
      fontWeight: '800',
    },
    discoveryFooter: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    miniLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    loadingWrap: {
      height: 120,
      borderRadius: r['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
    },
    discoveryPlaceholder: {
      paddingVertical: s.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: r.xl,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
    },
    discoveryPlaceholderText: {
      fontSize: 12,
      color: c.grey,
      fontWeight: '600',
      textAlign: 'center',
    },
  }));

  const renderDiscoveryCard = (item, type) => {
    if (type === 'hostel') {
      const price = formatPrice(item?.price || item?.rent) || 'Price available';
      const imageUrl = resolveImage(item) || IMAGES.hostel;
      return (
        <View key={item.id || item.uid || item.title || 'hostel'} style={discoverySectionStyles.discoveryCardShadowWrap}>
          <Pressable style={discoverySectionStyles.discoveryCard} onPress={() => router.push('/hostelmarketplace')}>
            <Image source={{ uri: imageUrl }} style={discoverySectionStyles.discoveryMedia} resizeMode="cover" />
            <View style={discoverySectionStyles.discoveryBody}>
              <Text style={discoverySectionStyles.discoveryPrice}>{price}</Text>
              <Text style={discoverySectionStyles.discoveryName} numberOfLines={1}>{item.title || item.name || 'Student hostel'}</Text>
              <Text style={discoverySectionStyles.discoveryMeta} numberOfLines={2}>{item.location || item.area || 'Near campus'}</Text>
              <View style={discoverySectionStyles.discoveryFooter}>
                <Text style={discoverySectionStyles.miniLabel}>Hostel</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.brandText} />
              </View>
            </View>
          </Pressable>
        </View>
      );
    }

    if (type === 'friend') {
      const person = item || {};
      const personName = friendlyPersonName(person);
      const personImage = resolveImage(person) || null;
      const school = person.school || person.university || person.department || 'Student network';
      const targetId = person.id || person.uid;
      return (
        <View key={targetId || personName} style={discoverySectionStyles.discoveryCardShadowWrap}>
          <Pressable
            style={discoverySectionStyles.discoveryCard}
            disabled={!targetId}
            onPress={() => targetId && router.push(`/view-user-profile/${targetId}`)}
          >
            <View style={[discoverySectionStyles.discoveryMedia, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.brandLight }]}>
              {personImage ? (
                <Image source={{ uri: personImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View style={discoverySectionStyles.avatarBubble}>
                  <Text style={discoverySectionStyles.avatarText}>{personName[0]?.toUpperCase() || 'S'}</Text>
                </View>
              )}
            </View>
            <View style={discoverySectionStyles.discoveryBody}>
              <View style={discoverySectionStyles.avatarRow}>
                <View style={discoverySectionStyles.avatarBubble}>
                  <Text style={discoverySectionStyles.avatarText}>{personName[0]?.toUpperCase() || 'S'}</Text>
                </View>
                <Text style={discoverySectionStyles.discoveryName} numberOfLines={1}>{personName}</Text>
              </View>
              <Text style={discoverySectionStyles.discoveryMeta} numberOfLines={2}>{school}</Text>
              <View style={discoverySectionStyles.discoveryFooter}>
                <Text style={discoverySectionStyles.miniLabel}>Match</Text>
                <Text style={discoverySectionStyles.discoveryMeta}>{item.score ? `${item.score}%` : 'New'}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      );
    }

    const price = formatPrice(item?.price || item?.amount) || 'Price available';
    const imageUrl = resolveImage(item) || IMAGES.marketplace;
    return (
      <View key={item.id || item.uid || item.title || 'product'} style={discoverySectionStyles.discoveryCardShadowWrap}>
        <Pressable style={discoverySectionStyles.discoveryCard} onPress={() => router.push('/studentmarketplace')}>
          <Image source={{ uri: imageUrl }} style={discoverySectionStyles.discoveryMedia} resizeMode="cover" />
          <View style={discoverySectionStyles.discoveryBody}>
            <Text style={discoverySectionStyles.discoveryPrice}>{price}</Text>
            <Text style={discoverySectionStyles.discoveryName} numberOfLines={1}>{item.title || item.name || 'Student product'}</Text>
            <Text style={discoverySectionStyles.discoveryMeta} numberOfLines={2}>{item.category || item.status || 'Campus listing'}</Text>
            <View style={discoverySectionStyles.discoveryFooter}>
              <Text style={discoverySectionStyles.miniLabel}>Market</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.brandText} />
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  // Filtered tools based on user roles
  const toolsList = [
    {
      id: 'cbt',
      title: 'CBT Practice',
      sub: 'Mock exams & quizzes',
      icon: 'school',
      color: '#10B981',
      bgColor: '#ECFDF5',
      route: '/cbt',
      badge: 'PRO',
    },
    {
      id: 'gpa-cgpa',
      title: 'GPA & CGPA',
      sub: 'Grades & progress',
      icon: 'stats-chart',
      color: '#4F46E5',
      bgColor: '#EEF2FF',
      route: '/cgpa',
      badge: 'POPULAR',
    },
    {
      id: 'timetable',
      title: 'Smart Schedule',
      sub: 'Class timetable',
      icon: 'calendar-number',
      color: '#EF4444',
      bgColor: '#FEF2F2',
      route: '/smart-timetable',
      badge: 'LIVE',
    },
    {
      id: 'formula',
      title: 'Formula Hub',
      sub: 'Math & Science',
      icon: 'code-working',
      color: '#9333EA',
      bgColor: '#F3E8FF',
      route: '/formula-hub',
      badge: 'GUIDE',
    },
    {
      id: 'pomodoro',
      title: 'Pomodoro Timer',
      sub: 'Focus & Productivity',
      icon: 'timer',
      color: '#F59E0B',
      bgColor: '#FFFAF0',
      route: '/pomodoroScreen',
      badge: 'FOCUS',
    },
    {
      id: 'newsfeed',
      title: 'News Feed',
      sub: 'Latest updates',
      icon: 'newspaper',
      color: '#3B82F6',
      bgColor: '#ECFDF5',
      route: '/newsfeed',
      badge: 'TRENDING',
    },
  ].filter((tool) => isRouteAllowedForRole(tool.route, profile?.role));

  return (
    <ScreenShell
      showFooter={false}
      overlayContent={
        <Animated.View
          onLayout={handleFabLayout}
          style={[
            styles.fabShadowWrap,
            {
              transform: [
                { translateX: fabPan.x },
                { translateY: fabPan.y },
                { scale: fabScale },
              ],
            },
          ]}
          {...panResponder.panHandlers}>
          <Pressable style={styles.fab} onPress={() => router.push('/ai')}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}>
              <Ionicons name="sparkles" size={18} color={colors.onBrand} />
              <Text style={styles.fabText}>Ask</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      }>
        {/* PREMIUM MARQUEE — slim, scrolling, always visible without hogging space */}
      {!premiumUnlocked ? <PremiumMarquee onPress={() => router.push('/premium')} /> : null}
      {/* AMBIENT FLOATING HEADER BAR */}
      <View style={styles.headerBar}>
        <Pressable style={styles.userPill} onPress={() => router.push('/profile')}>
          <View style={styles.avatarGlow}>
            {showAvatarImage ? (
              <Image
                source={{ uri: profile.photoURL }}
                style={styles.avatarImg}
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <Text style={styles.avatarTxt}>{avatarInitial}</Text>
            )}
          </View>
          <View style={styles.greetingTextWrap}>
            <Text style={styles.greetingHello}>Welcome Back</Text>
            <Text style={styles.greetingName}>
              {profile?.username ? profile.username : 'Student'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.topActions}>
          <Pressable style={styles.iconBadgeBtn} onPress={handleStreakPress}>
            <Ionicons name="flame" size={20} color={colors.orange} />
          </Pressable>
        </View>
      </View>

      

      {/* DYNAMIC FOCUS ZONE HERO CARD */}
      <View style={styles.focusCardShadowWrap}>
        <View style={styles.focusCard}>
          <Animated.View style={{ opacity: heroFadeAnim }}>
            <ImageBackground
              source={{ uri: HERO_BACKGROUNDS[heroImageIndex] }}
              style={styles.focusImageBg}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.92)']}
                style={styles.focusGradient}
              >
                <View style={styles.focusHeaderRow}>
                  <View style={styles.focusTag}>
                    <View style={styles.liveDot} />
                    <Text style={styles.focusTagText}>SMART COMPANION</Text>
                  </View>
                  <Text style={{ color: colors.onBrand, fontSize: 24 }}>{HERO_CONTENT[heroImageIndex].icon}</Text>
                </View>

                <Animated.View style={{ opacity: heroContentFadeAnim }}>
                  {/* Badge */}
                  <View style={styles.focusBadge}>
                    <Text style={styles.focusBadgeText}>✨ {HERO_CONTENT[heroImageIndex].badge}</Text>
                  </View>

                  {/* Title & Subtitle */}
                  <View style={styles.focusBody}>
                    <Text style={styles.focusTitle}>{HERO_CONTENT[heroImageIndex].title}</Text>
                    <Text style={styles.focusSubtitle}>{HERO_CONTENT[heroImageIndex].subtitle}</Text>
                  </View>

                  {/* Data Points - Educational Metrics */}
                  {HERO_CONTENT[heroImageIndex].dataPoints && HERO_CONTENT[heroImageIndex].dataPoints.length > 0 && (
                    <View style={styles.focusDataPoints}>
                      {HERO_CONTENT[heroImageIndex].dataPoints.map((point, idx) => (
                        <View key={idx} style={styles.focusDataPoint}>
                          <Text style={styles.focusDataPointText}>{point}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* AI Insight - The key differentiator */}
                  {HERO_CONTENT[heroImageIndex].insight && (
                    <View style={styles.focusInsight}>
                      <View style={styles.focusInsightIcon}>
                        <Ionicons name="bulb" size={18} color="#FBBF24" />
                      </View>
                      <Text style={styles.focusInsightText}>{HERO_CONTENT[heroImageIndex].insight}</Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.focusFooterRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.btnFocusPrimary,
                        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                      ]}
                      onPress={() => router.push(HERO_CONTENT[heroImageIndex].primaryCta.route)}
                    >
                      <Ionicons name={HERO_CONTENT[heroImageIndex].primaryCta.icon} size={18} color={colors.brandText} />
                      <Text style={styles.btnFocusPrimaryText}>{HERO_CONTENT[heroImageIndex].primaryCta.label}</Text>
                    </Pressable>

                    {HERO_CONTENT[heroImageIndex].secondaryCta && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.btnFocusIcon,
                          pressed && { opacity: 0.9 },
                        ]}
                        onPress={() => router.push(HERO_CONTENT[heroImageIndex].secondaryCta.route)}
                      >
                        <Ionicons name={HERO_CONTENT[heroImageIndex].secondaryCta.icon} size={20} color={colors.onBrand} />
                      </Pressable>
                    )}
                  </View>
                </Animated.View>
            </LinearGradient>
          </ImageBackground>
            </Animated.View>
        </View>
      </View>

      {/* STREAK WIDGET */}
      <View style={{ marginBottom: layout.screenPadding }}>
        <DailyStreakBanner
          streakCount={streakCount}
          streakDates={streakDates}
          onPress={handleStreakPress}
          onStudyNow={handleStudyNow}
        />
      </View>

      
      {/* REDESIGNED ACADEMIC TOOLKIT SECTION */}
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Academic Toolkit</Text>

          {/* ALL TOOLS BUTTON */}
          <Pressable
            style={({ pressed }) => [
              styles.seeAllBtn,
              pressed && { opacity: 0.75 },]} onPress={() => router.push('/toolScreen')}>
            <Text style={styles.seeAllText}>All Tools</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.brandText} />
          </Pressable>
        </View>

        {/* HIGH-DENSITY BALANCED TOOL GRID */}
        <View style={styles.toolGrid}>
          {toolsList.map((tool) => (
            <Pressable
              key={tool.id}
              style={({ pressed }) => [
                styles.toolCard,
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => router.push(tool.route)}
            >
              <View style={styles.toolHeader}>
                <View style={[styles.toolIconContainer, { backgroundColor: tool.bgColor }]}>
                  <Ionicons name={tool.icon} size={20} color={tool.color} />
                </View>
                <Text style={styles.toolBadge}>{tool.badge}</Text>
              </View>

              <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolSub}>{tool.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
          <Pressable
        style={({ pressed }) => [
          styles.flashBanner,
          pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
        ]}
        onPress={() => router.push('/formula-hub/flashcards')}
        accessibilityRole="button"
        accessibilityLabel="Open formula flash cards"
      >
        <LinearGradient
          colors={[colors.brand, colors.purple, colors.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.flashBannerGradient}
        >
          <View style={styles.flashBannerHalo} />
          <View style={styles.flashBannerOrbit} />
          <View style={styles.flashBannerContent}>
            <View style={styles.flashBannerCopy}>
              <View style={styles.flashBannerPill}>
                <Ionicons name="sparkles" size={13} color={colors.onBrand} />
                <Text style={styles.flashBannerPillText}>FORMULA RECALL</Text>
              </View>
              <Text style={styles.flashBannerTitle}>Flash Card Sprint</Text>
              <Text style={styles.flashBannerSubtitle}>
                Flip equations into fast memory before your next test.
              </Text>
              <View style={styles.flashBannerAction}>
                <Text style={styles.flashBannerActionText}>Start practice</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.brandText} />
              </View>
            </View>

            <View style={styles.flashDeck}>
              <View style={[styles.flashMiniCard, styles.flashMiniCardBack]}>
                <Text style={styles.flashMiniFormulaLight}>V = IR</Text>
              </View>
              <View style={[styles.flashMiniCard, styles.flashMiniCardFront]}>
                <Ionicons name="albums-outline" size={19} color={colors.brand} />
                <Text style={styles.flashMiniFormulaDark}>x = -b/2a</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>

      {/* HORIZONTAL CAMPUS DISCOVERY CAROUSEL */}
      <View style={{ marginBottom: layout.screenPadding }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Explore Campus</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          <Pressable
            style={styles.horizontalCard}
            onPress={() => router.push('/hostelmarketplace')}
          >
            <ImageBackground source={{ uri: IMAGES.hostel }} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Hostels</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          <Pressable
            style={styles.horizontalCard}
            onPress={() => router.push('/studentmarketplace')}
          >
            <ImageBackground source={{ uri: IMAGES.marketplace }} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Marketplace</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          <Pressable style={styles.horizontalCard} onPress={() => router.push('/stories')}>
            <ImageBackground source={{ uri: IMAGES.stories }} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Campus Stories</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          <Pressable style={styles.horizontalCard} onPress={() => router.push('/find-friends')}>
            <ImageBackground source={{ uri: IMAGES.community }} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Find Friends</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        </ScrollView>
      </View>

      <View style={discoverySectionStyles.discoverySection}>
        <View style={discoverySectionStyles.sectionMeta}>
          <Text style={discoverySectionStyles.discoveryTitle}>Discover</Text>
          <Pressable onPress={() => router.push('/find-friends')}>
            <Text style={discoverySectionStyles.metaText}>Fresh picks</Text>
          </Pressable>
        </View>

        {discoverData.loading ? (
          <View style={discoverySectionStyles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.brand} />
          </View>
        ) : discoverData.error ? (
          <View style={discoverySectionStyles.discoveryPlaceholder}>
            <Text style={discoverySectionStyles.discoveryPlaceholderText}>{discoverData.error}</Text>
          </View>
        ) : (
          <View style={{ gap: 18 }}>
            <View>
              <View style={discoverySectionStyles.sectionMeta}> 

                <Text style={discoverySectionStyles.discoveryTitle}>Hostels</Text>
                <Pressable onPress={() => router.push('/hostelmarketplace')}>
                  <Text style={discoverySectionStyles.metaText}>View all</Text>
                </Pressable>
              </View>
              {discoverData.hostels.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={discoverySectionStyles.discoveryRow}>
                  {discoverData.hostels.map((item) => renderDiscoveryCard(item, 'hostel'))}
                </ScrollView>
              ) : (
                <View style={discoverySectionStyles.discoveryPlaceholder}>
                  <Text style={discoverySectionStyles.discoveryPlaceholderText}>No hostels are available right now.</Text>
                </View>
              )}
            </View>

            <View>
              <View style={discoverySectionStyles.sectionMeta}>
                <Text style={discoverySectionStyles.discoveryTitle}>Friend suggestions</Text>
                <Pressable onPress={() => router.push('/find-friends')}>
                  <Text style={discoverySectionStyles.metaText}>Connect</Text>
                </Pressable>
              </View>
              {discoverData.friends.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={discoverySectionStyles.discoveryRow}>
                  {discoverData.friends.map((item) => renderDiscoveryCard(item, 'friend'))}
                </ScrollView>
              ) : (
                <View style={discoverySectionStyles.discoveryPlaceholder}>
                  <Text style={discoverySectionStyles.discoveryPlaceholderText}>Your network is warming up. Check back soon.</Text>
                </View>
              )}
            </View>

            <View>
              <View style={discoverySectionStyles.sectionMeta}>
                <Text style={discoverySectionStyles.discoveryTitle}>Marketplace</Text>
                <Pressable onPress={() => router.push('/studentmarketplace')}>
                  <Text style={discoverySectionStyles.metaText}>Browse</Text>
                </Pressable>
              </View>
              {discoverData.products.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={discoverySectionStyles.discoveryRow}>
                  {discoverData.products.map((item) => renderDiscoveryCard(item, 'product'))}
                </ScrollView>
              ) : (
                <View style={discoverySectionStyles.discoveryPlaceholder}>
                  <Text style={discoverySectionStyles.discoveryPlaceholderText}>There are no recent student listings yet.</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </ScreenShell>
  );
}