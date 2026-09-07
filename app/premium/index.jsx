import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
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
import {
  GOOGLE_PLAY_PRODUCT_IDS,
  loadGooglePlayProducts,
  purchaseGoogleSubscription,
  restoreGooglePurchases,
} from '../../src/shared/services/googlePlayBilling';
import { deepLinkToSubscriptionsAndroid } from 'expo-iap';

export default function PremiumPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [billingError, setBillingError] = useState('');
  const [planLoading, setPlanLoading] = useState(true);
  const [googleProducts, setGoogleProducts] = useState([]);

  const premiumActive = isPremiumActive(profile);

  const styles = useThemeStyles((c, s, r) => ({
    hero: {
      backgroundColor: c.brandLight || c.surfaceSecondary,
      borderRadius: r.xl,
      padding: s.xl,
      marginBottom: s.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    heroIcon: {
      width: 64,
      height: 64,
      borderRadius: r.lg,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: s.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    heroTitle: {
      color: c.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: s.xs,
      letterSpacing: -0.3,
    },
    heroText: {
      color: c.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: '92%',
    },
    heroProgressTrack: {
      width: '100%',
      height: 6,
      borderRadius: r.full,
      backgroundColor: c.card,
      marginTop: s.lg,
      overflow: 'hidden',
    },
    heroProgressFill: {
      height: '100%',
      backgroundColor: c.brand,
      borderRadius: r.full,
    },
    sectionTitle: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: s.md,
    },
    billingCard: {
      marginBottom: s.lg,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.full,
      padding: 4,
      gap: 4,
    },
    segmentButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: r.full,
      paddingVertical: s.md,
    },
    segmentButtonActive: {
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
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
    savingsBadge: {
      backgroundColor: c.brand,
      borderRadius: r.full,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    savingsBadgeText: {
      color: c.onBrand,
      fontSize: 10,
      fontWeight: '800',
    },
    planCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginBottom: s.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: s.lg,
      gap: s.md,
    },
    planHeaderCopy: {
      flex: 1,
    },
    planName: {
      color: c.textPrimary,
      fontSize: 19,
      fontWeight: '800',
      marginBottom: 2,
    },
    planSubtitle: {
      color: c.textSecondary,
      fontSize: 13,
    },
    pricePill: {
      alignItems: 'flex-end',
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
    },
    priceText: {
      color: c.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    priceCycle: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 2,
    },
    featureList: {
      gap: s.md,
      marginBottom: s.lg,
      paddingTop: s.lg,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    featureRow: {
      flexDirection: 'row',
      gap: s.md,
      alignItems: 'flex-start',
    },
    checkIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.brandLight || c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    featureCopy: {
      flex: 1,
    },
    featureText: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    featureDescription: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 2,
      lineHeight: 16,
    },
    successBox: {
      flexDirection: 'row',
      gap: s.sm,
      alignItems: 'center',
      backgroundColor: c.brandLight || c.surfaceSecondary,
      borderRadius: r.md,
      padding: s.md,
      marginBottom: s.md,
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
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    subscribeButtonPressed: {
      opacity: 0.9,
    },
    subscribeButtonDisabled: {
      opacity: 0.6,
      shadowOpacity: 0,
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
      marginBottom: s.md,
      gap: s.md,
    },
    featureActionHeader: {
      flexDirection: 'row',
      gap: s.md,
      alignItems: 'flex-start',
    },
    featureActionIcon: {
      width: 38,
      height: 38,
      borderRadius: r.lg,
      backgroundColor: c.brandLight || c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureActionCopy: {
      flex: 1,
    },
    featureActionTitle: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 2,
    },
    featureActionDescription: {
      color: c.textSecondary,
      fontSize: 12.5,
      lineHeight: 17,
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
    featureActionButtonSecondary: {
      backgroundColor: c.surfaceSecondary,
    },
    featureActionButtonPressed: {
      opacity: 0.85,
    },
    featureActionButtonText: {
      color: c.onBrand,
      fontSize: 13.5,
      fontWeight: '800',
      flexShrink: 1,
      textAlign: 'center',
    },
    featureActionButtonTextSecondary: {
      color: c.textPrimary,
    },
    noteBox: {
      flexDirection: 'row',
      gap: s.md,
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.xl,
      padding: s.lg,
      marginBottom: s.md,
    },
    noteText: {
      flex: 1,
      color: c.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '500',
    },
    androidActions: {
      gap: s.sm,
    },
    loadingCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s['3xl'],
      alignItems: 'center',
      justifyContent: 'center',
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
    },
    activeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    activeLabel: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
      marginBottom: 2,
    },
    activeValue: {
      fontSize: 15,
      color: c.textPrimary,
      fontWeight: '700',
    },
    activePill: {
      backgroundColor: c.brandLight || c.surfaceSecondary,
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

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    let mounted = true;
    loadGooglePlayProducts()
      .then((products) => { if (mounted) setGoogleProducts(products || []); })
      .catch((error) => {
        console.log('[Premium] Google Play unavailable:', error?.message);
        if (mounted) setBillingError(error?.message || 'Google Play products are unavailable.');
      });
    return () => { mounted = false; };
  }, []);

  const amount = getPremiumAmount(billing);
  const monthlyAmount = getPremiumAmount('monthly');
  const yearlyAmount = getPremiumAmount('yearly');
  const yearlySavingsPct = useMemo(() => {
    if (!monthlyAmount || !yearlyAmount) return 0;
    const fullYearAtMonthlyRate = monthlyAmount * 12;
    if (fullYearAtMonthlyRate <= 0) return 0;
    const pct = Math.round((1 - yearlyAmount / fullYearAtMonthlyRate) * 100);
    return pct > 0 ? pct : 0;
  }, [monthlyAmount, yearlyAmount]);

  const googleProductId = billing === 'yearly'
    ? GOOGLE_PLAY_PRODUCT_IDS[1]
    : GOOGLE_PLAY_PRODUCT_IDS[0];
  const googleProduct = googleProducts.find((product) => product.id === googleProductId);
  const daysLeft = useMemo(() => getDaysLeft(profile?.subscriptionExpiresAt), [profile?.subscriptionExpiresAt]);
  const expiryDate = useMemo(() => getSubscriptionExpiry(profile?.subscriptionExpiresAt), [profile?.subscriptionExpiresAt]);
  const progressPct = useMemo(() => {
    if (daysLeft == null) return null;
    const totalDays = PREMIUM_PLAN?.durationDays || 30;
    const pct = Math.max(0, Math.min(100, (daysLeft / totalDays) * 100));
    return pct;
  }, [daysLeft]);

  const subscribe = async () => {
    setMessage('');
    setBillingError('');
    setLoading(true);

    try {
      if (Platform.OS === 'android') {
        if (!googleProductId || !googleProduct) throw new Error('This Google Play plan is currently unavailable.');
        await purchaseGoogleSubscription(googleProductId);
      } else {
        await startPremiumCheckout({ user, profile, billing });
      }
      await refreshProfile?.();
      setMessage('Premium is active after Google Play verification.');
    } catch (error) {
      const text = error?.message || 'Payment could not be completed.';
      if (text !== 'Payment was cancelled.') {
        setBillingError(text);
        Alert.alert('Premium upgrade', text);
      }
    } finally {
      setLoading(false);
    }
  };

  const restore = async () => {
    setBillingError('');
    setLoading(true);
    try {
      if (Platform.OS !== 'android') throw new Error('Restore Purchases is available on Android only.');
      await restoreGooglePurchases();
      await refreshProfile?.();
      setMessage('Purchases restored and verified.');
    } catch (error) {
      const text = error?.message || 'Could not restore purchases.';
      setBillingError(text);
      Alert.alert('Restore purchases', text);
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
            <Ionicons name="diamond-outline" size={32} color={colors.brand} />
          </View>
          <Text style={styles.heroTitle}>Premium Active</Text>
          <Text style={styles.heroText}>
            {daysLeft ?? 'Active'} days remaining · up to {COMMERCE_UPLOAD_LIMITS.premium} hostel and {COMMERCE_UPLOAD_LIMITS.premium} product uploads
          </Text>
          {progressPct != null ? (
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressFill, { width: `${progressPct}%` }]} />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="diamond-outline" size={32} color={colors.brand} />
          </View>
          <Text style={styles.heroTitle}>Unlock Student Premium</Text>
          <Text style={styles.heroText}>
            More downloads, stronger AI help, a verified badge, and up to {COMMERCE_UPLOAD_LIMITS.premium} hostel plus {COMMERCE_UPLOAD_LIMITS.premium} product uploads.
          </Text>
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
                {item === 'yearly' && yearlySavingsPct > 0 ? (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsBadgeText}>-{yearlySavingsPct}%</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {premiumActive ? null : (
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planHeaderCopy}>
              <Text style={styles.planName}>{PREMIUM_PLAN.name}</Text>
              <Text style={styles.planSubtitle}>One plan for all student tools</Text>
            </View>
            <View style={styles.pricePill}>
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>
                  {Platform.OS === 'android' ? (googleProduct?.displayPrice || 'Price unavailable') : `NGN ${amount.toLocaleString()}`}
                </Text>
                <Text style={styles.priceCycle}>/{billing === 'monthly' ? 'mo' : 'yr'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.featureList}>
            {PREMIUM_PLAN.features.map((feature) => (
              <View key={feature.key || feature.title} style={styles.featureRow}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={13} color={colors.brand} />
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
              <Ionicons name="checkmark-circle" size={17} color={colors.brand} />
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          {billingError ? (
            <View style={styles.noteBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.orange} />
              <Text style={styles.noteText}>{billingError}</Text>
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
                <Text style={styles.subscribeText}>{Platform.OS === 'android' ? 'Opening Google Play...' : 'Opening Premium...'}</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.onBrand} />
                <Text style={styles.subscribeText}>{Platform.OS === 'android' ? 'Subscribe with Google Play' : 'Upgrade Now'}</Text>
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
          onPress={() => (premiumActive ? router.navigate('/offline-center') : subscribe())}
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
          {Platform.OS === 'android'
            ? 'Google Play processes this recurring subscription. UniHelp verifies the purchase before premium access is granted.'
            : 'Payment opens securely with Flutterwave. The backend verifies the transaction before premium is added to your profile.'}
        </Text>
      </View>

      {Platform.OS === 'android' ? (
        <View style={styles.androidActions}>
          <Pressable
            onPress={restore}
            disabled={loading}
            style={({ pressed }) => [
              styles.featureActionButton,
              styles.featureActionButtonSecondary,
              pressed && styles.featureActionButtonPressed,
              loading && styles.subscribeButtonDisabled,
            ]}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles.featureActionButtonText, styles.featureActionButtonTextSecondary]}>Restore purchases</Text>
          </Pressable>
          <Pressable
            onPress={() => deepLinkToSubscriptionsAndroid({
              skuAndroid: googleProductId,
              packageNameAndroid: 'com.zenithdev.unihelp',
            }).catch(() => Linking.openURL('https://play.google.com/store/account/subscriptions'))}
            style={({ pressed }) => [
              styles.featureActionButton,
              styles.featureActionButtonSecondary,
              pressed && styles.featureActionButtonPressed,
            ]}
          >
            <Ionicons name="settings-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles.featureActionButtonText, styles.featureActionButtonTextSecondary]}>Manage Google Play subscription</Text>
          </Pressable>
        </View>
      ) : null}
    </ScreenShell>
  );
}