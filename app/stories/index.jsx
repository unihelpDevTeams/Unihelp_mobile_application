import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import CollectionListScreen from '../../src/shared/screens/CollectionListScreen';
import { fetchStories } from '../../services/firestoreSync';
import ScreenShell from '../../src/shared/components/ScreenShell';

const SORT_OPTIONS = [
  { key: 'recent', label: 'Newest' },
  { key: 'title', label: 'A–Z' },
  { key: 'reading', label: 'Quick reads' },
];

export default function StoriesHome() {
  const router = useRouter();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('All');
  const [sortKey, setSortKey] = useState('recent');

  const load = useCallback(({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    return fetchStories()
      .then(setStories)
      .catch((err) => setError(err?.message || 'Unable to load stories.'))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(() => load({ silent: true }), [load]);

  // ---- derive available genres from the data ----
  const genres = useMemo(() => {
    const set = new Set();
    stories.forEach((s) => {
      const g = s.genre || s.category;
      if (g) set.add(g);
    });
    return ['All', ...Array.from(set).sort()];
  }, [stories]);

  // ---- filter + search + sort ----
  const visibleStories = useMemo(() => {
    let result = stories;

    if (genreFilter !== 'All') {
      result = result.filter((s) => (s.genre || s.category) === genreFilter);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((s) => {
        const haystack = `${s.title || ''} ${s.summary || s.description || ''} ${
          s.authorName || s.author || ''
        }`.toLowerCase();
        return haystack.includes(q);
      });
    }

    const withStats = result.map((s) => {
      const words = s.content?.trim() ? s.content.trim().split(/\s+/).length : 0;
      return { ...s, __words: words };
    });

    switch (sortKey) {
      case 'title':
        return [...withStats].sort((a, b) =>
          (a.title || '').localeCompare(b.title || '')
        );
      case 'reading':
        return [...withStats].sort((a, b) => a.__words - b.__words);
      case 'recent':
      default:
        return [...withStats].sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt || 0;
          const bTime = b.createdAt?.seconds || b.createdAt || 0;
          return bTime - aTime;
        });
    }
  }, [stories, query, genreFilter, sortKey]);

  const activeFilterCount = (genreFilter !== 'All' ? 1 : 0) + (query.trim() ? 1 : 0);

  return (
    <View style={styles.container}>
      <ScreenShell title="Stories" subtitle="Read and publish stories from the shared website collection." showBack>
      <CollectionListScreen
        title="Stories"
        subtitle="Read and publish stories from the shared website collection."
        items={visibleStories}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        error={error}
        onRetry={load}
        emptyTitle={activeFilterCount > 0 ? 'No matching stories' : 'No stories yet'}
        emptyDescription={
          activeFilterCount > 0
            ? 'Try a different search term or filter.'
            : 'Stories published on the website will appear here.'
        }
        detailRoute="/stories/[storyId]"
        detailParams={(item) => ({ storyId: item.id })}
        ListHeaderComponent={
          !loading && stories.length > 0 ? (
            <View style={styles.controls}>
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search stories, authors..."
                  placeholderTextColor="#94A3B8"
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <Text style={styles.clearIcon}>✕</Text>
                  </Pressable>
                ) : null}
              </View>

              {genres.length > 2 ? (
                <View style={styles.chipRow}>
                  {genres.map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setGenreFilter(g)}
                      style={[styles.chip, genreFilter === g && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, genreFilter === g && styles.chipTextActive]}>
                        {g}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.sortRow}>
                <Text style={styles.resultCount}>
                  {visibleStories.length} {visibleStories.length === 1 ? 'story' : 'stories'}
                </Text>
                <View style={styles.sortButtons}>
                  {SORT_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.key}
                      onPress={() => setSortKey(opt.key)}
                      style={[styles.sortButton, sortKey === opt.key && styles.sortButtonActive]}
                    >
                      <Text
                        style={[
                          styles.sortButtonText,
                          sortKey === opt.key && styles.sortButtonTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : null
        }
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/stories/create')}
        accessibilityRole="button"
        accessibilityLabel="Write a new story"
      >
        <Text style={styles.fabIcon}>✎</Text>
        <Text style={styles.fabText}>New story</Text>
      </Pressable>
      </ScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  clearIcon: {
    color: '#94A3B8',
    fontSize: 14,
    paddingLeft: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#4F46E5',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sortButtonActive: {
    backgroundColor: '#F1F5F9',
  },
  sortButtonText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: '#4F46E5',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    backgroundColor: '#4338CA',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 15,
    marginRight: 7,
    fontWeight: '700',
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});