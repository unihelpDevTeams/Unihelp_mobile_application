import React from 'react';
import { StyleSheet, View } from 'react-native';

const ZIGZAG_POSITIONS = ['0%', '16%', '32%', '48%', '64%', '80%'];

export default function BubbleShapeAccents({ shape, color, compact = false }) {
  if (shape === 'zigzag') {
    const size = compact ? 5 : 11;
    const offset = compact ? -2 : -5;
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {ZIGZAG_POSITIONS.map((left) => (
          <React.Fragment key={left}>
            <View style={[styles.zigzagPoint, { width: size, height: size, left, top: offset, backgroundColor: color }]} />
            <View style={[styles.zigzagPoint, { width: size, height: size, left: `${parseInt(left, 10) + 8}%`, bottom: offset, backgroundColor: color }]} />
          </React.Fragment>
        ))}
      </View>
    );
  }

  if (shape === 'glitch') {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.glitchBar, { width: compact ? 8 : 18, top: compact ? 4 : 7, left: compact ? 1 : 3, backgroundColor: color }]} />
        <View style={[styles.glitchBar, { width: compact ? 7 : 14, bottom: compact ? 4 : 7, right: compact ? 1 : 3, backgroundColor: color }]} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  zigzagPoint: {
    position: 'absolute',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  glitchBar: {
    position: 'absolute',
    height: 3,
    opacity: 0.65,
  },
});
