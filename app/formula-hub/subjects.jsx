import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

// Custom Services & UI Components
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useFormulas } from '../../hooks/useFormulas';
import { useTheme } from '../../src/shared/theme/ThemeContext';

// Design System Tokens
import {
  spacing,
  borderRadius,
  shadows,
  typography,
} from './../../src/shared/theme/index'; // Adjust relative path as needed

export default function FormulaSubjectsPage() {
  const { colors, gradients } = useTheme();
  const { formulas: sampleFormulas } = useFormulas();
  const styles = createStyles(colors);

  // Subject Theme Resolver using design system tokens
  const getSubjectConfig = useCallback((subject) => {
    switch (subject) {
      case 'Mathematics':
        return {
          accent: colors.brand,
          bgColor: colors.brandLight,
          gradient: gradients.brand,
          icon: 'calculator-outline',
        };
      case 'Physics':
        return {
          accent: colors.blue,
          bgColor: colors.blueLight,
          gradient: [colors.blue, '#0284C7'],
          icon: 'flash-outline',
        };
      case 'Chemistry':
        return {
          accent: colors.green,
          bgColor: colors.greenLight,
          gradient: [colors.green, '#059669'],
          icon: 'flask-outline',
        };
      case 'Biology':
        return {
          accent: colors.orange,
          bgColor: colors.orangeLight,
          gradient: [colors.orange, '#EA580C'],
          icon: 'leaf-outline',
        };
      case 'Economics':
        return {
          accent: colors.purple,
          bgColor: colors.purpleLight,
          gradient: [colors.purple, '#7E22CE'],
          icon: 'cash-outline',
        };
      case 'Thermodynamics':
        return {
          accent: colors.red,
          bgColor: colors.redLight,
          gradient: [colors.red, '#B91C1C'],
          icon: 'thermometer-outline',
        };
      default:
        return {
          accent: colors.grey,
          bgColor: colors.canvasLight,
          gradient: [colors.grey, colors.greyLight],
          icon: 'library-outline',
        };
    }
  }, [colors, gradients]);

  // Group and compute metrics dynamically
  const subjects = useMemo(() => {
    const uniqueSubjects = Array.from(
      new Set(sampleFormulas.map((item) => item.subject).filter(Boolean))
    );

    return uniqueSubjects.map((subject) => {
      const count = sampleFormulas.filter((item) => item.subject === subject).length;
      const label = subject || 'General';
      const config = getSubjectConfig(label);

      return {
        title: label,
        count,
        description: `${count} formula${count === 1 ? '' : 's'} available for ${label.toLowerCase()}.`,
        route: `/formula-hub/subject/${encodeURIComponent(label.toLowerCase())}`,
        ...config,
      };
    });
  }, [sampleFormulas, getSubjectConfig]);

  const totalFormulas = useMemo(() => sampleFormulas.length, [sampleFormulas]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBar === 'light' ? 'light-content' : 'dark-content'} />

      <ScreenShell
        title="Formula Subjects"
        subtitle="Subject-based formula shortcuts and quick references."
        showBack
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Tag */}
          <View style={styles.tag}>
            <Ionicons name="layers-outline" size={12} color={colors.brand} />
            <Text style={styles.tagText}>SUBJECT CATEGORIES</Text>
          </View>

          {/* Metrics Overview Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{subjects.length}</Text>
              <Text style={styles.statLabel}>Active Subjects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalFormulas}</Text>
              <Text style={styles.statLabel}>Total Formulas</Text>
            </View>
          </View>

          {/* Subjects Card List */}
          <View style={styles.gridContainer}>
            {subjects.map((item) => (
              <TouchableOpacity
                key={item.title}
                activeOpacity={0.85}
                onPress={() => router.push(item.route)}
                style={styles.card}
              >
                {/* Top Accent Gradient Border */}
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardAccentLine}
                />

                <View style={styles.cardHeader}>
                  <LinearGradient colors={item.gradient} style={styles.iconContainer}>
                    <Ionicons name={item.icon} size={22} color={colors.onBrand} />
                  </LinearGradient>

                  <View style={[styles.badge, { backgroundColor: item.bgColor }]}>
                    <Text style={[styles.badgeText, { color: item.accent }]}>
                      {item.count} {item.count === 1 ? 'Formula' : 'Formulas'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.cardFooterText, { color: item.accent }]}>
                    Browse Formulas
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={item.accent} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </ScreenShell>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    padding: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brandLight,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  tagText: {
    ...typography.xs,
    ...typography.bold,
    color: colors.brandText,
    letterSpacing: 0.5,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfacePrimary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing['2xl'],
    ...shadows.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography['3xl'],
    ...typography.extrabold,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.xs,
    ...typography.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: colors.divider,
  },
  gridContainer: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfacePrimary,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  cardAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    ...typography.xs,
    ...typography.bold,
  },
  cardBody: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography['2xl'],
    ...typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.md,
    ...typography.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  cardFooterText: {
    ...typography.md,
    ...typography.semibold,
    marginRight: spacing.xs,
  },
});
