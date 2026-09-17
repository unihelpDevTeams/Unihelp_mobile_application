import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { uploadImage } from '../../services/cloudinary';
import { deleteCloudinaryAssets } from '../../services/mediaCleanup';
import { useAuth } from '../../context/AuthContext';
import { invalidateNewsCache } from '../shared/services/news';
import { useTheme } from '../shared/theme/ThemeContext';

const EMPTY_FORM = { title: '', body: '', priority: 'normal', category: 'Campus News', badge: 'Update', image: '', pinned: false, published: true };
const CATEGORIES = ['Campus News', 'Admissions', 'Exams', 'Scholarships', 'Funding', 'Events', 'General'];
const BADGES = ['Update', 'HOT', 'Important', 'New'];

const toDateValue = (value) => value?.toDate?.()?.getTime?.() || (value ? new Date(value).getTime() : 0);

export default function AdminNewsManager() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')));
      setItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      setMessage(error.message || 'Could not load campus news.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission needed', 'Allow photo access to add a picture to campus news.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [16, 9] });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    setMessage('Uploading news image...');
    try {
      const asset = result.assets[0];
      const uploaded = await uploadImage({ uri: asset.uri, name: asset.fileName || 'campus-news.jpg', type: asset.mimeType || 'image/jpeg', size: asset.fileSize });
      updateField('image', uploaded?.secure_url || uploaded?.url || '');
      setMessage('News image ready.');
    } catch (error) {
      setMessage(error.message || 'Could not upload the news image.');
    } finally {
      setUploading(false);
    }
  };

  const reset = ({ clearMessage = true } = {}) => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    if (clearMessage) setMessage('');
  };

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setMessage('Title and body are required.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        description: form.body.trim(),
        image: form.image || '',
        priority: form.priority,
        category: form.category,
        badge: form.badge,
        pinned: form.pinned === true,
        published: form.published !== false,
        authorName: profile?.username || 'Admin',
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), payload);
        setMessage('Campus news updated.');
      } else {
        await addDoc(collection(db, 'announcements'), { ...payload, authorId: profile?.uid || '', createdAt: serverTimestamp() });
        setMessage('Campus news published.');
      }
      invalidateNewsCache();
      reset({ clearMessage: false });
      await load();
    } catch (error) {
      setMessage(error.message || 'Could not save campus news.');
    } finally {
      setSaving(false);
    }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm({ ...EMPTY_FORM, ...item, body: item.body || item.description || '', image: item.image || item.imageUrl || '' });
    setMessage('Editing selected news item.');
  };

  const remove = (item) => Alert.alert('Delete campus news?', `Delete “${item.title || 'Untitled'}” permanently?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try {
        const imageUrl = item.image || item.imageUrl || '';
        if (imageUrl) {
          await deleteCloudinaryAssets({ urls: [imageUrl] });
        }
        await deleteDoc(doc(db, 'announcements', item.id));
        invalidateNewsCache();
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        if (editingId === item.id) reset();
      } catch (error) {
        Alert.alert('Delete failed', error.message || 'Could not delete this news item.');
      }
    } },
  ]);

  const toggle = async (item, field) => {
    try {
      await updateDoc(doc(db, 'announcements', item.id), { [field]: !item[field], updatedAt: serverTimestamp() });
      invalidateNewsCache();
      await load();
    } catch (error) {
      Alert.alert('Update failed', error.message || 'Could not update this news item.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="newspaper-outline" size={22} color={colors.brand} /></View>
        <View style={styles.headerCopy}><Text style={styles.title}>Campus News Studio</Text><Text style={styles.subtitle}>Publish polished updates with images, priority, badges, and visibility controls.</Text></View>
        <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.formHeader}><Text style={styles.formTitle}>{editingId ? 'Edit news item' : 'Create campus news'}</Text>{editingId ? <Pressable onPress={reset}><Text style={styles.cancelText}>Cancel edit</Text></Pressable> : null}</View>
        <TextInput value={form.title} onChangeText={(value) => updateField('title', value)} style={styles.input} placeholder="Headline" placeholderTextColor={colors.textSecondary} />
        <TextInput value={form.body} onChangeText={(value) => updateField('body', value)} style={[styles.input, styles.textArea]} multiline textAlignVertical="top" placeholder="Write the full update..." placeholderTextColor={colors.textSecondary} />
        <View style={styles.imageRow}>
          {form.image ? <Image source={{ uri: form.image }} style={styles.imagePreview} /> : <View style={styles.imageFallback}><Ionicons name="image-outline" size={22} color={colors.textSecondary} /></View>}
          <View style={styles.imageCopy}><Text style={styles.fieldLabel}>NEWS IMAGE</Text><Text style={styles.imageHint}>Use a clear 16:9 campus, event, or announcement image.</Text><Pressable onPress={pickImage} disabled={uploading} style={styles.outlineButton}>{uploading ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="cloud-upload-outline" size={16} color={colors.brand} />}<Text style={styles.outlineText}>{uploading ? 'Uploading...' : form.image ? 'Replace image' : 'Add image'}</Text></Pressable></View>
        </View>
        <Text style={styles.fieldLabel}>PRIORITY</Text>
        <View style={styles.chipRow}>{['normal', 'high', 'urgent'].map((value) => <Pressable key={value} onPress={() => updateField('priority', value)} style={[styles.chip, form.priority === value && styles.chipActive]}><Text style={[styles.chipText, form.priority === value && styles.chipTextActive]}>{value[0].toUpperCase() + value.slice(1)}</Text></Pressable>)}</View>
        <Text style={styles.fieldLabel}>CATEGORY</Text>
        <View style={styles.chipRow}>{CATEGORIES.map((value) => <Pressable key={value} onPress={() => updateField('category', value)} style={[styles.chip, form.category === value && styles.chipActive]}><Text style={[styles.chipText, form.category === value && styles.chipTextActive]}>{value}</Text></Pressable>)}</View>
        <Text style={styles.fieldLabel}>BADGE</Text>
        <View style={styles.chipRow}>{BADGES.map((value) => <Pressable key={value} onPress={() => updateField('badge', value)} style={[styles.chip, form.badge === value && styles.chipActive]}><Text style={[styles.chipText, form.badge === value && styles.chipTextActive]}>{value}</Text></Pressable>)}</View>
        <View style={styles.switchRow}><Text style={styles.switchLabel}>{form.pinned ? 'Pinned to the top' : 'Not pinned'}{form.published ? ' • Published' : ' • Hidden'}</Text><View style={styles.switchActions}><Pressable onPress={() => updateField('pinned', !form.pinned)} style={styles.smallButton}><Ionicons name={form.pinned ? 'pin' : 'pin-outline'} size={15} color={colors.brand} /><Text style={styles.smallButtonText}>{form.pinned ? 'Unpin' : 'Pin'}</Text></Pressable><Pressable onPress={() => updateField('published', !form.published)} style={styles.smallButton}><Ionicons name={form.published ? 'eye' : 'eye-off'} size={15} color={colors.brand} /><Text style={styles.smallButtonText}>{form.published ? 'Hide' : 'Publish'}</Text></Pressable></View></View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Pressable onPress={submit} disabled={saving || uploading} style={styles.primaryButton}>{saving ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name={editingId ? 'save-outline' : 'paper-plane-outline'} size={17} color={colors.onBrand} />}<Text style={styles.primaryText}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Publish news'}</Text></Pressable>
      </View>

      <View style={styles.listHeader}><View><Text style={styles.sectionTitle}>Published and saved news</Text><Text style={styles.sectionHint}>Edit, hide, pin, or remove any campus update.</Text></View><View style={styles.count}><Text style={styles.countText}>{items.length}</Text></View></View>
      {loading ? <ActivityIndicator color={colors.brand} /> : <FlatList data={items} scrollEnabled={false} keyExtractor={(item) => item.id} ItemSeparatorComponent={() => <View style={{ height: 9 }} />} renderItem={({ item }) => <View style={styles.newsCard}>{item.image ? <Image source={{ uri: item.image }} style={styles.newsThumb} /> : <View style={styles.newsThumbFallback}><Ionicons name="newspaper-outline" size={20} color={colors.textSecondary} /></View>}<View style={styles.newsBody}><Text style={styles.newsTitle} numberOfLines={2}>{item.title || 'Untitled'}</Text><Text style={styles.newsMeta}>{item.category || 'Campus News'} • {item.published === false ? 'Hidden' : 'Published'}{item.pinned ? ' • Pinned' : ''}</Text><Text style={styles.newsDate}>{toDateValue(item.createdAt) ? new Date(toDateValue(item.createdAt)).toLocaleDateString() : 'Recently created'}</Text></View><View style={styles.newsActions}><Pressable onPress={() => edit(item)} style={styles.iconButton}><Ionicons name="create-outline" size={18} color={colors.brand} /></Pressable><Pressable onPress={() => toggle(item, 'published')} style={styles.iconButton}><Ionicons name={item.published === false ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textSecondary} /></Pressable><Pressable onPress={() => remove(item)} style={styles.iconButton}><Ionicons name="trash-outline" size={18} color={colors.danger || '#DC2626'} /></Pressable></View></View>} />}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { gap: 14, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandLight || '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 }, title: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' }, subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 99, backgroundColor: colors.greenLight || '#ECFDF5' }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success || '#10B981' }, liveText: { color: colors.success || '#10B981', fontSize: 10, fontWeight: '900' },
  formCard: { gap: 10, padding: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.card }, formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, formTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' }, cancelText: { color: colors.brand, fontSize: 12, fontWeight: '800' }, input: { minHeight: 44, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 11, paddingHorizontal: 12, color: colors.textPrimary, backgroundColor: colors.inputBackground || colors.surfaceSecondary, fontSize: 13 }, textArea: { minHeight: 104, paddingTop: 12 },
  imageRow: { flexDirection: 'row', gap: 10, alignItems: 'center' }, imagePreview: { width: 105, height: 70, borderRadius: 11 }, imageFallback: { width: 105, height: 70, borderRadius: 11, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }, imageCopy: { flex: 1, gap: 4 }, fieldLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 }, imageHint: { color: colors.textSecondary, fontSize: 11, lineHeight: 15 }, outlineButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 }, outlineText: { color: colors.brand, fontSize: 11, fontWeight: '900' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceSecondary }, chipActive: { backgroundColor: colors.brand, borderColor: colors.brand }, chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' }, chipTextActive: { color: colors.onBrand },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, switchLabel: { flex: 1, color: colors.textSecondary, fontSize: 11, fontWeight: '700' }, switchActions: { flexDirection: 'row', gap: 6 }, smallButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: colors.borderDefault }, smallButtonText: { color: colors.brand, fontSize: 10, fontWeight: '800' },
  message: { color: colors.textSecondary, fontSize: 12 }, primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.brand }, primaryText: { color: colors.onBrand, fontWeight: '900', fontSize: 12 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' }, sectionHint: { color: colors.textSecondary, fontSize: 11, marginTop: 3 }, count: { minWidth: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandLight }, countText: { color: colors.brand, fontWeight: '900' },
  newsCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.card }, newsThumb: { width: 62, height: 62, borderRadius: 10 }, newsThumbFallback: { width: 62, height: 62, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSecondary }, newsBody: { flex: 1 }, newsTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' }, newsMeta: { color: colors.textSecondary, fontSize: 10, marginTop: 3 }, newsDate: { color: colors.textTertiary || colors.textSecondary, fontSize: 10, marginTop: 3 }, newsActions: { gap: 5 }, iconButton: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSecondary },
});
