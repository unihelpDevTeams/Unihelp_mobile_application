import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenShell from '../../../src/shared/components/ScreenShell';
import { deleteNote, deleteQuestion, fetchDetailRecord, fetchMarketplaceListingsPage, fetchMarketplaceReviews, submitMarketplaceReview } from '../../../services/firestoreSync';
import { COLLECTIONS } from '../../../src/shared/firestoreSchema';
import { resolveDocumentAsset, formatDocumentMeta } from '../../../src/shared/utils/documentMedia';
import { isPreviewImageUrl } from '../../../src/shared/services/cloudinary';
import { useAuth } from '../../../context/AuthContext';
import { startConversation, sendDirectMessage } from '../../../src/shared/services/community';
import { getUserProfileById, sendFriendRequest } from '../../../src/shared/services/friendships';
import { useTheme } from '../../../src/shared/theme/ThemeContext';
import { canManageResource } from '../../../src/shared/auth/resourcePermissions';
import { getDownloadRecord, saveResourceForOffline } from '../../../src/shared/offline/offlineLearningService';
import { getApiUrl } from '../../../src/shared/services/backend';
import FriendRequestModal from '../../../src/shared/components/FriendRequestModal';
import { isPremiumActive } from '../../../src/shared/services/premium';
import {
  fetchMarketplaceSponsorshipPlans,
  formatSponsorshipPrice,
  startMarketplaceSponsorshipCheckout,
} from '../../../src/shared/services/marketplaceSponsorship';
import PastQuestionDocumentReader from '../../../src/shared/components/PastQuestionDocumentReader';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const SCREEN_PADDING = 18;
const GALLERY_HEIGHT = 300;
const DESCRIPTION_PREVIEW_LENGTH = 240;
const REVIEW_MAX_LENGTH = 500;
const REVIEWS_COLLAPSED_COUNT = 3;
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

const collectionMap = {
  announcement: COLLECTIONS.announcements,
  note: COLLECTIONS.notes,
  question: COLLECTIONS.questions,
  group: COLLECTIONS.groups,
  story: COLLECTIONS.stories,
  hostel: COLLECTIONS.hostels,
  listing: COLLECTIONS.studentMarketplace,
  tutorial: COLLECTIONS.tutorials,
  studyMaterial: COLLECTIONS.studyMaterials,
  formula: COLLECTIONS.formulas,
};

const TYPE_META = {
  announcement: { label: 'Announcement', icon: 'megaphone' },
  note: { label: 'Note', icon: 'document-text' },
  question: { label: 'Past question', icon: 'help-circle' },
  group: { label: 'Group', icon: 'people' },
  story: { label: 'Story', icon: 'book' },
  hostel: { label: 'Hostel', icon: 'home' },
  listing: { label: 'Marketplace', icon: 'pricetag' },
  tutorial: { label: 'Tutorial', icon: 'play-circle' },
  studyMaterial: { label: 'Study material', icon: 'library' },
  formula: { label: 'Formula sheet', icon: 'calculator' },
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch (_error) {
    // No-op on architectures where this is unavailable.
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const toDate = (value) => {
  if (!value) return null;
  const raw = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value?.toDate ? value.toDate() : value;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
};

const timeAgo = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

const formatNaira = (value) => {
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `₦${number.toLocaleString()}`;
};

// wa.me expects digits only, with country code and no leading zero or plus.
const toWhatsAppNumber = (rawPhone) => {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
};

const toTelNumber = (rawPhone) => {
  if (!rawPhone) return '';
  const cleaned = String(rawPhone).replace(/[^\d+]/g, '');
  return cleaned.length >= 7 ? cleaned : '';
};

// expo-router can return string | string[] for a param depending on navigation.
const normalizeParam = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeResourceType = (value) => {
  const rawType = String(normalizeParam(value) || '').trim();
  const aliases = {
    notes: 'note',
    pastQuestion: 'question',
    pastQuestions: 'question',
    questions: 'question',
    studyMaterials: 'studyMaterial',
    studies: 'studyMaterial',
    marketplace: 'listing',
    listings: 'listing',
    hostels: 'hostel',
  };
  return aliases[rawType] || rawType;
};

const animateLayout = () => {
  try {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
  } catch (_error) {
    // Layout animation is a nicety, never a requirement.
  }
};

const buildFields = (item, type) => {
  if (!item) return [];
  const fields = [];
  const seen = new Set();
  const add = (icon, label, value) => {
    if (value === undefined || value === null || value === '' || seen.has(label)) return;
    seen.add(label);
    fields.push({ icon, label, value: String(value) });
  };

  if (['note', 'question', 'studyMaterial'].includes(type)) {
    add('book-outline', 'Course', item.course);
    add('barcode-outline', 'Course code', item.courseCode);
    add('school-outline', 'School', item.school);
    add('layers-outline', 'Department', item.department || item.dept);
    add('ribbon-outline', 'Level', item.level);
    add('clipboard-outline', 'Exam type', item.examType);
    add('time-outline', 'Semester/session', item.semester || item.session);
    add('person-outline', 'Lecturer', item.lecturer);
    add('calendar-outline', 'Year', item.year ? String(item.year) : undefined);
  }
  if (type === 'group') {
    add('pricetag-outline', 'Category', item.category);
    add('lock-closed-outline', 'Privacy', item.privacy === 'private' ? 'Private' : 'Public');
    add('people-outline', 'Members', item.memberCount ? `${item.memberCount} members` : undefined);
  }
  if (type === 'story') {
    add('bookmark-outline', 'Genre', item.genre);
    add('person-outline', 'Author', item.authorName || item.author);
  }
  if (type === 'hostel') {
    add('location-outline', 'Location', item.location || item.address);
    add('bed-outline', 'Room type', item.roomType || item.type);
    add('walk-outline', 'Distance', item.distance);
    add('grid-outline', 'Amenities', Array.isArray(item.amenities) ? item.amenities.join(', ') : item.amenities);
    add('checkmark-circle-outline', 'Availability', item.availability);
    add('call-outline', 'Phone', item.phone || item.contactPhone);
  }
  if (type === 'listing') {
    add('pricetag-outline', 'Category', item.category);
    add('shield-checkmark-outline', 'Condition', item.condition);
    add('person-outline', 'Seller', item.sellerName || item.ownerName);
    add('location-outline', 'Pickup location', item.location);
    add('checkmark-circle-outline', 'Availability', item.availability);
    add('call-outline', 'Phone', item.phone || item.contactPhone);
  }
  if (type === 'tutorial') {
    add('person-outline', 'Instructor', item.instructor || item.tutorName);
    add('time-outline', 'Duration', item.duration);
    add('bar-chart-outline', 'Level', item.level);
  }
  if (type === 'formula') {
    add('book-outline', 'Subject', item.subject);
  }
  if (type === 'announcement') {
    add('megaphone-outline', 'Audience', item.audience);
    add('person-outline', 'Posted by', item.postedBy || item.authorName);
    add('alert-circle-outline', 'Priority', item.urgent ? 'Urgent' : undefined);
  }

  const dateValue = formatDate(item.createdAt || item.postedAt || item.publishedAt);
  add('time-outline', type === 'announcement' ? 'Posted' : 'Added', dateValue);
  return fields;
};

const collectMedia = (item) => {
  if (!item) return [];
  const candidates = [];
  const push = (value) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    if (typeof value === 'string' && value.trim()) {
      candidates.push(value.trim());
      return;
    }
    if (typeof value === 'object') {
      const nested = [value.url, value.secure_url, value.previewUrl, value.fileUrl, value.downloadUrl].find(
        (entry) => typeof entry === 'string' && entry.trim(),
      );
      if (nested) candidates.push(nested.trim());
    }
  };
  [
    item.images, item.imageAssets, item.files, item.coverUrl, item.avatarUrl,
    item.thumbnailUrl, item.previewUrl, item.imageUrl, item.image, item.photoUrl, item.photo,
  ].forEach(push);
  return [...new Set(candidates.filter(Boolean))];
};

/* -------------------------------------------------------------------------- */
/*  Shared hooks and small components                                         */
/* -------------------------------------------------------------------------- */

const useStyles = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return { colors, styles };
};

function Avatar({ uri, name, size = 44, radius }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? size / 2,
        backgroundColor: colors.brandLight,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="disk" />
      ) : (
        <Text style={{ color: colors.brandDark, fontSize: size * 0.38, fontWeight: '800' }}>
          {String(name || 'U').charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function Stars({ value, size = 13 }) {
  const { colors } = useTheme();
  const rounded = Math.round(Number(value) || 0);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons key={star} name={star <= rounded ? 'star' : 'star-outline'} size={size} color={colors.warning} />
      ))}
    </View>
  );
}

function BottomSheet({ visible, onClose, children }) {
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return undefined;
    }
    Animated.timing(progress, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setMounted(false);
      },
    );
    return undefined;
  }, [visible, progress]);

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.sheetBackdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <View style={styles.sheetAnchor} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) }],
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

function SectionCard({ title, children, style }) {
  const { styles } = useStyles();
  return (
    <View style={[styles.sectionCard, style]}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

function LoadingSkeleton() {
  const { styles } = useStyles();
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const bar = (extra) => <Animated.View style={[styles.skeletonBlock, { opacity: pulse }, extra]} />;
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonRow}>
        {bar({ width: 110, height: 24, borderRadius: 999 })}
        {bar({ width: 34, height: 34, borderRadius: 12 })}
      </View>
      {bar({ width: '100%', height: 240, borderRadius: 24, marginBottom: 18 })}
      {bar({ width: '72%', height: 18, marginBottom: 10 })}
      {bar({ width: '44%', height: 14, marginBottom: 18 })}
      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3].map((key) => (
          <View key={key} style={{ width: '48%' }}>
            {bar({ width: '100%', height: 66, borderRadius: 16 })}
          </View>
        ))}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Gallery and lightbox                                                      */
/* -------------------------------------------------------------------------- */

function Gallery({ items, onOpen, sponsored, verified }) {
  const { colors, styles } = useStyles();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  const onScroll = (event) => {
    if (!width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next >= 0 && next < items.length) setIndex((current) => (current === next ? current : next));
  };

  return (
    <View style={styles.galleryCard} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {items.map((url, i) => (
            <Pressable
              key={`${url}-${i}`}
              style={{ width, height: GALLERY_HEIGHT }}
              onPress={() => onOpen(i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${i + 1} of ${items.length}, tap to view full screen`}
            >
              <Image source={{ uri: url }} style={styles.galleryImage} contentFit="cover" cachePolicy="disk" transition={250} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={{ height: GALLERY_HEIGHT }} />
      )}

      <View style={styles.galleryBadges} pointerEvents="none">
        {sponsored ? (
          <View style={[styles.overlayPill, { backgroundColor: colors.warningLight || colors.brandLight }]}>
            <Ionicons name="megaphone" size={11} color={colors.warning} />
            <Text style={[styles.overlayPillText, { color: colors.warning }]}>Sponsored</Text>
          </View>
        ) : null}
        {verified ? (
          <View style={[styles.overlayPill, { backgroundColor: colors.greenLight }]}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={[styles.overlayPillText, { color: colors.success }]}>Verified</Text>
          </View>
        ) : null}
      </View>

      {items.length > 1 ? (
        <>
          <View style={styles.galleryCounter} pointerEvents="none">
            <Ionicons name="images-outline" size={12} color="#FFFFFF" />
            <Text style={styles.galleryCounterText}>{index + 1}/{items.length}</Text>
          </View>
          <View style={styles.galleryDots}>
            {items.map((_, i) => (
              <Pressable
                key={i}
                hitSlop={8}
                onPress={() => {
                  ref.current?.scrollTo({ x: i * width, animated: true });
                  setIndex(i);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Go to photo ${i + 1}`}
              >
                <View style={[styles.galleryDot, i === index && styles.galleryDotActive]} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function Lightbox({ visible, items, startIndex, onClose }) {
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ref = useRef(null);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);

  const jumpToStart = useCallback(() => {
    ref.current?.scrollTo({ x: startIndex * width, animated: false });
  }, [startIndex, width]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.lightbox}>
        <View style={[styles.lightboxTopBar, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
          <Text style={styles.lightboxCounterText}>{items.length > 1 ? `${index + 1} of ${items.length}` : ''}</Text>
          <Pressable
            style={styles.lightboxClose}
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close full screen photo"
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={jumpToStart}
          onMomentumScrollEnd={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / width);
            if (next >= 0 && next < items.length) setIndex(next);
          }}
        >
          {items.map((url, i) => (
            <View key={`${url}-${i}`} style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={{ uri: url }} style={{ width, height: '100%' }} contentFit="contain" transition={200} />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Contact + sponsorship sheets                                              */
/* -------------------------------------------------------------------------- */

function ContactOption({ icon, tint, tintBg, title, hint, onPress, busy, disabled }) {
  const { styles } = useStyles();
  return (
    <Pressable
      style={({ pressed }) => [styles.sheetOption, pressed && styles.pressedSubtle]}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.sheetOptionIcon, { backgroundColor: tintBg }]}>
        {busy ? <ActivityIndicator size="small" color={tint} /> : <Ionicons name={icon} size={19} color={tint} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sheetOptionTitle}>{title}</Text>
        <Text style={styles.sheetOptionHint} numberOfLines={1}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={styles.chevron.color} />
    </Pressable>
  );
}

function ContactSheet({ visible, onClose, label, title, kind, canApp, canWhatsApp, canCall, phone, busy, onApp, onWhatsApp, onCall }) {
  const { colors, styles } = useStyles();
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>{label}</Text>
      <Text style={styles.sheetSubtitle} numberOfLines={1}>About: {title}</Text>
      {canApp ? (
        <ContactOption
          icon="chatbubble-ellipses"
          tint={colors.brand}
          tintBg={colors.brandLight}
          title="Message on UniHelp"
          hint={`Sends a message about this ${kind}`}
          onPress={onApp}
          busy={busy}
        />
      ) : null}
      {canWhatsApp ? (
        <ContactOption
          icon="logo-whatsapp"
          tint={colors.success}
          tintBg={colors.greenLight}
          title="WhatsApp"
          hint={phone ? `Opens a chat with ${phone}` : 'Opens WhatsApp'}
          onPress={onWhatsApp}
        />
      ) : null}
      {canCall ? (
        <ContactOption
          icon="call"
          tint={colors.brandDark}
          tintBg={colors.surfaceSecondary}
          title="Call"
          hint={phone}
          onPress={onCall}
        />
      ) : null}
      <Pressable style={({ pressed }) => [styles.sheetCancel, pressed && styles.pressedSubtle]} onPress={onClose} accessibilityRole="button">
        <Text style={styles.sheetCancelText}>Cancel</Text>
      </Pressable>
    </BottomSheet>
  );
}

function SponsorSheet({ visible, onClose, plans, loading, selectedId, onSelect, processing, onPay, active, until }) {
  const { colors, styles } = useStyles();
  const disabled = processing || loading || !selectedId;
  return (
    <BottomSheet visible={visible} onClose={processing ? () => {} : onClose}>
      <View style={styles.sponsorHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetTitle}>{active ? 'Extend promotion' : 'Promote listing'}</Text>
          <Text style={styles.sheetSubtitleMultiline}>
            {active && until
              ? `Currently sponsored until ${formatDate(until)}.`
              : 'Appear in the sponsored section of Marketplace. Plans activate after payment is verified.'}
          </Text>
        </View>
        <Pressable onPress={onClose} disabled={processing} style={styles.sheetCloseButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerPad}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.mutedText}>Loading plans...</Text>
        </View>
      ) : plans.length ? (
        <View style={{ gap: 10 }}>
          {plans.map((plan) => {
            const selected = selectedId === plan.id;
            return (
              <Pressable
                key={plan.id}
                onPress={() => onSelect(plan.id)}
                style={[styles.planCard, selected && styles.planCardSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.brand : colors.textTertiary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{plan.label}</Text>
                  <Text style={styles.planHint}>{plan.durationDays} days of sponsored placement</Text>
                </View>
                <Text style={styles.planPrice}>{formatSponsorshipPrice(plan)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.mutedText, { paddingVertical: 16 }]}>No promotion plans are available right now. Please try again later.</Text>
      )}

      <Pressable
        onPress={onPay}
        disabled={disabled}
        style={({ pressed }) => [styles.primaryCta, disabled && styles.disabledButton, pressed && !disabled && styles.pressedBrand]}
        accessibilityRole="button"
      >
        {processing ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="card-outline" size={17} color={colors.onBrand} />}
        <Text style={styles.primaryCtaText}>{processing ? 'Verifying payment...' : 'Continue to payment'}</Text>
      </Pressable>
    </BottomSheet>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reviews                                                                   */
/* -------------------------------------------------------------------------- */

function ReviewsSection({
  item, reviews, loading, canReview, formOpen, onToggleForm, rating, onRate, comment, onComment, saving, onSubmit,
}) {
  const { colors, styles } = useStyles();
  const [showAll, setShowAll] = useState(false);
  const count = Number(item?.reviewCount || 0);
  const average = Number(item?.ratingAverage || 0);
  const visible = showAll ? reviews : reviews.slice(0, REVIEWS_COLLAPSED_COUNT);

  return (
    <SectionCard>
      <View style={styles.reviewsHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitleInline}>Reviews</Text>
          {count > 0 ? (
            <View style={styles.ratingSummaryRow}>
              <Text style={styles.ratingBig}>{average.toFixed(1)}</Text>
              <View style={{ gap: 3 }}>
                <Stars value={average} size={14} />
                <Text style={styles.mutedTextSmall}>{count} {count === 1 ? 'review' : 'reviews'}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.mutedTextSmall}>No reviews yet</Text>
          )}
        </View>
        {canReview ? (
          <Pressable
            onPress={onToggleForm}
            style={({ pressed }) => [styles.softButton, pressed && styles.pressedSubtle]}
            accessibilityRole="button"
            accessibilityLabel={formOpen ? 'Close review form' : 'Write a review'}
          >
            <Ionicons name={formOpen ? 'close' : 'create-outline'} size={15} color={colors.brandDark} />
            <Text style={styles.softButtonText}>{formOpen ? 'Cancel' : 'Write a review'}</Text>
          </Pressable>
        ) : null}
      </View>

      {formOpen && canReview ? (
        <View style={styles.reviewForm}>
          <View style={styles.reviewPickerRow}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => onRate(star)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}>
                  <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={30} color={colors.warning} />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingLabel}>{RATING_LABELS[rating] || 'Tap to rate'}</Text>
          </View>
          <TextInput
            value={comment}
            onChangeText={(text) => onComment(text.slice(0, REVIEW_MAX_LENGTH))}
            style={styles.reviewInput}
            multiline
            placeholder="What was your experience with this seller or item?"
            placeholderTextColor={colors.textTertiary}
          />
          <View style={styles.reviewFormFooter}>
            <Text style={styles.mutedTextSmall}>{comment.length}/{REVIEW_MAX_LENGTH}</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryCtaCompact, saving && styles.disabledButton, pressed && !saving && styles.pressedBrand]}
              onPress={onSubmit}
              disabled={saving}
              accessibilityRole="button"
            >
              {saving ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="send" size={14} color={colors.onBrand} />}
              <Text style={styles.primaryCtaText}>{saving ? 'Submitting...' : 'Submit review'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator size="small" color={colors.brand} />
          <Text style={styles.mutedTextSmall}>Loading reviews...</Text>
        </View>
      ) : visible.length ? (
        <View style={{ gap: 10 }}>
          {visible.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewTopRow}>
                <Avatar uri={review.reviewerAvatar} name={review.reviewerName} size={34} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.reviewName} numberOfLines={1}>{review.reviewerName || 'UniHelp student'}</Text>
                  <View style={styles.reviewMetaRow}>
                    <Stars value={review.rating} size={11} />
                    <Text style={styles.reviewDate}>{timeAgo(review.createdAt)}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.reviewText}>{review.comment}</Text>
            </View>
          ))}
          {reviews.length > REVIEWS_COLLAPSED_COUNT ? (
            <Pressable
              onPress={() => {
                animateLayout();
                setShowAll((value) => !value);
              }}
              hitSlop={6}
              style={styles.linkRow}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>{showAll ? 'Show fewer reviews' : `Show all ${reviews.length} reviews`}</Text>
              <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={14} color={colors.brandDark} />
            </Pressable>
          ) : null}
        </View>
      ) : !formOpen ? (
        <Text style={styles.mutedText}>Bought or contacted this seller? Be the first to share how it went.</Text>
      ) : null}
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Recommendations                                                           */
/* -------------------------------------------------------------------------- */

function MarketplaceRecommendations({ relatedListings, sponsoredListings, loading, onPressItem }) {
  const { colors, styles } = useStyles();

  const imageFor = (listing) => {
    const values = [listing?.imageUrl, listing?.coverUrl, listing?.thumbnailUrl, listing?.images];
    for (const value of values) {
      const candidate = Array.isArray(value) ? value[0] : value;
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
      if (candidate?.url) return candidate.url;
    }
    return '';
  };

  const renderRail = (listings, sponsored) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {listings.map((listing) => {
        const name = listing?.title || listing?.name || 'Untitled item';
        const imageUrl = imageFor(listing);
        return (
          <Pressable
            key={listing.id}
            style={({ pressed }) => [styles.railCard, pressed && styles.pressedBrand]}
            onPress={() => onPressItem(listing)}
            accessibilityRole="button"
            accessibilityLabel={`View ${name}`}
          >
            <View style={styles.railImageWrap}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.railImage} contentFit="cover" cachePolicy="disk" transition={200} />
              ) : (
                <View style={styles.railFallback}>
                  <Text style={styles.railFallbackText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              {sponsored ? (
                <View style={styles.railBadge}>
                  <Text style={styles.railBadgeText}>Sponsored</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.railTitle} numberOfLines={2}>{name}</Text>
            {listing?.price !== undefined && listing?.price !== null && listing?.price !== '' ? (
              <Text style={styles.railPrice}>{formatNaira(listing.price)}</Text>
            ) : null}
            <Text style={styles.railMeta} numberOfLines={1}>{listing?.category || 'Marketplace listing'}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  if (loading && !relatedListings.length && !sponsoredListings.length) {
    return (
      <View style={styles.railSection}>
        <ActivityIndicator size="small" color={colors.brand} />
      </View>
    );
  }

  return (
    <>
      {relatedListings.length ? (
        <View style={styles.railSection}>
          <Text style={styles.railHeading}>More in this category</Text>
          {renderRail(relatedListings, false)}
        </View>
      ) : null}
      {sponsoredListings.length ? (
        <View style={styles.railSection}>
          <Text style={styles.railHeading}>Sponsored by student sellers</Text>
          {renderRail(sponsoredListings, true)}
        </View>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  PDF preview                                                               */
/* -------------------------------------------------------------------------- */

function PdfPreviewModal({ visible, uri, loading, error, onClose, onLoaded, onFailed }) {
  const { colors, styles } = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.previewModal}>
        <View style={[styles.previewHeader, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
          <Text style={styles.previewTitle}>Document preview</Text>
          <Pressable onPress={onClose} style={styles.previewClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close preview">
            <Ionicons name="close" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>
          {error ? (
            <View style={styles.previewCenter}>
              <Ionicons name="cloud-offline-outline" size={34} color={colors.textSecondary} />
              <Text style={styles.previewErrorTitle}>We couldn't load this preview</Text>
              <Text style={styles.previewErrorHint}>Check your connection and try again. Premium members can also save eligible resources for offline use.</Text>
            </View>
          ) : uri ? (
            <WebView
              source={{ uri }}
              style={{ flex: 1, backgroundColor: colors.surface }}
              originWhitelist={['file://*']}
              allowFileAccess
              onLoad={onLoaded}
              onError={(event) => onFailed(event?.nativeEvent)}
            />
          ) : (
            <View style={styles.previewCenter}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.mutedText}>Preparing private preview...</Text>
            </View>
          )}
          {loading && !error && uri ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.previewCenter]}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.mutedText}>Opening document...</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.previewFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={({ pressed }) => [styles.primaryCta, pressed && styles.pressedBrand]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close document preview"
          >
            <Text style={styles.primaryCtaText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                    */
/* -------------------------------------------------------------------------- */

export default function RecordViewPage() {
  const params = useLocalSearchParams();
  const type = normalizeResourceType(params.type);
  const id = normalizeParam(params.id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { colors, styles } = useStyles();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewError, setPdfPreviewError] = useState(false);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);

  const [savingOffline, setSavingOffline] = useState(false);
  const [offlineRecord, setOfflineRecord] = useState(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [friendRequestVisible, setFriendRequestVisible] = useState(false);
  const [deletingResource, setDeletingResource] = useState(false);

  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  const [sponsorModalVisible, setSponsorModalVisible] = useState(false);
  const [sponsorPlans, setSponsorPlans] = useState([]);
  const [sponsorPlansLoading, setSponsorPlansLoading] = useState(false);
  const [selectedSponsorPlanId, setSelectedSponsorPlanId] = useState('');
  const [sponsorshipProcessing, setSponsorshipProcessing] = useState(false);

  const [relatedListings, setRelatedListings] = useState([]);
  const [sponsoredListings, setSponsoredListings] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  const [readingProgress, setReadingProgress] = useState(0);
  const [readerMetrics, setReaderMetrics] = useState({ y: 0, height: 0 });

  const previewFileRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /* ----------------------------- derived values ---------------------------- */

  const asset = useMemo(() => resolveDocumentAsset(item || {}), [item]);
  const typeMeta = TYPE_META[type] || { label: 'Details', icon: 'document' };

  const ownerId =
    item?.ownerId || item?.sellerId || item?.userId || item?.postedById ||
    item?.uploadedBy || item?.creatorId || item?.authorId || item?.tutorId || null;
  const isCommerceType = ['listing', 'hostel'].includes(type);
  const isHostel = type === 'hostel';
  const ownerName =
    item?.sellerName || item?.ownerName || item?.postedBy || item?.uploaderName ||
    item?.authorName || item?.username || item?.displayName || item?.userName ||
    ownerProfile?.username || ownerProfile?.fullName || ownerProfile?.name ||
    ownerProfile?.displayName || ownerProfile?.email || item?.sellerEmail || item?.ownerEmail ||
    (isCommerceType ? (isHostel ? 'Hostel uploader' : 'Marketplace uploader') : 'Uploader');
  const ownerEmail = item?.sellerEmail || item?.ownerEmail || ownerProfile?.email || '';
  const ownerPhoto = item?.sellerAvatar || item?.ownerAvatar || item?.sellerPhoto || ownerProfile?.photo || ownerProfile?.photoURL || null;
  const ownerPhone = item?.sellerPhone || item?.contactPhone || item?.phone || null;
  const whatsAppNumber = toWhatsAppNumber(ownerPhone);
  const telNumber = toTelNumber(ownerPhone);

  const isOwner = Boolean(user?.uid && ownerId && ownerId === user.uid);
  const canMessageInApp = Boolean(ownerId && user && !isOwner);
  const canWhatsApp = Boolean(whatsAppNumber) && !isOwner;
  const canCall = Boolean(telNumber) && !isOwner;
  const showContactCta = isCommerceType && (canMessageInApp || canWhatsApp || canCall);
  const canManageCurrentResource = ['note', 'question'].includes(type) && canManageResource({ type, item, user, profile });
  const canPromoteListing = Boolean(type === 'listing' && isOwner);
  const isPremiumUser = isPremiumActive(profile);
  // UX gate only: the offline endpoint stays the authority for entitlement.
  const canSaveOffline = Boolean(asset?.hasDocumentUrl && isPremiumUser && ['note', 'question', 'studyMaterial'].includes(type));

  const title = item?.title || item?.name || 'Untitled';
  const description = item?.description || item?.body || item?.summary || '';
  const descriptionIsLong = description.length > DESCRIPTION_PREVIEW_LENGTH;
  const displayedDescription =
    descriptionIsLong && !descriptionExpanded ? `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}...` : description;

  const createdDate = formatDate(item?.createdAt || item?.postedAt || item?.publishedAt);
  const fields = useMemo(() => buildFields(item, type), [item, type]);
  const displayPrice = item?.price ?? item?.rent;
  const formattedPrice = displayPrice !== undefined && displayPrice !== null && displayPrice !== '' ? formatNaira(displayPrice) : '';
  const primaryLocation = item?.location || item?.address || item?.area || '';
  const contactLabel = `Contact ${isHostel ? 'agent' : 'seller'}`;
  const mediaItems = useMemo(() => collectMedia(item), [item]);

  const hasFileAsset = Boolean(asset?.hasDocumentUrl);
  const pastQuestionContent = Array.isArray(item?.content) ? item.content : [];
  const hasPastQuestionDocument = type === 'question' && pastQuestionContent.length > 0;
  const showDocumentCard = hasFileAsset && !hasPastQuestionDocument;
  const showMediaGallery = !hasFileAsset && mediaItems.length > 0;
  const showStickyFooter = (isCommerceType && (showContactCta || canPromoteListing)) || hasFileAsset;

  const commerceHighlights = useMemo(() => {
    if (!isCommerceType || !item) return [];
    const highlights = [];
    const add = (icon, label, value) => {
      if (value === undefined || value === null || value === '') return;
      highlights.push({ icon, label, value: String(value) });
    };
    const status = item.availability || (item.verified ? 'Verified' : 'Available');
    if (isHostel) {
      add('location-outline', 'Area', primaryLocation);
      add('bed-outline', 'Room', item.roomType || item.type);
      add('walk-outline', 'Distance', item.distance);
      add('checkmark-circle-outline', 'Status', status);
    } else {
      add('pricetag-outline', 'Category', item.category);
      add('shield-checkmark-outline', 'Condition', item.condition);
      add('location-outline', 'Pickup', primaryLocation);
      add('checkmark-circle-outline', 'Status', status);
    }
    return highlights.slice(0, 4);
  }, [isCommerceType, isHostel, item, primaryLocation]);

  /* --------------------------------- loading -------------------------------- */

  const load = useCallback(async () => {
    const collectionName = collectionMap[type];
    if (!collectionName || !id) {
      if (isMounted.current) {
        setLoading(false);
        setLoadError(!collectionName ? 'This type of content isn\'t supported.' : 'This link is missing a record id.');
      }
      return;
    }
    try {
      if (isMounted.current) setLoadError('');
      const record = await fetchDetailRecord(type, id);
      if (isMounted.current) setItem(record);
    } catch (error) {
      if (isMounted.current) setLoadError(error?.message || 'Could not load this record.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    setLoading(true);
    setItem(null);
    setDescriptionExpanded(false);
    setReviewFormOpen(false);
    load();
  }, [load]);

  useEffect(() => {
    if (!ownerId || !isCommerceType) {
      setOwnerProfile(null);
      return undefined;
    }
    let cancelled = false;
    getUserProfileById(ownerId)
      .then((data) => {
        if (!cancelled) setOwnerProfile(data || null);
      })
      .catch(() => {
        if (!cancelled) setOwnerProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, isCommerceType]);

  const loadReviews = useCallback(async () => {
    if (type !== 'listing' || !id) return;
    setReviewsLoading(true);
    try {
      const result = await fetchMarketplaceReviews(id, { page: 1, pageSize: 20 });
      if (isMounted.current) setReviews(result.items || []);
    } catch (_error) {
      if (isMounted.current) setReviews([]);
    } finally {
      if (isMounted.current) setReviewsLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Depends on the category, not the whole record, so a review or promotion
  // refresh doesn't trigger two extra network calls.
  const hasItem = Boolean(item);
  const itemCategory = String(item?.category || '').trim();
  useEffect(() => {
    if (type !== 'listing' || !id || !hasItem) {
      setRelatedListings([]);
      setSponsoredListings([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setRecommendationsLoading(true);
      try {
        const [relatedResult, sponsoredResult] = await Promise.all([
          fetchMarketplaceListingsPage({ pageSize: 12, category: itemCategory, sort: 'newest' }),
          fetchMarketplaceListingsPage({ pageSize: 12, sort: 'newest', sponsored: 'active' }),
        ]);
        if (cancelled) return;
        const notCurrent = (listing) => listing?.id && listing.id !== id;
        const related = (relatedResult.items || []).filter(notCurrent).slice(0, 8);
        const relatedIds = new Set(related.map((listing) => listing.id));
        const sponsored = (sponsoredResult.items || [])
          .filter((listing) => notCurrent(listing) && !relatedIds.has(listing.id) && listing?.isSponsored === true && listing?.sponsoredStatus === 'active')
          .slice(0, 8);
        setRelatedListings(related);
        setSponsoredListings(sponsored);
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to load marketplace recommendations:', error?.message || error);
          setRelatedListings([]);
          setSponsoredListings([]);
        }
      } finally {
        if (!cancelled) setRecommendationsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, type, hasItem, itemCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([load(), loadReviews()]);
    if (isMounted.current) setRefreshing(false);
  }, [load, loadReviews]);

  useEffect(() => {
    if (!id || !['note', 'question', 'studyMaterial'].includes(type)) {
      setOfflineRecord(null);
      return undefined;
    }
    let cancelled = false;
    getDownloadRecord(type, id)
      .then((record) => {
        if (!cancelled) setOfflineRecord(record);
      })
      .catch(() => {
        if (!cancelled) setOfflineRecord(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, type]);

  /* ------------------------------- PDF preview ------------------------------ */

  const closePdfPreview = useCallback(() => {
    const previewFile = previewFileRef.current;
    previewFileRef.current = null;
    if (previewFile) FileSystem.deleteAsync(previewFile, { idempotent: true }).catch(() => {});
    setPdfPreviewOpen(false);
    setPdfPreviewUrl('');
    setPdfPreviewLoading(false);
    setPdfPreviewError(false);
  }, []);

  useEffect(() => () => {
    if (previewFileRef.current) {
      FileSystem.deleteAsync(previewFileRef.current, { idempotent: true }).catch(() => {});
    }
  }, []);

  const promptPremium = (message) => {
    Alert.alert('Premium required', message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'View Premium', onPress: () => router.navigate('/premium') },
    ]);
  };

  const openPdfPreview = async () => {
    if (!asset?.hasDocumentUrl || !id || !type) return;
    if (type === 'question' && !isPremiumUser) {
      promptPremium('Viewing past questions requires an active UniHelp Premium subscription.');
      return;
    }
    closePdfPreview();
    setPdfPreviewLoading(true);
    setPdfPreviewOpen(true);
    try {
      const token = await user?.getIdToken?.();
      if (!token) throw new Error('Please sign in to preview this document.');
      const previewUri = `${FileSystem.cacheDirectory}unihelp-preview-${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.pdf`;
      const previewEndpoint = `${getApiUrl()}/api/offline-library/preview/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
      const result = await FileSystem.downloadAsync(previewEndpoint, previewUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!result?.uri || result.status !== 200) {
        await FileSystem.deleteAsync(previewUri, { idempotent: true }).catch(() => {});
        throw new Error(`Preview file was not created (status ${result?.status ?? 'unknown'}).`);
      }
      previewFileRef.current = result.uri;
      if (isMounted.current) setPdfPreviewUrl(result.uri);
    } catch (error) {
      console.error('[PDF preview] failed', { type, id, message: error?.message });
      if (isMounted.current) {
        setPdfPreviewLoading(false);
        setPdfPreviewError(true);
      }
    }
  };

  /* --------------------------------- actions -------------------------------- */

  const saveDocumentOffline = async () => {
    if (!canSaveOffline) {
      if (!isPremiumUser) {
        promptPremium('Offline Library requires an active UniHelp Premium subscription.');
      } else {
        Alert.alert('Save unavailable', 'This resource has no document available for offline saving.');
      }
      return;
    }
    setSavingOffline(true);
    try {
      const saved = await saveResourceForOffline({ resourceType: type, resourceId: id, resource: item, fileName: asset?.fileName });
      setOfflineRecord(saved);
      Alert.alert('Available offline', 'This resource is saved inside UniHelp. Open it any time from your Offline Library.');
    } catch (error) {
      setOfflineRecord((current) => ({ ...(current || {}), status: 'failed', reason: error?.message || 'Save failed' }));
      Alert.alert('Save failed', error?.message || 'We could not save this resource right now.');
    } finally {
      if (isMounted.current) setSavingOffline(false);
    }
  };

  const composeMessageText = () => {
    const lines = [
      formattedPrice && `Price: ${formattedPrice}`,
      item?.category && `Category: ${item.category}`,
      item?.condition && `Condition: ${item.condition}`,
      primaryLocation && `Location: ${primaryLocation}`,
    ].filter(Boolean);
    return `Hi, I'm interested in "${title}". Is it still available?${lines.length ? `\n\n${lines.join('\n')}` : ''}`;
  };

  const messageOwnerInApp = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to message the owner directly.');
      return;
    }
    if (!ownerId || messaging) return;
    setMessaging(true);
    try {
      const conversationId = await startConversation(
        user,
        { id: ownerId, username: ownerName, photo: ownerPhoto, email: ownerEmail },
        profile || {},
      );
      const conversationRef = { id: conversationId, memberIds: [user.uid, ownerId] };
      const attachments = mediaItems[0] ? [{ type: 'image', url: mediaItems[0] }] : [];
      await sendDirectMessage(conversationRef, user, profile || {}, {
        text: composeMessageText(),
        attachments,
        replyTo: null,
      });
      setContactSheetVisible(false);
      router.navigate(`/messages/${conversationId}`);
    } catch (error) {
      if (error?.message === 'Become friends before chatting freely.') {
        setContactSheetVisible(false);
        setFriendRequestVisible(true);
      } else {
        Alert.alert('Could not start chat', error?.message || 'Please try again.');
      }
    } finally {
      if (isMounted.current) setMessaging(false);
    }
  };

  const messageOwnerOnWhatsApp = async () => {
    if (!whatsAppNumber) return;
    try {
      await Linking.openURL(`https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(composeMessageText())}`);
      setContactSheetVisible(false);
    } catch (_error) {
      Alert.alert("Couldn't open WhatsApp", 'Make sure WhatsApp is installed on this device.');
    }
  };

  const callOwner = async () => {
    if (!telNumber) return;
    try {
      await Linking.openURL(`tel:${telNumber}`);
      setContactSheetVisible(false);
    } catch (_error) {
      Alert.alert("Couldn't place the call", 'This device is unable to make phone calls.');
    }
  };

  // The primary contact button goes straight to the only available channel,
  // and only opens the chooser when there is a real choice to make.
  const onContactPress = () => {
    const channels = [canMessageInApp, canWhatsApp, canCall].filter(Boolean).length;
    if (channels > 1) setContactSheetVisible(true);
    else if (canMessageInApp) messageOwnerInApp();
    else if (canWhatsApp) messageOwnerOnWhatsApp();
    else if (canCall) callOwner();
  };

  const shareRecord = async () => {
    try {
      const lines = [title, formattedPrice, description ? description.slice(0, 200) : ''].filter(Boolean);
      await Share.share({ title, message: `${lines.join('\n\n')}\n\nShared from UniHelp` });
    } catch (_error) {
      // Cancelled or unavailable: nothing to surface.
    }
  };

  const deleteCurrentResource = async () => {
    setDeletingResource(true);
    try {
      if (type === 'question') await deleteQuestion(id);
      else await deleteNote(id);
      Alert.alert('Resource deleted', 'The resource and its file have been removed.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert('Delete failed', error?.message || 'Unable to delete this resource.');
    } finally {
      if (isMounted.current) setDeletingResource(false);
    }
  };

  const openResourceActions = () => {
    if (!canManageCurrentResource || deletingResource) return;
    Alert.alert(title || 'Resource actions', 'Choose what you want to do.', [
      { text: 'Edit', onPress: () => router.navigate({ pathname: '/upload', params: { type, editId: id } }) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete this resource?', 'This permanently removes the record and its file. This can\'t be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: deleteCurrentResource },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openOriginalPaper = () => {
    const originalUrl = item?.originalFile?.url || asset?.fileUrl || asset?.directDownloadUrl || '';
    if (!originalUrl) {
      Alert.alert('Original unavailable', 'The original paper is not available for this document.');
      return;
    }
    Linking.openURL(originalUrl).catch(() => {
      Alert.alert('Could not open paper', 'We could not open the original paper on this device.');
    });
  };

  const saveReview = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to review marketplace listings.');
      return;
    }
    if (!reviewRating) {
      Alert.alert('Add a rating', 'Choose a rating from 1 to 5 stars.');
      return;
    }
    if (!reviewComment.trim()) {
      Alert.alert('Add a few words', 'Write a short review to help other students.');
      return;
    }
    setReviewSaving(true);
    try {
      await submitMarketplaceReview(id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
        reviewerName: profile?.username || profile?.fullName || profile?.displayName || user?.displayName || user?.email || 'UniHelp student',
        reviewerAvatar: profile?.photo || profile?.photoURL || user?.photoURL || '',
      });
      setReviewRating(0);
      setReviewComment('');
      setReviewFormOpen(false);
      await Promise.all([loadReviews(), load()]);
      Alert.alert('Review submitted', 'Thanks for helping other students shop with confidence.');
    } catch (error) {
      Alert.alert('Could not save review', error?.message || 'Please try again.');
    } finally {
      if (isMounted.current) setReviewSaving(false);
    }
  };

  const openSponsorModal = async () => {
    if (!canPromoteListing) {
      Alert.alert('Unavailable', 'Only the seller can promote this listing.');
      return;
    }
    setSponsorModalVisible(true);
    if (sponsorPlans.length) return;
    setSponsorPlansLoading(true);
    try {
      const plans = await fetchMarketplaceSponsorshipPlans();
      if (isMounted.current) {
        setSponsorPlans(plans);
        setSelectedSponsorPlanId((current) => current || plans[0]?.id || '');
      }
    } catch (error) {
      Alert.alert('Could not load plans', error?.message || 'Please try again.');
    } finally {
      if (isMounted.current) setSponsorPlansLoading(false);
    }
  };

  const startSponsorshipPayment = async () => {
    if (!selectedSponsorPlanId) {
      Alert.alert('Choose a plan', 'Select how long you want this listing promoted.');
      return;
    }
    setSponsorshipProcessing(true);
    try {
      const result = await startMarketplaceSponsorshipCheckout({ listingId: id, planId: selectedSponsorPlanId });
      await load();
      if (result.status === 'active') {
        setSponsorModalVisible(false);
        Alert.alert('Listing promoted', 'Your listing is now sponsored in Marketplace.');
      } else {
        Alert.alert('Payment pending', 'We\'ll activate the promotion as soon as your payment is confirmed.');
      }
    } catch (error) {
      Alert.alert('Promotion failed', error?.message || 'Could not complete the sponsorship payment.');
    } finally {
      if (isMounted.current) setSponsorshipProcessing(false);
    }
  };

  const handleReaderLayout = useCallback((event) => {
    const { y, height } = event.nativeEvent.layout;
    setReaderMetrics((current) => (current.y === y && current.height === height ? current : { y, height }));
  }, []);

  const handleReaderScroll = useCallback(
    (event) => {
      if (type !== 'question') return;
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const hasMetrics = readerMetrics.height > 0;
      const startY = hasMetrics ? readerMetrics.y : 0;
      const readable = hasMetrics
        ? Math.max(readerMetrics.height - layoutMeasurement.height, 1)
        : Math.max(contentSize.height - layoutMeasurement.height, 1);
      const next = Math.min(Math.max(Math.round(((contentOffset.y - startY) / readable) * 100), 0), 100);
      setReadingProgress((current) => (current === next ? current : next));
    },
    [readerMetrics, type],
  );

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  };

  const toggleDescription = () => {
    animateLayout();
    setDescriptionExpanded((value) => !value);
  };

  /* --------------------------------- render --------------------------------- */

  const offlineLabel = !isPremiumUser
    ? 'Premium required'
    : offlineRecord?.status === 'downloaded'
      ? 'Available offline'
      : offlineRecord?.status === 'failed'
        ? 'Retry save'
        : 'Save for offline';
  const offlineIcon = !isPremiumUser
    ? 'lock-closed-outline'
    : offlineRecord?.status === 'downloaded'
      ? 'checkmark-circle'
      : 'cloud-download-outline';

  const renderTopRow = () => (
    <View style={styles.typeRow}>
      <View style={styles.typeBadge}>
        <Ionicons name={typeMeta.icon} size={13} color={colors.brandDark} />
        <Text style={styles.typeBadgeText}>{typeMeta.label}</Text>
      </View>
      <View style={styles.topActions}>
        {canManageCurrentResource ? (
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressedSubtle]}
            onPress={openResourceActions}
            hitSlop={8}
            disabled={deletingResource}
            accessibilityRole="button"
            accessibilityLabel="Manage resource"
          >
            {deletingResource ? <ActivityIndicator size="small" color={colors.icon} /> : <Ionicons name="ellipsis-horizontal" size={18} color={colors.icon} />}
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressedSubtle]}
          onPress={shareRecord}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Ionicons name="share-outline" size={18} color={colors.icon} />
        </Pressable>
      </View>
    </View>
  );

  const renderDocumentCard = () => (
    <View style={styles.documentCard}>
      <View style={styles.previewWrap}>
        {asset.previewUrl && isPreviewImageUrl(asset.previewUrl) ? (
          <Image source={{ uri: asset.previewUrl }} style={styles.preview} contentFit="cover" cachePolicy="disk" transition={250} />
        ) : (
          <View style={styles.previewFallback}>
            <View style={styles.previewFallbackIcon}>
              <Ionicons name="document-text" size={30} color={colors.brand} />
            </View>
            <Text style={styles.previewFallbackText}>Preview unavailable</Text>
          </View>
        )}
      </View>
      <View style={styles.documentBody}>
        <Text style={styles.documentTitle}>{title || asset.fileName}</Text>
        <Text style={styles.documentMeta}>{formatDocumentMeta(item) || asset.fileName}</Text>
        {createdDate || ownerName ? (
          <Text style={styles.documentByline}>{[createdDate, ownerName ? `by ${ownerName}` : ''].filter(Boolean).join('  ·  ')}</Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.primaryCta, { marginTop: 14 }, pressed && styles.pressedBrand]}
          onPress={openPdfPreview}
          accessibilityRole="button"
          accessibilityLabel="Preview document"
        >
          <Ionicons name={type === 'question' && !isPremiumUser ? 'lock-closed' : 'eye-outline'} size={17} color={colors.onBrand} />
          <Text style={styles.primaryCtaText}>{type === 'question' && !isPremiumUser ? 'Unlock with Premium' : 'Preview document'}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderCommerceCard = () => (
    <View style={styles.commerceCard}>
      <View style={styles.commerceHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.commerceTitle}>{title}</Text>
          <Text style={styles.commerceMeta}>
            {[createdDate && `Listed ${createdDate}`, !showMediaGallery && item?.verified && 'Verified'].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
        {!showMediaGallery && item?.isSponsored ? (
          <View style={styles.sponsoredPill}>
            <Ionicons name="megaphone-outline" size={12} color={colors.warning} />
            <Text style={styles.sponsoredPillText}>Sponsored</Text>
          </View>
        ) : null}
      </View>

      {formattedPrice ? (
        <View style={styles.commercePriceRow}>
          <Text style={styles.commercePrice}>{formattedPrice}</Text>
          {isHostel ? <Text style={styles.commercePriceHint}>per listing</Text> : null}
        </View>
      ) : null}

      {canPromoteListing ? (
        <View style={styles.promoPanel}>
          <View style={styles.promoIcon}>
            <Ionicons name="rocket-outline" size={18} color={colors.brandDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>{item?.isSponsored ? 'Promotion active' : 'Get more eyes on this'}</Text>
            <Text style={styles.promoHint}>
              {item?.isSponsored && item?.sponsoredUntil
                ? `Sponsored until ${formatDate(item.sponsoredUntil)}.`
                : 'Promote this listing to the top of Marketplace.'}
            </Text>
          </View>
          <Pressable
            onPress={openSponsorModal}
            style={({ pressed }) => [styles.promoButton, pressed && styles.pressedBrand]}
            accessibilityRole="button"
            accessibilityLabel={item?.isSponsored ? 'Extend promotion' : 'Promote listing'}
          >
            <Text style={styles.promoButtonText}>{item?.isSponsored ? 'Extend' : 'Promote'}</Text>
          </Pressable>
        </View>
      ) : null}

      {commerceHighlights.length ? (
        <View style={styles.highlightGrid}>
          {commerceHighlights.map((highlight) => (
            <View key={highlight.label} style={styles.highlightCard}>
              <View style={styles.highlightIcon}>
                <Ionicons name={highlight.icon} size={15} color={colors.brandDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.highlightLabel}>{highlight.label}</Text>
                <Text style={styles.highlightValue} numberOfLines={2}>{highlight.value}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.ownerPanel}>
        <Avatar uri={ownerPhoto} name={ownerName} size={46} radius={16} />
        <View style={{ flex: 1 }}>
          <Text style={styles.ownerLabel}>{isHostel ? 'Listed by' : 'Sold by'}{isOwner ? ' (you)' : ''}</Text>
          <Text style={styles.ownerName} numberOfLines={1}>{ownerName}</Text>
          <Text style={styles.ownerHint} numberOfLines={1}>
            {Number(item?.sellerReviewCount || 0) > 0
              ? `${Number(item.sellerRatingAverage || 0).toFixed(1)} seller rating · ${item.sellerReviewCount} reviews`
              : canWhatsApp ? 'Reachable on WhatsApp' : 'New on UniHelp'}
          </Text>
        </View>
        {showContactCta ? (
          <Pressable
            onPress={onContactPress}
            style={({ pressed }) => [styles.ownerContactButton, pressed && styles.pressedBrand]}
            accessibilityRole="button"
            accessibilityLabel={contactLabel}
          >
            <Ionicons name="chatbubbles" size={17} color={colors.onBrand} />
          </Pressable>
        ) : null}
      </View>

      {!isOwner ? (
        <View style={styles.safetyNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
          <Text style={styles.safetyText}>
            {isHostel
              ? 'Inspect the room in person and confirm details before paying any rent or agent fee.'
              : 'Meet in a public campus spot and check the item before you pay. Never pay in advance.'}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderStickyFooter = () => {
    if (!showStickyFooter) return null;
    const footerStyle = [styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 14) }];

    if (isCommerceType) {
      return (
        <View style={footerStyle}>
          {formattedPrice ? (
            <View style={styles.footerPrice}>
              <Text style={styles.footerPriceLabel}>{isHostel ? 'Rent' : 'Price'}</Text>
              <Text style={styles.footerPriceValue} numberOfLines={1}>{formattedPrice}</Text>
            </View>
          ) : null}
          {showContactCta ? (
            <Pressable
              style={({ pressed }) => [styles.footerCta, pressed && styles.pressedBrand]}
              onPress={onContactPress}
              disabled={messaging}
              accessibilityRole="button"
              accessibilityLabel={contactLabel}
            >
              {messaging ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="chatbubbles" size={18} color={colors.onBrand} />}
              <Text style={styles.footerCtaText}>{contactLabel}</Text>
            </Pressable>
          ) : canPromoteListing ? (
            <Pressable
              style={({ pressed }) => [styles.footerCta, pressed && styles.pressedBrand]}
              onPress={openSponsorModal}
              accessibilityRole="button"
            >
              <Ionicons name="rocket" size={18} color={colors.onBrand} />
              <Text style={styles.footerCtaText}>{item?.isSponsored ? 'Extend promotion' : 'Promote listing'}</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }

    return (
      <View style={footerStyle}>
        <Pressable
          style={({ pressed }) => [
            styles.footerCta,
            offlineRecord?.status === 'downloaded' ? styles.footerCtaSuccess : isPremiumUser ? null : styles.footerCtaSoft,
            savingOffline && styles.disabledButton,
            pressed && styles.pressedBrand,
          ]}
          onPress={saveDocumentOffline}
          disabled={savingOffline}
          accessibilityRole="button"
          accessibilityLabel="Save resource for offline"
        >
          {savingOffline ? (
            <>
              <ActivityIndicator color={colors.onBrand} />
              <Text style={styles.footerCtaText}>Saving...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name={offlineIcon}
                size={18}
                color={!isPremiumUser ? colors.brandDark : colors.onBrand}
              />
              <Text style={[styles.footerCtaText, !isPremiumUser && { color: colors.brandDark }]}>{offlineLabel}</Text>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  const renderBody = () => (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, showStickyFooter && styles.scrollContentWithFooter]}
        onScroll={type === 'question' ? handleReaderScroll : undefined}
        scrollEventThrottle={type === 'question' ? 16 : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        {renderTopRow()}

        {showMediaGallery ? (
          <Gallery
            items={mediaItems}
            onOpen={openLightbox}
            sponsored={isCommerceType && item?.isSponsored}
            verified={isCommerceType && item?.verified}
          />
        ) : null}

        {showDocumentCard ? renderDocumentCard() : null}

        {isCommerceType ? renderCommerceCard() : null}

        {!isCommerceType && !hasFileAsset ? (
          <View style={styles.titleBlock}>
            <Text style={styles.heroTitle}>{title}</Text>
            <View style={styles.metaRow}>
              {createdDate ? (
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.metaChipText}>{createdDate}</Text>
                </View>
              ) : null}
              {ownerName && ownerName !== 'Uploader' ? (
                <View style={styles.metaChip}>
                  <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.metaChipText} numberOfLines={1}>{ownerName}</Text>
                </View>
              ) : null}
              {!isCommerceType && formattedPrice ? (
                <View style={[styles.metaChip, { backgroundColor: colors.greenLight }]}>
                  <Text style={[styles.metaChipText, { color: colors.success, fontWeight: '800' }]}>{formattedPrice}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {description ? (
          <SectionCard title={isCommerceType ? (isHostel ? 'About this property' : 'About this item') : 'Description'}>
            <Text style={styles.descriptionText}>{displayedDescription}</Text>
            {descriptionIsLong ? (
              <Pressable onPress={toggleDescription} hitSlop={8} style={styles.linkRow} accessibilityRole="button">
                <Text style={styles.linkText}>{descriptionExpanded ? 'Show less' : 'Read more'}</Text>
                <Ionicons name={descriptionExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.brandDark} />
              </Pressable>
            ) : null}
          </SectionCard>
        ) : null}

        {type === 'question' ? (
          <PastQuestionDocumentReader
            document={item}
            onOpenOriginal={openOriginalPaper}
            canOpenOriginal={Boolean(item?.originalFile?.url || asset?.hasDocumentUrl)}
            readingProgress={readingProgress}
            onLayout={handleReaderLayout}
          />
        ) : null}

        {!isCommerceType && fields.length ? (
          <View style={{ marginTop: 4 }}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.fieldGrid}>
              {fields.map((field) => (
                <View key={field.label} style={styles.fieldCard}>
                  <View style={styles.fieldIcon}>
                    <Ionicons name={field.icon} size={15} color={colors.brandDark} />
                  </View>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <Text style={styles.fieldValue} numberOfLines={2}>{field.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {type === 'listing' ? (
          <ReviewsSection
            item={item}
            reviews={reviews}
            loading={reviewsLoading}
            canReview={!isOwner}
            formOpen={reviewFormOpen}
            onToggleForm={() => {
              if (!user) {
                Alert.alert('Sign in required', 'Sign in to review marketplace listings.');
                return;
              }
              animateLayout();
              setReviewFormOpen((value) => !value);
            }}
            rating={reviewRating}
            onRate={setReviewRating}
            comment={reviewComment}
            onComment={setReviewComment}
            saving={reviewSaving}
            onSubmit={saveReview}
          />
        ) : null}

        {type === 'listing' ? (
          <MarketplaceRecommendations
            relatedListings={relatedListings}
            sponsoredListings={sponsoredListings}
            loading={recommendationsLoading}
            onPressItem={(listing) => router.push({ pathname: '/view/[type]/[id]', params: { type: 'listing', id: listing.id } })}
          />
        ) : null}
      </ScrollView>
      {renderStickyFooter()}
    </View>
  );

  return (
    <ScreenShell title="Details" subtitle={item?.title || item?.name || 'Record details'} showBack loading={loading}>
      <FriendRequestModal
        visible={friendRequestVisible}
        person={{ uid: ownerId, name: ownerName, avatar: ownerPhoto, email: ownerEmail }}
        onClose={() => setFriendRequestVisible(false)}
        onAdd={() =>
          sendFriendRequest({
            currentUid: user?.uid,
            targetUid: ownerId,
            currentProfile: profile,
            targetProfile: { uid: ownerId, name: ownerName, avatar: ownerPhoto, email: ownerEmail },
          })
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : item ? (
        renderBody()
      ) : (
        <View style={styles.errorCard}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.textSecondary} />
          </View>
          <Text style={styles.errorTitle}>We couldn't open this</Text>
          <Text style={styles.errorBody}>{loadError || 'This record may have been removed or isn\'t available yet.'}</Text>
          <View style={styles.errorActions}>
            <Pressable
              style={({ pressed }) => [styles.primaryCtaCompact, pressed && styles.pressedBrand]}
              onPress={() => {
                setLoading(true);
                load();
              }}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Ionicons name="refresh" size={15} color={colors.onBrand} />
              <Text style={styles.primaryCtaText}>Try again</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.softButton, pressed && styles.pressedSubtle]} onPress={() => router.back()} accessibilityRole="button">
              <Text style={styles.softButtonText}>Go back</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ContactSheet
        visible={contactSheetVisible}
        onClose={() => setContactSheetVisible(false)}
        label={contactLabel}
        title={title}
        kind={isHostel ? 'hostel' : 'product'}
        canApp={canMessageInApp}
        canWhatsApp={canWhatsApp}
        canCall={canCall}
        phone={ownerPhone}
        busy={messaging}
        onApp={messageOwnerInApp}
        onWhatsApp={messageOwnerOnWhatsApp}
        onCall={callOwner}
      />

      <PdfPreviewModal
        visible={pdfPreviewOpen}
        uri={pdfPreviewUrl}
        loading={pdfPreviewLoading}
        error={pdfPreviewError}
        onClose={closePdfPreview}
        onLoaded={() => setPdfPreviewLoading(false)}
        onFailed={(event) => {
          console.error('[PDF preview] WebView error', { uri: pdfPreviewUrl, event });
          setPdfPreviewError(true);
          setPdfPreviewLoading(false);
        }}
      />

      <SponsorSheet
        visible={sponsorModalVisible}
        onClose={() => setSponsorModalVisible(false)}
        plans={sponsorPlans}
        loading={sponsorPlansLoading}
        selectedId={selectedSponsorPlanId}
        onSelect={setSelectedSponsorPlanId}
        processing={sponsorshipProcessing}
        onPay={startSponsorshipPayment}
        active={Boolean(item?.isSponsored)}
        until={item?.sponsoredUntil}
      />

      <Lightbox visible={lightboxVisible} items={mediaItems} startIndex={lightboxIndex} onClose={() => setLightboxVisible(false)} />
    </ScreenShell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const createStyles = (colors) => {
  const softShadow = {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  };
  const warnBg = colors.warningLight || colors.brandLight;

  return StyleSheet.create({
    /* layout */
    scrollContent: { paddingBottom: 40, paddingHorizontal: SCREEN_PADDING, paddingTop: 2 },
    scrollContentWithFooter: { paddingBottom: 24 },
    pressedSubtle: { backgroundColor: colors.surfaceSecondary },
    pressedBrand: { opacity: 0.86 },
    disabledButton: { opacity: 0.5 },
    chevron: { color: colors.textTertiary },
    mutedText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'left' },
    mutedTextSmall: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    centerPad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
    inlineLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },

    /* skeleton */
    skeletonWrap: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4 },
    skeletonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    skeletonBlock: { backgroundColor: colors.borderDefault, borderRadius: 8 },
    skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },

    /* top row */
    typeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    typeBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.brandLight, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
    },
    typeBadgeText: { fontSize: 12, fontWeight: '800', color: colors.brandDark },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconButton: {
      width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDefault,
      alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
    },

    /* title block */
    titleBlock: { marginBottom: 16 },
    heroTitle: { color: colors.textPrimary, fontSize: 24, lineHeight: 31, fontWeight: '900', letterSpacing: -0.3 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    metaChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%',
      backgroundColor: colors.surfaceSecondary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
    },
    metaChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', flexShrink: 1 },

    /* section cards */
    sectionCard: {
      backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.borderDefault,
      padding: 16, marginBottom: 14,
    },
    sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900', marginBottom: 10 },
    sectionTitleInline: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
    descriptionText: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start' },
    linkText: { color: colors.brandDark, fontWeight: '800', fontSize: 13 },

    /* fields */
    fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    fieldCard: {
      width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 16,
      borderWidth: 1, borderColor: colors.borderDefault, padding: 12,
    },
    fieldIcon: {
      width: 28, height: 28, borderRadius: 9, backgroundColor: colors.brandLight,
      alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    fieldLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textSecondary },
    fieldValue: { marginTop: 3, fontSize: 13.5, fontWeight: '800', color: colors.textPrimary },

    /* document card */
    documentCard: {
      backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.borderDefault,
      overflow: 'hidden', marginBottom: 16, ...softShadow,
    },
    previewWrap: { height: 210, backgroundColor: colors.brandLight },
    preview: { width: '100%', height: '100%' },
    previewFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    previewFallbackIcon: {
      width: 64, height: 64, borderRadius: 22, backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    previewFallbackText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
    documentBody: { padding: 16 },
    documentTitle: { fontSize: 19, lineHeight: 25, fontWeight: '900', color: colors.textPrimary },
    documentMeta: { marginTop: 6, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
    documentByline: { marginTop: 4, color: colors.textTertiary, fontSize: 12, fontWeight: '600' },

    /* buttons */
    primaryCta: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.brand, borderRadius: 16, minHeight: 50, paddingHorizontal: 18,
    },
    primaryCtaCompact: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      backgroundColor: colors.brand, borderRadius: 13, minHeight: 42, paddingHorizontal: 16,
    },
    primaryCtaText: { color: colors.onBrand, fontSize: 14, fontWeight: '800' },
    softButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brandLight,
      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    },
    softButtonText: { color: colors.brandDark, fontSize: 12.5, fontWeight: '800' },

    /* gallery */
    galleryCard: {
      position: 'relative', backgroundColor: colors.brandLight, borderRadius: 24,
      overflow: 'hidden', marginBottom: 16, ...softShadow,
    },
    galleryImage: { width: '100%', height: '100%' },
    galleryBadges: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 },
    overlayPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999,
      paddingHorizontal: 9, paddingVertical: 5,
    },
    overlayPillText: { fontSize: 11, fontWeight: '800' },
    galleryCounter: {
      position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(15,23,42,0.62)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    },
    galleryCounterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    galleryDots: {
      position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(15,23,42,0.42)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
    },
    galleryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
    galleryDotActive: { backgroundColor: '#FFFFFF', width: 16 },

    /* commerce */
    commerceCard: {
      backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.borderDefault,
      padding: 18, marginBottom: 14, ...softShadow,
    },
    commerceHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    commerceTitle: { color: colors.textPrimary, fontSize: 22, lineHeight: 28, fontWeight: '900', letterSpacing: -0.2 },
    commerceMeta: { marginTop: 4, color: colors.textSecondary, fontSize: 12.5 },
    sponsoredPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999,
      paddingHorizontal: 9, paddingVertical: 5, backgroundColor: warnBg,
    },
    sponsoredPillText: { color: colors.warning, fontSize: 11, fontWeight: '800' },
    commercePriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 12 },
    commercePrice: { color: colors.brandDark, fontSize: 28, fontWeight: '900', letterSpacing: -0.4 },
    commercePriceHint: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
    promoPanel: {
      marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: colors.brandLight,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    promoIcon: {
      width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    promoTitle: { color: colors.textPrimary, fontSize: 13.5, fontWeight: '900' },
    promoHint: { marginTop: 2, color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
    promoButton: { borderRadius: 12, backgroundColor: colors.brand, paddingHorizontal: 14, paddingVertical: 10 },
    promoButtonText: { color: colors.onBrand, fontSize: 12.5, fontWeight: '800' },
    highlightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
    highlightCard: {
      width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 11,
    },
    highlightIcon: {
      width: 30, height: 30, borderRadius: 10, backgroundColor: colors.brandLight,
      alignItems: 'center', justifyContent: 'center',
    },
    highlightLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
    highlightValue: { marginTop: 1, color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
    ownerPanel: {
      flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 16,
      borderTopWidth: 1, borderTopColor: colors.borderDefault,
    },
    ownerLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    ownerName: { color: colors.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 1 },
    ownerHint: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    ownerContactButton: {
      width: 44, height: 44, borderRadius: 15, backgroundColor: colors.brand,
      alignItems: 'center', justifyContent: 'center',
    },
    safetyNote: {
      flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 14, padding: 12,
      borderRadius: 14, backgroundColor: colors.greenLight,
    },
    safetyText: { flex: 1, color: colors.textPrimary, fontSize: 12, lineHeight: 17 },

    /* reviews */
    reviewsHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    ratingSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    ratingBig: { color: colors.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
    reviewForm: {
      padding: 14, borderRadius: 16, backgroundColor: colors.surfaceSecondary, gap: 12, marginBottom: 14,
    },
    reviewPickerRow: { gap: 6 },
    ratingLabel: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
    reviewInput: {
      minHeight: 90, textAlignVertical: 'top', borderRadius: 13, borderWidth: 1,
      borderColor: colors.inputBorder || colors.borderDefault, backgroundColor: colors.inputBackground || colors.surface,
      color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, lineHeight: 20,
    },
    reviewFormFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reviewCard: { padding: 12, borderRadius: 16, backgroundColor: colors.surfaceSecondary, gap: 9 },
    reviewTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reviewName: { color: colors.textPrimary, fontSize: 13.5, fontWeight: '800' },
    reviewMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
    reviewDate: { color: colors.textTertiary, fontSize: 11, fontWeight: '600' },
    reviewText: { color: colors.textPrimary, fontSize: 13.5, lineHeight: 20 },

    /* recommendations */
    railSection: { marginTop: 8, marginBottom: 10 },
    railHeading: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 12 },
    rail: { gap: 12, paddingRight: 4 },
    railCard: {
      width: 160, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderDefault,
      borderRadius: 18, padding: 8,
    },
    railImageWrap: { height: 114, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.brandLight },
    railImage: { width: '100%', height: '100%' },
    railFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandLight },
    railFallbackText: { color: colors.brandDark, fontSize: 26, fontWeight: '900' },
    railBadge: {
      position: 'absolute', top: 6, left: 6, backgroundColor: warnBg, borderRadius: 999,
      paddingHorizontal: 7, paddingVertical: 3,
    },
    railBadgeText: { color: colors.warning, fontSize: 10, fontWeight: '800' },
    railTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 9, paddingHorizontal: 3, minHeight: 34 },
    railPrice: { color: colors.brandDark, fontSize: 14, fontWeight: '900', marginTop: 4, paddingHorizontal: 3 },
    railMeta: { color: colors.textTertiary, fontSize: 11.5, fontWeight: '600', marginTop: 3, paddingHorizontal: 3, marginBottom: 3 },

    /* sticky footer */
    stickyFooter: {
      flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface,
      borderTopWidth: 1, borderTopColor: colors.borderDefault, paddingHorizontal: SCREEN_PADDING, paddingTop: 12,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 8,
    },
    footerPrice: { maxWidth: '38%' },
    footerPriceLabel: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '700' },
    footerPriceValue: { color: colors.textPrimary, fontSize: 19, fontWeight: '900', letterSpacing: -0.2 },
    footerCta: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: colors.brand, borderRadius: 16, minHeight: 52,
    },
    footerCtaSoft: { backgroundColor: colors.brandLight },
    footerCtaSuccess: { backgroundColor: colors.success },
    footerCtaText: { color: colors.onBrand, fontWeight: '800', fontSize: 14.5 },

    /* bottom sheets */
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
    sheetAnchor: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 18, paddingTop: 10,
    },
    sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderDefault, alignSelf: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    sheetSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 3, marginBottom: 16 },
    sheetSubtitleMultiline: { fontSize: 12.5, lineHeight: 18, color: colors.textSecondary, marginTop: 4 },
    sheetCloseButton: {
      width: 34, height: 34, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    sheetOption: {
      flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13,
      borderRadius: 18, borderWidth: 1, borderColor: colors.borderDefault, marginBottom: 10,
    },
    sheetOptionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    sheetOptionTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
    sheetOptionHint: { marginTop: 2, fontSize: 12.5, color: colors.textSecondary },
    sheetCancel: { marginTop: 4, paddingVertical: 14, alignItems: 'center', borderRadius: 14 },
    sheetCancelText: { fontSize: 14.5, fontWeight: '700', color: colors.textSecondary },

    /* sponsor */
    sponsorHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
    planCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5,
      borderColor: colors.borderDefault, backgroundColor: colors.surface, padding: 14,
    },
    planCardSelected: { borderColor: colors.brand, backgroundColor: colors.brandLight },
    planTitle: { color: colors.textPrimary, fontSize: 14.5, fontWeight: '900' },
    planHint: { marginTop: 2, color: colors.textSecondary, fontSize: 12 },
    planPrice: { color: colors.brandDark, fontSize: 15, fontWeight: '900' },

    /* pdf preview */
    previewModal: { flex: 1, backgroundColor: colors.surface },
    previewHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderDefault,
    },
    previewTitle: { fontSize: 16, fontWeight: '900', color: colors.textPrimary },
    previewClose: {
      width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surfaceSecondary,
      alignItems: 'center', justifyContent: 'center',
    },
    previewCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 28 },
    previewErrorTitle: { marginTop: 12, color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
    previewErrorHint: { marginTop: 6, color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
    previewFooter: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderDefault, backgroundColor: colors.surface },

    /* lightbox */
    lightbox: { flex: 1, backgroundColor: '#000000' },
    lightboxTopBar: {
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10,
    },
    lightboxClose: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center',
    },

    /* error */
    errorCard: {
      margin: SCREEN_PADDING, marginTop: 40, backgroundColor: colors.surface, borderRadius: 24,
      borderWidth: 1, borderColor: colors.borderDefault, padding: 24, alignItems: 'center',
    },
    errorIconWrap: {
      width: 56, height: 56, borderRadius: 18, backgroundColor: colors.surfaceSecondary,
      alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    errorTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
    errorBody: { marginTop: 8, color: colors.textSecondary, lineHeight: 21, fontSize: 13.5, textAlign: 'center' },
    errorActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  });
};