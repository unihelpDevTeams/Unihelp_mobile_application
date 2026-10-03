import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolateColor
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export default function EvosAura({ children, size = 60, active = false }) {
  if (!active) {
    return <View style={{ width: size, height: size }}>{children}</View>;
  }

  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value }
      ]
    };
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Outer Glow / Flame ring */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle, { margin: -6 }]}>
        <LinearGradient
          colors={['#FF004D', '#FF7A00', '#FF004D', '#9D00FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            borderRadius: 999,
            opacity: 0.8,
            shadowColor: '#FF004D',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 15,
            elevation: 10
          }}
        />
      </Animated.View>
      
      {/* Inner dark ring to separate avatar from aura */}
      <View style={{
        position: 'absolute',
        width: size + 4,
        height: size + 4,
        backgroundColor: '#0F172A',
        borderRadius: 999,
      }} />

      {/* Avatar Container */}
      <View style={{ zIndex: 2 }}>
        {children}
      </View>
    </View>
  );
}
