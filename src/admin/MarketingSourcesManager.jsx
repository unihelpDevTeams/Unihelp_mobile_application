import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTheme } from '../shared/theme/ThemeContext';
import { uploadImage } from '../../services/cloudinary';
import { deleteCloudinaryAssets } from '../../services/mediaCleanup';
import { DEFAULT_MARKETING_SOURCES } from './marketingSources';

const defaultSource = () => ({
  name: '',
  category: 'Media Partner',
  description: '',
  active: true,
  logoUrl: '',
});

export default function MarketingSourcesManager() {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandLight || '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    headerCopy: { flex: 1 },
    title: { fontSize: 17, fontWeight: '900', color: colors.textPrimary },
    subtitle: { marginTop: 3, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.greenLight || '#ECFDF5' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success || '#10B981' },
    statusText: { color: colors.success || '#10B981', fontSize: 10, fontWeight: '800' },
    formCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.borderDefault, padding: 14, gap: 10 },
    field: { gap: 6 },
    label: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
    input: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, backgroundColor: colors.inputBackground || colors.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary, fontSize: 13 },
    row: { flexDirection: 'row', gap: 8 },
    compact: { flex: 1 },
    listCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.borderDefault, padding: 12, gap: 8 },
    listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    listTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.greenLight || '#ECFDF5', borderWidth: 1, borderColor: colors.success || '#10B981' },
    badgeText: { color: colors.success || '#10B981', fontSize: 10, fontWeight: '800' },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 12, backgroundColor: colors.surfaceSecondary || colors.card, padding: 10 },
    itemTextWrap: { flex: 1 },
    itemName: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
    itemMeta: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
    actionRow: { flexDirection: 'row', gap: 8 },
    miniButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.card },
    miniButtonText: { color: colors.textPrimary, fontSize: 10, fontWeight: '800' },
    primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.brand, borderWidth: 1, borderColor: colors.brand },
    primaryButtonText: { color: colors.onBrand || '#fff', fontWeight: '800', fontSize: 12 },
    secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.card },
    secondaryButtonText: { color: colors.textPrimary, fontWeight: '800', fontSize: 12 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logo: { width: 54, height: 54, borderRadius: 13, backgroundColor: colors.surfaceSecondary || colors.brandLight, alignItems: 'center', justifyContent: 'center' },
    logoImage: { width: 54, height: 54, borderRadius: 13 },
    logoHint: { flex: 1, color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
    removeLogo: { color: colors.danger || '#DC2626', fontSize: 11, fontWeight: '800' },
    defaultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 11, borderRadius: 12, backgroundColor: colors.brandLight || '#EEF2FF' },
    defaultText: { flex: 1, color: colors.textPrimary, fontSize: 11, lineHeight: 16 },
  }), [colors]);

  const [form, setForm] = useState(defaultSource());
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadSources = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'marketingSources'), orderBy('createdAt', 'desc')));
      setSources(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    } catch (error) {
      console.warn('Marketing source fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSources(); }, []);

  const submit = async () => {
    if (!form.name?.trim()) {
      setMessage('Source name is required.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || 'Media Partner',
        description: form.description?.trim() || '',
        active: form.active !== false,
        logoUrl: form.logoUrl || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (form.id) {
        await updateDoc(doc(db, 'marketingSources', form.id), { ...payload, createdAt: form.createdAt || serverTimestamp() });
      } else {
        await addDoc(collection(db, 'marketingSources'), payload);
      }
      setForm(defaultSource());
      setMessage(form.id ? 'Media source updated.' : 'Media source created.');
      await loadSources();
    } catch (error) {
      setMessage(error.message || 'Could not save media source.');
    } finally {
      setSaving(false);
    }
  };

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('Photo permission is needed to add a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const uploaded = await uploadImage({ uri: asset.uri, name: asset.fileName || 'partner-logo.jpg', type: asset.mimeType || 'image/jpeg', size: asset.fileSize });
      setForm((prev) => ({ ...prev, logoUrl: uploaded?.secure_url || uploaded?.url || '' }));
      setMessage('Logo ready.');
    } catch (error) {
      setMessage(error.message || 'Could not upload logo.');
    } finally {
      setUploading(false);
    }
  };

  const addDefaults = async () => {
    const existing = new Set(sources.map((source) => source.name?.trim().toLowerCase()));
    const missing = DEFAULT_MARKETING_SOURCES.filter(([name]) => !existing.has(name.toLowerCase()));
    if (!missing.length) {
      setMessage('All default sources are already available.');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(missing.map(([name, category]) => addDoc(collection(db, 'marketingSources'), { ...defaultSource(), name, category, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })));
      setMessage(`${missing.length} default sources added.`);
      await loadSources();
    } catch (error) {
      setMessage(error.message || 'Could not add default sources.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSource = async (source) => {
    try {
      await updateDoc(doc(db, 'marketingSources', source.id), { active: !source.active, updatedAt: serverTimestamp() });
      await loadSources();
    } catch (error) {
      console.warn('Toggle source error:', error);
    }
  };

  const deleteSource = async (source) => {
    try {
      if (source.logoUrl) {
        await deleteCloudinaryAssets({ urls: [source.logoUrl] });
      }
      await deleteDoc(doc(db, 'marketingSources', source.id));
      await loadSources();
    } catch (error) {
      Alert.alert('Delete failed', error.message || 'Could not delete the media source and its logo.');
    }
  };

  const confirmDelete = (source) => Alert.alert('Delete media source?', `Remove ${source.name || 'this source'} from signup options?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteSource(source) },
  ]);

  const editSource = (source) => setForm({ ...defaultSource(), ...source });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="megaphone-outline" size={22} color={colors.brand} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Partner media sources</Text>
          <Text style={styles.subtitle}>Create and manage channels such as GTM Media, social channels, and campus referrals.</Text>
        </View>
        <View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>LIVE</Text></View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.field}>
          <Text style={styles.label}>Source name</Text>
          <TextInput value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} style={styles.input} placeholder="e.g. GTM Media" placeholderTextColor={colors.textSecondary} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Partnership logo</Text>
          <View style={styles.logoRow}>
            <View style={styles.logo}>{form.logoUrl ? <Image source={{ uri: form.logoUrl }} style={styles.logoImage} /> : <Ionicons name="image-outline" size={22} color={colors.textSecondary} />}</View>
            <Text style={styles.logoHint}>Add a square logo so the partner is recognizable in future referral and partnership surfaces.</Text>
            <Pressable onPress={pickLogo} disabled={uploading} style={styles.miniButton}><Text style={styles.miniButtonText}>{uploading ? 'Uploading...' : 'Choose'}</Text></Pressable>
          </View>
          {form.logoUrl ? <Pressable onPress={() => setForm((prev) => ({ ...prev, logoUrl: '' }))}><Text style={styles.removeLogo}>Remove logo</Text></Pressable> : null}
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.compact]}>
            <Text style={styles.label}>Category</Text>
            <TextInput value={form.category} onChangeText={(value) => setForm((prev) => ({ ...prev, category: value }))} style={styles.input} placeholder="Media Partner" placeholderTextColor={colors.textSecondary} />
          </View>
          <View style={[styles.field, styles.compact]}>
            <Text style={styles.label}>Status</Text>
            <Pressable onPress={() => setForm((prev) => ({ ...prev, active: !prev.active }))} style={[styles.secondaryButton, { justifyContent: 'center' }]}>
              <Text style={styles.secondaryButtonText}>{form.active ? 'Active' : 'Inactive'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput value={form.description} onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))} style={[styles.input, { minHeight: 84, textAlignVertical: 'top' }]} multiline placeholder="Short description for this partner" placeholderTextColor={colors.textSecondary} />
        </View>

        {message ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{message}</Text> : null}

        <Pressable onPress={submit} disabled={saving || uploading} style={styles.primaryButton}>
          {saving ? <ActivityIndicator size="small" color={colors.onBrand || '#fff'} /> : <Ionicons name="add-circle-outline" size={16} color={colors.onBrand || '#fff'} />}
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : form.id ? 'Save changes' : 'Create source'}</Text>
        </Pressable>
        {form.id ? <Pressable onPress={() => setForm(defaultSource())} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel edit</Text></Pressable> : null}
        <View style={styles.defaultRow}><Text style={styles.defaultText}>Need a useful starting list? Add common referral and partnership channels in one tap.</Text><Pressable onPress={addDefaults} disabled={saving} style={styles.miniButton}><Text style={styles.miniButtonText}>Add defaults</Text></Pressable></View>
      </View>

      <View style={styles.listCard}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Available sources</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{sources.length}</Text></View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : (
          <FlatList
            data={sources}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                  {item.logoUrl ? <Image source={{ uri: item.logoUrl }} style={styles.logoImage} /> : <View style={styles.logo}><Ionicons name="megaphone-outline" size={18} color={colors.brand} /></View>}
                  <View style={styles.itemTextWrap}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.category || 'Media partner'} • {item.active ? 'Active' : 'Inactive'}</Text>
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.miniButton} onPress={() => toggleSource(item)}>
                    <Text style={styles.miniButtonText}>{item.active ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                  <Pressable style={styles.miniButton} onPress={() => editSource(item)}>
                    <Text style={styles.miniButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.miniButton} onPress={() => confirmDelete(item)}>
                    <Text style={styles.miniButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}
