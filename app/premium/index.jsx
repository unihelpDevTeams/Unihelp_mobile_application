import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import {
  ADMIN_PREMIUM_GIFT_DAYS,
  COMMERCE_UPLOAD_LIMITS,
  getPremiumEntitlementStatus,
  getPremiumAmount,
  getPremiumExpiry,
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

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const padTime = (value) => String(value).padStart(2, '0');

function getPremiumCountdownParts(expiresAt, nowMs = Date.now()) {
  if (!expiresAt) return null;
  const expiryMs = getSubscriptionExpiry(expiresAt)?.getTime();
  if (!expiryMs) return null;

  const totalMs = Math.max(0, expiryMs - nowMs);
  const days = Math.floor(totalMs / DAY_MS);
  const hours = Math.floor((totalMs % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((totalMs % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((totalMs % MINUTE_MS) / SECOND_MS);

  return { totalMs, days, hours, minutes, seconds };
}

function formatCountdownLabel(parts) {
  if (!parts) return 'Active';
  if (parts.days > 0) return `${parts.days}d ${padTime(parts.hours)}h ${padTime(parts.minutes)}m ${padTime(parts.seconds)}s`;
  return `${padTime(parts.hours)}h ${padTime(parts.minutes)}m ${padTime(parts.seconds)}s`;
}

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
  const [now, setNow] = useState(Date.now());

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
    countdownCard: {
      width: '100%',
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginTop: s.lg,
      alignItems: 'center',
      gap: s.md,
    },
    countdownLabel: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    countdownValue: {
      color: c.textPrimary,
      fontSize: 25,
      fontWeight: '900',
      textAlign: 'center',
    },
    countdownUnitsRow: {
      width: '100%',
      flexDirection: 'row',
      gap: s.sm,
    },
    countdownUnit: {
      flex: 1,
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.md,
      paddingVertical: s.sm,
      alignItems: 'center',
    },
    countdownUnitValue: {
      color: c.brand,
      fontSize: 15,
      fontWeight: '900',
    },
    countdownUnitLabel: {
      marginTop: 1,
      color: c.textSecondary,
      fontSize: 10,
      fontWeight: '800',
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
    heroStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.card,
      borderRadius: r.full,
      paddingHorizontal: s.md,
      paddingVertical: 7,
      marginBottom: s.md,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    heroStatusText: {
      color: c.brand,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
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
      gap: s.md,
    },
    activeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: s.md,
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
      flexShrink: 1,
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
    },
    giftNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: s.md,
      backgroundColor: c.goldLight || c.brandLight,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.gold || c.brand,
      padding: s.lg,
      marginBottom: s.lg,
    },
    giftNoticeIcon: {
      width: 38,
      height: 38,
      borderRadius: r.lg,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    giftNoticeCopy: {
      flex: 1,
    },
    giftNoticeTitle: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 3,
    },
    giftNoticeText: {
      color: c.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '600',
    },
    expiryWarningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: s.md,
      backgroundColor: c.orangeLight || c.goldLight || c.brandLight,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.orange || c.gold || c.brand,
      padding: s.lg,
      marginBottom: s.lg,
    },
    expiryWarningIcon: {
      width: 38,
      height: 38,
      borderRadius: r.lg,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expiryWarningCopy: {
      flex: 1,
    },
    expiryWarningTitle: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 3,
    },
    expiryWarningText: {
      color: c.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '600',
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
  const premiumStatus = useMemo(() => getPremiumEntitlementStatus(profile), [profile]);
  const premiumExpiry = useMemo(() => getPremiumExpiry(profile), [profile]);
  const countdownParts = useMemo(() => getPremiumCountdownParts(premiumExpiry, now), [premiumExpiry, now]);
  const countdownLabel = useMemo(() => formatCountdownLabel(countdownParts), [countdownParts]);
  const daysLeft = useMemo(() => {
    const expiry = getSubscriptionExpiry(premiumExpiry);
    if (!expiry) return null;
    return Math.max(0, Math.ceil((expiry.getTime() - now) / DAY_MS));
  }, [premiumExpiry, now]);
  const expiryDate = useMemo(() => getSubscriptionExpiry(premiumExpiry), [premiumExpiry]);
  const subscriptionStatus = String(profile?.subscriptionStatus || '').trim().toLowerCase();
  const isAdminGift = premiumStatus.isAdminGift || (premiumActive && subscriptionStatus === 'admin_grant');
  const expiryLabel = expiryDate ? expiryDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No expiry set';
  const expiryDayCopy = premiumStatus.daysLeft === 0
    ? 'today'
    : `${premiumStatus.daysLeft} ${premiumStatus.daysLeft === 1 ? 'day' : 'days'}`;
  const activeAccessLabel = isAdminGift
    ? 'Admin gift'
    : Platform.OS === 'android'
      ? 'Google Play'
      : 'Premium subscription';
  const activeHeroTitle = isAdminGift ? 'Premium Gift Active' : 'Premium Active';
  const activeHeroText = isAdminGift
    ? daysLeft == null
      ? `Your gifted Premium access is active until ${expiryLabel}.`
      : `You have ${daysLeft} days of gifted Premium. Your access stays active until ${expiryLabel}.`
    : countdownParts
      ? `Your Premium plan is active until ${expiryLabel}. Keep using up to ${COMMERCE_UPLOAD_LIMITS.premium} hostel and ${COMMERCE_UPLOAD_LIMITS.premium} product uploads.`
      : `Premium is active - up to ${COMMERCE_UPLOAD_LIMITS.premium} hostel and ${COMMERCE_UPLOAD_LIMITS.premium} product uploads`;
  const progressPct = useMemo(() => {
    if (!countdownParts) return null;
    const totalDays = isAdminGift ? ADMIN_PREMIUM_GIFT_DAYS : (PREMIUM_PLAN?.durationDays || 30);
    const pct = Math.max(0, Math.min(100, (countdownParts.totalMs / (totalDays * DAY_MS)) * 100));
    return pct;
  }, [countdownParts, isAdminGift]);

  useEffect(() => {
    if (!premiumActive || !premiumExpiry) return undefined;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), SECOND_MS);
    return () => clearInterval(interval);
  }, [premiumActive, premiumExpiry]);

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
          <View style={styles.heroStatusPill}>
            <Ionicons name={isAdminGift ? 'gift-outline' : 'checkmark-circle-outline'} size={13} color={colors.brand} />
            <Text style={styles.heroStatusText}>{activeAccessLabel}</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name={isAdminGift ? 'gift-outline' : 'diamond-outline'} size={32} color={colors.brand} />
          </View>
          <Text style={styles.heroTitle}>{activeHeroTitle}</Text>
          <Text style={styles.heroText}>{activeHeroText}</Text>
          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>{countdownParts ? 'Premium countdown' : 'Premium status'}</Text>
            <Text style={styles.countdownValue}>{countdownLabel}</Text>
            {countdownParts ? (
              <View style={styles.countdownUnitsRow}>
                {[
                  ['Days', countdownParts.days],
                  ['Hours', countdownParts.hours],
                  ['Mins', countdownParts.minutes],
                  ['Secs', countdownParts.seconds],
                ].map(([label, value]) => (
                  <View key={label} style={styles.countdownUnit}>
                    <Text style={styles.countdownUnitValue}>{label === 'Days' ? value : padTime(value)}</Text>
                    <Text style={styles.countdownUnitLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
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
              <Text style={styles.activeLabel}>Access type</Text>
              <Text style={styles.activeValue}>{activeAccessLabel}</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{isAdminGift ? 'Gifted' : 'Verified'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.activeRow}>
            <View>
              <Text style={styles.activeLabel}>Expires</Text>
              <Text style={styles.activeValue}>{expiryLabel}</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{daysLeft ?? '--'} days left</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.activeRow}>
            <View>
              <Text style={styles.activeLabel}>Time remaining</Text>
              <Text style={styles.activeValue}>{countdownLabel}</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{countdownParts ? 'Live' : 'Active'}</Text>
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

      {isAdminGift ? (
        <View style={styles.giftNotice}>
          <View style={styles.giftNoticeIcon}>
            <Ionicons name="sparkles" size={18} color={colors.gold || colors.brand} />
          </View>
          <View style={styles.giftNoticeCopy}>
            <Text style={styles.giftNoticeTitle}>Gift applied to your account</Text>
            <Text style={styles.giftNoticeText}>
              This Premium access was granted by UniHelp admin. It unlocks all Premium tools until {expiryLabel} and does not start a recurring subscription.
            </Text>
          </View>
        </View>
      ) : null}

      {premiumStatus.warning ? (
        <View style={styles.expiryWarningCard}>
          <View style={styles.expiryWarningIcon}>
            <Ionicons name="time-outline" size={18} color={colors.orange || colors.gold || colors.brand} />
          </View>
          <View style={styles.expiryWarningCopy}>
            <Text style={styles.expiryWarningTitle}>
              {isAdminGift ? 'Gifted Premium expires soon' : 'Premium renewal reminder'}
            </Text>
            <Text style={styles.expiryWarningText}>
              {isAdminGift
                ? `Your gifted Premium access expires ${premiumStatus.daysLeft === 0 ? 'today' : `in ${expiryDayCopy}`}. You keep all Premium features until ${expiryLabel}.`
                : `Your Premium access expires ${premiumStatus.daysLeft === 0 ? 'today' : `in ${expiryDayCopy}`}. Renew before ${expiryLabel} to avoid losing Premium features.`}
            </Text>
          </View>
        </View>
      ) : null}

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
          {premiumActive
            ? isAdminGift
              ? 'Gifted Premium remains active on this account until the expiry date shown above. The app refreshes your plan automatically when admin grants or expiry changes.'
              : 'Your Premium access is verified on your account and will keep reflecting until the expiry date shown above.'
            : Platform.OS === 'android'
              ? 'Google Play processes this recurring subscription. UniHelp verifies the purchase before premium access is granted.'
              : 'Payment opens securely with Flutterwave. The backend verifies the transaction before premium is added to your profile.'}
        </Text>
      </View>

      {Platform.OS === 'android' && !isAdminGift ? (
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
