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

const COLORS = {
  indigo: '#6366F1',
  indigoDark: '#4338CA',
  indigoSoft: '#EEF2FF',
  white: '#FFFFFF',
  ink: '#0F172A',
  inkSoft: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  successSoft: '#ECFDF5',
  error: '#EF4444',
  errorSoft: '#FEF2F2',
  amber: '#F59E0B',
  amberSoft: '#FEF3E1',
  bgLight: '#F8FAFC',
};

const TYPES = [
  { key: 'external_ad', label: 'External Ad', icon: 'megaphone-outline' },
  { key: 'unihelp_promotion', label: 'UniHelp', icon: 'sparkles-outline' },
  { key: 'announcement', label: 'Announcement', icon: 'notifications-outline' },
];

const ACTION_TYPES = [
  { key: 'none', label: 'None' },
  { key: 'external_url', label: 'External URL' },
  { key: 'screen', label: 'Screen Route' },
  { key: 'deep_link', label: 'Deep Link' },
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
  if (!isoString) return 'Not set (Starts immediately)';
  const parsed = new Date(isoString);
  if (isNaN(parsed.getTime())) return 'Invalid date';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function PromoSpotlightManager() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState([]);
  const [statsByPromoId, setStatsByPromoId] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Date Picker State
  const [datePickerConfig, setDatePickerConfig] = useState({
    visible: false,
    field: null, // 'startAt' | 'endAt'
    mode: 'date', // 'date' | 'time'
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
    if (!form.imageUrl.trim()) return 'Upload a promotional creative.';
    if (form.actionType !== 'none' && !form.actionUrl.trim()) return 'Action URL or screen route is required.';
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

  // Date Picker Logic Fix for Android & iOS
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
          // Store selected date temporarily and trigger time picker on Android
          const currentTemp = new Date(selectedDate);
          setDatePickerConfig({
            visible: true,
            field: datePickerConfig.field,
            mode: 'time',
            tempDate: currentTemp,
          });
        } else {
          // Time chosen, apply final date string
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
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>PromoSpotlights</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{items.length}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Manage app-launch takeover banners & ads.</Text>
        </View>
        <Pressable style={styles.previewButton} onPress={() => setPreviewVisible(true)}>
          <Ionicons name="eye-outline" size={16} color={COLORS.indigoDark} />
          <Text style={styles.previewText}>Preview</Text>
        </Pressable>
      </View>

      {/* Main Form Container */}
      <View style={styles.formCard}>
        <Text style={styles.cardHeader}>{isEditing ? 'Edit Promotion' : 'Create New Promotion'}</Text>

        <Segmented label="Promotion Type" options={TYPES} value={form.type} onChange={(val) => updateField('type', val)} />

        {/* Upload Box */}
        <Pressable style={styles.uploadBox} onPress={pickCreative} disabled={uploading}>
          {form.imageUrl ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: form.imageUrl }} style={styles.uploadImage} contentFit="cover" />
              <View style={styles.reuploadBadge}>
                <Ionicons name="camera-outline" size={14} color={COLORS.white} />
                <Text style={styles.reuploadText}>Change Image</Text>
              </View>
            </View>
          ) : (
            <View style={styles.uploadEmpty}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload-outline" size={24} color={COLORS.indigo} />
              </View>
              <Text style={styles.uploadText}>Upload Portrait Banner</Text>
              <Text style={styles.uploadHint}>Recommended aspect ratio 4:5 or 9:16</Text>
            </View>
          )}
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={COLORS.white} size="large" />
              <Text style={styles.uploadOverlayText}>{uploadProgress}% uploaded</Text>
            </View>
          )}
        </Pressable>

        <Field label="Title *" value={form.title} onChangeText={(val) => updateField('title', val)} placeholder="e.g. Campus Challenge Arena is Live!" />
        <Field label="Description" value={form.description} onChangeText={(val) => updateField('description', val)} placeholder="Short engaging copy for users..." multiline />

        {form.type === 'external_ad' && (
          <View style={styles.row}>
            <Field label="Advertiser Name" value={form.advertiserName} onChangeText={(val) => updateField('advertiserName', val)} placeholder="e.g. Campus Bites" containerStyle={styles.flex} />
            <Field label="Logo URL" value={form.advertiserLogoUrl} onChangeText={(val) => updateField('advertiserLogoUrl', val)} placeholder="https://..." containerStyle={styles.flex} autoCapitalize="none" />
          </View>
        )}

        <View style={styles.row}>
          <Field label="CTA Button Text" value={form.buttonText} onChangeText={(val) => updateField('buttonText', val)} placeholder="Learn More" containerStyle={styles.flex} />
          <Field label="Priority" value={form.priority} onChangeText={(val) => updateField('priority', val)} keyboardType="numeric" containerStyle={{ width: 90 }} />
        </View>

        <Segmented label="Action Link Type" options={ACTION_TYPES} value={form.actionType} onChange={(val) => updateField('actionType', val)} />

        {form.actionType !== 'none' && (
          <Field label="Action Target (URL or Route)" value={form.actionUrl} onChangeText={(val) => updateField('actionUrl', val)} placeholder={form.actionType === 'external_url' ? 'https://example.com' : '/screens/home'} autoCapitalize="none" />
        )}

        {/* Schedule Inputs with Date Pickers */}
        <View style={styles.datePickerSection}>
          <Text style={styles.label}>Campaign Schedule</Text>
          <View style={styles.row}>
            <DatePickerTrigger
              label="Starts At"
              value={formatDisplayDate(form.startAt)}
              isSet={Boolean(form.startAt)}
              onPress={() => openDatePicker('startAt')}
              onClear={() => updateField('startAt', '')}
              containerStyle={styles.flex}
            />
            <DatePickerTrigger
              label="Ends At"
              value={formatDisplayDate(form.endAt)}
              isSet={Boolean(form.endAt)}
              onPress={() => openDatePicker('endAt')}
              onClear={() => updateField('endAt', '')}
              containerStyle={styles.flex}
            />
          </View>
        </View>

        {/* Switch Status */}
        <View style={styles.enabledBox}>
          <View>
            <Text style={styles.enabledTitle}>Active Status</Text>
            <Text style={styles.enabledSubtitle}>Enable or disable this promo immediately</Text>
          </View>
          <Switch
            value={form.enabled}
            onValueChange={(val) => updateField('enabled', val)}
            trackColor={{ false: COLORS.border, true: COLORS.indigoSoft }}
            thumbColor={form.enabled ? COLORS.indigo : '#94A3B8'}
          />
        </View>

        {/* Form Actions */}
        <View style={styles.actions}>
          {isEditing && (
            <Pressable style={styles.secondaryButton} onPress={resetForm}>
              <Text style={styles.secondaryText}>Cancel Edit</Text>
            </Pressable>
          )}
          <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>{isEditing ? 'Update Campaign' : 'Publish Campaign'}</Text>}
          </Pressable>
        </View>
      </View>

      {/* Date Picker Interface */}
      {datePickerConfig.visible && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={datePickerConfig.visible}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select {datePickerConfig.field === 'startAt' ? 'Start' : 'End'} Date & Time</Text>
                <Pressable onPress={() => setDatePickerConfig((prev) => ({ ...prev, visible: false }))}>
                  <Ionicons name="close-circle" size={24} color={COLORS.inkSoft} />
                </Pressable>
              </View>
              <DateTimePicker
                value={datePickerConfig.tempDate}
                mode="datetime"
                display="spinner"
                onChange={handleDateChange}
                textColor={COLORS.ink}
              />
              <View style={styles.pickerActions}>
                <Pressable style={styles.pickerCancelBtn} onPress={() => setDatePickerConfig((prev) => ({ ...prev, visible: false }))}>
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.pickerConfirmBtn} onPress={confirmIOSDate}>
                  <Text style={styles.pickerConfirmText}>Set Date</Text>
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

      {/* List Section */}
      <Text style={styles.sectionTitle}>Campaign Inventory</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.indigo} style={{ marginVertical: 20 }} />
      ) : (
        <ScrollView style={styles.list} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {items.length ? (
            items.map((item) => (
              <View key={item.id} style={[styles.itemCard, editingId === item.id && styles.itemCardSelected]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
                ) : (
                  <View style={styles.itemImageFallback}>
                    <Ionicons name="image-outline" size={20} color={COLORS.inkSoft} />
                  </View>
                )}
                <View style={styles.itemBody}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title || 'Untitled Campaign'}
                    </Text>
                    <View style={[styles.statusTag, item.enabled ? styles.statusTagActive : styles.statusTagInactive]}>
                      <Text style={[styles.statusTagText, item.enabled ? styles.statusTextActive : styles.statusTextInactive]}>
                        {item.enabled ? 'Active' : 'Disabled'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemMeta}>
                    Priority: {item.priority} • Type: {item.type}
                  </Text>
                  <Text style={styles.itemStats}>
                    {statsByPromoId[item.id]?.impressions || 0} views - {statsByPromoId[item.id]?.clicks || 0} clicks - {statsByPromoId[item.id]?.dismissals || 0} dismissals - {statsByPromoId[item.id]?.ctr || 0}% CTR
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <Pressable style={styles.iconButton} onPress={() => edit(item)}>
                    <Ionicons name="pencil-sharp" size={15} color={COLORS.indigo} />
                  </Pressable>
                  <Pressable style={[styles.iconButton, styles.deleteIcon]} onPress={() => remove(item)}>
                    <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={32} color={COLORS.inkSoft} />
              <Text style={styles.emptyText}>No promotions configured yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Preview Modal */}
      <PromoSpotlight
        promo={previewPromo}
        visible={previewVisible}
        onDismiss={() => setPreviewVisible(false)}
        onAction={() => setPreviewVisible(false)}
      />
    </View>
  );
}

function Field({ label, containerStyle, multiline = false, ...props }) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor="#94A3B8"
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

function DatePickerTrigger({ label, value, isSet, onPress, onClear, containerStyle }) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dateTrigger} onPress={onPress}>
        <Ionicons name="calendar-outline" size={16} color={isSet ? COLORS.indigo : COLORS.inkSoft} />
        <Text style={[styles.dateTriggerText, !isSet && styles.dateTriggerPlaceholder]} numberOfLines={1}>
          {value}
        </Text>
        {isSet && (
          <Pressable onPress={onClear} style={styles.clearDateBtn}>
            <Ionicons name="close-circle" size={16} color={COLORS.inkSoft} />
          </Pressable>
        )}
      </Pressable>
    </View>
  );
}

function Segmented({ label, options, value, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentWrap}>
        {options.map((option) => {
          const active = option.key === value;
          return (
            <Pressable key={option.key} style={[styles.segment, active && styles.segmentActive]} onPress={() => onChange(option.key)}>
              {option.icon && <Ionicons name={option.icon} size={14} color={active ? COLORS.white : COLORS.inkSoft} style={{ marginRight: 4 }} />}
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16, backgroundColor: COLORS.bgLight, padding: 12, borderRadius: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '900', color: COLORS.ink },
  badgeCount: { backgroundColor: COLORS.indigoSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeCountText: { fontSize: 12, fontWeight: '800', color: COLORS.indigoDark },
  subtitle: { marginTop: 2, fontSize: 12, color: COLORS.inkSoft },
  previewButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.indigoSoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  previewText: { color: COLORS.indigoDark, fontWeight: '800', fontSize: 12 },
  formCard: { backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 2 },
  cardHeader: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 2 },
  field: { gap: 6 },
  label: { fontSize: 12, color: COLORS.ink, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.ink, fontSize: 13, backgroundColor: COLORS.white },
  textArea: { minHeight: 76 },
  uploadBox: { height: 200, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.indigo, overflow: 'hidden', backgroundColor: COLORS.indigoSoft },
  imagePreviewContainer: { width: '100%', height: '100%', position: 'relative' },
  uploadImage: { width: '100%', height: '100%' },
  reuploadBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(15,23,42,0.75)', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  reuploadText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  uploadEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  uploadIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  uploadText: { color: COLORS.indigoDark, fontWeight: '800', fontSize: 13 },
  uploadHint: { color: COLORS.inkSoft, fontSize: 11 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.65)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadOverlayText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: COLORS.white },
  segmentActive: { backgroundColor: COLORS.indigo, borderColor: COLORS.indigo },
  segmentText: { fontSize: 12, fontWeight: '700', color: COLORS.inkSoft },
  segmentTextActive: { color: COLORS.white },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  datePickerSection: { gap: 6 },
  dateTrigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: COLORS.white, gap: 8 },
  dateTriggerText: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.ink },
  dateTriggerPlaceholder: { color: '#94A3B8', fontWeight: '400' },
  clearDateBtn: { padding: 2 },
  enabledBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight },
  enabledTitle: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  enabledSubtitle: { fontSize: 11, color: COLORS.inkSoft },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  saveButton: { backgroundColor: COLORS.indigo, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, minWidth: 140, alignItems: 'center' },
  saveText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  secondaryText: { color: COLORS.inkSoft, fontWeight: '700', fontSize: 13 },
  disabled: { opacity: 0.65 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginTop: 4 },
  list: { maxHeight: 360 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 10, marginBottom: 8 },
  itemCardSelected: { borderColor: COLORS.indigo, borderWidth: 1.5 },
  itemImage: { width: 48, height: 60, borderRadius: 8 },
  itemImageFallback: { width: 48, height: 60, borderRadius: 8, backgroundColor: COLORS.indigoSoft, alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, gap: 2 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  itemTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink, flex: 1 },
  statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusTagActive: { backgroundColor: COLORS.successSoft },
  statusTagInactive: { backgroundColor: COLORS.errorSoft },
  statusTagText: { fontSize: 10, fontWeight: '800' },
  statusTextActive: { color: COLORS.success },
  statusTextInactive: { color: COLORS.error },
  itemMeta: { color: COLORS.inkSoft, fontSize: 11 },
  itemStats: { color: COLORS.ink, fontSize: 11, fontWeight: '700' },
  itemActions: { flexDirection: 'row', gap: 6 },
  iconButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.indigoSoft, alignItems: 'center', justifyContent: 'center' },
  deleteIcon: { backgroundColor: COLORS.errorSoft },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { color: COLORS.inkSoft, fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerContainer: { width: '100%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, gap: 12 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  pickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  pickerCancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  pickerCancelText: { color: COLORS.inkSoft, fontWeight: '700' },
  pickerConfirmBtn: { backgroundColor: COLORS.indigo, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  pickerConfirmText: { color: COLORS.white, fontWeight: '800' },
});