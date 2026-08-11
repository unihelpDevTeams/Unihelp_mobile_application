import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { fetchFormulas } from '../../services/firestoreSync';
import ScreenShell from '../../src/shared/components/ScreenShell';

import {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
  gradients,
} from './../../src/shared/theme/index'; 
import { router } from 'expo-router';

export default function FormulaHubHome({ navigation }) {
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchFormulas()
      .then((data) => {
        if (isMounted) {
          setFormulas(data || []);
        }
      })
      .catch((err) => console.error('Failed to fetch formulas:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const bookmarksCount = useMemo(() => {
    return formulas.filter((f) => f.isBookmarked).length;
  }, [formulas]);

  const categoriesCount = useMemo(() => {
    if (!formulas.length) return 0;
    const categories = new Set(formulas.map((f) => f.subject || f.category));
    return categories.size;
  }, [formulas]);

  const features = [
    {
      id: 'library',
      title: 'Formula Library',
      description: 'Explore comprehensive formulas across Math, Physics, and Chemistry.',
      route: '/formula-hub/subjects',
      gradient: gradients.brand,
      iconName: 'library-outline',
      badgeText: `${formulas.length} Formulas`,
    },
    {
      id: 'bookmarks',
      title: 'Saved Bookmarks',
      description: 'Quickly access your pinned formulas and frequent references.',
      route: '/formula-hub/bookmarks',
      gradient: [colors.orange, '#EA580C'],
      iconName: 'bookmark-outline',
      badgeText: `${bookmarksCount} Saved`,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBar === 'light' ? 'light-content' : 'dark-content'} />
      
      <ScreenShell
        title="Formula Hub"
        subtitle="Your interactive workspace for formulas, constants, and quick reference sheets."
        showBack
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Section Tag */}
          <View style={styles.tag}>
            <Ionicons name="sparkles" size={12} color={colors.brand} />
            <Text style={styles.tagText}>KNOWLEDGE BASE</Text>
          </View>

          {/* Quick Stats Bar */}
          <View style={styles.statsRow}>
            <StatCard
              icon="book-outline"
              label="Total"
              value={loading ? '...' : formulas.length}
              iconColor={colors.brand}
              bgColor={colors.brandLight}
            />
            <StatCard
              icon="layers-outline"
              label="Subjects"
              value={loading ? '...' : categoriesCount || 'Multi'}
              iconColor={colors.purple}
              bgColor={colors.purpleLight}
            />
            <StatCard
              icon="bookmark-outline"
              label="Saved"
              value={loading ? '...' : bookmarksCount}
              iconColor={colors.orange}
              bgColor={colors.orangeLight}
            />
          </View>

          {/* Feature Action Cards */}
          <View style={styles.cardsContainer}>
            {features.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => router.push(item.route)}
                style={styles.card} >
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardAccentLine}/>

                <View style={styles.cardHeader}>
                  <LinearGradient colors={item.gradient} style={styles.iconContainer}>
                    <Ionicons name={item.iconName} size={24} color={colors.onBrand} />
                  </LinearGradient>
                  
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {loading ? 'Syncing...' : item.badgeText}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>Explore Section</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.brand} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Syncing Indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={styles.loadingText}>Syncing formula library...</Text>
            </View>
          )}
        </ScrollView>
      </ScreenShell>
    </SafeAreaView>
  );
}

// Micro Component for Quick Stats
function StatCard({ icon, label, value, iconColor, bgColor }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBg, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.statTextGroup}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfacePrimary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...shadows.sm,
  },
  statIconBg: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statTextGroup: {
    flexShrink: 1,
  },
  statLabel: {
    ...typography.xs,
    ...typography.medium,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.xl,
    ...typography.bold,
    color: colors.textPrimary,
  },
  cardsContainer: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
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
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  badgeText: {
    ...typography.sm,
    ...typography.semibold,
    color: colors.textSecondary,
  },
  cardBody: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography['3xl'],
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
    color: colors.brand,
    marginRight: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  loadingText: {
    ...typography.sm,
    ...typography.regular,
    color: colors.textTertiary,
  },
});