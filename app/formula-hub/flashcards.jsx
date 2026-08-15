import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useFormulas } from '../../hooks/useFormulas';
import ScreenShell from '../../src/shared/components/ScreenShell';
import FormulaMath from '../../src/shared/components/FormulaMath';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { spacing, typography, borderRadius, shadows } from '../../src/shared/theme';

const { width } = Dimensions.get('window');

export default function FlashCardsPage() {
  const { colors } = useTheme();
  const { formulas, loading } = useFormulas();

  const [activeSubject, setActiveSubject] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  const flipAnim = useRef(new Animated.Value(0)).current;

  // Subjects for the filter
  const subjects = useMemo(() => {
    const allSubjects = formulas.map((f) => f.subject).filter(Boolean);
    const unique = Array.from(new Set(allSubjects)).sort();
    return ['All', ...unique];
  }, [formulas]);

  // Filtered and potentially shuffled list
  const activeFormulas = useMemo(() => {
    let filtered =
      activeSubject === 'All'
        ? formulas
        : formulas.filter((f) => f.subject === activeSubject);

    if (isShuffled) {
      filtered = [...filtered].sort(() => Math.random() - 0.5);
    }

    return filtered;
  }, [formulas, activeSubject, isShuffled]);

  const currentFormula = activeFormulas[currentIndex];

  // Reset index when changing subjects or shuffling
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    flipAnim.setValue(0);
  }, [activeSubject, isShuffled, flipAnim]);

  const flipCard = () => {
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
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      flipAnim.setValue(0);
      setCurrentIndex((prev) => prev - 1);
    }
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
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  const styles = useThemeStyles((c, s) => ({
    container: {
      flex: 1,
      backgroundColor: c.canvasDefault,
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
      marginBottom: s.lg,
    },
    progressText: {
      ...typography.sm,
      ...typography.medium,
      color: c.textSecondary,
    },
    shuffleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isShuffled ? c.brandLight : c.surfaceSecondary,
      paddingHorizontal: s.md,
      paddingVertical: s.xs,
      borderRadius: borderRadius.md,
    },
    shuffleText: {
      ...typography.sm,
      ...typography.medium,
      color: isShuffled ? c.brand : c.textSecondary,
      marginLeft: s.xs,
    },
    cardContainer: {
      width: width - s.lg * 2,
      height: 350,
      alignSelf: 'center',
    },
    card: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.surfacePrimary,
      borderRadius: borderRadius.2xl,
      ...shadows.md,
      padding: s.xl,
      backfaceVisibility: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: c.borderDefault,
      borderWidth: 1,
    },
    cardBack: {
      backgroundColor: c.brandLight,
    },
    cardLabel: {
      ...typography.sm,
      ...typography.medium,
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      position: 'absolute',
      top: s.lg,
    },
    formulaTitle: {
      ...typography.2xl,
      ...typography.bold,
      color: c.textPrimary,
      textAlign: 'center',
    },
    formulaSubject: {
      ...typography.sm,
      color: c.textSecondary,
      marginTop: s.sm,
    },
    explanation: {
      ...typography.md,
      color: c.textPrimary,
      textAlign: 'center',
      lineHeight: 24,
      marginTop: s.xl,
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: s['2xl'],
      gap: s.xl,
    },
    navButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.surfacePrimary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.sm,
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
      ...shadows.sm,
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
    }
  }));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenShell title="Flash Cards" subtitle="Master formulas quickly." showBack>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading cards...</Text>
          </View>
        </ScreenShell>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBar === 'light' ? 'light-content' : 'dark-content'} />
      <ScreenShell title="Flash Cards" subtitle="Test your formula memory." showBack>
        
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

        {activeFormulas.length > 0 ? (
          <View style={{ flex: 1, marginTop: spacing.md }}>
            <View style={styles.controlsRow}>
              <Text style={styles.progressText}>
                {currentIndex + 1} of {activeFormulas.length}
              </Text>
              <TouchableOpacity
                style={styles.shuffleBtn}
                onPress={() => setIsShuffled(!isShuffled)}
              >
                <Ionicons
                  name="shuffle"
                  size={16}
                  color={isShuffled ? colors.brand : colors.textSecondary}
                />
                <Text style={styles.shuffleText}>Shuffle</Text>
              </TouchableOpacity>
            </View>

            {/* Flash Card */}
            <View style={styles.cardContainer}>
              {/* Front side */}
              <Animated.View style={[styles.card, frontAnimatedStyle]}>
                <Text style={styles.cardLabel}>Question</Text>
                <Text style={styles.formulaTitle}>{currentFormula?.title}</Text>
                <Text style={styles.formulaSubject}>{currentFormula?.subject}</Text>
              </Animated.View>

              {/* Back side */}
              <Animated.View
                style={[styles.card, styles.cardBack, backAnimatedStyle]}
              >
                <Text style={styles.cardLabel}>Answer</Text>
                {/* MathRenderer handles the Katex display */}
                <View style={{ height: 120, width: '100%', justifyContent: 'center' }}>
                   <FormulaMath source={currentFormula?.formula} size="display" />
                </View>
                {currentFormula?.explanation && (
                   <Text style={styles.explanation} numberOfLines={3}>
                     {currentFormula.explanation}
                   </Text>
                )}
              </Animated.View>
            </View>

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
    </SafeAreaView>
  );
}
