import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { deleteMarketingMedia, uploadFeatureMedia } from '../shared/services/backend';
import {
  createPromoSpotlight,
  deletePromoSpotlight,
  fetchPromoSpotlightsForAdmin,
  fetchPromoSpotlightStats,
  updatePromoSpotlight,
} from '../../services/firestoreSync';
import PromoSpotlight from '../shared/components/PromoSpotlight/PromoSpotlight';
import { useTheme } from '../shared/theme/ThemeContext';

const TYPES = [
  { key: 'external_ad', label: 'External Ad', icon: 'megaphone-outline', color: '#6366F1' },
  { key: 'unihelp_promotion', label: 'UniHelp', icon: 'sparkles-outline', color: '#8B5CF6' },
  { key: 'announcement', label: 'Announcement', icon: 'notifications-outline', color: '#EC4899' },
];

const ACTION_TYPES = [
  { key: 'none', label: 'None', icon: 'ban-outline' },
  { key: 'external_url', label: 'External URL', icon: 'globe-outline' },
  { key: 'screen', label: 'Screen Route', icon: 'navigate-outline' },
  { key: 'deep_link', label: 'Deep Link', icon: 'link-outline' },
];

const PRESET_GRADIENTS = [
  { label: 'Midnight Blue', start: '#1A1A2E', end: '#0F0F23' },
  { label: 'Neon Purple', start: '#2E1065', end: '#0F172A' },
  { label: 'Sunset Glow', start: '#4C1D95', end: '#831843' },
  { label: 'Emerald Deep', start: '#064E3B', end: '#022C22' },
];

// Matches the portrait card in PromoSpotlight (CARD_ASPECT = 0.8, i.e. 4:5)
const CREATIVE_ASPECT = 0.8;
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 120;

const emptyForm = {
  type: 'external_ad',
  title: '',
  description: '',
  imageUrl: '',
  imageAsset: null,
  buttonText: 'Learn More',
  actionType: 'none',
  actionUrl: '',
  advertiserName: '',
  advertiserLogoUrl: '',
  enabled: true,
  priority: '0',
  startAt: '',
  endAt: '',
  targetAudience: 'all',
  gradientStart: '#1A1A2E',
  gradientEnd: '#0F0F23',
  gradientDirection: 'vertical',
  textColor: '#FFFFFF',
  titleSize: 19,
  subtitleSize: 14,
  descriptionSize: 13,
};

const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Safe alpha helper: only appends alpha to 6-digit hex colors, otherwise returns the color untouched
const withAlpha = (color, alpha) => {
  if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) {
    return color + Math.round(alpha * 255).toString(16).padStart(2, '0');
  }
  return color;
};

const dateValue = (value) => {
  if (!value) return '';
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return '';
};

const getMarketingAssetKey = (asset) => {
  const key = asset?.key || asset?.publicId;
  return typeof key === 'string' && key.startsWith('unihelp/marketing/') && !key.includes('..')
    ? key
    : '';
};

const deleteMarketingAsset = async (asset) => {
  const key = getMarketingAssetKey(asset);
  if (!key) return false;
  await deleteMarketingMedia(key);
  return true;
};

// Only copy known form fields so ids / server timestamps never leak back into the update payload
const formFromPromo = (promo) => {
  const next = Object.keys(emptyForm).reduce((acc, key) => {
    acc[key] = promo?.[key] ?? emptyForm[key];
    return acc;
  }, {});
  return {
    ...next,
    priority: String(promo?.priority ?? 0),
    startAt: dateValue(promo?.startAt),
    endAt: dateValue(promo?.endAt),
  };
};

const formatDisplayDate = (isoString) => {
  if (!isoString) return 'Not scheduled';
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return 'Choose a valid date';
  return parsed.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatScheduleDuration = (startAt, endAt) => {
  if (!startAt || !endAt) return 'Set both dates to preview campaign duration';
  const durationMs = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 'End date must come after start date';
  const totalHours = Math.round(durationMs / (1000 * 60 * 60));
  if (totalHours < 24) return `${totalHours} hour${totalHours === 1 ? '' : 's'} scheduled`;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours}h` : ''} scheduled`;
};

const getCampaignStatus = (item) => {
  if (!item.enabled) return 'paused';
  const now = Date.now();
  const start = Date.parse(dateValue(item.startAt));
  const end = Date.parse(dateValue(item.endAt));
  if (!Number.isNaN(end) && end < now) return 'expired';
  if (!Number.isNaN(start) && start > now) return 'scheduled';
  return 'live';
};

const compactNumber = (n) => {
  const value = Number(n) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
};

export default function PromoSpotlightManager({ onEditStart }) {
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();

  const palette = useMemo(
    () => ({
      indigo: colors.brand || '#6366F1',
      indigoDark: colors.brandDark || colors.brand || '#4338CA',
      indigoSoft: isDark ? colors.brandLight || '#1E1B4B' : '#EEF2FF',
      white: colors.card || '#FFFFFF',
      onBrand: '#FFFFFF',
      ink: colors.textPrimary || '#0F172A',
      inkSoft: colors.textSecondary || '#64748B',
      border: colors.borderDefault || '#E2E8F0',
      success: colors.success || '#10B981',
      successSoft: isDark ? 'rgba(16,185,129,0.18)' : '#ECFDF5',
      error: colors.danger || '#EF4444',
      errorSoft: isDark ? 'rgba(239,68,68,0.18)' : '#FEF2F2',
      warning: '#F59E0B',
      warningSoft: isDark ? 'rgba(245,158,11,0.18)' : '#FFFBEB',
      bgLight: colors.canvas || '#F8FAFC',
      surface: colors.card || '#FFFFFF',
      inputSurface: isDark ? colors.surfaceSecondary || '#1E293B' : '#F8FAFC',
      muted: colors.greyLight || '#94A3B8',
    }),
    [colors, isDark]
  );

  const styles = useMemo(() => createStyles(palette), [palette]);

  const [items, setItems] = useState([]);
  const [statsByPromoId, setStatsByPromoId] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const pendingUploadedAssetRef = useRef(null);
  const originalEditingAssetRef = useRef(null);

  const [datePickerConfig, setDatePickerConfig] = useState({
    visible: false,
    field: null,
    mode: 'date',
    tempDate: new Date(),
    minimumDate: undefined,
  });

  const isEditing = Boolean(editingId);

  // The preview must never trigger real navigation or open links, so the action is neutralised here
  const previewPromo = useMemo(
    () => ({
      id: editingId || 'preview',
      ...form,
      actionType: 'none',
      actionUrl: '',
      priority: Number(form.priority) || 0,
    }),
    [editingId, form]
  );

  const summary = useMemo(() => {
    let live = 0;
    let impressions = 0;
    let clicks = 0;
    items.forEach((item) => {
      if (getCampaignStatus(item) === 'live') live += 1;
      impressions += Number(statsByPromoId[item.id]?.impressions) || 0;
      clicks += Number(statsByPromoId[item.id]?.clicks) || 0;
    });
    const ctr = impressions ? ((clicks / impressions) * 100).toFixed(1) : '0.0';
    return { live, impressions, clicks, ctr };
  }, [items, statsByPromoId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const promos = (await fetchPromoSpotlightsForAdmin()) || [];
      setItems(promos);
      const stats = await fetchPromoSpotlightStats(promos.map((p) => p.id));
      setStatsByPromoId(stats || {});
    } catch (err) {
      console.log('PromoSpotlight admin load failed:', err?.message);
      setItems([]);
      setStatsByPromoId({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Remove an uploaded-but-unsaved creative if the screen unmounts mid-edit
  useEffect(
    () => () => {
      const pending = pendingUploadedAssetRef.current;
      if (pending) deleteMarketingAsset(pending).catch(() => {});
    },
    []
  );

  const updateField = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    const pendingAsset = pendingUploadedAssetRef.current;
    pendingUploadedAssetRef.current = null;
    originalEditingAssetRef.current = null;
    if (pendingAsset) {
      deleteMarketingAsset(pendingAsset).catch((error) => {
        console.error('[PromoSpotlightManager] Failed to remove an unsaved R2 creative.', error);
        Alert.alert('Cleanup failed', error?.message || 'The unused creative could not be removed from storage.');
      });
    }
    setEditingId(null);
    setForm(emptyForm);
  }, []);

  const pickCreative = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a promotional creative.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // New expo-image-picker uses ['images']; fall back for older SDKs without touching the deprecated enum
      mediaTypes: ImagePicker.MediaType ? ['images'] : ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
      allowsEditing: true,
      aspect: [4, 5],
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const uploadResult = await uploadFeatureMedia(
        {
          uri: asset.uri,
          name: asset.fileName || `promo-creative-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
        },
        {
          feature: 'marketing',
          resourceType: 'image',
          onProgress: setUploadProgress,
        }
      );

      const imageUrl = uploadResult?.secure_url || uploadResult?.url;
      const assetKey = uploadResult?.key || uploadResult?.publicId;
      if (!imageUrl || !assetKey) {
        throw new Error('R2 upload completed without returning an image URL and storage key.');
      }

      const nextAsset = {
        url: imageUrl,
        key: assetKey,
        publicId: assetKey,
        resourceType: 'image',
        storageProvider: 'r2',
      };
      const previousPendingAsset = pendingUploadedAssetRef.current;
      pendingUploadedAssetRef.current = nextAsset;

      setForm((current) => ({
        ...current,
        imageUrl,
        imageAsset: nextAsset,
      }));

      if (previousPendingAsset && getMarketingAssetKey(previousPendingAsset) !== assetKey) {
        try {
          await deleteMarketingAsset(previousPendingAsset);
        } catch (cleanupError) {
          console.error('[PromoSpotlightManager] Failed to remove a replaced unsaved R2 creative.', cleanupError);
          Alert.alert('Cleanup failed', cleanupError?.message || 'The replaced creative could not be removed from storage.');
        }
      }
    } catch (err) {
      Alert.alert('Upload failed', err?.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.imageUrl.trim()) return 'Upload a promotional creative image.';
    if (form.actionType !== 'none') {
      const target = form.actionUrl.trim();
      if (!target) return 'Action Target (URL or Route) is required.';
      if (form.actionType === 'external_url' && !/^https?:\/\//i.test(target)) {
        return 'External URL must start with http:// or https://';
      }
      if (form.actionType === 'screen' && !target.startsWith('/')) {
        return 'Screen route must start with "/", e.g. /screens/home';
      }
      if (form.actionType === 'deep_link' && !/^[a-z][a-z0-9+.-]*:/i.test(target)) {
        return 'Deep link must include a scheme, e.g. unihelp://challenges';
      }
    }
    if (!HEX_REGEX.test(form.gradientStart.trim()) || !HEX_REGEX.test(form.gradientEnd.trim())) {
      return 'Gradient colors must be valid hex values like #1A1A2E.';
    }
    if (form.startAt && Number.isNaN(Date.parse(form.startAt))) return 'Start date is invalid.';
    if (form.endAt && Number.isNaN(Date.parse(form.endAt))) return 'End date is invalid.';
    if (form.startAt && form.endAt && new Date(form.startAt) > new Date(form.endAt)) {
      return 'Start date must be before End date.';
    }
    return '';
  };

  const save = async () => {
    if (uploading) {
      Alert.alert('Please wait', 'The creative is still uploading.');
      return;
    }
    const validationError = validate();
    if (validationError) {
      Alert.alert('Check promotion', validationError);
      return;
    }

    setSaving(true);
    const wasEditing = Boolean(editingId);
    try {
      let cleanupWarning = '';
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        priority: Number(form.priority) || 0,
        updatedByName: profile?.username || user?.email || 'Admin',
      };
      if (editingId) {
        await updatePromoSpotlight(editingId, payload);
      } else {
        await createPromoSpotlight(payload);
      }

      const previousAsset = originalEditingAssetRef.current;
      const previousKey = getMarketingAssetKey(previousAsset);
      const nextKey = getMarketingAssetKey(form.imageAsset);
      pendingUploadedAssetRef.current = null;
      originalEditingAssetRef.current = null;
      if (previousKey && previousKey !== nextKey) {
        try {
          await deleteMarketingMedia(previousKey);
        } catch (cleanupError) {
          console.error('[PromoSpotlightManager] Promotion saved but the old R2 creative could not be removed.', cleanupError);
          cleanupWarning = cleanupError?.message || 'The old creative could not be removed from storage.';
        }
      }

      resetForm();
      await loadItems();
      Alert.alert(
        cleanupWarning ? 'Saved with cleanup warning' : 'Success',
        cleanupWarning
          ? `PromoSpotlight was successfully ${wasEditing ? 'updated' : 'created'}, but ${cleanupWarning}`
          : `PromoSpotlight successfully ${wasEditing ? 'updated' : 'created'}.`
      );
    } catch (err) {
      Alert.alert('Save failed', err?.message || 'Could not save promotion.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (item) => {
    // Discard any unsaved upload from a previous edit before switching
    const pendingAsset = pendingUploadedAssetRef.current;
    if (pendingAsset) {
      pendingUploadedAssetRef.current = null;
      deleteMarketingAsset(pendingAsset).catch(() => {});
    }
    originalEditingAssetRef.current = item.imageAsset || null;
    setEditingId(item.id);
    setForm(formFromPromo(item));
    setIsFormOpen(true);
    onEditStart?.();
  };

  const remove = (item) => {
    Alert.alert('Delete PromoSpotlight', `Are you sure you want to delete "${item.title || 'Untitled'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePromoSpotlight(item.id);
            if (editingId === item.id) resetForm();
            try {
              await deleteMarketingAsset(item.imageAsset);
            } catch (cleanupError) {
              console.error('[PromoSpotlightManager] Promotion deleted but its R2 creative could not be removed.', cleanupError);
              Alert.alert('Deleted with cleanup warning', cleanupError?.message || 'The creative could not be removed from storage.');
            }
            await loadItems();
          } catch (err) {
            Alert.alert('Delete failed', err?.message || 'Could not delete promotion.');
          }
        },
      },
    ]);
  };

  const closeDatePicker = () => setDatePickerConfig((prev) => ({ ...prev, visible: false }));

  const openDatePicker = (field) => {
    const currentDateVal = form[field] ? new Date(form[field]) : new Date();
    const validDate = Number.isNaN(currentDateVal.getTime()) ? new Date() : currentDateVal;
    const startDate = form.startAt ? new Date(form.startAt) : null;
    const minimumDate =
      field === 'endAt' && startDate && !Number.isNaN(startDate.getTime()) ? startDate : undefined;
    setDatePickerConfig({
      visible: true,
      field,
      mode: 'date',
      tempDate: minimumDate && validDate < minimumDate ? minimumDate : validDate,
      minimumDate,
    });
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        closeDatePicker();
        return;
      }
      if (selectedDate) {
        if (datePickerConfig.mode === 'date') {
          // Spread prev so `field` and `minimumDate` survive the date -> time transition
          setDatePickerConfig((prev) => ({
            ...prev,
            mode: 'time',
            tempDate: new Date(selectedDate),
          }));
        } else {
          // The Android time picker ignores minimumDate, so clamp manually
          const min = datePickerConfig.minimumDate;
          const finalDate = min && selectedDate < min ? min : selectedDate;
          updateField(datePickerConfig.field, finalDate.toISOString());
          closeDatePicker();
        }
      }
    } else if (selectedDate) {
      setDatePickerConfig((prev) => ({ ...prev, tempDate: selectedDate }));
    }
  };

  const confirmIOSDate = () => {
    updateField(datePickerConfig.field, datePickerConfig.tempDate.toISOString());
    closeDatePicker();
  };

  const statusMeta = {
    live: { label: 'Live', color: palette.success, bg: palette.successSoft },
    scheduled: { label: 'Scheduled', color: palette.indigo, bg: palette.indigoSoft },
    paused: { label: 'Paused', color: palette.inkSoft, bg: withAlpha(palette.muted, 0.18) },
    expired: { label: 'Expired', color: palette.error, bg: palette.errorSoft },
  };

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>Spotlight Studio</Text>
            <View style={styles.badgeCount}>
              <View style={[styles.liveDot, { backgroundColor: summary.live ? palette.success : palette.muted }]} />
              <Text style={styles.badgeCountText}>{summary.live} Live</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Craft and manage takeover campaigns</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={styles.previewButton}
            onPress={() => setPreviewVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Preview spotlight"
          >
            <Ionicons name="eye-outline" size={16} color={palette.indigo} />
            <Text style={styles.previewText}>Preview</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleFormButton, isFormOpen && styles.toggleFormButtonActive]}
            onPress={() => setIsFormOpen((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={isFormOpen ? 'Collapse form' : 'Open form'}
          >
            <Ionicons
              name={isFormOpen ? 'chevron-up-outline' : 'add-outline'}
              size={18}
              color={isFormOpen ? palette.indigo : palette.onBrand}
            />
          </Pressable>
        </View>
      </View>

      {/* Performance summary */}
      <View style={styles.summaryRow}>
        <SummaryTile icon="layers-outline" label="Campaigns" value={String(items.length)} palette={palette} styles={styles} />
        <SummaryTile icon="eye-outline" label="Views" value={compactNumber(summary.impressions)} palette={palette} styles={styles} />
        <SummaryTile icon="hand-left-outline" label="Clicks" value={compactNumber(summary.clicks)} palette={palette} styles={styles} />
        <SummaryTile icon="trending-up-outline" label="Avg CTR" value={`${summary.ctr}%`} accent palette={palette} styles={styles} />
      </View>

      {/* Form */}
      {isFormOpen && (
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <View style={styles.formHeaderTitleGroup}>
              <View style={styles.formHeaderIcon}>
                <Ionicons name={isEditing ? 'create-outline' : 'sparkles'} size={18} color={palette.indigo} />
              </View>
              <Text style={styles.cardHeaderTitle}>{isEditing ? 'Edit Campaign' : 'New Campaign Builder'}</Text>
            </View>
            {isEditing && (
              <Pressable style={styles.resetBadge} onPress={resetForm}>
                <Ionicons name="close-outline" size={13} color={palette.error} />
                <Text style={styles.resetBadgeText}>Cancel Edit</Text>
              </Pressable>
            )}
          </View>

          {/* 1. Type */}
          <SectionBlock title="1. Campaign Type" palette={palette} styles={styles}>
            <View style={styles.typeGrid}>
              {TYPES.map((t) => {
                const active = form.type === t.key;
                return (
                  <Pressable
                    key={t.key}
                    style={[styles.typeCard, active && { borderColor: t.color, backgroundColor: withAlpha(t.color, 0.09) }]}
                    onPress={() => updateField('type', t.key)}
                  >
                    <Ionicons name={t.icon} size={20} color={active ? t.color : palette.inkSoft} />
                    <Text
                      style={[styles.typeCardLabel, active && { color: t.color, fontWeight: '800' }]}
                      numberOfLines={1}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionBlock>

          {/* 2. Visual asset */}
          <SectionBlock title="2. Visual Asset" palette={palette} styles={styles}>
            <Pressable style={styles.uploadBox} onPress={pickCreative} disabled={uploading}>
              {form.imageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: form.imageUrl }} style={styles.uploadImage} contentFit="cover" />
                  <View style={styles.reuploadBadge}>
                    <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.reuploadText}>Replace</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadEmpty}>
                  <View style={styles.uploadIconCircle}>
                    <Ionicons name="cloud-upload-outline" size={26} color={palette.indigo} />
                  </View>
                  <Text style={styles.uploadText}>Tap to upload creative</Text>
                  <Text style={styles.uploadHint}>Portrait 4:5 works best{'\n'}(e.g. 1080 x 1350)</Text>
                </View>
              )}
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#FFFFFF" size="large" />
                  <Text style={styles.uploadOverlayText}>{uploadProgress}% uploaded</Text>
                </View>
              )}
            </Pressable>
          </SectionBlock>

          {/* 3. Content */}
          <SectionBlock title="3. Content & Copy" palette={palette} styles={styles}>
            <Field
              label="Headline *"
              value={form.title}
              onChangeText={(val) => updateField('title', val)}
              placeholder="e.g., Campus Challenge Arena is Live!"
              maxLength={TITLE_MAX}
              showCounter
              palette={palette}
              styles={styles}
            />
            <Field
              label="Body Copy"
              value={form.description}
              onChangeText={(val) => updateField('description', val)}
              placeholder="Short engaging message that drives action..."
              maxLength={DESCRIPTION_MAX}
              showCounter
              multiline
              palette={palette}
              styles={styles}
            />

            {form.type === 'external_ad' && (
              <View style={styles.row}>
                <Field
                  label="Advertiser Name"
                  value={form.advertiserName}
                  onChangeText={(val) => updateField('advertiserName', val)}
                  placeholder="e.g. Campus Bites"
                  containerStyle={styles.flex}
                  palette={palette}
                  styles={styles}
                />
                <Field
                  label="Logo URL"
                  value={form.advertiserLogoUrl}
                  onChangeText={(val) => updateField('advertiserLogoUrl', val)}
                  placeholder="https://..."
                  containerStyle={styles.flex}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  palette={palette}
                  styles={styles}
                />
              </View>
            )}
          </SectionBlock>

          {/* 4. Theme */}
          <SectionBlock title="4. Visual Theme" palette={palette} styles={styles}>
            <Text style={styles.subLabel}>Background Presets</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
              {PRESET_GRADIENTS.map((p) => {
                const active = form.gradientStart === p.start && form.gradientEnd === p.end;
                return (
                  <Pressable
                    key={p.label}
                    style={[styles.presetChip, active && styles.presetChipActive]}
                    onPress={() => {
                      setForm((current) => ({ ...current, gradientStart: p.start, gradientEnd: p.end }));
                    }}
                  >
                    <View style={styles.presetSwatch}>
                      <View style={[styles.presetSwatchHalf, { backgroundColor: p.start }]} />
                      <View style={[styles.presetSwatchHalf, { backgroundColor: p.end }]} />
                    </View>
                    <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.row}>
              <Field
                label="Start Hex"
                value={form.gradientStart}
                onChangeText={(val) => updateField('gradientStart', val.startsWith('#') ? val : `#${val}`)}
                placeholder="#1A1A2E"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={7}
                swatch={HEX_REGEX.test(form.gradientStart) ? form.gradientStart : null}
                containerStyle={styles.flex}
                palette={palette}
                styles={styles}
              />
              <Field
                label="End Hex"
                value={form.gradientEnd}
                onChangeText={(val) => updateField('gradientEnd', val.startsWith('#') ? val : `#${val}`)}
                placeholder="#0F0F23"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={7}
                swatch={HEX_REGEX.test(form.gradientEnd) ? form.gradientEnd : null}
                containerStyle={styles.flex}
                palette={palette}
                styles={styles}
              />
            </View>

            <View style={styles.gradientStrip}>
              <View
                style={[
                  styles.gradientStripHalf,
                  { backgroundColor: HEX_REGEX.test(form.gradientStart) ? form.gradientStart : palette.border },
                ]}
              />
              <View
                style={[
                  styles.gradientStripHalf,
                  { backgroundColor: HEX_REGEX.test(form.gradientEnd) ? form.gradientEnd : palette.border },
                ]}
              />
            </View>
          </SectionBlock>

          {/* 5. Action */}
          <SectionBlock title="5. Action & Links" palette={palette} styles={styles}>
            <View style={styles.row}>
              <Field
                label="CTA Button Text"
                value={form.buttonText}
                onChangeText={(val) => updateField('buttonText', val)}
                placeholder="Learn More"
                maxLength={20}
                containerStyle={styles.flex}
                palette={palette}
                styles={styles}
              />
              <Field
                label="Priority"
                value={form.priority}
                onChangeText={(val) => updateField('priority', val.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                containerStyle={styles.priorityField}
                palette={palette}
                styles={styles}
              />
            </View>

            <Text style={styles.subLabel}>Target Action</Text>
            <View style={styles.segmentWrap}>
              {ACTION_TYPES.map((a) => {
                const active = form.actionType === a.key;
                return (
                  <Pressable
                    key={a.key}
                    style={[styles.segment, active && styles.segmentActive]}
                    onPress={() => updateField('actionType', a.key)}
                  >
                    <Ionicons name={a.icon} size={14} color={active ? palette.onBrand : palette.inkSoft} style={styles.segmentIcon} />
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{a.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {form.actionType !== 'none' && (
              <Field
                label="Target Route or Link"
                value={form.actionUrl}
                onChangeText={(val) => updateField('actionUrl', val)}
                placeholder={
                  form.actionType === 'external_url'
                    ? 'https://example.com'
                    : form.actionType === 'deep_link'
                    ? 'unihelp://challenges'
                    : '/screens/home'
                }
                autoCapitalize="none"
                autoCorrect={false}
                palette={palette}
                styles={styles}
              />
            )}
          </SectionBlock>

          {/* 6. Schedule */}
          <SectionBlock title="6. Availability & Schedule" last palette={palette} styles={styles}>
            <View style={styles.row}>
              <DatePickerTrigger
                label="Starts At"
                value={formatDisplayDate(form.startAt)}
                isSet={Boolean(form.startAt)}
                onPress={() => openDatePicker('startAt')}
                onClear={() => updateField('startAt', '')}
                containerStyle={styles.flex}
                palette={palette}
                styles={styles}
              />
              <DatePickerTrigger
                label="Ends At"
                value={formatDisplayDate(form.endAt)}
                isSet={Boolean(form.endAt)}
                onPress={() => openDatePicker('endAt')}
                onClear={() => updateField('endAt', '')}
                containerStyle={styles.flex}
                palette={palette}
                styles={styles}
              />
            </View>

            <View style={styles.scheduleSummary}>
              <View style={styles.scheduleSummaryIcon}>
                <Ionicons name="calendar-clear-outline" size={19} color={palette.indigo} />
              </View>
              <View style={styles.scheduleSummaryCopy}>
                <Text style={styles.scheduleSummaryTitle}>
                  {form.startAt ? formatDisplayDate(form.startAt) : 'Starts immediately'}
                </Text>
                <Text style={styles.scheduleSummaryText}>
                  {formatScheduleDuration(form.startAt, form.endAt)}
                </Text>
              </View>
            </View>

            <View style={styles.enabledBox}>
              <View style={styles.enabledTextGroup}>
                <Ionicons name="pulse-outline" size={18} color={form.enabled ? palette.success : palette.muted} />
                <View>
                  <Text style={styles.enabledTitle}>Campaign Status</Text>
                  <Text style={styles.enabledSubtitle}>{form.enabled ? 'Live to eligible audience' : 'Paused / Offline'}</Text>
                </View>
              </View>
              <Switch
                value={form.enabled}
                onValueChange={(val) => updateField('enabled', val)}
                trackColor={{ false: palette.border, true: withAlpha(palette.indigo, 0.45) }}
                thumbColor={form.enabled ? palette.indigo : palette.muted}
              />
            </View>
          </SectionBlock>

          {/* Submit */}
          <Pressable
            style={[styles.saveButton, (saving || uploading) && styles.disabled]}
            onPress={save}
            disabled={saving || uploading}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.saveBtnRow}>
                <Ionicons name={isEditing ? 'checkmark-circle-outline' : 'rocket-outline'} size={18} color="#FFFFFF" />
                <Text style={styles.saveText}>{isEditing ? 'Update Spotlight' : 'Publish Spotlight'}</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* iOS date picker */}
      {datePickerConfig.visible && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible onRequestClose={closeDatePicker}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  Select {datePickerConfig.field === 'startAt' ? 'Start' : 'End'} Schedule
                </Text>
                <Pressable onPress={closeDatePicker} hitSlop={8}>
                  <Ionicons name="close-circle" size={24} color={palette.inkSoft} />
                </Pressable>
              </View>
              <DateTimePicker
                value={datePickerConfig.tempDate}
                mode="datetime"
                display="spinner"
                onChange={handleDateChange}
                textColor={palette.ink}
                themeVariant={isDark ? 'dark' : 'light'}
                minimumDate={datePickerConfig.minimumDate}
              />
              <View style={styles.pickerActions}>
                <Pressable style={styles.pickerCancelBtn} onPress={closeDatePicker}>
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.pickerConfirmBtn} onPress={confirmIOSDate}>
                  <Text style={styles.pickerConfirmText}>Confirm</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Android date picker */}
      {datePickerConfig.visible && Platform.OS === 'android' && (
        <DateTimePicker
          value={datePickerConfig.tempDate}
          mode={datePickerConfig.mode}
          is24Hour={false}
          onChange={handleDateChange}
          minimumDate={datePickerConfig.mode === 'date' ? datePickerConfig.minimumDate : undefined}
        />
      )}

      {/* Inventory */}
      <View style={styles.listHeaderContainer}>
        <Text style={styles.sectionTitle}>Campaign Inventory</Text>
        <Text style={styles.inventoryCount}>
          {items.length} {items.length === 1 ? 'Campaign' : 'Campaigns'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.indigo} style={styles.loader} />
      ) : (
        <ScrollView style={styles.list} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {items.length ? (
            items.map((item) => {
              const status = statusMeta[getCampaignStatus(item)];
              const typeMeta = TYPES.find((t) => t.key === item.type);
              const stats = statsByPromoId[item.id] || {};
              return (
                <View key={item.id} style={[styles.itemCard, editingId === item.id && styles.itemCardSelected]}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
                  ) : (
                    <View style={styles.itemImageFallback}>
                      <Ionicons name="image-outline" size={20} color={palette.inkSoft} />
                    </View>
                  )}
                  <View style={styles.itemBody}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {item.title || 'Untitled Campaign'}
                      </Text>
                      <View style={[styles.statusTag, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusTagText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.itemMeta} numberOfLines={1}>
                      P{item.priority ?? 0} • {typeMeta?.label || item.type}
                    </Text>

                    <View style={styles.statsRow}>
                      <View style={styles.statChip}>
                        <Ionicons name="eye-outline" size={11} color={palette.inkSoft} />
                        <Text style={styles.statChipText}>{compactNumber(stats.impressions)}</Text>
                      </View>
                      <View style={styles.statChip}>
                        <Ionicons name="hand-left-outline" size={11} color={palette.inkSoft} />
                        <Text style={styles.statChipText}>{compactNumber(stats.clicks)}</Text>
                      </View>
                      <View style={styles.statChip}>
                        <Ionicons name="trending-up-outline" size={11} color={palette.indigo} />
                        <Text style={[styles.statChipText, { color: palette.indigo }]}>{stats.ctr || 0}% CTR</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.itemActions}>
                    <Pressable style={styles.iconButton} onPress={() => edit(item)} hitSlop={4}>
                      <Ionicons name="create-outline" size={16} color={palette.indigo} />
                    </Pressable>
                    <Pressable style={[styles.iconButton, styles.deleteIcon]} onPress={() => remove(item)} hitSlop={4}>
                      <Ionicons name="trash-outline" size={16} color={palette.error} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={36} color={palette.muted} />
              <Text style={styles.emptyText}>No promotions configured yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Live preview (actions disabled so it can't navigate or open links) */}
      <PromoSpotlight
        promo={previewPromo}
        visible={previewVisible}
        onDismiss={() => setPreviewVisible(false)}
        onAction={() => setPreviewVisible(false)}
      />
    </View>
  );
}

function SectionBlock({ title, children, last = false, styles }) {
  return (
    <View style={[styles.sectionBlock, last && styles.sectionBlockLast]}>
      <Text style={styles.sectionBlockTitle}>{title}</Text>
      <View style={styles.sectionBlockBody}>{children}</View>
    </View>
  );
}

function SummaryTile({ icon, label, value, accent = false, palette, styles }) {
  return (
    <View style={styles.summaryTile}>
      <Ionicons name={icon} size={14} color={accent ? palette.indigo : palette.inkSoft} />
      <Text style={[styles.summaryValue, accent && { color: palette.indigo }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Field({
  label,
  containerStyle,
  multiline = false,
  showCounter = false,
  swatch = null,
  palette,
  styles,
  ...props
}) {
  const length = typeof props.value === 'string' ? props.value.length : 0;
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <View style={styles.labelLeft}>
            {swatch ? <View style={[styles.labelSwatch, { backgroundColor: swatch }]} /> : null}
            <Text style={styles.label}>{label}</Text>
          </View>
          {showCounter && props.maxLength ? (
            <Text style={[styles.counter, length >= props.maxLength && { color: palette.error }]}>
              {length}/{props.maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={palette.muted}
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

function DatePickerTrigger({ label, value, isSet, onPress, onClear, containerStyle, palette, styles }) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dateTrigger} onPress={onPress}>
        <Ionicons name="calendar-outline" size={15} color={isSet ? palette.indigo : palette.inkSoft} />
        <Text style={[styles.dateTriggerText, !isSet && styles.dateTriggerPlaceholder]} numberOfLines={2}>
          {value}
        </Text>
        {isSet && (
          <Pressable onPress={onClear} style={styles.clearDateBtn} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={palette.inkSoft} />
          </Pressable>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = (palette) =>
  StyleSheet.create({
    wrap: { gap: 14, backgroundColor: palette.bgLight, padding: 12, borderRadius: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    headerTitleContainer: { flex: 1 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    title: { fontSize: 22, fontWeight: '900', color: palette.ink, letterSpacing: -0.5 },
    badgeCount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: palette.indigoSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    badgeCountText: { fontSize: 11, fontWeight: '800', color: palette.indigoDark },
    subtitle: { marginTop: 2, fontSize: 12, color: palette.inkSoft },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    previewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: palette.indigoSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    previewText: { color: palette.indigo, fontWeight: '800', fontSize: 12 },
    toggleFormButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: palette.indigo,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleFormButtonActive: { backgroundColor: palette.indigoSoft },

    /* Summary */
    summaryRow: { flexDirection: 'row', gap: 8 },
    summaryTile: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    summaryValue: { fontSize: 15, fontWeight: '900', color: palette.ink },
    summaryLabel: { fontSize: 10, fontWeight: '600', color: palette.inkSoft },

    /* Form */
    formCard: {
      backgroundColor: palette.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 16,
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    formCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    formHeaderTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    formHeaderIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: palette.indigoSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
    resetBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: palette.errorSoft,
    },
    resetBadgeText: { fontSize: 11, color: palette.error, fontWeight: '700' },

    sectionBlock: {
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: withAlpha(palette.border, 0.55),
      paddingBottom: 14,
    },
    sectionBlockLast: { borderBottomWidth: 0, paddingBottom: 0 },
    sectionBlockTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.indigo,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionBlockBody: { gap: 10 },

    typeGrid: { flexDirection: 'row', gap: 8 },
    typeCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      backgroundColor: palette.surface,
    },
    typeCardLabel: { fontSize: 11, fontWeight: '700', color: palette.inkSoft, flexShrink: 1 },

    field: { gap: 5 },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    labelLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    labelSwatch: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: palette.border,
    },
    label: { fontSize: 12, color: palette.ink, fontWeight: '700' },
    counter: { fontSize: 10, color: palette.inkSoft, fontWeight: '600' },
    subLabel: { fontSize: 11, color: palette.inkSoft, fontWeight: '700', marginTop: 2 },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      color: palette.ink,
      fontSize: 13,
      backgroundColor: palette.inputSurface,
    },
    textArea: { minHeight: 68 },
    priorityField: { width: 84 },

    // Portrait 4:5 upload box, centered and capped so it doesn't take over the whole form
    uploadBox: {
      width: '62%',
      maxWidth: 260,
      alignSelf: 'center',
      aspectRatio: CREATIVE_ASPECT,
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: palette.indigo,
      overflow: 'hidden',
      backgroundColor: palette.indigoSoft,
    },
    imagePreviewContainer: { width: '100%', height: '100%', position: 'relative' },
    uploadImage: { width: '100%', height: '100%' },
    reuploadBadge: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      backgroundColor: 'rgba(15,23,42,0.8)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    reuploadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    uploadEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
    uploadIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: palette.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadText: { color: palette.indigoDark, fontWeight: '800', fontSize: 13, textAlign: 'center' },
    uploadHint: { color: palette.inkSoft, fontSize: 11, textAlign: 'center' },
    uploadOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15,23,42,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    uploadOverlayText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

    presetScroll: { gap: 8, paddingVertical: 2 },
    presetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: palette.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: palette.surface,
    },
    presetChipActive: { borderColor: palette.indigo, backgroundColor: palette.indigoSoft },
    presetSwatch: { width: 18, height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
    presetSwatchHalf: { flex: 1 },
    presetChipText: { fontSize: 11, fontWeight: '600', color: palette.inkSoft },
    presetChipTextActive: { color: palette.indigo, fontWeight: '800' },

    gradientStrip: {
      height: 10,
      borderRadius: 999,
      overflow: 'hidden',
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: palette.border,
    },
    gradientStripHalf: { flex: 1 },

    row: { flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },

    segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    segment: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surface,
    },
    segmentIcon: { marginRight: 4 },
    segmentActive: { backgroundColor: palette.indigo, borderColor: palette.indigo },
    segmentText: { fontSize: 11, fontWeight: '700', color: palette.inkSoft },
    segmentTextActive: { color: palette.onBrand },

    dateTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      backgroundColor: palette.inputSurface,
      gap: 6,
      minHeight: 58,
    },
    dateTriggerText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '600', color: palette.ink },
    dateTriggerPlaceholder: { color: palette.muted, fontWeight: '400' },
    clearDateBtn: { padding: 2 },

    scheduleSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: withAlpha(palette.indigo, 0.27),
      backgroundColor: palette.indigoSoft,
    },
    scheduleSummaryIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surface,
    },
    scheduleSummaryCopy: { flex: 1, gap: 2 },
    scheduleSummaryTitle: { color: palette.ink, fontSize: 12, fontWeight: '800' },
    scheduleSummaryText: { color: palette.inkSoft, fontSize: 11, fontWeight: '600' },

    enabledBox: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent: 'space-between',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.inputSurface,
    },
    enabledTextGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    enabledTitle: { fontSize: 12, fontWeight: '700', color: palette.ink },
    enabledSubtitle: { fontSize: 11, color: palette.inkSoft },

    saveButton: {
      backgroundColor: palette.indigo,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    disabled: { opacity: 0.55 },

    /* Inventory */
    listHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
    inventoryCount: { fontSize: 12, color: palette.inkSoft, fontWeight: '600' },
    loader: { marginVertical: 20 },
    list: { maxHeight: 380 },
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: palette.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 10,
      marginBottom: 8,
    },
    itemCardSelected: { borderColor: palette.indigo, borderWidth: 1.5 },
    // Portrait 4:5 thumbnail to match the spotlight card
    itemImage: { width: 48, height: 60, borderRadius: 8 },
    itemImageFallback: {
      width: 48,
      height: 60,
      borderRadius: 8,
      backgroundColor: palette.indigoSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemBody: { flex: 1, gap: 2 },
    itemTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    itemTitle: { fontSize: 13, fontWeight: '800', color: palette.ink, flex: 1 },
    statusTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    statusTagText: { fontSize: 10, fontWeight: '800' },
    itemMeta: { color: palette.inkSoft, fontSize: 11 },

    statsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    statChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statChipText: { fontSize: 10, fontWeight: '700', color: palette.inkSoft },

    itemActions: { gap: 6 },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: palette.indigoSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteIcon: { backgroundColor: palette.errorSoft },
    empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyText: { color: palette.inkSoft, fontWeight: '600', fontSize: 13 },

    /* Modal */
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    pickerContainer: { width: '100%', backgroundColor: palette.surface, borderRadius: 16, padding: 16, gap: 12 },
    pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pickerTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
    pickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
    pickerCancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    pickerCancelText: { color: palette.inkSoft, fontWeight: '700' },
    pickerConfirmBtn: { backgroundColor: palette.indigo, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    pickerConfirmText: { color: '#FFFFFF', fontWeight: '800' },
  });