import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useThemeStyles } from '../theme/createStyles';

export const SCHOOL_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'university', label: 'Universities' },
  { value: 'polytechnic', label: 'Polytechnics' },
  { value: 'college', label: 'Colleges' },
];

export default function SchoolTypeFilter({ value = 'all', onChange }) {
  const styles = useThemeStyles((c, s, r) => ({
    row: { flexDirection: 'row', gap: s.sm, paddingVertical: s.sm },
    chip: {
      paddingHorizontal: s.md, paddingVertical: s.xs,
      borderRadius: r.full, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.canvasLight,
    },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { fontSize: 12.5, fontWeight: '700', color: c.grey },
    chipTextActive: { color: c.onBrand },
  }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {SCHOOL_TYPES.map((t) => {
        const active = value === t.value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange?.(t.value)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}