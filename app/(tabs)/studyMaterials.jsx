import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import DocumentCard from '../../src/shared/components/DocumentCard';
import EmptyState from '../../src/shared/components/EmptyState';
import SectionHeader from '../../src/shared/components/SectionHeader';
import {
  fetchQuestionsPage,
  fetchNotesPage,
} from '../../services/firestoreSync';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest', icon: 'time-outline' },
  { key: 'title_asc', label: 'A - Z', icon: 'arrow-up-outline' },
  { key: 'title_desc', label: 'Z - A', icon: 'arrow-down-outline' },
];

export default function StudyMaterials() {
  const router = useRouter();
  const { colors } = useTheme();

  // Active Tab ('questions' | 'notes')
  const [activeTab, setActiveTab] = useState('questions');

  // Shared Data States
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Filter & Search States
  const [activeSubject, setActiveSubject] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  // Ref flags to prevent race conditions during rapid async switching
  const isMountedRef = useRef(true);

  // Dynamic Accents
  const isQuestions = activeTab === 'questions';
  const activeTone = isQuestions ? colors.blue : colors.brand;
  const activeLightTone = isQuestions ? colors.blueLight : colors.brandLight;

  const styles = useThemeStyles((c, s, r) => ({
    // SEGMENTED TAB SWITCHER
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: c.canvasLight,
      borderRadius: r.full,
      padding: 4,
      borderWidth: 1,
      borderColor: c.borderDefault,
      marginBottom: s.lg,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: r.full,
      gap: s.xs,
    },
    tabButtonActiveQuestions: {
      backgroundColor: c.blue,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
        },
        android: { elevation: 3 },
      }),
    },
    tabButtonActiveNotes: {
      backgroundColor: c.brand,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 4,
        },
        android: { elevation: 3 },
      }),
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
    },
    tabTextActive: {
      color: c.onBrand,
      fontWeight: '800',
    },

    // HERO BANNER
    hero: {
      borderRadius: r['3xl'],
      padding: s.lg,
      marginBottom: s.lg,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
      }),
    },
    heroQuestions: {
      backgroundColor: c.blue,
    },
    heroNotes: {
      backgroundColor: c.brand,
    },
    heroInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.md,
    },
    heroIconWrap: {
      width: 44,
      height: 44,
      borderRadius: r['2xl'],
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroBody: {
      flex: 1,
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: c.onBrand,
      letterSpacing: -0.3,
    },
    heroSubtitle: {
      fontSize: 12,
      color: c.brandGlow,
      marginTop: 2,
      lineHeight: 16,
    },
    heroButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      paddingHorizontal: s.md,
      paddingVertical: 8,
      borderRadius: r.xl,
    },
    heroButtonPressed: {
      opacity: 0.75,
    },
    heroButtonText: {
      color: c.onBrand,
      fontSize: 12,
      fontWeight: '800',
    },

    // SEARCH BAR
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingHorizontal: s.md,
      height: 46,
      marginBottom: s.md,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: c.textPrimary,
      paddingVertical: 0,
    },
    searchClear: {
      padding: 4,
    },

    // SORT CONTROLS
    filterSection: {
      marginBottom: s.md,
    },
    sortWrap: {
      flexDirection: 'row',
      backgroundColor: c.canvasLight,
      borderRadius: r.full,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: 3,
      gap: 4,
    },
    sortOption: {
      flex: 1,
      borderRadius: r.full,
      paddingVertical: 7,
      paddingHorizontal: s.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    sortOptionActiveQuestions: {
      backgroundColor: c.blue,
    },
    sortOptionActiveNotes: {
      backgroundColor: c.brand,
    },
    sortOptionText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    sortOptionTextActive: {
      color: c.onBrand,
      fontWeight: '800',
    },

    // HORIZONTAL SUBJECT CHIPS
    filterScrollView: {
      marginBottom: s.lg,
    },
    filterRow: {
      flexDirection: 'row',
      gap: s.xs,
    },
    filterChip: {
      paddingHorizontal: s.md,
      paddingVertical: 7,
      borderRadius: r.full,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    filterChipActiveQuestions: {
      backgroundColor: c.blue,
      borderColor: c.blue,
    },
    filterChipActiveNotes: {
      backgroundColor: c.brand,
      borderColor: c.brand,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    filterChipTextActive: {
      color: c.onBrand,
      fontWeight: '800',
    },

    // RESULTS ROW & COUNTER
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.md,
    },
    countBadge: {
      minWidth: 28,
      height: 28,
      paddingHorizontal: s.sm,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countBadgeTextQuestions: {
      fontSize: 12,
      fontWeight: '800',
      color: c.blue,
    },
    countBadgeTextNotes: {
      fontSize: 12,
      fontWeight: '800',
      color: c.brandText,
    },
    sectionRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
    },

    // LIST & LOADERS
    list: {
      gap: s.sm,
    },
    loadingWrap: {
      gap: s.md,
      paddingVertical: s.xl,
    },
    loadingText: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '600',
    },
    skeletonCard: {
      height: 100,
      borderRadius: r['2xl'],
      backgroundColor: c.canvasLight,
      borderWidth: 1,
      borderColor: c.borderDefault,
      opacity: 0.6,
    },
    loadMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.sm,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.xl,
      paddingVertical: s.md,
      marginTop: s.md,
    },
    loadMoreButtonPressed: {
      backgroundColor: c.canvasLight,
    },
    loadMoreText: {
      fontSize: 13,
      fontWeight: '800',
    },
  }));

  // Tab switch handler with complete filter reset
  const handleTabSwitch = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSearch('');
    setActiveSubject('All');
    setSort('newest');
  };

  // Safe Page Loader
  const loadPage = useCallback(
    async ({ reset = false } = {}) => {
      if (reset) {
        setLoading(true);
      } else {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
      }

      try {
        const fetcher = isQuestions ? fetchQuestionsPage : fetchNotesPage;
        const page = await fetcher({
          pageSize: PAGE_SIZE,
          cursor: reset ? null : cursor,
        });

        if (!isMountedRef.current) return;

        setItems((current) => {
          const nextItems = page?.items || [];
          if (reset) return nextItems;
          const seen = new Set(current.map((item) => item.id));
          return [...current, ...nextItems.filter((item) => !seen.has(item.id))];
        });
        setCursor(page?.cursor || null);
        setHasMore(Boolean(page?.hasMore));
      } catch (err) {
        console.error('Failed to load study materials:', err);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [cursor, hasMore, isQuestions, loadingMore]
  );

  // Extract distinct subjects dynamically
  const subjects = useMemo(() => {
    const subjectSet = new Set();
    items.forEach((i) => {
      const sub = i.subject || i.course || i.courseCode || '';
      if (sub.trim()) subjectSet.add(sub.trim());
    });
    return ['All', ...Array.from(subjectSet).sort()];
  }, [items]);

  // Optimized Search and Sorting Filter
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = items.filter((item) => {
      const itemSubject = (item.subject || item.course || item.courseCode || '').trim();
      if (activeSubject !== 'All' && itemSubject !== activeSubject) {
        return false;
      }
      if (query) {
        const haystack = [
          item.subject,
          item.course,
          item.courseCode,
          item.title,
          item.name,
          item.description,
          item.topic,
          item.year,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const sorted = [...result];
    if (sort === 'title_asc') {
      sorted.sort((a, b) =>
        String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''))
      );
    } else if (sort === 'title_desc') {
      sorted.sort((a, b) =>
        String(b.title || b.name || '').localeCompare(String(a.title || a.name || ''))
      );
    } else {
      sorted.sort((a, b) => {
        const ta = a?.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : (a?.createdAt?.seconds || 0) * 1000;
        const tb = b?.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : (b?.createdAt?.seconds || 0) * 1000;
        return tb - ta;
      });
    }
    return sorted;
  }, [items, activeSubject, search, sort]);

  const hasActiveFilters = !!search || activeSubject !== 'All' || sort !== 'newest';

  const clearFilters = () => {
    setSearch('');
    setActiveSubject('All');
    setSort('newest');
  };

  // Mount/Tab Change effect
  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    setItems([]);
    setCursor(null);
    setHasMore(false);

    const fetcher = isQuestions ? fetchQuestionsPage : fetchNotesPage;

    fetcher({ pageSize: PAGE_SIZE })
      .then((page) => {
        if (!isMountedRef.current) return;
        setItems(page?.items || []);
        setCursor(page?.cursor || null);
        setHasMore(Boolean(page?.hasMore));
      })
      .catch((err) => {
        console.error('Error fetching study data:', err);
      })
      .finally(() => {
        if (isMountedRef.current) setLoading(false);
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [activeTab, isQuestions]);

  // Adjust subject filter if selection no longer exists in current payload
  useEffect(() => {
    if (activeSubject !== 'All' && !subjects.includes(activeSubject)) {
      setActiveSubject('All');
    }
  }, [activeSubject, subjects]);

  return (
    <ScreenShell
      title="Study Materials"
      subtitle="Access exam past questions & class lecture notes."
      showBack={false}
    >
      {/* SEGMENTED TAB BAR */}
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => handleTabSwitch('questions')}
          accessibilityRole="tab"
          accessibilityState={{ selected: isQuestions }}
          style={[
            styles.tabButton,
            isQuestions && styles.tabButtonActiveQuestions,
          ]}
        >
          <Ionicons
            name={isQuestions ? 'clipboard' : 'clipboard-outline'}
            size={16}
            color={isQuestions ? colors.onBrand : colors.textSecondary}
          />
          <Text
            style={[styles.tabText, isQuestions && styles.tabTextActive]}
          >
            Past Questions
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleTabSwitch('notes')}
          accessibilityRole="tab"
          accessibilityState={{ selected: !isQuestions }}
          style={[
            styles.tabButton,
            !isQuestions && styles.tabButtonActiveNotes,
          ]}
        >
          <Ionicons
            name={!isQuestions ? 'book' : 'book-outline'}
            size={16}
            color={!isQuestions ? colors.onBrand : colors.textSecondary}
          />
          <Text
            style={[styles.tabText, !isQuestions && styles.tabTextActive]}
          >
            Lecture Notes
          </Text>
        </Pressable>
      </View>

      {/* DYNAMIC HERO BANNER */}
      <View
        style={[
          styles.hero,
          isQuestions ? styles.heroQuestions : styles.heroNotes,
        ]}
      >
        <View style={styles.heroInner}>
          <View style={styles.heroIconWrap}>
            <Ionicons
              name={isQuestions ? 'document-text' : 'journal'}
              size={22}
              color={colors.onBrand}
            />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>
              {isQuestions ? 'Past Questions' : 'Lecture Notes'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {!loading
                ? `${items.length} ${isQuestions ? 'papers' : 'notes'} available`
                : 'Fetching study catalog...'}
            </Text>
          </View>

          <Pressable
            onPress={() =>
              router.push(`/upload?type=${isQuestions ? 'question' : 'note'}`)
            }
            style={({ pressed }) => [
              styles.heroButton,
              pressed && styles.heroButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Upload new ${isQuestions ? 'past question' : 'lecture note'}`}
          >
            <Ionicons name="add" size={16} color={colors.onBrand} />
            <Text style={styles.heroButtonText}>Upload</Text>
          </Pressable>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.greyLight} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${isQuestions ? 'papers by course code or year...' : 'notes by title or topic...'}`}
          placeholderTextColor={colors.greyLight}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch('')}
            hitSlop={8}
            style={styles.searchClear}
            accessibilityLabel="Clear search text"
          >
            <Ionicons name="close-circle" size={18} color={colors.greyLight} />
          </Pressable>
        )}
      </View>

      {/* SORT CONTROLS */}
      <View style={styles.filterSection}>
        <View style={styles.sortWrap}>
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setSort(opt.key)}
                style={[
                  styles.sortOption,
                  active &&
                    (isQuestions
                      ? styles.sortOptionActiveQuestions
                      : styles.sortOptionActiveNotes),
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={opt.icon}
                  size={14}
                  color={active ? colors.onBrand : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    active && styles.sortOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* HORIZONTAL SCROLLABLE SUBJECT CHIPS */}
      {!loading && subjects.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterRow}
        >
          {subjects.map((subject) => {
            const isActive = activeSubject === subject;
            return (
              <Pressable
                key={subject}
                onPress={() => setActiveSubject(subject)}
                style={({ pressed }) => [
                  styles.filterChip,
                  isActive &&
                    (isQuestions
                      ? styles.filterChipActiveQuestions
                      : styles.filterChipActiveNotes),
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {subject}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* RESULTS HEADER */}
      <View style={styles.sectionRow}>
        <SectionHeader
          title={
            hasActiveFilters
              ? 'Results'
              : activeSubject === 'All'
              ? `All ${isQuestions ? 'Papers' : 'Notes'}`
              : `${activeSubject}`
          }
          subtitle={
            filteredItems.length === 1
              ? `1 ${isQuestions ? 'paper' : 'note'} found`
              : `${filteredItems.length} ${isQuestions ? 'papers' : 'notes'} found`
          }
        />

        <View style={styles.sectionRowRight}>
          {hasActiveFilters && (
            <Pressable
              onPress={clearFilters}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Reset all filters"
            >
              <Ionicons name="refresh" size={16} color={activeTone} />
            </Pressable>
          )}

          {filteredItems.length > 0 && (
            <View
              style={[
                styles.countBadge,
                { backgroundColor: activeLightTone },
              ]}
            >
              <Text
                style={
                  isQuestions
                    ? styles.countBadgeTextQuestions
                    : styles.countBadgeTextNotes
                }
              >
                {filteredItems.length}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* CONTENT LIST & STATES */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={activeTone} />
          <Text style={[styles.loadingText, { color: activeTone }]}>
            Fetching {isQuestions ? 'past questions' : 'lecture notes'}...
          </Text>
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
        </View>
      ) : filteredItems.length > 0 ? (
        <View style={styles.list}>
          {filteredItems.map((item) => (
            <DocumentCard
              key={item.id}
              item={item}
              tone={activeTone}
              onPress={() =>
                router.push({
                  pathname: '/view/[type]/[id]',
                  params: {
                    type: isQuestions ? 'question' : 'note',
                    id: item.id,
                  },
                })
              }
            />
          ))}

          {hasMore && (
            <Pressable
              onPress={() => loadPage()}
              disabled={loadingMore}
              style={({ pressed }) => [
                styles.loadMoreButton,
                pressed && styles.loadMoreButtonPressed,
              ]}
              accessibilityRole="button"
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={activeTone} />
              ) : (
                <Ionicons name="chevron-down" size={16} color={activeTone} />
              )}
              <Text style={[styles.loadMoreText, { color: activeTone }]}>
                {loadingMore
                  ? 'Loading more...'
                  : `Load more ${isQuestions ? 'questions' : 'notes'}`}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <EmptyState
          title={
            hasActiveFilters
              ? `No matching ${isQuestions ? 'questions' : 'notes'}`
              : activeSubject === 'All'
              ? `No ${isQuestions ? 'questions' : 'notes'} available`
              : `No ${activeSubject} ${isQuestions ? 'questions' : 'notes'}`
          }
          description={
            hasActiveFilters
              ? 'Try clearing your search query or switching subject filters.'
              : `No study documents have been added yet.`
          }
          actionLabel={
            hasActiveFilters
              ? 'Clear filters'
              : activeSubject !== 'All'
              ? 'Show all subjects'
              : undefined
          }
          onAction={
            hasActiveFilters
              ? clearFilters
              : activeSubject !== 'All'
              ? () => setActiveSubject('All')
              : undefined
          }
          icon="search-outline"
        />
      )}
    </ScreenShell>
  );
}