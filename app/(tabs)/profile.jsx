import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { spacing } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EvosAura from '../../src/shared/components/EvosAura';
import Footer from '../../components/Footer';
import DailyStreakBanner from '../../src/shared/components/DailyStreakBanner';
import ConfirmDialog from '../../src/shared/components/ConfirmDialog';
import DraggableBottomSheet from '../../src/shared/components/DraggableBottomSheet';
import SchoolTypeFilter from '../../src/shared/components/SchoolTypeFilter';
import SearchableDropdown from '../../src/signup/components/SearchableDropdown';
import { useUniversities } from '../../src/signup/hooks/useUniversities';
import { useDepartments } from '../../src/signup/hooks/useDepartments';
import {
  ACADEMIC_LEVELS,
  formatDateOfBirth,
  GENDER_OPTIONS,
  isValidDateOfBirth,
  parseDateOfBirth,
} from '../../src/signup/validation';
import { useAuth } from '../../context/AuthContext';
import { saveUserProfile, fetchDailyStreak } from '../../services/firestoreSync';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';
import { fetchChallengeStats } from './../../src/shared/challenge/service';
import { deleteCloudinaryAssets } from '../../services/mediaCleanup';
import { isPremiumActive } from '../../src/shared/services/premium';
import { fetchFriendStats } from '../../src/shared/services/friendships';
import { deleteProfileMedia, getJson, uploadFeatureMedia } from '../../src/shared/services/backend';

const BIO_MAX_LENGTH = 160;
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const AVATAR_SIZE = 92;

const PROFILE_FOOTER_SECTIONS = [
  {
    title: 'Platform',
    links: [
      { label: 'About', route: '/about' },
      { label: 'Help Center', route: '/help-center' },
      { label: 'Suggest Feature', route: '/suggest' },
      { label: 'FAQ', route: '/faq' },
    ],
  },
  {
    title: 'Legal & Support',
    links: [
      { label: 'Terms of Service', route: '/terms' },
      { label: 'Privacy Policy', route: '/privacy' },
      { label: 'Contact Us', route: '/contact' },
    ],
  },
];

const PROFILE_SOCIAL_LINKS = [
  { label: 'Instagram', icon: 'logo-instagram', url: 'https://instagram.com/unihelp' },
  { label: 'LinkedIn', icon: 'logo-linkedin', url: 'https://linkedin.com/company/unihelp' },
];

/* -------------------------------------------------------------------------- */
/*  Date of birth picker — custom wheels, identical on iOS / Android / Web     */
/*  No native date-picker dependency, so nothing to crash or render oddly.     */
/* -------------------------------------------------------------------------- */

const ITEM_H = 46;
const VISIBLE_ROWS = 5;
const WHEEL_PAD = ITEM_H * Math.floor(VISIBLE_ROWS / 2);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const calcAge = (date) => {
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const beforeBirthday =
    now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(age, 0);
};

function WheelColumn({ data, selectedIndex, onSelect, flex = 1, label, styles }) {
  const ref = useRef(null);
  const firstRun = useRef(true);
  const debounce = useRef(null);

  // Keep the wheel aligned with the selected index (initial mount is instant, later changes animate).
  useEffect(() => {
    const id = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: !firstRun.current });
      firstRun.current = false;
    }, 0);
    return () => clearTimeout(id);
  }, [selectedIndex, data.length]);

  useEffect(() => () => debounce.current && clearTimeout(debounce.current), []);

  const settle = (y) => {
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(y / ITEM_H)));
    if (idx !== selectedIndex) onSelect(idx);
    else if (Math.abs(y - idx * ITEM_H) > 1) ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
  };

  return (
    <View style={[styles.wheelCol, { flex }]} accessible accessibilityLabel={label} accessibilityRole="adjustable">
      <ScrollView
        ref={ref}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          if (Platform.OS !== 'web') settle(e.nativeEvent.contentOffset.y);
        }}
        onScroll={
          Platform.OS === 'web'
            ? (e) => {
                const y = e.nativeEvent.contentOffset.y;
                if (debounce.current) clearTimeout(debounce.current);
                debounce.current = setTimeout(() => settle(y), 140);
              }
            : undefined
        }
      >
        {data.map((item, i) => {
          const distance = Math.abs(i - selectedIndex);
          return (
            <Pressable
              key={String(item)}
              onPress={() => onSelect(i)}
              style={styles.wheelItem}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${item}`}
              accessibilityState={{ selected: distance === 0 }}
            >
              <Text
                style={[
                  styles.wheelText,
                  distance === 0 && styles.wheelTextActive,
                  { opacity: distance === 0 ? 1 : distance === 1 ? 0.55 : 0.28 },
                ]}
                numberOfLines={1}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DateOfBirthPicker({ value, onConfirm, onClear, onCancel }) {
  const styles = useThemeStyles((c, s, r) => ({
    previewCard: {
      alignItems: 'center', paddingVertical: s.md, paddingHorizontal: s.lg, borderRadius: r.xl,
      backgroundColor: c.brandLight, marginBottom: s.md,
    },
    previewDate: { fontSize: 20, fontWeight: '900', color: c.brandText, textAlign: 'center' },
    agePill: {
      marginTop: s.xs, flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.surface, borderRadius: r.full, paddingHorizontal: s.sm, paddingVertical: 3,
    },
    agePillText: { fontSize: 11.5, fontWeight: '800', color: c.brandText },
    wheelWrap: { height: ITEM_H * VISIBLE_ROWS, flexDirection: 'row', marginBottom: s.md, overflow: 'hidden' },
    wheelBand: {
      position: 'absolute', left: 0, right: 0, top: WHEEL_PAD, height: ITEM_H, borderRadius: r.lg,
      backgroundColor: c.canvasLight, borderWidth: 1, borderColor: c.brand,
    },
    wheelCol: { height: ITEM_H * VISIBLE_ROWS },
    wheelItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
    wheelText: { fontSize: 16, fontWeight: '600', color: c.ink },
    wheelTextActive: { fontSize: 18, fontWeight: '900', color: c.brandText },
    primaryBtn: {
      flexDirection: 'row', gap: s.sm, backgroundColor: c.brand, paddingVertical: 15,
      borderRadius: r.lg, alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnDisabled: { backgroundColor: c.brandGlow },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
    footerRow: { flexDirection: 'row', gap: s.sm, marginTop: s.sm },
    ghostBtn: { flex: 1, paddingVertical: 13, borderRadius: r.lg, alignItems: 'center', backgroundColor: c.canvasLight },
    ghostBtnText: { color: c.ink, fontWeight: '700', fontSize: 13.5 },
    ghostBtnDanger: { color: c.red },
  }));

  const { colors } = useTheme();
  const today = useMemo(() => new Date(), []);
  const maxYear = today.getFullYear();
  const minYear = maxYear - 90;

  const [parts, setParts] = useState(() => {
    const seed = parseDateOfBirth(value) || new Date(maxYear - 20, 0, 1);
    return { y: seed.getFullYear(), m: seed.getMonth(), d: seed.getDate() };
  });

  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i), [maxYear, minYear]);
  const dayCount = daysInMonth(parts.y, parts.m);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  // Single entry point: clamps the day to the month's length and never allows a future date.
  const update = (patch) => {
    setParts((current) => {
      const next = { ...current, ...patch };
      next.d = Math.min(next.d, daysInMonth(next.y, next.m));
      if (new Date(next.y, next.m, next.d) > today) {
        return { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };
      }
      return next;
    });
  };

  const selected = new Date(parts.y, parts.m, parts.d);
  const formatted = formatDateOfBirth(selected);
  const valid = isValidDateOfBirth(formatted);
  const age = calcAge(selected);

  return (
    <View>
      <View style={styles.previewCard} accessibilityLiveRegion="polite">
        <Text style={styles.previewDate}>
          {selected.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        <View style={styles.agePill}>
          <Ionicons name="gift-outline" size={12} color={colors.brandText} />
          <Text style={styles.agePillText}>{age} year{age === 1 ? '' : 's'} old</Text>
        </View>
      </View>

      <View style={styles.wheelWrap}>
        <View style={styles.wheelBand} pointerEvents="none" />
        <WheelColumn
          label="Day" data={days} flex={0.8} styles={styles}
          selectedIndex={Math.min(parts.d, dayCount) - 1}
          onSelect={(i) => update({ d: i + 1 })}
        />
        <WheelColumn
          label="Month" data={MONTHS} flex={1.5} styles={styles}
          selectedIndex={parts.m}
          onSelect={(i) => update({ m: i })}
        />
        <WheelColumn
          label="Year" data={years} flex={1} styles={styles}
          selectedIndex={maxYear - parts.y}
          onSelect={(i) => update({ y: maxYear - i })}
        />
      </View>

      <Pressable
        disabled={!valid}
        onPress={() => onConfirm(formatted)}
        style={[styles.primaryBtn, !valid && styles.primaryBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Set date of birth"
        accessibilityState={{ disabled: !valid }}
      >
        <Ionicons name="checkmark-outline" size={17} color="#fff" />
        <Text style={styles.primaryBtnText}>Set date of birth</Text>
      </Pressable>

      <View style={styles.footerRow}>
        <Pressable onPress={onCancel} style={styles.ghostBtn} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </Pressable>
        {value ? (
          <Pressable onPress={onClear} style={styles.ghostBtn} accessibilityRole="button" accessibilityLabel="Remove date of birth">
            <Text style={[styles.ghostBtnText, styles.ghostBtnDanger]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Media upload                                                              */
/* -------------------------------------------------------------------------- */

const updateProfilePhoto = async ({ kind = 'photo', uri }) => {
  if (!uri) {
    throw new Error('No image was selected. Please choose another photo.');
  }

  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists || !fileInfo.size) {
    throw new Error('This image could not be read. Please try another file.');
  }

  if (fileInfo.size > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large. Please upload an image smaller than 30MB.');
  }

  const extension = String(uri).toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const filename = `${kind}-${Date.now()}.${extension}`;
  const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
  const uploadFile = { uri, name: filename, type: mimeType, mimeType, size: fileInfo.size };
  const uploaded = await uploadFeatureMedia(uploadFile, { feature: 'profile', resourceType: 'image' });

  const secureUrl = uploaded?.secure_url || uploaded?.url || '';
  if (!secureUrl) {
    throw new Error('The image upload did not return a valid URL. Please try again.');
  }

  const mediaAsset = {
    url: secureUrl,
    publicId: uploaded?.publicId || uploaded?.key || '',
    resourceType: uploaded?.resourceType || 'image',
    storageProvider: 'r2',
  };

  if (kind === 'photo') {
    try {
      await saveUserProfile({ photo: secureUrl, photoURL: secureUrl, photoThumb: secureUrl, photoAsset: mediaAsset });
    } catch (saveError) {
      if (mediaAsset.publicId) {
        await deleteProfileMedia(mediaAsset.publicId).catch((cleanupError) => {
          console.warn('[Profile] Failed to clean up unsaved R2 profile photo.', cleanupError);
        });
      }
      throw saveError;
    }
    return mediaAsset;
  }

  try {
    await saveUserProfile({ cover: secureUrl, coverPhoto: secureUrl, coverAsset: mediaAsset });
  } catch (saveError) {
    if (mediaAsset.publicId) {
      await deleteProfileMedia(mediaAsset.publicId).catch((cleanupError) => {
        console.warn('[Profile] Failed to clean up unsaved R2 cover image.', cleanupError);
      });
    }
    throw saveError;
  }
  return mediaAsset;
};

// Fields shown together inside the single "Edit Profile" sheet, in order.
const fields = [
  { key: 'username', label: 'Name', placeholder: 'Add your name', icon: 'person-outline' },
  { key: 'bio', label: 'About', placeholder: 'Tell others a little about yourself', icon: 'chatbubble-ellipses-outline', multiline: true, maxLength: BIO_MAX_LENGTH },
  { key: 'school', label: 'School', placeholder: 'Add your school', icon: 'school-outline' },
  { key: 'department', label: 'Department', placeholder: 'Add your department', icon: 'library-outline' },
  { key: 'level', label: 'Level', placeholder: 'e.g. ND 1', icon: 'ribbon-outline' },
  { key: 'location', label: 'Location', placeholder: 'Add your city or campus', icon: 'location-outline' },
  { key: 'gender', label: 'Gender', placeholder: 'Add your gender', icon: 'person-circle-outline' },
  { key: 'dateOfBirth', label: 'Date of birth', placeholder: 'Add your date of birth', icon: 'calendar-outline' },
];

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const POST_PRESET_COLORS = { indigo: '#4F46E5', violet: '#7C3AED', blue: '#0284C7', green: '#15803D', orange: '#EA580C', pink: '#DB2777', red: '#DC2626', dark: '#111827' };

const emptyForm = {
  username: '', school: '', schoolId: '', department: '', departmentId: '', faculty: '', level: '', location: '', bio: '', gender: '', dateOfBirth: '', role: 'university',
};

// Sheets are mutually exclusive — only one is meaningfully open at a time.
const SHEET = {
  NONE: null,
  EDIT_FIELD: 'edit_field',   // single-field editor, opened from inside the Edit Profile sheet
  EDIT_PROFILE: 'edit_profile',
  PLAN: 'plan',
  PROGRESS: 'progress',
  UPLOADS: 'uploads',
  MORE: 'more',               // the vertical-ellipsis overflow menu
  APPEARANCE: 'appearance',
};

const formatShortDate = (value) => {
  const date = parseDateOfBirth(value);
  return date ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

const formatPostDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile, logout } = useAuth();
  const { colors, isDark, themeMode, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [sheet, setSheet] = useState(SHEET.NONE);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { universities, loading: ul, searchText: us, setSearchText: sus, loadMore: lmu, schoolType, setSchoolType } = useUniversities();
  const { departments, loading: dl, searchText: ds, setSearchText: sds, selectUniversity } = useDepartments();
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [stats, setStats] = useState({ listings: 0, hostelListings: 0, groups: 0, stories: 0 });
  const [friendCount, setFriendCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [streakCount, setStreakCount] = useState(0);
  const [streakDates, setStreakDates] = useState([]);
  const premiumActive = isPremiumActive(profile);
  const [challengeStats, setChallengeStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [profileView, setProfileView] = useState('profile');
  const [profilePosts, setProfilePosts] = useState([]);
  const [profilePostsLoading, setProfilePostsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const statusTimerRef = useRef(null);
  const adminTapCountRef = useRef(0);
  const adminTapTimerRef = useRef(null);
  const initialFormRef = useRef(emptyForm);
  const profileRef = useRef(profile);
  const refreshProfileRef = useRef(refreshProfile);

  initialFormRef.current = initialForm;
  profileRef.current = profile;
  refreshProfileRef.current = refreshProfile;

  // FIX: `isDirty` was read by an effect declared above its `const` (temporal dead zone → ReferenceError on render).
  // It now lives here, before anything that depends on it.
  const isDirty = useMemo(
    () => Object.keys(form).some((key) => form[key] !== initialForm[key]),
    [form, initialForm]
  );

  const handleAdminBadgePress = () => {
    adminTapCountRef.current += 1;
    if (adminTapTimerRef.current) clearTimeout(adminTapTimerRef.current);

    if (adminTapCountRef.current >= 3) {
      adminTapCountRef.current = 0;
      router.push('/adminLogs');
    } else {
      adminTapTimerRef.current = setTimeout(() => {
        adminTapCountRef.current = 0;
      }, 1000);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (adminTapTimerRef.current) clearTimeout(adminTapTimerRef.current);
    };
  }, []);

  const loadProfilePosts = useCallback(async () => {
    const uid = profile?.uid || user?.uid;
    if (!uid) return;
    setProfilePostsLoading(true);
    try {
      const response = await getJson(`/api/feed/users/${encodeURIComponent(uid)}/posts?limit=20`);
      if (isMountedRef.current) setProfilePosts(Array.isArray(response?.items) ? response.items : []);
    } catch (error) {
      console.error('[Profile] Failed to load user posts', error);
      if (isMountedRef.current) setProfilePosts([]);
    } finally {
      if (isMountedRef.current) setProfilePostsLoading(false);
    }
  }, [profile?.uid, user?.uid]);

  useEffect(() => {
    if (profileView === 'posts') loadProfilePosts();
  }, [loadProfilePosts, profileView]);

  const styles = useThemeStyles((c, s, r) => ({
    scrollContent: { paddingBottom: 32 },
    profileTabs: { flexDirection: 'row', gap: 6, marginBottom: s.lg, padding: 4, borderRadius: r.xl, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault },
    profileTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: r.lg },
    profileTabActive: { backgroundColor: c.brand },
    profileTabText: { color: c.textSecondary, fontSize: 12.5, fontWeight: '800' },
    profileTabTextActive: { color: c.onBrand },
    postsState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
    postsStateText: { color: c.textSecondary, fontSize: 13, textAlign: 'center' },
    postCard: { marginBottom: s.md, overflow: 'hidden', borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.card },
    postBody: { padding: s.md },
    postText: { color: c.textPrimary, fontSize: 14, lineHeight: 21 },
    postImage: { width: '100%', height: 220 },
    postColored: { minHeight: 190, alignItems: 'center', justifyContent: 'center', padding: s.xl },
    postColoredText: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', lineHeight: 30, textAlign: 'center' },
    timeText: { marginTop: s.sm, color: c.textTertiary, fontSize: 11 },
    postMeta: { flexDirection: 'row', gap: 18, marginTop: s.md, paddingTop: s.sm, borderTopWidth: 1, borderTopColor: c.borderDefault },
    postMetaText: { color: c.textSecondary, fontSize: 11, fontWeight: '800' },

    // Header bar with the overflow (⋮) trigger
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.xs, marginBottom: spacing.xs },
    moreButton: {
      width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight,
    },
    moreButtonPressed: { backgroundColor: c.canvasLight },

    // Identity header: cover in normal flow, avatar overlaps its bottom edge by half its height.
    identity: { alignItems: 'center', marginBottom: s.md },
    coverWrap: { width: '100%', height: 150, borderRadius: r['2xl'], overflow: 'hidden' },
    coverImage: { width: '100%', height: '100%' },
    coverScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.14)' },
    coverPlaceholder: { width: '100%', height: '100%', backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', gap: 6 },
    coverPlaceholderText: { fontSize: 12, fontWeight: '700', color: c.brandText },
    coverBadge: {
      position: 'absolute', right: s.sm, bottom: s.sm, width: 34, height: 34, borderRadius: 17,
      backgroundColor: 'rgba(15, 23, 42, 0.55)', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    },
    coverSpinner: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.45)', alignItems: 'center', justifyContent: 'center' },
    avatarWrap: { position: 'relative', marginTop: -(AVATAR_SIZE / 2), marginBottom: s.md, zIndex: 2 },
    avatar: {
      width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: c.brand,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 4, borderColor: c.canvasLight,
      ...Platform.select({
        ios: { shadowColor: c.brandText, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
        android: { elevation: 4 },
      }),
    },
    avatarText: { color: c.onBrand, fontSize: 30, fontWeight: '800' },
    avatarImage: { width: '100%', height: '100%', borderRadius: (AVATAR_SIZE - 8) / 2 },
    avatarSpinnerOverlay: {
      ...StyleSheet.absoluteFillObject, borderRadius: (AVATAR_SIZE - 8) / 2,
      backgroundColor: 'rgba(15, 23, 42, 0.45)', alignItems: 'center', justifyContent: 'center',
    },
    avatarBadge: {
      position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15,
      backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center',
      borderWidth: 3, borderColor: c.canvasLight,
    },
    identityTextWrap: { alignItems: 'center', marginBottom: s.sm },
    identityNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s.xs, maxWidth: '100%' },
    identityName: { fontSize: 21, fontWeight: '900', color: c.ink, maxWidth: '85%', textAlign: 'center', letterSpacing: -0.2 },
    identityEmail: { marginTop: s.xs, fontSize: 13, color: c.grey, maxWidth: '85%', textAlign: 'center' },

    // Info chips (school, level, location)
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.xs, justifyContent: 'center', marginTop: s.sm, paddingHorizontal: s.sm },
    infoChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%',
      backgroundColor: c.surface, borderRadius: r.full, borderWidth: 1, borderColor: c.borderLight,
      paddingHorizontal: s.sm, paddingVertical: 5,
    },
    infoChipText: { fontSize: 11.5, fontWeight: '700', color: c.grey, flexShrink: 1 },

    pillsRow: { flexDirection: 'row', gap: s.sm, marginTop: s.sm, flexWrap: 'wrap', justifyContent: 'center' },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: s.xs,
      backgroundColor: c.brandLight, borderRadius: r.full,
      paddingHorizontal: s.sm, paddingVertical: 5,
    },
    pillGold: { backgroundColor: c.goldLight },
    pillMuted: { backgroundColor: c.canvasLight },
    pillText: { fontSize: 11, fontWeight: '800', color: c.brandText },
    pillTextGold: { color: c.gold },
    pillTextMuted: { color: c.grey },

    // Quick stats strip
    statsStrip: {
      flexDirection: 'row', alignItems: 'stretch', backgroundColor: c.surface, borderRadius: r.xl,
      borderWidth: 1, borderColor: c.borderLight, marginTop: s.xs, marginBottom: s.sm, overflow: 'hidden',
    },
    statCell: { flex: 1, alignItems: 'center', paddingVertical: s.md, gap: 2 },
    statValue: { fontSize: 19, fontWeight: '900', color: c.ink },
    statLabel: { fontSize: 11.5, fontWeight: '700', color: c.grey },
    statDivider: { width: 1, backgroundColor: c.skeleton, marginVertical: s.sm },

    // Profile completion
    completionCard: {
      backgroundColor: c.surface, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderLight,
      padding: s.md, marginBottom: s.sm,
    },
    completionTop: { flexDirection: 'row', alignItems: 'center', marginBottom: s.sm },
    completionTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: c.ink },
    completionAction: { fontSize: 12, fontWeight: '800', color: c.brandText },
    progressTrack: { height: 7, borderRadius: 4, backgroundColor: c.skeleton, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4, backgroundColor: c.brand },
    completionHint: { marginTop: s.sm, fontSize: 12, color: c.grey },

    bioCard: {
      backgroundColor: c.surface, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderLight,
      padding: s.md, marginBottom: s.sm,
    },
    bioHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: s.xs },
    bioTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: c.ink },
    bioEdit: { fontSize: 12, fontWeight: '800', color: c.brandText },
    bioText: { color: c.grey, fontSize: 13.5, lineHeight: 20 },

    toast: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, borderRadius: r.md, borderWidth: 1,
      paddingHorizontal: s.md, paddingVertical: s.sm, marginBottom: s.md,
    },
    toastSuccess: { backgroundColor: c.greenLight, borderColor: c.greenLight },
    toastError: { backgroundColor: c.redLight, borderColor: c.redBorder },
    toastText: { flex: 1, fontSize: 12.5, fontWeight: '600' },
    toastTextSuccess: { color: c.teal },
    toastTextError: { color: c.rose },

    groupLabel: { fontSize: 13, fontWeight: '800', color: c.grey, marginBottom: s.sm, marginTop: 6, marginLeft: s.xs },
    groupCard: {
      backgroundColor: c.surface, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderLight,
      marginBottom: s.lg, overflow: 'hidden',
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.skeleton },
    rowPressed: { backgroundColor: c.canvasLight },

    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: s.md, paddingHorizontal: s.lg, gap: s.md, minHeight: 60 },
    rowIconSm: { width: 36, height: 36, borderRadius: 11, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    rowIconDanger: { backgroundColor: c.redLight },
    rowTextWrap: { flex: 1 },
    rowTitle: { fontSize: 14.5, fontWeight: '700', color: c.ink },
    rowSubtitle: { marginTop: 2, fontSize: 12, color: c.grey },
    rowTrailingText: { fontSize: 13, fontWeight: '700', color: c.brandText, marginRight: 2 },
    rowBadge: { backgroundColor: c.orangeLight, borderRadius: r.full, paddingHorizontal: 8, paddingVertical: 3, marginRight: 2 },
    rowBadgeText: { fontSize: 11, fontWeight: '800', color: c.orange },

    sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: s.md },
    sheetRowTitle: { fontSize: 14.5, fontWeight: '700', color: c.ink },
    sheetRowTitleDanger: { color: c.red },
    sheetDivider: { height: 1, backgroundColor: c.skeleton, marginVertical: 2 },
    sheetIconWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.canvasLight, alignItems: 'center', justifyContent: 'center' },
    sheetIconWrapDanger: { backgroundColor: c.redLight },

    popupStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: s.md },
    popupStatCard: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: 14, borderRadius: r.xl, gap: 4 },
    popupStatValue: { fontSize: 18, fontWeight: '900' },
    popupStatLabel: { fontSize: 10.5, fontWeight: '700', color: c.grey, letterSpacing: 0.3 },
    popupSkeletonRow: { flexDirection: 'row', gap: 10, marginBottom: s.md },
    popupSkeleton: { flex: 1, height: 76, borderRadius: r.xl, backgroundColor: c.skeleton },
    popupLinkButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 12, borderRadius: r.lg, backgroundColor: c.brandLight, marginTop: 2,
    },
    popupLinkText: { fontSize: 13.5, fontWeight: '800', color: c.brandText },
    planCopy: { color: c.grey, fontSize: 13, lineHeight: 19, marginBottom: 14 },

    segmentRow: { flexDirection: 'row', gap: s.sm },
    segmentOption: {
      flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: r.lg,
      backgroundColor: c.canvasLight, borderWidth: 1, borderColor: 'transparent',
    },
    segmentOptionActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    segmentLabel: { fontSize: 12, fontWeight: '700', color: c.grey },
    segmentLabelActive: { color: c.brandText },

    // Field editor
    editFieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: s.md, gap: s.md, minHeight: 56 },
    fieldLabel: { fontSize: 11.5, fontWeight: '700', color: c.greyLight, marginBottom: s.xs },
    fieldValue: { fontSize: 14.5, color: c.ink, fontWeight: '600' },
    fieldValueEmpty: { color: c.greyLight, fontWeight: '400' },
    inputWrap: {
      borderWidth: 1.5, borderColor: c.brand, borderRadius: r.lg, backgroundColor: c.surfacePrimary,
      paddingHorizontal: s.md, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    fieldInput: { fontSize: 15, color: c.ink, fontWeight: '600', padding: 0, margin: 0 },
    fieldInputArea: { minHeight: 84, textAlignVertical: 'top' },
    genderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    genderOption: { borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.full, paddingHorizontal: s.md, paddingVertical: s.sm, backgroundColor: c.surfacePrimary },
    genderOptionSelected: { backgroundColor: c.brandLight, borderColor: c.brand },
    genderOptionText: { color: c.textSecondary, fontSize: 12.5, fontWeight: '600' },
    genderOptionTextSelected: { color: c.brandText, fontWeight: '800' },
    charCount: { fontSize: 11, color: c.greyLight, textAlign: 'right', marginTop: s.xs },

    saveButton: {
      flexDirection: 'row', gap: s.sm, backgroundColor: c.brand, paddingVertical: 15,
      borderRadius: r.lg, alignItems: 'center', justifyContent: 'center',
    },
    saveButtonPressed: { backgroundColor: c.brandDark },
    saveButtonDisabled: { backgroundColor: c.brandGlow },
    saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
    secondaryButton: {
      paddingVertical: 15, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.canvasLight, marginTop: s.sm,
    },
    secondaryButtonText: { color: c.ink, fontWeight: '700', fontSize: 14 },
  }));

  // FIX: run once on mount. Depending on `refreshProfile` could loop if its identity changes when profile updates.
  useEffect(() => {
    Promise.resolve(refreshProfileRef.current?.()).catch(() => {});
  }, []);

  // Sync the form from the server profile whenever no sheet is open and there are no pending edits.
  useEffect(() => {
    if (sheet !== SHEET.NONE || isDirty) return;
    const next = {
      username: profile?.username || profile?.displayName || user?.displayName || '',
      school: profile?.school || profile?.universityName || profile?.university || '',
      schoolId: profile?.schoolId || profile?.universityId || '',
      department: profile?.department || profile?.departmentName || '',
      departmentId: profile?.departmentId || '',
      faculty: profile?.faculty || '',
      level: profile?.level || '',
      location: profile?.location || '',
      bio: profile?.bio || '',
      gender: profile?.gender || '',
      dateOfBirth: profile?.dateOfBirth || '',
      role: 'university',
    };
    setForm(next);
    setInitialForm(next);
  }, [isDirty, profile, sheet, user]);

  const showStatus = useCallback((next) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatus(next);
  }, []);

  useEffect(() => {
    if (!status) return undefined;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    statusTimerRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        if (isMountedRef.current) setStatus(null);
      });
    }, 3000);
    return () => clearTimeout(statusTimerRef.current);
  }, [status, fadeAnim]);

  useEffect(() => {
    if (!profile) return;
    Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [profile, headerFade]);

  const loadStats = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [listingsSnap, hostelsSnap, groupsSnap, storiesSnap] = await Promise.all([
        getDocs(query(collection(db, COLLECTIONS.studentMarketplace), where('userId', '==', user.uid))),
        getDocs(query(collection(db, COLLECTIONS.hostels), where('userId', '==', user.uid))),
        getDocs(query(collection(db, COLLECTIONS.groups), where('ownerId', '==', user.uid))),
        getDocs(query(collection(db, COLLECTIONS.stories), where('authorId', '==', user.uid))),
      ]);
      if (!isMountedRef.current) return;
      setStats({ listings: listingsSnap.size, hostelListings: hostelsSnap.size, groups: groupsSnap.size, stories: storiesSnap.size });
    } catch {
      /* silent — stats are non-critical */
    } finally {
      if (isMountedRef.current) setStatsLoading(false);
    }
  }, [user?.uid]);

  const loadFriendCount = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const result = await fetchFriendStats(user.uid);
      if (isMountedRef.current) setFriendCount(Number(result?.friendCount) || 0);
    } catch {
      if (isMountedRef.current) setFriendCount(0);
    }
  }, [user?.uid]);

  // FIX: previously depended on the whole `profile` object, refetching on every profile refresh.
  const loadStreakAndChallenge = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [streakData, challenge] = await Promise.all([
        fetchDailyStreak(),
        fetchChallengeStats(profileRef.current || {}),
      ]);
      if (!isMountedRef.current) return;
      setStreakCount(streakData?.streakCount || 0);
      setStreakDates(streakData?.streakDates || []);
      setChallengeStats(challenge);
    } catch {
      /* silent — non-critical */
    }
  }, [user?.uid]);

  useEffect(() => {
    setStatsLoading(true);
    loadStats();
  }, [loadStats]);

  useFocusEffect(
    useCallback(() => {
      loadFriendCount();
    }, [loadFriendCount])
  );

  useEffect(() => {
    loadStreakAndChallenge();
  }, [loadStreakAndChallenge, profile?.uid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        Promise.resolve(refreshProfileRef.current?.()).catch(() => {}),
        loadStats(),
        loadFriendCount(),
        loadStreakAndChallenge(),
        profileView === 'posts' ? loadProfilePosts() : Promise.resolve(),
      ]);
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  }, [loadFriendCount, loadStats, loadStreakAndChallenge, loadProfilePosts, profileView]);

  const initials = useMemo(() => {
    const source = form.username || user?.email || 'S';
    return source.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'S';
  }, [form.username, user?.email]);

  const profilePhoto = profile?.photoURL || profile?.photo || user?.photoURL || '';
  const profilePhotoThumb = profile?.photoThumb || profilePhoto;
  const profileCover = profile?.coverPhoto || profile?.cover || profile?.coverUrl || '';
  const isAdmin =
    profile?.admin === true ||
    user?.email?.trim().toLowerCase() === 'iadejuwon77@gmail.com';
  const totalUploads = stats.listings + stats.hostelListings + stats.stories;

  // Profile completeness meter
  const completion = useMemo(() => {
    const checks = [
      { done: !!profilePhoto, hint: 'Add a profile photo — tap your avatar.' },
      { done: !!profileCover, hint: 'Add a cover photo to make your profile yours.' },
      { done: !!form.username.trim(), hint: 'Add your name.' },
      { done: !!form.bio.trim(), hint: 'Write a short About so people know you.' },
      { done: !!form.school, hint: 'Add your school.' },
      { done: !!form.department, hint: 'Add your department.' },
      { done: !!form.level, hint: 'Add your level.' },
      { done: !!form.location, hint: 'Add your city or campus.' },
      { done: !!form.gender, hint: 'Add your gender.' },
      { done: !!form.dateOfBirth, hint: 'Add your date of birth.' },
    ];
    const doneCount = checks.filter((c) => c.done).length;
    return {
      pct: Math.round((doneCount / checks.length) * 100),
      hint: checks.find((c) => !c.done)?.hint || '',
    };
  }, [form, profilePhoto, profileCover]);

  const infoChips = [
    form.school && { icon: 'school-outline', text: form.school },
    form.department && { icon: 'library-outline', text: form.department },
    form.level && { icon: 'ribbon-outline', text: form.level },
    form.location && { icon: 'location-outline', text: form.location },
  ].filter(Boolean);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  // FIX: closing the sheet now discards unsaved edits (they used to leak into the header and stay "dirty").
  const closeSheet = useCallback((discard = true) => {
    if (discard) setForm(initialFormRef.current);
    setSheet(SHEET.NONE);
    setEditingKey(null);
  }, []);

  const openFieldEditor = (key) => {
    setEditingKey(key);
    setSheet(SHEET.EDIT_FIELD);
    if (key === 'department' && form.schoolId) {
      selectUniversity(form.schoolId);
    }
  };

  const backToEditProfile = () => {
    setEditingKey(null);
    setSheet(SHEET.EDIT_PROFILE);
  };

  const handleSchoolSelect = (item) => {
    setForm((current) => ({
      ...current,
      school: item.name,
      schoolId: item.id,
      department: '',
      departmentId: '',
      faculty: '',
    }));
    selectUniversity(item.id);
    backToEditProfile();
  };

  const handleDepartmentSelect = (item) => {
    setForm((current) => ({
      ...current,
      department: item.name,
      departmentId: item.id || '',
      faculty: item.faculty || '',
    }));
    backToEditProfile();
  };

  const handleLevelSelect = (item) => {
    setField('level', item.value);
    backToEditProfile();
  };

  const editingField = fields.find((f) => f.key === editingKey);

  // Shared picker for profile photo + cover photo.
  const pickImage = async (kind) => {
    const isCover = kind === 'cover';
    if (photoUploading || coverUploading) return;
    const setBusy = isCover ? setCoverUploading : setPhotoUploading;
    const noun = isCover ? 'cover photo' : 'profile photo';
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showStatus({ type: 'error', text: `Photo library access is needed to change your ${noun}. You can enable it in Settings.` });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: isCover ? [16, 9] : [1, 1],
        quality: 0.5,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
        showStatus({ type: 'error', text: 'Image is too large. Please upload an image smaller than 30MB.' });
        return;
      }

      setBusy(true);
      setStatus(null);
      const previousAsset = isCover
        ? profile?.coverAsset || (profileCover ? { url: profileCover, resourceType: 'image' } : null)
        : profile?.photoAsset || (profilePhoto ? { url: profilePhoto, resourceType: 'image' } : null);

      await updateProfilePhoto({ kind, uri: asset.uri });
      await refreshProfileRef.current?.();

      // Best-effort cleanup of the replaced asset; never blocks the success message.
      if (isCover) {
        if (previousAsset?.storageProvider === 'r2' && previousAsset?.publicId) {
          await deleteProfileMedia(previousAsset.publicId).catch((error) => console.warn('[Profile] Failed to delete replaced R2 cover image.', error));
        } else if (previousAsset?.url?.includes('res.cloudinary.com')) {
          await deleteCloudinaryAssets({ assets: [previousAsset] }).catch((error) => console.warn('[Profile] Failed to delete replaced Cloudinary cover image.', error));
        }
      } else if (previousAsset?.storageProvider === 'r2' && previousAsset?.publicId) {
        await deleteProfileMedia(previousAsset.publicId).catch((error) => console.warn('[Profile] Failed to delete replaced R2 profile photo.', error));
      } else if (previousAsset?.url?.includes('res.cloudinary.com')) {
        await deleteCloudinaryAssets({ assets: [previousAsset] }).catch((error) => console.warn('[Profile] Failed to delete replaced Cloudinary profile photo.', error));
      }
      if (isMountedRef.current) showStatus({ type: 'success', text: isCover ? 'Cover photo updated.' : 'Profile photo updated.' });
    } catch (error) {
      if (isMountedRef.current) showStatus({ type: 'error', text: error?.message || `Unable to update your ${noun}. Please try again.` });
    } finally {
      if (isMountedRef.current) setBusy(false);
    }
  };

  const save = async () => {
    const trimmedName = form.username.trim();
    if (!trimmedName) {
      showStatus({ type: 'error', text: 'Your name cannot be empty.' });
      return;
    }
    if (trimmedName.length < 2) {
      showStatus({ type: 'error', text: 'Please enter a name with at least 2 characters.' });
      return;
    }
    if (form.dateOfBirth && !isValidDateOfBirth(form.dateOfBirth)) {
      showStatus({ type: 'error', text: 'Please enter a valid date of birth that is not in the future.' });
      return;
    }
    try {
      setSaving(true);
      setStatus(null);
      await saveUserProfile({
        username: trimmedName, school: form.school.trim(), department: form.department.trim(),
        level: form.level.trim(), location: form.location.trim(), bio: form.bio.trim(), role: form.role,
        schoolId: form.schoolId || '', universityId: form.schoolId || '', universityName: form.school.trim(),
        departmentId: form.departmentId || '', departmentName: form.department.trim(), faculty: form.faculty || '',
        gender: form.gender || '', dateOfBirth: form.dateOfBirth || '',
      });
      initialFormRef.current = form;
      setInitialForm(form);
      await refreshProfileRef.current?.();
      if (!isMountedRef.current) return;
      closeSheet(false);
      showStatus({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      if (isMountedRef.current) showStatus({ type: 'error', text: error?.message || 'Unable to update your profile. Please try again.' });
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const confirmSignOut = () => {
    closeSheet();
    setSignOutConfirmOpen(true);
  };

  const shareProfile = async () => {
    closeSheet();
    try {
      await Share.share({
        message: 'Join me on UniHelp — the all-in-one app for CGPA tracking, JAMB/CBT practice and campus life. Get it at unihelp.ng',
      });
    } catch {
      /* user cancelled — nothing to do */
    }
  };

  const goTo = (path) => {
    closeSheet();
    router.navigate(path);
  };

  const challengeStatCards = challengeStats ? [
    { label: 'XP', value: (challengeStats.xp || 0).toLocaleString(), icon: 'sparkles-outline', color: colors.brand, bg: colors.brandLight },
    { label: 'Streak', value: challengeStats.currentStreak || 0, icon: 'flame-outline', color: colors.orange, bg: colors.orangeLight },
    { label: 'Questions', value: challengeStats.questionsAnswered || 0, icon: 'checkmark-done-outline', color: colors.green, bg: colors.greenLight },
    { label: 'Accuracy', value: `${challengeStats.accuracy || 0}%`, icon: 'analytics-outline', color: colors.teal, bg: colors.tealLight },
  ] : [];

  const uploadStatCards = [
    { label: 'Listings', value: stats.listings, icon: 'storefront-outline', color: colors.orange, bg: colors.orangeLight, path: '/manage/listings' },
    { label: 'Hostels', value: stats.hostelListings, icon: 'home-outline', color: colors.blue, bg: colors.blueLight, path: '/manage/hostels' },
    { label: 'Stories', value: stats.stories, icon: 'book-outline', color: colors.purple, bg: colors.purpleLight, path: '/manage/stories' },
    { label: 'Groups', value: stats.groups, icon: 'people-outline', color: colors.teal, bg: colors.tealLight, path: '/groups' },
  ];

  // ---- Sheet content renderers -------------------------------------------

  const renderMoreSheet = () => (
    <View>
      <Pressable onPress={() => goTo('/notifications')} style={({ pressed }) => [styles.sheetRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Notifications">
        <View style={styles.sheetIconWrap}><Ionicons name="notifications-outline" size={16} color={colors.ink} /></View>
        <Text style={styles.sheetRowTitle}>Notifications</Text>
      </Pressable>
      <View style={styles.sheetDivider} />
      <Pressable onPress={() => setSheet(SHEET.APPEARANCE)} style={({ pressed }) => [styles.sheetRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Appearance">
        <View style={styles.sheetIconWrap}><Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={16} color={colors.ink} /></View>
        <Text style={styles.sheetRowTitle}>Appearance</Text>
      </Pressable>
      <View style={styles.sheetDivider} />
      <Pressable onPress={() => goTo('/support')} style={({ pressed }) => [styles.sheetRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Help and support">
        <View style={styles.sheetIconWrap}><Ionicons name="help-circle-outline" size={16} color={colors.ink} /></View>
        <Text style={styles.sheetRowTitle}>Help & Support</Text>
      </Pressable>
      <Pressable onPress={shareProfile} style={({ pressed }) => [styles.sheetRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Invite a friend">
        <View style={styles.sheetIconWrap}><Ionicons name="person-add-outline" size={16} color={colors.ink} /></View>
        <Text style={styles.sheetRowTitle}>Invite a Friend</Text>
      </Pressable>

      {isAdmin ? (
        <>
          <View style={styles.sheetDivider} />
          <Pressable onPress={() => goTo('/adminpanel')} style={({ pressed }) => [styles.sheetRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Admin panel">
            <View style={styles.sheetIconWrap}><Ionicons name="shield-checkmark-outline" size={16} color={colors.brand} /></View>
            <Text style={styles.sheetRowTitle}>Admin Panel</Text>
          </Pressable>
          <Pressable onPress={() => goTo('/adminpanel/support-center')} style={({ pressed }) => [styles.sheetRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Support center">
            <View style={styles.sheetIconWrap}><Ionicons name="headset-outline" size={16} color={colors.brand} /></View>
            <Text style={styles.sheetRowTitle}>Support Center</Text>
          </Pressable>
        </>
      ) : null}

      <View style={styles.sheetDivider} />
      <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.sheetRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Sign out">
        <View style={[styles.sheetIconWrap, styles.sheetIconWrapDanger]}><Ionicons name="log-out-outline" size={16} color={colors.red} /></View>
        <Text style={[styles.sheetRowTitle, styles.sheetRowTitleDanger]}>Sign out</Text>
      </Pressable>
    </View>
  );

  const renderAppearanceSheet = () => (
    <View style={styles.segmentRow}>
      {THEME_OPTIONS.map((opt) => {
        const active = themeMode === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => setTheme(opt.key)}
            style={[styles.segmentOption, active && styles.segmentOptionActive]}
            accessibilityRole="button"
            accessibilityLabel={`Use ${opt.label} theme`}
            accessibilityState={{ selected: active }}
          >
            <Ionicons name={opt.icon} size={20} color={active ? colors.brandText : colors.grey} />
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderPlanSheet = () => (
    <View>
      <View style={styles.popupStatsGrid}>
        <View style={[styles.popupStatCard, { backgroundColor: premiumActive ? colors.goldLight : colors.canvasLight }]}>
          <Ionicons name={premiumActive ? 'star' : 'star-outline'} size={20} color={premiumActive ? colors.gold : colors.grey} />
          <Text style={[styles.popupStatValue, { color: premiumActive ? colors.gold : colors.ink }]}>
            {premiumActive ? 'Premium' : 'Standard'}
          </Text>
          <Text style={styles.popupStatLabel}>Current Plan</Text>
        </View>
      </View>
      <Text style={styles.planCopy}>
        {premiumActive
          ? 'You have full access to AI tutoring, unlimited CBT mock exams and ad-free browsing.'
          : 'Upgrade to Premium for unlimited AI tutoring sessions, full-length JAMB mock exams and an ad-free experience.'}
      </Text>
      {!premiumActive ? (
        <Pressable onPress={() => goTo('/premium')} style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]} accessibilityRole="button" accessibilityLabel="Upgrade to premium">
          <Ionicons name="sparkles-outline" size={17} color={colors.onBrand} />
          <Text style={styles.saveButtonText}>Upgrade to Premium</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => goTo('/premium')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Manage plan">
          <Text style={styles.secondaryButtonText}>Manage Plan</Text>
        </Pressable>
      )}
    </View>
  );

  const renderProgressSheet = () => (
    <View>
      {challengeStats ? (
        <View style={styles.popupStatsGrid}>
          {challengeStatCards.map((stat) => (
            <View key={stat.label} style={[styles.popupStatCard, { backgroundColor: stat.bg }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
              <Text style={[styles.popupStatValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.popupStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.popupSkeletonRow}>
          {[1, 2].map((i) => <View key={i} style={styles.popupSkeleton} />)}
        </View>
      )}
      <Pressable onPress={() => goTo('/challenge/profile')} style={({ pressed }) => [styles.popupLinkButton, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="View full challenge stats">
        <Text style={styles.popupLinkText}>View Full Stats</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.brandText} />
      </Pressable>
    </View>
  );

  const renderUploadsSheet = () => (
    <View>
      {statsLoading ? (
        <View style={styles.popupSkeletonRow}>
          {[1, 2].map((i) => <View key={i} style={styles.popupSkeleton} />)}
        </View>
      ) : (
        <View style={styles.popupStatsGrid}>
          {uploadStatCards.map((stat) => (
            <Pressable
              key={stat.label}
              onPress={() => goTo(stat.path)}
              style={({ pressed }) => [styles.popupStatCard, { backgroundColor: stat.bg }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Manage my ${stat.label.toLowerCase()}`}
            >
              <Ionicons name={stat.icon} size={18} color={stat.color} />
              <Text style={[styles.popupStatValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.popupStatLabel}>{stat.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const doneButton = (
    <Pressable onPress={backToEditProfile} style={({ pressed }) => [styles.secondaryButton, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Done">
      <Text style={styles.secondaryButtonText}>Done</Text>
    </Pressable>
  );

  const renderFieldEditor = () => {
    if (editingKey === 'school') {
      return (
        <>
          <SchoolTypeFilter value={schoolType} onChange={setSchoolType} />
          <SearchableDropdown
            label="School"
            placeholder="Search for your school..."
            data={universities}
            value={form.schoolId || ''}
            onSelect={handleSchoolSelect}
            loading={ul}
            searchText={us}
            onSearchChange={sus}
            onLoadMore={lmu}
            icon="school-outline"
            renderItemLabel={(i) => (i.shortName ? `${i.name} (${i.shortName})` : i.name)}
          />
        </>
      );
    }
    if (editingKey === 'department') {
      const deptValue = form.departmentId || (form.department ? departments.find((d) => d.name === form.department)?.id || '' : '');
      return (
        <SearchableDropdown
          label="Department"
          placeholder="Search for your department..."
          data={departments}
          value={deptValue}
          onSelect={handleDepartmentSelect}
          loading={dl}
          searchText={ds}
          onSearchChange={sds}
          icon="library-outline"
          renderItemLabel={(i) => `${i.name}${i.faculty ? ` (${i.faculty})` : ''}`}
        />
      );
    }
    if (editingKey === 'level') {
      const levelData = ACADEMIC_LEVELS.map((l, i) => ({ id: `level-${i}`, name: l.label, value: l.value }));
      const levelIndex = ACADEMIC_LEVELS.findIndex((l) => l.value === form.level);
      return (
        <SearchableDropdown
          label="Level"
          placeholder="Select your level..."
          data={levelData}
          value={levelIndex >= 0 ? `level-${levelIndex}` : ''}
          onSelect={(item) => handleLevelSelect({ value: item.value })}
          icon="ribbon-outline"
          renderItemLabel={(i) => i.name}
        />
      );
    }
    if (editingKey === 'gender') {
      return (
        <View style={{ gap: 12 }}>
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderOptions}>
            {GENDER_OPTIONS.map((option) => {
              const selected = form.gender === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setField('gender', selected ? '' : option.value)}
                  style={({ pressed }) => [styles.genderOption, selected && styles.genderOptionSelected, pressed && styles.rowPressed]}
                >
                  <Text style={[styles.genderOptionText, selected && styles.genderOptionTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {doneButton}
        </View>
      );
    }
    if (editingKey === 'dateOfBirth') {
      return (
        <DateOfBirthPicker
          value={form.dateOfBirth}
          onConfirm={(next) => {
            setField('dateOfBirth', next);
            backToEditProfile();
          }}
          onClear={() => {
            setField('dateOfBirth', '');
            backToEditProfile();
          }}
          onCancel={backToEditProfile}
        />
      );
    }
    // FIX: removed `onBlur={backToEditProfile}` — it fired when the sheet was dragged closed (re-opening the
    // Edit Profile sheet) and double-fired alongside the Done button.
    return (
      <View style={{ gap: 6 }}>
        <Text style={styles.fieldLabel}>{editingField?.label}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            autoFocus
            value={form[editingKey] || ''}
            onChangeText={(v) => setField(editingKey, v)}
            placeholder={editingField?.placeholder}
            placeholderTextColor={colors.greyLight}
            style={[styles.fieldInput, editingField?.multiline && styles.fieldInputArea]}
            multiline={editingField?.multiline}
            maxLength={editingField?.maxLength}
            accessibilityLabel={editingField?.label}
            returnKeyType={editingField?.multiline ? 'default' : 'done'}
            blurOnSubmit={!editingField?.multiline}
            onSubmitEditing={editingField?.multiline ? undefined : backToEditProfile}
          />
        </View>
        {editingField?.maxLength ? (
          <Text style={styles.charCount}>{(form[editingKey]?.length || 0)}/{editingField.maxLength}</Text>
        ) : null}
        {doneButton}
      </View>
    );
  };

  const renderEditProfileSheet = () => (
    <View>
      {fields.map((field, idx) => {
        const hasValue = !!form[field.key];
        const displayValue = field.key === 'gender'
          ? GENDER_OPTIONS.find((option) => option.value === form.gender)?.label || ''
          : field.key === 'dateOfBirth'
            ? formatShortDate(form.dateOfBirth)
            : form[field.key];
        return (
          <Pressable
            key={field.key}
            onPress={() => openFieldEditor(field.key)}
            style={({ pressed }) => [styles.editFieldRow, idx !== fields.length - 1 && styles.rowDivider, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${field.label}`}
            accessibilityValue={{ text: hasValue ? displayValue : 'Not set' }}
          >
            <View style={styles.sheetIconWrap}>
              <Ionicons name={field.icon} size={15} color={colors.brand} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={[styles.fieldValue, !hasValue && styles.fieldValueEmpty]} numberOfLines={field.multiline ? 2 : 1}>
                {hasValue ? displayValue : field.placeholder}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
          </Pressable>
        );
      })}

      <Pressable
        style={({ pressed }) => [styles.saveButton, { marginTop: 14 }, (!isDirty || saving) && styles.saveButtonDisabled, pressed && isDirty && !saving && styles.saveButtonPressed]}
        onPress={save}
        disabled={saving || !isDirty}
        accessibilityRole="button"
        accessibilityLabel="Save changes"
        accessibilityState={{ disabled: saving || !isDirty, busy: saving }}
      >
        {saving ? <ActivityIndicator color="#fff" /> : (
          <><Ionicons name="checkmark-outline" size={17} color={colors.onBrand} /><Text style={styles.saveButtonText}>{isDirty ? 'Save changes' : 'No changes to save'}</Text></>
        )}
      </Pressable>
    </View>
  );

  // ---- Sheet chrome (title/subtitle/back) --------------------------------

  const sheetMeta = {
    [SHEET.MORE]: { title: 'More', subtitle: 'Account & app settings' },
    [SHEET.APPEARANCE]: { title: 'Appearance', subtitle: 'Choose how UniHelp looks' },
    [SHEET.PLAN]: { title: 'My Plan', subtitle: premiumActive ? 'Premium member' : 'Standard member' },
    [SHEET.PROGRESS]: { title: 'My Progress', subtitle: 'Challenge stats & streak' },
    [SHEET.UPLOADS]: { title: 'My Uploads', subtitle: `${totalUploads} item${totalUploads === 1 ? '' : 's'} across UniHelp` },
    [SHEET.EDIT_PROFILE]: { title: 'Edit Profile', subtitle: 'Tap a field to update it' },
    [SHEET.EDIT_FIELD]: { title: editingField?.label || 'Edit', subtitle: editingKey === 'dateOfBirth' ? 'Scroll each wheel to choose' : null },
  };

  const activeMeta = sheetMeta[sheet] || {};

  const renderProfilePosts = () => {
    if (profilePostsLoading) {
      return <View style={styles.postsState}><ActivityIndicator color={colors.brand} /><Text style={styles.postsStateText}>Loading your posts...</Text></View>;
    }
    if (!profilePosts.length) {
      return <View style={styles.postsState}><Ionicons name="newspaper-outline" size={34} color={colors.greyLight} /><Text style={styles.postsStateText}>You have not posted anything yet.</Text></View>;
    }
    return profilePosts.map((post) => (
      <View key={post.id} style={styles.postCard}>
        {post.type === 'colored' ? (
          <View style={[styles.postColored, { backgroundColor: POST_PRESET_COLORS[post.backgroundPreset] || POST_PRESET_COLORS.indigo }]}>
            <Text style={styles.postColoredText}>{post.content}</Text>
          </View>
        ) : null}
        {post.type === 'image' && post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} contentFit="cover" /> : null}
        <View style={styles.postBody}>
          {post.type !== 'colored' && post.content ? <Text style={styles.postText}>{post.content}</Text> : null}
          <Text style={styles.timeText}>{formatPostDate(post.createdAt)}</Text>
          <View style={styles.postMeta}>
            <Text style={styles.postMetaText}>Likes {post.likesCount || 0}</Text>
            <Text style={styles.postMetaText}>Comments {post.commentsCount || 0}</Text>
            <Text style={styles.postMetaText}>Views {post.viewsCount || 0}</Text>
          </View>
        </View>
      </View>
    ));
  };

  return (
    <ScreenShell title="Profile" subtitle="University student" showBack>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => setSheet(SHEET.MORE)}
            style={({ pressed }) => [styles.moreButton, pressed && styles.moreButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-vertical" size={18} color={colors.ink} />
          </Pressable>
        </View>

        {/* IDENTITY HEADER */}
        <Animated.View style={[styles.identity, { opacity: headerFade }]}>
          <Pressable
            style={styles.coverWrap}
            onPress={() => pickImage('cover')}
            disabled={coverUploading}
            accessibilityRole="button"
            accessibilityLabel="Change cover photo"
          >
            {profileCover ? (
              <>
                <Image source={{ uri: profileCover }} style={styles.coverImage} contentFit="cover" />
                <View style={styles.coverScrim} pointerEvents="none" />
              </>
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={26} color={colors.brandText} />
                <Text style={styles.coverPlaceholderText}>Add a cover photo</Text>
              </View>
            )}
            <View style={styles.coverBadge}>
              <Ionicons name="camera-outline" size={16} color={colors.onBrand} />
            </View>
            {coverUploading ? (
              <View style={styles.coverSpinner}><ActivityIndicator color={colors.onBrand} /></View>
            ) : null}
          </Pressable>

          <Pressable
            disabled={photoUploading}
            onPress={() => pickImage('photo')}
            style={styles.avatarWrap}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <EvosAura size={AVATAR_SIZE} active={premiumActive || profile?.role === 'admin'}>
              <View style={styles.avatar}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhotoThumb }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
                {photoUploading ? (
                  <View style={styles.avatarSpinnerOverlay}>
                    <ActivityIndicator color={colors.onBrand} />
                  </View>
                ) : null}
              </View>
            </EvosAura>
            <View style={styles.avatarBadge}>
              <Ionicons name="camera-outline" size={13} color={colors.onBrand} />
            </View>
          </Pressable>

          <View style={styles.identityTextWrap}>
            <View style={styles.identityNameRow}>
              <Text style={styles.identityName} numberOfLines={1}>{form.username || 'Student profile'}</Text>
              {premiumActive ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.brand} accessibilityLabel="Verified Premium student" />
              ) : null}
            </View>
            <Text style={styles.identityEmail} numberOfLines={1}>{user?.email || 'No email available'}</Text>
          </View>

          <View style={styles.pillsRow}>
            <Pressable onPress={() => setSheet(SHEET.PLAN)} style={[styles.pill, premiumActive ? styles.pillGold : styles.pillMuted]} accessibilityRole="button" accessibilityLabel="View plan details">
              <Ionicons name={premiumActive ? 'star' : 'star-outline'} size={12} color={premiumActive ? colors.gold : colors.grey} />
              <Text style={[styles.pillText, premiumActive ? styles.pillTextGold : styles.pillTextMuted]}>
                {premiumActive ? 'Premium' : 'Standard'}
              </Text>
            </Pressable>
            {isAdmin ? (
              <Pressable style={styles.pill} onPress={handleAdminBadgePress}>
                <Ionicons name="shield-checkmark" size={12} color={colors.brandText} />
                <Text style={styles.pillText}>Admin</Text>
              </Pressable>
            ) : null}
            {challengeStats?.rank ? (
              <Pressable onPress={() => setSheet(SHEET.PROGRESS)} style={[styles.pill, { backgroundColor: colors.orangeLight }]} accessibilityRole="button" accessibilityLabel="View progress">
                <Ionicons name="flame-outline" size={12} color={colors.orange} />
                <Text style={[styles.pillText, { color: colors.orange }]}>{challengeStats.rank}</Text>
              </Pressable>
            ) : null}
          </View>

          {infoChips.length ? (
            <View style={styles.chipsRow}>
              {infoChips.map((chip) => (
                <View key={chip.icon} style={styles.infoChip}>
                  <Ionicons name={chip.icon} size={12} color={colors.grey} />
                  <Text style={styles.infoChipText} numberOfLines={1}>{chip.text}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>

        {/* FIX: toast moved above the tabs so errors (e.g. photo upload) are visible in both views. */}
        {status ? (
          <Animated.View style={[styles.toast, status.type === 'error' ? styles.toastError : styles.toastSuccess, { opacity: fadeAnim }]} accessibilityRole="alert">
            <Ionicons name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={16} color={status.type === 'error' ? colors.rose : colors.teal} />
            <Text style={[styles.toastText, status.type === 'error' ? styles.toastTextError : styles.toastTextSuccess]}>{status.text}</Text>
          </Animated.View>
        ) : null}

        <View style={styles.profileTabs}>
          <Pressable
            onPress={() => setProfileView('profile')}
            style={[styles.profileTab, profileView === 'profile' && styles.profileTabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: profileView === 'profile' }}
          >
            <Ionicons name="person-outline" size={16} color={profileView === 'profile' ? colors.onBrand : colors.textSecondary} />
            <Text style={[styles.profileTabText, profileView === 'profile' && styles.profileTabTextActive]}>Profile</Text>
          </Pressable>
          <Pressable
            onPress={() => setProfileView('posts')}
            style={[styles.profileTab, profileView === 'posts' && styles.profileTabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: profileView === 'posts' }}
          >
            <Ionicons name="newspaper-outline" size={16} color={profileView === 'posts' ? colors.onBrand : colors.textSecondary} />
            <Text style={[styles.profileTabText, profileView === 'posts' && styles.profileTabTextActive]}>Posted Feed</Text>
          </Pressable>
        </View>

        {profileView === 'posts' ? renderProfilePosts() : (
          <>
            <View style={styles.statsStrip}>
              <Pressable
                style={({ pressed }) => [styles.statCell, pressed && styles.rowPressed]}
                onPress={() => router.navigate('/friends')}
                accessibilityRole="button"
                accessibilityLabel={`${friendCount} friends, open friends list`}
              >
                <Text style={styles.statValue}>{friendCount}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </Pressable>
              <View style={styles.statDivider} />
              <Pressable
                style={({ pressed }) => [styles.statCell, pressed && styles.rowPressed]}
                onPress={() => router.navigate('/streak')}
                accessibilityRole="button"
                accessibilityLabel={`${streakCount} day streak`}
              >
                <Text style={styles.statValue}>{streakCount}</Text>
                <Text style={styles.statLabel}>Day streak</Text>
              </Pressable>
              <View style={styles.statDivider} />
              <Pressable
                style={({ pressed }) => [styles.statCell, pressed && styles.rowPressed]}
                onPress={() => setSheet(SHEET.PROGRESS)}
                accessibilityRole="button"
                accessibilityLabel="View progress"
              >
                <Text style={styles.statValue}>{(challengeStats?.xp || 0).toLocaleString()}</Text>
                <Text style={styles.statLabel}>XP</Text>
              </Pressable>
            </View>

            {completion.pct < 100 ? (
              <Pressable
                onPress={() => setSheet(SHEET.EDIT_PROFILE)}
                style={({ pressed }) => [styles.completionCard, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Profile ${completion.pct} percent complete. Open edit profile`}
              >
                <View style={styles.completionTop}>
                  <Text style={styles.completionTitle}>Profile {completion.pct}% complete</Text>
                  <Text style={styles.completionAction}>Finish up</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${completion.pct}%` }]} />
                </View>
                <Text style={styles.completionHint}>{completion.hint}</Text>
              </Pressable>
            ) : null}

            {form.bio.trim() ? (
              <View style={styles.bioCard}>
                <View style={styles.bioHeader}>
                  <Text style={styles.bioTitle}>About</Text>
                  <Pressable onPress={() => { setSheet(SHEET.EDIT_PROFILE); openFieldEditor('bio'); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit About">
                    <Text style={styles.bioEdit}>Edit</Text>
                  </Pressable>
                </View>
                <Text style={styles.bioText}>{form.bio.trim()}</Text>
              </View>
            ) : null}

            <DailyStreakBanner
              streakCount={streakCount}
              streakDates={streakDates}
              onPress={() => router.navigate('/streak')}
              onStudyNow={() => router.navigate('/streak')}
            />

            <Text style={styles.groupLabel}>Account</Text>
            <View style={styles.groupCard}>
              <Pressable onPress={() => setSheet(SHEET.EDIT_PROFILE)} style={({ pressed }) => [styles.listRow, styles.rowDivider, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Edit profile">
                <View style={styles.rowIconSm}><Ionicons name="create-outline" size={17} color={colors.brand} /></View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Edit Profile</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>{form.school || form.department || 'Add your details'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
              </Pressable>

              <Pressable onPress={() => setSheet(SHEET.PLAN)} style={({ pressed }) => [styles.listRow, styles.rowDivider, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="My plan">
                <View style={[styles.rowIconSm, { backgroundColor: colors.goldLight }]}><Ionicons name="star-outline" size={17} color={colors.gold} /></View>
                <Text style={[styles.rowTitle, { flex: 1 }]}>My Plan</Text>
                <Text style={styles.rowTrailingText}>{premiumActive ? 'Premium' : 'Standard'}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
              </Pressable>

              <Pressable onPress={() => setSheet(SHEET.PROGRESS)} style={({ pressed }) => [styles.listRow, styles.rowDivider, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="My progress">
                <View style={[styles.rowIconSm, { backgroundColor: colors.orangeLight }]}><Ionicons name="flash-outline" size={17} color={colors.orange} /></View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>My Progress</Text>
                  <Text style={styles.rowSubtitle}>{streakCount > 0 ? `${streakCount} day streak` : 'XP, streak & accuracy'}</Text>
                </View>
                {streakCount > 0 ? (
                  <View style={styles.rowBadge}><Text style={styles.rowBadgeText}>{streakCount}🔥</Text></View>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
              </Pressable>

              <Pressable onPress={() => setSheet(SHEET.UPLOADS)} style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="My uploads">
                <View style={[styles.rowIconSm, { backgroundColor: colors.blueLight }]}><Ionicons name="cloud-upload-outline" size={17} color={colors.blue} /></View>
                <Text style={[styles.rowTitle, { flex: 1 }]}>My Uploads</Text>
                {!statsLoading ? <Text style={styles.rowTrailingText}>{totalUploads}</Text> : <ActivityIndicator size="small" color={colors.brand} style={{ marginRight: 4 }} />}
                <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
              </Pressable>
            </View>

            <Text style={styles.groupLabel}>Danger zone</Text>
            <View style={styles.groupCard}>
              <Pressable onPress={() => router.navigate('/profile/danger')} style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Open danger zone">
                <View style={[styles.rowIconSm, styles.rowIconDanger]}><Ionicons name="person-remove-outline" size={17} color={colors.red} /></View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: colors.red }]}>Delete Account</Text>
                  <Text style={styles.rowSubtitle}>Delete account and activity history</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
              </Pressable>
            </View>

            <Footer
              title="Unihelp"
              tagline="Study made simple"
              sections={PROFILE_FOOTER_SECTIONS}
              socialLinks={PROFILE_SOCIAL_LINKS}
              version="v1.0.2"
            />
          </>
        )}
      </ScrollView>

      {/* SINGLE SHARED SHEET — content swaps based on `sheet` */}
      <DraggableBottomSheet
        visible={sheet !== SHEET.NONE}
        onClose={() => closeSheet()}
        title={activeMeta.title}
        subtitle={activeMeta.subtitle}
        onBack={sheet === SHEET.EDIT_FIELD ? backToEditProfile : undefined}
      >
        {sheet === SHEET.MORE && renderMoreSheet()}
        {sheet === SHEET.APPEARANCE && renderAppearanceSheet()}
        {sheet === SHEET.PLAN && renderPlanSheet()}
        {sheet === SHEET.PROGRESS && renderProgressSheet()}
        {sheet === SHEET.UPLOADS && renderUploadsSheet()}
        {sheet === SHEET.EDIT_PROFILE && renderEditProfileSheet()}
        {sheet === SHEET.EDIT_FIELD && renderFieldEditor()}
      </DraggableBottomSheet>
      <ConfirmDialog
        visible={signOutConfirmOpen}
        title="Sign out?"
        message="You'll need to sign back in to access your account."
        confirmLabel="Sign out"
        variant="destructive"
        icon="log-out-outline"
        onCancel={() => setSignOutConfirmOpen(false)}
        onConfirm={() => {
          setSignOutConfirmOpen(false);
          logout();
        }}
      />
    </ScreenShell>
  );
}