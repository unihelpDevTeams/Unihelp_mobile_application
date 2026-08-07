import React from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';
import { ButtonLoader } from './AILoaders';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  labelStyle,
}) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    button: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: r.xl, gap: s.xs,
    },
    fullWidth: { width: '100%' },
    disabled: { opacity: 0.6 },
    pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    iconLeft: { marginRight: 2 },
    iconRight: { marginLeft: 2 },
    label: { fontWeight: '700' },
  }));

  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, iconSize: 14 },
    md: { paddingVertical: 14, paddingHorizontal: 20, fontSize: 15, iconSize: 18 },
    lg: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 17, iconSize: 20 },
  };

  const variantStyles = {
    primary: { backgroundColor: colors.brand, textColor: colors.onBrand },
    secondary: { backgroundColor: colors.surface, textColor: colors.brand, borderWidth: 1, borderColor: colors.brand },
    outline: { backgroundColor: 'transparent', textColor: colors.brand, borderWidth: 1, borderColor: colors.borderDefault },
    danger: { backgroundColor: colors.red, textColor: colors.onBrand },
    ghost: { backgroundColor: 'transparent', textColor: colors.textPrimary },
  };

  const variantStyle = variantStyles[variant] || variantStyles.primary;
  const sizeStyle = sizeStyles[size] || sizeStyles.md;

  const brandShadow = {
    shadowColor: colors.brand,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: variantStyle.backgroundColor },
        variantStyle.borderWidth ? { borderWidth: variantStyle.borderWidth, borderColor: variantStyle.borderColor } : {},
        { paddingVertical: sizeStyle.paddingVertical, paddingHorizontal: sizeStyle.paddingHorizontal },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        variant === 'primary' && !disabled && !loading && brandShadow,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ButtonLoader color={variantStyle.textColor} size={sizeStyle.iconSize} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={sizeStyle.iconSize} color={variantStyle.textColor} style={styles.iconLeft} />
          )}
          <Text style={[styles.label, { color: variantStyle.textColor, fontSize: sizeStyle.fontSize }, labelStyle]}>
            {label}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={sizeStyle.iconSize} color={variantStyle.textColor} style={styles.iconRight} />
          )}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, size = 40, color: propColor, backgroundColor: propBgColor, style }) {
  const { colors } = useTheme();
  const color = propColor || colors.textPrimary;
  const backgroundColor = propBgColor || colors.surfaceSecondary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size, height: size, borderRadius: size / 2, backgroundColor,
          alignItems: 'center', justifyContent: 'center',
        },
        pressed && { opacity: 0.8, backgroundColor: colors.borderDefault },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={icon}
    >
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </Pressable>
  );
}

export function Chip({ label, onPress, selected = false, icon, style }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: s.md, paddingVertical: 8, borderRadius: r.full,
      backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault,
    },
    chipSelected: { backgroundColor: c.brand, borderColor: c.brand },
    chipPressed: { opacity: 0.8 },
    chipIcon: {},
    chipText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
    chipTextSelected: { color: c.onBrand },
  }));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : {},
        pressed && styles.chipPressed,
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? colors.onBrand : colors.brand} style={styles.chipIcon} />}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}