import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';

const FEATURES = [
  { icon: 'book-outline', title: 'Notes & Past Questions', text: 'Access thousands of lecture notes, study materials, tutorials, and past questions shared by students and tutors.', color: colors.teal },
  { icon: 'people-outline', title: 'Student Community', text: 'Join study groups, collaborate with classmates, share knowledge, and build meaningful academic connections.', color: colors.purple },
  { icon: 'chatbubbles-outline', title: 'Real-Time Messaging', text: 'Send private messages, participate in group discussions, and stay connected with your learning community.', color: colors.orange },
  { icon: 'sparkles-outline', title: 'AI Learning Assistant', text: 'Get explanations, summaries, revision plans, quizzes, and instant academic support whenever you need it.', color: colors.green },
  { icon: 'storefront-outline', title: 'Marketplace', text: 'Buy and sell textbooks, gadgets, fashion items, and other student essentials within the UniHelp community.', color: colors.amber },
  { icon: 'home-outline', title: 'Hostel Finder', text: 'Discover nearby hostel listings and connect directly with landlords or agents before making your choice.', color: colors.blue },
  { icon: 'shield-checkmark-outline', title: 'Privacy & Security', text: 'Your account and personal information are protected using secure authentication and modern cloud technologies.', color: colors.rose },
  { icon: 'rocket-outline', title: 'Built for the Future', text: 'UniHelp is continuously improving with new features, smarter learning tools, and better experiences.', color: colors.brand },
  { icon: 'heart-outline', title: 'Made for Students', text: 'Every feature is designed around the everyday challenges students face—from exam preparation to campus life.', color: colors.red },
];

export default function AboutPage() {
  return (
    <ScreenShell title="About UniHelp" subtitle="One platform for students to learn, connect, and achieve more" showBack scrollable>
      <View style={styles.container}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="school" size={32} color={colors.onBrand} />
          </View>
          <Text style={styles.heroTitle}>UniHelp</Text>
          <Text style={styles.heroTagline}>Learn Smarter. Connect Better. Achieve More.</Text>
          <View style={styles.heroDivider} />
          <Text style={styles.heroVersion}>Version 1.0.1</Text>
        </View>

        {/* Mission */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flag-outline" size={20} color={colors.brand} />
            <Text style={styles.sectionTitle}>Our Mission</Text>
          </View>
          <Text style={styles.sectionText}>
            To make quality education and student resources accessible to everyone by providing powerful digital tools that simplify learning, collaboration, and campus life.
          </Text>
        </View>

        {/* Vision */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="eye-outline" size={20} color={colors.brand} />
            <Text style={styles.sectionTitle}>Our Vision</Text>
          </View>
          <Text style={styles.sectionText}>
            To become Africa&apos;s leading student platform where learning, collaboration, innovation, and opportunities come together to empower every student.
          </Text>
        </View>

        {/* What we do */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="apps-outline" size={20} color={colors.brand} />
            <Text style={styles.sectionTitle}>What We Offer</Text>
          </View>
          <Text style={styles.sectionText}>
            Instead of switching between multiple apps for studying, messaging, finding notes, buying textbooks, or managing campus life, UniHelp combines everything into one fast, secure, and easy-to-use platform.
          </Text>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles-outline" size={20} color={colors.brand} />
            <Text style={styles.sectionTitle}>Key Features</Text>
          </View>
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: feature.color + '15' }]}>
                  <Ionicons name={feature.icon} size={22} color={feature.color} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Ionicons name="heart" size={20} color={colors.red} />
          <Text style={styles.footerText}>
            Thank you for being part of the UniHelp community.
          </Text>
          <Text style={styles.footerSubtext}>
            We are dedicated to helping students succeed.
          </Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['3xl'],
    ...shadows.lg,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.brand,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 13,
    color: colors.grey,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  heroDivider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
    marginVertical: spacing.lg,
  },
  heroVersion: {
    fontSize: 12,
    color: colors.greyLight,
    fontWeight: '600',
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  sectionText: {
    fontSize: 13.5,
    color: colors.inkMuted,
    lineHeight: 22,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  featuresSection: {
    gap: spacing.md,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  featureText: {
    fontSize: 11.5,
    color: colors.grey,
    lineHeight: 17,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  footerDivider: {
    width: 60,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  footerText: {
    fontSize: 13,
    color: colors.inkMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 11,
    color: colors.greyLight,
    fontWeight: '500',
  },
});
