import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Pressable, Text, View, PanResponder, Animated, useWindowDimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { layout } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import SectionHeader from '../../src/shared/components/SectionHeader';
import DailyStreakBanner from '../../src/shared/components/DailyStreakBanner';
import {
  addUserActivity,
  fetchAnnouncements,
  fetchNotes,
  fetchQuestions,
  notifyInactiveUsers,
  fetchDailyStreak,
  recordDailyStreak,
} from '../../services/firestoreSync';
import { useAuth } from '../../context/AuthContext';
import { isRouteAllowedForRole } from '../../src/shared/navigation/routePermissions';

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const [streakCount, setStreakCount] = useState(0);
  const [streakDates, setStreakDates] = useState([]);
  const [isFabDragging, setIsFabDragging] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const fabPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const fabPositionRef = useRef({ x: 0, y: 0 });
  const fabStartPosition = useRef({ x: 0, y: 0 });
  const fabLayout = useRef({ width: 0, height: 0 });
  const fabScale = useRef(new Animated.Value(1)).current;
  const dragDistance = useRef(0);
  const hasPositionedFab = useRef(false);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const styles = useThemeStyles((c, s, r) => ({
    heroWrap: { marginBottom: s.lg, paddingTop: 14 },
    heroStickyLeft: {
      position: 'absolute', top: 0, left: 22, width: 92, paddingVertical: s.sm, paddingHorizontal: s.sm,
      borderRadius: r.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight,
      transform: [{ rotate: '-7deg' }], alignItems: 'flex-start', gap: 4,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
    },
    heroStickyRight: {
      position: 'absolute', top: -4, right: 26, width: 92, paddingVertical: s.sm, paddingHorizontal: s.sm,
      borderRadius: r.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight,
      transform: [{ rotate: '6deg' }], alignItems: 'flex-start', gap: 4,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
    },
    heroStickyLabel: { fontSize: 10, fontWeight: '800', color: c.ink },
    hero: {
      backgroundColor: c.brand, borderRadius: r['6xl'], marginTop: 30,
      paddingVertical: s.xl, paddingRight: s.xl, paddingLeft: s.xl + 16,
      overflow: 'hidden', position: 'relative',
    },
    heroRing: {
      position: 'absolute', width: 210, height: 210, borderRadius: 105,
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)', top: -60, right: -55, transform: [{ rotate: '-12deg' }],
    },
    heroSpiralCol: {
      position: 'absolute', left: 10, top: 16, bottom: 16, justifyContent: 'space-between', alignItems: 'center',
    },
    heroHole: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: 'rgba(0,0,0,0.16)' },
    heroChipsRow: { flexDirection: 'row', gap: s.sm, marginBottom: s.md },
    heroChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: s.sm, paddingVertical: 5,
      borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)',
    },
    heroChipText: { color: c.onBrand, fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    heroTitle: { color: c.onBrand, fontSize: 25, fontWeight: '800', lineHeight: 31, letterSpacing: -0.4 },
    heroText: { marginTop: s.sm, color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 21, maxWidth: '92%' },
    heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: s.md },
    heroCopy: { flex: 1 },
    heroAvatarWrap: {
      width: 46, height: 46, borderRadius: 23, marginBottom: s.sm,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    },
    heroAvatarImage: { width: '100%', height: '100%' },
    heroAvatarInitial: { color: c.onBrand, fontSize: 17, fontWeight: '800' },
    heroActions: { flexDirection: 'row', gap: s.sm, marginTop: s['2xl'] },
    heroButton: {
      minHeight: 46, paddingHorizontal: s.lg, borderRadius: 999, backgroundColor: c.surface,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: s.sm,
    },
    heroButtonPressed: { backgroundColor: c.brandLight },
    heroButtonText: { color: c.brandText, fontSize: 13, fontWeight: '800' },
    heroButtonSecondary: {
      minHeight: 46, paddingHorizontal: s.lg, borderRadius: 999, backgroundColor: 'transparent',
      borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: s.sm,
    },
    heroButtonSecondaryPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
    heroButtonSecondaryText: { color: c.onBrand, fontSize: 13, fontWeight: '800' },

    section: { marginBottom: s.xl },

    premiumBanner: {
      flexDirection: 'row', alignItems: 'center', gap: s.md,
      backgroundColor: c.brandLight, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.brandGlow,
      paddingHorizontal: s.lg, paddingVertical: s.md,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
    },
    premiumBannerPressed: { opacity: 0.9 },
    premiumBannerIconWrap: { width: 36, height: 36, borderRadius: r.md, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
    premiumBannerBody: { flex: 1 },
    premiumBannerTitle: { fontSize: 13.5, fontWeight: '800', color: c.brandText },
    premiumBannerText: { marginTop: s.xs, fontSize: 12, color: c.grey, lineHeight: 17 },

    shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    shortcutCard: {
      width: '31%', backgroundColor: c.surface, borderRadius: r['3xl'],
      borderWidth: 1, borderColor: c.borderLight, padding: s.lg, alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
    },
    cardPressed: { backgroundColor: c.canvasLight, transform: [{ scale: 0.98 }] },
    shortcutIcon: { width: 38, height: 38, borderRadius: r.md, alignItems: 'center', justifyContent: 'center' },
    shortcutLabel: { marginTop: s.sm, color: c.ink, fontSize: 10, fontWeight: '700', textAlign: 'center' },

    managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    managementCard: {
      flexBasis: '31%', minWidth: 100, backgroundColor: c.surface, borderRadius: r.xl,
      borderWidth: 1, borderColor: c.border, paddingVertical: s.md, paddingHorizontal: s.sm,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
    },
    managementIcon: { width: 40, height: 40, borderRadius: r.md, alignItems: 'center', justifyContent: 'center', marginBottom: s.sm },
    managementCardTitle: { color: c.ink, fontSize: 12.5, fontWeight: '800', textAlign: 'center' },

    upcomingCard: {
      backgroundColor: c.surface, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderLight,
      padding: s.lg, shadowColor: c.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
      overflow: 'hidden',
    },
    upcomingGlow: {
      position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: 70,
      backgroundColor: c.brandTransparent,
    },
    upcomingHeader: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginBottom: s.md },
    upcomingIconWrap: { width: 44, height: 44, borderRadius: r.lg, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    upcomingHeaderText: { flex: 1 },
    upcomingTitle: { color: c.ink, fontSize: 14, fontWeight: '800' },
    upcomingSubtitle: { marginTop: 2, color: c.textSecondary, fontSize: 12, lineHeight: 18 },
    upcomingList: { gap: s.sm },
    upcomingItem: {
      flexDirection: 'row', alignItems: 'flex-start', gap: s.sm,
      padding: s.md, borderRadius: r.xl, backgroundColor: c.canvasLight,
      borderWidth: 1, borderColor: c.borderLight,
    },
    upcomingItemIconWrap: {
      width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight, marginTop: 1,
    },
    upcomingItemTitle: { color: c.ink, fontSize: 13, fontWeight: '700' },
    upcomingItemSubtitle: { marginTop: 2, color: c.textSecondary, fontSize: 12, lineHeight: 17 },
    upcomingBadge: {
      alignSelf: 'flex-start', marginBottom: s.sm, paddingHorizontal: s.sm, paddingVertical: 4,
      borderRadius: 999, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder,
    },
    upcomingBadgeText: { color: c.brandText, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },

    fab: {
      position: 'absolute', zIndex: 1000,
      width: layout.fabSize + 12, height: layout.fabSize + 12, borderRadius: (layout.fabSize + 12) / 2,
      overflow: 'hidden',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)',
      elevation: 10, shadowColor: c.shadow, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 },
    },
    fabDragging: { opacity: 0.94, shadowOpacity: 0.42, shadowRadius: 24, elevation: 16, borderColor: 'rgba(255,255,255,0.5)' },
    fabButton: { flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 4 },
    fabText: { color: c.onBrand, fontSize: 12, fontWeight: '800', marginLeft: s.xs },
    fabGradient: {
      flex: 1, width: '100%', height: '100%', flexDirection: 'column',
      borderRadius: (layout.fabSize + 12) / 2, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: s.md, gap: 4,
    },
    fabGlow: {
      position: 'absolute', top: -16, right: -14, width: 58, height: 58, borderRadius: 29,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },

    challengeBanner: { borderRadius: r['3xl'], overflow: 'hidden' },
    challengeBannerPressed: { opacity: 0.95 },
    challengeGradient: { borderRadius: r['3xl'], padding: s.lg },
    challengeContent: { flexDirection: 'row', alignItems: 'center', gap: s.md },
    challengeLeft: { flex: 1, gap: s.sm },
    challengeIconRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    challengeIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    challengeBadge: { color: c.onBrand, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.9 },
    challengeTitle: { color: c.onBrand, fontSize: 18, fontWeight: '900' },
    challengeSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 18, fontWeight: '600' },
    challengeStats: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: s.xs },
    challengeStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    challengeStatValue: { color: c.onBrand, fontSize: 15, fontWeight: '900' },
    challengeStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },
    challengeStatDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)' },
    challengeArrow: { justifyContent: 'center' },

    stackGap: { gap: s.lg },
  }));

  const load = useCallback(async () => {
    try {
      const [, , , streakData] = await Promise.all([
        fetchAnnouncements(), fetchNotes(), fetchQuestions(), fetchDailyStreak(),
      ]);
      setStreakCount(streakData.streakCount || 0);
      setStreakDates(streakData.streakDates || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile?.uid) return;
    addUserActivity({ type: 'open_home', message: 'Opened the home dashboard' }).catch(() => {});
    recordDailyStreak().catch(() => {});
    notifyInactiveUsers().catch(() => {});
  }, [profile?.uid]);

  const handleStreakPress = useCallback(() => router.push('/streak'), [router]);
  const handleStudyNow = useCallback(async () => {
    try {
      const result = await recordDailyStreak();
      setStreakCount(result.streakCount);
      setStreakDates(result.streakDates);
      router.push('/streak');
    } catch {}
  }, [router]);

  const shortcuts = useMemo(
    () => [
      { label: 'CGPA Tracker', icon: 'stats-chart', route: '/cgpa', tone: colors.brand },
      { label: 'Messages', icon: 'chatbubble-ellipses', route: '/messages', tone: colors.green },
      { label: 'GPA Calculator', icon: 'calculator', route: '/gpa', tone: colors.orange },
      { label: 'Smart Timetable', icon: 'calendar', route: '/smart-timetable', tone: colors.red },
      { label: 'Task Manager', icon: 'list', route: '/tasks', tone: colors.purple },
      { label: 'Announcements', icon: 'megaphone', route: '/announcements', tone: colors.brand },
      { label: 'Find Friend', icon: 'people', route: '/find-friends', tone: colors.blue },
      { label: 'News Feed', icon: 'newspaper', route: '/newsfeed', tone: colors.blue },
      { label: 'Formular Hub', icon: 'calculator', route: '/formula-hub', tone: colors.purple },
    ].filter((shortcut) => isRouteAllowedForRole(shortcut.route, profile?.role)),
    [profile?.role, colors]
  );

  const contentManagementCards = useMemo(
    () => [
      { label: 'View Hostels', icon: 'home', route: '/hostelmarketplace', tone: colors.green },
      { label: 'Marketplace', icon: 'bag', route: '/studentmarketplace', tone: colors.orange },
      { label: 'Read Stories', icon: 'library', route: '/stories', tone: colors.purple },
      { label: 'Help Center', icon: 'help-circle', route: '/help-center', tone: colors.green },
    ],
    [colors]
  );

  const upcomingFeatures = useMemo(
    () => [
      { title: 'AI Study Planner', subtitle: 'Personalized daily study plans, review checkpoints, and smart pacing.', icon: 'bulb-outline' },
      { title: 'Live Group Rooms', subtitle: 'Join focused peer-study rooms for exams, projects, and revision sessions.', icon: 'people-circle-outline' },
      { title: 'Exam Analytics', subtitle: 'Track weak topics, improve accuracy, and get actionable performance insights.', icon: 'bar-chart-outline' },
      { title: 'Offline Notes Sync', subtitle: 'Keep your notes and study materials ready even when your connection drops.', icon: 'cloud-offline-outline' },
      { title: 'Smart Reminders', subtitle: 'Receive timely nudges for classes, deadlines, and upcoming milestones.', icon: 'notifications-outline' },
      { title: 'Premium Study Vault', subtitle: 'Securely store your best notes, summaries, and revision packs in one place.', icon: 'lock-closed-outline' },
    ],
    []
  );

  const greetingName = profile?.username ? `Welcome back, ${profile?.username || 'student'}` : 'Your all-in-one study hub';
  const showPremiumBanner = !profile?.premium;

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(
    () => today.toLocaleDateString('en-US', { weekday: 'long' }),
    [today]
  );
  const dateLabel = useMemo(
    () => today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    [today]
  );
  const heroHeadline = profile?.username ? `Welcome back, ${profile.username}.` : 'Welcome to Unihelp.';
  const avatarInitial = (profile?.username || 'U').trim().charAt(0).toUpperCase();
  const showAvatarImage = !!profile?.photoURL && !avatarFailed;

  const clampFabPosition = useCallback((nextX, nextY) => {
    const width = fabLayout.current.width || layout.fabSize + 12;
    const height = fabLayout.current.height || layout.fabSize + 12;
    const maxX = Math.max(0, screenWidth - width - layout.screenPadding);
    const maxY = Math.max(0, screenHeight - height - 120);
    return {
      x: Math.min(Math.max(nextX, layout.screenPadding), maxX),
      y: Math.min(Math.max(nextY, 12), maxY),
    };
  }, [screenHeight, screenWidth]);

  const animateFab = useCallback((toValue) => {
    Animated.spring(fabScale, { toValue, useNativeDriver: false, friction: 8, tension: 120 }).start();
  }, [fabScale]);

  const handleFabLayout = useCallback((event) => {
    const { width, height } = event.nativeEvent.layout;
    fabLayout.current = { width, height };

    if (!hasPositionedFab.current) {
      hasPositionedFab.current = true;
      const initial = clampFabPosition(screenWidth - width - layout.screenPadding, screenHeight - height - 120);
      fabPositionRef.current = initial;
      fabPan.setValue(initial);
    }
  }, [clampFabPosition, fabPan, screenHeight, screenWidth]);

  // Keeps the FAB on-screen and in a sane spot if the window size changes
  // (device rotation, split-screen/foldable resize) after it's already
  // been positioned.
  useEffect(() => {
    if (!hasPositionedFab.current) return;
    const next = clampFabPosition(fabPositionRef.current.x, fabPositionRef.current.y);
    fabPositionRef.current = next;
    fabPan.setValue(next);
  }, [clampFabPosition, fabPan]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.hypot(gestureState.dx, gestureState.dy) > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        setIsFabDragging(true);
        animateFab(0.96);
        dragDistance.current = 0;
        fabPan.stopAnimation((value) => {
          fabStartPosition.current = value;
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
        animateFab(1);

        if (dragDistance.current < 8) {
          dragDistance.current = 0;
          router.push('/ai');
          return;
        }
        dragDistance.current = 0;
        const width = fabLayout.current.width || layout.fabSize + 12;
        const midX = fabPositionRef.current.x + width / 2;
        const snapLeft = layout.screenPadding;
        const snapRight = Math.max(0, screenWidth - width - layout.screenPadding);
        const targetX = midX < screenWidth / 2 ? snapLeft : snapRight;
        fabPositionRef.current = { ...fabPositionRef.current, x: targetX };
        Animated.spring(fabPan.x, { toValue: targetX, useNativeDriver: false, friction: 8, tension: 80 }).start();
      },
    }),
    [animateFab, clampFabPosition, fabPan, router, screenWidth]
  );

  return (
    <ScreenShell
      title="Unihelp"
      subtitle={greetingName}
      showFooter
      overlayContent={
        <Animated.View
          onLayout={handleFabLayout}
          style={[
            styles.fab,
            { transform: [{ translateX: fabPan.x }, { translateY: fabPan.y }, { scale: fabScale }] },
            isFabDragging && styles.fabDragging,
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.fabGlow} pointerEvents="none" />
          <Pressable
            style={styles.fabButton}
            onPress={() => {
              if (dragDistance.current < 8) {
                router.push('/ai');
              }
            }}
            onPressIn={() => animateFab(0.96)}
            onPressOut={() => animateFab(1)}
            accessibilityRole="button"
            accessibilityLabel="Open AI assistant">
            <LinearGradient colors={isDark ? ['#818af4', '#6D28D9'] : ['#4F46E5', '#7C3AED']} style={styles.fabGradient}>
              <Ionicons name="sparkles-outline" size={18} color={colors.onBrand} />
              <Text style={styles.fabText}>Ask</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      }
    >
      {/* HERO */}
      <View style={styles.heroWrap}>
        {/* Peeking sticky-note chips — a nod to the stack of study material the app organizes */}
        <View style={styles.heroStickyLeft} pointerEvents="none">
          <Ionicons name="document-text" size={14} color={colors.brand} />
          <Text style={styles.heroStickyLabel}>Notes</Text>
        </View>
        <View style={styles.heroStickyRight} pointerEvents="none">
          <Ionicons name="people" size={14} color={colors.brand} />
          <Text style={styles.heroStickyLabel}>Groups</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroRing} pointerEvents="none" />
          {/* Spiral-notebook edge */}
          <View style={styles.heroSpiralCol} pointerEvents="none">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.heroHole} />
            ))}
          </View>

          <View style={styles.heroChipsRow}>
            <View style={styles.heroChip}>
              <Ionicons name="calendar-outline" size={12} color={colors.onBrand} />
              <Text style={styles.heroChipText}>{todayLabel}, {dateLabel}</Text>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name={streakCount > 0 ? 'flame' : 'sparkles'} size={12} color={colors.onBrand} />
              <Text style={styles.heroChipText}>
                {streakCount > 0 ? `${streakCount} day streak` : 'Start your streak'}
              </Text>
            </View>
          </View>

          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{heroHeadline}</Text>
              <Text style={styles.heroText}>
                Your notes, tasks, and groups, organized in one calm place for the semester ahead.
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Pressable
              style={({ pressed }) => [styles.heroButton, pressed && styles.heroButtonPressed]}
              onPress={() => router.push('/(tabs)/lectureNotes')}
              accessibilityRole="button" accessibilityLabel="Open lecture notes">
              <Ionicons name="book-outline" size={16} color={colors.brandText} />
              <Text style={styles.heroButtonText}>Open Notes</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.heroButtonSecondary, pressed && styles.heroButtonSecondaryPressed]}
              onPress={() => router.push({ pathname: '/studentmarketplace', params: { kind: 'group' } })}
              accessibilityRole="button" accessibilityLabel="Create a study group"
            >
              <Ionicons name="bag-outline" size={16} color={colors.onBrand} />
              <Text style={styles.heroButtonSecondaryText}>Marketplace</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* GAMIFICATION: streak + daily challenge live together since they're both
          "come back today" hooks — grouping them reads as one coherent moment
          instead of two competing banners. */}
      <View style={[styles.section, styles.stackGap]}>
        <DailyStreakBanner
          streakCount={streakCount} streakDates={streakDates}
          onPress={handleStreakPress} onStudyNow={handleStudyNow}
        />

        <Pressable
          style={({ pressed }) => [styles.challengeBanner, pressed && styles.challengeBannerPressed]}
          onPress={() => router.push('/challenge')}
          accessibilityRole="button" accessibilityLabel="Daily challenge"
        >
          <LinearGradient colors={[colors.brand, colors.brandDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.challengeGradient}>
            <View style={styles.challengeContent}>
              <View style={styles.challengeLeft}>
                <View style={styles.challengeIconRow}>
                  <View style={styles.challengeIconWrap}>
                    <Ionicons name="flash" size={18} color={colors.onBrand} />
                  </View>
                  <Text style={styles.challengeBadge}>Daily Challenge</Text>
                </View>
                <Text style={styles.challengeTitle}>Challenge yourself daily</Text>
                <Text style={styles.challengeSubtitle}>Answer questions, earn XP, build streaks, and climb the leaderboard.</Text>
                <View style={styles.challengeStats}>
                  <View style={styles.challengeStat}>
                    <Ionicons name="flame" size={14} color={colors.orange} />
                    <Text style={styles.challengeStatValue}>{streakCount}</Text>
                    <Text style={styles.challengeStatLabel}>day streak</Text>
                  </View>
                  <View style={styles.challengeStatDivider} />
                  <View style={styles.challengeStat}>
                    <Ionicons name="sparkles" size={14} color={colors.gold} />
                    <Text style={styles.challengeStatValue}>{profile?.xp || 0}</Text>
                    <Text style={styles.challengeStatLabel}>XP</Text>
                  </View>
                </View>
              </View>
              <View style={styles.challengeArrow}>
                <Ionicons name="arrow-forward-circle" size={32} color={colors.onBrand} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* QUICK ACCESS */}
      <View style={styles.section}>
        <SectionHeader title="Quick access" subtitle="Jump straight to the areas you use most." icon="grid-outline" />
        <View style={styles.shortcutGrid}>
          {shortcuts.map((shortcut) => (
            <Pressable
              key={shortcut.label}
              style={({ pressed }) => [styles.shortcutCard, pressed && styles.cardPressed]}
              onPress={() => router.push(shortcut.route)}
              accessibilityRole="button" accessibilityLabel={shortcut.label}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: `${shortcut.tone}15` }]}>
                <Ionicons name={shortcut.icon} size={18} color={shortcut.tone} />
              </View>
              <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* PREMIUM UPSELL — sits after the free tools so it reads as a natural
          "get even more" moment rather than interrupting the hero. */}
      {showPremiumBanner ? (
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.premiumBanner, pressed && styles.premiumBannerPressed]}
            onPress={() => router.push('/premium')}
            accessibilityRole="button" accessibilityLabel="Upgrade to premium"
          >
            <View style={styles.premiumBannerIconWrap}>
              <Ionicons name="sparkles" size={16} color={colors.onBrand} />
            </View>
            <View style={styles.premiumBannerBody}>
              <Text style={styles.premiumBannerTitle}>Unlock Premium</Text>
              <Text style={styles.premiumBannerText}>Remove limits, get stronger AI help, and enjoy more study perks.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.brand} />
          </Pressable>
        </View>
      ) : null}

      {/* EXPLORE */}
      <View style={styles.section}>
        <SectionHeader title="Explore" subtitle="Hostels, marketplace, stories, and support." icon="compass-outline" />
        <View style={styles.managementGrid}>
          {contentManagementCards.map((card) => (
            <Pressable
              key={card.label}
              style={({ pressed }) => [styles.managementCard, pressed && styles.cardPressed]}
              onPress={() => router.push(card.route)}
              accessibilityRole="button" accessibilityLabel={card.label}
            >
              <View style={[styles.managementIcon, { backgroundColor: `${card.tone}15` }]}>
                <Ionicons name={card.icon} size={18} color={card.tone} />
              </View>
              <Text style={styles.managementCardTitle}>{card.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.upcomingCard}>
        <View style={styles.upcomingGlow} pointerEvents="none" />
        <View style={styles.upcomingBadge}>
          <Text style={styles.upcomingBadgeText}>Premium roadmap</Text>
        </View>
        <View style={styles.upcomingHeader}>
          <View style={styles.upcomingIconWrap}>
            <Ionicons name="rocket-outline" size={18} color={colors.brand} />
          </View>
          <View style={styles.upcomingHeaderText}>
            <Text style={styles.upcomingTitle}>Coming soon</Text>
            <Text style={styles.upcomingSubtitle}>A premium set of upgrades crafted to make your study experience smarter and calmer.</Text>
          </View>
        </View>
        <View style={styles.upcomingList}>
          {upcomingFeatures.map((item) => (
            <View key={item.title} style={styles.upcomingItem}>
              <View style={styles.upcomingItemIconWrap}>
                <Ionicons name={item.icon} size={15} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upcomingItemTitle}>{item.title}</Text>
                <Text style={styles.upcomingItemSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScreenShell>
  );
}
