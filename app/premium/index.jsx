import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

export default function PremiumPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [planLoading, setPlanLoading] = useState(true);

  const premiumActive = isPremiumActive(profile);

  const styles = useThemeStyles((c, s, r) => ({
    hero: {
      backgroundColor: c.brandLight || c.surfaceSecondary,
      borderRadius: r.xl,
      padding: s.xl,
      marginBottom: s.xl,
      alignItems: 'center',
    },
    heroIcon: {
      width: 72,
      height: 72,
      borderRadius: r.xl,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: s.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    heroTitle: {
      color: c.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: s.sm,
      letterSpacing: -0.3,
    },
    heroText: {
      color: c.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: '90%',
    },
    billingCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginBottom: s.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: s.md,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.brandLight || c.surfaceSecondary,
      borderRadius: r.full,
      padding: 4,
    },
    segmentButton: {
      flex: 1,
      borderRadius: r.full,
      paddingVertical: s.md,
      alignItems: 'center',
    },
    segmentButtonActive: {
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
      elevation: 1,
    },
    segmentText: {
      color: c.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
    segmentTextActive: {
      color: c.brand,
    },
    planCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.xl,
      marginBottom: s.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    planHeader: {
      gap: s.md,
      marginBottom: s.xl,
    },
    planName: {
      color: c.textPrimary,
      fontSize: 22,
      fontWeight: '800',
    },
    planSubtitle: {
      color: c.textSecondary,
      fontSize: 14,
    },
    pricePill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: c.brandLight || c.surfaceSecondary,
      borderRadius: r.full,
      paddingHorizontal: s.md,
      paddingVertical: s.sm,
    },
    priceText: {
      color: c.brand,
      fontSize: 20,
      fontWeight: '800',
    },
    priceCycle: {
      color: c.brand,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
      opacity: 0.7,
    },
    featureList: {
      gap: s.sm,
      marginBottom: s.xl,
    },
    featureRow: {
      flexDirection: 'row',
      gap: s.sm,
      alignItems: 'center',
    },
    checkIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureCopy: {
      flex: 1,
    },
    featureText: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    featureDescription: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    successBox: {
      flexDirection: 'row',
      gap: s.sm,
      alignItems: 'center',
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.md,
      padding: s.md,
      marginBottom: s.lg,
      borderLeftWidth: 3,
      borderLeftColor: c.brand,
    },
    successText: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    subscribeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.sm,
      backgroundColor: c.brand,
      borderRadius: r.full,
      paddingVertical: s.lg,
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    subscribeButtonPressed: {
      opacity: 0.9,
    },
    subscribeButtonDisabled: {
      opacity: 0.6,
    },
    subscribeText: {
      color: c.onBrand,
      fontSize: 16,
      fontWeight: '800',
    },
    featureActionCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginBottom: s.lg,
      gap: s.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    featureActionHeader: {
      flexDirection: 'row',
      gap: s.md,
      alignItems: 'flex-start',
    },
    featureActionIcon: {
      width: 40,
      height: 40,
      borderRadius: r.lg,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureActionCopy: {
      flex: 1,
    },
    featureActionTitle: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 2,
    },
    featureActionDescription: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    featureActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.sm,
      backgroundColor: c.brand,
      borderRadius: r.lg,
      paddingVertical: s.md,
    },
    featureActionButtonPressed: {
      opacity: 0.9,
    },
    featureActionButtonText: {
      color: c.onBrand,
      fontSize: 14,
      fontWeight: '800',
    },
    noteBox: {
      flexDirection: 'row',
      gap: s.md,
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.xl,
      borderLeftWidth: 3,
      borderLeftColor: c.brand,
      padding: s.lg,
    },
    noteText: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
    },
    loadingCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s['3xl'],
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    loadingText: {
      marginTop: s.md,
      color: c.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    activeCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginBottom: s.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    activeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activeLabel: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '600',
    },
    activeValue: {
      fontSize: 15,
      color: c.textPrimary,
      fontWeight: '700',
    },
    activePill: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.full,
      paddingHorizontal: s.md,
      paddingVertical: 6,
    },
    activePillText: {
      fontSize: 12,
      color: c.brand,
      fontWeight: '700',
    },
    divider: {
      height: 1,
      backgroundColor: c.borderDefault,
      marginVertical: s.md,
    },
  }));

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
              <View key={feature.key || feature.title} style={styles.featureRow}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={14} color={colors.teal} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureText}>{feature.title}</Text>
                  {feature.description ? <Text style={styles.featureDescription}>{feature.description}</Text> : null}
                </View>
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
              <>
                <ActivityIndicator color={colors.onBrand} />
                <Text style={styles.subscribeText}>Opening Premium...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.onBrand} />
                <Text style={styles.subscribeText}>Upgrade Now</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      <View style={styles.featureActionCard}>
        <View style={styles.featureActionHeader}>
          <View style={styles.featureActionIcon}>
            <Ionicons name="cloud-download-outline" size={18} color={colors.brand} />
          </View>
          <View style={styles.featureActionCopy}>
            <Text style={styles.featureActionTitle}>Offline Learning Library</Text>
            <Text style={styles.featureActionDescription}>
              {premiumActive ? 'Your saved resources are ready when you are offline.' : 'Save study resources and keep learning without internet access.'}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.featureActionButton,
            pressed && !loading && styles.featureActionButtonPressed,
            loading && styles.subscribeButtonDisabled,
          ]}
          onPress={() => (premiumActive ? router.push('/offline-center') : subscribe())}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Ionicons
              name={premiumActive ? 'library-outline' : 'lock-closed-outline'}
              size={16}
              color={colors.onBrand}
            />
          )}
          <Text style={styles.featureActionButtonText}>
            {premiumActive ? 'Open Offline Library' : 'Unlock with Premium'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.noteBox}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand} />
        <Text style={styles.noteText}>
          Payment opens securely with Flutterwave. The backend verifies the transaction before premium is added to your profile.
        </Text>
      </View>
    </ScreenShell>
  );
}
