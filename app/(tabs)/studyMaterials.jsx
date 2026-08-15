import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import DocumentCard from '../../src/shared/components/DocumentCard';
import EmptyState from '../../src/shared/components/EmptyState';
import DraggableBottomSheet from '../../src/shared/components/DraggableBottomSheet';
import {
  deleteNote,
  deleteQuestion,
  fetchQuestionsPage,
  fetchNotesPage,
} from '../../services/firestoreSync';
import { useAuth } from '../../context/AuthContext';
import { canManageResource, canUploadResource, isResourceAdmin } from '../../src/shared/auth/resourcePermissions';
import { buildPastQuestionWhatsAppUrl } from '../../src/shared/config/resourceContribution';

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest first', icon: 'time-outline' },
  { key: 'title_asc', label: 'Title A - Z', icon: 'arrow-up-outline' },
  { key: 'title_desc', label: 'Title Z - A', icon: 'arrow-down-outline' },
];

export default function StudyMaterials() {
  const router = useRouter();
  const { tab } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  // Active Tab ('questions' | 'notes')
  const [activeTab, setActiveTab] = useState('questions');

  useEffect(() => {
    if (tab === 'notes' || tab === 'questions') {
      setActiveTab(tab);
    }
  }, [tab]);

  // Shared Data & Pagination States
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Filter & Search States
  const [activeSubject, setActiveSubject] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Ref flag to handle rapid tab switching safely
  const isMountedRef = useRef(true);

  // Dynamic Accents
  const isQuestions = activeTab === 'questions';
  const activeTone = isQuestions ? colors.blue : colors.brand;
  const activeLightTone = isQuestions ? colors.blueLight : colors.brandLight;
  const resourceColumns = width >= 900 ? 2 : 1;
  const resourceTypeLabel = isQuestions ? 'Past Questions' : 'Lecture Notes';
  const resourceNoun = isQuestions ? 'papers' : 'notes';
  const isAdmin = isResourceAdmin(profile, user);
  const canUploadCurrent = canUploadResource({ type: isQuestions ? 'question' : 'note', user, profile });

  const styles = useThemeStyles((c, s, r) => ({
    page: { flex: 1 },
    listContent: { gap: s.sm, paddingBottom: 32 },

    // COMPACT SEGMENTED SWITCHER & HEADER
    libraryHeaderContainer: {
      marginBottom: s.md,
      gap: s.sm,
    },
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.xl,
      padding: 4,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
    },
    segmentTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: r.lg,
      gap: 6,
    },
    segmentTabActiveQuestions: {
      backgroundColor: c.blue,
      ...Platform.select({
        ios: { shadowColor: c.blue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
        android: { elevation: 3 },
      }),
    },
    segmentTabActiveNotes: {
      backgroundColor: c.brand,
      ...Platform.select({
        ios: { shadowColor: c.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
        android: { elevation: 3 },
      }),
    },
    segmentText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.textSecondary,
    },
    segmentTextActive: {
      color: c.onBrand,
      fontWeight: '800',
    },

    // ACTION ROW (Count & Upload)
    actionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    metaSummaryText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
    },
    metaHighlight: {
      fontWeight: '800',
      color: c.textPrimary,
    },
    uploadCompactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: s.md,
      paddingVertical: 6,
      borderRadius: r.full,
      backgroundColor: activeLightTone,
      borderWidth: 1,
      borderColor: activeTone,
    },
    uploadCompactText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: activeTone,
    },
    uploadButtonPressed: {
      opacity: 0.75,
    },
    contributionCard: {
      flexDirection: width >= 640 ? 'row' : 'column',
      alignItems: width >= 640 ? 'center' : 'flex-start',
      justifyContent: 'space-between',
      gap: s.md,
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
    },
    contributionCopy: {
      flex: 1,
      gap: 3,
    },
    contributionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.textPrimary,
    },
    contributionText: {
      fontSize: 12.5,
      lineHeight: 18,
      color: c.textSecondary,
    },
    contributionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 40,
      paddingHorizontal: s.md,
      borderRadius: r.full,
      backgroundColor: c.successLight || c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.success || c.borderDefault,
    },
    contributionButtonText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: c.success || c.brand,
    },

    // SEARCH & FILTER BAR
    searchRow: {
      flexDirection: 'row',
      gap: s.xs,
      alignItems: 'center',
    },
    searchWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingHorizontal: s.md,
      minHeight: 46,
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
    filterButton: {
      width: 46,
      height: 46,
      borderRadius: r.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    filterButtonActive: {
      backgroundColor: activeLightTone,
      borderColor: activeTone,
    },
    filterDot: {
      position: 'absolute',
      top: 9,
      right: 9,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: activeTone,
      borderWidth: 1.5,
      borderColor: c.card,
    },

    // ACTIVE FILTER CHIPS ROW
    activeChipsScroll: {
      marginTop: 2,
    },
    activeChipsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    filterTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: activeLightTone,
      borderColor: activeTone,
      borderWidth: 1,
      borderRadius: r.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    filterTagText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: activeTone,
    },
    clearAllTagText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: c.red,
      paddingHorizontal: 6,
    },

    // RESULTS HEADER
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: s.xs,
      marginBottom: s.xs,
    },
    resultsTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: c.textPrimary,
    },
    countBadge: {
      paddingHorizontal: s.sm,
      paddingVertical: 2,
      borderRadius: r.full,
      backgroundColor: activeLightTone,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: activeTone,
    },

    // SKELETON LOADERS
    loadingWrap: {
      gap: s.md,
      paddingTop: s.xs,
    },
    skeletonCard: {
      height: 96,
      borderRadius: r['2xl'],
      padding: s.md,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.md,
    },
    skeletonIcon: {
      width: 44,
      height: 44,
      borderRadius: r.xl,
      backgroundColor: c.surfaceSecondary,
    },
    skeletonLines: {
      flex: 1,
      gap: 8,
    },
    skeletonLineWide: {
      height: 12,
      borderRadius: 6,
      backgroundColor: c.surfaceSecondary,
      width: '75%',
    },
    skeletonLineNarrow: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.surfaceSecondary,
      width: '45%',
    },
    footerLoader: {
      paddingVertical: s.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridItem: {
      flex: 1,
    },

    // BOTTOM SHEET STYLES
    sheetTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: c.textPrimary,
      marginBottom: s.sm,
    },
    sheetLabel: {
      fontSize: 11.5,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: s.xs,
      marginTop: s.sm,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: s.sm,
      borderRadius: r.lg,
      gap: s.md,
    },
    sortRowActive: {
      backgroundColor: activeLightTone,
    },
    sortIconWrap: {
      width: 32,
      height: 32,
      borderRadius: r.lg,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sortIconWrapActive: {
      backgroundColor: activeTone,
    },
    sortRowLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: c.textPrimary,
    },
    sortRowLabelActive: {
      fontWeight: '800',
      color: activeTone,
    },
    sheetDivider: {
      height: 1,
      backgroundColor: c.borderDefault,
      marginVertical: s.sm,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.xs,
      marginVertical: s.xs,
    },
    filterChip: {
      paddingHorizontal: s.md,
      paddingVertical: 8,
      borderRadius: r.full,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    filterChipActive: {
      backgroundColor: activeTone,
      borderColor: activeTone,
    },
    filterChipText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: c.textSecondary,
    },
    filterChipTextActive: {
      color: c.onBrand,
      fontWeight: '800',
    },
    clearAllButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: r.xl,
      backgroundColor: c.surfaceSecondary,
      marginTop: s.md,
    },
    clearAllText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: c.red,
    },
  }), [activeTone, activeLightTone]);

  // Handle Tab Switching
  const handleTabSwitch = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSearch('');
    setActiveSubject('All');
    setSort('newest');
  };

  // Safe Infinite Page Loader
  const loadMaterials = useCallback(
    async (isReset = false) => {
      if (isReset) {
        setRefreshing(true);
      } else {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
      }

      try {
        const fetcher = isQuestions ? fetchQuestionsPage : fetchNotesPage;
        const page = await fetcher({
          pageSize: PAGE_SIZE,
          cursor: isReset ? null : cursor,
        });

        if (!isMountedRef.current) return;

        setItems((current) => {
          const nextItems = page?.items || [];
          if (isReset) return nextItems;
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
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [cursor, hasMore, isQuestions, loadingMore]
  );

  // Primary Fetch Handler
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

  // Extract distinct subjects dynamically
  const subjects = useMemo(() => {
    const subjectSet = new Set();
    items.forEach((i) => {
      const sub = i.subject || i.course || i.courseCode || '';
      if (sub.trim()) subjectSet.add(sub.trim());
    });
    return ['All', ...Array.from(subjectSet).sort()];
  }, [items]);

  // Optimized Filtering and Sorting
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

  const openContributionWhatsApp = async () => {
    const url = buildPastQuestionWhatsAppUrl();
    if (!url) {
      Alert.alert(
        'Contribution number missing',
        'No WhatsApp number available to receive past question contributions.'
      );
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Couldn't open WhatsApp", 'Make sure WhatsApp is installed on this device.');
    }
  };

  const openUpload = () => {
    if (!canUploadCurrent) {
      openContributionWhatsApp();
      return;
    }
    router.push(`/upload?type=${isQuestions ? 'question' : 'note'}`);
  };

  const deleteResource = async (item) => {
    try {
      if (isQuestions) {
        await deleteQuestion(item.id);
      } else {
        await deleteNote(item.id);
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) {
      Alert.alert('Delete failed', error?.message || 'Unable to delete this resource.');
    }
  };

  const openResourceActions = (item) => {
    const resourceType = isQuestions ? 'question' : 'note';
    if (!canManageResource({ type: resourceType, item, user, profile })) return;
    Alert.alert(item.title || item.name || 'Resource actions', 'Choose what you want to do.', [
      {
        text: 'Edit',
        onPress: () => router.push({ pathname: '/upload', params: { type: resourceType, editId: item.id } }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete resource?', 'This removes the file permanently and cannot be reversed.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteResource(item) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const activeSortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label || 'Newest first';

  // Align Subject selection when tab switches
  useEffect(() => {
    if (activeSubject !== 'All' && !subjects.includes(activeSubject)) {
      setActiveSubject('All');
    }
  }, [activeSubject, subjects]);

  // Render Header Section for FlatList
  const ListHeader = (
    <View style={styles.libraryHeaderContainer}>
      {/* SEGMENTED SWITCHER */}
      <View style={styles.segmentContainer}>
        <Pressable
          onPress={() => handleTabSwitch('questions')}
          accessibilityRole="tab"
          accessibilityState={{ selected: isQuestions }}
          style={[styles.segmentTab, isQuestions && styles.segmentTabActiveQuestions]}
        >
          <Ionicons
            name={isQuestions ? 'clipboard' : 'clipboard-outline'}
            size={16}
            color={isQuestions ? colors.onBrand : colors.textSecondary}
          />
          <Text style={[styles.segmentText, isQuestions && styles.segmentTextActive]}>
            Past Questions
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleTabSwitch('notes')}
          accessibilityRole="tab"
          accessibilityState={{ selected: !isQuestions }}
          style={[styles.segmentTab, !isQuestions && styles.segmentTabActiveNotes]}
        >
          <Ionicons
            name={!isQuestions ? 'book' : 'book-outline'}
            size={16}
            color={!isQuestions ? colors.onBrand : colors.textSecondary}
          />
          <Text style={[styles.segmentText, !isQuestions && styles.segmentTextActive]}>
            Lecture Notes
          </Text>
        </Pressable>
      </View>

      {/* META SUMMARY & UPLOAD BUTTON */}
      <View style={styles.actionHeaderRow}>
        <Text style={styles.metaSummaryText}>
          <Text style={styles.metaHighlight}>{items.length}</Text> {resourceNoun} available
        </Text>
        {canUploadCurrent ? (
          <Pressable
            onPress={openUpload}
            style={({ pressed }) => [styles.uploadCompactButton, pressed && styles.uploadButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Upload new ${isQuestions ? 'past question' : 'lecture note'}`}
          >
            <Ionicons name="add" size={16} color={activeTone} />
            <Text style={styles.uploadCompactText}>Upload</Text>
          </Pressable>
        ) : null}
      </View>

      {isQuestions && !isAdmin ? (
        <View style={styles.contributionCard}>
          <View style={styles.contributionCopy}>
            <Text style={styles.contributionTitle}>Have a past question to share?</Text>
            <Text style={styles.contributionText}>
              Send it to UniHelp on WhatsApp and an admin will review and publish it.
            </Text>
          </View>
          <Pressable
            onPress={openContributionWhatsApp}
            style={({ pressed }) => [styles.contributionButton, pressed && styles.uploadButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Contribute past question on WhatsApp"
          >
            <Ionicons name="logo-whatsapp" size={17} color={colors.success || colors.brand} />
            <Text style={styles.contributionButtonText}>Contribute</Text>
          </Pressable>
        </View>
      ) : null}

      {/* SEARCH AND FILTER INPUT BAR */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.greyLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${isQuestions ? 'course codes, years...' : 'titles, topics...'}`}
            placeholderTextColor={colors.greyLight}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              style={styles.searchClear}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.greyLight} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setFilterSheetOpen(true)}
          style={({ pressed }) => [
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
            pressed && styles.uploadButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Filter and sort options"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={hasActiveFilters ? activeTone : colors.textSecondary}
          />
          {hasActiveFilters && <View style={styles.filterDot} />}
        </Pressable>
      </View>

      {/* ACTIVE FILTER SUMMARY CHIPS */}
      {hasAnyRefinement && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeChipsScroll}
          contentContainerStyle={styles.activeChipsContainer}
        >
          {activeSubject !== 'All' && (
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>{activeSubject}</Text>
              <Pressable onPress={() => setActiveSubject('All')} hitSlop={6}>
                <Ionicons name="close" size={12} color={activeTone} />
              </Pressable>
            </View>
          )}

          {sort !== 'newest' && (
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>{activeSortLabel}</Text>
              <Pressable onPress={() => setSort('newest')} hitSlop={6}>
                <Ionicons name="close" size={12} color={activeTone} />
              </Pressable>
            </View>
          )}

          {search.length > 0 && (
            <View style={styles.filterTag}>
              <Text style={styles.filterTagText}>{`"${search}"`}</Text>
              <Pressable onPress={() => setSearch('')} hitSlop={6}>
                <Ionicons name="close" size={12} color={activeTone} />
              </Pressable>
            </View>
          )}

          <Pressable onPress={clearEverything} hitSlop={8}>
            <Text style={styles.clearAllTagText}>Clear all</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* RESULTS TITLE ROW */}
      <View style={styles.sectionRow}>
        <Text style={styles.resultsTitle}>
          {hasAnyRefinement ? 'Filtered Results' : `All ${resourceTypeLabel}`}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredItems.length}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenShell title="Resources" subtitle={`${resourceTypeLabel} library`} showBack={false}>
      {loading ? (
        <View style={styles.loadingWrap}>
          {ListHeader}
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
      ) : (
        <FlatList
          key={resourceColumns}
          data={filteredItems}
          numColumns={resourceColumns}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <DocumentCard
                item={item}
                tone={activeTone}
                kind={isQuestions ? 'question' : 'note'}
                actionLabel={isQuestions ? 'View' : 'Open'}
                compact={resourceColumns > 1}
                showActions={canManageResource({ type: isQuestions ? 'question' : 'note', item, user, profile })}
                onActionPress={openResourceActions}
                onPress={() =>
                  router.push({
                    pathname: '/view/[type]/[id]',
                    params: { type: isQuestions ? 'question' : 'note', id: item.id },
                  })
                }
              />
            </View>
          )}
          columnWrapperStyle={resourceColumns > 1 ? { gap: 12 } : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => loadMaterials(true)}
          onEndReached={() => loadMaterials(false)}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={activeTone} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={hasAnyRefinement ? 'search-outline' : ''}
              title={hasAnyRefinement ? 'No matching resources' : `No ${resourceNoun} found`}
              description={
                hasAnyRefinement
                  ? 'Try adjusting your search terms, sorting, or subject filter.'
                  : `There are currently no ${resourceNoun} available in this library.`
              }
              actionLabel={hasAnyRefinement ? 'Clear all filters' : canUploadCurrent ? `Upload ${resourceTypeLabel}` : ''}
              onAction={
                hasAnyRefinement
                  ? clearEverything
                  : canUploadCurrent
                    ? openUpload
                    : undefined
              }
            />
          }
        />
      )}

      {/* SORT & FILTER BOTTOM SHEET */}
      <DraggableBottomSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
      >
        <Text style={styles.sheetTitle}>Sort & Filter</Text>

        {/* SORT SECTION */}
        <Text style={styles.sheetLabel}>Sort By</Text>
        {SORT_OPTIONS.map((opt) => {
          const isSelected = sort === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setSort(opt.key)}
              style={[styles.sortRow, isSelected && styles.sortRowActive]}
            >
              <View style={[styles.sortIconWrap, isSelected && styles.sortIconWrapActive]}>
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={isSelected ? colors.onBrand : colors.textSecondary}
                />
              </View>
              <Text style={[styles.sortRowLabel, isSelected && styles.sortRowLabelActive]}>
                {opt.label}
              </Text>
              {isSelected && <Ionicons name="checkmark" size={18} color={activeTone} />}
            </Pressable>
          );
        })}

        <View style={styles.sheetDivider} />

        {/* SUBJECT SECTION */}
        <Text style={styles.sheetLabel}>Filter by Subject</Text>
        <View style={styles.chipsWrap}>
          {subjects.map((sub) => {
            const isSelected = activeSubject === sub;
            return (
              <Pressable
                key={sub}
                onPress={() => setActiveSubject(sub)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* CLEAR ALL BUTTON */}
        {hasActiveFilters && (
          <Pressable onPress={clearFilters} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Reset Filters</Text>
          </Pressable>
        )}
      </DraggableBottomSheet>
    </ScreenShell>
  );
}
