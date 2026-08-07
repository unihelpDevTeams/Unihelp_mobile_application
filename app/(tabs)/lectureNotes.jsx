import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import DocumentCard from '../../src/shared/components/DocumentCard';
import EmptyState from '../../src/shared/components/EmptyState';
import SectionHeader from '../../src/shared/components/SectionHeader';
import { fetchNotesPage } from '../../services/firestoreSync';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest', icon: 'time-outline' },
  { key: 'title_asc', label: 'A - Z', icon: 'arrow-up-outline' },
  { key: 'title_desc', label: 'Z - A', icon: 'arrow-down-outline' },
];

export default function LectureNotes() {
  const router = useRouter();
  const { colors } = useTheme();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [activeSubject, setActiveSubject] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const styles = useThemeStyles((c, s, r) => ({
    hero: { backgroundColor: c.brand, borderRadius: r['5xl'], padding: s['2xl'], marginBottom: s['2xl'] },
    heroInner: { flexDirection: 'row', alignItems: 'center', gap: s.md },
    heroIconWrap: { width: 48, height: 48, borderRadius: r['2xl'], backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    heroBody: { flex: 1 },
    heroTitle: { fontSize: 20, fontWeight: '900', color: c.onBrand, letterSpacing: -0.3 },
    heroSubtitle: { fontSize: 13, color: c.brandGlow, marginTop: s.xs, lineHeight: 18 },
    heroButton: { flexDirection: 'row', alignItems: 'center', gap: s.xs, backgroundColor: c.brandDark, paddingHorizontal: s.lg, paddingVertical: 11, borderRadius: r.xl },
    heroButtonPressed: { backgroundColor: c.brandDark },
    heroButtonText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginBottom: s.lg },
    filterChip: { paddingHorizontal: s.lg, paddingVertical: 10, borderRadius: r.full, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault },
    filterChipActive: { backgroundColor: c.brand, borderColor: c.brand },
    filterChipPressed: { opacity: 0.8 },
    filterChipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    filterChipTextActive: { color: c.onBrand },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.card, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault, paddingHorizontal: s.md, height: 46, marginBottom: s.lg },
    searchInput: { flex: 1, fontSize: 15, color: c.textPrimary, paddingVertical: 0 },
    searchClear: { padding: 4 },
    filterSection: { marginBottom: s.lg },
    sortWrap: { flexDirection: 'row', backgroundColor: c.canvasLight, borderRadius: r.full, borderWidth: 1, borderColor: c.borderDefault, padding: 4, gap: 4 },
    sortOption: { flex: 1, borderRadius: r.full, paddingVertical: 8, paddingHorizontal: s.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    sortOptionActive: { backgroundColor: c.brand },
    sortOptionText: { fontSize: 12, fontWeight: '800', color: c.textSecondary },
    sortOptionTextActive: { color: c.onBrand },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md },
    countBadge: { minWidth: 28, height: 28, paddingHorizontal: s.sm, borderRadius: r.lg, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    countBadgeText: { fontSize: 12, fontWeight: '800', color: c.brandText },
    sectionRowRight: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    list: { gap: s.sm },
    loadingWrap: { gap: s.md, paddingVertical: s.xl },
    loadingText: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: c.brand },
    skeleton: { height: 120, borderRadius: r['2xl'], backgroundColor: c.skeletonBackground },
    loadMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s.sm, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl, paddingVertical: s.md, marginTop: s.md },
    loadMoreButtonPressed: { backgroundColor: c.canvasLight },
    loadMoreText: { color: c.brand, fontSize: 13, fontWeight: '800' },
  }));

  const loadNotes = useCallback(async ({ reset = false } = {}) => {
    if (reset) {
      setLoading(true);
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    }

    try {
      const page = await fetchNotesPage({
        pageSize: PAGE_SIZE,
        cursor: reset ? null : cursor,
      });

      setNotes((current) => {
        const nextItems = page.items || [];
        if (reset) return nextItems;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...nextItems.filter((item) => !seen.has(item.id))];
      });
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore]);

  const subjects = useMemo(() => {
    const subjectSet = new Set();
    notes.forEach((n) => { const sub = n.subject || n.course || n.courseCode || ''; if (sub) subjectSet.add(sub); });
    return ['All', ...Array.from(subjectSet).sort()];
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = notes.filter((n) => {
      if (activeSubject !== 'All' && (n.subject || n.course || n.courseCode || '') !== activeSubject) return false;
      if (query) {
        const haystack = [n.subject, n.course, n.courseCode, n.title, n.name, n.description, n.topic].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    const sorted = [...result];
    if (sort === 'title_asc') sorted.sort((a, b) => String(a.title || a.name || '').localeCompare(String(b.title || b.name || '')));
    else if (sort === 'title_desc') sorted.sort((a, b) => String(b.title || b.name || '').localeCompare(String(a.title || a.name || '')));
    else {
      sorted.sort((a, b) => {
        const ta = a?.createdAt?.toMillis ? a.createdAt.toMillis() : (a?.createdAt?.seconds || 0) * 1000;
        const tb = b?.createdAt?.toMillis ? b.createdAt.toMillis() : (b?.createdAt?.seconds || 0) * 1000;
        return tb - ta;
      });
    }
    return sorted;
  }, [notes, activeSubject, search, sort]);

  const stats = useMemo(() => ({ total: notes.length, subjects: subjects.slice(1).length }), [notes, subjects]);

  const hasActiveFilters = !!search || activeSubject !== 'All' || sort !== 'newest';
  const clearFilters = () => { setSearch(''); setActiveSubject('All'); setSort('newest'); };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchNotesPage({ pageSize: PAGE_SIZE })
      .then((page) => {
        if (!mounted) return;
        setNotes(page.items || []);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (activeSubject !== 'All' && !subjects.includes(activeSubject)) {
      setActiveSubject('All');
    }
  }, [activeSubject, subjects]);

  useEffect(() => {
    if (activeSubject !== 'All' && hasMore && filteredNotes.length < PAGE_SIZE) {
      loadNotes().catch(() => {});
    }
  }, [activeSubject, filteredNotes.length, hasMore, loadNotes]);

  return (
    <ScreenShell title="Lecture Notes" subtitle="Access your lecture notes and study materials." showBack={false}>
      <View style={styles.hero}>
        <View style={styles.heroInner}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="book" size={24} color={colors.onBrand} />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>Lecture Notes</Text>
            <Text style={styles.heroSubtitle}>
              {notes.length > 0 ? `${notes.length} notes across ${stats.subjects} subjects` : 'Loading available notes...'}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/upload?type=note')} style={({ pressed }) => [styles.heroButton, pressed && styles.heroButtonPressed]}>
            <Ionicons name="add" size={16} color={colors.onBrand} />
            <Text style={styles.heroButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.greyLight} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search notes by title, subject or topic..." placeholderTextColor={colors.greyLight} style={styles.searchInput} returnKeyType="search" autoCorrect={false} />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8} style={styles.searchClear} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.greyLight} />
          </Pressable>
        ) : null}
      </View>

      {/* Sort */}
      <View style={styles.filterSection}>
        <View style={styles.sortWrap}>
          {SORT_OPTIONS.map((opt) => {
            const active = sort === opt.key;
            return (
              <Pressable key={opt.key} onPress={() => setSort(opt.key)} style={[styles.sortOption, active && styles.sortOptionActive]} accessibilityRole="button">
                <Ionicons name={opt.icon} size={14} color={active ? colors.onBrand : colors.textSecondary} />
                <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!loading && notes.length > 0 && (
        <View style={styles.filterRow}>
          {subjects.map((subject) => (
            <Pressable key={subject} onPress={() => setActiveSubject(subject)} style={({ pressed }) => [styles.filterChip, activeSubject === subject && styles.filterChipActive, pressed && styles.filterChipPressed]}>
              <Text style={[styles.filterChipText, activeSubject === subject && styles.filterChipTextActive]}>{subject}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.sectionRow}>
        <SectionHeader title={hasActiveFilters ? 'Results' : (activeSubject === 'All' ? 'All Notes' : `${activeSubject} Notes`)} subtitle={filteredNotes.length === 1 ? '1 note' : `${filteredNotes.length} notes`} />
        <View style={styles.sectionRowRight}>
          {hasActiveFilters ? (
            <Pressable onPress={clearFilters} hitSlop={6} accessibilityRole="button"><Ionicons name="refresh" size={16} color={colors.brand} /></Pressable>
          ) : null}
          {filteredNotes.length > 0 && (
            <View style={styles.countBadge}><Text style={styles.countBadgeText}>{filteredNotes.length}</Text></View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Loading notes...</Text>
          {[1, 2, 3].map((i) => <View key={i} style={styles.skeleton} />)}
        </View>
      ) : filteredNotes.length > 0 ? (
        <View style={styles.list}>
          {filteredNotes.map((item) => (
            <DocumentCard key={item.id} item={item} tone={colors.brand} onPress={() => router.push({ pathname: '/view/[type]/[id]', params: { type: 'note', id: item.id } })} />
          ))}
          {hasMore ? (
            <Pressable onPress={() => loadNotes().catch(() => {})} disabled={loadingMore} style={({ pressed }) => [styles.loadMoreButton, pressed && styles.loadMoreButtonPressed]}>
              {loadingMore ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="chevron-down" size={16} color={colors.brand} />}
              <Text style={styles.loadMoreText}>{loadingMore ? 'Loading more...' : 'Load more notes'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <EmptyState
          title={hasActiveFilters ? 'No matching notes' : (activeSubject === 'All' ? 'No notes yet' : `No ${activeSubject.toLowerCase()} notes`)}
          description={hasActiveFilters ? 'Try adjusting your search or filters to find more notes.' : (activeSubject === 'All' ? 'Lecture notes will appear here once they are published.' : 'No notes found for this subject.')}
          actionLabel={hasActiveFilters ? 'Clear filters' : (activeSubject !== 'All' ? 'View all subjects' : undefined)}
          onAction={hasActiveFilters ? clearFilters : (activeSubject !== 'All' ? () => setActiveSubject('All') : undefined)} icon="search" />
      )}
    </ScreenShell>
  );
}
