import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  ImageBackground,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import {
  fetchAnnouncements,
  fetchNotes,
  fetchQuestions,
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
const FAB_BOTTOM_GAP = 24; // clearance above the bottom edge (footer is hidden on this screen)
const FAB_TOP_GAP = 12;
const MARQUEE_PX_PER_SECOND = 46;
const MARQUEE_MESSAGE = 'study offline, unlimited downloads & priority AI access.';
const HERO_AUTO_ADVANCE_MS = 9000;

// Discover feed: items are revealed a page at a time as the user scrolls sideways.
const DISCOVER_PAGE = 8;
const FRIEND_FETCH_START = 24;
const FRIEND_FETCH_MAX = 400;

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

const shuffleSample = (items = [], limit = items.length) => {
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
  pushValue(item.photoURL);
  pushValue(item.photoThumb);
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

const itemKey = (item, index) => `${item?.id || item?.uid || 'item'}-${index}`;

const buildHeroSlides = ({ streakCount = 0, announcements = [], notes = [], questions = [] } = {}) => {
  const latestAnnouncement = announcements[0];
  const latestNote = notes[0];
  const latestQuestion = questions[0];
  const slides = [];

  if (latestAnnouncement) {
    slides.push({
      slide: 'latest-announcement',
      icon: 'megaphone-outline',
      eyebrow: 'Latest update',
      title: latestAnnouncement.title || latestAnnouncement.name || 'A new UniHelp update is available',
      stat: latestAnnouncement.description || latestAnnouncement.body || 'Open announcements to view the full update.',
      cta: { label: 'View update', route: '/announcements' },
    });
  }

  if (latestNote) {
    slides.push({
      slide: 'latest-resource',
      icon: 'book-outline',
      eyebrow: 'New resource',
      title: latestNote.title || latestNote.name || 'A study resource is ready',
      stat: `${notes.length} resource${notes.length === 1 ? '' : 's'} available in your library.`,
      cta: { label: 'Open resources', route: '/(tabs)/studyMaterials' },
    });
  }

  if (latestQuestion) {
    slides.push({
      slide: 'latest-question',
      icon: 'help-circle-outline',
      eyebrow: 'Practice ready',
      title: latestQuestion.title || latestQuestion.name || 'Practice questions are ready',
      stat: `${questions.length} question${questions.length === 1 ? '' : 's'} available for revision.`,
      cta: { label: 'Practice now', route: '/cbt' },
    });
  }

  slides.push({
    slide: 'study-streak',
    icon: 'flame',
    eyebrow: 'Study streak',
    title: streakCount > 0 ? `${streakCount}-day streak in progress` : 'Start your study streak today',
    stat: streakCount > 0 ? 'Return today to keep your progress active.' : 'Complete a study session to begin tracking your progress.',
    cta: { label: streakCount > 0 ? 'Continue streak' : 'Start studying', route: '/streak' },
  });

  return slides;
};

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
    },
    trackContent: {
      alignItems: 'center',
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

  // Seamless-loop marquee: two copies of the same text back to back, scrolled
  // left by exactly one copy's width so the loop point is invisible.
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
        {/*
          A non-scrollable horizontal ScrollView gives the text an unconstrained width. A plain
          row View would squeeze the text to the container width and wrap it onto two lines,
          which breaks both the layout and the measured loop distance.
        */}
        <ScrollView
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          pointerEvents="none"
          style={styles.trackClip}
          contentContainerStyle={styles.trackContent}
        >
          <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
            <Text
              style={styles.text}
              numberOfLines={1}
              onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
            >
              {MARQUEE_MESSAGE}
            </Text>
            <Text style={styles.text} numberOfLines={1}>{MARQUEE_MESSAGE}</Text>
          </Animated.View>
        </ScrollView>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Upgrade</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.onBrand} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const HERO_ACCENTS = {
  'latest-announcement': { tint: '#EEF2FF', fg: '#4F46E5', image: IMAGES.community, soft: 'rgba(79,70,229,0.12)' },
  'latest-resource': { tint: '#ECFDF5', fg: '#10B981', image: IMAGES.stories, soft: 'rgba(16,185,129,0.13)' },
  'latest-question': { tint: '#F3E8FF', fg: '#9333EA', image: IMAGES.marketplace, soft: 'rgba(147,51,234,0.13)' },
  'study-streak': { tint: '#FFF7ED', fg: '#F97316', image: IMAGES.hostel, soft: 'rgba(249,115,22,0.14)' },
};

// A flat, bordered card that matches the toolCard/discoveryCard language
// used everywhere else on this screen. Swipeable between slides, with a
// slow auto-advance that pauses the moment someone drags it.
function HeroCarousel({ slides, router }) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - layout.screenPadding * 2;

  const scrollRef = useRef(null);
  const autoTimerRef = useRef(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const setIndex = useCallback((index) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const styles = useThemeStyles((c, s, r) => ({
    wrap: {
      marginBottom: s.xl,
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.sm,
    },
    heroHeaderTitle: {
      color: c.ink,
      fontSize: 14,
      fontWeight: '900',
    },
    heroHeaderMeta: {
      color: c.textSecondary || c.grey,
      fontSize: 11,
      fontWeight: '800',
    },
    card: {
      minHeight: 188,
      borderRadius: r['2xl'],
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.09,
      shadowRadius: 18,
      elevation: 5,
      overflow: 'hidden',
    },
    cardPressed: {
      opacity: 0.94,
      transform: [{ scale: 0.992 }],
    },
    body: {
      flex: 1,
      padding: s.lg,
      paddingRight: 118,
      minHeight: 188,
      justifyContent: 'space-between',
    },
    imagePanel: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 112,
      overflow: 'hidden',
    },
    image: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    imageOverlay: {
      flex: 1,
    },
    softCircle: {
      position: 'absolute',
      width: 132,
      height: 132,
      borderRadius: 66,
      right: -52,
      bottom: -42,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: s.md,
    },
    iconChip: {
      width: 34,
      height: 34,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: s.sm,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: c.grey,
    },
    title: {
      fontSize: 20,
      fontWeight: '900',
      color: c.ink,
      lineHeight: 25,
      marginBottom: 6,
    },
    stat: {
      fontSize: 13,
      color: c.grey,
      fontWeight: '600',
      lineHeight: 19,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: s.md,
    },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      borderRadius: 999,
      paddingHorizontal: s.md,
      paddingVertical: 8,
    },
    ctaText: {
      fontSize: 12,
      fontWeight: '900',
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    controlButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: s.sm,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.borderLight || c.border,
    },
    dotActive: {
      width: 22,
    },
  }));

  const stopAutoAdvance = useCallback(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
  }, []);

  const restartAutoAdvance = useCallback(() => {
    stopAutoAdvance();
    if (slides.length <= 1) return;
    autoTimerRef.current = setInterval(() => {
      // Side effects (scrolling) stay out of the state updater so they run exactly once.
      const next = (activeIndexRef.current + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
      setIndex(next);
    }, HERO_AUTO_ADVANCE_MS);
  }, [slides.length, cardWidth, setIndex, stopAutoAdvance]);

  useEffect(() => {
    restartAutoAdvance();
    return stopAutoAdvance;
  }, [restartAutoAdvance, stopAutoAdvance]);

  // Slides are built from async data, so the list can shrink after the user has scrolled.
  useEffect(() => {
    if (activeIndexRef.current >= slides.length && slides.length) {
      setIndex(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [slides.length, setIndex]);

  const syncIndexFromOffset = (event) => {
    const raw = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    const index = Math.min(Math.max(raw, 0), Math.max(slides.length - 1, 0));
    setIndex(index);
  };

  const handleMomentumEnd = (event) => {
    syncIndexFromOffset(event);
    restartAutoAdvance();
  };

  const goToSlide = useCallback((index) => {
    if (!slides.length) return;
    const next = (index + slides.length) % slides.length;
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * cardWidth, animated: true });
    restartAutoAdvance();
  }, [cardWidth, restartAutoAdvance, setIndex, slides.length]);

  return (
    <View style={styles.wrap}>
      <View style={styles.heroHeader}>
        <Text style={styles.heroHeaderTitle}>Today on UniHelp</Text>
        {slides.length > 1 ? <Text style={styles.heroHeaderMeta}>{activeIndex + 1} of {slides.length}</Text> : null}
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={stopAutoAdvance}
        onScrollEndDrag={restartAutoAdvance}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {slides.map((slide) => {
          const accent = HERO_ACCENTS[slide.slide] || { tint: colors.brandLight, fg: colors.brandText };
          return (
            <View key={slide.slide} style={{ width: cardWidth }}>
              <Pressable
                onPress={() => router.navigate(slide.cta.route)}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${slide.eyebrow}. ${slide.title}. ${slide.cta.label}`}
              >
                <View style={[styles.softCircle, { backgroundColor: accent.soft || accent.tint }]} />
                <View style={styles.imagePanel} pointerEvents="none">
                  <ImageBackground source={accent.image || IMAGES.community} style={styles.image} resizeMode="cover">
                    <LinearGradient
                      colors={['rgba(255,255,255,0.1)', colors.surface]}
                      start={{ x: 1, y: 0 }}
                      end={{ x: 0, y: 0 }}
                      style={styles.imageOverlay}
                    />
                  </ImageBackground>
                </View>
                <View style={styles.body}>
                  <View>
                    <View style={styles.topRow}>
                      <View style={[styles.iconChip, { backgroundColor: accent.tint }]}>
                        <Ionicons name={slide.icon} size={17} color={accent.fg} />
                      </View>
                      <Text style={styles.label}>{slide.eyebrow}</Text>
                    </View>

                    <Text style={styles.title} numberOfLines={2}>{slide.title}</Text>
                    <Text style={styles.stat} numberOfLines={2}>{slide.stat}</Text>
                  </View>

                  <View style={styles.bottomRow}>
                    <View style={[styles.ctaButton, { backgroundColor: accent.tint }]}>
                      <Text style={[styles.ctaText, { color: accent.fg }]}>{slide.cta.label}</Text>
                      <Ionicons name="arrow-forward" size={13} color={accent.fg} />
                    </View>

                    {slides.length > 1 ? (
                      <View style={styles.controls}>
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation?.();
                            goToSlide(activeIndex - 1);
                          }}
                          style={styles.controlButton}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Previous home banner"
                        >
                          <Ionicons name="chevron-back" size={16} color={colors.textSecondary || colors.grey} />
                        </Pressable>
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation?.();
                            goToSlide(activeIndex + 1);
                          }}
                          style={styles.controlButton}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Next home banner"
                        >
                          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary || colors.grey} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      {slides.length > 1 ? (
        <View style={styles.dotsRow}>
          {slides.map((slide, index) => {
            const accent = HERO_ACCENTS[slide.slide] || { fg: colors.brandText };
            const active = activeIndex === index;
            return (
              <Pressable
                key={`${slide.slide}-dot`}
                onPress={() => goToSlide(index)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Show banner ${index + 1}`}
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.dot, active && styles.dotActive, active && { backgroundColor: accent.fg }]} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

// Horizontal, virtualised, load-as-you-scroll row used by every Discover section.
function DiscoverRow({ data, renderItem, onEndReached, hasMore, loadingMore, styles, colors }) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={itemKey}
      renderItem={({ item }) => renderItem(item)}
      showsHorizontalScrollIndicator={false}
      style={styles.discoveryListWrap}
      contentContainerStyle={styles.discoveryListContent}
      onEndReached={hasMore ? onEndReached : undefined}
      onEndReachedThreshold={0.6}
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      removeClippedSubviews
      ListFooterComponent={
        hasMore ? (
          <View style={styles.discoveryFooterLoader}>
            {loadingMore ? <ActivityIndicator size="small" color={colors.brand} /> : null}
          </View>
        ) : null
      }
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const premiumUnlocked = isPremiumActive(profile);

  const [streakCount, setStreakCount] = useState(0);
  const [heroContent, setHeroContent] = useState({ announcements: [], notes: [], questions: [] });
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [discoverData, setDiscoverData] = useState({
    hostels: [],
    friends: [],
    products: [],
    loading: true,
    error: null,
  });
  const [visibleCounts, setVisibleCounts] = useState({
    hostels: DISCOVER_PAGE,
    friends: DISCOVER_PAGE,
    products: DISCOVER_PAGE,
  });
  const [friendsMayHaveMore, setFriendsMayHaveMore] = useState(false);
  const [loadingMoreFriends, setLoadingMoreFriends] = useState(false);
  const loadingMoreFriendsRef = useRef(false);
  const friendFetchSizeRef = useRef(FRIEND_FETCH_START);

  const heroSlides = useMemo(() => buildHeroSlides({ streakCount, ...heroContent }), [streakCount, heroContent]);

  // Reset avatar-error state whenever the source photo actually changes,
  // otherwise a newly-uploaded photo can never recover from a prior failed load.
  useEffect(() => {
    setAvatarFailed(false);
  }, [profile?.photoURL]);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const fabPan = useRef(new Animated.ValueXY({
    x: Math.max(layout.screenPadding, screenWidth - FAB_SIZE - layout.screenPadding),
    y: Math.max(insets.top + FAB_TOP_GAP, screenHeight - FAB_SIZE - FAB_BOTTOM_GAP - insets.bottom),
  })).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabPositionRef = useRef({ x: 0, y: 0 });
  const fabStartRef = useRef({ x: 0, y: 0 });
  const fabLayerSize = useRef({ width: screenWidth, height: screenHeight });
  const hasPositionedFab = useRef(false);
  const dragDistance = useRef(0);
  const insetsRef = useRef(insets);
  const routerRef = useRef(router);

  useEffect(() => {
    insetsRef.current = insets;
  }, [insets]);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Keep the latest profile available to the discover-fetch effect without
  // making the effect itself depend on the (frequently-changing) object reference.
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const clampFabPosition = useCallback((nextX, nextY) => {
    const { width, height } = fabLayerSize.current;
    const pad = layout.screenPadding;
    const minY = (insetsRef.current.top || 0) + FAB_TOP_GAP;
    const maxX = Math.max(pad, width - FAB_SIZE - pad);
    const maxY = Math.max(minY, height - FAB_SIZE - FAB_BOTTOM_GAP - (insetsRef.current.bottom || 0));
    return {
      x: Math.min(Math.max(nextX, pad), maxX),
      y: Math.min(Math.max(nextY, minY), maxY),
    };
  }, []);

  const handleFabLayerLayout = useCallback(
    (event) => {
      const { width, height } = event.nativeEvent.layout;
      if (!width || !height) return;
      fabLayerSize.current = { width, height };

      const target = hasPositionedFab.current
        ? clampFabPosition(fabPositionRef.current.x, fabPositionRef.current.y) // e.g. rotation
        : clampFabPosition(Infinity, Infinity); // first layout: bottom-right corner
      hasPositionedFab.current = true;
      fabPositionRef.current = target;
      fabPan.setValue(target);
    },
    [clampFabPosition, fabPan]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragDistance.current = 0;
        Animated.spring(fabScale, { toValue: 0.94, useNativeDriver: false, friction: 8, tension: 120 }).start();
        fabPan.stopAnimation((value) => {
          fabStartRef.current = value;
          fabPositionRef.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        dragDistance.current = Math.hypot(gesture.dx, gesture.dy);
        const clamped = clampFabPosition(fabStartRef.current.x + gesture.dx, fabStartRef.current.y + gesture.dy);
        fabPositionRef.current = clamped;
        fabPan.setValue(clamped);
      },
      onPanResponderRelease: () => {
        Animated.spring(fabScale, { toValue: 1, useNativeDriver: false, friction: 8, tension: 120 }).start();

        // A tiny movement is a tap, not a drag. The pan responder owns the whole gesture,
        // so taps are detected here (there is no inner Pressable to double-fire).
        if (dragDistance.current < 8) {
          dragDistance.current = 0;
          routerRef.current.navigate('/ai');
          return;
        }
        dragDistance.current = 0;

        // Snap to the nearest horizontal edge.
        const { width } = fabLayerSize.current;
        const pad = layout.screenPadding;
        const midX = fabPositionRef.current.x + FAB_SIZE / 2;
        const targetX = midX < width / 2 ? pad : Math.max(pad, width - FAB_SIZE - pad);
        fabPositionRef.current = { ...fabPositionRef.current, x: targetX };
        Animated.spring(fabPan.x, { toValue: targetX, useNativeDriver: false, friction: 8, tension: 80 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(fabScale, { toValue: 1, useNativeDriver: false }).start();
        dragDistance.current = 0;
      },
    })
  ).current;

  const styles = useThemeStyles((c, s, r) => ({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },

    // Draggable FAB layer
    fabLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      elevation: 1000,
    },
    // Shadow on the outer wrapper; overflow:hidden (for the gradient) lives
    // on the inner wrapper so the shadow actually renders.
    fabShadowWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
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

    // Top bar
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s.sm,
      paddingVertical: s.md,
      marginBottom: s.md,
    },
    userPill: {
      flexShrink: 1,
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
      flexShrink: 1,
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
      gap: 4,
      height: 40,
      paddingHorizontal: s.sm,
      borderRadius: 20,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
    },
    streakText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.brandText,
    },

    // Toolkit
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

    // Flash card banner
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

    // Explore Campus strip. The negative margin lets cards bleed to the screen edge, and the
    // padding lives on the CONTENT container (padding on a ScrollView's own style would clip
    // cards at the padded edge instead).
    exploreScroll: {
      marginHorizontal: -layout.screenPadding,
    },
    exploreContent: {
      paddingHorizontal: layout.screenPadding,
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
  }));

  const discoverySectionStyles = useThemeStyles((c, s, r) => ({
    discoverySection: {
      marginBottom: s.xl,
    },
    sectionMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.sm,
    },
    discoveryTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: c.ink,
      letterSpacing: -0.3,
      marginBottom: s.md,
    },
    discoverySubtitle: {
      fontSize: 15,
      fontWeight: '800',
      color: c.ink,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.brandText,
    },
    discoveryListWrap: {
      marginHorizontal: -layout.screenPadding,
    },
    discoveryListContent: {
      paddingHorizontal: layout.screenPadding,
      paddingBottom: s.xs,
    },
    discoveryFooterLoader: {
      width: 48,
      alignItems: 'center',
      justifyContent: 'center',
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
    discoveryMediaCentered: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.brandLight,
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
    initialCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initialText: {
      color: c.onBrand,
      fontSize: 26,
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

  // ---- Data ---------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      const [announcements, notes, questions, streakData] = await Promise.all([
        fetchAnnouncements(),
        fetchNotes(),
        fetchQuestions(),
        fetchDailyStreak(),
      ]);
      setHeroContent({
        announcements: Array.isArray(announcements) ? announcements : [],
        notes: Array.isArray(notes) ? notes : [],
        questions: Array.isArray(questions) ? questions : [],
      });
      if (streakData) {
        setStreakCount(streakData.streakCount || 0);
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
      setVisibleCounts({ hostels: DISCOVER_PAGE, friends: DISCOVER_PAGE, products: DISCOVER_PAGE });
      friendFetchSizeRef.current = FRIEND_FETCH_START;
      try {
        const currentProfile = profileRef.current;
        const [hostelRows, productRows, friendRows] = await Promise.all([
          fetchHostels().catch(() => []),
          fetchStudentListings().catch(() => []),
          currentProfile?.uid
            ? listSuggestedFriends({ uid: currentProfile.uid, profile: currentProfile, pageSize: FRIEND_FETCH_START }).catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!isActive) return;

        // No more 12-item cap or 4-item sample: keep everything, shuffle once so the order
        // is varied but stays stable while the user scrolls, and reveal it a page at a time.
        const hostels = shuffleSample(
          (hostelRows || []).filter((item) => item && (item.title || item.name || item.location))
        );
        const products = shuffleSample(
          (productRows || []).filter((item) => item && (item.title || item.name))
        );
        const friends = Array.isArray(friendRows) ? friendRows.filter(Boolean) : [];

        setFriendsMayHaveMore(friends.length >= FRIEND_FETCH_START);
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

  const revealMore = useCallback((kind) => {
    setVisibleCounts((prev) => ({ ...prev, [kind]: prev[kind] + DISCOVER_PAGE }));
  }, []);

  // Friends come from a service that only exposes `pageSize`, so when the local list runs out
  // we ask for a bigger page and merge in whatever is new.
  const loadMoreFriends = useCallback(async () => {
    if (loadingMoreFriendsRef.current) return;

    if (visibleCounts.friends < discoverData.friends.length) {
      revealMore('friends');
      return;
    }
    const currentProfile = profileRef.current;
    if (!friendsMayHaveMore || !currentProfile?.uid) return;

    loadingMoreFriendsRef.current = true;
    setLoadingMoreFriends(true);
    try {
      const nextSize = Math.min(friendFetchSizeRef.current * 2, FRIEND_FETCH_MAX);
      const rows = await listSuggestedFriends({ uid: currentProfile.uid, profile: currentProfile, pageSize: nextSize });
      const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
      friendFetchSizeRef.current = nextSize;

      let addedCount = 0;
      setDiscoverData((current) => {
        const seen = new Set(current.friends.map((person) => person.id || person.uid));
        const fresh = list.filter((person) => {
          const id = person.id || person.uid;
          return id && !seen.has(id);
        });
        addedCount = fresh.length;
        return fresh.length ? { ...current, friends: [...current.friends, ...fresh] } : current;
      });
      setFriendsMayHaveMore(list.length >= nextSize && nextSize < FRIEND_FETCH_MAX && addedCount > 0);
      revealMore('friends');
    } catch {
      setFriendsMayHaveMore(false);
    } finally {
      loadingMoreFriendsRef.current = false;
      setLoadingMoreFriends(false);
    }
  }, [discoverData.friends.length, friendsMayHaveMore, revealMore, visibleCounts.friends]);

  const handleStreakPress = useCallback(() => router.navigate('/streak'), [router]);

  const avatarInitial = (profile?.username || 'U').trim().charAt(0).toUpperCase();
  const showAvatarImage = !!profile?.photoURL && !avatarFailed;

  // ---- Discover cards -----------------------------------------------------

  const renderDiscoveryCard = (item, type) => {
    const s = discoverySectionStyles;

    if (type === 'hostel') {
      const price = formatPrice(item?.price || item?.rent) || 'Price available';
      const imageUrl = resolveImage(item) || IMAGES.hostel;
      return (
        <View style={s.discoveryCardShadowWrap}>
          <Pressable
            style={s.discoveryCard}
            onPress={() => router.navigate('/hostelmarketplace')}
            accessibilityRole="button"
            accessibilityLabel={`${item.title || item.name || 'Student hostel'}, ${price}`}
          >
            <Image source={typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl} style={s.discoveryMedia} resizeMode="cover" />
            <View style={s.discoveryBody}>
              <Text style={s.discoveryPrice}>{price}</Text>
              <Text style={s.discoveryName} numberOfLines={1}>{item.title || item.name || 'Student hostel'}</Text>
              <Text style={s.discoveryMeta} numberOfLines={2}>{item.location || item.area || 'Near campus'}</Text>
              <View style={s.discoveryFooter}>
                <Text style={s.miniLabel}>Hostel</Text>
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
      const personImage = resolveImage(person);
      const school = person.school || person.university || person.department || 'Student network';
      const targetId = person.id || person.uid;
      return (
        <View style={s.discoveryCardShadowWrap}>
          <Pressable
            style={s.discoveryCard}
            disabled={!targetId}
            onPress={() => targetId && router.navigate(`/view-user-profile/${targetId}`)}
            accessibilityRole="button"
            accessibilityLabel={`${personName}, ${school}`}
          >
            {personImage ? (
              <Image source={{ uri: personImage }} style={s.discoveryMedia} resizeMode="cover" />
            ) : (
              <View style={[s.discoveryMedia, s.discoveryMediaCentered]}>
                <View style={s.initialCircle}>
                  <Text style={s.initialText}>{personName[0]?.toUpperCase() || 'S'}</Text>
                </View>
              </View>
            )}
            <View style={s.discoveryBody}>
              <Text style={s.discoveryName} numberOfLines={1}>{personName}</Text>
              <Text style={s.discoveryMeta} numberOfLines={2}>{school}</Text>
              <View style={s.discoveryFooter}>
                <Text style={s.miniLabel}>Match</Text>
                <Text style={s.discoveryMeta}>{person.score ? `${person.score}%` : 'New'}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      );
    }

    const price = formatPrice(item?.price || item?.amount) || 'Price available';
    const imageUrl = resolveImage(item) || IMAGES.marketplace;
    return (
      <View style={s.discoveryCardShadowWrap}>
        <Pressable
          style={s.discoveryCard}
          onPress={() => router.navigate('/studentmarketplace')}
          accessibilityRole="button"
          accessibilityLabel={`${item.title || item.name || 'Student product'}, ${price}`}
        >
          <Image source={typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl} style={s.discoveryMedia} resizeMode="cover" />
          <View style={s.discoveryBody}>
            <Text style={s.discoveryPrice}>{price}</Text>
            <Text style={s.discoveryName} numberOfLines={1}>{item.title || item.name || 'Student product'}</Text>
            <Text style={s.discoveryMeta} numberOfLines={2}>{item.category || item.status || 'Campus listing'}</Text>
            <View style={s.discoveryFooter}>
              <Text style={s.miniLabel}>Market</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.brandText} />
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  const renderHostel = useCallback((item) => renderDiscoveryCard(item, 'hostel'), [discoverySectionStyles, colors]); // eslint-disable-line react-hooks/exhaustive-deps
  const renderFriend = useCallback((item) => renderDiscoveryCard(item, 'friend'), [discoverySectionStyles, colors]); // eslint-disable-line react-hooks/exhaustive-deps
  const renderProduct = useCallback((item) => renderDiscoveryCard(item, 'product'), [discoverySectionStyles, colors]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleHostels = useMemo(
    () => discoverData.hostels.slice(0, visibleCounts.hostels),
    [discoverData.hostels, visibleCounts.hostels]
  );
  const visibleFriends = useMemo(
    () => discoverData.friends.slice(0, visibleCounts.friends),
    [discoverData.friends, visibleCounts.friends]
  );
  const visibleProducts = useMemo(
    () => discoverData.products.slice(0, visibleCounts.products),
    [discoverData.products, visibleCounts.products]
  );

  // Filtered tools based on user roles
  const toolsList = [
    { id: 'challenge', title: 'Daily Challenge', sub: 'Build your streak', icon: 'flame', color: '#F97316', bgColor: '#FFF7ED', route: '/challenge', badge: 'HOT' },
    { id: 'cbt', title: 'CBT Practice', sub: 'Mock exams & quizzes', icon: 'school', color: '#10B981', bgColor: '#ECFDF5', route: '/cbt', badge: 'PRO' },
    { id: 'gpa-cgpa', title: 'GPA & CGPA', sub: 'Grades & progress', icon: 'stats-chart', color: '#4F46E5', bgColor: '#EEF2FF', route: '/cgpa', badge: 'POPULAR' },
    { id: 'timetable', title: 'Smart Schedule', sub: 'Class timetable', icon: 'calendar-number', color: '#EF4444', bgColor: '#FEF2F2', route: '/smart-timetable', badge: 'LIVE' },
    { id: 'formula', title: 'Formula Hub', sub: 'Math & Science', icon: 'code-working', color: '#9333EA', bgColor: '#F3E8FF', route: '/formula-hub', badge: 'GUIDE' },
    { id: 'pomodoro', title: 'Pomodoro Timer', sub: 'Focus & Productivity', icon: 'timer', color: '#F59E0B', bgColor: '#FFFAF0', route: '/pomodoroScreen', badge: 'FOCUS' },
  ].filter((tool) => isRouteAllowedForRole(tool.route, profile?.role || 'university'));

  const exploreCards = [
    { key: 'hostels', label: 'Hostels', image: IMAGES.hostel, route: '/hostelmarketplace' },
    { key: 'marketplace', label: 'Marketplace', image: IMAGES.marketplace, route: '/studentmarketplace' },
    { key: 'stories', label: 'Campus Stories', image: IMAGES.stories, route: '/stories' },
    { key: 'friends', label: 'Find Friends', image: IMAGES.community, route: '/find-friends' },
  ];

  const hostelsHaveMore = visibleCounts.hostels < discoverData.hostels.length;
  const productsHaveMore = visibleCounts.products < discoverData.products.length;
  const friendsHaveMore = visibleCounts.friends < discoverData.friends.length || friendsMayHaveMore;

  return (
    <View style={styles.root}>
      <ScreenShell showFooter={false}>
        {/* PREMIUM MARQUEE: slim, scrolling, always visible without hogging space */}
        {!premiumUnlocked ? <PremiumMarquee onPress={() => router.navigate('/premium')} /> : null}

        {/* HEADER BAR */}
        <View style={styles.headerBar}>
          <Pressable
            style={styles.userPill}
            onPress={() => router.navigate('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
          >
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
              <Text style={styles.greetingName} numberOfLines={1}>
                {profile?.username ? profile.username : 'Student'}
              </Text>
            </View>
          </Pressable>

          <View style={styles.topActions}>
            <Pressable
              style={styles.iconBadgeBtn}
              onPress={handleStreakPress}
              accessibilityRole="button"
              accessibilityLabel={`${streakCount} day streak`}
            >
              <Text style={styles.streakText}>{streakCount} Day Streak</Text>
              <Ionicons name="flame" size={20} color={colors.orange} />
            </Pressable>
          </View>
        </View>

        {/* SMART STUDY HERO: one message at a time, user-swipeable */}
        <HeroCarousel slides={heroSlides} router={router} />

        {/* ACADEMIC TOOLKIT */}
        <View>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Academic Toolkit</Text>
            <Pressable
              style={({ pressed }) => [styles.seeAllBtn, pressed && { opacity: 0.75 }]}
              onPress={() => router.navigate('/toolScreen')}
              accessibilityRole="button"
            >
              <Text style={styles.seeAllText}>All Tools</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.brandText} />
            </Pressable>
          </View>

          <View style={styles.toolGrid}>
            {toolsList.map((tool) => (
              <Pressable
                key={tool.id}
                style={({ pressed }) => [styles.toolCard, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
                onPress={() => router.navigate(tool.route)}
                accessibilityRole="button"
                accessibilityLabel={`${tool.title}. ${tool.sub}`}
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
          style={({ pressed }) => [styles.flashBanner, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
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

        {/* EXPLORE CAMPUS */}
        <View style={{ marginBottom: layout.screenPadding }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Explore Campus</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.exploreScroll}
            contentContainerStyle={styles.exploreContent}
          >
            {exploreCards.map((card) => (
              <Pressable
                key={card.key}
                style={styles.horizontalCard}
                onPress={() => router.navigate(card.route)}
                accessibilityRole="button"
                accessibilityLabel={card.label}
              >
                <ImageBackground source={card.image} style={styles.horizontalBg}>
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.horizontalOverlay}>
                    <Text style={styles.horizontalTitle}>{card.label}</Text>
                    <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
                  </LinearGradient>
                </ImageBackground>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* DISCOVER: endless, load-as-you-scroll rows */}
        <View style={discoverySectionStyles.discoverySection}>
          <Text style={discoverySectionStyles.discoveryTitle}>Discover</Text>

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
                  <Text style={discoverySectionStyles.discoverySubtitle}>Hostels</Text>
                  <Pressable onPress={() => router.navigate('/hostelmarketplace')} accessibilityRole="button">
                    <Text style={discoverySectionStyles.metaText}>View all</Text>
                  </Pressable>
                </View>
                {visibleHostels.length ? (
                  <DiscoverRow
                    data={visibleHostels}
                    renderItem={renderHostel}
                    hasMore={hostelsHaveMore}
                    onEndReached={() => revealMore('hostels')}
                    styles={discoverySectionStyles}
                    colors={colors}
                  />
                ) : (
                  <View style={discoverySectionStyles.discoveryPlaceholder}>
                    <Text style={discoverySectionStyles.discoveryPlaceholderText}>No hostels are available right now.</Text>
                  </View>
                )}
              </View>

              <View>
                <View style={discoverySectionStyles.sectionMeta}>
                  <Text style={discoverySectionStyles.discoverySubtitle}>Friend suggestions</Text>
                  <Pressable onPress={() => router.navigate('/find-friends')} accessibilityRole="button">
                    <Text style={discoverySectionStyles.metaText}>Connect</Text>
                  </Pressable>
                </View>
                {visibleFriends.length ? (
                  <DiscoverRow
                    data={visibleFriends}
                    renderItem={renderFriend}
                    hasMore={friendsHaveMore}
                    loadingMore={loadingMoreFriends}
                    onEndReached={loadMoreFriends}
                    styles={discoverySectionStyles}
                    colors={colors}
                  />
                ) : (
                  <View style={discoverySectionStyles.discoveryPlaceholder}>
                    <Text style={discoverySectionStyles.discoveryPlaceholderText}>Your network is warming up. Check back soon.</Text>
                  </View>
                )}
              </View>

              <View>
                <View style={discoverySectionStyles.sectionMeta}>
                  <Text style={discoverySectionStyles.discoverySubtitle}>Marketplace</Text>
                  <Pressable onPress={() => router.navigate('/studentmarketplace')} accessibilityRole="button">
                    <Text style={discoverySectionStyles.metaText}>Browse</Text>
                  </Pressable>
                </View>
                {visibleProducts.length ? (
                  <DiscoverRow
                    data={visibleProducts}
                    renderItem={renderProduct}
                    hasMore={productsHaveMore}
                    onEndReached={() => revealMore('products')}
                    styles={discoverySectionStyles}
                    colors={colors}
                  />
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

      {/*
        Draggable "Ask AI" button. Sibling of ScreenShell, so it is independent of however
        ScreenShell lays out or scrolls its content. `box-none` lets touches fall through the
        layer everywhere except on the button itself.
      */}
      <View style={styles.fabLayer} pointerEvents="box-none" onLayout={handleFabLayerLayout}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ask AI"
          onAccessibilityTap={() => router.navigate('/ai')}
          style={[
            styles.fabShadowWrap,
            {
              opacity: 1,
              transform: [{ translateX: fabPan.x }, { translateY: fabPan.y }, { scale: fabScale }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.fab}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Ionicons name="sparkles" size={18} color={colors.onBrand} />
              <Text style={styles.fabText}>Ask</Text>
            </LinearGradient>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}