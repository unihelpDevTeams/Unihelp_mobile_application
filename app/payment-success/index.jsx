import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Success icon scale animation
    Animated.spring(checkScaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Content fade in
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim, checkScaleAnim]);

  const receipt = {
    id: 'TXN-' + Date.now().toString().slice(-8),
    date: new Date().toLocaleDateString(),
    amount: 'NGN 2,500',
    plan: 'Premium Monthly',
    status: 'Completed',
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Success Icon */}
        <Animated.View style={[styles.successIcon, { transform: [{ scale: checkScaleAnim }] }]}>
          <Ionicons name="checkmark-circle" size={88} color={colors.teal} />
        </Animated.View>

        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>Your premium subscription is now active.</Text>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Transaction ID</Text>
            <Text style={styles.receiptValue}>{receipt.id}</Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Date</Text>
            <Text style={styles.receiptValue}>{receipt.date}</Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Plan</Text>
            <Text style={styles.receiptValue}>{receipt.plan}</Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Amount</Text>
            <Text style={[styles.receiptValue, styles.receiptAmount]}>{receipt.amount}</Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark" size={12} color={colors.teal} />
              <Text style={styles.statusText}>{receipt.status}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="home-outline" size={18} color={colors.onBrand} />
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            onPress={() => {
              // Share receipt logic
            }}
          >
            <Ionicons name="share-outline" size={18} color={colors.brand} />
            <Text style={styles.secondaryButtonText}>Share Receipt</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  successIcon: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: colors.grey,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  receiptCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    padding: spacing.lg,
    marginBottom: spacing['2xl'],
    ...shadows.md,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  receiptLabel: {
    fontSize: 13,
    color: colors.grey,
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: 14,
    color: colors.ink,
    fontWeight: '700',
  },
  receiptAmount: {
    color: colors.teal,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tealLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.teal,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    ...shadows.brand,
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
  },
  secondaryButtonPressed: {
    opacity: 0.8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brandText,
  },
});
