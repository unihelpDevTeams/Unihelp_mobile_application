import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import FormulaMath from '../../src/shared/components/FormulaMath';
import { getFormulaBookmarks, removeFormulaBookmark } from '../../src/shared/services/formulaBookmarks';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { shadows, typography } from '../../src/shared/theme';

export default function FormulaBookmarks() {
  const router = useRouter();
  const { colors } = useTheme();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState('');

  const styles = useThemeStyles((c, s, r) => ({
    content: { gap: s.lg, paddingBottom: s['3xl'] },
    summaryCard: {
      backgroundColor: c.brandLight,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.brandBorder,
      padding: s.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.md,
      ...shadows.sm,
    },
    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: r.lg,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryTitle: { ...typography['2xl'], ...typography.extrabold, color: c.textPrimary },
    summaryText: { ...typography.sm, ...typography.medium, color: c.textSecondary, marginTop: 2 },
    loadingCard: {
      minHeight: 160,
      borderRadius: r['2xl'],
      backgroundColor: c.surfacePrimary,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.sm,
    },
    loadingText: { ...typography.sm, ...typography.medium, color: c.textSecondary },
    card: {
      backgroundColor: c.surfacePrimary,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      overflow: 'hidden',
      ...shadows.card,
    },
    cardBody: { padding: s.lg },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: s.md },
    titleWrap: { flex: 1, minWidth: 0 },
    title: { ...typography['2xl'], ...typography.extrabold, color: c.textPrimary },
    meta: { ...typography.sm, ...typography.medium, color: c.textSecondary, marginTop: 4 },
    removeButton: {
      width: 36,
      height: 36,
      borderRadius: r.md,
      backgroundColor: c.orangeLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.orange,
    },
    pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
    formulaBox: {
      height: 92,
      backgroundColor: c.background,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      marginTop: s.md,
      overflow: 'hidden',
    },
    explanation: { ...typography.sm, ...typography.regular, color: c.textSecondary, lineHeight: 19, marginTop: s.md },
    openRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
      paddingTop: s.md,
      marginTop: s.md,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    openText: { ...typography.sm, ...typography.extrabold, color: c.brand },
  }));

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getFormulaBookmarks()
        .then((items) => {
          if (active) setBookmarks(items);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const removeBookmark = async (id) => {
    setRemovingId(String(id));
    try {
      await removeFormulaBookmark(id);
      setBookmarks((current) => current.filter((item) => String(item.id) !== String(id)));
    } finally {
      setRemovingId('');
    }
  };

  return (
    <ScreenShell title="Bookmarks" subtitle="Saved formulas and quick references." showBack scrollable={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="bookmark" size={20} color={colors.onBrand} />
          </View>
          <View>
            <Text style={styles.summaryTitle}>{bookmarks.length} saved</Text>
            <Text style={styles.summaryText}>Your local formula shortlist.</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.loadingText}>Loading saved formulas...</Text>
          </View>
        ) : bookmarks.length ? (
          bookmarks.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => router.navigate(`/formula-hub/${encodeURIComponent(String(item.id))}`)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
            >
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={styles.titleWrap}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.meta} numberOfLines={1}>{item.subject} • {item.category}</Text>
                  </View>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      removeBookmark(item.id);
                    }}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.title} bookmark`}
                  >
                    {removingId === String(item.id) ? (
                      <ActivityIndicator size="small" color={colors.orange} />
                    ) : (
                      <Ionicons name="bookmark" size={17} color={colors.orange} />
                    )}
                  </Pressable>
                </View>

                {item.formula ? (
                  <View style={styles.formulaBox}>
                    <FormulaMath source={item.formula} color={colors.textPrimary} backgroundColor={colors.background} />
                  </View>
                ) : null}

                {item.explanation ? (
                  <Text style={styles.explanation} numberOfLines={2}>{item.explanation}</Text>
                ) : null}

                <View style={styles.openRow}>
                  <Text style={styles.openText}>Open details</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.brand} />
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon="bookmark-outline"
            title="No saved formulas yet"
            description="Open any formula and tap the bookmark button to keep it here for quick revision."
            actionLabel="Browse formulas"
            onAction={() => router.navigate('/formula-hub/subjects')}
          />
        )}
      </ScrollView>
    </ScreenShell>
  );
}
