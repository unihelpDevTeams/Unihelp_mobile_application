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
import { fetchHostelsPage } from '../../services/firestoreSync';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 20;
const NGN = '\u20A6';
const UP = '\u2191';
const DOWN = '\u2193';
const CAROUSEL_LIMIT = 8;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest', icon: 'time-outline' },
  { key: 'price_asc', label: `Price ${UP}`, icon: 'arrow-up-outline' },
  { key: 'price_desc', label: `Price ${DOWN}`, icon: 'arrow-down-outline' },
];

const PRICE_RANGES = [
  { key: 'all', label: 'Any budget', min: null, max: null },
  { key: 'under50k', label: `Under ${NGN}50k`, min: 0, max: 50000 },
  { key: '50to150k', label: `${NGN}50k - ${NGN}150k`, min: 50000, max: 150000 },
  { key: 'over150k', label: `Over ${NGN}150k`, min: 150000, max: null },
];

const formatNaira = (value) => {
  const num = Number(value);
  if (value === undefined || value === null || value === '' || Number.isNaN(num)) return null;
  return `${NGN}${num.toLocaleString()}`;
};

const pickMediaUrl = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (value && typeof value === 'object') {
    for (const key of ['url', 'secure_url', 'previewUrl', 'fileUrl', 'downloadUrl', 'href', 'link']) {
      if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim();
    }
  }
  return null;
};

const resolveImage = (item = {}) => {
  const candidates = [];
  const pushValue = (value) => {
    if (value == null) return;
    if (Array.isArray(value)) { value.forEach(pushValue); return; }
    const url = pickMediaUrl(value);
    if (url) candidates.push(url);
  };
  pushValue(item.imageUrl);
  pushValue(item.coverUrl);
  pushValue(item.thumbnailUrl);
  pushValue(item.previewUrl);
  pushValue(item.image);
  pushValue(item.photo);
  pushValue(item.cover);
  pushValue(item.images);
  pushValue(item.imageAssets);
  pushValue(item.media);
  pushValue(item.assets);
  return candidates.find(Boolean) || null;
};

export default function HostelsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sort, setSort] = useState('newest');

  // Ref mirror of pagination state so loadHostels stays a stable function
  // (no re-creation churn) while still always reading the latest values.
  const paginationRef = useRef({ cursor: null, hasMore: false, loadingMore: false });
  paginationRef.current = { cursor, hasMore, loadingMore };

  const styles = useThemeStyles((c, s, r) => ({
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm,
      backgroundColor: c.card, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault,
      paddingHorizontal: s.md, height: 46, marginBottom: s.lg,
    },
    searchInput: { flex: 1, fontSize: 15, color: c.textPrimary, paddingVertical: 0 },
    searchClear: { padding: 4 },

    filterLabel: {
      flexDirection: 'row', alignItems: 'center', gap: s.xs,
      marginBottom: s.sm,
    },
    filterLabelText: { fontSize: 12, fontWeight: '800', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
    filterSection: { marginBottom: s.lg },
    chipsRow: { flexDirection: 'row', gap: s.sm },

    chip: {
      paddingHorizontal: s.lg, paddingVertical: 9, borderRadius: r.full,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
      flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    chipActive: { backgroundColor: c.blue, borderColor: c.blue },
    chipPressed: { opacity: 0.8 },
    chipText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: c.onBrand },

    sortWrap: {
      flexDirection: 'row', backgroundColor: c.canvasLight, borderRadius: r.full,
      borderWidth: 1, borderColor: c.borderDefault, padding: 4, gap: 4,
    },
    sortOption: {
      flex: 1, borderRadius: r.full, paddingVertical: 8, paddingHorizontal: s.sm,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    },
    sortOptionActive: { backgroundColor: c.blue },
    sortOptionText: { fontSize: 12, fontWeight: '800', color: c.textSecondary },
    sortOptionTextActive: { color: c.onBrand },

    sectionRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', rowGap: 8, marginBottom: s.md, marginTop: s.sm,
    },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
    sectionRowRight: { flexDirection: 'row', alignItems: 'center', gap: s.sm, flexWrap: 'wrap' },
    countBadge: { minWidth: 28, height: 28, paddingHorizontal: s.sm, borderRadius: r.lg, backgroundColor: c.blueLight, alignItems: 'center', justifyContent: 'center' },
    countBadgeText: { fontSize: 12, fontWeight: '800', color: c.blue },
    clearFilters: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.blue, borderRadius: r.full, paddingHorizontal: s.lg, paddingVertical: 7 },
    uploadButtonPressed: { opacity: 0.85 },
    uploadButtonText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },

    adminButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: c.brandLight, borderRadius: 12, borderWidth: 1, borderColor: c.brandGlow,
      paddingVertical: 10, marginBottom: 12,
    },
    adminButtonText: { fontSize: 13, fontWeight: '800', color: c.brandText },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm,
      backgroundColor: c.dangerLight || c.canvasLight, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: r.xl, padding: s.md, marginBottom: s.lg,
    },
    errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: c.textPrimary },
    retryText: { fontSize: 12, fontWeight: '800', color: c.blue },

    footerLoader: { paddingVertical: s.lg, alignItems: 'center' },
  }));

  const isAdmin = profile?.admin === true;
  const hasActiveFilters = !!search || location !== 'all' || priceRange !== 'all';

  const loadHostels = useCallback(async (isReset = false) => {
    const { cursor: currentCursor, hasMore: currentHasMore, loadingMore: currentLoadingMore } = paginationRef.current;

    if (isReset) {
      setRefreshing(true);
    } else {
      if (currentLoadingMore || !currentHasMore) return;
      setLoadingMore(true);
    }
    setError(null);

    try {
      const page = await fetchHostelsPage({
        pageSize: PAGE_SIZE,
        cursor: isReset ? null : currentCursor,
      });

      setHostels((current) => {
        const nextItems = page.items || [];
        if (isReset) return nextItems;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...nextItems.filter((item) => !seen.has(item.id))];
      });

      setCursor(page.cursor);
      setHasMore(Boolean(page.hasMore));
    } catch (err) {
      setError(err?.message || 'Could not load hostels. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadHostels(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locations = useMemo(() => {
    const set = new Set();
    hostels.forEach((item) => {
      const loc = (item?.location || '').trim();
      if (loc) set.add(loc);
    });
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [hostels]);

  const filteredHostels = useMemo(() => {
    const query = search.trim().toLowerCase();
    const range = PRICE_RANGES.find((p) => p.key === priceRange) || PRICE_RANGES[0];
    const locationLower = location.toLowerCase();

    const result = hostels.filter((item) => {
      const haystack = [item?.title, item?.name, item?.description, item?.location, item?.area]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;

      if (location !== 'all') {
        const itemLoc = (item?.location || '').trim().toLowerCase();
        // Exact match against the lowercased location (previously compared
        // a lowercased value against the raw, un-lowercased filter, so any
        // location with uppercase letters — e.g. "Yaba" — never matched).
        if (itemLoc !== locationLower) return false;
      }

      const price = Number(item?.price || item?.rent);
      const priceValid = !Number.isNaN(price);
      if (range.min != null && (!priceValid || price < range.min)) return false;
      if (range.max != null && (!priceValid || price > range.max)) return false;

      return true;
    });

    const sorted = [...result];
    if (sort === 'price_asc') {
      sorted.sort((a, b) => Number(a?.price || a?.rent || 0) - Number(b?.price || b?.rent || 0));
    } else if (sort === 'price_desc') {
      sorted.sort((a, b) => Number(b?.price || b?.rent || 0) - Number(a?.price || a?.rent || 0));
    } else {
      sorted.sort((a, b) => {
        const ta = a?.createdAt?.toMillis ? a.createdAt.toMillis() : (a?.createdAt?.seconds || 0) * 1000;
        const tb = b?.createdAt?.toMillis ? b.createdAt.toMillis() : (b?.createdAt?.seconds || 0) * 1000;
        return tb - ta;
      });
    }
    return sorted;
  }, [hostels, search, location, priceRange, sort]);

  const goToHostel = (item) => router.push({ pathname: '/view/[type]/[id]', params: { type: 'hostel', id: item.id } });

  const clearFilters = () => {
    setSearch('');
    setLocation('all');
    setPriceRange('all');
    setSort('newest');
  };

  const HeaderComponent = (
    <View>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadHostels(true)} hitSlop={8}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.greyLight} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search hostels, areas, locations..."
          placeholderTextColor={colors.greyLight}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8} style={styles.searchClear} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.greyLight} />
          </Pressable>
        ) : null}
      </View>

      {/* Location Filter */}
      {!loading && locations.length > 1 && (
        <View style={styles.filterSection}>
          <View style={styles.filterLabel}>
            <Ionicons name="location-outline" size={13} color={colors.greyLight} />
            <Text style={styles.filterLabelText}>Location</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {locations.map((loc) => {
              const active = location === loc;
              return (
                <Pressable
                  key={loc}
                  onPress={() => setLocation(active ? 'all' : loc)}
                  style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  {active ? <Ionicons name="checkmark" size={14} color={colors.onBrand} /> : null}
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                    {loc === 'all' ? 'All locations' : loc}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Budget Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterLabel}>
          <Ionicons name="wallet-outline" size={13} color={colors.greyLight} />
          <Text style={styles.filterLabelText}>Budget</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {PRICE_RANGES.map((range) => {
            const active = priceRange === range.key;
            return (
              <Pressable
                key={range.key}
                onPress={() => setPriceRange(active ? 'all' : range.key)}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                {active ? <Ionicons name="checkmark" size={14} color={colors.onBrand} /> : null}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{range.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Sort Bar */}
      <View style={styles.filterSection}>
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
                <Ionicons name={opt.icon} size={14} color={active ? colors.onBrand : colors.textSecondary} />
                <Text style={[styles.sortOptionText, active && styles.sortOptionTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Featured Carousel */}
      {!loading && !hasActiveFilters && filteredHostels.length > 0 ? (
        <MediaCarousel items={filteredHostels.slice(0, CAROUSEL_LIMIT)} onPressItem={(item) => goToHostel(item)} />
      ) : null}

      {/* Section Row Header */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {hasActiveFilters ? 'Search results' : 'Available hostels'}
        </Text>
        <View style={styles.sectionRowRight}>
          <Pressable
            onPress={() => router.push('/upload?type=hostel')}
            hitSlop={4}
            style={({ pressed }) => [styles.uploadButton, pressed && styles.uploadButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Add a hostel"
          >
            <Ionicons name="add" size={15} color={colors.onBrand} />
            <Text style={styles.uploadButtonText}>Add</Text>
          </Pressable>
          {hasActiveFilters ? (
            <Pressable onPress={clearFilters} hitSlop={6} style={styles.clearFilters} accessibilityRole="button">
              <Ionicons name="refresh" size={14} color={colors.blue} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.blue }}>Reset</Text>
            </Pressable>
          ) : null}
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredHostels.length}</Text>
          </View>
        </View>
      </View>

      {isAdmin ? (
        <Pressable style={styles.adminButton} onPress={() => router.push('/adminpanel')}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.brandText} />
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <ScreenShell title="Hostels" subtitle="Find affordable accommodation around campus" showBack loading={loading}>
      <FlatList
        data={filteredHostels}
        keyExtractor={(item, index) => item?.id ?? `hostel-${index}`}
        ListHeaderComponent={HeaderComponent}
        renderItem={({ item }) => <HostelCard item={item} onPress={() => goToHostel(item)} />}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={() => loadHostels(true)}
        onEndReached={() => {
          // Keep paginating from the server even with filters active — a
          // filtered view with few local matches should still be able to
          // pull in further pages that may contain more matches.
          if (hasMore && !loadingMore) {
            loadHostels(false);
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.blue} />
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
      backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault,
      padding: s['3xl'], alignItems: 'center', justifyContent: 'center',
    },
    iconWrap: { width: 64, height: 64, borderRadius: r.xl, alignItems: 'center', justifyContent: 'center', marginBottom: s.lg },
    title: { fontSize: 18, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: s.sm },
    description: { fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: 'center', marginBottom: s.xl, maxWidth: '85%' },
    button: { backgroundColor: c.blue, borderRadius: r.full, paddingHorizontal: s['2xl'], paddingVertical: s.md },
    buttonPressed: { opacity: 0.85 },
    buttonText: { color: c.onBrand, fontSize: 14, fontWeight: '700' },
  }));

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: colors.blueLight }]}>
        <Ionicons name={hasActiveFilters ? 'search-outline' : 'home-outline'} size={28} color={colors.blue} />
      </View>
      <Text style={styles.title}>{hasActiveFilters ? 'No matching hostels' : 'No hostels yet'}</Text>
      <Text style={styles.description}>
        {hasActiveFilters
          ? 'Try adjusting your search, location, or budget to find more options.'
          : 'Hostel listings uploaded from the website will appear here.'}
      </Text>
      {hasActiveFilters ? (
        <Pressable onPress={onReset} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} accessibilityRole="button">
          <Text style={styles.buttonText}>Clear filters</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HostelCard({ item, onPress }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault,
      flexDirection: 'row', gap: s.md, padding: s.md, overflow: 'hidden',
    },
    cardPressed: { transform: [{ scale: 0.99 }] },
    media: { width: 104, height: 104, borderRadius: r.lg, overflow: 'hidden', backgroundColor: c.blueLight },
    image: { width: '100%', height: '100%' },
    fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.blue },
    fallbackText: { color: c.onBrand, fontSize: 30, fontWeight: '900' },
    content: { flex: 1 },
    title: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    badgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    badge: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: r.full,
      backgroundColor: c.blueLight, flexDirection: 'row', alignItems: 'center', gap: 3,
    },
    badgeVerified: { backgroundColor: c.greenLight },
    badgeText: { fontSize: 10, fontWeight: '800', color: c.blue },
    badgeVerifiedText: { color: c.green },
    price: { fontSize: 17, fontWeight: '900', color: c.blue, marginTop: 6 },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: 8 },
    callButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: c.blue, borderRadius: r.full, paddingVertical: 7, paddingHorizontal: s.lg,
    },
    callButtonPressed: { opacity: 0.85 },
    callText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },
    detailHint: { fontSize: 12, fontWeight: '700', color: c.blue, marginTop: 8 },
  }));

  const title = item?.title || item?.name || 'Hostel';
  const imageUrl = resolveImage(item);
  const safeImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : imageUrl || '';
  const price = formatNaira(item?.price || item?.rent);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setImageFailed(false);
  }, [safeImageUrl]);
  const showImage = Boolean(safeImageUrl) && !imageFailed;
  const phone = item?.phone;

  const callHostel = useCallback(async () => {
    const cleaned = String(phone || '').replace(/[^\d+]/g, '');
    if (!cleaned) return;
    const url = `tel:${cleaned}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      // Device has no dialer capability or the user cancelled — nothing to do.
    }
  }, [phone]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.media}>
        {showImage ? (
          <Image source={{ uri: safeImageUrl }} style={styles.image} contentFit="cover" cachePolicy="disk" transition={200} onError={() => setImageFailed(true)} />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>{title.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {(item?.location || item?.verified) ? (
          <View style={styles.badgesRow}>
            {item?.location ? (
              <View style={styles.badge}>
                <Ionicons name="location-outline" size={10} color={colors.blue} />
                <Text style={styles.badgeText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
            {item?.verified ? (
              <View style={[styles.badge, styles.badgeVerified]}>
                <Ionicons name="checkmark-circle" size={10} color={colors.green} />
                <Text style={[styles.badgeText, styles.badgeVerifiedText]}>Verified</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {price ? <Text style={styles.price}>{price}</Text> : null}
        {phone ? (
          <View style={styles.contactRow}>
            <Pressable
              onPress={callHostel}
              hitSlop={4}
              style={({ pressed }) => [styles.callButton, pressed && styles.callButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Call ${title}`}
            >
              <Ionicons name="call-outline" size={13} color={colors.onBrand} />
              <Text style={styles.callText}>Call agent</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.detailHint}>View details</Text>
        )}
      </View>
    </Pressable>
  );
}