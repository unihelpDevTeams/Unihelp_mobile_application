import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { ShimmerListItem } from '../../src/shared/components/ShimmerSkeleton';
import EmptyState from '../../src/shared/components/EmptyState';
import { Chip } from '../../src/shared/components/Button';
import { fetchNotes, fetchQuestions, fetchHostels, fetchStudentListings, fetchFormulas } from '../../services/firestoreSync';

const SEARCH_HISTORY_KEY = '@unihelp_search_history';

const FEATURE_SHORTCUTS = [
  { title: 'Study Materials', subtitle: 'Notes and past questions', icon: 'library-outline', route: '/(tabs)/studyMaterials', colorKey: 'brand' },
  { title: 'Formula Hub', subtitle: 'Math, physics and chemistry', icon: 'calculator-outline', route: '/formula-hub', colorKey: 'purple' },
  { title: 'GPA & CGPA', subtitle: 'Calculate and track grades', icon: 'stats-chart-outline', route: '/cgpa', colorKey: 'blue' },
  { title: 'AI Study Assistant', subtitle: 'Solve, explain, summarize', icon: 'sparkles-outline', route: '/ai', colorKey: 'brand' },
  { title: 'Daily Challenge', subtitle: 'Practice and leaderboard', icon: 'flash-outline', route: '/challenge', colorKey: 'orange' },
  { title: 'Smart Schedule', subtitle: 'Classes and reminders', icon: 'calendar-number-outline', route: '/smart-timetable', colorKey: 'green' },
];

const FORMULA_TOPICS = [
  'Quadratic formula',
  'Ohm law',
  'Kinematics',
  'Differentiation',
  'Integration',
  'Molarity',
  'Trigonometry',
  'Probability',
];

const SUGGESTED_SEARCHES = [
  'MTH 101',
  'GST past questions',
  'Physics formulas',
  'Chemistry notes',
  'Hostels near campus',
  'Calculus',
];

const formatPrice = (price) => {
  const n = Number(price);
  return Number.isNaN(n) ? '' : `₦${n.toLocaleString()}`;
};

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const RESULT_TYPES = useMemo(() => ({
    notes: { label: 'Notes', icon: 'book-outline', color: colors.brand },
    questions: { label: 'Questions', icon: 'clipboard-outline', color: colors.blue },
    formulas: { label: 'Formulas', icon: 'calculator-outline', color: colors.purple },
    hostels: { label: 'Hostels', icon: 'home-outline', color: colors.orange },
    products: { label: 'Products', icon: 'pricetag-outline', color: colors.green },
  }), [colors]);

  const styles = useThemeStyles((c, s, r) => ({
    searchContainer: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.surfacePrimary,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: r['2xl'],
      paddingHorizontal: s.lg, paddingVertical: s.md, marginBottom: s.lg,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.textPrimary, paddingVertical: 0 },
    filtersContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: s.xs, marginBottom: s.lg },
    loadingContainer: { paddingTop: s.md },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.sm, marginTop: s.lg },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: c.textTertiary, letterSpacing: 0.5, marginBottom: s.sm, marginTop: s.lg },
    sectionSubtitle: { fontSize: 12, color: c.textSecondary, marginTop: -4, marginBottom: s.sm },
    clearText: { fontSize: 12, fontWeight: '700', color: c.brandText },
    historyItem: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.card,
      borderRadius: r.lg, padding: s.md, marginBottom: s.xs,
    },
    historyItemPressed: { backgroundColor: c.surfaceSecondary },
    historyText: { flex: 1, fontSize: 14, color: c.textPrimary, fontWeight: '600' },
    trendingContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: s.xs },
    shortcutGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.sm,
    },
    shortcutCard: {
      width: '48%',
      minHeight: 108,
      backgroundColor: c.card,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
      justifyContent: 'space-between',
    },
    shortcutCardPressed: { backgroundColor: c.surfaceSecondary },
    shortcutIcon: {
      width: 36,
      height: 36,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: s.sm,
    },
    shortcutTitle: { fontSize: 13.5, fontWeight: '800', color: c.textPrimary },
    shortcutSubtitle: { fontSize: 11.5, color: c.textSecondary, marginTop: 2, lineHeight: 16 },
    topicRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.xs,
    },
    topicChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: s.md,
      paddingVertical: 8,
      borderRadius: r.full,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    topicChipPressed: { backgroundColor: c.surfaceSecondary },
    topicText: { fontSize: 12.5, fontWeight: '700', color: c.textPrimary },
    resultsList: { paddingBottom: s['3xl'] },
    resultCard: {
      flexDirection: 'row', alignItems: 'center', gap: s.md, backgroundColor: c.card,
      borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault,
      padding: s.md, marginBottom: s.sm,
    },
    resultCardPressed: { backgroundColor: c.surfaceSecondary },
    resultIcon: { width: 40, height: 40, borderRadius: r.md, alignItems: 'center', justifyContent: 'center' },
    resultContent: { flex: 1 },
    resultTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    resultSubtitle: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  }));

  useEffect(() => {
    AsyncStorage.getItem(SEARCH_HISTORY_KEY)
      .then((data) => {
        if (data) setSearchHistory(JSON.parse(data));
      })
      .catch(() => {});
  }, []);

  // Save search term to AsyncStorage history
  const saveToHistory = useCallback(async (term) => {
    if (!term.trim()) return;
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      let history = stored ? JSON.parse(stored) : [];
      history = [term, ...history.filter((t) => t !== term)].slice(0, 10);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
      setSearchHistory(history);
    } catch {}
  }, []);

  const performSearch = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const term = searchTerm.toLowerCase();

    try {
      const [notes, questions, formulas, hostels, products] = await Promise.all([
        fetchNotes(),
        fetchQuestions(),
        fetchFormulas(),
        fetchHostels(),
        fetchStudentListings(),
      ]);

      const allResults = [
        ...(notes || []).map((item) => ({
          ...item,
          type: 'note',
          resultType: 'notes',
          title: item.title,
          subtitle: `${item.courseCode || ''} • ${item.year || ''}`,
        })),
        ...(questions || []).map((item) => ({
          ...item,
          type: 'question',
          resultType: 'questions',
          title: item.title,
          subtitle: `${item.course || ''} • ${item.year || ''}`,
        })),
        ...(formulas || []).map((item) => ({
          ...item,
          type: 'formula',
          resultType: 'formulas',
          title: item.title || item.name || 'Formula',
          subtitle: `${item.subject || item.category || 'Formula'}`,
        })),
        ...(hostels || []).map((item) => ({
          ...item,
          type: 'hostel',
          resultType: 'hostels',
          title: item.title || item.name || 'Hostel',
          subtitle: `${item.location || item.school || 'Hostel'} • ${formatPrice(item.price)}`,
        })),
        ...(products || []).map((item) => ({
          ...item,
          type: 'product',
          resultType: 'products',
          title: item.title || item.name || 'Product',
          subtitle: `${item.category || 'Product'} • ${formatPrice(item.price)}`,
        })),
      ];

      const filtered = allResults.filter((item) =>
        [item.title, item.course, item.courseCode, item.year, item.subject].join(' ').toLowerCase().includes(term)
      );

      setResults(filtered.slice(0, 50));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query, performSearch]);

  const filteredResults = useMemo(() => {
    if (activeType === 'all') return results;
    return results.filter((item) => item.resultType === activeType);
  }, [results, activeType]);

  const handleResultPress = (item) => {
    saveToHistory(item.title || '');
    router.push({ pathname: '/view/[type]/[id]', params: { type: item.type, id: item.id } });
  };

  const handleSearchSubmit = () => {
    if (query.trim()) saveToHistory(query.trim());
  };

  const applySuggestedSearch = (term) => {
    setActiveType('all');
    setQuery(term);
    saveToHistory(term);
  };

  const openFeature = (route) => {
    router.push(route);
  };

  const renderResult = ({ item }) => {
    const resultType = RESULT_TYPES[item.resultType] || RESULT_TYPES.notes;
    return (
      <Pressable
        style={({ pressed }) => [styles.resultCard, pressed && styles.resultCardPressed]}
        onPress={() => handleResultPress(item)}
      >
        <View style={[styles.resultIcon, { backgroundColor: `${resultType.color}15` }]}>
          <Ionicons name={resultType.icon} size={18} color={resultType.color} />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </Pressable>
    );
  };

  const clearHistory = async () => {
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify([]));
    setSearchHistory([]);
  };

  return (
    <ScreenShell title="Search" subtitle="Find notes and past questions" showBack>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes, questions..."
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearchSubmit}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <Chip label="All" selected={activeType === 'all'} onPress={() => setActiveType('all')} />
        {Object.keys(RESULT_TYPES).map((type) => (
          <Chip
            key={type}
            label={RESULT_TYPES[type].label}
            selected={activeType === type}
            onPress={() => setActiveType(type)}
          />
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerListItem key={i} style={{ marginBottom: 10 }} />
          ))}
        </View>
      ) : query ? (
        filteredResults.length ? (
          <FlatList
            data={filteredResults}
            keyExtractor={(item) => `${item.resultType}-${item.id}`}
            renderItem={renderResult}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState
            title="No results found"
            description={`No matches for "${query}". Try a different search term.`}
          />
        )
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsList}>
          <Text style={styles.sectionTitle}>Popular features</Text>
          <Text style={styles.sectionSubtitle}>Jump straight into the tools students use most.</Text>
          <View style={styles.shortcutGrid}>
            {FEATURE_SHORTCUTS.map((feature) => {
              const tone = colors[feature.colorKey] || colors.brand;
              return (
                <Pressable
                  key={feature.title}
                  onPress={() => openFeature(feature.route)}
                  style={({ pressed }) => [styles.shortcutCard, pressed && styles.shortcutCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${feature.title}`}
                >
                  <View>
                    <View style={[styles.shortcutIcon, { backgroundColor: `${tone}18` }]}>
                      <Ionicons name={feature.icon} size={19} color={tone} />
                    </View>
                    <Text style={styles.shortcutTitle} numberOfLines={1}>{feature.title}</Text>
                    <Text style={styles.shortcutSubtitle} numberOfLines={2}>{feature.subtitle}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={15} color={colors.textTertiary} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Formula shortcuts</Text>
          <Text style={styles.sectionSubtitle}>Tap a topic to search formula sheets and references.</Text>
          <View style={styles.topicRow}>
            {FORMULA_TOPICS.map((topic) => (
              <Pressable
                key={topic}
                onPress={() => applySuggestedSearch(topic)}
                style={({ pressed }) => [styles.topicChip, pressed && styles.topicChipPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Search ${topic}`}
              >
                <Ionicons name="calculator-outline" size={14} color={colors.purple || colors.brand} />
                <Text style={styles.topicText}>{topic}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Try searching</Text>
          <View style={styles.topicRow}>
            {SUGGESTED_SEARCHES.map((term) => (
              <Pressable
                key={term}
                onPress={() => applySuggestedSearch(term)}
                style={({ pressed }) => [styles.topicChip, pressed && styles.topicChipPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Search ${term}`}
              >
                <Ionicons name="search-outline" size={14} color={colors.brand} />
                <Text style={styles.topicText}>{term}</Text>
              </Pressable>
            ))}
          </View>

          {/* Search History from AsyncStorage */}
          {searchHistory.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent searches</Text>
                <Pressable onPress={clearHistory} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>
              {searchHistory.map((term) => (
                <Pressable
                  key={term}
                  style={({ pressed }) => [styles.historyItem, pressed && styles.historyItemPressed]}
                  onPress={() => setQuery(term)}
                >
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.historyText} numberOfLines={1}>{term}</Text>
                  <Ionicons name="arrow-undo-outline" size={14} color={colors.textTertiary} />
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </ScreenShell>
  );
}
