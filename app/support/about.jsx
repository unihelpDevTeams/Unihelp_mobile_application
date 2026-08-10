import React from 'react';
import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { layout } from '../../src/shared/theme';

const FEATURES = [
  {
    icon: 'book-outline',
    title: 'Notes & Past Questions',
    text: 'Access thousands of lecture notes, study materials, tutorials, and past questions shared by students and tutors.',
    color: '#0D9488', // Teal
  },
  {
    icon: 'people-outline',
    title: 'Student Community',
    text: 'Join study groups, collaborate with classmates, share knowledge, and build meaningful academic connections.',
    color: '#8B5CF6', // Purple
  },
  {
    icon: 'chatbubbles-outline',
    title: 'Real-Time Messaging',
    text: 'Send private messages, participate in group discussions, and stay connected with your learning community.',
    color: '#F97316', // Orange
  },
  {
    icon: 'sparkles-outline',
    title: 'AI Learning Assistant',
    text: 'Get explanations, summaries, revision plans, quizzes, and instant academic support whenever you need it.',
    color: '#10B981', // Green
  },
  {
    icon: 'storefront-outline',
    title: 'Marketplace',
    text: 'Buy and sell textbooks, gadgets, fashion items, and other student essentials within the UniHelp community.',
    color: '#F59E0B', // Amber
  },
  {
    icon: 'home-outline',
    title: 'Hostel Finder',
    text: 'Discover nearby hostel listings and connect directly with landlords or agents before making your choice.',
    color: '#3B82F6', // Blue
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacy & Security',
    text: 'Your account and personal information are protected using secure authentication and modern cloud technologies.',
    color: '#F43F5E', // Rose
  },
  {
    icon: 'rocket-outline',
    title: 'Built for the Future',
    text: 'UniHelp is continuously improving with new features, smarter learning tools, and better experiences.',
    color: '#6366F1', // Indigo/Brand
  },
  {
    icon: 'heart-outline',
    title: 'Made for Students',
    text: 'Every feature is designed around the everyday challenges students face—from exam preparation to campus life.',
    color: '#EF4444', // Red
  },
];

export default function AboutPage() {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const styles = useThemeStyles((c, s, r) => {
    // Dynamic column layout calculations
    const horizontalPadding = layout?.screenPadding ? layout.screenPadding * 2 : s.md * 2;
    const numColumns = screenWidth > 768 ? 3 : screenWidth > 480 ? 2 : 1;
    const gapSize = s.sm;
    const availableWidth = screenWidth - horizontalPadding - gapSize * (numColumns - 1);
    const cardWidth = availableWidth / numColumns;

    return {
      container: {
        gap: s.xl,
        paddingBottom: s['4xl'],
      },

      // Hero Section
      heroCard: {
        alignItems: 'center',
        backgroundColor: c.surfaceSecondary || c.surface,
        borderRadius: r['2xl'],
        borderWidth: 1,
        borderColor: c.borderDefault,
        paddingVertical: s['2xl'],
        paddingHorizontal: s.lg,
        position: 'relative',
        overflow: 'hidden',
      },
      heroBadge: {
        position: 'absolute',
        top: s.md,
        right: s.md,
        backgroundColor: c.brandLight || '#EEF2FF',
        paddingHorizontal: s.sm,
        paddingVertical: 4,
        borderRadius: r.full,
      },
      heroBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: c.brand,
      },
      heroIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: c.brand,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: s.md,
        shadowColor: c.brand,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      },
      heroTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: c.textPrimary,
        letterSpacing: -0.5,
      },
      heroTagline: {
        fontSize: 13,
        color: c.textSecondary,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
      },

      // Info Block Cards
      infoBlock: {
        backgroundColor: c.surfaceSecondary || c.surface,
        borderRadius: r.xl,
        borderWidth: 1,
        borderColor: c.borderDefault,
        padding: s.lg,
        gap: s.xs,
      },
      infoBlockHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.xs,
        marginBottom: 2,
      },
      infoBlockTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: c.textPrimary,
      },
      infoBlockText: {
        fontSize: 13,
        color: c.textSecondary,
        lineHeight: 20,
      },

      // Feature Section Headers
      sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.xs,
        marginBottom: s.xs,
      },
      sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: c.textPrimary,
        letterSpacing: -0.3,
      },

      // Grid Container
      featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: gapSize,
      },
      featureCard: {
        width: cardWidth,
        backgroundColor: c.surfaceSecondary || c.surface,
        borderRadius: r.xl,
        borderWidth: 1,
        borderColor: c.borderDefault,
        padding: s.md,
        gap: s.xs,
      },
      featureIconWrap: {
        width: 42,
        height: 42,
        borderRadius: r.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
      },
      featureTitle: {
        fontSize: 13.5,
        fontWeight: '800',
        color: c.textPrimary,
      },
      featureText: {
        fontSize: 12,
        color: c.textSecondary,
        lineHeight: 18,
      },

      // Footer
      footer: {
        alignItems: 'center',
        gap: s.xs,
        paddingTop: s.md,
      },
      footerDivider: {
        width: 48,
        height: 3,
        borderRadius: 2,
        backgroundColor: c.borderDefault,
        marginBottom: s.sm,
      },
      footerText: {
        fontSize: 13,
        color: c.textSecondary,
        fontWeight: '700',
        textAlign: 'center',
      },
      footerSubtext: {
        fontSize: 11,
        color: c.textTertiary || c.textSecondary,
        fontWeight: '500',
      },
    };
  });

  return (
    <ScreenShell title="About UniHelp" subtitle="Everything students need in one connected place" showBack scrollable>
      <View style={styles.container}>
        {/* HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>v1.0.1</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="school" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>UniHelp</Text>
          <Text style={styles.heroTagline}>Learn Smarter. Connect Better. Achieve More.</Text>
        </View>

        {/* MISSION & VISION */}
        <View style={styles.infoBlock}>
          <View style={styles.infoBlockHeader}>
            <Ionicons name="flag-outline" size={18} color={colors.brand} />
            <Text style={styles.infoBlockTitle}>Our Mission</Text>
          </View>
          <Text style={styles.infoBlockText}>
            To make quality education and campus tools accessible to all students by delivering digital solutions that streamline learning, collaboration, and daily university life.
          </Text>
        </View>

        <View style={styles.infoBlock}>
          <View style={styles.infoBlockHeader}>
            <Ionicons name="eye-outline" size={18} color={colors.brand} />
            <Text style={styles.infoBlockTitle}>Our Vision</Text>
          </View>
          <Text style={styles.infoBlockText}>
            To establish an all-in-one ecosystem across higher education where resources, innovation, and communities empower every student to reach their potential.
          </Text>
        </View>

        {/* FEATURES LIST */}
        <View>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles-outline" size={18} color={colors.brand} />
            <Text style={styles.sectionTitle}>Platform Offerings</Text>
          </View>

          <View style={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <Pressable 
                key={feature.title}
                style={({ pressed }) => [
                  styles.featureCard,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: `${feature.color}15` }]}>
                  <Ionicons name={feature.icon} size={20} color={feature.color} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Ionicons name="heart" size={18} color="#EF4444" />
          <Text style={styles.footerText}>Thank you for being part of the UniHelp community.</Text>
          <Text style={styles.footerSubtext}>Dedicated to supporting every step of your academic journey.</Text>
        </View>
      </View>
    </ScreenShell>
  );
}