import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import MediaCarousel from '../../src/shared/components/MediaCarousel';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { fetchStudentListingsPage } from '../../services/firestoreSync';
import { useAuth } from '../../context/AuthContext';

const NGN = '\u20A6';
const UP = '\u2191';
const DOWN = '\u2193';
const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { key: 'random', label: 'Random', icon: 'shuffle-outline' },
  { key: 'newest', label: 'Newest', icon: 'time-outline' },
  { key: 'price_asc', label: `Price ${UP}`, icon: 'arrow-up-outline' },
  { key: 'price_desc', label: `Price ${DOWN}`, icon: 'arrow-down-outline' },
];

const PRICE_RANGES = [
  { key: 'all', label: 'Any price', min: null, max: null },
  { key: 'under20k', label: `Under ${NGN}20k`, min: 0, max: 20000 },
  { key: '20to100k', label: `${NGN}20k - ${NGN}100k`, min: 20000, max: 100000 },
  { key: 'over100k', label: `Over ${NGN}100k`, min: 100000, max: null },
];

const CATEGORY_ICONS = {
  books: 'book-outline',
  textbook: 'book-outline',
  textbooks: 'book-outline',
  gadget: 'phone-portrait-outline',
  gadgets: 'phone-portrait-outline',
  electronics: 'headset-outline',
  fashion: 'shirt-outline',
  clothing: 'shirt-outline',
  furniture: 'bed-outline',
  hostel: 'home-outline',
  food: 'fast-food-outline',
  beauty: 'sparkles-outline',
  default: 'cube-outline',
};

const formatNaira = (value) => {
  const num = Number(value);
  if (value === undefined || value === null || value === '' || Number.isNaN(num)) return null;
  return `${NGN}${num.toLocaleString()}`;
};

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const resolveImage = (item = {}) => {
  const candidates = [];
  const pushValue = (val) => {
    if (!val) return;
    if (Array.isArray(val)) { val.forEach(pushValue); return; }
    if (typeof val === 'string' && val.trim()) candidates.push(val.trim());
    if (typeof val === 'object') {
      for (const k of ['url', 'secure_url', 'previewUrl', 'fileUrl', 'downloadUrl', 'href', 'link']) {
        if (typeof val[k] === 'string' && val[k].trim()) candidates.push(val[k].trim());
      }
    }
  };
  pushValue(item.imageUrl);
  pushValue(item.coverUrl);
  pushValue(item.thumbnailUrl);
  pushValue(item.images);
  pushValue(item.media);
  return candidates.find(Boolean) || null;
};

const getCreatedMs = (item = {}) => {
  if (typeof item.createdAt?.toMillis === 'function') return item.createdAt.toMillis();
  if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
  if (typeof item.createdAt === 'string') {
    const parsed = Date.parse(item.createdAt);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const getCategoryIcon = (category = '') => {
  const key = String(category).trim().toLowerCase();
  return CATEGORY_ICONS[key] || CATEGORY_ICONS.default;
};

export default function StudentMarketplacePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  // Filters UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sort, setSort] = useState('random');

  // Keep latest pagination state in a ref so loadListings doesn't need to be
  // recreated (and re-triggered) every time cursor/hasMore/loadingMore change.
  const paginationRef = useRef({ cursor: null, hasMore: false, loadingMore: false });
  paginationRef.current = { cursor, hasMore, loadingMore };

  const styles = useThemeStyles((c, s, r) => ({
    topBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      marginBottom: s.md,
    },
    searchWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
      backgroundColor: c.card,
      borderRadius: r.full,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingHorizontal: s.md,
      height: 44,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.textPrimary, paddingVertical: 0 },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: r.full,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    iconButtonActive: {
      backgroundColor: c.brandLight,
      borderColor: c.brand,
    },
    filterBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.brand,
    },
    filterContainer: {
      backgroundColor: c.card,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
      marginBottom: s.lg,
      gap: s.md,
      // NOTE: no `overflow` set here on purpose — must stay 'visible' so the
      // budget dropdown menu (absolute, below) can render on top of the
      // Sort By row instead of being clipped or covered by it.
      zIndex: 50,
    },
    dropdownWrapper: {
      position: 'relative',
      zIndex: 60,
    },
    filterLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
      marginBottom: s.xs,
    },
    filterLabelText: { fontSize: 11, fontWeight: '800', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
    chipsRow: { flexDirection: 'row', gap: s.xs, paddingRight: s.md },
    chip: {
      paddingHorizontal: s.md,
      paddingVertical: 7,
      borderRadius: r.full,
      backgroundColor: c.canvasLight,
      borderWidth: 1,
      borderColor: c.borderDefault,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: c.onBrand },

    dropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.canvasLight,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.xl,
      paddingHorizontal: s.md,
      paddingVertical: 10,
    },
    dropdownTriggerText: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    dropdownMenu: {
      position: 'absolute',
      top: 48,
      left: 0,
      right: 0,
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      zIndex: 100,
      overflow: 'hidden',
    },
    dropdownOption: {
      paddingHorizontal: s.md,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
    },
    dropdownOptionActive: { backgroundColor: c.brandLight },
    dropdownOptionText: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
    // Invisible full-screen backdrop rendered only while the dropdown is
    // open, so tapping anywhere outside it closes it instead of leaving it
    // stuck open and overlapping whatever the user taps next.
    dropdownBackdrop: {
      position: 'absolute',
      top: -1000,
      bottom: -1000,
      left: -1000,
      right: -1000,
      zIndex: 90,
    },

    sortWrap: {
      flexDirection: 'row',
      backgroundColor: c.canvasLight,
      borderRadius: r.full,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: 3,
      gap: 2,
    },
    sortOption: {
      flex: 1,
      borderRadius: r.full,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    sortOptionActive: { backgroundColor: c.brand },
    sortOptionText: { fontSize: 11, fontWeight: '800', color: c.textSecondary },
    sortOptionTextActive: { color: c.onBrand },

    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      rowGap: 8,
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
    sectionRowRight: { flexDirection: 'row', alignItems: 'center', gap: s.sm, flexWrap: 'wrap' },
    countBadge: {
      minWidth: 26,
      height: 26,
      paddingHorizontal: s.xs,
      borderRadius: r.md,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countBadgeText: { fontSize: 12, fontWeight: '800', color: c.brandText },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.brand,
      borderRadius: r.full,
      paddingHorizontal: s.md,
      paddingVertical: 6,
    },
    uploadButtonText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },
    adminButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.brandLight,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.brandGlow,
      paddingVertical: 10,
      marginBottom: s.md,
    },
    adminButtonText: { fontSize: 13, fontWeight: '800', color: c.brandText },
    heroCard: {
      backgroundColor: c.card,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginBottom: s.md,
      overflow: 'hidden',
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.md },
    heroCopy: { flex: 1 },
    heroEyebrow: { color: c.warning, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
    heroTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 4 },
    heroText: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
    heroIconWrap: {
      width: 58,
      height: 58,
      borderRadius: r.xl,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroActions: { flexDirection: 'row', gap: s.sm, marginTop: s.md },
    heroButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: r.full,
      paddingHorizontal: s.md,
      paddingVertical: 8,
      backgroundColor: c.brand,
    },
    heroButtonMuted: { backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
    heroButtonText: { color: c.onBrand, fontSize: 12, fontWeight: '900' },
    heroButtonTextMuted: { color: c.brandText },
    categoryStrip: { marginBottom: s.lg },
    categoryTile: {
      width: 88,
      minHeight: 78,
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.sm,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginRight: s.sm,
    },
    categoryTileActive: { backgroundColor: c.brandLight, borderColor: c.brandBorder },
    categoryIcon: {
      width: 30,
      height: 30,
      borderRadius: r.md,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryName: { color: c.textPrimary, fontSize: 11, fontWeight: '800', textAlign: 'center' },
    categoryCount: { color: c.textTertiary, fontSize: 10, fontWeight: '700' },
    storefrontSection: { marginBottom: s.xl },
    storefrontSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.sm,
    },
    storefrontTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '900' },
    storefrontSubtitle: { color: c.textSecondary, fontSize: 11.5, marginTop: 2 },
    storefrontLink: { color: c.brand, fontSize: 12, fontWeight: '900' },
    railContent: { gap: s.sm, paddingRight: s.md },
    gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    loadMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.full,
      paddingVertical: 11,
      marginBottom: s.lg,
    },
    loadMoreText: { color: c.brand, fontSize: 13, fontWeight: '900' },
    footerLoader: { paddingVertical: s.lg, alignItems: 'center' },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      backgroundColor: c.dangerLight || c.canvasLight,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.xl,
      padding: s.md,
      marginBottom: s.md,
    },
    errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: c.textPrimary },
    retryText: { fontSize: 12, fontWeight: '800', color: c.brand },
  }));

  const isAdmin = profile?.admin === true;
  const activeFilterCount = (search ? 1 : 0) + (category !== 'all' ? 1 : 0) + (priceRange !== 'all' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

  const loadListings = useCallback(async (isReset = false) => {
    const { cursor: currentCursor, hasMore: currentHasMore, loadingMore: currentLoadingMore } = paginationRef.current;

    if (isReset) {
      setRefreshing(true);
    } else {
      if (currentLoadingMore || !currentHasMore) return;
      setLoadingMore(true);
    }
    setError(null);

    try {
      const page = await fetchStudentListingsPage({
        pageSize: PAGE_SIZE,
        cursor: isReset ? null : currentCursor,
      });

      const fetched = page.items || [];
      const processedItems = sort === 'random' && isReset ? shuffleArray(fetched) : fetched;

      setItems((current) => {
        if (isReset) return processedItems;
        const seen = new Set(current.map((i) => i.id));
        return [...current, ...processedItems.filter((i) => !seen.has(i.id))];
      });

      setCursor(page.cursor);
      setHasMore(Boolean(page.hasMore));
    } catch (err) {
      setError(err?.message || 'Could not load listings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [sort]);

  useEffect(() => {
    loadListings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      const cat = (item?.category || '').trim();
      if (cat) set.add(cat);
    });
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const range = PRICE_RANGES.find((p) => p.key === priceRange) || PRICE_RANGES[0];
    const categoryLower = category.toLowerCase();

    const result = items.filter((item) => {
      const haystack = [item?.title, item?.name, item?.description, item?.category, item?.condition]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;

      if (category !== 'all') {
        const itemCat = (item?.category || '').trim().toLowerCase();
        // Exact match (not substring) so "Books" doesn't also match "Notebooks".
        if (itemCat !== categoryLower) return false;
      }

      const price = Number(item?.price);
      const priceValid = !Number.isNaN(price);
      if (range.min != null && (!priceValid || price < range.min)) return false;
      if (range.max != null && (!priceValid || price > range.max)) return false;

      return true;
    });

    const sorted = [...result];
    if (sort === 'price_asc') {
      sorted.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
    } else if (sort === 'price_desc') {
      sorted.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
    } else if (sort === 'newest') {
      sorted.sort((a, b) => {
        const ta = a?.createdAt?.toMillis ? a.createdAt.toMillis() : (a?.createdAt?.seconds || 0) * 1000;
        const tb = b?.createdAt?.toMillis ? b.createdAt.toMillis() : (b?.createdAt?.seconds || 0) * 1000;
        return tb - ta;
      });
    }
    return sorted;
  }, [items, search, category, priceRange, sort]);

  const categorySummaries = useMemo(() => (
    categories
      .filter((cat) => cat !== 'all')
      .map((cat) => ({
        key: cat,
        label: cat,
        count: items.filter((item) => (item?.category || '').trim().toLowerCase() === cat.toLowerCase()).length,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 8)
  ), [categories, items]);

  const marketplaceSections = useMemo(() => {
    const newest = [...filteredItems].sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
    const affordable = filteredItems
      .filter((item) => {
        const price = Number(item?.price);
        return Number.isFinite(price) && price > 0 && price <= 20000;
      })
      .sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
    const verified = filteredItems.filter((item) => item?.verified);
    const randomPicks = shuffleArray(filteredItems);
    const categoryShelves = categorySummaries
      .map((cat) => ({
        key: `category-${cat.key}`,
        title: cat.label,
        subtitle: `${cat.count} campus ${cat.count === 1 ? 'listing' : 'listings'}`,
        items: shuffleArray(filteredItems.filter((item) => (item?.category || '').trim().toLowerCase() === cat.key.toLowerCase())).slice(0, 8),
        category: cat.key,
      }))
      .filter((section) => section.items.length >= 2)
      .slice(0, 3);

    return [
      { key: 'fresh', title: 'Fresh on campus', subtitle: 'New items students just posted', items: newest.slice(0, 8) },
      { key: 'deals', title: 'Budget finds', subtitle: `Useful picks under ${NGN}20k`, items: affordable.slice(0, 8) },
      { key: 'trusted', title: 'Verified sellers', subtitle: 'Listings with extra trust signals', items: verified.slice(0, 8) },
      ...categoryShelves,
      { key: 'random', title: 'Explore more picks', subtitle: 'A mixed shelf so browsing feels fresh', items: randomPicks.slice(0, 12), layout: 'grid' },
    ].filter((section) => section.items.length > 0);
  }, [categorySummaries, filteredItems]);

  const goToListing = (item) => router.push({ pathname: '/view/[type]/[id]', params: { type: 'listing', id: item.id } });

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setPriceRange('all');
    setSort('random');
    setShowPriceDropdown(false);
  };

  const toggleFilters = () => {
    setShowFilters((prev) => {
      // Closing the panel should also collapse any open dropdown inside it,
      // so it doesn't reopen already-expanded next time.
      if (prev) setShowPriceDropdown(false);
      return !prev;
    });
  };

  const selectedRangeLabel = PRICE_RANGES.find((r) => r.key === priceRange)?.label || 'Any price';

  const HeaderComponent = (
    <View>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadListings(true)} hitSlop={8}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Search Bar & Filter Toggle */}
      <View style={styles.topBarRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.greyLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search listings..."
            placeholderTextColor={colors.greyLight}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={colors.greyLight} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={toggleFilters}
          style={[styles.iconButton, showFilters && styles.iconButtonActive]}
          accessibilityRole="button"
          accessibilityLabel="Toggle filters"
          accessibilityState={{ expanded: showFilters, selected: hasActiveFilters }}
        >
          <Ionicons name="options-outline" size={20} color={showFilters ? colors.brand : colors.textPrimary} />
          {hasActiveFilters ? <View style={styles.filterBadge} /> : null}
        </Pressable>
      </View>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <View style={styles.filterContainer}>
          {/* Categories */}
          {categories.length > 1 && (
            <View>
              <View style={styles.filterLabel}>
                <Ionicons name="pricetags-outline" size={12} color={colors.greyLight} />
                <Text style={styles.filterLabelText}>Category</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {categories.map((cat) => {
                  const active = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(active ? 'all' : cat)}
                      style={[styles.chip, active && styles.chipActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      {active ? <Ionicons name="checkmark" size={12} color={colors.onBrand} /> : null}
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {cat === 'all' ? 'All' : cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Budget Dropdown */}
          <View style={styles.dropdownWrapper}>
            <View style={styles.filterLabel}>
              <Ionicons name="wallet-outline" size={12} color={colors.greyLight} />
              <Text style={styles.filterLabelText}>Budget Range</Text>
            </View>
            <Pressable
              onPress={() => setShowPriceDropdown((prev) => !prev)}
              style={styles.dropdownTrigger}
              accessibilityRole="button"
              accessibilityState={{ expanded: showPriceDropdown }}
            >
              <Text style={styles.dropdownTriggerText}>{selectedRangeLabel}</Text>
              <Ionicons name={showPriceDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
            </Pressable>

            {showPriceDropdown && (
              <>
                {/* Backdrop: tapping outside the menu closes it instead of
                    leaving it open and overlapping the Sort By row. */}
                <Pressable
                  style={styles.dropdownBackdrop}
                  onPress={() => setShowPriceDropdown(false)}
                  accessibilityLabel="Close budget range menu"
                />
                <View style={styles.dropdownMenu}>
                  {PRICE_RANGES.map((range) => {
                    const active = priceRange === range.key;
                    return (
                      <Pressable
                        key={range.key}
                        onPress={() => {
                          setPriceRange(range.key);
                          setShowPriceDropdown(false);
                        }}
                        style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.dropdownOptionText, active && { color: colors.brand }]}>
                          {range.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {/* Sort Tabs */}
          <View>
            <View style={styles.filterLabel}>
              <Ionicons name="swap-vertical-outline" size={12} color={colors.greyLight} />
              <Text style={styles.filterLabelText}>Sort By</Text>
            </View>
            <View style={styles.sortWrap}>
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setSort(opt.key)}
                    style={[styles.sortOption, active && styles.sortOptionActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons name={opt.icon} size={12} color={active ? colors.onBrand : colors.textSecondary} />
                    <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {isAdmin && (
        <Pressable style={styles.adminButton} onPress={() => router.push('/adminpanel')}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.brandText} />
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </Pressable>
      )}

      {!loading && !hasActiveFilters && filteredItems.length > 0 ? (
        <MarketplaceHome
          items={filteredItems}
          categories={categorySummaries}
          sections={marketplaceSections}
          styles={styles}
          onPressItem={goToListing}
          onSell={() => router.push('/upload?type=marketplace')}
          onSelectCategory={(nextCategory) => {
            setCategory(nextCategory);
            setShowFilters(true);
          }}
          onLoadMore={() => loadListings(false)}
          canLoadMore={hasMore}
          loadingMore={loadingMore}
        />
      ) : (
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {hasActiveFilters ? 'Filtered items' : 'Marketplace feed'}
          </Text>
          <View style={styles.sectionRowRight}>
            <Pressable
              onPress={() => router.push('/upload?type=marketplace')}
              style={styles.uploadButton}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={14} color={colors.onBrand} />
              <Text style={styles.uploadButtonText}>Sell</Text>
            </Pressable>
            {hasActiveFilters && (
              <Pressable onPress={clearFilters} hitSlop={6} accessibilityRole="button">
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.brand }}>Reset</Text>
              </Pressable>
            )}
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredItems.length}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <ScreenShell title="Student Marketplace" subtitle="Buy and sell student essentials within your community" showBack loading={loading}>
      {/* Integrated FlatList Feed */}
      <FlatList
        data={hasActiveFilters ? filteredItems : []}
        keyExtractor={(item, index) => item?.id ?? `listing-${index}`}
        ListHeaderComponent={HeaderComponent}
        renderItem={({ item }) => <ProductCard item={item} onPress={() => goToListing(item)} />}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => loadListings(true)}
        onEndReached={() => {
          // Keep paginating from the server even while client-side filters
          // are active — otherwise a filtered view with few local matches
          // would silently stop loading more, hiding matches further back
          // in the feed.
          if (hasMore && !loadingMore) {
            loadListings(false);
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && (hasActiveFilters || filteredItems.length === 0) ? (
            <EmptyListings hasActiveFilters={hasActiveFilters} onReset={clearFilters} />
          ) : null
        }
      />
    </ScreenShell>
  );
}

function MarketplaceHome({
  items,
  categories,
  sections,
  styles,
  onPressItem,
  onSell,
  onSelectCategory,
  onLoadMore,
  canLoadMore,
  loadingMore,
}) {
  const { colors } = useTheme();
  const heroItems = items.slice(0, 5);

  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Campus deals</Text>
            <Text style={styles.heroTitle}>Shop what students are selling</Text>
            <Text style={styles.heroText}>Books, gadgets, essentials, and quick finds from your UniHelp community.</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="bag-handle-outline" size={28} color={colors.brand} />
          </View>
        </View>
        <View style={styles.heroActions}>
          <Pressable onPress={onSell} style={styles.heroButton} accessibilityRole="button">
            <Ionicons name="add" size={14} color={colors.onBrand} />
            <Text style={styles.heroButtonText}>Sell an item</Text>
          </Pressable>
          <Pressable onPress={() => onSelectCategory(categories[0]?.key || 'all')} style={[styles.heroButton, styles.heroButtonMuted]} accessibilityRole="button">
            <Ionicons name="grid-outline" size={14} color={colors.brandText} />
            <Text style={[styles.heroButtonText, styles.heroButtonTextMuted]}>Browse categories</Text>
          </Pressable>
        </View>
      </View>

      {heroItems.length > 0 ? <MediaCarousel items={heroItems} onPressItem={onPressItem} /> : null}

      {categories.length > 0 ? (
        <View style={styles.categoryStrip}>
          <View style={styles.storefrontSectionHeader}>
            <View>
              <Text style={styles.storefrontTitle}>Popular categories</Text>
              <Text style={styles.storefrontSubtitle}>Jump straight into a shelf</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <Pressable
                key={cat.key}
                style={styles.categoryTile}
                onPress={() => onSelectCategory(cat.key)}
                accessibilityRole="button"
                accessibilityLabel={`Browse ${cat.label}`}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={getCategoryIcon(cat.label)} size={16} color={colors.brand} />
                </View>
                <Text style={styles.categoryName} numberOfLines={2}>{cat.label}</Text>
                <Text style={styles.categoryCount}>{cat.count}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {sections.map((section) => (
        <MarketplaceSection
          key={section.key}
          section={section}
          styles={styles}
          onPressItem={onPressItem}
          onViewAll={section.category ? () => onSelectCategory(section.category) : null}
        />
      ))}

      {canLoadMore ? (
        <Pressable onPress={onLoadMore} style={styles.loadMoreButton} disabled={loadingMore} accessibilityRole="button">
          {loadingMore ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <Ionicons name="refresh-outline" size={15} color={colors.brand} />
          )}
          <Text style={styles.loadMoreText}>{loadingMore ? 'Loading more...' : 'Load more campus finds'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MarketplaceSection({ section, styles, onPressItem, onViewAll }) {
  const isGrid = section.layout === 'grid';

  return (
    <View style={styles.storefrontSection}>
      <View style={styles.storefrontSectionHeader}>
        <View>
          <Text style={styles.storefrontTitle}>{section.title}</Text>
          <Text style={styles.storefrontSubtitle}>{section.subtitle}</Text>
        </View>
        {onViewAll ? (
          <Pressable onPress={onViewAll} hitSlop={8} accessibilityRole="button">
            <Text style={styles.storefrontLink}>View all</Text>
          </Pressable>
        ) : null}
      </View>

      {isGrid ? (
        <View style={styles.gridWrap}>
          {section.items.map((item) => (
            <ProductCard key={item.id} item={item} variant="tile" onPress={() => onPressItem(item)} />
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
          {section.items.map((item) => (
            <ProductCard key={item.id} item={item} variant="rail" onPress={() => onPressItem(item)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function EmptyListings({ hasActiveFilters, onReset }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: r['3xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: s.md,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: r.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: s.md,
    },
    title: { fontSize: 16, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 4 },
    description: { fontSize: 13, lineHeight: 18, color: c.textSecondary, textAlign: 'center', marginBottom: s.lg },
    button: { backgroundColor: c.brand, borderRadius: r.full, paddingHorizontal: s.xl, paddingVertical: s.sm },
    buttonText: { color: c.onBrand, fontSize: 13, fontWeight: '700' },
  }));

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: colors.brandLight }]}>
        <Ionicons name={hasActiveFilters ? 'search-outline' : 'bag-handle-outline'} size={26} color={colors.brand} />
      </View>
      <Text style={styles.title}>{hasActiveFilters ? 'No matching listings' : 'No listings yet'}</Text>
      <Text style={styles.description}>
        {hasActiveFilters
          ? 'Try adjusting your search query, budget range, or selected categories.'
          : 'Check back later or be the first student to publish an item for sale.'}
      </Text>
      {hasActiveFilters && (
        <Pressable onPress={onReset} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Clear all filters</Text>
        </Pressable>
      )}
    </View>
  );
}

function ProductCard({ item, onPress, variant = 'row' }) {
  const { colors } = useTheme();
  const isCompact = variant !== 'row';
  const styles = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      flexDirection: 'row',
      gap: s.md,
      padding: s.md,
    },
    railCard: {
      width: 154,
      minHeight: 244,
      flexDirection: 'column',
      gap: 8,
      padding: 8,
    },
    tileCard: {
      width: '48.5%',
      minHeight: 242,
      flexDirection: 'column',
      gap: 8,
      padding: 8,
    },
    cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    media: { width: 96, height: 96, borderRadius: r.lg, overflow: 'hidden', backgroundColor: c.brandLight },
    compactMedia: { width: '100%', height: 132, borderRadius: r.lg },
    image: { width: '100%', height: '100%' },
    fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
    fallbackText: { color: c.onBrand, fontSize: 28, fontWeight: '900' },
    content: { flex: 1, justifyContent: 'space-between' },
    compactContent: { minHeight: 88 },
    title: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
    compactTitle: { fontSize: 12.5, lineHeight: 17 },
    badgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: r.full,
      backgroundColor: c.brandLight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    badgeVerified: { backgroundColor: c.greenLight },
    badgeText: { fontSize: 10, fontWeight: '800', color: c.brandText },
    price: { fontSize: 16, fontWeight: '900', color: c.warning, marginTop: 4 },
    compactPrice: { fontSize: 14 },
    contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    callButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.brand,
      borderRadius: r.full,
      paddingVertical: 5,
      paddingHorizontal: s.md,
    },
    callText: { color: c.onBrand, fontSize: 11, fontWeight: '800' },
    detailHint: { fontSize: 11, fontWeight: '700', color: c.brand, marginTop: 6 },
  }));

  const title = item?.title || item?.name || 'Untitled Item';
  const imageUrl = resolveImage(item);
  const safeImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : imageUrl || '';
  const price = formatNaira(item?.price);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setImageFailed(false);
  }, [safeImageUrl]);
  const showImage = Boolean(safeImageUrl) && !imageFailed;
  const phone = item?.phone;

  const callSeller = useCallback(async () => {
    const cleaned = String(phone || '').replace(/[^\d+]/g, '');
    if (!cleaned) return;
    const url = `tel:${cleaned}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      // Silently ignore — device has no dialer capability or user cancelled.
    }
  }, [phone]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        variant === 'rail' && styles.railCard,
        variant === 'tile' && styles.tileCard,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.media, isCompact && styles.compactMedia]}>
        {showImage ? (
          <Image
            source={{ uri: safeImageUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>{title.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={[styles.content, isCompact && styles.compactContent]}>
        <View>
          <Text style={[styles.title, isCompact && styles.compactTitle]} numberOfLines={2}>{title}</Text>
          {(item?.category || item?.verified) ? (
            <View style={styles.badgesRow}>
              {item?.category ? (
                <View style={styles.badge}>
                  <Ionicons name="pricetag-outline" size={9} color={colors.brandText} />
                  <Text style={styles.badgeText} numberOfLines={1}>{item.category}</Text>
                </View>
              ) : null}
              {item?.verified ? (
                <View style={[styles.badge, styles.badgeVerified]}>
                  <Ionicons name="checkmark-circle" size={9} color={colors.green} />
                  <Text style={[styles.badgeText, { color: colors.green }]}>Verified</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View>
          {price ? <Text style={[styles.price, isCompact && styles.compactPrice]}>{price}</Text> : null}
          {phone && !isCompact ? (
            <View style={styles.contactRow}>
              <Pressable onPress={callSeller} style={styles.callButton} accessibilityRole="button" accessibilityLabel="Call seller">
                <Ionicons name="call-outline" size={12} color={colors.onBrand} />
                <Text style={styles.callText}>Call Seller</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.detailHint}>{isCompact ? 'Tap for details' : 'View details'}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
