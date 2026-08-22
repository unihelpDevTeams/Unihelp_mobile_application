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
  hostel: require('../../assets/images/campus_hostel.jpg'),
  marketplace: require('../../assets/images/campus_marketplace.jpg'),
  stories: require('../../assets/images/campus_stories.jpg'),
  community: require('../../assets/images/campus_community.jpg'),
};

const FAB_SIZE = 56;
const MARQUEE_PX_PER_SECOND = 46;
const MARQUEE_MESSAGE = 'study offline, unlimited downloads & priority AI access.';
const HERO_AUTO_ADVANCE_MS = 7000;

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

const buildHeroSlides = (streakCount = 0) => [
  {
    slide: 'smart-today',
    icon: 'flash-outline',
    eyebrow: "TODAY'S FOCUS",
    title: 'Calculus & Chemistry need you today',
    stat: '30 min deep focus · 5 topics due for review',
    cta: { label: 'Start studying', route: '/(tabs)/studyMaterials' },
  },
  {
    slide: 'weak-areas',
    icon: 'trending-up-outline',
    eyebrow: 'GROWTH AREA',
    title: 'struggling with calculations? Strengthen your weak areas',
    stat: 'Targeted practice improves retention by up to 80%',
    cta: { label: 'Strengthen weak areas', route: '/formula-hub' },
  },
  {
    slide: 'streak-power',
    icon: 'flame',
    eyebrow: 'STUDY STREAK',
    title: streakCount > 0 ? `${streakCount}-day streak, keep it alive` : 'Start your study streak today',
    stat:
      streakCount > 0
        ? 'Consistent daily learners retain up to 3× more'
        : 'One session today gets your streak going',
    cta: { label: streakCount > 0 ? 'Continue streak' : 'Start today', route: '/streak' },
  },
  {
    slide: 'spaced-repeat',
    icon: 'sync-outline',
    eyebrow: 'DUE FOR REVIEW',
    title: '12 topics are ready to review',
    stat: 'Spaced review beats cramming by up to 250%',
    cta: { label: 'Start review', route: '/formula-hub/flashcards' },
  },
  {
    slide: 'exam-mode',
    icon: 'rocket-outline',
    eyebrow: 'EXAM COUNTDOWN',
    title: '21 days to your Physics final',
    stat: '89% syllabus covered · 12 practice tests ready',
    cta: { label: 'Enter exam mode', route: '/cbt' },
  },
];

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

// A single-message-at-a-time hero: one clear insight, one stat, one call to
// action per slide, on the app's own brand gradient — no stock photography,
// no borrowed accent colors. User-swipeable, with a slow auto-advance that
// backs off the moment someone interacts with it.
function HeroCarousel({ slides, router }) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - layout.screenPadding * 2;

  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const autoTimerRef = useRef(null);
  const [, setActiveIndex] = useState(0);

  const styles = useThemeStyles((c, s, r) => ({
    shadowWrap: {
      borderRadius: r['3xl'],
      marginBottom: s.xl,
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 8,
    },
    card: {
      borderRadius: r['3xl'],
      overflow: 'hidden',
    },
    gradient: {
      height: 214,
    },
    haloTop: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      right: -50,
      top: -60,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    haloBottom: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      left: -40,
      bottom: -70,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    slide: {
      flex: 1,
      padding: s.xl,
      justifyContent: 'space-between',
    },
    eyebrowPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.16)',
      paddingLeft: 6,
      paddingRight: s.md,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    eyebrowIconWrap: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrowText: {
      color: c.onBrand,
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    slideTitle: {
      color: c.onBrand,
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.4,
      lineHeight: 27,
    },
    slideStat: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: 13,
      fontWeight: '600',
      marginTop: 6,
      lineHeight: 18,
    },
    cta: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surface,
      paddingHorizontal: s.lg,
      paddingVertical: 11,
      borderRadius: r.xl,
    },
    ctaText: {
      color: c.brandText,
      fontSize: 13.5,
      fontWeight: '800',
    },
    dotsRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: s.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.onBrand,
    },
  }));

  const goToIndex = useCallback(
    (index) => {
      scrollRef.current?.scrollTo({ x: index * cardWidth, animated: true });
    },
    [cardWidth]
  );

  const restartAutoAdvance = useCallback(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    if (slides.length <= 1) return;
    autoTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length;
        goToIndex(next);
        return next;
      });
    }, HERO_AUTO_ADVANCE_MS);
  }, [slides.length, goToIndex]);

  useEffect(() => {
    restartAutoAdvance();
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, [restartAutoAdvance]);

  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: true,
  });

  const handleMomentumEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setActiveIndex(index);
    restartAutoAdvance();
  };

  const pauseAutoAdvance = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
  };

  return (
    <View style={styles.shadowWrap}>
      <View style={styles.card}>
        <LinearGradient
          colors={[colors.brand, colors.purple || colors.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.haloTop} />
          <View style={styles.haloBottom} />

          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onScrollBeginDrag={pauseAutoAdvance}
            onMomentumScrollEnd={handleMomentumEnd}
          >
            {slides.map((slide) => (
              <View key={slide.slide} style={[styles.slide, { width: cardWidth }]}>
                <View style={styles.eyebrowPill}>
                  <View style={styles.eyebrowIconWrap}>
                    <Ionicons name={slide.icon} size={12} color={colors.onBrand} />
                  </View>
                  <Text style={styles.eyebrowText}>{slide.eyebrow}</Text>
                </View>

                <View>
                  <Text style={styles.slideTitle} numberOfLines={2}>
                    {slide.title}
                  </Text>
                  <Text style={styles.slideStat} numberOfLines={2}>
                    {slide.stat}
                  </Text>
                </View>

                <Pressable
                  onPress={() => router.navigate(slide.cta.route)}
                  style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
                  accessibilityRole="button"
                  accessibilityLabel={slide.cta.label}
                >
                  <Text style={styles.ctaText}>{slide.cta.label}</Text>
                  <Ionicons name="arrow-forward" size={15} color={colors.brandText} />
                </Pressable>
              </View>
            ))}
          </Animated.ScrollView>

          {slides.length > 1 ? (
            <View style={styles.dotsRow} pointerEvents="none">
              {slides.map((slide, index) => {
                const inputRange = [(index - 1) * cardWidth, index * cardWidth, (index + 1) * cardWidth];
                const dotOpacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.4, 1, 0.4],
                  extrapolate: 'clamp',
                });
                const dotScale = scrollX.interpolate({
                  inputRange,
                  outputRange: [1, 1.6, 1],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.View
                    key={slide.slide}
                    style={[styles.dot, { opacity: dotOpacity, transform: [{ scale: dotScale }] }]}
                  />
                );
              })}
            </View>
          ) : null}
        </LinearGradient>
      </View>
    </View>
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
  const [discoverData, setDiscoverData] = useState({
    hostels: [],
    friends: [],
    products: [],
    loading: true,
    error: null,
  });

  const heroSlides = useMemo(() => buildHeroSlides(streakCount), [streakCount]);

  // Reset avatar-error state whenever the source photo actually changes,
  // otherwise a newly-uploaded photo can never recover from a prior failed load.
  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.photoURL]);

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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 40,
      paddingHorizontal: s.sm,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
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

  const handleStreakPress = useCallback(() => router.navigate('/streak'), [router]);

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
            router.navigate('/ai');
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
          <Pressable style={discoverySectionStyles.discoveryCard} onPress={() => router.navigate('/hostelmarketplace')}>
            <Image source={typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl} style={discoverySectionStyles.discoveryMedia} resizeMode="cover" />
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
            onPress={() => targetId && router.navigate(`/view-user-profile/${targetId}`)}
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
        <Pressable style={discoverySectionStyles.discoveryCard} onPress={() => router.navigate('/studentmarketplace')}>
          <Image source={typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl} style={discoverySectionStyles.discoveryMedia} resizeMode="cover" />
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
      id: 'challenge',
      title: 'Daily Challenge',
      sub: 'Build your streak',
      icon: 'flame',
      color: '#F97316',
      bgColor: '#FFF7ED',
      route: '/challenge',
      badge: 'HOT',
    },
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
          <Pressable style={styles.fab} onPress={() => router.navigate('/ai')}>
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
      {!premiumUnlocked ? <PremiumMarquee onPress={() => router.navigate('/premium')} /> : null}

      {/* AMBIENT FLOATING HEADER BAR */}
      <View style={styles.headerBar}>
        <Pressable style={styles.userPill} onPress={() => router.navigate('/profile')}>
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
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandText }}>
              {streakCount} Day Streak
            </Text>
            <Ionicons name="flame" size={20} color={colors.orange} />
          </Pressable>
        </View>
      </View>

      {/* SMART STUDY HERO — one message at a time, user-swipeable */}
      <HeroCarousel slides={heroSlides} router={router} />

      {/* REDESIGNED ACADEMIC TOOLKIT SECTION */}
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Academic Toolkit</Text>

          {/* ALL TOOLS BUTTON */}
          <Pressable
            style={({ pressed }) => [
              styles.seeAllBtn,
              pressed && { opacity: 0.75 },]} onPress={() => router.navigate('/toolScreen')}>
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
              onPress={() => router.navigate(tool.route)}
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
        onPress={() => router.navigate('/formula-hub/flashcards')}
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
            onPress={() => router.navigate('/hostelmarketplace')}
          >
            <ImageBackground source={IMAGES.hostel} style={styles.horizontalBg}>
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
            onPress={() => router.navigate('/studentmarketplace')}
          >
            <ImageBackground source={IMAGES.marketplace} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Marketplace</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          <Pressable style={styles.horizontalCard} onPress={() => router.navigate('/stories')}>
            <ImageBackground source={IMAGES.stories} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Campus Stories</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          <Pressable style={styles.horizontalCard} onPress={() => router.navigate('/find-friends')}>
            <ImageBackground source={IMAGES.community} style={styles.horizontalBg}>
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
          <Pressable onPress={() => router.navigate('/find-friends')}>
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
                <Pressable onPress={() => router.navigate('/hostelmarketplace')}>
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
                <Pressable onPress={() => router.navigate('/find-friends')}>
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
                <Pressable onPress={() => router.navigate('/studentmarketplace')}>
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