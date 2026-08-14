import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import {
  COMMERCE_UPLOAD_LIMITS,
  getDaysLeft,
  getPremiumAmount,
  getSubscriptionExpiry,
  isPremiumActive,
  PREMIUM_PLAN,
  startPremiumCheckout,
} from '../../src/shared/services/premium';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';

export default function PremiumPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [planLoading, setPlanLoading] = useState(true);

  const premiumActive = isPremiumActive(profile);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await refreshProfile?.();
      if (active) setPlanLoading(false);
    };
    load();
    return () => { active = false; };
  }, [refreshProfile]);

  const amount = getPremiumAmount(billing);
  const daysLeft = useMemo(() => getDaysLeft(profile?.subscriptionExpiresAt), [profile?.subscriptionExpiresAt]);
  const expiryDate = useMemo(() => getSubscriptionExpiry(profile?.subscriptionExpiresAt), [profile?.subscriptionExpiresAt]);

  const subscribe = async () => {
    setMessage('');
    setLoading(true);

    try {
      await startPremiumCheckout({ user, profile, billing });
      await refreshProfile?.();
      setMessage('Premium activated successfully.');
    } catch (error) {
      const text = error?.message || 'Payment could not be completed.';
      if (text !== 'Payment was cancelled.') {
        Alert.alert('Premium upgrade', text);
      }
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) {
    return (
      <ScreenShell title="Premium" subtitle="Upgrade your Unihelp account." showBack>
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.loadingText}>Loading your plan...</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Premium" subtitle="Upgrade your Unihelp account." showBack>
      {premiumActive ? (
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="diamond-outline" size={40} color={colors.gold} />
          </View>
          <Text style={styles.heroTitle}>Premium Active</Text>
          <Text style={styles.heroText}>
            {daysLeft ?? 'Active'} days remaining. Your plan includes up to {COMMERCE_UPLOAD_LIMITS.premium} hostel and {COMMERCE_UPLOAD_LIMITS.premium} product uploads.
          </Text>
        </View>
      ) : (
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="diamond-outline" size={40} color={colors.gold} />
          </View>
          <Text style={styles.heroTitle}>Unlock Student Premium</Text>
          <Text style={styles.heroText}>Get more downloads, stronger AI help, a verified badge, and up to {COMMERCE_UPLOAD_LIMITS.premium} hostel plus {COMMERCE_UPLOAD_LIMITS.premium} product uploads.</Text>
        </View>
      )}

      {premiumActive ? (
        <View style={styles.activeCard}>
          <View style={styles.activeRow}>
            <View>
              <Text style={styles.activeLabel}>Plan</Text>
              <Text style={styles.activeValue}>{PREMIUM_PLAN.name}</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.activeRow}>
            <View>
              <Text style={styles.activeLabel}>Expires</Text>
              <Text style={styles.activeValue}>{expiryDate ? expiryDate.toLocaleDateString() : 'Unknown'}</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{daysLeft ?? '--'} days left</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.billingCard}>
          <Text style={styles.sectionTitle}>Choose billing</Text>
          <View style={styles.segment}>
            {['monthly', 'yearly'].map((item) => (
              <Pressable
                key={item}
                style={[styles.segmentButton, billing === item && styles.segmentButtonActive]}
                onPress={() => setBilling(item)}
                disabled={loading}
              >
                <Text style={[styles.segmentText, billing === item && styles.segmentTextActive]}>
                  {item === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {premiumActive ? null : (
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>{PREMIUM_PLAN.name}</Text>
              <Text style={styles.planSubtitle}>One plan for all student tools</Text>
            </View>
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>NGN {amount.toLocaleString()}</Text>
              <Text style={styles.priceCycle}>/{billing === 'monthly' ? 'mo' : 'yr'}</Text>
            </View>
          </View>

          <View style={styles.featureList}>
            {PREMIUM_PLAN.features.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={14} color={colors.teal} />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {message ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={17} color={colors.teal} />
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.subscribeButton,
              pressed && !loading && styles.subscribeButtonPressed,
              loading && styles.subscribeButtonDisabled,
            ]}
            onPress={subscribe}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Ionicons name="sparkles" size={18} color={colors.onBrand} />
            )}
            <Text style={styles.subscribeText}>Upgrade Now</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.noteBox}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand} />
        <Text style={styles.noteText}>
          Payment opens securely with Flutterwave. The backend verifies the transaction before premium is added to your profile.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.goldLight,
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  heroText: {
    color: colors.grey,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: '90%',
  },
  billingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.full,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  segmentText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.brandText,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  planHeader: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  planName: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  planSubtitle: {
    color: colors.grey,
    fontSize: 14,
  },
  pricePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.goldLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  priceText: {
    color: colors.amber,
    fontSize: 20,
    fontWeight: '800',
  },
  priceCycle: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.tealLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  successText: {
    flex: 1,
    color: colors.teal,
    fontSize: 13,
    fontWeight: '700',
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.lg,
    ...shadows.brand,
  },
  subscribeButtonPressed: {
    backgroundColor: colors.brandDark,
  },
  subscribeButtonDisabled: {
    opacity: 0.7,
  },
  subscribeText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  noteBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  noteText: {
    flex: 1,
    color: colors.brandText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.grey,
    fontSize: 14,
    fontWeight: '600',
  },
  activeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeLabel: {
    fontSize: 13,
    color: colors.grey,
    fontWeight: '600',
  },
  activeValue: {
    fontSize: 15,
    color: colors.ink,
    fontWeight: '700',
  },
  activePill: {
    backgroundColor: colors.tealLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  activePillText: {
    fontSize: 12,
    color: colors.teal,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
});
