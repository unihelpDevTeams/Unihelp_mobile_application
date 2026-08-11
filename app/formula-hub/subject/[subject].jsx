import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Shared UI & Services
import CollectionListScreen from '../../../src/shared/screens/CollectionListScreen';
import { fetchFormulas } from '../../../services/firestoreSync';
import ScreenShell from '../../../src/shared/components/ScreenShell';

// Theme Context & Design System
import { useTheme } from '../../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../../src/shared/theme/createStyles';
import { borderRadius, shadows, spacing, typography } from '../../../src/shared/theme';

const SEARCH_DEBOUNCE_MS = 200;

const titleCase = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export default function FormulaSubjectPage() {
  const { subject } = useLocalSearchParams();
  const { colors } = useTheme();

  const subjectLabel = useMemo(
    () => titleCase(decodeURIComponent(String(subject || 'Subject'))),
    [subject]
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Subject-specific icon & theme resolution
  const subjectConfig = useMemo(() => {
    switch (subjectLabel) {
      case 'Mathematics':
        return {
          icon: 'calculator-outline',
          colors: [colors.brand || '#4F46E5', '#7C3AED'],
        };
      case 'Physics':
        return {
          icon: 'flash-outline',
          colors: [colors.blue || '#0EA5E9', '#0284C7'],
        };
      case 'Chemistry':
        return {
          icon: 'flask-outline',
          colors: [colors.green || '#10B981', '#059669'],
        };
      case 'Biology':
        return {
          icon: 'leaf-outline',
          colors: [colors.orange || '#F97316', '#EA580C'],
        };
      case 'Economics':
        return {
          icon: 'cash-outline',
          colors: [colors.purple || '#9333EA', '#7E22CE'],
        };
      case 'Thermodynamics':
        return {
          icon: 'thermometer-outline',
          colors: [colors.red || '#DC2626', '#B91C1C'],
        };
      default:
        return {
          icon: 'library-outline',
          colors: [colors.brand || '#4F46E5', '#7C3AED'],
        };
    }
  }, [subjectLabel, colors]);

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: spacing.xl,
    },
    heroBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surfacePrimary,
      borderRadius: borderRadius['2xl'],
      padding: spacing.lg,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.borderDefault,
      ...shadows.sm,
    },
    heroLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroMeta: {
      flex: 1,
    },
    heroLabel: {
      ...typography.xs,
      ...typography.bold,
      color: c.textTertiary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    heroSubject: {
      ...typography['2xl'],
      ...typography.extrabold,
      color: c.textPrimary,
    },
    countBadge: {
      backgroundColor: c.brandLight,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.brandBorder,
    },
    countBadgeText: {
      ...typography.xs,
      ...typography.extrabold,
      color: c.brandText,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.inputBackground || c.surfacePrimary,
      borderWidth: 1,
      borderColor: c.inputBorder || c.borderDefault,
      borderRadius: borderRadius.xl,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...shadows.sm,
    },
    input: {
      flex: 1,
      color: c.textPrimary,
      ...typography.md,
      paddingVertical: 0,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.dangerLight,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    errorText: {
      flex: 1,
      color: c.danger,
      ...typography.sm,
      ...typography.semibold,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: c.danger,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    retryButtonPressed: {
      opacity: 0.85,
    },
    retryText: {
      color: c.onBrand,
      ...typography.xs,
      ...typography.bold,
    },
    loadingCard: {
      backgroundColor: c.surfacePrimary,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingVertical: spacing['3xl'],
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    loadingText: {
      marginTop: spacing.md,
      color: c.textSecondary,
      ...typography.sm,
    },
    listWrapper: {
      flex: 1,
    },
  }));

  // Debounce search state
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch formulas on load or retry
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetchFormulas()
      .then((result) => {
        if (!active) return;
        setItems(Array.isArray(result) ? result : []);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(
          fetchError?.message ||
            'Could not load formulas. Check your connection and try again.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  // Filter items by subject and query
  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const normalizedSubject = String(subject || '').trim().toLowerCase();

    return items.filter((item) => {
      const subjectMatch =
        !normalizedSubject ||
        String(item.subject || '')
          .toLowerCase()
          .includes(normalizedSubject);
      if (!subjectMatch) return false;

      if (!query) return true;

      const haystack = [
        item.title,
        item.subject,
        item.category,
        item.explanation,
        item.description,
        item.example,
        item.formula,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, debouncedSearch, subject]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <View style={styles.container}>
      <ScreenShell
        showBack
        title={subjectLabel}
        subtitle="Full formulas, explanations, variables, and worked examples."
      >
        <View style={styles.contentContainer}>
          {/* Subject Metric Bar */}
          <View style={styles.heroBar}>
            <View style={styles.heroLeft}>
              <LinearGradient
                colors={subjectConfig.colors}
                style={styles.iconContainer}
              >
                <Ionicons
                  name={subjectConfig.icon}
                  size={20}
                  color={colors.onBrand}
                />
              </LinearGradient>

              <View style={styles.heroMeta}>
                <Text style={styles.heroLabel}>SUBJECT</Text>
                <Text style={styles.heroSubject} numberOfLines={1}>
                  {subjectLabel}
                </Text>
              </View>
            </View>

            {!loading && !error ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {filtered.length} {filtered.length === 1 ? 'Formula' : 'Formulas'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Search Input Bar */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.iconSecondary || colors.grey} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${subjectLabel.toLowerCase()} formulas...`}
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.greyLight} />
              </Pressable>
            ) : null}
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={retry}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.retryButtonPressed,
                ]}
              >
                <Ionicons name="refresh" size={14} color={colors.onBrand} />
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : loading ? (
            /* Loading State Card */
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.loadingText}>Loading formulas…</Text>
            </View>
          ) : (
            /* Collection List View */
            <View style={styles.listWrapper}>
              <CollectionListScreen
                items={filtered}
                loading={false}
                showBack={false}
                emptyTitle={search ? 'No matching formulas' : 'No formulas yet'}
                emptyDescription={
                  search
                    ? `Nothing matched "${search}". Try another keyword.`
                    : `Formula entries for ${subjectLabel} will appear here.`
                }
                detailRoute="/formula-hub/[id]"
                detailParams={(item) => ({ id: item.id })}
                titleKey="title"
                subtitleKey="explanation"
              />
            </View>
          )}
        </View>
      </ScreenShell>
    </View>
  );
}