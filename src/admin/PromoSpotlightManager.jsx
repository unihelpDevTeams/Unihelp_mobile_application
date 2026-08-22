import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { uploadImage, toCloudinaryAsset } from '../../services/cloudinary';
import { deleteCloudinaryAssets, deleteMediaDocument } from '../../services/mediaCleanup';
import {
  createPromoSpotlight,
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

const dateValue = (value) => {
  if (!value) return '';
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return '';
};

const formFromPromo = (promo) => ({
  ...emptyForm,
  ...promo,
  priority: String(promo?.priority ?? 0),
  startAt: dateValue(promo?.startAt),
  endAt: dateValue(promo?.endAt),
});

const formatDisplayDate = (isoString) => {
  if (!isoString) return 'Starts immediately';
  const parsed = new Date(isoString);
  if (isNaN(parsed.getTime())) return 'Invalid date';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function PromoSpotlightManager() {
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();

  const palette = useMemo(
    () => ({
      indigo: colors.brand || '#6366F1',
      indigoDark: colors.brandDark || colors.brand || '#4338CA',
      indigoSoft: isDark ? colors.brandLight || '#1E1B4B' : '#EEF2FF',
      white: colors.card || '#FFFFFF',
      ink: colors.textPrimary || '#0F172A',
      inkSoft: colors.textSecondary || '#64748B',
      border: colors.borderDefault || '#E2E8F0',
      success: colors.success || '#10B981',
      successSoft: isDark ? 'rgba(16,185,129,0.18)' : '#ECFDF5',
      error: colors.danger || '#EF4444',
      errorSoft: isDark ? 'rgba(239,68,68,0.18)' : '#FEF2F2',
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

  // Date Picker State
  const [datePickerConfig, setDatePickerConfig] = useState({
    visible: false,
    field: null,
    mode: 'date',
    tempDate: new Date(),
  });

  const isEditing = Boolean(editingId);

  const previewPromo = useMemo(
    () => ({
      id: editingId || 'preview',
      ...form,
      priority: Number(form.priority) || 0,
    }),
    [editingId, form]
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const promos = await fetchPromoSpotlightsForAdmin();
      setItems(promos || []);
      const stats = await fetchPromoSpotlightStats(promos.map((p) => p.id));
      setStatsByPromoId(stats || {});
    } catch (error) {
      console.log('PromoSpotlight admin load failed:', error?.message);
      setItems([]);
      setStatsByPromoId({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const updateField = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.92,
      allowsEditing: false,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const uploadResult = await uploadImage(
        {
          uri: asset.uri,
          name: asset.fileName || `promo-creative-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
        },
        setUploadProgress
      );

      const nextAsset = toCloudinaryAsset(uploadResult);
      const previousAsset = form.imageAsset;

      setForm((current) => ({
        ...current,
        imageUrl: nextAsset.url,
        imageAsset: nextAsset,
      }));

      if (previousAsset?.publicId && previousAsset.publicId !== nextAsset.publicId) {
        deleteCloudinaryAssets({ assets: [previousAsset] }).catch(() => {});
      }
    } catch (error) {
      Alert.alert('Upload failed', error?.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.imageUrl.trim()) return 'Upload a promotional creative image.';
    if (form.actionType !== 'none' && !form.actionUrl.trim()) return 'Action Target (URL or Route) is required.';
    if (form.startAt && Number.isNaN(Date.parse(form.startAt))) return 'Start date is invalid.';
    if (form.endAt && Number.isNaN(Date.parse(form.endAt))) return 'End date is invalid.';
    if (form.startAt && form.endAt && new Date(form.startAt) > new Date(form.endAt)) {
      return 'Start date must be before End date.';
    }
    return '';
  };

  const save = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Check promotion', error);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        priority: Number(form.priority) || 0,
        updatedByName: profile?.username || user?.email || 'Admin',
      };
      if (editingId) {
        await updatePromoSpotlight(editingId, payload);
      } else {
        await createPromoSpotlight(payload);
      }
      resetForm();
      await loadItems();
      Alert.alert('Success', `PromoSpotlight successfully ${editingId ? 'updated' : 'created'}.`);
    } catch (error) {
      Alert.alert('Save failed', error?.message || 'Could not save promotion.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm(formFromPromo(item));
    setIsFormOpen(true);
  };

  const remove = (item) => {
    Alert.alert('Delete PromoSpotlight', `Are you sure you want to delete "${item.title || 'Untitled'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMediaDocument('promoSpotlights', item.id);
            if (editingId === item.id) resetForm();
            await loadItems();
          } catch (error) {
            Alert.alert('Delete failed', error?.message || 'Could not delete promotion.');
          }
        },
      },
    ]);
  };

  const openDatePicker = (field) => {
    const currentDateVal = form[field] ? new Date(form[field]) : new Date();
    const validDate = isNaN(currentDateVal.getTime()) ? new Date() : currentDateVal;
    setDatePickerConfig({
      visible: true,
      field,
      mode: 'date',
      tempDate: validDate,
    });
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        setDatePickerConfig((prev) => ({ ...prev, visible: false }));
        return;
      }
      if (selectedDate) {
        if (datePickerConfig.mode === 'date') {
          const currentTemp = new Date(selectedDate);
          setDatePickerConfig({
            visible: true,
            field: datePickerConfig.field,
            mode: 'time',
            tempDate: currentTemp,
          });
        } else {
          updateField(datePickerConfig.field, selectedDate.toISOString());
          setDatePickerConfig((prev) => ({ ...prev, visible: false }));
        }
      }
    } else if (selectedDate) {
      setDatePickerConfig((prev) => ({ ...prev, tempDate: selectedDate }));
    }
  };

  const confirmIOSDate = () => {
    updateField(datePickerConfig.field, datePickerConfig.tempDate.toISOString());
    setDatePickerConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <View style={styles.wrap}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>Spotlight Studio</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{items.length} Active</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Craft and manage high-converting takeover campaigns</Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.previewButton} onPress={() => setPreviewVisible(true)}>
            <Ionicons name="eye-outline" size={16} color={palette.indigo} />
            <Text style={styles.previewText}>Preview</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleFormButton, isFormOpen && styles.toggleFormButtonActive]}
            onPress={() => setIsFormOpen((prev) => !prev)}
          >
            <Ionicons name={isFormOpen ? 'chevron-up-outline' : 'add-outline'} size={18} color={isFormOpen ? palette.indigo : palette.white} />
          </Pressable>
        </View>
      </View>

      {/* Accordion Form */}
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
                <Ionicons name="refresh-outline" size={12} color={palette.error} />
                <Text style={styles.resetBadgeText}>Cancel Edit</Text>
              </Pressable>
            )}
          </View>

          {/* Section 1: Campaign Category */}
          <SectionBlock title="1. Campaign Type" palette={palette} styles={styles}>
            <View style={styles.typeGrid}>
              {TYPES.map((t) => {
                const active = form.type === t.key;
                return (
                  <Pressable
                    key={t.key}
                    style={[styles.typeCard, active && { borderColor: t.color, backgroundColor: t.color + '12' }]}
                    onPress={() => updateField('type', t.key)}
                  >
                    <Ionicons name={t.icon} size={20} color={active ? t.color : palette.inkSoft} />
                    <Text style={[styles.typeCardLabel, active && { color: t.color, fontWeight: '800' }]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionBlock>

          {/* Section 2: Visual Creative */}
          <SectionBlock title="2. Visual Asset" palette={palette} styles={styles}>
            <Pressable style={styles.uploadBox} onPress={pickCreative} disabled={uploading}>
              {form.imageUrl ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: form.imageUrl }} style={styles.uploadImage} contentFit="cover" />
                  <View style={styles.reuploadBadge}>
                    <Ionicons name="camera-outline" size={14} color={palette.white} />
                    <Text style={styles.reuploadText}>Replace Creative</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadEmpty}>
                  <View style={styles.uploadIconCircle}>
                    <Ionicons name="cloud-upload-outline" size={26} color={palette.indigo} />
                  </View>
                  <Text style={styles.uploadText}>Drop image here or browse</Text>
                  <Text style={styles.uploadHint}>Vertical Banner (4:5 or 9:16 portrait)</Text>
                </View>
              )}
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color={palette.white} size="large" />
                  <Text style={styles.uploadOverlayText}>{uploadProgress}% uploaded</Text>
                </View>
              )}
            </Pressable>
          </SectionBlock>

          {/* Section 3: Content & Messaging */}
          <SectionBlock title="3. Content & Copy" palette={palette} styles={styles}>
            <Field
              label="Headline *"
              value={form.title}
              onChangeText={(val) => updateField('title', val)}
              placeholder="e.g., Campus Challenge Arena is Live!"
              palette={palette}
              styles={styles}
            />
            <Field
              label="Body Copy"
              value={form.description}
              onChangeText={(val) => updateField('description', val)}
              placeholder="Short engaging message that drives action..."
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
                  palette={palette}
                  styles={styles}
                />
              </View>
            )}
          </SectionBlock>

          {/* Section 4: Styling & Gradient Presets */}
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
                      updateField('gradientStart', p.start);
                      updateField('gradientEnd', p.end);
                    }}
                  >
                    <View style={[styles.colorPreviewCircle, { backgroundColor: p.start }]} />
                    <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{p.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.row}>
              <Field
                label="Start Hex"
                value={form.gradientStart}
                onChangeText={(val) => updateField('gradientStart', val || '#')}
                placeholder="#1A1A2E"
                autoCapitalize="none"
                containerStyle={styles.flex}
                palette={palette}
                styles={styles}
              />
              <Field
                label="End Hex"
                value={form.gradientEnd}
                onChangeText={(val) => updateField('gradientEnd', val || '#')}
                placeholder="#0F0F23"
                autoCapitalize="none"
                containerStyle={styles.flex}
                palette={palette}
                styles={styles}
              />
            </View>
          </SectionBlock>

          {/* Section 5: Interactive Actions & Linkage */}
          <SectionBlock title="5. Action & Links" palette={palette} styles={styles}>
            <View style={styles.row}>
              <Field
                label="CTA Button Text"
                value={form.buttonText}
                onChangeText={(val) => updateField('buttonText', val)}
                placeholder="Learn More"
                containerStyle={styles.flex}
                palette={palette}
                styles={styles}
              />
              <Field
                label="Priority"
                value={form.priority}
                onChangeText={(val) => updateField('priority', val)}
                keyboardType="numeric"
                containerStyle={{ width: 90 }}
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
                    <Ionicons name={a.icon} size={14} color={active ? palette.white : palette.inkSoft} style={{ marginRight: 4 }} />
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
                placeholder={form.actionType === 'external_url' ? 'https://example.com' : '/screens/home'}
                autoCapitalize="none"
                palette={palette}
                styles={styles}
              />
            )}
          </SectionBlock>

          {/* Section 6: Schedule & Status */}
          <SectionBlock title="6. Availability & Schedule" palette={palette} styles={styles}>
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
                trackColor={{ false: palette.border, true: palette.indigoSoft }}
                thumbColor={form.enabled ? palette.indigo : palette.muted}
              />
            </View>
          </SectionBlock>

          {/* Submit CTA */}
          <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <View style={styles.saveBtnRow}>
                <Ionicons name={isEditing ? 'checkmark-circle-outline' : 'rocket-outline'} size={18} color={palette.white} />
                <Text style={styles.saveText}>{isEditing ? 'Update Spotlight' : 'Publish Spotlight'}</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* Date Picker Modal */}
      {datePickerConfig.visible && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={datePickerConfig.visible}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select {datePickerConfig.field === 'startAt' ? 'Start' : 'End'} Schedule</Text>
                <Pressable onPress={() => setDatePickerConfig((prev) => ({ ...prev, visible: false }))}>
                  <Ionicons name="close-circle" size={24} color={palette.inkSoft} />
                </Pressable>
              </View>
              <DateTimePicker
                value={datePickerConfig.tempDate}
                mode="datetime"
                display="spinner"
                onChange={handleDateChange}
                textColor={palette.ink}
              />
              <View style={styles.pickerActions}>
                <Pressable style={styles.pickerCancelBtn} onPress={() => setDatePickerConfig((prev) => ({ ...prev, visible: false }))}>
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

      {datePickerConfig.visible && Platform.OS === 'android' && (
        <DateTimePicker
          value={datePickerConfig.tempDate}
          mode={datePickerConfig.mode}
          is24Hour={false}
          onChange={handleDateChange}
        />
      )}

      {/* Campaign Inventory List */}
      <View style={styles.listHeaderContainer}>
        <Text style={styles.sectionTitle}>Campaign Inventory</Text>
        <Text style={styles.inventoryCount}>{items.length} Campaigns</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.indigo} style={{ marginVertical: 20 }} />
      ) : (
        <ScrollView style={styles.list} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {items.length ? (
            items.map((item) => (
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
                    <View style={[styles.statusTag, item.enabled ? styles.statusTagActive : styles.statusTagInactive]}>
                      <Text style={[styles.statusTagText, item.enabled ? styles.statusTextActive : styles.statusTextInactive]}>
                        {item.enabled ? 'Active' : 'Paused'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemMeta}>Priority P{item.priority} • {item.type}</Text>
                  
                  {/* Performance Metrics Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                      <Ionicons name="eye-outline" size={11} color={palette.inkSoft} />
                      <Text style={styles.statChipText}>{statsByPromoId[item.id]?.impressions || 0}</Text>
                    </View>
                    <View style={styles.statChip}>
                      <Ionicons name="cursor-outline" size={11} color={palette.inkSoft} />
                      <Text style={styles.statChipText}>{statsByPromoId[item.id]?.clicks || 0}</Text>
                    </View>
                    <View style={styles.statChip}>
                      <Ionicons name="trending-up-outline" size={11} color={palette.indigo} />
                      <Text style={[styles.statChipText, { color: palette.indigo }]}>{statsByPromoId[item.id]?.ctr || 0}% CTR</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.itemActions}>
                  <Pressable style={styles.iconButton} onPress={() => edit(item)}>
                    <Ionicons name="create-outline" size={16} color={palette.indigo} />
                  </Pressable>
                  <Pressable style={[styles.iconButton, styles.deleteIcon]} onPress={() => remove(item)}>
                    <Ionicons name="trash-outline" size={16} color={palette.error} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={36} color={palette.muted} />
              <Text style={styles.emptyText}>No promotions configured yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Live Preview Modal Component */}
      <PromoSpotlight
        promo={previewPromo}
        visible={previewVisible}
        onDismiss={() => setPreviewVisible(false)}
        onAction={() => setPreviewVisible(false)}
      />
    </View>
  );
}

function SectionBlock({ title, children, palette, styles }) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionBlockTitle}>{title}</Text>
      <View style={styles.sectionBlockBody}>{children}</View>
    </View>
  );
}

function Field({ label, containerStyle, multiline = false, palette, styles, ...props }) {
  return (
    <View style={[styles.field, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
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
        <Text style={[styles.dateTriggerText, !isSet && styles.dateTriggerPlaceholder]} numberOfLines={1}>
          {value}
        </Text>
        {isSet && (
          <Pressable onPress={onClear} style={styles.clearDateBtn}>
            <Ionicons name="close-circle" size={15} color={palette.inkSoft} />
          </Pressable>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = (palette) =>
  StyleSheet.create({
    wrap: { gap: 14, backgroundColor: palette.bgLight, padding: 12, borderRadius: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleContainer: { flex: 1 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 22, fontWeight: '900', color: palette.ink, letterSpacing: -0.5 },
    badgeCount: { backgroundColor: palette.indigoSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
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
      justify: 'center',
    },
    toggleFormButtonActive: { backgroundColor: palette.indigoSoft },

    /* Form Styles */
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
    formHeaderTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    formHeaderIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: palette.indigoSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
    resetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: palette.errorSoft },
    resetBadgeText: { fontSize: 11, color: palette.error, fontWeight: '700' },

    sectionBlock: { gap: 8, borderBottomWidth: 1, borderBottomColor: palette.border + '50', paddingBottom: 14 },
    sectionBlockTitle: { fontSize: 12, fontWeight: '800', color: palette.indigo, textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionBlockBody: { gap: 10 },

    typeGrid: { flexDirection: 'row', gap: 8 },
    typeCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 10,
      backgroundColor: palette.surface,
    },
    typeCardLabel: { fontSize: 11, fontWeight: '700', color: palette.inkSoft },

    field: { gap: 5 },
    label: { fontSize: 12, color: palette.ink, fontWeight: '700' },
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

    uploadBox: {
      height: 180,
      borderRadius: 12,
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
    reuploadText: { color: palette.white, fontSize: 11, fontWeight: '700' },
    uploadEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
    uploadIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
    uploadText: { color: palette.indigoDark, fontWeight: '800', fontSize: 13 },
    uploadHint: { color: palette.inkSoft, fontSize: 11 },
    uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center', justifyContent: 'center', gap: 8 },
    uploadOverlayText: { color: palette.white, fontWeight: '800', fontSize: 13 },

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
    colorPreviewCircle: { width: 12, height: 12, borderRadius: 6 },
    presetChipText: { fontSize: 11, fontWeight: '600', color: palette.inkSoft },
    presetChipTextActive: { color: palette.indigo, fontWeight: '800' },

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
    segmentActive: { backgroundColor: palette.indigo, borderColor: palette.indigo },
    segmentText: { fontSize: 11, fontWeight: '700', color: palette.inkSoft },
    segmentTextActive: { color: palette.white },

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
    },
    dateTriggerText: { flex: 1, fontSize: 11, fontWeight: '600', color: palette.ink },
    dateTriggerPlaceholder: { color: palette.muted, fontWeight: '400' },
    clearDateBtn: { padding: 2 },

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
    enabledTextGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    enabledTitle: { fontSize: 12, fontWeight: '700', color: palette.ink },
    enabledSubtitle: { fontSize: 11, color: palette.inkSoft },

    saveButton: { backgroundColor: palette.indigo, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    saveBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    saveText: { color: palette.white, fontWeight: '800', fontSize: 13 },
    disabled: { opacity: 0.65 },

    /* Inventory List Styles */
    listHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
    inventoryCount: { fontSize: 12, color: palette.inkSoft, fontWeight: '600' },
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
    itemImage: { width: 44, height: 56, borderRadius: 8 },
    itemImageFallback: { width: 44, height: 56, borderRadius: 8, backgroundColor: palette.indigoSoft, alignItems: 'center', justifyContent: 'center' },
    itemBody: { flex: 1, gap: 2 },
    itemTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    itemTitle: { fontSize: 13, fontWeight: '800', color: palette.ink, flex: 1 },
    statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    statusTagActive: { backgroundColor: palette.successSoft },
    statusTagInactive: { backgroundColor: palette.errorSoft },
    statusTagText: { fontSize: 10, fontWeight: '800' },
    statusTextActive: { color: palette.success },
    statusTextInactive: { color: palette.error },
    itemMeta: { color: palette.inkSoft, fontSize: 11 },

    statsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    statChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statChipText: { fontSize: 10, fontWeight: '700', color: palette.inkSoft },

    itemActions: { flexDirection: 'row', gap: 6 },
    iconButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: palette.indigoSoft, alignItems: 'center', justifyContent: 'center' },
    deleteIcon: { backgroundColor: palette.errorSoft },
    empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyText: { color: palette.inkSoft, fontWeight: '600', fontSize: 13 },

    /* Modal */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    pickerContainer: { width: '100%', backgroundColor: palette.surface, borderRadius: 16, padding: 16, gap: 12 },
    pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pickerTitle: { fontSize: 15, fontWeight: '800', color: palette.ink },
    pickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
    pickerCancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    pickerCancelText: { color: palette.inkSoft, fontWeight: '700' },
    pickerConfirmBtn: { backgroundColor: palette.indigo, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    pickerConfirmText: { color: palette.white, fontWeight: '800' },
  });