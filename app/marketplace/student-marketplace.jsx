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

      {/* Featured Carousel */}
      {!loading && !hasActiveFilters && filteredItems.length > 0 ? (
        <MediaCarousel items={filteredItems.slice(0, 5)} onPressItem={(item) => goToListing(item)} />
      ) : null}

      {/* Section Controls Header */}
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

      {isAdmin && (
        <Pressable style={styles.adminButton} onPress={() => router.push('/adminpanel')}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.brandText} />
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <ScreenShell title="Student Marketplace" subtitle="Buy and sell student essentials within your community" showBack loading={loading}>
      {/* Integrated FlatList Feed */}
      <FlatList
        data={filteredItems}
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
          !loading ? (
            <EmptyListings hasActiveFilters={hasActiveFilters} onReset={clearFilters} />
          ) : null
        }
      />
    </ScreenShell>
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

function ProductCard({ item, onPress }) {
  const { colors } = useTheme();
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
    cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    media: { width: 96, height: 96, borderRadius: r.lg, overflow: 'hidden', backgroundColor: c.brandLight },
    image: { width: '100%', height: '100%' },
    fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
    fallbackText: { color: c.onBrand, fontSize: 28, fontWeight: '900' },
    content: { flex: 1, justifyContent: 'space-between' },
    title: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
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
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={styles.media}>
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

      <View style={styles.content}>
        <View>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
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
          {price ? <Text style={styles.price}>{price}</Text> : null}
          {phone ? (
            <View style={styles.contactRow}>
              <Pressable onPress={callSeller} style={styles.callButton} accessibilityRole="button" accessibilityLabel="Call seller">
                <Ionicons name="call-outline" size={12} color={colors.onBrand} />
                <Text style={styles.callText}>Call Seller</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.detailHint}>View details</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}