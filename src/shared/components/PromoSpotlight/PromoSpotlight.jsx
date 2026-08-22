import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../Button';

const LABELS = {
  external_ad: 'Sponsored',
  announcement: 'Announcement',
  unihelp_promotion: 'UniHelp',
};

const AUTO_CLOSE_MS = 5000;

export default function PromoSpotlight({ promo, visible, onDismiss, onAction }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows, isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  const progress = useRef(new Animated.Value(0)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const holdScale = useRef(new Animated.Value(1)).current;
  const closeScale = useRef(new Animated.Value(1)).current;
  const actionScale = useRef(new Animated.Value(1)).current;

  const [imageLoading, setImageLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [userDismissed, setUserDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const closeTimerRef = useRef(null);
  const animRef = useRef(null);

  const remainingMsRef = useRef(AUTO_CLOSE_MS);
  const lastStartTimestampRef = useRef(null);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      speed: visible ? 16 : 20,
      bounciness: visible ? 6 : 0,
    }).start();
  }, [progress, visible]);

  // Handle countdown setup & auto-dismiss life cycle
  useEffect(() => {
    if (!visible) {
      clearCountdownTimers();
      countdownAnim.setValue(1);
      setCountdown(5);
      setUserDismissed(false);
      setIsPaused(false);
      remainingMsRef.current = AUTO_CLOSE_MS;
      return undefined;
    }

    setImageFailed(false);
    setImageLoading(Boolean(promo?.imageUrl));
    setCountdown(5);
    setUserDismissed(false);
    setIsPaused(false);
    remainingMsRef.current = AUTO_CLOSE_MS;
    countdownAnim.setValue(1);

    startCountdown(AUTO_CLOSE_MS);

    const listenerId = countdownAnim.addListener(({ value }) => {
      const secondsLeft = Math.max(0, Math.ceil(value * 5));
      setCountdown((prev) => (prev !== secondsLeft ? secondsLeft : prev));
    });

    return () => {
      clearCountdownTimers();
      countdownAnim.removeListener(listenerId);
    };
  }, [promo?.id, promo?.imageUrl, visible]);

  const clearCountdownTimers = () => {
    if (animRef.current) animRef.current.stop();
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const startCountdown = (durationMs) => {
    lastStartTimestampRef.current = Date.now();

    animRef.current = Animated.timing(countdownAnim, {
      toValue: 0,
      duration: durationMs,
      useNativeDriver: false,
    });

    animRef.current.start(({ finished }) => {
      if (finished) {
        handleClose();
      }
    });
  };

  const pauseCountdown = () => {
    if (isPaused || !visible) return;

    setIsPaused(true);
    clearCountdownTimers();

    const elapsed = Date.now() - lastStartTimestampRef.current;
    remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);

    Animated.spring(holdScale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const resumeCountdown = () => {
    if (!isPaused || !visible) return;

    setIsPaused(false);

    Animated.spring(holdScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();

    if (remainingMsRef.current > 0) {
      startCountdown(remainingMsRef.current);
    } else {
      handleClose();
    }
  };

  const sizing = useMemo(() => {
    const maxWidth = Math.min(width - 32, 390);
    const maxHeight = height - insets.top - insets.bottom - 44;
    const contentHeight = promo?.description ? 180 : 140;
    const imageHeight = Math.max(220, Math.min(maxWidth * 1.35, maxHeight - contentHeight));
    return { maxWidth, maxHeight, imageHeight };
  }, [height, insets.bottom, insets.top, promo?.description, width]);

  if (!promo) return null;

  const handleClose = () => {
    setUserDismissed(true);
    onDismiss?.();
  };

  const handleAction = async () => {
    try {
      setUserDismissed(true);
      if (promo.actionType === 'external_url' || promo.actionType === 'deep_link') {
        if (promo.actionUrl) {
          await Linking.openURL(promo.actionUrl);
          await onAction?.();
        }
        return;
      }
      if (promo.actionType === 'screen' && promo.actionUrl) {
        router.navigate(promo.actionUrl);
        await onAction?.();
      }
    } catch (error) {
      console.log('PromoSpotlight action skipped:', error?.message);
    }
  };

  const animatePress = (animValue, toValue) => {
    Animated.spring(animValue, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 10,
    }).start();
  };

  const hasAction = Boolean(promo.actionType && promo.actionType !== 'none' && promo.actionUrl);
  const label = (promo.type && LABELS[promo.type]) || 'Announcement';

  const isExternal = promo.type === 'external_ad';
  const badgeBg = isExternal
    ? colors.amberLight || 'rgba(245, 158, 11, 0.15)'
    : colors.brandLight || 'rgba(99, 102, 241, 0.15)';

  const badgeTextColor = isExternal
    ? colors.amber || '#D97706'
    : colors.brandText || colors.brand || '#4F46E5';

  const overlayBg = colors.overlay || 'rgba(0, 0, 0, 0.65)';
  const closeBtnBg = isDark
    ? colors.surfaceSecondary || 'rgba(255, 255, 255, 0.16)'
    : colors.whiteTransparent || 'rgba(255, 255, 255, 0.9)';

  const countdownWidth = countdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: progress, backgroundColor: overlayBg }]}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss promotion"
        />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={[styles.centerWrap, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}
      >
        <Pressable
          onLongPress={pauseCountdown}
          onPressOut={resumeCountdown}
          delayLongPress={180}
          style={{ width: sizing.maxWidth }}
        >
          <Animated.View
            style={[
              styles.card,
              shadows?.xl,
              {
                width: sizing.maxWidth,
                maxHeight: sizing.maxHeight,
                backgroundColor: colors.modalBackground || colors.card || '#FFFFFF',
                borderColor: colors.borderDefault || colors.border || '#E5E7EB',
                opacity: progress,
                transform: [
                  { scale: Animated.multiply(progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }), holdScale) },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                ],
              },
            ]}
            accessibilityViewIsModal
          >
            {/* Image Section */}
            <View style={[styles.imageWrap, { height: sizing.imageHeight }]}>
              {promo.imageUrl && !imageFailed ? (
                <Image
                  source={{ uri: promo.imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageFailed(true);
                  }}
                />
              ) : (
                <View style={[styles.fallback, { backgroundColor: colors.surfaceSecondary || '#F3F4F6' }]}>
                  <Ionicons name="sparkles-outline" size={38} color={colors.brand || '#4F46E5'} />
                  <Text style={[styles.fallbackText, { color: colors.textSecondary || '#6B7280' }]}>
                    UniHelp Spotlight
                  </Text>
                </View>
              )}

              {imageLoading && (
                <View style={styles.imageLoader}>
                  <ActivityIndicator color={colors.brand || '#4F46E5'} />
                </View>
              )}

              {/* Pause Overlay Indicator */}
              {isPaused && (
                <View style={styles.pausedBadge}>
                  <Ionicons name="pause" size={12} color="#FFFFFF" />
                  <Text style={styles.pausedBadgeText}>Paused</Text>
                </View>
              )}

              <Pressable
                onPress={handleClose}
                onPressIn={() => animatePress(closeScale, 0.88)}
                onPressOut={() => animatePress(closeScale, 1)}
                accessibilityRole="button"
                accessibilityLabel="Close promotion"
                hitSlop={8}
                style={styles.closeButtonContainer}
              >
                <Animated.View
                  style={[
                    styles.closeButton,
                    { backgroundColor: closeBtnBg, transform: [{ scale: closeScale }] },
                  ]}
                >
                  <Ionicons name="close" size={20} color={colors.textPrimary || '#111827'} />
                </Animated.View>
              </Pressable>
            </View>

            {/* Content & Action Section */}
            <View style={styles.content}>
              <View style={styles.metaRow}>
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.badgeText, { color: badgeTextColor }]}>{label}</Text>
                </View>
                {promo.advertiserName ? (
                  <Text
                    style={[styles.advertiser, { color: colors.textSecondary || '#6B7280' }]}
                    numberOfLines={1}
                  >
                    {promo.advertiserName}
                  </Text>
                ) : null}
              </View>

              {promo.title ? (
                <Text style={[styles.title, { color: colors.textPrimary || '#111827' }]} numberOfLines={2}>
                  {promo.title}
                </Text>
              ) : null}

              {promo.description ? (
                <Text
                  style={[styles.description, { color: colors.textSecondary || '#6B7280' }]}
                  numberOfLines={2}
                >
                  {promo.description}
                </Text>
              ) : null}

              {!userDismissed ? (
                <View style={styles.countdownRow}>
                  <View style={styles.countdownHeader}>
                    <Text style={[styles.countdownText, { color: colors.textSecondary || '#6B7280' }]}>
                      {isPaused ? 'Hold to read' : `Auto-closing in ${countdown}s`}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.countdownTrack,
                      { backgroundColor: colors.borderDefault || colors.border || '#E5E7EB' },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.countdownFill,
                        {
                          width: countdownWidth,
                          backgroundColor: isPaused
                            ? colors.textSecondary || '#9CA3AF'
                            : isExternal
                            ? colors.amber || '#F59E0B'
                            : colors.brand || '#4F46E5',
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  onPress={hasAction ? handleAction : handleClose}
                  onPressIn={() => animatePress(actionScale, 0.97)}
                  onPressOut={() => animatePress(actionScale, 1)}
                >
                  <Animated.View style={{ transform: [{ scale: actionScale }] }}>
                    <Button
                      label={promo.buttonText || (hasAction ? 'Open' : 'Got it')}
                      onPress={hasAction ? handleAction : handleClose}
                      icon={hasAction ? 'arrow-forward-outline' : 'checkmark-outline'}
                      iconPosition="right"
                      fullWidth
                    />
                  </Animated.View>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justify: 'center',
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  imageWrap: {
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '700',
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pausedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  advertiser: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  countdownRow: {
    gap: 6,
    marginTop: 2,
  },
  countdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '600',
  },
  countdownTrack: {
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  countdownFill: {
    height: '100%',
    borderRadius: 999,
  },
  actions: {
    marginTop: 4,
  },
});