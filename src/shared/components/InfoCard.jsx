import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

export default function InfoCard({ title, text, icon }) {
  const styles = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault,
      padding: s.lg, marginBottom: s.sm,
    },
    iconContainer: { marginBottom: s.sm },
    title: { fontSize: 15, fontWeight: '800', color: c.textPrimary, marginBottom: s.xs },
    text: { color: c.textSecondary, fontSize: 13, lineHeight: 19 },
  }));

  return (
    <View style={styles.card}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

