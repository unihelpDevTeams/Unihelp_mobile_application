import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

export default function SectionHeader({ title, subtitle, actionLabel, onPress, icon = 'sparkles-outline' }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: s.md, marginBottom: s.md },
    copy: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    iconBubble: { width: 24, height: 24, borderRadius: r.full, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 17, fontWeight: '800', color: c.textPrimary },
    subtitle: { marginTop: s.xs, fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    action: { paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: r.full, backgroundColor: c.brandLight },
    actionText: { fontSize: 12, fontWeight: '700', color: c.brandText },
  }));

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View style={styles.iconBubble}>
            <Ionicons name={icon} size={13} color={colors.brandText} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onPress} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}