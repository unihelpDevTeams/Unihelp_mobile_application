import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function GoogleAuthButton({ onPress, loading = false, label = 'Continue with Google' }) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.card, borderColor: colors.borderDefault },
        pressed && !loading && styles.pressed,
        loading && styles.disabled,
      ]}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading
        ? <ActivityIndicator size="small" color={colors.brand} />
        : <Ionicons name="logo-google" size={18} color="#4285F4" />}
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {loading ? 'Connecting to Google…' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  label: { fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.65 },
});
