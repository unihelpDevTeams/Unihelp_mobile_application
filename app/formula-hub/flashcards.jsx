import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  ScrollView,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useFormulas } from '../../hooks/useFormulas';
import ScreenShell from '../../src/shared/components/ScreenShell';
import FormulaMath from '../../src/shared/components/FormulaMath';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { typography, borderRadius, shadows } from '../../src/shared/theme';

// Smooth cross-fade / resize whenever a layout-affecting state flips (Android needs opt-in).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SWIPE_OUT_DURATION = 220;
const SEARCH_DEBOUNCE_MS = 250;

const shuffleArray = (items = []) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const safeHaptic = (fn) => {
  try {
    fn();
  } catch {
    // Haptics can silently fail on unsupported devices/simulators — never block the UI for it.
  }
};

export default function FlashCardsPage() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [reloadKey, setReloadKey] = useState(0);
  const { formulas, loading, error } = useFormulas(reloadKey);

  const [activeSubject, setActiveSubject] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Debounce search input — filtering 2,000+ formulas on every keystroke would jank.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Smooth transition between loading skeleton -> content.
  useEffect(() => {
    if (!loading) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [loading]);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const entranceAnim = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const shuffleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;
  const hintFloat = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0.4)).current;
  const isAnimatingRef = useRef(false);

  const subjects = useMemo(() => {
    const allSubjects = formulas.map((f) => f.subject).filter(Boolean);
    const unique = Array.from(new Set(allSubjects)).sort();
    return ['All', ...unique];
  }, [formulas]);

  const randomizedFormulas = useMemo(() => shuffleArray(formulas), [formulas]);

  // Filtered and intentionally randomized list
  const activeFormulas = useMemo(() => {
    const normalizedQuery = search.toLowerCase();
    let filtered =
      activeSubject === 'All'
        ? randomizedFormulas
        : randomizedFormulas.filter((f) => f.subject === activeSubject);

    if (normalizedQuery) {
      filtered = filtered.filter((formula) =>
        [formula.title, formula.subject, formula.category, formula.explanation]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      );
    }

    if (isShuffled) {
      filtered = shuffleArray(filtered);
    }

    return filtered;
  }, [activeSubject, isShuffled, randomizedFormulas, search]);

  const currentFormula = activeFormulas[currentIndex];
  const nextFormula = activeFormulas[currentIndex + 1];
  const total = activeFormulas.length;
  const progress = total > 0 ? (currentIndex + 1) / total : 0;

  // Always-fresh snapshot for gesture-handler closures created once via useRef (avoids stale state).
  const liveRef = useRef({ currentIndex, total, width });
  liveRef.current = { currentIndex, total, width };

  const dismissSwipeHint = useCallback(() => {
    setHasInteracted((prev) => {
      if (prev) return prev;
      Animated.timing(hintAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      return true;
    });
  }, [hintAnim]);

  // One-time swipe affordance: fades in shortly after the deck is ready, gently floats, then
  // disappears for good the first time the person swipes, taps, or uses the nav buttons.
  useEffect(() => {
    if (loading || total <= 1 || hasInteracted) return undefined;

    const showTimer = setTimeout(() => {
      Animated.timing(hintAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }, 500);

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintFloat, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(hintFloat, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    return () => {
      clearTimeout(showTimer);
      floatLoop.stop();
    };
  }, [loading, total, hasInteracted, hintAnim, hintFloat]);

  // Loading skeleton pulse
  useEffect(() => {
    if (!loading) return undefined;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(skeletonPulse, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [loading, skeletonPulse]);

  // Reset the deck when the filtered set changes underneath the user
  useEffect(() => {
    isAnimatingRef.current = false;
    setCurrentIndex(0);
    setIsFlipped(false);
    flipAnim.setValue(0);
    swipeX.setValue(0);
    entranceAnim.setValue(0);
    Animated.spring(entranceAnim, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [activeSubject, isShuffled, search, flipAnim, swipeX, entranceAnim]);

  // Guard against an out-of-range index (e.g. the list shrank)
  useEffect(() => {
    if (total > 0 && currentIndex >= total) {
      setCurrentIndex(total - 1);
      setIsFlipped(false);
      flipAnim.setValue(0);
    }
  }, [total, currentIndex, flipAnim]);

  // Animate the progress bar smoothly instead of snapping
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width can't use the native driver
    }).start();
  }, [progress, progressAnim]);

  const navigate = useCallback(
    (delta) => {
      if (isAnimatingRef.current) return;
      const { currentIndex: idx, total: count, width: viewportWidth } = liveRef.current;
      const nextIndex = idx + delta;

      if (nextIndex < 0 || nextIndex >= count) {
        // Nothing to move to — snap back with a soft bounce so it's clear this is the end.
        Animated.spring(swipeX, { toValue: 0, friction: 6, tension: 90, useNativeDriver: true }).start();
        return;
      }

      isAnimatingRef.current = true;
      dismissSwipeHint();
      safeHaptic(() => Haptics.selectionAsync());

      Animated.timing(swipeX, {
        toValue: delta > 0 ? -viewportWidth * 1.15 : viewportWidth * 1.15,
        duration: SWIPE_OUT_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex(nextIndex);
        setIsFlipped(false);
        flipAnim.setValue(0);
        // Enter from the opposite side, then spring into place.
        swipeX.setValue(delta > 0 ? viewportWidth * 1.15 : -viewportWidth * 1.15);
        entranceAnim.setValue(0.6);
        Animated.parallel([
          Animated.spring(swipeX, { toValue: 0, friction: 9, tension: 90, useNativeDriver: true }),
          Animated.spring(entranceAnim, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
        ]).start(() => {
          isAnimatingRef.current = false;
        });
      });
    },
    [swipeX, flipAnim, entranceAnim, dismissSwipeHint]
  );

  // Keep a ref to the latest `navigate` so the PanResponder (created once) never closes over
  // stale state — same pattern used elsewhere in the app for gesture/callback refs.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const nextCard = () => navigateRef.current(1);
  const prevCard = () => navigateRef.current(-1);

  const panResponder = useRef(
    PanResponder.create({
      // "Capture" variants let this view claim the gesture mid-drag even though the card's
      // inner Pressable (for flipping) sees the touch first — so taps still flip normally,
      // and only genuine horizontal drags turn into a swipe.
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderGrant: () => {
        swipeX.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        swipeX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        const { currentIndex: idx, total: count, width: viewportWidth } = liveRef.current;
        const threshold = viewportWidth * 0.25;

        if (gesture.dx <= -threshold && idx < count - 1) {
          navigateRef.current(1);
        } else if (gesture.dx >= threshold && idx > 0) {
          navigateRef.current(-1);
        } else {
          Animated.spring(swipeX, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }).start();
      },
    })
  ).current;

  const flipCard = () => {
    dismissSwipeHint();
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

    Animated.sequence([
      Animated.timing(pressAnim, { toValue: 0.97, duration: 90, useNativeDriver: true }),
      Animated.spring(pressAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
    ]).start();

    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsFlipped((prev) => !prev));
  };

  const toggleShuffle = () => {
    dismissSwipeHint();
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    shuffleAnim.setValue(0);
    Animated.spring(shuffleAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    setIsShuffled((value) => !value);
  };

  const selectSubject = (subject) => {
    if (subject === activeSubject) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    safeHaptic(() => Haptics.selectionAsync());
    setActiveSubject(subject);
  };

  // --- Interpolations -------------------------------------------------

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  const rotateFromSwipe = swipeX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const frontAnimatedStyle = { transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ perspective: 1200 }, { rotateY: backInterpolate }] };

  const cardMotionStyle = {
    opacity: entranceAnim,
    transform: [
      { translateX: swipeX },
      { rotate: rotateFromSwipe },
      {
        scale: Animated.multiply(
          pressAnim,
          entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] })
        ),
      },
    ],
  };

  const shuffleIconStyle = {
    transform: [
      { rotate: shuffleAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
      { scale: shuffleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] }) },
    ],
  };

  const hintStyle = {
    opacity: hintAnim,
    transform: [
      { translateY: hintAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
      { translateX: hintFloat.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) },
    ],
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const styles = useThemeStyles(
    (c, s) => ({
      container: {
        flex: 1,
        backgroundColor: c.background,
      },
      filterScroll: {
        paddingHorizontal: s.md,
        paddingBottom: s.md,
        maxHeight: 50,
      },
      filterPill: {
        paddingHorizontal: s.lg,
        paddingVertical: s.sm,
        borderRadius: borderRadius.full,
        backgroundColor: c.surfaceSecondary,
        marginRight: s.sm,
        borderWidth: 1,
        borderColor: c.borderDefault,
        height: 36,
        justifyContent: 'center',
      },
      filterPillActive: {
        backgroundColor: c.brand,
        borderColor: c.brand,
      },
      filterPillText: {
        ...typography.sm,
        ...typography.medium,
        color: c.textSecondary,
      },
      filterPillTextActive: {
        color: c.onBrand,
      },
      controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: s.lg,
        marginBottom: s.md,
      },
      progressGroup: {
        flex: 1,
        marginRight: s.md,
      },
      progressText: {
        ...typography.sm,
        ...typography.bold,
        color: c.textSecondary,
      },
      searchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.sm,
        paddingHorizontal: s.md,
        paddingVertical: s.sm,
        borderRadius: borderRadius.xl,
        backgroundColor: c.surfacePrimary,
        borderWidth: 1,
        borderColor: c.borderDefault,
        marginHorizontal: s.lg,
        marginBottom: s.md,
      },
      searchInput: {
        flex: 1,
        color: c.textPrimary,
        fontSize: 14,
        paddingVertical: s.sm,
      },
      progressTrack: {
        height: 6,
        borderRadius: borderRadius.full,
        backgroundColor: c.surfaceSecondary,
        overflow: 'hidden',
        marginTop: s.sm,
        borderWidth: 1,
        borderColor: c.borderDefault,
      },
      progressFill: {
        height: '100%',
        borderRadius: borderRadius.full,
        backgroundColor: c.brand,
      },
      shuffleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isShuffled ? c.brandLight : c.surfaceSecondary,
        paddingHorizontal: s.md,
        paddingVertical: s.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: isShuffled ? c.brandBorder : c.borderDefault,
      },
      shuffleText: {
        ...typography.sm,
        ...typography.medium,
        color: isShuffled ? c.brand : c.textSecondary,
        marginLeft: s.xs,
      },
      cardStage: {
        flex: 1,
        marginTop: s.md,
      },
      // Deck wrapper: holds the peeking "next card" plus the interactive card on top of it.
      cardDeck: {
        width: width - s.lg * 2,
        height: Math.min(390, Math.max(330, width * 0.92)),
        alignSelf: 'center',
      },
      cardContainer: {
        ...StyleSheet.absoluteFillObject,
      },
      stackCard: {
        position: 'absolute',
        top: 14,
        left: 10,
        right: 10,
        bottom: -8,
        borderRadius: borderRadius['3xl'],
        backgroundColor: c.surfaceSecondary,
        borderWidth: 1,
        borderColor: c.borderDefault,
        transform: [{ rotate: '-2deg' }],
        ...shadows.md,
      },
      card: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: c.surfacePrimary,
        borderRadius: borderRadius['3xl'],
        ...shadows.lg,
        padding: s['2xl'],
        backfaceVisibility: 'hidden',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderColor: c.borderDefault,
        borderWidth: 1,
        overflow: 'hidden',
      },
      cardBack: {
        backgroundColor: c.brandLight,
        borderColor: c.brandBorder,
      },
      cardLabel: {
        ...typography.xs,
        ...typography.bold,
        color: c.brandText,
        textTransform: 'uppercase',
        letterSpacing: 1,
      },
      cardTopRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      cardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.xs,
        paddingHorizontal: s.md,
        paddingVertical: s.xs,
        borderRadius: borderRadius.full,
        backgroundColor: c.brandLight,
        borderWidth: 1,
        borderColor: c.brandBorder,
      },
      cardBadgeBack: {
        backgroundColor: c.surfacePrimary,
      },
      cardCounter: {
        ...typography.xs,
        ...typography.bold,
        color: c.textTertiary,
      },
      cardBody: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: s.lg,
      },
      formulaTitle: {
        ...typography['5xl'],
        ...typography.bold,
        color: c.textPrimary,
        textAlign: 'center',
        lineHeight: 30,
      },
      formulaSubject: {
        ...typography.sm,
        ...typography.semibold,
        color: c.brandText,
        marginTop: s.md,
        paddingHorizontal: s.md,
        paddingVertical: s.xs,
        borderRadius: borderRadius.full,
        backgroundColor: c.brandLight,
        overflow: 'hidden',
      },
      explanation: {
        ...typography.md,
        color: c.textPrimary,
        textAlign: 'center',
        lineHeight: 24,
        marginTop: s.lg,
      },
      hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.xs,
        paddingHorizontal: s.md,
        paddingVertical: s.sm,
        borderRadius: borderRadius.full,
        backgroundColor: c.surfaceSecondary,
        borderWidth: 1,
        borderColor: c.borderDefault,
      },
      hintText: {
        ...typography.xs,
        ...typography.semibold,
        color: c.textSecondary,
      },
      swipeHintBubble: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.xs,
        marginTop: s.md,
        paddingHorizontal: s.md,
        paddingVertical: s.xs,
        borderRadius: borderRadius.full,
        backgroundColor: c.surfaceSecondary,
      },
      swipeHintText: {
        ...typography.xs,
        ...typography.medium,
        color: c.textSecondary,
      },
      navRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: s.xl,
        gap: s.md,
      },
      navButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: c.surfacePrimary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.md,
        borderWidth: 1,
        borderColor: c.borderDefault,
      },
      navButtonDisabled: {
        opacity: 0.5,
      },
      navButtonPressed: {
        transform: [{ scale: 0.92 }],
      },
      flipButton: {
        paddingHorizontal: s.xl,
        paddingVertical: s.md,
        borderRadius: borderRadius.full,
        backgroundColor: c.brand,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadows.brandLight,
        minWidth: 148,
        justifyContent: 'center',
      },
      flipButtonPressed: {
        transform: [{ scale: 0.96 }],
      },
      flipText: {
        ...typography.md,
        ...typography.bold,
        color: c.onBrand,
        marginLeft: s.sm,
      },
      emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: s.xl,
      },
      emptyText: {
        ...typography.lg,
        color: c.textSecondary,
        marginTop: s.md,
        textAlign: 'center',
      },
      errorCard: {
        backgroundColor: c.dangerLight,
        borderWidth: 1,
        borderColor: c.dangerBorder,
        borderRadius: borderRadius.xl,
        padding: s.lg,
        marginHorizontal: s.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.sm,
      },
      errorText: {
        flex: 1,
        ...typography.sm,
        ...typography.semibold,
        color: c.danger,
      },
      retryButton: {
        backgroundColor: c.danger,
        borderRadius: borderRadius.md,
        paddingHorizontal: s.md,
        paddingVertical: s.sm,
      },
      retryText: {
        ...typography.xs,
        ...typography.bold,
        color: c.onBrand,
      },
      cardStageInner: {
        flex: 1,
        marginTop: s.md,
      },
      formulaWrap: {
        minHeight: 118,
        width: '100%',
        justifyContent: 'center',
        borderRadius: borderRadius.xl,
        backgroundColor: c.surfacePrimary,
        borderWidth: 1,
        borderColor: c.brandBorder,
        paddingHorizontal: s.md,
      },
      skeletonCard: {
        width: width - s.lg * 2,
        height: Math.min(390, Math.max(330, width * 0.92)),
        borderRadius: borderRadius['3xl'],
        backgroundColor: c.surfaceSecondary,
        borderWidth: 1,
        borderColor: c.borderDefault,
        padding: s['2xl'],
        justifyContent: 'center',
        alignItems: 'center',
        gap: s.md,
      },
      skeletonBadge: {
        width: 90,
        height: 22,
        borderRadius: borderRadius.full,
        backgroundColor: c.surfacePrimary,
      },
      skeletonLineLg: {
        width: '70%',
        height: 22,
        borderRadius: borderRadius.md,
        backgroundColor: c.surfacePrimary,
      },
      skeletonLineSm: {
        width: '45%',
        height: 16,
        borderRadius: borderRadius.md,
        backgroundColor: c.surfacePrimary,
      },
    }),
    [isShuffled, width]
  );

  if (loading) {
    return (
      <ScreenShell title="Flash Cards" subtitle="Master formulas quickly." showBack scrollable={false}>
        <View style={styles.emptyState}>
          <Animated.View style={[styles.skeletonCard, { opacity: skeletonPulse }]}>
            <View style={styles.skeletonBadge} />
            <View style={styles.skeletonLineLg} />
            <View style={styles.skeletonLineSm} />
          </Animated.View>
          <Text style={styles.emptyText}>Preparing your flash cards…</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={colors.statusBar === 'light' ? 'light-content' : 'dark-content'} />
      <ScreenShell title="Flash Cards" subtitle="Test your formula memory." showBack scrollable={false}>
        <View style={styles.searchCard}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search formulas, subjects, or topics"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchInput ? (
            <TouchableOpacity
              onPress={() => setSearchInput('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Subjects Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {subjects.map((subject) => (
            <Pressable
              key={subject}
              onPress={() => selectSubject(subject)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${subject}`}
              style={({ pressed }) => [
                styles.filterPill,
                activeSubject === subject && styles.filterPillActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeSubject === subject && styles.filterPillTextActive,
                ]}
              >
                {subject}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]}
              onPress={() => setReloadKey((key) => key + 1)}
              accessibilityRole="button"
              accessibilityLabel="Retry loading formulas"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : total > 0 ? (
          <View style={styles.cardStage}>
            <View style={styles.controlsRow}>
              <View style={styles.progressGroup}>
                <Text style={styles.progressText}>
                  {currentIndex + 1} of {total}
                </Text>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.shuffleBtn, pressed && { opacity: 0.8 }]}
                onPress={toggleShuffle}
                accessibilityRole="button"
                accessibilityLabel={isShuffled ? 'Turn off shuffle' : 'Shuffle cards'}
              >
                <Animated.View style={shuffleIconStyle}>
                  <Ionicons name="shuffle" size={16} color={isShuffled ? colors.brand : colors.textSecondary} />
                </Animated.View>
                <Text style={styles.shuffleText}>Shuffle</Text>
              </Pressable>
            </View>

            {/* Flash Card deck: a static peek of the next card sits behind the live one */}
            <View style={styles.cardDeck}>
              {nextFormula ? <View style={styles.stackCard} pointerEvents="none" /> : null}

              <Animated.View {...panResponder.panHandlers} style={[styles.cardContainer, cardMotionStyle]}>
                {/* Front side */}
                <Animated.View pointerEvents={isFlipped ? 'none' : 'auto'} style={[styles.card, frontAnimatedStyle]}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardBadge}>
                      <Ionicons name="help-circle-outline" size={15} color={colors.brand} />
                      <Text style={styles.cardLabel}>Question</Text>
                    </View>
                    <Text style={styles.cardCounter}>
                      {currentIndex + 1}/{total}
                    </Text>
                  </View>
                  <Pressable
                    onPress={flipCard}
                    style={styles.cardBody}
                    accessibilityRole="button"
                    accessibilityLabel="Flip card to reveal the answer"
                  >
                    <Text style={styles.formulaTitle}>{currentFormula?.title || 'Untitled Formula'}</Text>
                    <Text style={styles.formulaSubject}>{currentFormula?.subject || 'General'}</Text>
                  </Pressable>
                  <View style={styles.hintRow}>
                    <Ionicons name="finger-print-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.hintText}>Tap card to reveal answer</Text>
                  </View>
                </Animated.View>

                {/* Back side */}
                <Animated.View
                  pointerEvents={isFlipped ? 'auto' : 'none'}
                  style={[styles.card, styles.cardBack, backAnimatedStyle]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={[styles.cardBadge, styles.cardBadgeBack]}>
                      <Ionicons name="checkmark-circle-outline" size={15} color={colors.brand} />
                      <Text style={styles.cardLabel}>Answer</Text>
                    </View>
                    <Text style={styles.cardCounter}>
                      {currentIndex + 1}/{total}
                    </Text>
                  </View>
                  <Pressable
                    onPress={flipCard}
                    style={styles.cardBody}
                    accessibilityRole="button"
                    accessibilityLabel="Flip card back to the question"
                  >
                    <View style={styles.formulaWrap}>
                      {currentFormula?.formula ? (
                        <FormulaMath
                          source={currentFormula.formula}
                          color={colors.textPrimary}
                          backgroundColor={colors.surfacePrimary}
                          size="display"
                        />
                      ) : (
                        <Text style={styles.explanation}>No formula expression was provided.</Text>
                      )}
                    </View>
                    {currentFormula?.explanation ? (
                      <Text style={styles.explanation} numberOfLines={3}>
                        {currentFormula.explanation}
                      </Text>
                    ) : null}
                  </Pressable>
                  <View style={styles.hintRow}>
                    <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.hintText}>Tap card to return</Text>
                  </View>
                </Animated.View>
              </Animated.View>
            </View>

            <Animated.View style={[styles.swipeHintBubble, hintStyle]} pointerEvents="none">
              <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
              <Text style={styles.swipeHintText}>Swipe to browse cards</Text>
            </Animated.View>

            {/* Navigation Controls */}
            <View style={styles.navRow}>
              <Pressable
                onPress={prevCard}
                disabled={currentIndex === 0}
                accessibilityRole="button"
                accessibilityLabel="Previous card"
                style={({ pressed }) => [
                  styles.navButton,
                  currentIndex === 0 && styles.navButtonDisabled,
                  pressed && currentIndex !== 0 && styles.navButtonPressed,
                ]}
              >
                <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
              </Pressable>

              <Pressable
                onPress={flipCard}
                accessibilityRole="button"
                accessibilityLabel={isFlipped ? 'Show question' : 'Flip card'}
                style={({ pressed }) => [styles.flipButton, pressed && styles.flipButtonPressed]}
              >
                <Ionicons name="sync" size={20} color={colors.onBrand} />
                <Text style={styles.flipText}>{isFlipped ? 'Show Front' : 'Flip Card'}</Text>
              </Pressable>

              <Pressable
                onPress={nextCard}
                disabled={currentIndex === total - 1}
                accessibilityRole="button"
                accessibilityLabel="Next card"
                style={({ pressed }) => [
                  styles.navButton,
                  currentIndex === total - 1 && styles.navButtonDisabled,
                  pressed && currentIndex !== total - 1 && styles.navButtonPressed,
                ]}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={48} color={colors.borderDefault} />
            <Text style={styles.emptyText}>No formulas found.</Text>
          </View>
        )}
      </ScreenShell>
    </View>
  );
}