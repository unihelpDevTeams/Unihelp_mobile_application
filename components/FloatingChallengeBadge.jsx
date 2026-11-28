/* eslint-disable react-hooks/refs -- Animated values and PanResponder handlers must remain stable across drags. */
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BADGE_SIZE = 100;
const EDGE_GAP = 2;

/** A session-only floating shortcut to the daily challenge. */
export default function FloatingChallengeBadge({ onPress, onHide, screenWidth, screenHeight }) {
  const insets = useSafeAreaInsets();
  const position = useRef(new Animated.ValueXY()).current;
  const positionRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const bounds = {
    minX: EDGE_GAP,
    maxX: Math.max(EDGE_GAP, screenWidth - BADGE_SIZE - EDGE_GAP),
    minY: insets.top + EDGE_GAP,
    // Keep the shortcut clear of the bottom tab bar.
    maxY: Math.max(insets.top + EDGE_GAP, screenHeight - BADGE_SIZE - insets.bottom - 82),
  };
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const setPosition = useCallback((nextPosition) => {
    positionRef.current = nextPosition;
    position.setValue(nextPosition);
  }, [position]);

  useEffect(() => {
    const current = positionRef.current;
    const isUnpositioned = current.x === 0 && current.y === 0;
    setPosition({
      x: isUnpositioned ? bounds.maxX : clamp(current.x, bounds.minX, bounds.maxX),
      y: isUnpositioned ? bounds.maxY - 12 : clamp(current.y, bounds.minY, bounds.maxY),
    });
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, screenWidth, screenHeight, insets.top, insets.bottom, setPosition]);

  const dragResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => (
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4
      ),
      onPanResponderGrant: () => {
        dragStartRef.current = { ...positionRef.current };
      },
      onPanResponderMove: (_, gesture) => {
        const activeBounds = boundsRef.current;
        setPosition({
          x: clamp(dragStartRef.current.x + gesture.dx, activeBounds.minX, activeBounds.maxX),
          y: clamp(dragStartRef.current.y + gesture.dy, activeBounds.minY, activeBounds.maxY),
        });
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <Animated.View
      {...dragResponder.panHandlers}
      style={[styles.container, { transform: position.getTranslateTransform() }]}
      accessibilityLabel="Daily challenge shortcut"
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.badgeButton, pressed && styles.badgePressed]}
        accessibilityRole="button"
        accessibilityLabel="Open daily challenge"
        accessibilityHint="Drag to move this shortcut around the screen"
      >
        <Image source={require('../assets/images/challenge-Badge.png')} style={styles.badgeImage} resizeMode="contain" />
      </Pressable>
      <Pressable
        onPress={onHide}
        hitSlop={8}
        style={styles.hideButton}
        accessibilityRole="button"
        accessibilityLabel="Hide daily challenge shortcut"
      >
        <Ionicons name="close" size={14} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    zIndex: 1000,
    elevation: 12,
  },
  badgeButton: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  badgePressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  badgeImage: { width: '100%', height: '100%' },
  hideButton: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
