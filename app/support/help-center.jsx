import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import InfoPage from '../../src/shared/screens/InfoPage';
import InfoCard from '../../src/shared/components/InfoCard';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';

export default function HelpCenterPage() {
  const router = useRouter();

  return (
    <InfoPage
      title="Help Center"
      subtitle="Get help and support for Unihelp"
    >
      <View style={styles.grid}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/contact')}
        >
          <View style={[styles.iconBg, { backgroundColor: `${colors.brand}15` }]}>
            <Ionicons name="mail-outline" size={20} color={colors.brand} />
          </View>
          <View style={styles.cardContent}>
            <InfoCard title="Contact Support" text="Get in touch with our team for general assistance." />
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/report')}
        >
          <View style={[styles.iconBg, { backgroundColor: `${colors.red}15` }]}>
            <Ionicons name="bug-outline" size={20} color={colors.red} />
          </View>
          <View style={styles.cardContent}>
            <InfoCard title="Report an Issue" text="Report bugs, abuse, or content moderation requests." />
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/faq')}
        >
          <View style={[styles.iconBg, { backgroundColor: `${colors.teal}15` }]}>
            <Ionicons name="help-circle-outline" size={20} color={colors.teal} />
          </View>
          <View style={styles.cardContent}>
            <InfoCard title="FAQ" text="Find answers to common questions about Unihelp." />
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/suggest')}
        >
          <View style={[styles.iconBg, { backgroundColor: `${colors.orange}15` }]}>
            <Ionicons name="bulb-outline" size={20} color={colors.orange} />
          </View>
          <View style={styles.cardContent}>
            <InfoCard title="Suggest a Feature" text="Share your ideas for improving Unihelp." />
          </View>
        </Pressable>
      </View>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardPressed: {
    backgroundColor: colors.canvasLight,
    transform: [{ scale: 0.98 }],
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
});
