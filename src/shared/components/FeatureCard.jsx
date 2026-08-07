import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

export default function FeatureCard({ icon, title, description, onPress, accent, style }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault,
      padding: s.lg, marginBottom: s.md,
    },
    cardIconRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    cardIcon: { width: 26, height: 26, borderRadius: r.sm, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: c.textPrimary },
    cardText: { marginTop: s.sm, color: c.textSecondary, fontSize: 13, lineHeight: 19 },
  }));

  return (
    <Pressable onPress={onPress} style={[styles.card, style]}>
      <View style={styles.cardIconRow}>
        {icon ? (
          <View style={[styles.cardIcon, { backgroundColor: accent ? `${accent}15` : colors.brandLight }]}>
            <Ionicons name={icon} size={14} color={accent || colors.brand} />
          </View>
        ) : null}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {description ? <Text style={styles.cardText}>{description}</Text> : null}
    </Pressable>
  );
}