import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import CBTPracticeScreen from '../cbt/index';
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
const VALID_TABS = ['questions', 'notes', 'cbt'];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest first', icon: 'time-outline' },
  { key: 'title_asc', label: 'Title A - Z', icon: 'arrow-up-outline' },
  { key: 'title_desc', label: 'Title Z - A', icon: 'arrow-down-outline' },
];

const TABS = [
  { key: 'questions', label: 'Questions', icon: 'clipboard', iconOutline: 'clipboard-outline' },
  { key: 'notes', label: 'Notes', icon: 'book', iconOutline: 'book-outline' },
  { key: 'cbt', label: 'CBT', icon: 'desktop', iconOutline: 'desktop-outline' },
];

const getSubject = (item) => String(item?.subject || item?.course || item?.courseCode || '').trim();

export default function StudyMaterials() {
  const router = useRouter();
  const { tab } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  // Active Tab ('questions' | 'notes' | 'cbt')
  const [activeTab, setActiveTab] = useState(VALID_TABS.includes(tab) ? tab : 'questions');

  // Shared Data & Pagination States
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(activeTab !== 'cbt');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Filter & Search States
  const [activeSubject, setActiveSubject] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Request guards: protect against stale responses (rapid tab switching, refresh during load-more)
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  // Skeleton pulse
  const pulse = useRef(new Animated.Value(0.55)).current;

  // Dynamic Accents
  const isQuestions = activeTab === 'questions';

  const fetcher = useMemo(
    () => (activeTab === 'notes' ? fetchNotesPage : fetchQuestionsPage),
    [activeTab]
  );

  const activeTone = isQuestions ? colors.blue : colors.brand;
  const activeLightTone = isQuestions ? colors.blueLight : colors.brandLight;
  const cbtTone = colors.success || colors.brand;
  const resourceColumns = width >= 900 ? 2 : 1;
  const resourceTypeLabel = isQuestions ? 'Past Questions' : 'Lecture Notes';
  const resourceNoun = isQuestions ? 'papers' : 'notes';
  const resourceKind = isQuestions ? 'question' : 'note';
  const isAdmin = isResourceAdmin(profile, user);
  const canUploadCurrent = canUploadResource({ type: resourceKind, user, profile });

  const toneForTab = (key) => (key === 'questions' ? colors.blue : key === 'notes' ? colors.brand : cbtTone);

  const styles = useThemeStyles((c, s, r) => ({
    page: { flex: 1 },
    listContent: { gap: s.sm, paddingBottom: 32 },

    // SEGMENTED SWITCHER
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
      paddingHorizontal: 6,
      borderRadius: r.lg,
      gap: 6,
    },
    segmentTabActive: {
      ...Platform.select({
        ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
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

    libraryHeaderContainer: {
      marginBottom: s.md,
      gap: s.sm,
    },

    // ACTION ROW (Count & Upload)
    actionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
      minHeight: 30,
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

    // CONTRIBUTION CARD
    contributionCard: {
      flexDirection: width >= 640 ? 'row' : 'column',
      alignItems: width >= 640 ? 'center' : 'stretch',
      justifyContent: 'space-between',
      gap: s.md,
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
    },
    contributionInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
    },
    contributionIconWrap: {
      width: 38,
      height: 38,
      borderRadius: r.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.successLight || c.surfaceSecondary,
    },
    contributionCopy: {
      flex: 1,
      gap: 2,
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

    // QUICK SUBJECT CHIPS
    quickChipsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingRight: s.md,
    },
    quickChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: r.full,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    quickChipActive: {
      backgroundColor: activeTone,
      borderColor: activeTone,
    },
    quickChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    quickChipTextActive: {
      color: c.onBrand,
      fontWeight: '800',
    },

    // ACTIVE FILTER TAGS
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
      flex: 1,
    },
    skeletonList: {
      gap: s.sm,
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

    // FOOTER
    footerLoader: {
      paddingVertical: s.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadMoreButton: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginVertical: s.sm,
      paddingHorizontal: s.md,
      paddingVertical: 10,
      borderRadius: r.full,
      backgroundColor: activeLightTone,
      borderWidth: 1,
      borderColor: activeTone,
    },
    loadMoreText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: activeTone,
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
    sheetActions: {
      flexDirection: 'row',
      gap: s.sm,
      marginTop: s.md,
    },
    resetButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: r.xl,
      backgroundColor: c.surfaceSecondary,
    },
    resetButtonText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: c.red,
    },
    applyButton: {
      flex: 2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: r.xl,
      backgroundColor: activeTone,
    },
    applyButtonText: {
      fontSize: 13.5,
      fontWeight: '800',
      color: c.onBrand,
    },
  }), [activeTone, activeLightTone, width]);

  // Respond to ?tab= param changes (deep links / navigation)
  useEffect(() => {
    if (VALID_TABS.includes(tab)) {
      setActiveTab((current) => {
        if (current !== tab) {
          setItems([]);
          setLoading(tab !== 'cbt');
          setSearch('');
          setActiveSubject('All');
          setSort('newest');
        }
        return tab;
      });
    }
  }, [tab]);

  // Skeleton pulse animation
  useEffect(() => {
    if (!loading) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loading, pulse]);

  // Invalidate any in-flight request on unmount
  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
    };
  }, []);

  // Handle Tab Switching
  const handleTabSwitch = (nextTab) => {
    if (nextTab === activeTab) return;
    // Reset immediately so the previous tab's items never flash on the new tab
    setItems([]);
    setCursor(null);
    setHasMore(false);
    setLoading(nextTab !== 'cbt');
    setActiveTab(nextTab);
    setSearch('');
    setActiveSubject('All');
    setSort('newest');
  };

  // Safe Infinite Page Loader
  const loadMaterials = useCallback(
    async (isReset = false) => {
      if (activeTab === 'cbt') return;

      let requestId;
      if (isReset) {
        requestId = ++requestIdRef.current;
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setRefreshing(true);
      } else {
        if (loadingMoreRef.current || !hasMore) return;
        loadingMoreRef.current = true;
        requestId = requestIdRef.current;
        setLoadingMore(true);
      }

      try {
        const page = await fetcher({
          pageSize: PAGE_SIZE,
          cursor: isReset ? null : cursor,
        });

        if (requestId !== requestIdRef.current) return;

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
        if (requestId === requestIdRef.current) {
          loadingMoreRef.current = false;
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [activeTab, cursor, fetcher, hasMore]
  );

  // Primary Fetch Handler (first page for the active tab)
  useEffect(() => {
    if (activeTab === 'cbt') {
      requestIdRef.current += 1; // invalidate anything in flight
      return;
    }

    const requestId = ++requestIdRef.current;
    loadingMoreRef.current = false;
    setLoading(true);
    setLoadingMore(false);
    setRefreshing(false);
    setItems([]);
    setCursor(null);
    setHasMore(false);

    fetcher({ pageSize: PAGE_SIZE })
      .then((page) => {
        if (requestId !== requestIdRef.current) return;
        setItems(page?.items || []);
        setCursor(page?.cursor || null);
        setHasMore(Boolean(page?.hasMore));
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        console.error('Error fetching study data:', err);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false);
      });
  }, [activeTab, fetcher]);

  // Extract distinct subjects dynamically
  const subjects = useMemo(() => {
    const subjectSet = new Set();
    items.forEach((i) => {
      const sub = getSubject(i);
      if (sub) subjectSet.add(sub);
    });
    return ['All', ...Array.from(subjectSet).sort()];
  }, [items]);

  // Optimized Filtering and Sorting
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = items.filter((item) => {
      if (activeSubject !== 'All' && getSubject(item) !== activeSubject) {
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

  // Pad with invisible spacers so the last card in a multi-column grid keeps its width
  const displayData = useMemo(() => {
    if (resourceColumns === 1 || filteredItems.length === 0) return filteredItems;
    const remainder = filteredItems.length % resourceColumns;
    if (remainder === 0) return filteredItems;
    const spacers = Array.from({ length: resourceColumns - remainder }, (_, i) => ({
      id: `__spacer_${i}`,
      __spacer: true,
    }));
    return [...filteredItems, ...spacers];
  }, [filteredItems, resourceColumns]);

  const hasActiveFilters = activeSubject !== 'All' || sort !== 'newest';
  const hasAnyRefinement = hasActiveFilters || !!search;
  const showSecondaryTags = sort !== 'newest' || search.length > 0;

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
    router.navigate(`/upload?type=${resourceKind}`);
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
    if (!canManageResource({ type: resourceKind, item, user, profile })) return;
    Alert.alert(item.title || item.name || 'Resource actions', 'Choose what you want to do.', [
      {
        text: 'Edit',
        onPress: () => router.navigate({ pathname: '/upload', params: { type: resourceKind, editId: item.id } }),
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

  // Reset the subject filter if it no longer exists in the loaded data
  useEffect(() => {
    if (activeSubject !== 'All' && !subjects.includes(activeSubject)) {
      setActiveSubject('All');
    }
  }, [activeSubject, subjects]);

  // Segmented tabs (shared between library and embedded CBT screen)
  const isCbt = activeTab === 'cbt';
  const SegmentTabs = (
    <View
      style={[
        styles.segmentContainer,
        isCbt
          ? { marginHorizontal: 16, marginTop: 16, marginBottom: 16 }
          : { marginTop: 4, marginBottom: 12 },
      ]}
    >
      {TABS.map((t) => {
        const selected = activeTab === t.key;
        const tone = toneForTab(t.key);
        return (
          <Pressable
            key={t.key}
            onPress={() => handleTabSwitch(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.segmentTab,
              selected && styles.segmentTabActive,
              selected && { backgroundColor: tone, shadowColor: tone },
            ]}
          >
            <Ionicons
              name={selected ? t.icon : t.iconOutline}
              size={16}
              color={selected ? colors.onBrand : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[styles.segmentText, selected && styles.segmentTextActive]}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const ListHeader = (
    <View style={styles.libraryHeaderContainer}>
      {/* META SUMMARY & UPLOAD BUTTON */}
      <View style={styles.actionHeaderRow}>
        <Text style={styles.metaSummaryText}>
          <Text style={styles.metaHighlight}>
            {items.length}
            {hasMore ? '+' : ''}
          </Text>{' '}
          {resourceNoun} available
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
          <View style={styles.contributionInfo}>
            <View style={styles.contributionIconWrap}>
              <Ionicons name="logo-whatsapp" size={20} color={colors.success || colors.brand} />
            </View>
            <View style={styles.contributionCopy}>
              <Text style={styles.contributionTitle}>Have a past question to share?</Text>
              <Text style={styles.contributionText}>
                Send it to UniHelp on WhatsApp and an admin will review and publish it.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={openContributionWhatsApp}
            style={({ pressed }) => [styles.contributionButton, pressed && styles.uploadButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Contribute past question on WhatsApp"
          >
            <Text style={styles.contributionButtonText}>Contribute</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.success || colors.brand} />
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

      {/* QUICK SUBJECT CHIPS */}
      {subjects.length > 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.quickChipsContainer}
        >
          {subjects.map((sub) => {
            const selected = activeSubject === sub;
            return (
              <Pressable
                key={sub}
                onPress={() => setActiveSubject(sub)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.quickChip, selected && styles.quickChipActive]}
              >
                <Text style={[styles.quickChipText, selected && styles.quickChipTextActive]}>
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ACTIVE FILTER SUMMARY TAGS (sort & search; subject lives in the chip row) */}
      {hasAnyRefinement && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.activeChipsContainer}
        >
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

          {(showSecondaryTags || activeSubject !== 'All') && (
            <Pressable onPress={clearEverything} hitSlop={8}>
              <Text style={styles.clearAllTagText}>Clear all</Text>
            </Pressable>
          )}
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

  if (isCbt) {
    return <CBTPracticeScreen customTopNode={SegmentTabs} isEmbedded={true} />;
  }

  return (
    <ScreenShell scrollable={false} title="Resources" subtitle={`${resourceTypeLabel} library`} showBack={false}>
      {SegmentTabs}
      {loading ? (
        <View style={styles.loadingWrap}>
          {ListHeader}
          <Animated.View style={[styles.skeletonList, { opacity: pulse }]}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonLines}>
                  <View style={styles.skeletonLineWide} />
                  <View style={styles.skeletonLineNarrow} />
                </View>
              </View>
            ))}
          </Animated.View>
        </View>
      ) : (
        <FlatList
          key={resourceColumns}
          data={displayData}
          numColumns={resourceColumns}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => {
            if (item.__spacer) return <View style={styles.gridItem} />;
            return (
              <View style={styles.gridItem}>
                <DocumentCard
                  item={item}
                  tone={activeTone}
                  kind={resourceKind}
                  actionLabel={isQuestions ? 'View' : 'Open'}
                  compact={resourceColumns > 1}
                  showActions={canManageResource({ type: resourceKind, item, user, profile })}
                  onActionPress={openResourceActions}
                  onPress={() =>
                    router.navigate({
                      pathname: '/view/[type]/[id]',
                      params: { type: resourceKind, id: item.id },
                    })
                  }
                />
              </View>
            );
          }}
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
            ) : hasMore && hasAnyRefinement ? (
              <Pressable
                onPress={() => loadMaterials(false)}
                style={({ pressed }) => [styles.loadMoreButton, pressed && styles.uploadButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Load more ${resourceNoun}`}
              >
                <Ionicons name="refresh-outline" size={14} color={activeTone} />
                <Text style={styles.loadMoreText}>Load more {resourceNoun}</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={hasAnyRefinement ? 'search-outline' : 'folder-open-outline'}
              title={hasAnyRefinement ? 'No matching resources' : `No ${resourceNoun} found`}
              description={
                hasAnyRefinement
                  ? hasMore
                    ? 'Nothing matches in the loaded results. Try loading more or adjusting your filters.'
                    : 'Try adjusting your search terms, sorting, or subject filter.'
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

        {/* ACTIONS */}
        <View style={styles.sheetActions}>
          {hasActiveFilters && (
            <Pressable onPress={clearFilters} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
          )}
          <Pressable onPress={() => setFilterSheetOpen(false)} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>
              Show {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'}
            </Text>
          </Pressable>
        </View>
      </DraggableBottomSheet>
    </ScreenShell>
  );
}