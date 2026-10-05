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
  Modal,
  StyleSheet,
  ScrollView,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Platform,
  Keyboard,
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

// Android needs an opt-in for LayoutAnimation on the old architecture. On the new
// architecture (Fabric) the call is a harmless no-op, so we guard against warnings.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !global.nativeFabricUIManager
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SWIPE_OUT_DURATION = 220;
const SEARCH_DEBOUNCE_MS = 250;
const SWIPE_VELOCITY = 0.5;
const EMPTY_LIST = [];

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
    const result = fn();
    result?.catch?.(() => {});
  } catch {
    // Haptics can fail on unsupported devices/simulators — never block the UI for it.
  }
};

const formulaKey = (formula) => String(formula?.id ?? formula?.title ?? '');

export default function FlashCardsPage() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  // The window height shrinks when the keyboard opens (Android adjustResize), which used to
  // shrink the card. Remember the tallest height seen for this width and size from that.
  const viewportRef = useRef({ width, height });
  if (viewportRef.current.width !== width) {
    viewportRef.current = { width, height }; // rotation / resize: start over
  } else if (height > viewportRef.current.height) {
    viewportRef.current.height = height;
  }
  const cardHeight = Math.min(400, Math.max(290, viewportRef.current.height - 380));

  const [reloadKey, setReloadKey] = useState(0);
  const { formulas: hookFormulas, loading, error } = useFormulas(reloadKey);
  const rawFormulas = hookFormulas || EMPTY_LIST;

  // If the hook hands back a fresh array on every render, everything derived from it (and the
  // deck-reset effect below) would re-fire constantly. Keep a stable reference instead.
  const formulaSignature = `${rawFormulas.length}:${formulaKey(rawFormulas[0])}:${formulaKey(
    rawFormulas[rawFormulas.length - 1]
  )}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formulas = useMemo(() => rawFormulas, [formulaSignature, reloadKey]);

  const [activeSubject, setActiveSubject] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  // { [formulaKey]: 'known' | 'review' }
  const [mastery, setMastery] = useState({});

  // Debounce search — filtering thousands of formulas on every keystroke would jank.
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

  const swipeX = useRef(new Animated.Value(0)).current;
  const entranceAnim = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const shuffleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;
  const hintFloat = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0.4)).current;

  // Refs used by gesture handlers / async callbacks so they never read stale state.
  const isAnimatingRef = useRef(false);
  const hintDismissedRef = useRef(false);
  // Bumped whenever the deck resets or the screen unmounts, so in-flight swipe animations
  // can tell their completion callbacks are outdated and must not touch state.
  const deckTokenRef = useRef(0);

  const subjects = useMemo(() => {
    const counts = new Map();
    formulas.forEach((f) => {
      if (f.subject) counts.set(f.subject, (counts.get(f.subject) || 0) + 1);
    });
    const sorted = Array.from(counts.keys()).sort();
    return [
      { name: 'All', count: formulas.length },
      ...sorted.map((name) => ({ name, count: counts.get(name) })),
    ];
  }, [formulas]);

  // If the active subject vanished (e.g. after a reload), fall back to "All".
  useEffect(() => {
    if (activeSubject !== 'All' && !subjects.some((s) => s.name === activeSubject)) {
      setActiveSubject('All');
    }
  }, [subjects, activeSubject]);

  const activeFormulas = useMemo(() => {
    const normalizedQuery = search.toLowerCase();
    let filtered =
      activeSubject === 'All' ? formulas : formulas.filter((f) => f.subject === activeSubject);

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
    // shuffleSeed forces a fresh shuffle every time shuffle is switched on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubject, isShuffled, shuffleSeed, formulas, search]);

  const currentFormula = activeFormulas[currentIndex];
  const nextFormula = activeFormulas[currentIndex + 1];
  const afterNextFormula = activeFormulas[currentIndex + 2];
  const total = activeFormulas.length;
  const progress = total > 0 ? Math.min(1, (currentIndex + 1) / total) : 0;

  const knownCount = useMemo(
    () => activeFormulas.reduce((n, f) => (mastery[formulaKey(f)] === 'known' ? n + 1 : n), 0),
    [activeFormulas, mastery]
  );
  const currentMastery = currentFormula ? mastery[formulaKey(currentFormula)] : undefined;

  // Always-fresh snapshot for gesture-handler closures created once via useRef.
  const liveRef = useRef({ currentIndex, total, width });
  liveRef.current = { currentIndex, total, width };

  // Side effects must not live inside a setState updater (StrictMode runs those twice),
  // so the "has the hint been dismissed" flag is a ref.
  const dismissSwipeHint = useCallback(() => {
    if (hintDismissedRef.current) return;
    hintDismissedRef.current = true;
    setHasInteracted(true);
    Animated.timing(hintAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [hintAnim]);

  // One-time swipe affordance.
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

  // On unmount, invalidate and stop any in-flight swipe animation.
  useEffect(
    () => () => {
      deckTokenRef.current += 1;
      swipeX.stopAnimation();
      entranceAnim.stopAnimation();
    },
    [swipeX, entranceAnim]
  );

  // Reset the deck whenever the underlying list changes (filter, search, shuffle, reload).
  useEffect(() => {
    deckTokenRef.current += 1; // invalidate callbacks from any swipe still in flight
    swipeX.stopAnimation();
    entranceAnim.stopAnimation();
    isAnimatingRef.current = false;
    setCurrentIndex(0);
    setAnswerVisible(false);
    swipeX.setValue(0);
    entranceAnim.setValue(0);
    Animated.spring(entranceAnim, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [activeSubject, isShuffled, shuffleSeed, search, formulas, swipeX, entranceAnim]);

  // Animate the progress bar smoothly instead of snapping
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width can't use the native driver
    }).start();
  }, [progress, progressAnim]);

  const springBack = useCallback(() => {
    Animated.spring(swipeX, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [swipeX]);

  const navigate = useCallback(
    (delta) => {
      if (isAnimatingRef.current) return;
      const { currentIndex: idx, total: count, width: viewportWidth } = liveRef.current;
      const nextIndex = idx + delta;

      if (nextIndex < 0 || nextIndex >= count) {
        springBack();
        return;
      }

      const token = deckTokenRef.current;
      isAnimatingRef.current = true;
      dismissSwipeHint();
      safeHaptic(() => Haptics.selectionAsync());

      Animated.timing(swipeX, {
        toValue: delta > 0 ? -viewportWidth * 1.15 : viewportWidth * 1.15,
        duration: SWIPE_OUT_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Deck was reset / screen left while we were animating: do nothing.
        if (!finished || token !== deckTokenRef.current) return;

        setCurrentIndex(nextIndex);
        setAnswerVisible(false);
        // Enter from the opposite side, then spring into place.
        swipeX.setValue(delta > 0 ? viewportWidth * 1.15 : -viewportWidth * 1.15);
        entranceAnim.setValue(0.6);
        Animated.parallel([
          Animated.spring(swipeX, { toValue: 0, friction: 9, tension: 90, useNativeDriver: true }),
          Animated.spring(entranceAnim, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
        ]).start(() => {
          if (token !== deckTokenRef.current) return;
          isAnimatingRef.current = false;
        });
      });
    },
    [swipeX, entranceAnim, dismissSwipeHint, springBack]
  );

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const nextCard = () => navigateRef.current(1);
  const prevCard = () => navigateRef.current(-1);

  const panResponder = useRef(
    PanResponder.create({
      // Capture variants let this view claim a horizontal drag even though the inner Pressable
      // (flip) saw the touch first — taps still flip, genuine drags swipe.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        !isAnimatingRef.current &&
        Math.abs(g.dx) > 10 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => {
        swipeX.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const { currentIndex: idx, total: count } = liveRef.current;
        const atEdge = (g.dx > 0 && idx === 0) || (g.dx < 0 && idx >= count - 1);
        // Rubber-band resistance when there is no card to swipe to.
        swipeX.setValue(atEdge ? g.dx * 0.25 : g.dx);
      },
      onPanResponderRelease: (_, g) => {
        const { currentIndex: idx, total: count, width: viewportWidth } = liveRef.current;
        const threshold = viewportWidth * 0.25;
        const goNext = g.dx <= -threshold || (g.vx < -SWIPE_VELOCITY && g.dx < -40);
        const goPrev = g.dx >= threshold || (g.vx > SWIPE_VELOCITY && g.dx > 40);

        if (goNext && idx < count - 1) {
          navigateRef.current(1);
        } else if (goPrev && idx > 0) {
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

  const revealAnswer = useCallback(() => {
    if (!currentFormula || isAnimatingRef.current) return;
    Keyboard.dismiss();
    dismissSwipeHint();
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    setAnswerVisible(true);
  }, [currentFormula, dismissSwipeHint]);

  const markCard = (status) => {
    if (!currentFormula || isAnimatingRef.current) return;
    setAnswerVisible(false);
    safeHaptic(() =>
      Haptics.notificationAsync(
        status === 'known' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      )
    );
    setMastery((prev) => ({ ...prev, [formulaKey(currentFormula)]: status }));
    if (currentIndex < total - 1) navigateRef.current(1);
  };

  const resetProgress = () => {
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    setMastery({});
  };

  const toggleShuffle = () => {
    dismissSwipeHint();
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    shuffleAnim.setValue(0);
    Animated.spring(shuffleAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    // No side effects inside the state updater (StrictMode would run it twice).
    if (!isShuffled) setShuffleSeed((seed) => seed + 1);
    setIsShuffled(!isShuffled);
  };

  const selectSubject = (subject) => {
    if (subject === activeSubject) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    safeHaptic(() => Haptics.selectionAsync());
    setActiveSubject(subject);
  };

  const clearFilters = () => {
    safeHaptic(() => Haptics.selectionAsync());
    setSearchInput('');
    setSearch('');
    setActiveSubject('All');
  };

  const pressCardIn = () =>
    Animated.spring(pressAnim, { toValue: 0.98, friction: 8, tension: 200, useNativeDriver: true }).start();
  const pressCardOut = () =>
    Animated.spring(pressAnim, { toValue: 1, friction: 8, tension: 200, useNativeDriver: true }).start();

  // --- Interpolations -------------------------------------------------

  const rotateFromSwipe = swipeX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

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

  // Subtle edge glows that follow the swipe direction.
  const nextTint = swipeX.interpolate({
    inputRange: [-width * 0.5, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const prevTint = swipeX.interpolate({
    inputRange: [0, width * 0.5],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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
      searchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.sm,
        paddingHorizontal: s.md,
        paddingVertical: s.xs,
        minHeight: 50,
        borderRadius: borderRadius.xl,
        backgroundColor: c.surfacePrimary,
        borderWidth: 1,
        borderColor: c.borderDefault,
        marginHorizontal: s.lg,
        marginBottom: s.md,
        ...shadows.sm,
      },
      searchInput: {
        flex: 1,
        color: c.textPrimary,
        fontSize: 14,
        paddingVertical: s.sm,
      },
      filterScroll: {
        flexGrow: 0,
      },
      filterContent: {
        paddingHorizontal: s.lg,
        paddingBottom: s.md,
        alignItems: 'center',
      },
      filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.xs,
        paddingHorizontal: s.md,
        borderRadius: borderRadius.full,
        backgroundColor: c.surfaceSecondary,
        marginRight: s.sm,
        borderWidth: 1,
        borderColor: c.borderDefault,
        height: 36,
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
      filterCount: {
        ...typography.xs,
        ...typography.semibold,
        color: c.textTertiary,
      },
      filterCountActive: {
        color: c.onBrand,
        opacity: 0.85,
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
      progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s.xs,
      },
      progressEyebrow: {
        ...typography.xs,
        ...typography.semibold,
        color: c.textTertiary,
        letterSpacing: 0.4,
      },
      progressText: {
        ...typography.sm,
        ...typography.bold,
        color: c.textPrimary,
      },
      progressTrack: {
        height: 7,
        borderRadius: borderRadius.full,
        backgroundColor: c.surfaceSecondary,
        overflow: 'hidden',
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
      masteryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s.lg,
        marginBottom: s.sm,
      },
      masteryChip: {
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
      answerBackdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: s.lg,
        backgroundColor: 'rgba(15,23,42,0.62)',
      },
      answerModal: {
        width: '100%',
        maxWidth: 560,
        maxHeight: '85%',
        borderRadius: borderRadius['3xl'],
        padding: s.lg,
        backgroundColor: c.surfacePrimary,
        borderWidth: 1,
        borderColor: c.borderDefault,
        ...shadows.lg,
      },
      answerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s.md,
      },
      answerHeaderCopy: { flex: 1, marginRight: s.md },
      answerEyebrow: {
        ...typography.xs,
        ...typography.bold,
        color: c.brandText,
        textTransform: 'uppercase',
        letterSpacing: 1,
      },
      answerTitle: {
        ...typography.lg,
        ...typography.extrabold,
        color: c.textPrimary,
        marginTop: 2,
      },
      answerQuestion: {
        ...typography.xs,
        ...typography.medium,
        color: c.textSecondary,
        marginTop: 2,
      },
      answerClose: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surfaceSecondary,
      },
      answerContent: { flexShrink: 1 },
      answerFormulaWrap: {
        height: Math.min(180, Math.max(120, Math.round(height * 0.2))),
        width: '100%',
        flexShrink: 0,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: borderRadius.xl,
        backgroundColor: c.brandLight,
        borderWidth: 1,
        borderColor: c.brandBorder,
        overflow: 'hidden',
      },
      answerExplanation: {
        ...typography.md,
        color: c.textPrimary,
        lineHeight: 23,
        marginTop: s.md,
      },
      answerActions: { marginTop: s.lg },
      masteryChipText: {
        ...typography.xs,
        ...typography.bold,
        color: c.brandText,
      },
      resetText: {
        ...typography.xs,
        ...typography.semibold,
        color: c.textTertiary,
      },
      cardStage: {
        flex: 1,
        marginTop: s.xs,
      },
      cardDeck: {
        width: Math.min(width - s.lg * 2, 560),
        height: cardHeight,
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
      stackCardFar: {
        top: 24,
        left: 20,
        right: 20,
        bottom: -16,
        transform: [{ rotate: '2deg' }],
        opacity: 0.7,
      },
      card: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: c.surfacePrimary,
        borderRadius: borderRadius['3xl'],
        ...shadows.lg,
        padding: s['2xl'],
        paddingTop: s.xl,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderColor: c.borderDefault,
        borderWidth: 1,
        overflow: 'hidden',
        height: cardHeight,
      },
      cardAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: c.brand,
      },
      cardEdgeGlow: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 6,
        backgroundColor: c.brand,
      },
      cardSubtleText: {
        ...typography.xs,
        ...typography.medium,
        color: c.textTertiary,
        marginTop: s.xs,
        textAlign: 'center',
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
        minHeight: 30,
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
      statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.xs,
        paddingHorizontal: s.md,
        paddingVertical: s.xs,
        borderRadius: borderRadius.full,
        backgroundColor: c.surfaceSecondary,
        borderWidth: 1,
        borderColor: c.borderDefault,
      },
      statusBadgeKnown: {
        backgroundColor: c.brand,
        borderColor: c.brand,
      },
      statusText: {
        ...typography.xs,
        ...typography.bold,
        color: c.textSecondary,
      },
      statusTextKnown: {
        color: c.onBrand,
      },
      cardBody: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: s.sm,
      },
      formulaTitle: {
        ...typography.bold,
        fontSize: 28,
        lineHeight: 34,
        color: c.textPrimary,
        textAlign: 'center',
        letterSpacing: -0.5,
      },
      tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: s.sm,
        marginTop: s.lg,
      },
      formulaSubject: {
        ...typography.sm,
        ...typography.semibold,
        color: c.brandText,
        paddingHorizontal: s.md,
        paddingVertical: s.xs,
        borderRadius: borderRadius.full,
        backgroundColor: c.brandLight,
        borderWidth: 1,
        borderColor: c.brandBorder,
        overflow: 'hidden',
      },
      formulaCategory: {
        ...typography.sm,
        ...typography.medium,
        color: c.textSecondary,
        paddingHorizontal: s.md,
        paddingVertical: s.xs,
        borderRadius: borderRadius.full,
        backgroundColor: c.surfaceSecondary,
        borderWidth: 1,
        borderColor: c.borderDefault,
        overflow: 'hidden',
      },
      explanation: {
        ...typography.md,
        color: c.textPrimary,
        textAlign: 'center',
        lineHeight: 22,
        marginTop: s.md,
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
      gradeRow: {
        flexDirection: 'row',
        gap: s.sm,
        width: '100%',
      },
      gradeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.xs,
        minHeight: 48,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: c.borderDefault,
        backgroundColor: c.surfacePrimary,
      },
      gradeBtnKnown: {
        backgroundColor: c.brand,
        borderColor: c.brand,
      },
      gradeBtnActiveReview: {
        borderColor: c.brand,
        backgroundColor: c.brandLight,
      },
      gradeText: {
        ...typography.sm,
        ...typography.bold,
        color: c.textPrimary,
      },
      gradeTextKnown: {
        color: c.onBrand,
      },
      swipeHintBubble: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.xs,
        marginTop: s.lg,
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
        marginTop: s.lg,
        gap: s.md,
      },
      navButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: c.surfacePrimary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.md,
        borderWidth: 1,
        borderColor: c.borderDefault,
      },
      navButtonDisabled: {
        opacity: 0.4,
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
        minWidth: 156,
        minHeight: 52,
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
      clearFiltersBtn: {
        marginTop: s.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.xs,
        paddingHorizontal: s.lg,
        minHeight: 44,
        borderRadius: borderRadius.full,
        backgroundColor: c.brandLight,
        borderWidth: 1,
        borderColor: c.brandBorder,
      },
      clearFiltersText: {
        ...typography.sm,
        ...typography.bold,
        color: c.brandText,
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
        borderRadius: borderRadius.full,
        paddingHorizontal: s.md,
        paddingVertical: s.sm,
        minHeight: 36,
        justifyContent: 'center',
      },
      retryText: {
        ...typography.xs,
        ...typography.bold,
        color: c.onBrand,
      },
      skeletonCard: {
        width: width - s.lg * 2,
        height: cardHeight,
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
    [cardHeight, height, isShuffled, width]
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

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;
  const hasActiveFilters = activeSubject !== 'All' || searchInput.length > 0;
  const answerSubtitle = [currentFormula?.subject, currentFormula?.category].filter(Boolean).join(' · ');

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
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            accessibilityLabel="Search formulas"
          />
          {searchInput ? (
            <TouchableOpacity
              onPress={() => setSearchInput('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Subjects filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
          keyboardShouldPersistTaps="handled"
        >
          {subjects.map(({ name, count }) => {
            const active = activeSubject === name;
            return (
              <Pressable
                key={name}
                onPress={() => selectSubject(name)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter by ${name}, ${count} cards`}
                style={({ pressed }) => [
                  styles.filterPill,
                  active && styles.filterPillActive,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{name}</Text>
                <Text style={[styles.filterCount, active && styles.filterCountActive]}>{count}</Text>
              </Pressable>
            );
          })}
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
                <View style={styles.progressHeader}>
                  <Text style={styles.progressEyebrow}>YOUR PROGRESS</Text>
                  <Text style={styles.progressText}>
                    {Math.min(currentIndex + 1, total)} / {total}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.shuffleBtn, pressed && { opacity: 0.8 }]}
                onPress={toggleShuffle}
                accessibilityRole="button"
                accessibilityState={{ selected: isShuffled }}
                accessibilityLabel={isShuffled ? 'Turn off shuffle' : 'Shuffle cards'}
              >
                <Animated.View style={shuffleIconStyle}>
                  <Ionicons name="shuffle" size={16} color={isShuffled ? colors.brand : colors.textSecondary} />
                </Animated.View>
                <Text style={styles.shuffleText}>Shuffle</Text>
              </Pressable>
            </View>

            <View style={styles.masteryRow}>
              <View style={styles.masteryChip}>
                <Ionicons name="trophy-outline" size={13} color={colors.brandText} />
                <Text style={styles.masteryChipText}>
                  {knownCount} of {total} mastered
                </Text>
              </View>
              {Object.keys(mastery).length > 0 ? (
                <Pressable
                  onPress={resetProgress}
                  accessibilityRole="button"
                  accessibilityLabel="Reset mastery progress"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.resetText}>Reset</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Flash card deck: static peeks of upcoming cards sit behind the live one */}
            <View style={styles.cardDeck}>
              {afterNextFormula ? <View style={[styles.stackCard, styles.stackCardFar]} pointerEvents="none" /> : null}
              {nextFormula ? <View style={styles.stackCard} pointerEvents="none" /> : null}

              <Animated.View {...panResponder.panHandlers} style={[styles.cardContainer, cardMotionStyle]}>
                <Animated.View style={styles.card}>
                  <View style={styles.cardAccent} />
                  <Animated.View pointerEvents="none" style={[styles.cardEdgeGlow, { right: 0, opacity: nextTint }]} />
                  <Animated.View pointerEvents="none" style={[styles.cardEdgeGlow, { left: 0, opacity: prevTint }]} />
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardBadge}>
                      <Ionicons name="help-circle-outline" size={15} color={colors.brand} />
                      <Text style={styles.cardLabel}>Question</Text>
                    </View>
                    {currentMastery ? (
                      <View style={[styles.statusBadge, currentMastery === 'known' && styles.statusBadgeKnown]}>
                        <Ionicons
                          name={currentMastery === 'known' ? 'checkmark-circle' : 'repeat-outline'}
                          size={13}
                          color={currentMastery === 'known' ? colors.onBrand : colors.textSecondary}
                        />
                        <Text style={[styles.statusText, currentMastery === 'known' && styles.statusTextKnown]}>
                          {currentMastery === 'known' ? 'Mastered' : 'Still learning'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={revealAnswer}
                    onPressIn={pressCardIn}
                    onPressOut={pressCardOut}
                    style={styles.cardBody}
                    accessibilityRole="button"
                    accessibilityLabel="Reveal answer"
                  >
                    <Text style={styles.formulaTitle} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {currentFormula?.title || 'Untitled Formula'}
                    </Text>
                    <View style={styles.tagRow}>
                      <Text style={styles.formulaSubject}>{currentFormula?.subject || 'General'}</Text>
                      {currentFormula?.category ? (
                        <Text style={styles.formulaCategory}>{currentFormula.category}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                  <View style={styles.hintRow}>
                    <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.hintText}>Recall it, then tap to reveal</Text>
                  </View>
                </Animated.View>
              </Animated.View>
            </View>

            <Animated.View style={[styles.swipeHintBubble, hintStyle]} pointerEvents="none">
              <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
              <Text style={styles.swipeHintText}>Swipe to browse cards</Text>
            </Animated.View>

            {/* Navigation controls */}
            <View style={styles.navRow}>
              <Pressable
                onPress={prevCard}
                disabled={isFirst}
                accessibilityRole="button"
                accessibilityState={{ disabled: isFirst }}
                accessibilityLabel="Previous card"
                style={({ pressed }) => [
                  styles.navButton,
                  isFirst && styles.navButtonDisabled,
                  pressed && !isFirst && styles.navButtonPressed,
                ]}
              >
                <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
              </Pressable>

              <Pressable
                onPress={revealAnswer}
                accessibilityRole="button"
                accessibilityLabel="Reveal answer"
                style={({ pressed }) => [styles.flipButton, pressed && styles.flipButtonPressed]}
              >
                <Ionicons name="eye-outline" size={20} color={colors.onBrand} />
                <Text style={styles.flipText}>Reveal Answer</Text>
              </Pressable>

              <Pressable
                onPress={nextCard}
                disabled={isLast}
                accessibilityRole="button"
                accessibilityState={{ disabled: isLast }}
                accessibilityLabel="Next card"
                style={({ pressed }) => [
                  styles.navButton,
                  isLast && styles.navButtonDisabled,
                  pressed && !isLast && styles.navButtonPressed,
                ]}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={48} color={colors.borderDefault} />
            <Text style={styles.emptyText}>No formulas found</Text>
            <Text style={styles.cardSubtleText}>Try another subject or search term.</Text>
            {hasActiveFilters ? (
              <Pressable
                onPress={clearFilters}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
                style={({ pressed }) => [styles.clearFiltersBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.brandText} />
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScreenShell>
      <Modal
        visible={answerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAnswerVisible(false)}
      >
        <View style={styles.answerBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setAnswerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close answer"
          />
          <View style={styles.answerModal} accessibilityViewIsModal>
            <View style={styles.answerHeader}>
              <View style={styles.answerHeaderCopy}>
                <Text style={styles.answerEyebrow}>Answer</Text>
                <Text style={styles.answerTitle} numberOfLines={2}>
                  {currentFormula?.title || 'Untitled Formula'}
                </Text>
                {answerSubtitle ? (
                  <Text style={styles.answerQuestion} numberOfLines={1}>
                    {answerSubtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                style={styles.answerClose}
                onPress={() => setAnswerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close answer"
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            {currentFormula?.formula ? (
              <View style={styles.answerFormulaWrap}>
                <FormulaMath
                  source={currentFormula.formula}
                  color={colors.textPrimary}
                  backgroundColor={colors.brandLight}
                  size="display"
                />
              </View>
            ) : (
              <Text style={styles.explanation}>No formula expression was provided.</Text>
            )}
            <ScrollView
              style={styles.answerContent}
              contentContainerStyle={{ paddingBottom: 4 }}
              showsVerticalScrollIndicator={false}
            >
              {currentFormula?.explanation ? (
                <Text style={styles.answerExplanation}>{currentFormula.explanation}</Text>
              ) : null}
            </ScrollView>

            <View style={[styles.gradeRow, styles.answerActions]}>
              <Pressable
                onPress={() => markCard('review')}
                accessibilityRole="button"
                accessibilityLabel="Mark as still learning"
                style={({ pressed }) => [
                  styles.gradeBtn,
                  currentMastery === 'review' && styles.gradeBtnActiveReview,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="repeat-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.gradeText}>Still learning</Text>
              </Pressable>
              <Pressable
                onPress={() => markCard('known')}
                accessibilityRole="button"
                accessibilityLabel="Mark as got it"
                style={({ pressed }) => [styles.gradeBtn, styles.gradeBtnKnown, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="checkmark" size={16} color={colors.onBrand} />
                <Text style={[styles.gradeText, styles.gradeTextKnown]}>Got it</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}