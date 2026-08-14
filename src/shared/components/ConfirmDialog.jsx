import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  icon,
  loading = false,
  onCancel,
  onConfirm,
}) {
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const destructive = variant === 'destructive';
  const warning = variant === 'warning';
  const accent = destructive ? colors.danger : warning ? colors.warning : colors.brand;
  const soft = destructive ? colors.dangerLight : warning ? colors.orangeLight : colors.brandLight;
  const iconName = icon || (destructive ? 'trash-outline' : warning ? 'warning-outline' : 'help-circle-outline');

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: soft }]}>
            <Ionicons name={iconName} size={24} color={accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && !loading && styles.pressed]}
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                { backgroundColor: accent },
                pressed && !loading && styles.pressed,
                loading && styles.disabled,
              ]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator size="small" color={colors.onBrand} /> : null}
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c, s, r) => ({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: s.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: c.modalBackground,
    borderRadius: r['2xl'],
    borderWidth: 1,
    borderColor: c.borderDefault,
    padding: s.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: s.md,
  },
  title: {
    color: c.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: c.textSecondary,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: s.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: s.md,
    width: '100%',
    marginTop: s.xl,
  },
  cancelButton: {
    flex: 1,
    borderRadius: r.lg,
    backgroundColor: c.canvasLight,
    borderWidth: 1,
    borderColor: c.borderDefault,
    paddingVertical: s.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 1,
    borderRadius: r.lg,
    paddingVertical: s.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: s.sm,
  },
  cancelText: {
    color: c.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmText: {
    color: c.onBrand,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.65,
  },
});
