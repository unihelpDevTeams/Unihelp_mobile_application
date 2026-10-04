import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

export default function EvosAura({
  children,
  size = 70,
  active = false,
  fluidColor = '#EC4899', // Liquid Hot Pink
  secondaryColor = '#8B5CF6', // Liquid Purple
}) {
  if (!active) {
    return <View style={{ width: size, height: size }}>{children}</View>;
  }

  // Animation values for morphing blobbiness
  const morphScaleX1 = useSharedValue(1);
  const morphScaleY1 = useSharedValue(1);
  const morphRotate1 = useSharedValue(0);

  const morphScaleX2 = useSharedValue(1);
  const morphScaleY2 = useSharedValue(1);
  const morphRotate2 = useSharedValue(0);

  const glowPulse = useSharedValue(0);

  useEffect(() => {
    // Wave Blob 1 - Morphing deformation sequence
    morphScaleX1.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.88, { duration: 2100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    morphScaleY1.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 2100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.18, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    morphRotate1.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );

    // Wave Blob 2 - Counter-deforming layer
    morphScaleX2.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.12, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    morphScaleY2.value = withRepeat(
      withSequence(
        withTiming(1.16, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.87, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    morphRotate2.value = withRepeat(
      withTiming(-360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    // Glow intensity breathing
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Animated styles for fluid layer 1
  const blob1Style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${morphRotate1.value}deg` },
      { scaleX: morphScaleX1.value },
      { scaleY: morphScaleY1.value },
    ],
  }));

  // Animated styles for fluid layer 2
  const blob2Style = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${morphRotate2.value}deg` },
      { scaleX: morphScaleX2.value },
      { scaleY: morphScaleY2.value },
    ],
  }));

  // Background glow
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0.3, 1], [0.4, 0.8]),
    transform: [{ scale: interpolate(glowPulse.value, [0.3, 1], [0.95, 1.1]) }],
  }));

  const auraSize = size + 16;

  return (
    <View style={[styles.container, { width: auraSize, height: auraSize }]}>
      {/* 1. Ambient Fluid Glow */}
      <Animated.View
        style={[
          styles.glowLayer,
          glowStyle,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            backgroundColor: fluidColor,
            shadowColor: fluidColor,
          },
        ]}
      />

      {/* 2. Fluid Wave Layer 1 (Outer Deforming Blob) */}
      <Animated.View
        style={[
          styles.fluidBlob,
          blob1Style,
          {
            width: size + 12,
            height: size + 8,
            borderRadius: (size + 12) / 2,
            backgroundColor: fluidColor,
            opacity: 0.7,
          },
        ]}
      />

      {/* 3. Fluid Wave Layer 2 (Inner Counter-Deforming Blob) */}
      <Animated.View
        style={[
          styles.fluidBlob,
          blob2Style,
          {
            width: size + 8,
            height: size + 12,
            borderRadius: (size + 12) / 2,
            backgroundColor: secondaryColor,
            opacity: 0.8,
          },
        ]}
      />

      {/* 4. Solid Mask Shield for Avatar */}
      <View
        style={[
          styles.avatarMask,
          {
            width: size + 2,
            height: size + 2,
            borderRadius: (size + 2) / 2,
          },
        ]}
      />

      {/* 5. Avatar Node Container */}
      <View style={{ zIndex: 5 }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowLayer: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  fluidBlob: {
    position: 'absolute',
  },
  avatarMask: {
    position: 'absolute',
    backgroundColor: '#0F172A',
    zIndex: 4,
  },
});