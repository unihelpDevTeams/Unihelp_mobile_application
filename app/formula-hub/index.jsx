import React, { useCallback, useMemo, useState } from 'react';
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
import { router, useFocusEffect } from 'expo-router';

import { useFormulas } from '../../hooks/useFormulas';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { getFormulaBookmarks } from '../../src/shared/services/formulaBookmarks';

import {
  spacing,
  borderRadius,
  shadows,
  typography,
} from './../../src/shared/theme/index'; 

export default function FormulaHubHome() {
  const { colors, gradients } = useTheme();
  const { formulas, loading } = useFormulas();
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const styles = createStyles(colors);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getFormulaBookmarks()
        .then((items) => {
          if (active) setBookmarksCount(items.length);
        })
        .catch(() => {
          if (active) setBookmarksCount(0);
        });
      return () => {
        active = false;
      };
    }, [])
  );

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
      badgeText: 'Smart library',
    },
    {
      id: 'bookmarks',
      title: 'Saved Bookmarks',
      description: 'Quickly access your pinned formulas and frequent references.',
      route: '/formula-hub/bookmarks',
      gradient: [colors.orange, '#EA580C'],
      iconName: 'bookmark-outline',
      badgeText: `${bookmarksCount} saved`,
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
            <Text style={styles.tagText}>KNOWLEDGE BASE</Text>
          </View>

          {/* Quick Stats Bar */}
          <View style={styles.statsRow}>
            <StatCard
              styles={styles}
              icon="layers-outline"
              label="Subjects"
              value={loading ? '...' : categoriesCount || 'Multi'}
              iconColor={colors.purple}
              bgColor={colors.purpleLight}
            />
            <StatCard
              styles={styles}
              icon="shuffle-outline"
              label="Random Deck"
              value={loading ? '...' : 'Live'}
              iconColor={colors.brand}
              bgColor={colors.brandLight}
            />
            <StatCard
              styles={styles}
              icon="bookmark-outline"
              label="Saved"
              value={loading ? '...' : bookmarksCount}
              iconColor={colors.orange}
              bgColor={colors.orangeLight}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.navigate('/formula-hub/flashcards')}
            style={styles.flashBanner}
            accessibilityRole="button"
            accessibilityLabel="Open formula flash cards"
          >
            <LinearGradient
              colors={[colors.brand, colors.purple, colors.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.flashBannerGradient}
            >
              <View style={styles.bannerGlowOne} />
              <View style={styles.bannerGlowTwo} />
              <View style={styles.flashBannerContent}>
                <View style={styles.flashBannerCopy}>
                  <View style={styles.bannerKicker}>
                    <Ionicons name="sparkles" size={13} color={colors.onBrand} />
                    <Text style={styles.bannerKickerText}>MEMORY MODE</Text>
                  </View>
                  <Text style={styles.bannerTitle}>Flash Card Sprint</Text>
                  <Text style={styles.bannerSubtitle}>Flip formulas into quick recall.</Text>
                  <View style={styles.bannerAction}>
                    <Text style={styles.bannerActionText}>Start practice</Text>
                    <Ionicons name="arrow-forward" size={15} color={colors.brandText} />
                  </View>
                </View>

                <View style={styles.flashDeck}>
                  <View style={[styles.flashMiniCard, styles.flashMiniCardBack]}>
                    <Text style={styles.flashMiniFormula}>F = ma</Text>
                  </View>
                  <View style={[styles.flashMiniCard, styles.flashMiniCardFront]}>
                    <Ionicons name="albums-outline" size={20} color={colors.brand} />
                    <Text style={styles.flashMiniFormulaDark}>A = πr²</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Feature Action Cards */}
          <View style={styles.cardsContainer}>
            {features.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => router.navigate(item.route)}
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
function StatCard({ styles, icon, label, value, iconColor, bgColor }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statTextGroup}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  offlineButton: {
    minHeight: 46,
    borderRadius: borderRadius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  offlineButtonText: {
    ...typography.sm,
    ...typography.extrabold,
    color: colors.onBrand,
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
  flashBanner: {
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing['2xl'],
    overflow: 'hidden',
    ...shadows.lg,
  },
  flashBannerGradient: {
    minHeight: 176,
    padding: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerGlowOne: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -42,
    right: -24,
  },
  bannerGlowTwo: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.1)',
    bottom: -42,
    left: 92,
  },
  flashBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flashBannerCopy: {
    flex: 1,
    minWidth: 0,
  },
  bannerKicker: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  bannerKickerText: {
    ...typography.xs,
    ...typography.extrabold,
    color: colors.onBrand,
    letterSpacing: 0.5,
  },
  bannerTitle: {
    ...typography['5xl'],
    ...typography.black,
    color: colors.onBrand,
    marginBottom: spacing.xs,
  },
  bannerSubtitle: {
    ...typography.md,
    ...typography.semibold,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 19,
    maxWidth: 190,
  },
  bannerAction: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.onBrand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  bannerActionText: {
    ...typography.sm,
    ...typography.extrabold,
    color: colors.brandText,
  },
  flashDeck: {
    width: 116,
    height: 132,
    position: 'relative',
    flexShrink: 0,
  },
  flashMiniCard: {
    position: 'absolute',
    width: 92,
    height: 112,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
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
    backgroundColor: colors.surfacePrimary,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  flashMiniFormula: {
    ...typography.lg,
    ...typography.black,
    color: colors.onBrand,
  },
  flashMiniFormulaDark: {
    ...typography.md,
    ...typography.black,
    color: colors.textPrimary,
    marginTop: spacing.sm,
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
