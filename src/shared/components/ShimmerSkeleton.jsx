import { Animated, Text, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '../theme/ThemeContext';

export default function ShimmerSkeleton({ width = '100%', height = 16, borderRadius: radius = 8, style }) {
  const { colors } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(opacityAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(opacityAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.96, duration: 800, useNativeDriver: true }),
          ]),
        ])
      ).start();
    };
    pulse();
    return () => opacityAnim.stopAnimation();
  }, [opacityAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.skeletonBackground, width, height, borderRadius: radius, opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        style,
      ]}
    />
  );
}

export function ShimmerCard({ style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.borderDefault, overflow: 'hidden', marginBottom: 12 }, style]}>
      <ShimmerSkeleton width="100%" height={180} borderRadius={18} />
      <View style={{ padding: 16 }}>
        <ShimmerSkeleton width="70%" height={16} style={{ marginTop: 12 }} />
        <ShimmerSkeleton width="40%" height={12} style={{ marginTop: 8 }} />
        <ShimmerSkeleton width="60%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function ShimmerListItem({ style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.borderDefault, padding: 12, marginBottom: 8 }, style]}>
      <ShimmerSkeleton width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1 }}>
        <ShimmerSkeleton width="60%" height={14} />
        <ShimmerSkeleton width="40%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function ShimmerCircle({ size = 40, style }) {
  return (
    <ShimmerSkeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}