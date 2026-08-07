import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

export default function DailyStreakBanner({ streakCount, streakDates, onPress, onStudyNow }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    banner: {
      backgroundColor: c.greenLight, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.greenLight,
      padding: s.lg, marginBottom: s.lg, flexDirection: 'row', alignItems: 'center', gap: s.md,
    },
    bannerPressed: { opacity: 0.92 },
    iconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1 },
    title: { fontSize: 14, fontWeight: '800', color: c.green },
    subtitle: { marginTop: 2, fontSize: 12, color: c.grey, fontWeight: '600' },
    actionButton: { backgroundColor: c.green, borderRadius: r.full, paddingHorizontal: s.md, paddingVertical: s.sm },
    actionText: { color: c.onBrand, fontSize: 12, fontWeight: '700' },
  }));

  if (!streakCount && !streakDates?.length) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="flame" size={20} color={colors.onBrand} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{streakCount}-day streak!</Text>
        <Text style={styles.subtitle}>Keep studying daily to build your streak.</Text>
      </View>
      <Pressable onPress={onStudyNow} style={styles.actionButton}>
        <Text style={styles.actionText}>Study now</Text>
      </Pressable>
    </Pressable>
  );
}
