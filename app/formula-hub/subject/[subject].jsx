import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import CollectionListScreen from '../../../src/shared/screens/CollectionListScreen';
import { fetchFormulas } from '../../../services/firestoreSync';
import ScreenShell from '../../../src/shared/components/ScreenShell';
import { useTheme } from '../../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../../src/shared/theme/createStyles';

const SEARCH_DEBOUNCE_MS = 200;

const titleCase = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 1 },
  default: {},
});

export default function FormulaSubjectPage() {
  const { subject } = useLocalSearchParams();
  const { colors } = useTheme();
  const subjectLabel = useMemo(() => titleCase(decodeURIComponent(String(subject || ''))), [subject]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderRadius: 22,
      backgroundColor: c.brandLight,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 16,
      ...cardShadow,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCopy: {
      flex: 1,
    },
    heroTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.ink,
      letterSpacing: -0.2,
    },
    heroSubtitle: {
      marginTop: 3,
      fontSize: 12.5,
      lineHeight: 17,
      color: c.inkSoft,
    },
    countPill: {
      minWidth: 30,
      height: 28,
      paddingHorizontal: 9,
      borderRadius: 14,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.brand,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      ...cardShadow,
    },
    input: {
      flex: 1,
      color: c.ink,
      fontSize: 14,
      paddingVertical: 0,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.dangerLight,
      borderRadius: 16,
      marginHorizontal: 16,
      marginTop: 14,
      padding: 14,
    },
    errorText: {
      flex: 1,
      color: c.danger,
      fontSize: 12.5,
      fontWeight: '700',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.danger,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    retryButtonPressed: {
      opacity: 0.85,
    },
    retryText: {
      color: c.onBrand,
      fontSize: 12,
      fontWeight: '800',
    },
    loading: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: c.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 26,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 10,
      color: c.inkSoft,
      fontSize: 13,
    },
  }));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

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
        setError(fetchError?.message || 'Could not load formulas. Check your connection and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const normalizedSubject = String(subject || '').trim().toLowerCase();

    return items.filter((item) => {
      const subjectMatch = !normalizedSubject || String(item.subject || '').toLowerCase().includes(normalizedSubject);
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
      <ScreenShell showBack title={subjectLabel || 'Subject'} subtitle="Browse full formulas, explanations, variables, and examples." >

      
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name="calculator-outline" size={20} color={colors.onBrand} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {subjectLabel || 'Subject'} formulas
          </Text>
          <Text style={styles.heroSubtitle} numberOfLines={2}>
            Browse full formulas, explanations, variables, and examples.
          </Text>
        </View>
        {!loading && !error ? (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{filtered.length}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.grey} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search formulas"
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

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={retry}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          >
            <Ionicons name="refresh" size={14} color={colors.onBrand} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.loadingText}>Loading formulas…</Text>
        </View>
      ) : (
        <CollectionListScreen
          items={filtered}
          loading={false}
          showBack
          emptyTitle={search ? 'No matching formulas' : 'No formulas yet'}
          emptyDescription={
            search
              ? `Nothing matched "${search}". Try another keyword.`
              : 'Formula entries for this subject will appear here.'
          }
          detailRoute="/formula-hub/[id]"
          detailParams={(item) => ({ id: item.id })}
          titleKey="title"
          subtitleKey="explanation"
        />
      )}
      </ScreenShell>
    </View>
  );
}