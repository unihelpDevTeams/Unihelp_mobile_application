import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useFormulas } from '../../hooks/useFormulas';
import ScreenShell from '../../src/shared/components/ScreenShell';
import FormulaMath from '../../src/shared/components/FormulaMath';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { typography, borderRadius, shadows } from '../../src/shared/theme';

const shuffleArray = (items = []) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

export default function FlashCardsPage() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [reloadKey, setReloadKey] = useState(0);
  const { formulas, loading, error } = useFormulas(reloadKey);

  const [activeSubject, setActiveSubject] = useState('All');
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const cardEntranceAnim = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const shuffleAnim = useRef(new Animated.Value(0)).current;

  // Subjects for the filter
  const subjects = useMemo(() => {
    const allSubjects = formulas.map((f) => f.subject).filter(Boolean);
    const unique = Array.from(new Set(allSubjects)).sort();
    return ['All', ...unique];
  }, [formulas]);

  const randomizedFormulas = useMemo(() => shuffleArray(formulas), [formulas]);

  // Filtered and intentionally randomized list
  const activeFormulas = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
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
  const progress = activeFormulas.length > 0 ? (currentIndex + 1) / activeFormulas.length : 0;

  const animateCardIn = useCallback((direction = 1) => {
    cardEntranceAnim.setValue(direction);
    Animated.spring(cardEntranceAnim, {
      toValue: 0,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [cardEntranceAnim]);

  // Reset index when changing subjects or shuffling
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    flipAnim.setValue(0);
    animateCardIn(0.5);
  }, [activeSubject, isShuffled, search, flipAnim, animateCardIn]);

  useEffect(() => {
    if (currentIndex >= activeFormulas.length) {
      setCurrentIndex(Math.max(activeFormulas.length - 1, 0));
      setIsFlipped(false);
      flipAnim.setValue(0);
    }
  }, [activeFormulas.length, currentIndex, flipAnim]);

  const flipCard = () => {
    Animated.sequence([
      Animated.timing(pressAnim, {
        toValue: 0.98,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(pressAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    if (isFlipped) {
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsFlipped(false));
    } else {
      Animated.timing(flipAnim, {
        toValue: 180,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsFlipped(true));
    }
  };

  const nextCard = () => {
    if (currentIndex < activeFormulas.length - 1) {
      setIsFlipped(false);
      flipAnim.setValue(0);
      setCurrentIndex((prev) => prev + 1);
      animateCardIn(1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      flipAnim.setValue(0);
      setCurrentIndex((prev) => prev - 1);
      animateCardIn(-1);
    }
  };

  const toggleShuffle = () => {
    shuffleAnim.setValue(0);
    Animated.spring(shuffleAnim, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
    setIsShuffled((value) => !value);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
  };

  const cardMotionStyle = {
    opacity: cardEntranceAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
    transform: [
      {
        translateX: cardEntranceAnim.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-44, 0, 44],
        }),
      },
      {
        scale: Animated.multiply(
          pressAnim,
          cardEntranceAnim.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0.96, 1, 0.96],
          })
        ),
      },
    ],
  };

  const shuffleIconStyle = {
    transform: [
      {
        rotate: shuffleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
      {
        scale: shuffleAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.18, 1],
        }),
      },
    ],
  };

  const styles = useThemeStyles((c, s) => ({
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
    cardContainer: {
      width: width - s.lg * 2,
      height: Math.min(390, Math.max(330, width * 0.92)),
      alignSelf: 'center',
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
    cardStage: {
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
  }), [isShuffled, width]);

  if (loading) {
    return (
      <ScreenShell title="Flash Cards" subtitle="Master formulas quickly." showBack scrollable={false}>
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.emptyText}>Loading cards...</Text>
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
            value={search}
            onChangeText={setSearch}
            placeholder="Search formulas, subjects, or topics"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Subjects Filter */}
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject}
                style={[
                  styles.filterPill,
                  activeSubject === subject && styles.filterPillActive,
                ]}
                onPress={() => setActiveSubject(subject)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeSubject === subject && styles.filterPillTextActive,
                  ]}
                >
                  {subject}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setReloadKey((key) => key + 1)}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : activeFormulas.length > 0 ? (
          <View style={styles.cardStage}>
            <View style={styles.controlsRow}>
              <View style={styles.progressGroup}>
                <Text style={styles.progressText}>
                  {currentIndex + 1} of {activeFormulas.length}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
              </View>
              <TouchableOpacity
                style={styles.shuffleBtn}
                onPress={toggleShuffle}
              >
                <Animated.View style={shuffleIconStyle}>
                  <Ionicons
                    name="shuffle"
                    size={16}
                    color={isShuffled ? colors.brand : colors.textSecondary}
                  />
                </Animated.View>
                <Text style={styles.shuffleText}>Shuffle</Text>
              </TouchableOpacity>
            </View>

            {/* Flash Card */}
            <Animated.View style={[styles.cardContainer, cardMotionStyle]}>
              {/* Front side */}
              <Animated.View pointerEvents={isFlipped ? 'none' : 'auto'} style={[styles.card, frontAnimatedStyle]}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardBadge}>
                    <Ionicons name="help-circle-outline" size={15} color={colors.brand} />
                    <Text style={styles.cardLabel}>Question</Text>
                  </View>
                  <Text style={styles.cardCounter}>{currentIndex + 1}/{activeFormulas.length}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.92} onPress={flipCard} style={styles.cardBody}>
                  <Text style={styles.formulaTitle}>{currentFormula?.title || 'Untitled Formula'}</Text>
                  <Text style={styles.formulaSubject}>{currentFormula?.subject || 'General'}</Text>
                </TouchableOpacity>
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
                  <Text style={styles.cardCounter}>{currentIndex + 1}/{activeFormulas.length}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.92} onPress={flipCard} style={styles.cardBody}>
                  {/* MathRenderer handles the Katex display */}
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
                  {currentFormula?.explanation && (
                     <Text style={styles.explanation} numberOfLines={3}>
                       {currentFormula.explanation}
                     </Text>
                  )}
                </TouchableOpacity>
                <View style={styles.hintRow}>
                  <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.hintText}>Tap card to return</Text>
                </View>
              </Animated.View>
            </Animated.View>

            {/* Navigation Controls */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                onPress={prevCard}
                disabled={currentIndex === 0}
              >
                <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.flipButton} onPress={flipCard}>
                <Ionicons name="sync" size={20} color={colors.onBrand} />
                <Text style={styles.flipText}>{isFlipped ? 'Show Front' : 'Flip Card'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentIndex === activeFormulas.length - 1 && styles.navButtonDisabled,
                ]}
                onPress={nextCard}
                disabled={currentIndex === activeFormulas.length - 1}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
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
