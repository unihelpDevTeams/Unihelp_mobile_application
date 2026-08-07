import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../shared/theme/ThemeContext';
import { useThemeStyles } from '../../shared/theme/createStyles';
import { INTEREST_OPTIONS } from '../validation';

/**
 * Multi-select interest chips component.
 */
export default function InterestSelector({ selected = [], onToggle, error }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    container: { gap: s.sm },
    label: { color: c.textSecondary, fontSize: 12.5, fontWeight: '700' },
    hint: { color: c.textTertiary, fontSize: 12, lineHeight: 18 },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: r.full,
      backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault,
    },
    chipSelected: { backgroundColor: c.brand, borderColor: c.brand },
    chipPressed: { opacity: 0.8 },
    chipIcon: {},
    chipText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
    chipTextSelected: { color: c.onBrand },
    errorText: { color: c.error, fontSize: 12, fontWeight: '500' },
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Interests</Text>
      <Text style={styles.hint}>Select the topics you are interested in (tap to toggle).</Text>
      <View style={styles.chipsContainer}>
        {INTEREST_OPTIONS.map((interest) => {
          const isSelected = selected.includes(interest);
          return (
            <Pressable
              key={interest}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
              onPress={() => onToggle(interest)}
              accessibilityRole="switch"
              accessibilityLabel={`${interest}${isSelected ? ', selected' : ''}`}
              accessibilityState={{ selected: isSelected }}
            >
              {isSelected && <Ionicons name="checkmark" size={14} color={colors.onBrand} style={styles.chipIcon} />}
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {interest}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}
