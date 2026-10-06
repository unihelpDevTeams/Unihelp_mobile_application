import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

const LABELS = {
  external_ad: 'Sponsored',
  announcement: 'Announcement',
  unihelp_promotion: 'UniHelp',
};

const AUTO_CLOSE_MS = 5000;

// Portrait card: width / height = 4:5
const CARD_ASPECT = 0.8;
const CARD_WIDTH_RATIO = 0.86; // of screen width
const CARD_MAX_WIDTH = 360;
const SIDE_MARGIN = 16;

const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const hexToRgba = (hex, alpha) => {
  if (typeof hex !== 'string' || !HEX_REGEX.test(hex)) return `rgba(15, 15, 35, ${alpha})`;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, n));
};

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
  const [userDismissed, setUserDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const animRef = useRef(null);
  const pausedRef = useRef(false);
  const remainingMsRef = useRef(AUTO_CLOSE_MS);
  const lastStartTimestampRef = useRef(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const handleClose = useCallback(() => {
    setUserDismissed(true);
    onDismissRef.current?.();
  }, []);

  const clearCountdown = useCallback(() => {
    if (animRef.current) animRef.current.stop();
  }, []);

  const startCountdown = useCallback(
    (durationMs) => {
      lastStartTimestampRef.current = Date.now();
      animRef.current = Animated.timing(countdownAnim, {
        toValue: 0,
        duration: durationMs,
        useNativeDriver: false,
      });
      animRef.current.start(({ finished }) => {
        if (finished) handleClose();
      });
    },
    [countdownAnim, handleClose]
  );

  // Show / hide spring
  useEffect(() => {
    Animated.spring(progress, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      speed: visible ? 16 : 20,
      bounciness: visible ? 6 : 0,
    }).start();
  }, [progress, visible]);

  // Countdown lifecycle
  useEffect(() => {
    pausedRef.current = false;
    remainingMsRef.current = AUTO_CLOSE_MS;
    countdownAnim.setValue(1);
    holdScale.setValue(1);
    setUserDismissed(false);
    setIsPaused(false);

    if (!visible) {
      clearCountdown();
      return undefined;
    }

    setImageFailed(false);
    setImageLoading(Boolean(promo?.imageUrl));
    startCountdown(AUTO_CLOSE_MS);

    return () => {
      clearCountdown();
    };
  }, [promo?.id, promo?.imageUrl, visible]);

  const pauseCountdown = () => {
    if (pausedRef.current || !visible) return;
    pausedRef.current = true;
    setIsPaused(true);
    clearCountdown();

    const elapsed = Date.now() - (lastStartTimestampRef.current || Date.now());
    remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);

    Animated.spring(holdScale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();
  };

  const resumeCountdown = () => {
    if (!pausedRef.current || !visible) return;
    pausedRef.current = false;
    setIsPaused(false);

    Animated.spring(holdScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();

    if (remainingMsRef.current > 0) startCountdown(remainingMsRef.current);
    else handleClose();
  };

  const sizing = useMemo(() => {
    // Symmetric vertical padding so the card is truly centered, even on notched devices
    const verticalPad = Math.max(insets.top, insets.bottom) + 20;
    const maxCardHeight = height - verticalPad * 2;

    let cardWidth = Math.min(width * CARD_WIDTH_RATIO, CARD_MAX_WIDTH);
    let cardHeight = cardWidth / CARD_ASPECT;

    // On short screens, shrink the card but keep the portrait ratio
    if (cardHeight > maxCardHeight) {
      cardHeight = maxCardHeight;
      cardWidth = cardHeight * CARD_ASPECT;
    }
    return { cardWidth, cardHeight, verticalPad };
  }, [width, height, insets.top, insets.bottom]);

  if (!promo) return null;

  const handleAction = async () => {
    try {
      setUserDismissed(true);
      clearCountdown();
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
  const accent = isExternal ? colors.amber || '#F59E0B' : colors.brand || '#4F46E5';
  const buttonBg = colors.brand || '#4F46E5';
  const buttonLabel = promo.buttonText || (hasAction ? 'Open' : 'Got it');

  const gradientStart = HEX_REGEX.test(promo.gradientStart || '') ? promo.gradientStart : '#1A1A2E';
  const gradientEnd = HEX_REGEX.test(promo.gradientEnd || '') ? promo.gradientEnd : '#0F0F23';
  const textColor = HEX_REGEX.test(promo.textColor || '') ? promo.textColor : '#FFFFFF';
  const titleSize = clamp(promo.titleSize, 16, 26, 20);
  const descSize = clamp(promo.descriptionSize, 12, 16, 13);

  const dimColor = isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(10, 12, 20, 0.45)';

  const countdownWidth = countdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const showImage = promo.imageUrl && !imageFailed;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      {/* Blurred + dimmed backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 60}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dimColor }]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss promotion"
        />
      </Animated.View>

      {/* Perfectly centered stage */}
      <View
        pointerEvents="box-none"
        style={[
          styles.centerWrap,
          { paddingVertical: sizing.verticalPad, paddingHorizontal: SIDE_MARGIN },
        ]}
      >
        <Pressable
          onLongPress={pauseCountdown}
          onPressOut={resumeCountdown}
          delayLongPress={180}
          style={{ width: sizing.cardWidth, height: sizing.cardHeight }}
        >
          <Animated.View
            style={[
              styles.card,
              shadows?.xl,
              {
                width: sizing.cardWidth,
                height: sizing.cardHeight,
                backgroundColor: gradientEnd,
                opacity: progress,
                transform: [
                  {
                    scale: Animated.multiply(
                      progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
                      holdScale
                    ),
                  },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                ],
              },
            ]}
            accessibilityViewIsModal
          >
            {/* Full-bleed portrait creative (or themed gradient fallback) */}
            {showImage ? (
              <Image
                source={{ uri: promo.imageUrl }}
                style={StyleSheet.absoluteFill}
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
              <LinearGradient
                colors={[gradientStart, gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              >
                <View style={styles.fallback}>
                  <Ionicons name="sparkles-outline" size={38} color="rgba(255,255,255,0.7)" />
                </View>
              </LinearGradient>
            )}

            {imageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}

            {/* Soft top shade so the badge and close button stay readable on any image */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']}
              style={styles.topShade}
            />

            {/* Bottom scrim tinted with the campaign's theme colour */}
            <LinearGradient
              pointerEvents="none"
              colors={[hexToRgba(gradientEnd, 0), hexToRgba(gradientEnd, 0.8), hexToRgba(gradientEnd, 0.97)]}
              locations={[0, 0.55, 1]}
              style={styles.bottomScrim}
            />

            {/* Story-style countdown */}
            {!userDismissed && (
              <View style={styles.countdownTrack}>
                <Animated.View
                  style={[
                    styles.countdownFill,
                    {
                      width: countdownWidth,
                      backgroundColor: isPaused ? 'rgba(255,255,255,0.6)' : '#FFFFFF',
                    },
                  ]}
                />
              </View>
            )}

            {/* Top row: badge, paused pill, close */}
            <View style={styles.topRow} pointerEvents="box-none">
              <View style={styles.topLeft}>
                <View style={styles.badge}>
                  <View style={[styles.badgeDot, { backgroundColor: accent }]} />
                  <Text style={styles.badgeText}>{label}</Text>
                </View>
                {isPaused && (
                  <View style={styles.badge}>
                    <Ionicons name="pause" size={10} color="#FFFFFF" />
                    <Text style={styles.badgeText}>Paused</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={handleClose}
                onPressIn={() => animatePress(closeScale, 0.88)}
                onPressOut={() => animatePress(closeScale, 1)}
                accessibilityRole="button"
                accessibilityLabel="Close promotion"
                hitSlop={10}
              >
                <Animated.View style={[styles.closeButton, { transform: [{ scale: closeScale }] }]}>
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </Animated.View>
              </Pressable>
            </View>

            {/* Bottom content */}
            <View style={styles.content} pointerEvents="box-none">
              {promo.advertiserName ? (
                <Text style={styles.advertiser} numberOfLines={1}>
                  {promo.advertiserName}
                </Text>
              ) : null}

              {promo.title ? (
                <Text
                  style={[styles.title, { color: textColor, fontSize: titleSize, lineHeight: titleSize + 6 }]}
                  numberOfLines={3}
                >
                  {promo.title}
                </Text>
              ) : null}

              {promo.description ? (
                <Text
                  style={[styles.description, { color: textColor, fontSize: descSize, lineHeight: descSize + 6 }]}
                  numberOfLines={3}
                >
                  {promo.description}
                </Text>
              ) : null}

              <Animated.View style={[styles.actions, { transform: [{ scale: actionScale }] }]}>
                <Pressable
                  onPress={hasAction ? handleAction : handleClose}
                  onPressIn={() => animatePress(actionScale, 0.97)}
                  onPressOut={() => animatePress(actionScale, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={buttonLabel}
                  style={[styles.actionButton, { backgroundColor: buttonBg }]}
                >
                  <Text style={styles.actionText} numberOfLines={1}>
                    {buttonLabel}
                  </Text>
                  <Ionicons name={hasAction ? 'arrow-forward' : 'checkmark'} size={16} color="#FFFFFF" />
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '62%',
  },
  countdownTrack: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  countdownFill: {
    height: '100%',
    borderRadius: 999,
  },
  topRow: {
    position: 'absolute',
    top: 22,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 5,
  },
  advertiser: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontWeight: '800',
  },
  description: {
    opacity: 0.85,
  },
  actions: {
    marginTop: 12,
  },
  actionButton: {
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});