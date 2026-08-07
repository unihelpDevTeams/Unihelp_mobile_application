import React, { useRef } from 'react';
import { Pressable, Text, View, Animated, StyleSheet, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const TOGGLE_WIDTH = 52;
const TOGGLE_HEIGHT = 28;
const KNOB_SIZE = 22;
const KNOB_OFFSET = TOGGLE_WIDTH - KNOB_SIZE - 4;

export default function ThemeToggle({ size = 28, showLabel = false }) {
  const { isDark, toggleTheme, colors } = useTheme();
  const knobAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(knobAnim, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }, [isDark, knobAnim]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    toggleTheme();
    AccessibilityInfo.announceForAccessibility?.(isDark ? 'Switched to light theme' : 'Switched to dark theme');
  };

  const knobTranslate = knobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, KNOB_OFFSET],
  });

  const trackColor = knobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E2E8F0', '#1E293B'],
  });

  const knobColor = isDark ? '#0F172A' : '#FFFFFF';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Animated.View
        style={[
          styles.toggleTrack,
          {
            width: TOGGLE_WIDTH,
            height: TOGGLE_HEIGHT,
            borderRadius: TOGGLE_HEIGHT / 2,
            backgroundColor: trackColor,
            borderWidth: 1,
            borderColor: colors.borderDefault,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.knob,
            {
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              borderRadius: KNOB_SIZE / 2,
              backgroundColor: knobColor,
              transform: [{ translateX: knobTranslate }, { scale: scaleAnim }],
              shadowColor: colors.shadow,
              shadowOpacity: 0.2,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            },
          ]}
        >
          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={KNOB_SIZE * 0.55}
            color={isDark ? '#CBD5E1' : '#F59E0B'}
          />
        </Animated.View>
      </Animated.View>
      {showLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTrack: {
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  knob: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});