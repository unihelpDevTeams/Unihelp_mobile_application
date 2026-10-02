import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Modal,
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
import { fetchMarketplaceListingsPage } from '../../services/firestoreSync';
import { useAuth } from '../../context/AuthContext';

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const NGN = '\u20A6';
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const NEW_LISTING_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_RECENT_SEARCHES = 6;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest first', icon: 'time-outline' },
  { key: 'price_asc', label: 'Price: low to high', icon: 'arrow-up-outline' },
  { key: 'price_desc', label: 'Price: high to low', icon: 'arrow-down-outline' },
  { key: 'rating_desc', label: 'Top rated', icon: 'star-outline' },
];

const PRICE_RANGES = [
  { key: 'all', label: 'Any price', min: null, max: null },
  { key: 'under20k', label: `Under ${NGN}20k`, min: 0, max: 20000 },
  { key: '20to100k', label: `${NGN}20k to ${NGN}100k`, min: 20000, max: 100000 },
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

// Lives for the app session so recent searches survive leaving the screen.
let RECENT_SEARCHES = [];

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const formatNaira = (value) => {
  const num = Number(value);
  if (value === undefined || value === null || value === '' || Number.isNaN(num)) return null;
  return `${NGN}${num.toLocaleString()}`;
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
  if (item.createdAt?._seconds) return item.createdAt._seconds * 1000;
  if (typeof item.createdAt === 'string' || typeof item.createdAt === 'number') {
    const parsed = new Date(item.createdAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const getCategoryIcon = (category = '') => CATEGORY_ICONS[String(category).trim().toLowerCase()] || CATEGORY_ICONS.default;

const getRating = (item = {}) => {
  const count = Number(item.reviewCount || 0);
  const avg = Number(item.ratingAverage || 0);
  if (!count || !Number.isFinite(avg) || avg <= 0) return null;
  return { avg, count };
};

const hashString = (value) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Deterministic "shuffle": shelves feel fresh each session but don't jump around on re-render.
const seededOrder = (list, seed) =>
  [...list].sort((a, b) => hashString(`${seed}${a?.id}`) - hashString(`${seed}${b?.id}`));

const digitsOnly = (value) => String(value || '').replace(/[^\d]/g, '');

const resolveRange = (priceRange, customMin, customMax) => {
  if (priceRange === 'custom') {
    const min = customMin ? Number(customMin) : null;
    const max = customMax ? Number(customMax) : null;
    let label = 'Custom price';
    if (min != null && max != null) label = `${formatNaira(min)} to ${formatNaira(max)}`;
    else if (min != null) label = `From ${formatNaira(min)}`;
    else if (max != null) label = `Up to ${formatNaira(max)}`;
    return { key: 'custom', min, max, label };
  }
  return PRICE_RANGES.find((p) => p.key === priceRange) || PRICE_RANGES[0];
};

/** Nigerian-friendly: 0803... / +234803... / 803... all become 234803... */
const toWhatsAppNumber = (phone) => {
  let d = digitsOnly(phone);
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = `234${d.slice(1)}`;
  else if (d.length === 10) d = `234${d}`;
  return d;
};

/* -------------------------------------------------------------------------- */
/*                              Presentational parts                          */
/* -------------------------------------------------------------------------- */

function SkeletonCards({ count = 4, styles }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View key={index} style={[styles.skeletonCard, { opacity: pulse }]}>
          <View style={styles.skeletonMedia} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[styles.skeletonLine, { width: '80%' }]} />
            <View style={[styles.skeletonLine, { width: '45%' }]} />
            <View style={[styles.skeletonLine, { width: '60%', height: 16 }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const ProductCard = React.memo(function ProductCard({ item, onPress, onNotify, variant = 'row', styles, colors }) {
  const isCompact = variant !== 'row';
  const title = item?.title || item?.name || 'Untitled item';
  const rawImage = resolveImage(item);
  const imageUrl = typeof rawImage === 'string' ? rawImage.trim() : '';
  const price = formatNaira(item?.price);
  const rating = getRating(item);
  const sellerName = item?.sellerName || item?.ownerName || item?.postedBy || '';
  const phone = item?.phone;
  const isNew = Date.now() - getCreatedMs(item) < NEW_LISTING_WINDOW_MS && getCreatedMs(item) > 0;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const callSeller = useCallback(async () => {
    const cleaned = String(phone || '').replace(/[^\d+]/g, '');
    if (!cleaned) return;
    try {
      await Linking.openURL(`tel:${cleaned}`);
    } catch (error) {
      onNotify?.('Could not open the phone dialer');
    }
  }, [phone, onNotify]);

  const messageSeller = useCallback(async () => {
    const number = toWhatsAppNumber(phone);
    if (!number) return;
    const text = `Hi, I'm interested in "${title}" that you listed on UniHelp.`;
    try {
      await Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(text)}`);
    } catch (error) {
      onNotify?.('Could not open WhatsApp');
    }
  }, [phone, title, onNotify]);

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.card,
        variant === 'rail' && styles.railCard,
        variant === 'tile' && styles.tileCard,
        variant === 'cell' && styles.cellCard,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}${price ? `, ${price}` : ''}`}
    >
      <View style={[styles.media, isCompact && styles.compactMedia]}>
        {imageUrl && !imageFailed ? (
          <Image
            source={{ uri: imageUrl }}
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
        {item?.isSponsored ? (
          <View style={styles.sponsoredFlag}>
            <Ionicons name="megaphone-outline" size={9} color={colors.warning || '#B45309'} />
            <Text style={styles.sponsoredText}>Sponsored</Text>
          </View>
        ) : isNew ? (
          <View style={styles.newFlag}>
            <Text style={styles.newFlagText}>New</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.content, isCompact && styles.compactContent]}>
        <View>
          <Text style={[styles.title, isCompact && styles.compactTitle]} numberOfLines={2}>{title}</Text>
          {item?.category || item?.condition || item?.verified ? (
            <View style={styles.badgesRow}>
              {item?.category ? (
                <View style={styles.badge}>
                  <Ionicons name="pricetag-outline" size={9} color={colors.brandText} />
                  <Text style={styles.badgeText} numberOfLines={1}>{item.category}</Text>
                </View>
              ) : null}
              {item?.condition ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>{item.condition}</Text>
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
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={rating ? colors.warning : colors.textTertiary} />
            <Text style={styles.ratingText}>{rating ? `${rating.avg.toFixed(1)} (${rating.count})` : 'No reviews yet'}</Text>
          </View>
          {sellerName ? <Text style={styles.sellerLine} numberOfLines={1}>{sellerName}</Text> : null}

          {phone && !isCompact ? (
            <View style={styles.contactRow}>
              <Pressable onPress={messageSeller} style={styles.whatsappButton} accessibilityRole="button" accessibilityLabel="Message seller on WhatsApp">
                <Ionicons name="logo-whatsapp" size={13} color={colors.onBrand} />
                <Text style={styles.callText}>WhatsApp</Text>
              </Pressable>
              <Pressable onPress={callSeller} style={styles.callButton} accessibilityRole="button" accessibilityLabel="Call seller">
                <Ionicons name="call-outline" size={13} color={colors.brandText} />
                <Text style={styles.callTextMuted}>Call</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.detailHint}>{isCompact ? 'Tap for details' : 'View details'}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
});

function MarketplaceSection({ section, styles, colors, onPressItem, onNotify, onViewAll }) {
  const isGrid = section.layout === 'grid';
  return (
    <View style={styles.storefrontSection}>
      <View style={styles.storefrontSectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.storefrontTitle}>{section.title}</Text>
          <Text style={styles.storefrontSubtitle}>{section.subtitle}</Text>
        </View>
        {section.action ? (
          <Pressable onPress={() => onViewAll(section.action)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`View all ${section.title}`}>
            <Text style={styles.storefrontLink}>View all</Text>
          </Pressable>
        ) : null}
      </View>

      {isGrid ? (
        <View style={styles.gridWrap}>
          {section.items.map((item) => (
            <ProductCard key={item.id} item={item} variant="tile" onPress={onPressItem} onNotify={onNotify} styles={styles} colors={colors} />
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
          {section.items.map((item) => (
            <ProductCard key={item.id} item={item} variant="rail" onPress={onPressItem} onNotify={onNotify} styles={styles} colors={colors} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MarketplaceHome({
  heroItems,
  categories,
  sections,
  styles,
  colors,
  onPressItem,
  onNotify,
  onSell,
  onSelectCategory,
  onOpenFilters,
  onViewAll,
  onBrowseAll,
  onLoadMore,
  canLoadMore,
  loadingMore,
}) {
  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Shop what students are selling</Text>
            <Text style={styles.heroText}>Books, gadgets, essentials and quick finds from your UniHelp community.</Text>
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
          <Pressable onPress={onBrowseAll} style={[styles.heroButton, styles.heroButtonMuted]} accessibilityRole="button">
            <Ionicons name="list-outline" size={14} color={colors.brandText} />
            <Text style={[styles.heroButtonText, styles.heroButtonTextMuted]}>Browse all</Text>
          </Pressable>
          <Pressable onPress={onOpenFilters} style={[styles.heroButton, styles.heroButtonMuted]} accessibilityRole="button">
            <Ionicons name="options-outline" size={14} color={colors.brandText} />
            <Text style={[styles.heroButtonText, styles.heroButtonTextMuted]}>Filters</Text>
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
          colors={colors}
          onPressItem={onPressItem}
          onNotify={onNotify}
          onViewAll={onViewAll}
        />
      ))}

      {canLoadMore ? (
        <Pressable onPress={onLoadMore} style={styles.loadMoreButton} disabled={loadingMore} accessibilityRole="button">
          {loadingMore ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="refresh-outline" size={15} color={colors.brand} />}
          <Text style={styles.loadMoreText}>{loadingMore ? 'Loading more…' : 'Load more campus finds'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyListings({ kind, onReset, onRetry, onSell, styles, colors }) {
  const config = {
    error: {
      icon: 'cloud-offline-outline',
      title: "Couldn't load listings",
      text: 'Check your connection and try again.',
      label: 'Try again',
      action: onRetry,
    },
    filtered: {
      icon: 'search-outline',
      title: 'No matching listings',
      text: 'Try a different search, a wider price range, or another category.',
      label: 'Clear all filters',
      action: onReset,
    },
    empty: {
      icon: 'bag-handle-outline',
      title: 'No listings yet',
      text: 'Be the first student to put something up for sale.',
      label: 'Sell an item',
      action: onSell,
    },
  }[kind];

  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={config.icon} size={26} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>{config.title}</Text>
      <Text style={styles.emptyDescription}>{config.text}</Text>
      <Pressable onPress={config.action} style={styles.emptyButton} accessibilityRole="button">
        <Text style={styles.emptyButtonText}>{config.label}</Text>
      </Pressable>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Screen                                  */
/* -------------------------------------------------------------------------- */

export default function StudentMarketplacePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  const [knownCategories, setKnownCategories] = useState([]);

  // Applied filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const [sort, setSort] = useState('newest');
  const [browseAll, setBrowseAll] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState({ category: 'all', priceRange: 'all', customMin: '', customMax: '', sort: 'newest' });
  const [searchFocused, setSearchFocused] = useState(false);
  const [recents, setRecents] = useState(RECENT_SEARCHES);
  const [toast, setToast] = useState('');

  const listRef = useRef(null);
  const reqRef = useRef(0);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const firstRunRef = useRef(true);
  const blurTimer = useRef(null);
  const toastTimer = useRef(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const seedRef = useRef(String(Date.now()));

  /* ------------------------------- Styles -------------------------------- */

  const styles = useThemeStyles((c, s, r) => ({
    screen: { flex: 1 },
    topBarRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginBottom: s.sm },
    searchWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: s.xs, backgroundColor: c.card,
      borderRadius: r.full, borderWidth: 1, borderColor: c.borderDefault, paddingHorizontal: s.md, height: 44,
    },
    searchWrapFocused: { borderColor: c.brand },
    searchInput: { flex: 1, fontSize: 14, color: c.textPrimary, paddingVertical: 0 },
    iconButton: {
      width: 44, height: 44, borderRadius: r.full, backgroundColor: c.card, borderWidth: 1,
      borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center',
    },
    iconButtonActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    filterBadge: {
      position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9,
      backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    filterBadgeText: { color: c.onBrand, fontSize: 10, fontWeight: '800' },

    recentsCard: {
      backgroundColor: c.card, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault,
      padding: s.md, marginBottom: s.sm, gap: s.sm,
    },
    recentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    recentsTitle: { fontSize: 12, fontWeight: '800', color: c.textSecondary },
    recentsClear: { fontSize: 12, fontWeight: '800', color: c.brand },
    recentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.xs },

    activeChipsRow: { flexDirection: 'row', alignItems: 'center', gap: s.xs, paddingBottom: s.sm, paddingRight: s.md },
    activeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: s.md, paddingRight: s.sm, paddingVertical: 6,
      borderRadius: r.full, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder,
    },
    activeChipText: { fontSize: 12, fontWeight: '800', color: c.brandText },
    clearAllText: { fontSize: 12, fontWeight: '800', color: c.brand, paddingHorizontal: s.xs },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.dangerLight || c.canvasLight,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl, padding: s.md, marginBottom: s.md,
    },
    errorText: { flex: 1, fontSize: 12, fontWeight: '600', color: c.textPrimary },
    retryText: { fontSize: 12, fontWeight: '800', color: c.brand },

    adminButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.brandLight,
      borderRadius: r.xl, borderWidth: 1, borderColor: c.brandGlow, paddingVertical: 10, marginBottom: s.md,
    },
    adminButtonText: { fontSize: 13, fontWeight: '800', color: c.brandText },

    feedHeader: { marginBottom: s.md, gap: s.sm },
    feedHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.sm },
    feedTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
    feedMeta: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    countBadge: { minWidth: 26, height: 26, paddingHorizontal: s.xs, borderRadius: r.md, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    countBadgeText: { fontSize: 12, fontWeight: '800', color: c.brandText },
    viewToggle: { flexDirection: 'row', backgroundColor: c.card, borderRadius: r.full, borderWidth: 1, borderColor: c.borderDefault, padding: 2 },
    viewToggleBtn: { width: 30, height: 26, borderRadius: r.full, alignItems: 'center', justifyContent: 'center' },
    viewToggleBtnActive: { backgroundColor: c.brand },
    backLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backLinkText: { fontSize: 12.5, fontWeight: '800', color: c.brand },
    reloadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    reloadingText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },

    heroCard: { backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s.lg, marginBottom: s.md, overflow: 'hidden' },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.md },
    heroCopy: { flex: 1 },
    heroTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '900' },
    heroText: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
    heroIconWrap: { width: 58, height: 58, borderRadius: r.xl, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginTop: s.md },
    heroButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: r.full, paddingHorizontal: s.md, paddingVertical: 8, backgroundColor: c.brand },
    heroButtonMuted: { backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
    heroButtonText: { color: c.onBrand, fontSize: 12, fontWeight: '900' },
    heroButtonTextMuted: { color: c.brandText },

    categoryStrip: { marginBottom: s.lg },
    categoryTile: {
      width: 88, minHeight: 78, backgroundColor: c.card, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault,
      padding: s.sm, alignItems: 'center', justifyContent: 'center', gap: 6, marginRight: s.sm,
    },
    categoryIcon: { width: 30, height: 30, borderRadius: r.md, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    categoryName: { color: c.textPrimary, fontSize: 11, fontWeight: '800', textAlign: 'center' },
    categoryCount: { color: c.textTertiary, fontSize: 10, fontWeight: '700' },

    storefrontSection: { marginBottom: s.xl },
    storefrontSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.sm },
    storefrontTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '900' },
    storefrontSubtitle: { color: c.textSecondary, fontSize: 11.5, marginTop: 2 },
    storefrontLink: { color: c.brand, fontSize: 12, fontWeight: '900' },
    railContent: { gap: s.sm, paddingRight: s.md },
    gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    loadMoreButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.card,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.full, paddingVertical: 11, marginBottom: s.lg,
    },
    loadMoreText: { color: c.brand, fontSize: 13, fontWeight: '900' },
    footerLoader: { paddingVertical: s.lg, alignItems: 'center' },
    footerText: { textAlign: 'center', color: c.textTertiary, fontSize: 12, paddingVertical: s.lg },

    card: { backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, flexDirection: 'row', gap: s.md, padding: s.md },
    railCard: { width: 154, minHeight: 244, flexDirection: 'column', gap: 8, padding: 8 },
    tileCard: { width: '48.5%', minHeight: 242, flexDirection: 'column', gap: 8, padding: 8 },
    cellCard: { flex: 1, maxWidth: '49%', minHeight: 242, flexDirection: 'column', gap: 8, padding: 8 },
    cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    media: { width: 104, height: 104, borderRadius: r.lg, overflow: 'hidden', backgroundColor: c.brandLight },
    compactMedia: { width: '100%', height: 132 },
    image: { width: '100%', height: '100%' },
    sponsoredFlag: {
      position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7,
      paddingVertical: 3, borderRadius: r.full, backgroundColor: c.warningLight || '#FEF3C7',
    },
    sponsoredText: { color: c.warning || '#B45309', fontSize: 9, fontWeight: '900' },
    newFlag: { position: 'absolute', top: 7, left: 7, paddingHorizontal: 7, paddingVertical: 3, borderRadius: r.full, backgroundColor: c.brand },
    newFlagText: { color: c.onBrand, fontSize: 9, fontWeight: '900' },
    fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
    fallbackText: { color: c.onBrand, fontSize: 28, fontWeight: '900' },
    content: { flex: 1, justifyContent: 'space-between' },
    compactContent: { minHeight: 88 },
    title: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
    compactTitle: { fontSize: 12.5, lineHeight: 17 },
    badgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: r.full, backgroundColor: c.brandLight, flexDirection: 'row', alignItems: 'center', gap: 2 },
    badgeVerified: { backgroundColor: c.greenLight },
    badgeText: { fontSize: 10, fontWeight: '800', color: c.brandText },
    price: { fontSize: 17, fontWeight: '900', color: c.textPrimary, marginTop: 4 },
    compactPrice: { fontSize: 14 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    ratingText: { color: c.textSecondary, fontSize: 11, fontWeight: '700' },
    sellerLine: { color: c.textTertiary, fontSize: 11, fontWeight: '700', marginTop: 3 },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    whatsappButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.brand, borderRadius: r.full, paddingVertical: 6, paddingHorizontal: s.md },
    callButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.brandLight, borderRadius: r.full, paddingVertical: 6, paddingHorizontal: s.md, borderWidth: 1, borderColor: c.brandBorder },
    callText: { color: c.onBrand, fontSize: 11, fontWeight: '800' },
    callTextMuted: { color: c.brandText, fontSize: 11, fontWeight: '800' },
    detailHint: { fontSize: 11, fontWeight: '700', color: c.brand, marginTop: 6 },

    skeletonCard: { flexDirection: 'row', gap: s.md, padding: s.md, backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault },
    skeletonMedia: { width: 104, height: 104, borderRadius: r.lg, backgroundColor: c.skeleton },
    skeletonLine: { height: 12, borderRadius: 6, backgroundColor: c.skeleton },

    emptyCard: { backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s['2xl'], alignItems: 'center', justifyContent: 'center', marginTop: s.md },
    emptyIconWrap: { width: 56, height: 56, borderRadius: r.xl, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: s.md },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 4 },
    emptyDescription: { fontSize: 13, lineHeight: 18, color: c.textSecondary, textAlign: 'center', marginBottom: s.lg },
    emptyButton: { backgroundColor: c.brand, borderRadius: r.full, paddingHorizontal: s.xl, paddingVertical: s.sm },
    emptyButtonText: { color: c.onBrand, fontSize: 13, fontWeight: '700' },

    sellFab: {
      position: 'absolute', right: 4, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.brand,
      borderRadius: 28, height: 52, paddingHorizontal: 20, shadowColor: c.shadow || '#000',
      shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 6,
    },
    sellFabText: { color: c.onBrand, fontWeight: '900', fontSize: 14 },

    toast: { position: 'absolute', top: 8, alignSelf: 'center', backgroundColor: c.textPrimary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '90%' },
    toastText: { color: c.surfacePrimary, fontSize: 13, fontWeight: '700' },

    sheetOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.bottomSheetBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 24, maxHeight: '88%' },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderDefault, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md },
    sheetTitle: { fontSize: 19, fontWeight: '800', color: c.textPrimary },
    sheetReset: { fontSize: 13, fontWeight: '800', color: c.brand },
    sheetLabel: { fontSize: 12, fontWeight: '800', color: c.textSecondary, marginBottom: s.xs, marginTop: s.md },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: s.xs },
    chip: { paddingHorizontal: s.md, paddingVertical: 8, borderRadius: r.full, backgroundColor: c.canvasLight, borderWidth: 1, borderColor: c.borderDefault, flexDirection: 'row', alignItems: 'center', gap: 4 },
    chipActive: { backgroundColor: c.brand, borderColor: c.brand },
    chipText: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: c.onBrand },
    rangeRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: s.sm },
    rangeInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.inputBackground || c.canvasLight, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl, paddingHorizontal: s.md },
    rangeInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: c.textPrimary },
    rangePrefix: { color: c.textSecondary, fontWeight: '800', marginRight: 4 },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm, paddingVertical: 11 },
    sortRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: c.textPrimary },
    sortRowTextActive: { color: c.brandText, fontWeight: '800' },
    sheetFooter: { flexDirection: 'row', gap: s.sm, marginTop: s.lg },
    sheetCancel: { flex: 1, paddingVertical: 13, borderRadius: r.xl, alignItems: 'center', backgroundColor: c.canvasLight, borderWidth: 1, borderColor: c.borderDefault },
    sheetCancelText: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
    sheetApply: { flex: 2, paddingVertical: 13, borderRadius: r.xl, alignItems: 'center', backgroundColor: c.brand },
    sheetApplyText: { fontSize: 14, fontWeight: '900', color: c.onBrand },
  }));

  /* ------------------------------ Derived state --------------------------- */

  const isAdmin = profile?.admin === true;
  const range = useMemo(() => resolveRange(priceRange, customMin, customMax), [priceRange, customMin, customMax]);
  const hasActiveFilters = Boolean(debouncedSearch) || category !== 'all' || priceRange !== 'all';
  const isFeedMode = browseAll || hasActiveFilters || sort !== 'newest';
  const filterCount = (category !== 'all' ? 1 : 0) + (priceRange !== 'all' ? 1 : 0) + (sort !== 'newest' ? 1 : 0);

  /* ------------------------------- Utilities ------------------------------ */

  const showToast = useCallback(
    (text) => {
      setToast(text);
      clearTimeout(toastTimer.current);
      Animated.timing(toastOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setToast(''));
      }, 2200);
    },
    [toastOpacity]
  );

  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(blurTimer.current);
    },
    []
  );

  // Debounce so typing doesn't fire a server request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const addRecent = useCallback((term) => {
    const clean = String(term || '').trim();
    if (clean.length < 2) return;
    RECENT_SEARCHES = [clean, ...RECENT_SEARCHES.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
    setRecents(RECENT_SEARCHES);
  }, []);

  const clearRecents = () => {
    RECENT_SEARCHES = [];
    setRecents([]);
  };

  /* -------------------------------- Loading ------------------------------- */

  const loadListings = useCallback(
    async ({ reset = false, pull = false } = {}) => {
      if (reset) {
        reqRef.current += 1;
        pageRef.current = 1;
        loadingMoreRef.current = false;
        setLoadingMore(false);
        setLoadMoreFailed(false);
        if (pull) setRefreshing(true);
        else setReloading(true);
      } else {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        setLoadMoreFailed(false);
      }

      const reqId = reqRef.current;
      setError(null);

      try {
        const page = await fetchMarketplaceListingsPage({
          pageSize: PAGE_SIZE,
          page: reset ? 1 : pageRef.current,
          search: debouncedSearch,
          category,
          minPrice: range.min,
          maxPrice: range.max,
          sort,
        });
        if (reqId !== reqRef.current) return; // a newer request superseded this one

        const fetched = Array.isArray(page?.items) ? page.items : [];
        setItems((current) => {
          if (reset) return fetched;
          const seen = new Set(current.map((i) => i.id));
          return [...current, ...fetched.filter((i) => !seen.has(i.id))];
        });

        pageRef.current = (page?.page || (reset ? 1 : pageRef.current)) + 1;
        hasMoreRef.current = Boolean(page?.hasMore);
        setHasMore(hasMoreRef.current);

        // Remember every category we've ever seen so the filter list never collapses.
        setKnownCategories((prev) => {
          const lower = new Set(prev.map((c) => c.toLowerCase()));
          const next = [...prev];
          let changed = false;
          fetched.forEach((item) => {
            const name = (item?.category || '').trim();
            if (name && !lower.has(name.toLowerCase())) {
              lower.add(name.toLowerCase());
              next.push(name);
              changed = true;
            }
          });
          return changed ? next.sort((a, b) => a.localeCompare(b)) : prev;
        });
      } catch (err) {
        if (reqId !== reqRef.current) return;
        if (reset) setError(err?.message || 'Could not load listings. Please try again.');
        else setLoadMoreFailed(true);
      } finally {
        if (reqId === reqRef.current) {
          setInitialLoading(false);
          setReloading(false);
          setRefreshing(false);
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, category, range.min, range.max, sort]
  );

  useEffect(() => {
    loadListings({ reset: true });
    if (!firstRunRef.current) listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    firstRunRef.current = false;
  }, [loadListings]);

  /* ------------------------------ Local filtering ------------------------- */

  const filteredItems = useMemo(() => {
    const needle = debouncedSearch.toLowerCase();
    const categoryLower = category.toLowerCase();

    const result = items.filter((item) => {
      if (needle) {
        const haystack = [item?.title, item?.name, item?.description, item?.category, item?.condition]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (category !== 'all' && (item?.category || '').trim().toLowerCase() !== categoryLower) return false;

      const price = Number(item?.price);
      const valid = !Number.isNaN(price);
      if (range.min != null && (!valid || price < range.min)) return false;
      if (range.max != null && (!valid || price > range.max)) return false;
      return true;
    });

    const sorted = [...result];
    if (sort === 'price_asc') sorted.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
    else if (sort === 'price_desc') sorted.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
    else if (sort === 'newest') sorted.sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
    else if (sort === 'rating_desc') {
      sorted.sort(
        (a, b) =>
          Number(b?.ratingAverage || 0) - Number(a?.ratingAverage || 0) ||
          Number(b?.reviewCount || 0) - Number(a?.reviewCount || 0)
      );
    }
    return sorted;
  }, [items, debouncedSearch, category, range.min, range.max, sort]);

  const categorySummaries = useMemo(() => {
    const counts = new Map();
    items.forEach((item) => {
      const name = (item?.category || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      counts.set(key, { key: name, label: name, count: (counts.get(key)?.count || 0) + 1 });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 8);
  }, [items]);

  const marketplaceSections = useMemo(() => {
    const seed = seedRef.current;
    const newest = [...filteredItems].sort((a, b) => getCreatedMs(b) - getCreatedMs(a));
    const sponsored = filteredItems
      .filter((item) => item?.isSponsored)
      .sort((a, b) => Number(b?.sponsoredPriority || 0) - Number(a?.sponsoredPriority || 0));
    const affordable = filteredItems
      .filter((item) => {
        const price = Number(item?.price);
        return Number.isFinite(price) && price > 0 && price <= 20000;
      })
      .sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
    const verified = filteredItems.filter((item) => item?.verified);
    const picks = seededOrder(filteredItems, seed);

    const categoryShelves = categorySummaries
      .map((cat) => ({
        key: `category-${cat.key}`,
        title: cat.label,
        subtitle: `${cat.count} campus ${cat.count === 1 ? 'listing' : 'listings'}`,
        items: seededOrder(
          filteredItems.filter((item) => (item?.category || '').trim().toLowerCase() === cat.key.toLowerCase()),
          seed
        ).slice(0, 8),
        action: { type: 'category', value: cat.key },
      }))
      .filter((section) => section.items.length >= 2)
      .slice(0, 3);

    return [
      { key: 'sponsored', title: 'Sponsored', subtitle: 'Promoted campus listings', items: sponsored.slice(0, 8) },
      { key: 'fresh', title: 'Fresh on campus', subtitle: 'New items students just posted', items: newest.slice(0, 8), action: { type: 'all' } },
      { key: 'deals', title: 'Budget finds', subtitle: `Useful picks under ${NGN}20k`, items: affordable.slice(0, 8), action: { type: 'budget' } },
      { key: 'trusted', title: 'Verified sellers', subtitle: 'Listings with extra trust signals', items: verified.slice(0, 8) },
      ...categoryShelves,
      { key: 'random', title: 'Explore more picks', subtitle: 'A mixed shelf so browsing feels fresh', items: picks.slice(0, 12), layout: 'grid' },
    ].filter((section) => section.items.length > 0);
  }, [categorySummaries, filteredItems]);

  /* -------------------------------- Actions ------------------------------- */

  const goToListing = useCallback(
    (item) => router.navigate({ pathname: '/view/[type]/[id]', params: { type: 'listing', id: item.id } }),
    [router]
  );

  const goToSell = useCallback(() => router.navigate('/upload?type=marketplace'), [router]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('all');
    setPriceRange('all');
    setCustomMin('');
    setCustomMax('');
    setSort('newest');
    setBrowseAll(false);
  }, []);

  const handleViewAll = useCallback((action) => {
    if (!action) return;
    if (action.type === 'category') setCategory(action.value);
    else if (action.type === 'budget') setPriceRange('under20k');
    setBrowseAll(true);
  }, []);

  const openFilters = () => {
    setDraft({ category, priceRange, customMin, customMax, sort });
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    let nextRange = draft.priceRange;
    let min = draft.customMin;
    let max = draft.customMax;
    if (nextRange === 'custom') {
      if (!min && !max) nextRange = 'all';
      else if (min && max && Number(min) > Number(max)) [min, max] = [max, min];
    }
    setCategory(draft.category);
    setPriceRange(nextRange);
    setCustomMin(nextRange === 'custom' ? min : '');
    setCustomMax(nextRange === 'custom' ? max : '');
    setSort(draft.sort);
    setFiltersOpen(false);
  };

  const submitSearch = () => {
    addRecent(search);
    setSearchFocused(false);
  };

  const applyRecent = (term) => {
    setSearch(term);
    setDebouncedSearch(term);
    addRecent(term);
    setSearchFocused(false);
  };

  /* -------------------------------- Renderers ----------------------------- */

  const activeChips = [];
  if (category !== 'all') activeChips.push({ key: 'category', label: category, icon: getCategoryIcon(category), clear: () => setCategory('all') });
  if (priceRange !== 'all') activeChips.push({ key: 'price', label: range.label, icon: 'wallet-outline', clear: () => { setPriceRange('all'); setCustomMin(''); setCustomMax(''); } });
  if (sort !== 'newest') activeChips.push({ key: 'sort', label: SORT_OPTIONS.find((o) => o.key === sort)?.label || sort, icon: 'swap-vertical-outline', clear: () => setSort('newest') });

  const renderTopBar = () => (
    <View>
      <View style={styles.topBarRow}>
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <Ionicons name="search" size={16} color={colors.greyLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search books, gadgets, hostel items…"
            placeholderTextColor={colors.greyLight}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            onSubmitEditing={submitSearch}
            onFocus={() => {
              clearTimeout(blurTimer.current);
              setSearchFocused(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setSearchFocused(false), 150);
              addRecent(search);
            }}
            accessibilityLabel="Search listings"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={colors.greyLight} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={openFilters}
          style={[styles.iconButton, filterCount > 0 && styles.iconButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={`Open filters${filterCount ? `, ${filterCount} active` : ''}`}
        >
          <Ionicons name="options-outline" size={20} color={filterCount > 0 ? colors.brand : colors.textPrimary} />
          {filterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {searchFocused && !search && recents.length > 0 ? (
        <View style={styles.recentsCard}>
          <View style={styles.recentsHeader}>
            <Text style={styles.recentsTitle}>Recent searches</Text>
            <Pressable onPress={clearRecents} hitSlop={8} accessibilityRole="button">
              <Text style={styles.recentsClear}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.recentsRow}>
            {recents.map((term) => (
              <Pressable key={term} style={styles.chip} onPress={() => applyRecent(term)} accessibilityRole="button">
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.chipText}>{term}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {activeChips.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeChipsRow} keyboardShouldPersistTaps="handled">
          {activeChips.map((chip) => (
            <Pressable key={chip.key} style={styles.activeChip} onPress={chip.clear} accessibilityRole="button" accessibilityLabel={`Remove filter ${chip.label}`}>
              <Ionicons name={chip.icon} size={12} color={colors.brandText} />
              <Text style={styles.activeChipText}>{chip.label}</Text>
              <Ionicons name="close" size={14} color={colors.brandText} />
            </Pressable>
          ))}
          <Pressable onPress={clearFilters} hitSlop={6} accessibilityRole="button">
            <Text style={styles.clearAllText}>Clear all</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );

  const renderHeader = () => (
    <View>
      {error && items.length > 0 ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadListings({ reset: true })} hitSlop={8} accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {isAdmin ? (
        <Pressable style={styles.adminButton} onPress={() => router.navigate('/adminpanel')} accessibilityRole="button">
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.brandText} />
          <Text style={styles.adminButtonText}>Admin Panel</Text>
        </Pressable>
      ) : null}

      {isFeedMode ? (
        <View style={styles.feedHeader}>
          {browseAll && !hasActiveFilters && sort === 'newest' ? null : null}
          <View style={styles.feedHeaderRow}>
            <Pressable style={styles.backLink} onPress={clearFilters} accessibilityRole="button" accessibilityLabel="Back to discover">
              <Ionicons name="chevron-back" size={16} color={colors.brand} />
              <Text style={styles.backLinkText}>Discover</Text>
            </Pressable>
            <View style={styles.feedMeta}>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredItems.length}</Text>
              </View>
              <View style={styles.viewToggle}>
                {[
                  { key: 'list', icon: 'list-outline' },
                  { key: 'grid', icon: 'grid-outline' },
                ].map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[styles.viewToggleBtn, viewMode === opt.key && styles.viewToggleBtnActive]}
                    onPress={() => setViewMode(opt.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${opt.key} view`}
                    accessibilityState={{ selected: viewMode === opt.key }}
                  >
                    <Ionicons name={opt.icon} size={15} color={viewMode === opt.key ? colors.onBrand : colors.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <Text style={styles.feedTitle}>
            {debouncedSearch ? `Results for “${debouncedSearch}”` : hasActiveFilters ? 'Filtered items' : 'All listings'}
          </Text>
          {reloading ? (
            <View style={styles.reloadingRow}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={styles.reloadingText}>Updating results…</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <MarketplaceHome
          heroItems={filteredItems.slice(0, 5)}
          categories={categorySummaries}
          sections={marketplaceSections}
          styles={styles}
          colors={colors}
          onPressItem={goToListing}
          onNotify={showToast}
          onSell={goToSell}
          onSelectCategory={(next) => setCategory(next)}
          onOpenFilters={openFilters}
          onViewAll={handleViewAll}
          onBrowseAll={() => setBrowseAll(true)}
          onLoadMore={() => loadListings({ reset: false })}
          canLoadMore={hasMore}
          loadingMore={loadingMore}
        />
      )}
    </View>
  );

  const renderItem = ({ item }) => (
    <ProductCard
      item={item}
      variant={viewMode === 'grid' ? 'cell' : 'row'}
      onPress={goToListing}
      onNotify={showToast}
      styles={styles}
      colors={colors}
    />
  );

  const emptyKind = error ? 'error' : isFeedMode ? 'filtered' : 'empty';
  const showSkeleton = reloading && filteredItems.length === 0 && isFeedMode;

  const renderFooter = () => {
    if (!isFeedMode) return null;
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      );
    }
    if (loadMoreFailed) {
      return (
        <Pressable onPress={() => loadListings({ reset: false })} style={styles.loadMoreButton} accessibilityRole="button">
          <Ionicons name="refresh-outline" size={15} color={colors.brand} />
          <Text style={styles.loadMoreText}>Couldn't load more. Tap to retry</Text>
        </Pressable>
      );
    }
    if (!hasMore && filteredItems.length > 8) return <Text style={styles.footerText}>You've reached the end</Text>;
    return null;
  };

  const renderFilterSheet = () => (
    <Modal visible={filtersOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setFiltersOpen(false)}>
      <Pressable style={styles.sheetOverlay} onPress={() => setFiltersOpen(false)}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <Pressable
              onPress={() => setDraft({ category: 'all', priceRange: 'all', customMin: '', customMax: '', sort: 'newest' })}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.sheetReset}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {knownCategories.length > 0 ? (
              <View>
                <Text style={styles.sheetLabel}>Category</Text>
                <View style={styles.chipsWrap}>
                  {['all', ...knownCategories].map((cat) => {
                    const active = draft.category.toLowerCase() === cat.toLowerCase();
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setDraft((d) => ({ ...d, category: cat }))}
                        style={[styles.chip, active && styles.chipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        {active ? <Ionicons name="checkmark" size={12} color={colors.onBrand} /> : null}
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat === 'all' ? 'All' : cat}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Text style={styles.sheetLabel}>Price</Text>
            <View style={styles.chipsWrap}>
              {[...PRICE_RANGES, { key: 'custom', label: 'Custom' }].map((opt) => {
                const active = draft.priceRange === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setDraft((d) => ({ ...d, priceRange: opt.key }))}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {draft.priceRange === 'custom' ? (
              <View style={styles.rangeRow}>
                <View style={styles.rangeInputWrap}>
                  <Text style={styles.rangePrefix}>{NGN}</Text>
                  <TextInput
                    value={draft.customMin}
                    onChangeText={(t) => setDraft((d) => ({ ...d, customMin: digitsOnly(t) }))}
                    placeholder="Min"
                    placeholderTextColor={colors.greyLight}
                    keyboardType="number-pad"
                    style={styles.rangeInput}
                    accessibilityLabel="Minimum price"
                  />
                </View>
                <Text style={styles.sheetReset}>to</Text>
                <View style={styles.rangeInputWrap}>
                  <Text style={styles.rangePrefix}>{NGN}</Text>
                  <TextInput
                    value={draft.customMax}
                    onChangeText={(t) => setDraft((d) => ({ ...d, customMax: digitsOnly(t) }))}
                    placeholder="Max"
                    placeholderTextColor={colors.greyLight}
                    keyboardType="number-pad"
                    style={styles.rangeInput}
                    accessibilityLabel="Maximum price"
                  />
                </View>
              </View>
            ) : null}

            <Text style={styles.sheetLabel}>Sort by</Text>
            {SORT_OPTIONS.map((opt) => {
              const active = draft.sort === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={styles.sortRow}
                  onPress={() => setDraft((d) => ({ ...d, sort: opt.key }))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={opt.icon} size={16} color={active ? colors.brand : colors.textSecondary} />
                  <Text style={[styles.sortRowText, active && styles.sortRowTextActive]}>{opt.label}</Text>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={20} color={active ? colors.brand : colors.textTertiary} />
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Pressable style={styles.sheetCancel} onPress={() => setFiltersOpen(false)} accessibilityRole="button">
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.sheetApply} onPress={applyFilters} accessibilityRole="button">
              <Text style={styles.sheetApplyText}>Show results</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const gridMode = isFeedMode && viewMode === 'grid';

  return (
    <ScreenShell
      scrollable={false}
      title="Student Marketplace"
      subtitle="Buy and sell student essentials within your community"
      showBack
      loading={initialLoading}
    >
      <View style={styles.screen}>
        {renderTopBar()}

        <FlatList
          ref={listRef}
          key={isFeedMode ? viewMode : 'home'}
          data={isFeedMode ? filteredItems : []}
          keyExtractor={(item, index) => String(item?.id ?? `listing-${index}`)}
          renderItem={renderItem}
          numColumns={gridMode ? 2 : 1}
          columnWrapperStyle={gridMode ? { gap: 10 } : undefined}
          ListHeaderComponent={renderHeader()}
          contentContainerStyle={{ gap: 12, paddingBottom: 96 }}
          style={{ opacity: reloading ? 0.6 : 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshing={refreshing}
          onRefresh={() => loadListings({ reset: true, pull: true })}
          onEndReached={() => {
            // Keep paginating even with filters on: local matches may be sparse in the pages loaded so far.
            if (isFeedMode) loadListings({ reset: false });
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter()}
          ListEmptyComponent={
            isFeedMode ? (
              showSkeleton ? (
                <SkeletonCards styles={styles} />
              ) : !reloading && !initialLoading ? (
                <EmptyListings kind={emptyKind} onReset={clearFilters} onRetry={() => loadListings({ reset: true })} onSell={goToSell} styles={styles} colors={colors} />
              ) : null
            ) : !initialLoading && !reloading && filteredItems.length === 0 ? (
              <EmptyListings kind={error ? 'error' : 'empty'} onReset={clearFilters} onRetry={() => loadListings({ reset: true })} onSell={goToSell} styles={styles} colors={colors} />
            ) : null
          }
        />

        <Pressable
          style={({ pressed }) => [styles.sellFab, pressed && { opacity: 0.9 }]}
          onPress={goToSell}
          accessibilityRole="button"
          accessibilityLabel="Sell an item"
        >
          <Ionicons name="add" size={22} color={colors.onBrand} />
          <Text style={styles.sellFabText}>Sell</Text>
        </Pressable>

        {toast ? (
          <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastOpacity }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        ) : null}
      </View>

      {renderFilterSheet()}
    </ScreenShell>
  );
}