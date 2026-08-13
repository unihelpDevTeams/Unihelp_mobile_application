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

export default function PromoSpotlight({ promo, visible, onDismiss, onAction }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, shadows, isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  const progress = useRef(new Animated.Value(0)).current;
  const [imageLoading, setImageLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 180,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  useEffect(() => {
    if (visible) {
      setImageFailed(false);
      setImageLoading(Boolean(promo?.imageUrl));
    }
  }, [promo?.id, promo?.imageUrl, visible]);

  const sizing = useMemo(() => {
    const maxWidth = Math.min(width - 32, 390);
    const maxHeight = height - insets.top - insets.bottom - 44;
    const contentHeight = promo?.description ? 164 : 132;
    const imageHeight = Math.max(240, Math.min(maxWidth * 1.45, maxHeight - contentHeight));
    return { maxWidth, maxHeight, imageHeight };
  }, [height, insets.bottom, insets.top, promo?.description, width]);

  if (!promo) return null;

  const handleClose = () => onDismiss?.();

  const handleAction = async () => {
    await onAction?.();
    try {
      if (promo.actionType === 'external_url' || promo.actionType === 'deep_link') {
        if (promo.actionUrl) await Linking.openURL(promo.actionUrl);
        return;
      }
      if (promo.actionType === 'screen' && promo.actionUrl) {
        router.push(promo.actionUrl);
      }
    } catch (error) {
      console.log('PromoSpotlight action skipped:', error?.message);
    }
  };

  const hasAction = Boolean(promo.actionType && promo.actionType !== 'none' && promo.actionUrl);
  const label = (promo.type && LABELS[promo.type]) || 'Announcement';

  // Dynamic Theme-based Badges & Overlays
  const isExternal = promo.type === 'external_ad';
  const badgeBg = isExternal
    ? colors.amberLight || colors.warningLight || 'rgba(245, 158, 11, 0.15)'
    : colors.brandLight || 'rgba(99, 102, 241, 0.15)';

  const badgeTextColor = isExternal
    ? colors.amber || colors.warning || '#D97706'
    : colors.brandText || colors.brand || '#4F46E5';

  const overlayBg = colors.overlay || 'rgba(0, 0, 0, 0.6)';
  const closeBtnBg = isDark
    ? colors.surfaceSecondary || 'rgba(255, 255, 255, 0.12)'
    : colors.whiteTransparent || 'rgba(255, 255, 255, 0.85)';

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
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
              ],
            },
          ]}
          accessibilityViewIsModal
        >
          {/* Top Banner Image Container */}
          <View
            style={[
              styles.imageWrap,
              {
                height: sizing.imageHeight,
                backgroundColor: 'transparent',
              },
            ]}
          >
            {promo.imageUrl && !imageFailed ? (
              <Image
                source={{ uri: promo.imageUrl }}
                style={styles.image}
                contentFit="contain"
                cachePolicy="disk"
                transition={160}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageFailed(true);
                }}
              />
            ) : (
              <View style={styles.fallback}>
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

            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.closeButton, { backgroundColor: closeBtnBg }, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close promotion"
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary || '#111827'} />
            </Pressable>
          </View>

          {/* Details & Action Content */}
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

            <View style={styles.actions}>
              <Button
                label={promo.buttonText || (hasAction ? 'Open' : 'Got it')}
                onPress={hasAction ? handleAction : handleClose}
                icon={hasAction ? 'arrow-forward-outline' : 'checkmark-outline'}
                iconPosition="right"
                fullWidth
              />
            </View>
          </View>
        </Animated.View>
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
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 26,
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
    fontWeight: '800',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
  content: {
    padding: 18,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  advertiser: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    marginTop: 2,
  },
});
