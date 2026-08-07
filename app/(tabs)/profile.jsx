import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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
import ThemeToggle from '../../src/shared/components/ThemeToggle';
import ScreenShell from '../../src/shared/components/ScreenShell';
import DailyStreakBanner from '../../src/shared/components/DailyStreakBanner';
import DraggableBottomSheet from '../../src/shared/components/DraggableBottomSheet';
import SchoolTypeFilter from '../../src/shared/components/SchoolTypeFilter';
import SearchableDropdown from '../../src/signup/components/SearchableDropdown';
import { useUniversities } from '../../src/signup/hooks/useUniversities';
import { useDepartments } from '../../src/signup/hooks/useDepartments';
import { ACADEMIC_LEVELS } from '../../src/signup/validation';
import { useAuth } from '../../context/AuthContext';
import { saveUserProfile, fetchDailyStreak, syncCurrentUserProfile } from '../../services/firestoreSync';
import { uploadToCloudinary } from '../../services/cloudinary';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';
import { fetchChallengeStats } from './../../src/shared/challenge/service';
import { getRankForXp, CHALLENGE_CATEGORIES } from '../../src/shared/challenge/data';

const BIO_MAX_LENGTH = 160;

const fields = [
  { key: 'username', label: 'Name', placeholder: 'Add your name', icon: 'person-outline' },
  { key: 'bio', label: 'About', placeholder: 'Tell others a little about yourself', icon: 'chatbubble-ellipses-outline', multiline: true, maxLength: BIO_MAX_LENGTH },
  { key: 'school', label: 'School', placeholder: 'Add your school', icon: 'school-outline' },
  { key: 'department', label: 'Department', placeholder: 'Add your department', icon: 'library-outline' },
  { key: 'level', label: 'Level', placeholder: 'e.g. 200L', icon: 'ribbon-outline' },
  { key: 'location', label: 'Location', placeholder: 'Add your city or campus', icon: 'location-outline' },
];

const emptyForm = {
  username: '', school: '', schoolId: '', department: '', level: '', location: '', bio: '', role: 'university',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile, logout } = useAuth();
  const { colors, isDark, toggleTheme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
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
    identity: { alignItems: 'center', paddingVertical: s.xl, marginBottom: s.md },
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
    identityChipsScroll: { alignSelf: 'stretch', marginBottom: s.lg },
    identityChipsContent: { flexDirection: 'row', gap: s.sm, paddingHorizontal: 2 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: s.xs,
      backgroundColor: c.brandLight, borderRadius: r.full,
      paddingHorizontal: s.sm, paddingVertical: 5,
    },
    chipMuted: { backgroundColor: c.canvasLight },
    chipGold: { backgroundColor: c.goldLight },
    chipText: { fontSize: 11, fontWeight: '800', color: c.brandText },
    chipTextMuted: { color: c.grey },
    chipTextGold: { color: c.gold },
    chipAdmin: {
      flexDirection: 'row', alignItems: 'center', gap: s.xs,
      backgroundColor: c.brandLight, borderRadius: r.full,
      paddingHorizontal: s.sm, paddingVertical: 5,
      borderWidth: 1, borderColor: c.brandBorder,
    },
    chipAdminText: { fontSize: 11, fontWeight: '800', color: c.brandText },
    statsRow: { flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 4 },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: r.xl, gap: 4 },
    statValue: { fontSize: 20, fontWeight: '900' },
    statLabel: { fontSize: 10.5, fontWeight: '700', color: c.grey, letterSpacing: 0.3 },
    statsLoadingRow: { flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 4 },
    statSkeleton: { flex: 1, height: 72, borderRadius: r.xl, backgroundColor: c.skeleton },
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
    roleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: s.lg, paddingHorizontal: s.lg, gap: s.md },
    rowIcon: { width: 40, height: 40, borderRadius: r.md, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    rowIconActive: { backgroundColor: c.brand },
    roleTextWrap: { flex: 1 },
    roleTitle: { fontSize: 14.5, fontWeight: '800', color: c.ink },
    roleDesc: { marginTop: s.xs, fontSize: 12, color: c.grey },
    radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.greyLight, alignItems: 'center', justifyContent: 'center' },
    radioOuterActive: { borderColor: c.brand },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.brand },
    notice: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.amberLight,
      borderWidth: 1, borderColor: c.amberLight, borderRadius: r.md, padding: 11, marginTop: -6, marginBottom: s.lg,
    },
    noticeText: { flex: 1, color: c.amber, fontSize: 12, fontWeight: '600', lineHeight: 16 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: s.md, paddingHorizontal: s.lg, gap: s.md, minHeight: 58 },
    rowIconSm: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    rowIconDanger: { backgroundColor: c.redLight },
    fieldTextWrap: { flex: 1 },
    fieldLabel: { fontSize: 11.5, fontWeight: '700', color: c.greyLight, marginBottom: s.xs },
    fieldValue: { fontSize: 14.5, color: c.ink, fontWeight: '600' },
    fieldValueEmpty: { color: c.greyLight, fontWeight: '400' },
    fieldInput: { fontSize: 14.5, color: c.ink, fontWeight: '600', padding: 0, margin: 0 },
    fieldInputArea: { minHeight: 40, textAlignVertical: 'top' },
    charCount: { fontSize: 11, color: c.greyLight, textAlign: 'right', marginTop: s.xs },
    saveButton: {
      flexDirection: 'row', gap: s.sm, backgroundColor: c.brand, paddingVertical: 15,
      borderRadius: r.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    },
    saveButtonPressed: { backgroundColor: c.brandDark },
    saveButtonDisabled: { backgroundColor: c.brandGlow },
    saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: s.md, paddingVertical: s.lg, paddingHorizontal: s.lg },
    actionRowText: { fontSize: 14.5, fontWeight: '700', color: c.red },
    sectionBlock: { marginBottom: s.lg },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginBottom: s.md },
    sectionHeaderText: { flex: 1, fontSize: 13, fontWeight: '800', color: c.ink },
    sectionAction: { fontSize: 12, fontWeight: '800', color: c.brandText },
    compactStatCard: { flex: 1, alignItems: 'center', gap: 4, borderRadius: r.md, padding: s.sm, minWidth: 70 },
    compactStatValue: { fontSize: 15, fontWeight: '900' },
    compactStatLabel: { fontSize: 9, fontWeight: '700', color: c.grey, textAlign: 'center' },
    themeSelector: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: s.lg, paddingVertical: s.md, marginBottom: s.md,
      backgroundColor: c.surface, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderLight,
    },
    themeSelectorLabel: { fontSize: 14, fontWeight: '700', color: c.ink },
    themeSelectorButtons: { flexDirection: 'row', gap: s.sm },
    themeOption: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: r.md,
      backgroundColor: c.canvasLight,
    },
    themeOptionActive: { backgroundColor: c.brand },
    themeOptionText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    themeOptionTextActive: { color: c.onBrand },
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

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openEditModal = (key) => {
    setEditingKey(key);
    setModalVisible(true);
    if (key === 'department' && form.schoolId) {
      selectUniversity(form.schoolId);
    }
  };

  const closeEditModal = () => {
    setModalVisible(false);
    setEditingKey(null);
  };

  const handleSchoolSelect = (item) => {
    setField('school', item.name);
    setField('schoolId', item.id);
    setField('department', '');
    selectUniversity(item.id);
  };

  const handleDepartmentSelect = (item) => {
    setField('department', item.name);
  };

  const handleLevelSelect = (item) => {
    setField('level', item.value);
  };

  const editingField = fields.find((f) => f.key === editingKey);

  const renderEditContent = () => {
    if (!editingKey) return null;

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
        />
        {editingField?.maxLength ? (
          <Text style={styles.charCount}>
            {(form[editingKey]?.length || 0)}/{editingField.maxLength}
          </Text>
        ) : null}
      </View>
    );
  };

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
      setEditingKey(null);
      showStatus({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      if (isMountedRef.current) showStatus({ type: 'error', text: error?.message || 'Unable to update your profile. Please try again.' });
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You\u2019ll need to sign back in to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const statCards = [
    { label: 'Listings', value: stats.listings, icon: 'pricetag-outline', color: colors.orange, bg: colors.orangeLight },
    { label: 'Hostels', value: stats.hostelListings, icon: 'home-outline', color: colors.blue, bg: colors.blueLight },
    { label: 'Groups', value: stats.groups, icon: 'people-outline', color: colors.purple, bg: colors.purpleLight },
  ];

  const challengeStatCards = challengeStats ? [
    { label: 'XP', value: (challengeStats.xp || 0).toLocaleString(), icon: 'sparkles-outline', color: colors.brand, bg: colors.brandLight },
    { label: 'Streak', value: challengeStats.currentStreak || 0, icon: 'flame-outline', color: colors.orange, bg: colors.orangeLight },
    { label: 'Questions', value: challengeStats.questionsAnswered || 0, icon: 'checkmark-done-outline', color: colors.green, bg: colors.greenLight },
    { label: 'Accuracy', value: `${challengeStats.accuracy || 0}%`, icon: 'analytics-outline', color: colors.teal, bg: colors.tealLight },
  ] : [];

  return (
    <ScreenShell
      title="Profile"
      subtitle="University student"
      showBack
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        {/* THEME TOGGLE */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.xs, marginBottom: spacing.sm }}>
          <ThemeToggle size={36} showLabel />
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.identityChipsScroll}
            contentContainerStyle={styles.identityChipsContent}>
            <View style={styles.chip}>
              <Ionicons name="school-outline" size={12} color={colors.brandText} />
              <Text style={styles.chipText}>University</Text>
            </View>
            {form.level ? (
              <View style={styles.chip}>
                <Ionicons name="ribbon-outline" size={12} color={colors.brandText} />
                <Text style={styles.chipText}>{form.level}L</Text>
              </View>
            ) : null}
            {form.department ? (
              <View style={styles.chip}>
                <Ionicons name="library-outline" size={12} color={colors.brandText} />
                <Text style={styles.chipText} numberOfLines={1}>{form.department}</Text>
              </View>
            ) : null}
            <View style={[styles.chip, profile?.premium ? styles.chipGold : styles.chipMuted]}>
              <Ionicons name={profile?.premium ? 'star' : 'star-outline'} size={12} color={profile?.premium ? colors.gold : colors.grey} />
              <Text style={[styles.chipText, profile?.premium ? styles.chipTextGold : styles.chipTextMuted]}>
                {profile?.premium ? 'Premium' : 'Standard'}
              </Text>
            </View>
            {isAdmin ? (
              <View style={styles.chipAdmin}>
                <Ionicons name="shield-checkmark" size={12} color={colors.brandText} />
                <Text style={styles.chipAdminText}>Admin</Text>
              </View>
            ) : null}
            {challengeStats?.rank ? (
              <View style={[styles.chip, { backgroundColor: colors.orangeLight }]}>
                <Ionicons name="flame-outline" size={12} color={colors.orange} />
                <Text style={[styles.chipText, { color: colors.orange }]}>{challengeStats.rank}</Text>
              </View>
            ) : null}
          </ScrollView>

          {!statsLoading ? (
            <View style={styles.statsRow}>
              {statCards.map((stat) => (
                <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.bg }]}>
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.statsLoadingRow}>
              {[1, 2, 3].map((i) => <View key={i} style={styles.statSkeleton} />)}
            </View>
          )}
        </Animated.View>

        <DailyStreakBanner
          streakCount={streakCount} streakDates={streakDates}
          onPress={() => router.push('/streak')} onStudyNow={() => router.push('/streak')}
        />

        {challengeStatCards.length > 0 ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash-outline" size={16} color={colors.brand} />
              <Text style={styles.sectionHeaderText}>Challenge Performance</Text>
              <Pressable onPress={() => router.push('/challenge/profile')} hitSlop={8} accessibilityRole="button" accessibilityLabel="See all challenge stats">
                <Text style={styles.sectionAction}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.statsRow}>
              {challengeStatCards.map((stat) => (
                <View key={stat.label} style={[styles.compactStatCard, { backgroundColor: stat.bg }]}>
                  <Ionicons name={stat.icon} size={16} color={stat.color} />
                  <Text style={[styles.compactStatValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.compactStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {status ? (
          <Animated.View
            style={[styles.toast, status.type === 'error' ? styles.toastError : styles.toastSuccess, { opacity: fadeAnim }]}
            accessibilityRole="alert"
          >
            <Ionicons name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={16} color={status.type === 'error' ? colors.rose : colors.teal} />
            <Text style={[styles.toastText, status.type === 'error' ? styles.toastTextError : styles.toastTextSuccess]}>{status.text}</Text>
          </Animated.View>
        ) : null}

        <Text style={styles.groupLabel}>PERSONAL INFO</Text>
        <View style={styles.groupCard}>
          {fields.map((field, idx) => {
            const hasValue = !!form[field.key];
            return (
              <Pressable
                key={field.key}
                onPress={() => openEditModal(field.key)}
                style={[styles.fieldRow, idx !== fields.length - 1 && styles.rowDivider]}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${field.label}`}
                accessibilityValue={{ text: hasValue ? form[field.key] : 'Not set' }}
              >
                <View style={styles.rowIconSm}>
                  <Ionicons name={field.icon} size={16} color={colors.brand} />
                </View>
                <View style={styles.fieldTextWrap}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <Text style={[styles.fieldValue, !hasValue && styles.fieldValueEmpty]} numberOfLines={field.multiline ? 2 : 1}>
                    {hasValue ? form[field.key] : field.placeholder}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [styles.saveButton, (!isDirty || saving) && styles.saveButtonDisabled, pressed && isDirty && !saving && styles.saveButtonPressed]}
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

        {!statsLoading && (stats.hostelListings > 0 || stats.listings > 0 || stats.stories > 0) ? (
          <>
            <Text style={styles.groupLabel}>MY UPLOADS</Text>
            <View style={styles.groupCard}>
              {stats.hostelListings > 0 ? (
                <Pressable onPress={() => router.push('/manage/hostels')} style={({ pressed }) => [styles.fieldRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Manage my hostels">
                  <View style={[styles.rowIconSm, { backgroundColor: colors.blueLight }]}>
                    <Ionicons name="home-outline" size={16} color={colors.blue} />
                  </View>
                  <View style={styles.fieldTextWrap}>
                    <Text style={styles.fieldLabel}>My Hostels</Text>
                    <Text style={styles.fieldValue}>{stats.hostelListings} uploaded</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
                </Pressable>
              ) : null}
              {stats.listings > 0 ? (
                <Pressable onPress={() => router.push('/manage/listings')} style={({ pressed }) => [styles.fieldRow, stats.hostelListings > 0 && styles.rowDivider, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Manage my listings">
                  <View style={[styles.rowIconSm, { backgroundColor: colors.orangeLight }]}>
                    <Ionicons name="storefront-outline" size={16} color={colors.orange} />
                  </View>
                  <View style={styles.fieldTextWrap}>
                    <Text style={styles.fieldLabel}>My Listings</Text>
                    <Text style={styles.fieldValue}>{stats.listings} uploaded</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
                </Pressable>
              ) : null}
              {stats.stories > 0 ? (
                <Pressable onPress={() => router.push('/manage/stories')} style={({ pressed }) => [styles.fieldRow, (stats.hostelListings > 0 || stats.listings > 0) && styles.rowDivider, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Manage my stories">
                  <View style={[styles.rowIconSm, { backgroundColor: colors.purpleLight }]}>
                    <Ionicons name="book-outline" size={16} color={colors.purple} />
                  </View>
                  <View style={styles.fieldTextWrap}>
                    <Text style={styles.fieldLabel}>My Stories</Text>
                    <Text style={styles.fieldValue}>{stats.stories} uploaded</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {isAdmin ? (
          <>
            <Text style={styles.groupLabel}>ADMIN</Text>
            <View style={styles.groupCard}>
              <Pressable onPress={() => router.push('/adminpanel')} style={({ pressed }) => [styles.fieldRow, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Open admin panel">
                <View style={[styles.rowIconSm, { backgroundColor: colors.brandLight }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.brand} />
                </View>
                <View style={styles.fieldTextWrap}>
                  <Text style={styles.fieldLabel}>Admin Panel</Text>
                  <Text style={styles.fieldValue}>Manage marketplace, hostels & notifications</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
              </Pressable>
              <Pressable onPress={() => router.push('/adminpanel/support-center')} style={({ pressed }) => [styles.fieldRow, styles.rowDivider, pressed && styles.rowPressed]} accessibilityRole="button" accessibilityLabel="Open support center">
                <View style={[styles.rowIconSm, { backgroundColor: colors.purpleLight }]}>
                  <Ionicons name="headset-outline" size={16} color={colors.purple} />
                </View>
                <View style={styles.fieldTextWrap}>
                  <Text style={styles.fieldLabel}>Support Center</Text>
                  <Text style={styles.fieldValue}>Manage contact, reports & suggestions</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
              </Pressable>
            </View>
          </>
        ) : null}

        <Text style={styles.groupLabel}>ACCOUNT</Text>
        <View style={styles.groupCard}>
          <Pressable
            onPress={confirmSignOut}
            style={({ pressed }) => [styles.actionRow, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <View style={[styles.rowIconSm, styles.rowIconDanger]}>
              <Ionicons name="log-out-outline" size={16} color={colors.red} />
            </View>
            <Text style={styles.actionRowText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <DraggableBottomSheet
        visible={modalVisible}
        onClose={closeEditModal}
        title={editingField?.label || 'Edit Profile'}
        subtitle="Update your information"
        footer={
          <Pressable
            onPress={closeEditModal}
            style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Done editing"
          >
            <Ionicons name="checkmark-outline" size={17} color={colors.onBrand} />
            <Text style={styles.saveButtonText}>Done</Text>
          </Pressable>
        }
      >
        {renderEditContent()}
      </DraggableBottomSheet>
    </ScreenShell>
  );
}
