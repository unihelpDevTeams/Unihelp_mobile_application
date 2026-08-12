import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
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
import DraggableBottomSheet from '../../src/shared/components/DraggableBottomSheet';
import {
  fetchQuestionsPage,
  fetchNotesPage,
} from '../../services/firestoreSync';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest first', icon: 'time-outline' },
  { key: 'title_asc', label: 'Title A - Z', icon: 'arrow-up-outline' },
  { key: 'title_desc', label: 'Title Z - A', icon: 'arrow-down-outline' },
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Ref flags to prevent race conditions during rapid async switching
  const isMountedRef = useRef(true);

  // Dynamic Accents
  const isQuestions = activeTab === 'questions';
  const activeTone = isQuestions ? colors.blueLight : colors.brand;
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
      marginBottom: s.md,
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
      backgroundColor: c.blueLight,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
        android: { elevation: 3 },
      }),
    },
    tabButtonActiveNotes: {
      backgroundColor: c.brand,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
        android: { elevation: 3 },
      }),
    },
    tabText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    tabTextActive: { color: c.onBrand, fontWeight: '800' },

    // SLIM STATUS STRIP (replaces the old tall hero)
    statusStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      borderRadius: r.xl,
      paddingVertical: s.sm,
      paddingHorizontal: s.md,
      marginBottom: s.md,
    },
    statusIconWrap: {
      width: 34, height: 34, borderRadius: r.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      alignItems: 'center', justifyContent: 'center',
    },
    statusTextWrap: { flex: 1 },
    statusTitle: { fontSize: 14, fontWeight: '800', color: c.onBrand },
    statusSubtitle: { fontSize: 11.5, color: c.onBrand, marginTop: 1 },
    statusUploadButton: {
      width: 34, height: 34, borderRadius: r.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      alignItems: 'center', justifyContent: 'center',
    },
    statusUploadButtonPressed: { opacity: 0.7 },

    // SEARCH + FILTER ROW
    searchRow: { flexDirection: 'row', gap: s.sm, marginBottom: s.sm },
    searchWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingHorizontal: s.md,
      height: 46,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.textPrimary, paddingVertical: 0 },
    searchClear: { padding: 4 },
    filterButton: {
      width: 46, height: 46, borderRadius: r.xl,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
    },
    filterButtonActive: { backgroundColor: activeLightTone, borderColor: activeTone },
    filterButtonPressed: { opacity: 0.75 },
    filterDot: {
      position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4,
      backgroundColor: activeTone, borderWidth: 1.5, borderColor: c.card,
    },

    // Quick active-filter summary (tap reopens the sheet)
    activeFilterSummary: {
      flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: s.md, marginLeft: 2,
    },
    activeFilterText: { fontSize: 12, fontWeight: '600', color: c.textSecondary },
    activeFilterTextTone: { color: activeTone, fontWeight: '800' },
    activeFilterClear: { fontSize: 12, fontWeight: '800', color: c.red, marginLeft: 4 },

    // RESULTS ROW & COUNTER
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md },
    countBadge: { minWidth: 28, height: 28, paddingHorizontal: s.sm, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center' },
    countBadgeTextQuestions: { fontSize: 12, fontWeight: '800', color: c.blueLight },
    countBadgeTextNotes: { fontSize: 12, fontWeight: '800', color: c.brandText },

    // LIST & LOADERS
    list: { gap: s.sm },
    loadingWrap: { gap: s.sm, paddingTop: s.xs },
    skeletonCard: {
      flexDirection: 'row', alignItems: 'center', gap: s.md,
      height: 84, borderRadius: r['2xl'], paddingHorizontal: s.md,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
    },
    skeletonIcon: { width: 42, height: 42, borderRadius: r.lg, backgroundColor: c.canvasLight },
    skeletonLines: { flex: 1, gap: 8 },
    skeletonLineWide: { height: 12, borderRadius: 6, backgroundColor: c.canvasLight, width: '70%' },
    skeletonLineNarrow: { height: 10, borderRadius: 5, backgroundColor: c.canvasLight, width: '40%' },
    loadMoreButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s.sm,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl,
      paddingVertical: s.md, marginTop: s.md,
    },
    loadMoreButtonPressed: { backgroundColor: c.canvasLight },
    loadMoreText: { fontSize: 13, fontWeight: '800' },

    // FILTER SHEET CONTENT
    sheetLabel: { fontSize: 11.5, fontWeight: '800', color: c.greyLight, letterSpacing: 0.6, marginBottom: s.sm, marginTop: s.xs },
    sortRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: s.md },
    sortIconWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.canvasLight, alignItems: 'center', justifyContent: 'center' },
    sortIconWrapActive: { backgroundColor: activeLightTone },
    sortRowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: c.ink },
    sortRowLabelActive: { fontWeight: '800' },
    sheetDivider: { height: 1, backgroundColor: c.skeleton, marginVertical: s.sm },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: s.xs, marginBottom: s.sm },
    filterChip: {
      paddingHorizontal: s.md, paddingVertical: 8, borderRadius: r.full,
      backgroundColor: c.canvasLight, borderWidth: 1, borderColor: c.borderDefault,
    },
    filterChipActive: { backgroundColor: activeTone, borderColor: activeTone },
    filterChipText: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary },
    filterChipTextActive: { color: c.onBrand, fontWeight: '800' },
    clearAllButton: {
      alignItems: 'center', justifyContent: 'center', paddingVertical: 13,
      borderRadius: r.lg, backgroundColor: c.canvasLight, marginTop: s.md,
    },
    clearAllText: { fontSize: 13.5, fontWeight: '800', color: c.red },
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

  // Filters = subject/sort chosen in the sheet. Search is separate (cleared via its own X).
  const hasActiveFilters = activeSubject !== 'All' || sort !== 'newest';
  const hasAnyRefinement = hasActiveFilters || !!search;

  const clearFilters = () => {
    setActiveSubject('All');
    setSort('newest');
  };

  const clearEverything = () => {
    setSearch('');
    clearFilters();
    setFilterSheetOpen(false);
  };

  const activeSortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label || 'Newest first';

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
          style={[styles.tabButton, isQuestions && styles.tabButtonActiveQuestions]}>
          <Ionicons name={isQuestions ? 'clipboard' : 'clipboard-outline'} size={16} color={isQuestions ? colors.onBrand : colors.textSecondary} />
          <Text style={[styles.tabText, isQuestions && styles.tabTextActive]}>Past Questions</Text>
        </Pressable>

        <Pressable
          onPress={() => handleTabSwitch('notes')}
          accessibilityRole="tab"
          accessibilityState={{ selected: !isQuestions }}
          style={[styles.tabButton, !isQuestions && styles.tabButtonActiveNotes]}
        >
          <Ionicons name={!isQuestions ? 'book' : 'book-outline'} size={16} color={!isQuestions ? colors.onBrand : colors.textSecondary} />
          <Text style={[styles.tabText, !isQuestions && styles.tabTextActive]}>Lecture Notes</Text>
        </Pressable>
      </View>

      {/* SLIM STATUS STRIP — replaces the old tall hero banner */}
      <View style={[styles.statusStrip, { backgroundColor: activeTone }]}>
        <View style={styles.statusIconWrap}>
          <Ionicons name={isQuestions ? 'document-text' : 'journal'} size={18} color={colors.onBrand} />
        </View>
        <View style={styles.statusTextWrap}>
          <Text style={styles.statusTitle}>{isQuestions ? 'Past Questions' : 'Lecture Notes'}</Text>
          <Text style={styles.statusSubtitle} numberOfLines={1}>
            {!loading ? `${items.length} ${isQuestions ? 'papers' : 'notes'} available` : 'Fetching study catalog...'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push(`/upload?type=${isQuestions ? 'question' : 'note'}`)}
          style={({ pressed }) => [styles.statusUploadButton, pressed && styles.statusUploadButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Upload new ${isQuestions ? 'past question' : 'lecture note'}`}
        >
          <Ionicons name="add" size={20} color={colors.onBrand} />
        </Pressable>
      </View>

      {/* SEARCH + FILTER TRIGGER */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.greyLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${isQuestions ? 'by course code or year...' : 'by title or topic...'}`}
            placeholderTextColor={colors.greyLight}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="never"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8} style={styles.searchClear} accessibilityLabel="Clear search text">
              <Ionicons name="close-circle" size={18} color={colors.greyLight} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setFilterSheetOpen(true)}
          style={({ pressed }) => [styles.filterButton, hasActiveFilters && styles.filterButtonActive, pressed && styles.filterButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Sort and filter"
          accessibilityState={{ expanded: filterSheetOpen }}
        >
          <Ionicons name="options-outline" size={19} color={hasActiveFilters ? activeTone : colors.textSecondary} />
          {hasActiveFilters ? <View style={styles.filterDot} /> : null}
        </Pressable>
      </View>

      {/* QUICK SUMMARY OF ACTIVE FILTERS — tap to reopen the sheet, no permanent chip row */}
      {hasActiveFilters ? (
        <Pressable onPress={() => setFilterSheetOpen(true)} style={styles.activeFilterSummary} accessibilityRole="button" accessibilityLabel="Edit active filters">
          <Ionicons name="funnel" size={12} color={activeTone} />
          <Text style={styles.activeFilterText}>
            {activeSubject !== 'All' ? <Text style={styles.activeFilterTextTone}>{activeSubject}</Text> : 'All subjects'}
            {sort !== 'newest' ? ` · ${activeSortLabel}` : ''}
          </Text>
          <Text style={styles.activeFilterClear} onPress={clearFilters}>Clear</Text>
        </Pressable>
      ) : null}

      {/* RESULTS HEADER */}
      <View style={styles.sectionRow}>
        <SectionHeader
          title={hasAnyRefinement ? 'Results' : activeSubject === 'All' ? `All ${isQuestions ? 'Papers' : 'Notes'}` : activeSubject}
          icon={isQuestions ? 'document-text-outline' : 'book-outline'}
          tone={activeTone}
          size="md"
          subtitle={filteredItems.length === 1 ? `1 ${isQuestions ? 'paper' : 'note'} found` : `${filteredItems.length} ${isQuestions ? 'papers' : 'notes'} found`}
        />
        {filteredItems.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: activeLightTone }]}>
            <Text style={isQuestions ? styles.countBadgeTextQuestions : styles.countBadgeTextNotes}>{filteredItems.length}</Text>
          </View>
        )}
      </View>

      {/* CONTENT LIST & STATES */}
      {loading ? (
        <View style={styles.loadingWrap}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonLines}>
                <View style={styles.skeletonLineWide} />
                <View style={styles.skeletonLineNarrow} />
              </View>
            </View>
          ))}
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
                  params: { type: isQuestions ? 'question' : 'note', id: item.id },
                })
              }
            />
          ))}

          {hasMore && (
            <Pressable
              onPress={() => loadPage()}
              disabled={loadingMore}
              style={({ pressed }) => [styles.loadMoreButton, pressed && styles.loadMoreButtonPressed]}
              accessibilityRole="button"
            >
              {loadingMore ? <ActivityIndicator size="small" color={activeTone} /> : <Ionicons name="chevron-down" size={16} color={activeTone} />}
              <Text style={[styles.loadMoreText, { color: activeTone }]}>
                {loadingMore ? 'Loading more...' : `Load more ${isQuestions ? 'questions' : 'notes'}`}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <EmptyState
          title={
            hasAnyRefinement
              ? `No matching ${isQuestions ? 'questions' : 'notes'}`
              : activeSubject === 'All'
              ? `No ${isQuestions ? 'questions' : 'notes'} available`
              : `No ${activeSubject} ${isQuestions ? 'questions' : 'notes'}`
          }
          description={hasAnyRefinement ? 'Try clearing your search query or adjusting filters.' : 'No study documents have been added yet.'}
          actionLabel={hasAnyRefinement ? 'Clear filters' : activeSubject !== 'All' ? 'Show all subjects' : undefined}
          onAction={hasAnyRefinement ? clearEverything : activeSubject !== 'All' ? () => setActiveSubject('All') : undefined}
          icon="search-outline"
        />
      )}

      {/* FILTER & SORT SHEET */}
      <DraggableBottomSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Sort & Filter"
        subtitle={isQuestions ? 'Past questions' : 'Lecture notes'}
      >
        <Text style={styles.sheetLabel}>SORT BY</Text>
        {SORT_OPTIONS.map((opt) => {
          const active = sort === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setSort(opt.key)}
              style={styles.sortRow}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${opt.label}`}
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.sortIconWrap, active && styles.sortIconWrapActive]}>
                <Ionicons name={opt.icon} size={15} color={active ? activeTone : colors.textSecondary} />
              </View>
              <Text style={[styles.sortRowLabel, active && styles.sortRowLabelActive]}>{opt.label}</Text>
              {active ? <Ionicons name="checkmark" size={18} color={activeTone} /> : null}
            </Pressable>
          );
        })}

        {subjects.length > 1 ? (
          <>
            <View style={styles.sheetDivider} />
            <Text style={styles.sheetLabel}>SUBJECT</Text>
            <View style={styles.chipsWrap}>
              {subjects.map((subject) => {
                const isActive = activeSubject === subject;
                return (
                  <Pressable
                    key={subject}
                    onPress={() => setActiveSubject(subject)}
                    style={({ pressed }) => [styles.filterChip, isActive && styles.filterChipActive, pressed && { opacity: 0.8 }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{subject}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {hasActiveFilters ? (
          <Pressable onPress={clearFilters} style={({ pressed }) => [styles.clearAllButton, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Clear all filters">
            <Text style={styles.clearAllText}>Clear all filters</Text>
          </Pressable>
        ) : null}
      </DraggableBottomSheet>
    </ScreenShell>
  );
}