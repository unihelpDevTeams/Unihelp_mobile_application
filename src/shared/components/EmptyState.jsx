import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

const ILLUSTRATIONS = {
  notes: '📚', questions: '❓', groups: '👥', search: '🔍',
  notifications: '🔔', downloads: '📥', saved: '🔖', premium: '👑',
  leaderboard: '🏆', achievements: '⭐', default: '📄',
};

export default function EmptyState({
  title = 'Nothing here yet', description = 'Check back later for updates.',
  icon, iconColor, actionLabel, onAction, illustration, style,
}) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault,
      padding: s['3xl'], alignItems: 'center', justifyContent: 'center',
    },
    illustrationWrap: { marginBottom: s.lg },
    illustration: { fontSize: 48 },
    iconWrap: { width: 64, height: 64, borderRadius: r.xl, alignItems: 'center', justifyContent: 'center', marginBottom: s.lg },
    title: { fontSize: 18, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: s.sm, letterSpacing: -0.2 },
    description: { fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center', maxWidth: '85%', marginBottom: s.xl },
    actionButton: { paddingHorizontal: s['2xl'], paddingVertical: s.md, borderRadius: r.full },
    actionButtonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    actionText: { color: c.onBrand, fontSize: 14, fontWeight: '700' },
    searchContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: s.lg },
    searchPrompt: { alignItems: 'center' },
    searchEmoji: { fontSize: 48, marginBottom: s.lg },
    searchTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary, marginBottom: s.sm },
    searchDescription: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
  }));

  const effectiveIconColor = iconColor || colors.brand;
  const illustrationChar = illustration || icon;
  const showIllustration = Boolean(illustrationChar);

  return (
    <View style={[styles.card, style]}>
      {showIllustration ? (
        <View style={styles.illustrationWrap}>
          <Text style={styles.illustration}>{ILLUSTRATIONS[illustration] || illustrationChar}</Text>
        </View>
      ) : icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.brandLight }]}>
          <Ionicons name={icon} size={28} color={effectiveIconColor} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.actionButton, { backgroundColor: effectiveIconColor }, pressed && styles.actionButtonPressed]}
          accessibilityRole="button" accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyStateWithSearch({ onSearch, searchPlaceholder = 'Search...' }) {
  const styles = useThemeStyles((c, s, r) => ({
    searchContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: s.lg },
    searchPrompt: { alignItems: 'center' },
    searchEmoji: { fontSize: 48, marginBottom: s.lg },
    searchTitle: { fontSize: 20, fontWeight: '800', color: c.textPrimary, marginBottom: s.sm },
    searchDescription: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
  }));

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchPrompt}>
        <Text style={styles.searchEmoji}>🔍</Text>
        <Text style={styles.searchTitle}>Find what you need</Text>
        <Text style={styles.searchDescription}>
          Search across notes, questions, groups, and more. Everything is just a tap away.
        </Text>
      </View>
    </View>
  );
}
