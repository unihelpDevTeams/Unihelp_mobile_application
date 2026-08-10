import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { spacing } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import DailyStreakBanner from '../../src/shared/components/DailyStreakBanner';
import DraggableBottomSheet from '../../src/shared/components/DraggableBottomSheet';
import SchoolTypeFilter from '../../src/shared/components/SchoolTypeFilter';
import SearchableDropdown from '../../src/signup/components/SearchableDropdown';
import { useUniversities } from '../../src/signup/hooks/useUniversities';
import { useDepartments } from '../../src/signup/hooks/useDepartments';
import { ACADEMIC_LEVELS } from '../../src/signup/validation';
import { useAuth } from '../../context/AuthContext';
import { saveUserProfile, fetchDailyStreak } from '../../services/firestoreSync';
import { uploadToCloudinary } from '../../services/cloudinary';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';
import { fetchChallengeStats } from './../../src/shared/challenge/service';

const BIO_MAX_LENGTH = 160;

// Fields shown together inside the single "Edit Profile" sheet, in order.
const fields = [
  { key: 'username', label: 'Name', placeholder: 'Add your name', icon: 'person-outline' },
  { key: 'bio', label: 'About', placeholder: 'Tell others a little about yourself', icon: 'chatbubble-ellipses-outline', multiline: true, maxLength: BIO_MAX_LENGTH },
  { key: 'school', label: 'School', placeholder: 'Add your school', icon: 'school-outline' },
  { key: 'department', label: 'Department', placeholder: 'Add your department', icon: 'library-outline' },
  { key: 'level', label: 'Level', placeholder: 'e.g. 200L', icon: 'ribbon-outline' },
  { key: 'location', label: 'Location', placeholder: 'Add your city or campus', icon: 'location-outline' },
];

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const emptyForm = {
  username: '', school: '', schoolId: '', department: '', level: '', location: '', bio: '', role: 'university',
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
  const [stats, setStats] = useState({ listings: 0, hostelListings: 0, groups: 0, stories: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [streakCount, setStreakCount] = useState(0);
  const [streakDates, setStreakDates] = useState([]);
  const [challengeStats, setChallengeStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const statusTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const styles = useThemeStyles((c, s, r) => ({
    scrollContent: { paddingBottom: 32 },

    // Header bar with the overflow (⋮) trigger
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.xs, marginBottom: spacing.xs },
    moreButton: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight,
    },
    moreButtonPressed: { backgroundColor: c.canvasLight },

    identity: { alignItems: 'center', paddingVertical: s.lg, marginBottom: s.md },
    avatarWrap: { position: 'relative', marginBottom: s.md },
    avatar: {
      width: 88, height: 88, borderRadius: 44, backgroundColor: c.brand,
      alignItems: 'center', justifyContent: 'center',
      ...Platform.select({
        ios: { shadowColor: c.brandText, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
        android: { elevation: 4 },
      }),
    },
    avatarText: { color: c.onBrand, fontSize: 30, fontWeight: '800' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 44 },
    avatarSpinnerOverlay: {
      ...StyleSheet.absoluteFillObject, borderRadius: 44,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarBadge: {
      position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14,
      backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: c.canvasLight,
    },
    identityTextWrap: { alignItems: 'center', marginBottom: s.sm },
    identityName: { fontSize: 19, fontWeight: '800', color: c.ink, maxWidth: '85%', textAlign: 'center' },
    identityEmail: { marginTop: s.xs, fontSize: 13, color: c.grey, maxWidth: '85%', textAlign: 'center' },

    // Plan / rank pills under the email
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

    toast: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, borderRadius: r.md, borderWidth: 1,
      paddingHorizontal: s.md, paddingVertical: s.sm, marginBottom: s.lg,
    },
    toastSuccess: { backgroundColor: c.greenLight, borderColor: c.greenLight },
    toastError: { backgroundColor: c.redLight, borderColor: c.redBorder },
    toastText: { flex: 1, fontSize: 12.5, fontWeight: '600' },
    toastTextSuccess: { color: c.teal },
    toastTextError: { color: c.rose },

    groupLabel: {
      fontSize: 11.5, fontWeight: '800', color: c.greyLight, letterSpacing: 0.6,
      marginBottom: s.sm, marginTop: 6, marginLeft: s.xs,
    },
    groupCard: {
      backgroundColor: c.surface, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderLight,
      marginBottom: s.lg, overflow: 'hidden',
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: c.skeleton },
    rowPressed: { backgroundColor: c.canvasLight },

    // Primary list row (matches the reference screenshot's row rhythm)
    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: s.md, paddingHorizontal: s.lg, gap: s.md, minHeight: 58 },
    rowIconSm: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    rowIconDanger: { backgroundColor: c.redLight },
    rowTextWrap: { flex: 1 },
    rowTitle: { fontSize: 14.5, fontWeight: '700', color: c.ink },
    rowSubtitle: { marginTop: 2, fontSize: 12, color: c.grey },
    rowTrailingText: { fontSize: 13, fontWeight: '700', color: c.brandText, marginRight: 2 },
    rowBadge: {
      backgroundColor: c.orangeLight, borderRadius: r.full, paddingHorizontal: 8, paddingVertical: 3, marginRight: 2,
    },
    rowBadgeText: { fontSize: 11, fontWeight: '800', color: c.orange },

    // Overflow / sheet content rows (used inside DraggableBottomSheet)
    sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: s.md },
    sheetRowDanger: {},
    sheetRowTitle: { fontSize: 14.5, fontWeight: '700', color: c.ink },
    sheetRowTitleDanger: { color: c.red },
    sheetDivider: { height: 1, backgroundColor: c.skeleton, marginVertical: 2 },
    sheetIconWrap: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.canvasLight, alignItems: 'center', justifyContent: 'center' },
    sheetIconWrapDanger: { backgroundColor: c.redLight },

    // Popup stat grid (Progress / Uploads sheets)
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

    // Appearance segmented control
    segmentRow: { flexDirection: 'row', gap: s.sm },
    segmentOption: {
      flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: r.lg,
      backgroundColor: c.canvasLight, borderWidth: 1, borderColor: 'transparent',
    },
    segmentOptionActive: { backgroundColor: c.brandLight, borderColor: c.brand },
    segmentLabel: { fontSize: 12, fontWeight: '700', color: c.grey },
    segmentLabelActive: { color: c.brandText },

    // Field editor (inside Edit Profile sheet)
    editFieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: s.md, gap: s.md, minHeight: 54 },
    fieldLabel: { fontSize: 11.5, fontWeight: '700', color: c.greyLight, marginBottom: s.xs },
    fieldValue: { fontSize: 14.5, color: c.ink, fontWeight: '600' },
    fieldValueEmpty: { color: c.greyLight, fontWeight: '400' },
    fieldInput: { fontSize: 14.5, color: c.ink, fontWeight: '600', padding: 0, margin: 0 },
    fieldInputArea: { minHeight: 40, textAlignVertical: 'top' },
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

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

  useEffect(() => {
    const next = {
      username: profile?.username || user?.displayName || '',
      school: profile?.universityName || '',
      schoolId: profile?.universityId || '',
      department: profile?.departmentName || '',
      level: profile?.level || '',
      location: profile?.location || '',
      bio: profile?.bio || '',
      role: 'university',
    };
    setForm(next);
    setInitialForm(next);
  }, [profile, user]);

  const showStatus = useCallback((next) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatus(next);
  }, []);

  useEffect(() => {
    if (!status) return;
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

  const loadStreakAndChallenge = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [streakData, challenge] = await Promise.all([
        fetchDailyStreak(),
        fetchChallengeStats(profile || {}),
      ]);
      if (!isMountedRef.current) return;
      setStreakCount(streakData?.streakCount || 0);
      setStreakDates(streakData?.streakDates || []);
      setChallengeStats(challenge);
    } catch {
      /* silent — non-critical */
    }
  }, [user?.uid, profile]);

  useEffect(() => {
    setStatsLoading(true);
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadStreakAndChallenge();
  }, [loadStreakAndChallenge]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshProfile().catch(() => {}),
        loadStats(),
        loadStreakAndChallenge(),
      ]);
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  }, [refreshProfile, loadStats, loadStreakAndChallenge]);

  const isDirty = useMemo(
    () => Object.keys(form).some((key) => form[key] !== initialForm[key]),
    [form, initialForm]
  );

  const initials = useMemo(() => {
    const source = form.username || user?.email || 'S';
    return source.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'S';
  }, [form.username, user?.email]);

  const profilePhoto = profile?.photo || user?.photoURL || '';
  const isAdmin = profile?.admin === true;
  const totalUploads = stats.listings + stats.hostelListings + stats.stories;

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const closeSheet = () => {
    setSheet(SHEET.NONE);
    setEditingKey(null);
  };

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
    setField('school', item.name);
    setField('schoolId', item.id);
    setField('department', '');
    selectUniversity(item.id);
    backToEditProfile();
  };

  const handleDepartmentSelect = (item) => {
    setField('department', item.name);
    backToEditProfile();
  };

  const handleLevelSelect = (item) => {
    setField('level', item.value);
    backToEditProfile();
  };

  const editingField = fields.find((f) => f.key === editingKey);

  const pickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showStatus({ type: 'error', text: 'Photo library access is needed to change your profile photo. You can enable it in Settings.' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setPhotoUploading(true);
      setStatus(null);
      const uploaded = await uploadToCloudinary(
        { uri: result.assets[0].uri, name: `${(form.username || user?.email || 'profile').trim().replace(/\s+/g, '-').toLowerCase() || 'profile'}.jpg`, type: 'image/jpeg' },
        { resourceType: 'image', validationKind: 'image' }
      );
      const nextPhoto = uploaded?.secure_url || '';
      const currentPhoto = profile?.photo || user?.photoURL;
      if (currentPhoto && currentPhoto.includes('res.cloudinary.com')) {
        try {
          const { deleteCloudinaryAssets } = await import('../../services/mediaCleanup');
          await deleteCloudinaryAssets({ urls: [currentPhoto] });
        } catch (cleanupError) {
          console.log('Profile photo cleanup (non-blocking):', cleanupError?.message);
        }
      }
      await updateFirebaseAuthProfile(user, { photoURL: nextPhoto || null });
      await saveUserProfile({ photo: nextPhoto || '' });
      await refreshProfile();
      if (isMountedRef.current) showStatus({ type: 'success', text: 'Profile photo updated.' });
    } catch (error) {
      if (isMountedRef.current) showStatus({ type: 'error', text: error?.message || 'Unable to update your profile photo. Please try again.' });
    } finally {
      if (isMountedRef.current) setPhotoUploading(false);
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
    try {
      setSaving(true);
      setStatus(null);
      await saveUserProfile({
        username: trimmedName, school: form.school.trim(), department: form.department.trim(),
        level: form.level.trim(), location: form.location.trim(), bio: form.bio.trim(), role: form.role,
        universityId: form.schoolId || '', universityName: form.school.trim(),
      });
      await refreshProfile();
      if (!isMountedRef.current) return;
      closeSheet();
      showStatus({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      if (isMountedRef.current) showStatus({ type: 'error', text: error?.message || 'Unable to update your profile. Please try again.' });
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const confirmSignOut = () => {
    closeSheet();
    Alert.alert('Sign out', 'You\u2019ll need to sign back in to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const shareProfile = async () => {
    closeSheet();
    try {
      await Share.share({
        message: `Join me on UniHelp — the all-in-one app for CGPA tracking, JAMB/CBT practice and campus life. Get it at unihelp.ng`,
      });
    } catch {
      /* user cancelled — nothing to do */
    }
  };

  const goTo = (path) => {
    closeSheet();
    router.push(path);
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
        <View style={[styles.popupStatCard, { backgroundColor: profile?.premium ? colors.goldLight : colors.canvasLight }]}>
          <Ionicons name={profile?.premium ? 'star' : 'star-outline'} size={20} color={profile?.premium ? colors.gold : colors.grey} />
          <Text style={[styles.popupStatValue, { color: profile?.premium ? colors.gold : colors.ink }]}>
            {profile?.premium ? 'Premium' : 'Standard'}
          </Text>
          <Text style={styles.popupStatLabel}>Current Plan</Text>
        </View>
      </View>
      <Text style={{ color: colors.grey, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
        {profile?.premium
          ? 'You have full access to AI tutoring, unlimited CBT mock exams and ad-free browsing.'
          : 'Upgrade to Premium for unlimited AI tutoring sessions, full-length JAMB mock exams and an ad-free experience.'}
      </Text>
      {!profile?.premium ? (
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
      const deptValue = form.department ? departments.find((d) => d.name === form.department)?.id || '' : '';
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
      const levelValue = form.level ? `level-${ACADEMIC_LEVELS.findIndex((l) => l.value === form.level)}` : '';
      return (
        <SearchableDropdown
          label="Level"
          placeholder="Select your level..."
          data={levelData}
          value={levelValue}
          onSelect={(item) => handleLevelSelect({ value: item.value })}
          icon="ribbon-outline"
          renderItemLabel={(i) => i.name}
        />
      );
    }
    return (
      <View style={{ gap: 6 }}>
        <Text style={styles.fieldLabel}>{editingField?.label}</Text>
        <TextInput
          autoFocus
          value={form[editingKey]}
          onChangeText={(v) => setField(editingKey, v)}
          placeholder={editingField?.placeholder}
          placeholderTextColor={colors.greyLight}
          style={[styles.fieldInput, editingField?.multiline && styles.fieldInputArea]}
          multiline={editingField?.multiline}
          maxLength={editingField?.maxLength}
          accessibilityLabel={editingField?.label}
          onBlur={editingField?.multiline ? undefined : backToEditProfile}
          returnKeyType={editingField?.multiline ? 'default' : 'done'}
          onSubmitEditing={editingField?.multiline ? undefined : backToEditProfile}
        />
        {editingField?.maxLength ? (
          <Text style={styles.charCount}>{(form[editingKey]?.length || 0)}/{editingField.maxLength}</Text>
        ) : null}
        <Pressable onPress={backToEditProfile} style={({ pressed }) => [styles.secondaryButton, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Done">
          <Text style={styles.secondaryButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  };

  const renderEditProfileSheet = () => (
    <View>
      {fields.map((field, idx) => {
        const hasValue = !!form[field.key];
        return (
          <Pressable
            key={field.key}
            onPress={() => openFieldEditor(field.key)}
            style={({ pressed }) => [styles.editFieldRow, idx !== fields.length - 1 && styles.sheetDivider, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${field.label}`}
            accessibilityValue={{ text: hasValue ? form[field.key] : 'Not set' }}
          >
            <View style={styles.sheetIconWrap}>
              <Ionicons name={field.icon} size={15} color={colors.brand} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text style={[styles.fieldValue, !hasValue && styles.fieldValueEmpty]} numberOfLines={field.multiline ? 2 : 1}>
                {hasValue ? form[field.key] : field.placeholder}
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
    [SHEET.PLAN]: { title: 'My Plan', subtitle: profile?.premium ? 'Premium member' : 'Standard member' },
    [SHEET.PROGRESS]: { title: 'My Progress', subtitle: 'Challenge stats & streak' },
    [SHEET.UPLOADS]: { title: 'My Uploads', subtitle: `${totalUploads} item${totalUploads === 1 ? '' : 's'} across UniHelp` },
    [SHEET.EDIT_PROFILE]: { title: 'Edit Profile', subtitle: 'Tap a field to update it' },
    [SHEET.EDIT_FIELD]: { title: editingField?.label || 'Edit', subtitle: null },
  };

  const activeMeta = sheetMeta[sheet] || {};

  return (
    <ScreenShell title="Profile" subtitle="University student" showBack>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* TOP BAR — overflow menu replaces the old always-visible theme toggle */}
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
            style={styles.avatarWrap}
            onPress={pickPhoto}
            disabled={photoUploading}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <View style={styles.avatar}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
              {photoUploading ? (
                <View style={styles.avatarSpinnerOverlay}>
                  <ActivityIndicator color={colors.onBrand} />
                </View>
              ) : null}
            </View>
            <View style={styles.avatarBadge}>
              <Ionicons name="camera-outline" size={13} color={colors.onBrand} />
            </View>
          </Pressable>

          <View style={styles.identityTextWrap}>
            <Text style={styles.identityName} numberOfLines={1}>{form.username || 'Student profile'}</Text>
            <Text style={styles.identityEmail} numberOfLines={1}>{user?.email || 'No email available'}</Text>
          </View>

          <View style={styles.pillsRow}>
            <Pressable onPress={() => setSheet(SHEET.PLAN)} style={[styles.pill, profile?.premium ? styles.pillGold : styles.pillMuted]} accessibilityRole="button" accessibilityLabel="View plan details">
              <Ionicons name={profile?.premium ? 'star' : 'star-outline'} size={12} color={profile?.premium ? colors.gold : colors.grey} />
              <Text style={[styles.pillText, profile?.premium ? styles.pillTextGold : styles.pillTextMuted]}>
                {profile?.premium ? 'Premium' : 'Standard'}
              </Text>
            </Pressable>
            {isAdmin ? (
              <View style={styles.pill}>
                <Ionicons name="shield-checkmark" size={12} color={colors.brandText} />
                <Text style={styles.pillText}>Admin</Text>
              </View>
            ) : null}
            {challengeStats?.rank ? (
              <Pressable onPress={() => setSheet(SHEET.PROGRESS)} style={[styles.pill, { backgroundColor: colors.orangeLight }]} accessibilityRole="button" accessibilityLabel="View progress">
                <Ionicons name="flame-outline" size={12} color={colors.orange} />
                <Text style={[styles.pillText, { color: colors.orange }]}>{challengeStats.rank}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        <DailyStreakBanner
          streakCount={streakCount}
          streakDates={streakDates}
          onPress={() => router.push('/streak')}
          onStudyNow={() => router.push('/streak')}
        />

        {status ? (
          <Animated.View style={[styles.toast, status.type === 'error' ? styles.toastError : styles.toastSuccess, { opacity: fadeAnim }]} accessibilityRole="alert">
            <Ionicons name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={16} color={status.type === 'error' ? colors.rose : colors.teal} />
            <Text style={[styles.toastText, status.type === 'error' ? styles.toastTextError : styles.toastTextSuccess]}>{status.text}</Text>
          </Animated.View>
        ) : null}

        {/* MAIN LIST — mirrors the reference screenshot's rhythm */}
        <Text style={styles.groupLabel}>ACCOUNT</Text>
        <View style={styles.groupCard}>
          <Pressable onPress={() => setSheet(SHEET.EDIT_PROFILE)} style={({ pressed }) => [styles.listRow, styles.rowDivider, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Edit profile">
            <View style={styles.rowIconSm}><Ionicons name="create-outline" size={16} color={colors.brand} /></View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Edit Profile</Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>{form.school || form.department || 'Add your details'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
          </Pressable>

          <Pressable onPress={() => setSheet(SHEET.PLAN)} style={({ pressed }) => [styles.listRow, styles.rowDivider, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="My plan">
            <View style={styles.rowIconSm}><Ionicons name="star-outline" size={16} color={colors.brand} /></View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>My Plan</Text>
            <Text style={styles.rowTrailingText}>{profile?.premium ? 'Premium' : 'Standard'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
          </Pressable>

          <Pressable onPress={() => setSheet(SHEET.PROGRESS)} style={({ pressed }) => [styles.listRow, styles.rowDivider, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="My progress">
            <View style={styles.rowIconSm}><Ionicons name="flash-outline" size={16} color={colors.brand} /></View>
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
            <View style={styles.rowIconSm}><Ionicons name="cloud-upload-outline" size={16} color={colors.brand} /></View>
            <Text style={[styles.rowTitle, { flex: 1 }]}>My Uploads</Text>
            {!statsLoading ? <Text style={styles.rowTrailingText}>{totalUploads}</Text> : <ActivityIndicator size="small" color={colors.brand} style={{ marginRight: 4 }} />}
            <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
          </Pressable>
        </View>
      </ScrollView>

      {/* SINGLE SHARED SHEET — content swaps based on `sheet` */}
      <DraggableBottomSheet
        visible={sheet !== SHEET.NONE}
        onClose={closeSheet}
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
    </ScreenShell>
  );
}