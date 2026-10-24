import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../shared/theme/ThemeContext';
import { deleteMarketingMedia, uploadFeatureMedia } from '../shared/services/backend';
import { createHomeHeroSlide, deleteHomeHeroSlide, fetchHomeHeroSlidesForAdmin } from '../shared/services/homeHeroSlides';

const EMPTY_FORM = { title: '', linkUrl: '', order: '0' };

const assetKeyOf = (asset) => asset?.key || asset?.publicId || '';

export default function HomeHeroCarouselManager() {
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pendingAssetRef = useRef(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchHomeHeroSlidesForAdmin());
    } catch (error) {
      Alert.alert('Could not load hero slides', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => () => {
    const pending = pendingAssetRef.current;
    if (pending) deleteMarketingMedia(assetKeyOf(pending)).catch(() => {});
  }, []);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a home banner.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setUploading(true);
    try {
      const uploaded = await uploadFeatureMedia({
        uri: asset.uri,
        name: asset.fileName || `home-hero-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 0,
      }, { feature: 'marketing', resourceType: 'image' });
      const url = uploaded?.secure_url || uploaded?.url || '';
      const key = uploaded?.key || uploaded?.publicId || '';
      if (!url || !key) throw new Error('Upload did not return an image URL and storage key.');

      const nextAsset = { url, key, publicId: key, resourceType: 'image', storageProvider: 'r2' };
      const previousAsset = pendingAssetRef.current;
      pendingAssetRef.current = nextAsset;
      setImage({ url, asset: nextAsset });
      if (previousAsset && assetKeyOf(previousAsset) !== key) {
        await deleteMarketingMedia(assetKeyOf(previousAsset)).catch((error) => {
          console.warn('[HomeHeroCarouselManager] Could not remove replaced upload:', error?.message || error);
        });
      }
    } catch (error) {
      Alert.alert('Upload failed', error?.message || 'Could not upload the banner image.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const title = form.title.trim();
    const linkUrl = form.linkUrl.trim();
    if (!title || !image?.url || !linkUrl) {
      Alert.alert('Complete the slide', 'Add a title, image, and redirect link.');
      return;
    }
    if (!linkUrl.startsWith('/') && !/^https?:\/\//i.test(linkUrl)) {
      Alert.alert('Invalid redirect link', 'Use an app route beginning with / or a full http(s) URL.');
      return;
    }
    if (linkUrl.startsWith('//')) {
      Alert.alert('Invalid redirect link', 'App routes must begin with a single /.');
      return;
    }

    setSaving(true);
    try {
      await createHomeHeroSlide({
        title,
        linkUrl,
        imageUrl: image.url,
        imageAsset: image.asset,
        order: form.order,
        enabled: true,
      });
      pendingAssetRef.current = null;
      setForm(EMPTY_FORM);
      setImage(null);
      await loadItems();
    } catch (error) {
      Alert.alert('Could not save slide', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item) => {
    Alert.alert('Delete hero slide?', `Remove “${item.title || 'Home banner'}” from the carousel?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const key = assetKeyOf(item.imageAsset);
            if (key) await deleteMarketingMedia(key);
            await deleteHomeHeroSlide(item.id);
            await loadItems();
          } catch (error) {
            Alert.alert('Could not delete slide', error?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const styles = {
    wrap: { gap: 18, paddingBottom: 24 },
    heading: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
    copy: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
    form: { gap: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.card },
    input: { minHeight: 46, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.inputBackground, color: colors.textPrimary },
    imageButton: { minHeight: 48, borderRadius: 9, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    imagePreview: { width: '100%', height: 150, borderRadius: 9, backgroundColor: colors.surfaceSecondary },
    saveButton: { minHeight: 46, borderRadius: 9, paddingHorizontal: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    saveText: { color: colors.onBrand, fontWeight: '800' },
    sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault },
    itemImage: { width: 76, height: 52, borderRadius: 6, backgroundColor: colors.surfaceSecondary },
    itemBody: { flex: 1, gap: 4 },
    itemTitle: { color: colors.textPrimary, fontWeight: '800' },
    itemLink: { color: colors.textSecondary, fontSize: 11 },
    deleteButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    buttonLabel: { color: colors.brand, fontWeight: '800' },
    empty: { color: colors.textSecondary, fontSize: 13, paddingVertical: 8 },
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 5 }}>
        <Text style={styles.heading}>Home hero carousel</Text>
        <Text style={styles.copy}>Add image banners with an app route or website link. Slides are added to the existing carousel.</Text>
      </View>

      <View style={styles.form}>
        <TextInput value={form.title} onChangeText={(value) => updateField('title', value)} placeholder="Banner title" placeholderTextColor={colors.placeholder} style={styles.input} maxLength={70} />
        <TextInput value={form.linkUrl} onChangeText={(value) => updateField('linkUrl', value)} placeholder="Redirect link (e.g. /premium or https://...)" placeholderTextColor={colors.placeholder} style={styles.input} autoCapitalize="none" keyboardType="url" />
        <TextInput value={form.order} onChangeText={(value) => updateField('order', value.replace(/[^0-9]/g, ''))} placeholder="Order (lower numbers first)" placeholderTextColor={colors.placeholder} style={styles.input} keyboardType="number-pad" />
        <Pressable style={styles.imageButton} onPress={pickImage} disabled={uploading} accessibilityRole="button">
          {uploading ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="image-outline" size={18} color={colors.brand} />}
          <Text style={styles.buttonLabel}>{uploading ? 'Uploading image…' : image ? 'Replace banner image' : 'Choose banner image'}</Text>
        </Pressable>
        {image?.url ? <Image source={{ uri: image.url }} style={styles.imagePreview} contentFit="cover" /> : null}
        <Pressable style={styles.saveButton} onPress={save} disabled={saving || uploading} accessibilityRole="button">
          {saving ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="add" size={19} color={colors.onBrand} />}
          <Text style={styles.saveText}>{saving ? 'Adding slide…' : 'Add to carousel'}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Current image slides</Text>
      {loading ? <ActivityIndicator color={colors.brand} /> : items.length ? items.map((item) => (
        <View key={item.id} style={styles.item}>
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
          <View style={styles.itemBody}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.itemLink} numberOfLines={1}>{item.linkUrl}</Text>
          </View>
          <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item)} accessibilityRole="button" accessibilityLabel={`Delete ${item.title} banner`}>
            <Ionicons name="trash-outline" size={19} color={colors.danger || colors.error} />
          </Pressable>
        </View>
      )) : <Text style={styles.empty}>No admin image slides have been added.</Text>}
    </ScrollView>
  );
}