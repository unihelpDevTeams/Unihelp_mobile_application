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
// Install once:  npx expo install react-native-svg
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
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
  food: 'fast-food-outline',
  beauty: 'sparkles-outline',
  default: 'cube-outline',
};

// Curated Unsplash photography. Every tile falls back to an SVG if a photo fails to load.
const unsplash = (id, w = 480) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const HERO_PHOTO = unsplash('photo-1523240795612-9a054b0db644', 900);
const CATEGORY_PHOTOS = {
  books: unsplash('photo-1512820790803-83ca734da794'),
  textbook: unsplash('photo-1512820790803-83ca734da794'),
  textbooks: unsplash('photo-1512820790803-83ca734da794'),
  gadget: unsplash('photo-1498049794561-7780e7231661'),
  gadgets: unsplash('photo-1498049794561-7780e7231661'),
  electronics: unsplash('photo-1498049794561-7780e7231661'),
  fashion: unsplash('photo-1445205170230-053b83016050'),
  clothing: unsplash('photo-1445205170230-053b83016050'),
  furniture: unsplash('photo-1555041469-a586c61ea9bc'),
  food: unsplash('photo-1504674900247-0877df9cc836'),
  beauty: unsplash('photo-1522335789203-aabd1fc54bc9'),
  default: unsplash('photo-1607082348824-0a96f2a4b9da'),
};

const FALLBACK_TONES = ['#0E7C66', '#2F5D9B', '#B4543A', '#6B4FA0', '#3D7A8C', '#9A6B1F'];

const TRUST_TIPS = [
  { icon: 'people-outline', title: 'Meet on campus', text: 'Pick a busy, well-lit spot like the library steps.' },
  { icon: 'eye-outline', title: 'Check before paying', text: 'Inspect the item first. Pay only when you are happy.' },
  { icon: 'shield-checkmark-outline', title: 'Look for the badge', text: 'Verified sellers have been confirmed by UniHelp.' },
];

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

const categoryKey = (category = '') => String(category).trim().toLowerCase();
const getCategoryIcon = (category = '') => CATEGORY_ICONS[categoryKey(category)] || CATEGORY_ICONS.default;
const getCategoryPhoto = (category = '') => CATEGORY_PHOTOS[categoryKey(category)] || CATEGORY_PHOTOS.default;

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

const greetingFor = (date = new Date()) => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const firstNameOf = (profile) => {
  const raw = profile?.firstName || profile?.name || profile?.displayName || profile?.fullName || '';
  return String(raw).trim().split(/\s+/)[0] || '';
};

const timeAgo = (ms) => {
  if (!ms) return '';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return '';
};

/* -------------------------------------------------------------------------- */
/*                                SVG artwork                                 */
/* -------------------------------------------------------------------------- */

/** Soft monogram tile used whenever a listing has no photo (or it fails to load). */
function ImageFallback({ title = '?', style }) {
  const tone = FALLBACK_TONES[hashString(title) % FALLBACK_TONES.length];
  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="fb" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tone} stopOpacity="1" />
            <Stop offset="1" stopColor={tone} stopOpacity="0.72" />
          </LinearGradient>
        </Defs>
        <Rect width="120" height="120" fill="url(#fb)" />
        <Circle cx="108" cy="12" r="46" fill="#fff" opacity="0.08" />
        <Circle cx="10" cy="112" r="38" fill="#fff" opacity="0.07" />
        <Path d="M38 52h44l-4 34a6 6 0 0 1-6 5H48a6 6 0 0 1-6-5l-4-34Z" fill="#fff" opacity="0.22" />
        <Path d="M50 52v-6a10 10 0 0 1 20 0v6" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5" />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', paddingTop: 14 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', opacity: 0.95 }}>{title.charAt(0).toUpperCase()}</Text>
      </View>
    </View>
  );
}

/** Hero overlay: gradient scrim plus a quiet shopping-bag and book illustration. */
function HeroArt({ brand = '#0E7C66' }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 200" preserveAspectRatio="xMaxYMid slice">
      <Defs>
        <LinearGradient id="scrim" x1="0" y1="0" x2="1" y2="0.4">
          <Stop offset="0" stopColor="#04201A" stopOpacity="0.94" />
          <Stop offset="0.55" stopColor={brand} stopOpacity="0.78" />
          <Stop offset="1" stopColor={brand} stopOpacity="0.38" />
        </LinearGradient>
      </Defs>
      <Rect width="360" height="200" fill="url(#scrim)" />
      <Circle cx="330" cy="30" r="70" fill="#fff" opacity="0.06" />
      <Circle cx="290" cy="190" r="54" fill="#fff" opacity="0.05" />
      <G transform="translate(248 58)">
        <Path d="M12 30h70l-6 62a10 10 0 0 1-10 9H28a10 10 0 0 1-10-9L12 30Z" fill="#fff" opacity="0.95" />
        <Path d="M30 30v-8a17 17 0 0 1 34 0v8" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.95" />
        <Path d="M32 62c4 8 26 8 30 0" stroke={brand} strokeWidth="5" strokeLinecap="round" fill="none" />
        <G transform="translate(58 70) rotate(8)">
          <Rect width="38" height="48" rx="5" fill="#FFD166" />
          <Rect x="6" y="0" width="5" height="48" fill="#E6A700" />
          <Rect x="16" y="12" width="16" height="3.5" rx="1.7" fill="#fff" opacity="0.85" />
          <Rect x="16" y="20" width="12" height="3.5" rx="1.7" fill="#fff" opacity="0.6" />
        </G>
      </G>
    </Svg>
  );
}

/** Friendly spot illustration for empty and error states. */
function EmptyArt({ kind = 'empty', color = '#0E7C66' }) {
  return (
    <Svg width={132} height={104} viewBox="0 0 132 104">
      <Circle cx="66" cy="52" r="46" fill={color} opacity="0.10" />
      <Circle cx="108" cy="20" r="6" fill={color} opacity="0.25" />
      <Circle cx="18" cy="78" r="4" fill={color} opacity="0.25" />
      {kind === 'error' ? (
        <G>
          <Path d="M36 62a30 30 0 0 1 60 0" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.35" />
          <Path d="M48 66a18 18 0 0 1 36 0" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.6" />
          <Circle cx="66" cy="74" r="5" fill={color} />
          <Path d="M92 28l12 12M104 28L92 40" stroke="#D64545" strokeWidth="5" strokeLinecap="round" />
        </G>
      ) : kind === 'filtered' ? (
        <G>
          <Circle cx="60" cy="48" r="22" stroke={color} strokeWidth="7" fill="#fff" />
          <Path d="M77 65l18 18" stroke={color} strokeWidth="8" strokeLinecap="round" />
          <Path d="M52 48h16" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.6" />
        </G>
      ) : (
        <G>
          <Path d="M38 40h56l-5 40a8 8 0 0 1-8 7H51a8 8 0 0 1-8-7l-5-40Z" fill={color} />
          <Path d="M52 40v-5a14 14 0 0 1 28 0v5" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
          <Path d="M56 56c3 7 17 7 20 0" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </G>
      )}
    </Svg>
  );
}

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

const ProductCard = React.memo(function ProductCard({
  item, onPress, onNotify, onToggleSave, onManageListing, viewerId, isSaved, variant = 'row', styles, colors,
}) {
  const isCompact = variant !== 'row';
  const title = item?.title || item?.name || 'Untitled item';
  const rawImage = resolveImage(item);
  const imageUrl = typeof rawImage === 'string' ? rawImage.trim() : '';
  const price = formatNaira(item?.price);
  const rating = getRating(item);
  const sellerName = item?.sellerName || item?.ownerName || item?.postedBy || '';
  const phone = item?.phone;
  const ownerId = item?.ownerId || item?.sellerId || item?.userId || item?.uploadedBy || item?.createdBy;
  const isOwner = Boolean(viewerId && ownerId && String(viewerId) === String(ownerId));
  const createdMs = getCreatedMs(item);
  const isNew = createdMs > 0 && Date.now() - createdMs < NEW_LISTING_WINDOW_MS;
  const posted = timeAgo(createdMs);
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
    const text = `Hi, I'm interested in "${title}" that you listed on UniHelp. Is it still available?`;
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
      <View style={[styles.media, variant === 'row' && styles.listingMedia, isCompact && styles.compactMedia]}>
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
          <ImageFallback title={title} />
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

        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onToggleSave?.(item.id);
          }}
          hitSlop={8}
          style={styles.heartBtn}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save item'}
          accessibilityState={{ selected: !!isSaved }}
        >
          <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={15} color={isSaved ? '#E5484D' : '#2B2B2B'} />
        </Pressable>
      </View>

      <View style={[styles.content, isCompact && styles.compactContent]}>
        <View>
          {price ? <Text style={[styles.price, isCompact && styles.compactPrice]}>{price}</Text> : null}
          <Text style={[styles.title, isCompact && styles.compactTitle]} numberOfLines={2}>{title}</Text>

          {item?.category || item?.condition || item?.verified ? (
            <View style={styles.badgesRow}>
              {item?.condition ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>{item.condition}</Text>
                </View>
              ) : null}
              {item?.category && !isCompact ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>{item.category}</Text>
                </View>
              ) : null}
              {item?.verified ? (
                <View style={[styles.badge, styles.badgeVerified]}>
                  <Ionicons name="checkmark-circle" size={10} color={colors.green} />
                  <Text style={[styles.badgeText, { color: colors.green }]}>Verified</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 8 }}>
          <View style={styles.sellerRow}>
            {sellerName ? (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{sellerName.charAt(0).toUpperCase()}</Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              {sellerName ? <Text style={styles.sellerLine} numberOfLines={1}>{sellerName}</Text> : null}
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={11} color={rating ? colors.warning : colors.textTertiary} />
                <Text style={styles.ratingText} numberOfLines={1}>
                  {rating ? `${rating.avg.toFixed(1)} (${rating.count})` : 'New seller'}
                  {!isCompact && posted ? `  •  ${posted}` : ''}
                </Text>
              </View>
            </View>
          </View>

          {isOwner ? (
            <View style={styles.contactRow}>
              <Pressable onPress={(event) => { event.stopPropagation(); onManageListing?.(); }} style={styles.manageListingButton} accessibilityRole="button" accessibilityLabel={`Manage ${title}`}>
                <Ionicons name="settings-outline" size={14} color={colors.brandText} />
                <Text style={styles.manageListingText}>Manage listing</Text>
              </Pressable>
            </View>
          ) : phone && !isCompact ? (
            <View style={styles.contactRow}>
              <Pressable onPress={(event) => { event.stopPropagation(); messageSeller(); }} style={styles.whatsappButton} accessibilityRole="button" accessibilityLabel="Message seller on WhatsApp">
                <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                <Text style={styles.callText}>Chat on WhatsApp</Text>
              </Pressable>
              <Pressable onPress={(event) => { event.stopPropagation(); callSeller(); }} style={styles.callButton} accessibilityRole="button" accessibilityLabel="Call seller">
                <Ionicons name="call-outline" size={15} color={colors.brandText} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

function MarketplaceSection({ section, styles, colors, onPressItem, onNotify, onViewAll, saved, onToggleSave, viewerId, onManageListing }) {
  const isGrid = section.layout === 'grid';
  const cardProps = { onPress: onPressItem, onNotify, onToggleSave, onManageListing, viewerId, styles, colors };
  return (
    <View style={styles.storefrontSection}>
      <View style={styles.storefrontSectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.storefrontTitle}>{section.title}</Text>
          <Text style={styles.storefrontSubtitle}>{section.subtitle}</Text>
        </View>
        {section.action ? (
          <Pressable onPress={() => onViewAll(section.action)} hitSlop={8} style={styles.seeAll} accessibilityRole="button" accessibilityLabel={`See all ${section.title}`}>
            <Text style={styles.storefrontLink}>See all</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.brand} />
          </Pressable>
        ) : null}
      </View>

      {isGrid ? (
        <View style={styles.gridWrap}>
          {section.items.map((item) => (
            <ProductCard key={item.id} item={item} variant="tile" isSaved={!!saved[item.id]} {...cardProps} />
          ))}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
          {section.items.map((item) => (
            <ProductCard key={item.id} item={item} variant="rail" isSaved={!!saved[item.id]} {...cardProps} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CategoryTile({ cat, onPress, styles, colors }) {
  const [failed, setFailed] = useState(false);
  return (
    <Pressable
      style={({ pressed }) => [styles.categoryTile, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${cat.label}, ${cat.count} listings`}
    >
      {failed ? (
        <ImageFallback title={cat.label} style={StyleFill} />
      ) : (
        <Image source={{ uri: getCategoryPhoto(cat.label) }} style={StyleFill} contentFit="cover" cachePolicy="disk" transition={200} onError={() => setFailed(true)} />
      )}
      <View style={styles.categoryScrim} />
      <View style={styles.categoryIcon}>
        <Ionicons name={getCategoryIcon(cat.label)} size={14} color={colors.brand} />
      </View>
      <View style={styles.categoryText}>
        <Text style={styles.categoryName} numberOfLines={1}>{cat.label}</Text>
        <Text style={styles.categoryCount}>{cat.count} {cat.count === 1 ? 'item' : 'items'}</Text>
      </View>
    </Pressable>
  );
}
const StyleFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

function MarketplaceHome({
  greeting, name, total, heroItems, categories, sections, styles, colors, saved,
  onPressItem, onNotify, onToggleSave, onSell, onSelectCategory, onOpenFilters,
  onViewAll, onBrowseAll, onLoadMore, canLoadMore, loadingMore, viewerId, onManageListing,
}) {
  const [heroFailed, setHeroFailed] = useState(false);
  return (
    <View>
      <View style={styles.heroCard}>
        {!heroFailed ? (
          <Image source={{ uri: HERO_PHOTO }} style={StyleFill} contentFit="cover" cachePolicy="disk" transition={300} onError={() => setHeroFailed(true)} />
        ) : null}
        <View style={StyleFill} pointerEvents="none">
          <HeroArt brand={colors.brand} />
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.heroGreeting}>{name ? `${greeting}, ${name}` : greeting}</Text>
          <Text style={styles.heroTitle}>Find it from a student nearby.</Text>
          <Text style={styles.heroText}>
            Textbooks, gadgets and everyday essentials from people on your campus{total > 0 ? `, ${total}+ listed right now.` : '.'}
          </Text>
          <View style={styles.heroActions}>
            <Pressable onPress={onBrowseAll} style={styles.heroButton} accessibilityRole="button">
              <Text style={styles.heroButtonText}>Browse everything</Text>
            </Pressable>
            <Pressable onPress={onSell} style={styles.heroButtonGhost} accessibilityRole="button">
              <Ionicons name="add" size={15} color="#fff" />
              <Text style={styles.heroButtonGhostText}>Sell an item</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.trustStrip}>
        {TRUST_TIPS.map((tip) => (
          <View key={tip.title} style={styles.trustItem}>
            <View style={styles.trustIcon}>
              <Ionicons name={tip.icon} size={16} color={colors.brand} />
            </View>
            <Text style={styles.trustTitle} numberOfLines={2}>{tip.title}</Text>
          </View>
        ))}
      </View>

      {heroItems.length > 0 ? <MediaCarousel items={heroItems} onPressItem={onPressItem} /> : null}

      {categories.length > 0 ? (
        <View style={styles.categoryStrip}>
          <View style={styles.storefrontSectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.storefrontTitle}>Shop by category</Text>
              <Text style={styles.storefrontSubtitle}>Start with what you need</Text>
            </View>
            <Pressable onPress={onOpenFilters} hitSlop={8} style={styles.seeAll} accessibilityRole="button">
              <Ionicons name="options-outline" size={14} color={colors.brand} />
              <Text style={styles.storefrontLink}>Filters</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
            {categories.map((cat) => (
              <CategoryTile key={cat.key} cat={cat} onPress={() => onSelectCategory(cat.key)} styles={styles} colors={colors} />
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
          saved={saved}
          onPressItem={onPressItem}
          onNotify={onNotify}
          onToggleSave={onToggleSave}
          onViewAll={onViewAll}
          viewerId={viewerId}
          onManageListing={onManageListing}
        />
      ))}

      {canLoadMore ? (
        <Pressable onPress={onLoadMore} style={styles.loadMoreButton} disabled={loadingMore} accessibilityRole="button">
          {loadingMore ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="add-circle-outline" size={16} color={colors.brand} />}
          <Text style={styles.loadMoreText}>{loadingMore ? 'Loading more…' : 'Show more listings'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyListings({ kind, onReset, onRetry, onSell, styles, colors }) {
  const config = {
    error: {
      title: "Couldn't load listings",
      text: 'Check your connection, then try again.',
      label: 'Try again',
      action: onRetry,
    },
    filtered: {
      title: 'Nothing matches yet',
      text: 'Try a shorter search, a wider price range, or a different category.',
      label: 'Clear filters',
      action: onReset,
    },
    empty: {
      title: 'No listings yet',
      text: 'Got something you no longer need? Be the first to list it.',
      label: 'Sell an item',
      action: onSell,
    },
  }[kind];

  return (
    <View style={styles.emptyCard}>
      <EmptyArt kind={kind} color={colors.brand} />
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
  const { profile, user } = useAuth();
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
  const [saved, setSaved] = useState({}); // session-only wishlist; persist later if you want

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

  const styles = useThemeStyles((c, s, r) => {
    const lift = {
      shadowColor: c.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    };
    return {
      screen: { flex: 1 },
      topBarRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginBottom: s.sm },
      searchWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: s.xs, backgroundColor: c.card,
        borderRadius: r.full, borderWidth: 1, borderColor: c.borderDefault, paddingHorizontal: s.md, height: 46, ...lift,
      },
      searchWrapFocused: { borderColor: c.brand, borderWidth: 1.5 },
      searchInput: { flex: 1, fontSize: 14, color: c.textPrimary, paddingVertical: 0 },
      iconButton: {
        width: 46, height: 46, borderRadius: r.full, backgroundColor: c.card, borderWidth: 1,
        borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center', ...lift,
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

      quickChipsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: s.sm, paddingRight: s.md },
      quickChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: r.full,
        backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault,
      },
      quickChipActive: { backgroundColor: c.brand, borderColor: c.brand },
      quickChipText: { fontSize: 12.5, fontWeight: '700', color: c.textPrimary },
      quickChipTextActive: { color: c.onBrand },

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
      feedTitle: { fontSize: 17, fontWeight: '900', color: c.textPrimary },
      feedSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
      feedMeta: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
      viewToggle: { flexDirection: 'row', backgroundColor: c.card, borderRadius: r.full, borderWidth: 1, borderColor: c.borderDefault, padding: 2 },
      viewToggleBtn: { width: 32, height: 28, borderRadius: r.full, alignItems: 'center', justifyContent: 'center' },
      viewToggleBtnActive: { backgroundColor: c.brand },
      backLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
      backLinkText: { fontSize: 12.5, fontWeight: '800', color: c.brand },
      reloadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
      reloadingText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },

      heroCard: { borderRadius: r['2xl'], marginBottom: s.md, overflow: 'hidden', backgroundColor: c.brand, minHeight: 196 },
      heroBody: { padding: s.lg, paddingRight: 120, justifyContent: 'center', flex: 1 },
      heroGreeting: { color: '#FFFFFFD9', fontSize: 12.5, fontWeight: '700', marginBottom: 6 },
      heroTitle: { color: '#fff', fontSize: 22, lineHeight: 27, fontWeight: '900' },
      heroText: { color: '#FFFFFFD0', fontSize: 12.5, lineHeight: 18, marginTop: 6 },
      heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm, marginTop: s.md },
      heroButton: { borderRadius: r.full, paddingHorizontal: s.md, height: 38, justifyContent: 'center', backgroundColor: '#fff' },
      heroButtonText: { color: '#0B3D33', fontSize: 12.5, fontWeight: '900' },
      heroButtonGhost: {
        flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: r.full, paddingHorizontal: s.md, height: 38,
        borderWidth: 1.5, borderColor: '#FFFFFFB3',
      },
      heroButtonGhostText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },

      trustStrip: {
        flexDirection: 'row', gap: 8, marginBottom: s.lg, backgroundColor: c.card, borderRadius: r.xl,
        borderWidth: 1, borderColor: c.borderDefault, padding: s.sm,
      },
      trustItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
      trustIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
      trustTitle: { flex: 1, fontSize: 10.5, lineHeight: 13, fontWeight: '800', color: c.textPrimary },

      categoryStrip: { marginBottom: s.xl },
      categoryTile: { width: 118, height: 132, borderRadius: r.xl, overflow: 'hidden', backgroundColor: c.brandLight, justifyContent: 'flex-end' },
      categoryScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,20,16,0.42)' },
      categoryIcon: {
        position: 'absolute', top: 8, left: 8, width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#FFFFFFF2', alignItems: 'center', justifyContent: 'center',
      },
      categoryText: { padding: 10 },
      categoryName: { color: '#fff', fontSize: 13, fontWeight: '900' },
      categoryCount: { color: '#FFFFFFD0', fontSize: 11, fontWeight: '600', marginTop: 1 },

      storefrontSection: { marginBottom: s.xl },
      storefrontSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.sm + 2 },
      storefrontTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '900' },
      storefrontSubtitle: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
      storefrontLink: { color: c.brand, fontSize: 12.5, fontWeight: '800' },
      seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
      railContent: { gap: s.sm + 2, paddingRight: s.md },
      gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm + 2 },
      listingGridRow: { flexDirection: 'row', justifyContent: 'space-between' },
      loadMoreButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: c.card,
        borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.full, paddingVertical: 12, marginBottom: s.lg,
      },
      loadMoreText: { color: c.brand, fontSize: 13, fontWeight: '900' },
      footerLoader: { paddingVertical: s.lg, alignItems: 'center' },
      footerText: { textAlign: 'center', color: c.textTertiary, fontSize: 12, paddingVertical: s.lg },

      card: { width: '100%', backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, flexDirection: 'column', gap: s.md, padding: s.sm + 2, ...lift },
      railCard: { width: 164, minHeight: 262, flexDirection: 'column', gap: 8, padding: 8 },
      tileCard: { width: '48.5%', minHeight: 256, flexDirection: 'column', gap: 8, padding: 8 },
      cellCard: { width: '48.5%', minWidth: 0, minHeight: 256, flexDirection: 'column', gap: 8, padding: 8 },
      cardPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
      media: { width: 118, alignSelf: 'stretch', minHeight: 118, borderRadius: r.xl, overflow: 'hidden', backgroundColor: c.brandLight },
      listingMedia: { width: '100%', height: 184, minHeight: 184, alignSelf: 'auto' },
      compactMedia: { width: '100%', height: 136, minHeight: 136, alignSelf: 'auto' },
      image: { width: '100%', height: '100%' },
      heartBtn: {
        position: 'absolute', top: 7, right: 7, width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#FFFFFFEB', alignItems: 'center', justifyContent: 'center',
      },
      sponsoredFlag: {
        position: 'absolute', top: 7, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7,
        paddingVertical: 3, borderRadius: r.full, backgroundColor: c.warningLight || '#FEF3C7',
      },
      sponsoredText: { color: c.warning || '#B45309', fontSize: 9, fontWeight: '900' },
      newFlag: { position: 'absolute', top: 7, left: 7, paddingHorizontal: 8, paddingVertical: 3, borderRadius: r.full, backgroundColor: c.brand },
      newFlagText: { color: c.onBrand, fontSize: 9.5, fontWeight: '900' },
      content: { minWidth: 0, gap: s.md },
      compactContent: { minHeight: 96 },
      price: { fontSize: 18, fontWeight: '900', color: c.textPrimary },
      compactPrice: { fontSize: 15 },
      title: { fontSize: 13.5, lineHeight: 18, fontWeight: '600', color: c.textPrimary, marginTop: 2 },
      compactTitle: { fontSize: 12.5, lineHeight: 17 },
      badgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 6 },
      badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: r.full, backgroundColor: c.canvasLight, flexDirection: 'row', alignItems: 'center', gap: 2 },
      badgeVerified: { backgroundColor: c.greenLight },
      badgeText: { fontSize: 10, fontWeight: '700', color: c.textSecondary },
      sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
      avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
      avatarText: { fontSize: 11, fontWeight: '900', color: c.brandText },
      sellerLine: { color: c.textPrimary, fontSize: 11.5, fontWeight: '700' },
      ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
      ratingText: { color: c.textSecondary, fontSize: 10.5, fontWeight: '600' },
      contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
      whatsappButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1FA855', borderRadius: r.full, height: 36 },
      callButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight, borderRadius: 18, borderWidth: 1, borderColor: c.brandBorder },
      manageListingButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: r.full, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
      manageListingText: { color: c.brandText, fontSize: 12, fontWeight: '800' },
      callText: { color: '#fff', fontSize: 12, fontWeight: '800' },

      skeletonCard: { flexDirection: 'row', gap: s.md, padding: s.md, backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault },
      skeletonMedia: { width: 104, height: 104, borderRadius: r.lg, backgroundColor: c.skeleton },
      skeletonLine: { height: 12, borderRadius: 6, backgroundColor: c.skeleton },

      emptyCard: { backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s['2xl'], alignItems: 'center', justifyContent: 'center', marginTop: s.md },
      emptyTitle: { fontSize: 17, fontWeight: '900', color: c.textPrimary, textAlign: 'center', marginTop: s.sm, marginBottom: 4 },
      emptyDescription: { fontSize: 13, lineHeight: 19, color: c.textSecondary, textAlign: 'center', marginBottom: s.lg },
      emptyButton: { backgroundColor: c.brand, borderRadius: r.full, paddingHorizontal: s.xl, height: 42, justifyContent: 'center' },
      emptyButtonText: { color: c.onBrand, fontSize: 13.5, fontWeight: '800' },

      sellFab: {
        position: 'absolute', right: 4, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.brand,
        borderRadius: 28, height: 52, paddingLeft: 16, paddingRight: 20, shadowColor: c.shadow || '#000',
        shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 7,
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
      sheetLabel: { fontSize: 13, fontWeight: '800', color: c.textPrimary, marginBottom: s.xs + 2, marginTop: s.lg },
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
      sheetCancel: { flex: 1, height: 48, justifyContent: 'center', borderRadius: r.full, alignItems: 'center', backgroundColor: c.canvasLight, borderWidth: 1, borderColor: c.borderDefault },
      sheetCancelText: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
      sheetApply: { flex: 2, height: 48, justifyContent: 'center', borderRadius: r.full, alignItems: 'center', backgroundColor: c.brand },
      sheetApplyText: { fontSize: 14, fontWeight: '900', color: c.onBrand },
    };
  });

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

  const toggleSave = useCallback(
    (id) => {
      setSaved((prev) => {
        const next = { ...prev };
        if (next[id]) delete next[id];
        else next[id] = true;
        return next;
      });
    },
    []
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
        subtitle: `${cat.count} ${cat.count === 1 ? 'listing' : 'listings'} on campus`,
        items: seededOrder(
          filteredItems.filter((item) => (item?.category || '').trim().toLowerCase() === cat.key.toLowerCase()),
          seed
        ).slice(0, 8),
        action: { type: 'category', value: cat.key },
      }))
      .filter((section) => section.items.length >= 2)
      .slice(0, 3);

    return [
      { key: 'sponsored', title: 'Featured', subtitle: 'Promoted by sellers', items: sponsored.slice(0, 8) },
      { key: 'fresh', title: 'Just listed', subtitle: 'Posted by students in the last few days', items: newest.slice(0, 8), action: { type: 'all' } },
      { key: 'deals', title: `Under ${NGN}20k`, subtitle: 'Easy on the pocket', items: affordable.slice(0, 8), action: { type: 'budget' } },
      { key: 'trusted', title: 'From verified sellers', subtitle: 'Confirmed by UniHelp', items: verified.slice(0, 8) },
      ...categoryShelves,
      { key: 'random', title: 'You might like', subtitle: 'A fresh mix every visit', items: picks.slice(0, 12), layout: 'grid' },
    ].filter((section) => section.items.length > 0);
  }, [categorySummaries, filteredItems]);

  /* -------------------------------- Actions ------------------------------- */

  const goToListing = useCallback(
    (item) => router.navigate({ pathname: '/view/[type]/[id]', params: { type: 'listing', id: item.id } }),
    [router]
  );

  const goToSell = useCallback(() => router.navigate('/upload?type=marketplace'), [router]);
  const goToManageListings = useCallback(() => router.navigate('/manage/listings'), [router]);

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

  // Category lives in the quick-chip row, so only price and sort appear here.
  const activeChips = [];
  if (priceRange !== 'all') activeChips.push({ key: 'price', label: range.label, icon: 'wallet-outline', clear: () => { setPriceRange('all'); setCustomMin(''); setCustomMax(''); } });
  if (sort !== 'newest') activeChips.push({ key: 'sort', label: SORT_OPTIONS.find((o) => o.key === sort)?.label || sort, icon: 'swap-vertical-outline', clear: () => setSort('newest') });

  const renderTopBar = () => (
    <View>
      <View style={styles.topBarRow}>
        <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
          <Ionicons name="search" size={17} color={searchFocused ? colors.brand : colors.greyLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search textbooks, phones, chairs…"
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
              <Ionicons name="close-circle" size={17} color={colors.greyLight} />
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

      {isFeedMode && knownCategories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsRow} keyboardShouldPersistTaps="handled">
          {['all', ...knownCategories].map((cat) => {
            const active = category.toLowerCase() === cat.toLowerCase();
            return (
              <Pressable
                key={cat}
                style={[styles.quickChip, active && styles.quickChipActive]}
                onPress={() => setCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                {cat !== 'all' ? <Ionicons name={getCategoryIcon(cat)} size={14} color={active ? colors.onBrand : colors.textSecondary} /> : null}
                <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{cat === 'all' ? 'All' : cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
          <View style={styles.feedHeaderRow}>
            <Pressable style={styles.backLink} onPress={clearFilters} accessibilityRole="button" accessibilityLabel="Back to discover">
              <Ionicons name="chevron-back" size={16} color={colors.brand} />
              <Text style={styles.backLinkText}>Discover</Text>
            </Pressable>
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
          <View>
            <Text style={styles.feedTitle}>
              {debouncedSearch ? `Results for “${debouncedSearch}”` : hasActiveFilters ? 'Filtered items' : 'All listings'}
            </Text>
            <Text style={styles.feedSub}>
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}{hasMore ? ' so far' : ''}
            </Text>
          </View>
          {reloading ? (
            <View style={styles.reloadingRow}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={styles.reloadingText}>Updating results…</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <MarketplaceHome
          greeting={greetingFor()}
          name={firstNameOf(profile)}
          total={items.length}
          heroItems={filteredItems.slice(0, 5)}
          categories={categorySummaries}
          sections={marketplaceSections}
          styles={styles}
          colors={colors}
          saved={saved}
          onPressItem={goToListing}
          onNotify={showToast}
          onToggleSave={toggleSave}
          onSell={goToSell}
          viewerId={profile?.uid || user?.uid}
          onManageListing={goToManageListings}
          onSelectCategory={(next) => { setCategory(next); setBrowseAll(true); }}
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
      onToggleSave={toggleSave}
      viewerId={profile?.uid || user?.uid}
      onManageListing={goToManageListings}
      isSaved={!!saved[item.id]}
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
    if (!hasMore && filteredItems.length > 8) return <Text style={styles.footerText}>You've seen everything for now</Text>;
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
          columnWrapperStyle={gridMode ? styles.listingGridRow : undefined}
          ListHeaderComponent={renderHeader()}
          contentContainerStyle={{ gap: 12, paddingBottom: 96 }}
          style={{ flex: 1, opacity: reloading ? 0.6 : 1 }}
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
          <Ionicons name="add-circle" size={24} color={colors.onBrand} />
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
