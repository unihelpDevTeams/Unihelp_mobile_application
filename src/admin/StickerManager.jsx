import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  createOfficialPack,
  createOfficialSticker,
  fetchStickerPacks,
  fetchStickers,
  seedDefaultFreeStickers,
  uploadStickerMedia,
} from '../shared/services/stickers';

export default function StickerManager({ colors }) {
  const styles = useMemo(() => ({
    container: { gap: 14 },
    section: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 16, padding: 14, gap: 10 },
    title: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    text: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
    input: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 12, padding: 12, color: colors.textPrimary, backgroundColor: colors.inputBackground },
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand, borderRadius: 999, paddingVertical: 12 },
    buttonText: { color: colors.onBrand, fontWeight: '800' },
    secondaryButton: { backgroundColor: colors.surfaceSecondary },
    secondaryText: { color: colors.textPrimary, fontWeight: '800' },
    packRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 12 },
    packSelected: { borderColor: colors.brand, backgroundColor: colors.brandLight },
    packCopy: { flex: 1 },
    packName: { color: colors.textPrimary, fontWeight: '800' },
    packMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
    preview: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    previewImage: { width: '100%', height: '100%' },
    stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sticker: { width: 58, height: 58, borderRadius: 10, backgroundColor: colors.surfaceSecondary },
  }), [colors]);

  const [packs, setPacks] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [packName, setPackName] = useState('');
  const [packDescription, setPackDescription] = useState('');
  const [stickerName, setStickerName] = useState('');
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [nextPacks, nextStickers] = await Promise.all([fetchStickerPacks(), fetchStickers()]);
      setPacks(nextPacks);
      setStickers(nextStickers.filter((item) => !item.ownerId));
      if (!selectedPackId && nextPacks[0]?.id) setSelectedPackId(nextPacks[0].id);
    } catch (error) {
      console.error('[StickerManager] Failed to load packs and stickers', error);
      Alert.alert('Could not load stickers', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const seedDefaults = async () => {
    setSaving(true);
    setOperationError('');
    try {
      await seedDefaultFreeStickers();
      await load();
      Alert.alert('Defaults added', 'The free default sticker pack is ready.');
    } catch (error) {
      console.error('[StickerManager] Failed to seed default stickers', error);
      setOperationError(error.message || 'Could not seed default stickers.');
      Alert.alert('Could not seed defaults', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const createPack = async () => {
    if (!packName.trim()) return Alert.alert('Pack name required', 'Enter a name for the official pack.');
    setSaving(true);
    setOperationError('');
    try {
      const result = await createOfficialPack({ name: packName.trim(), description: packDescription.trim(), isPremium: false });
      setPackName('');
      setPackDescription('');
      await load();
      setSelectedPackId(result.id);
      Alert.alert('Pack created', 'You can now upload stickers into this pack.');
    } catch (error) {
      console.error('[StickerManager] Failed to create official pack', error);
      setOperationError(error.message || 'Could not create the official pack.');
      Alert.alert('Could not create pack', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const chooseMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.9,
      videoMaxDuration: 10,
    });
    if (!result.canceled && result.assets?.[0]) setMedia(result.assets[0]);
  };

  const uploadOfficialSticker = async () => {
    if (!selectedPackId) return Alert.alert('Select a pack', 'Choose an official pack first.');
    if (!media) return Alert.alert('Media required', 'Choose an image or video for the sticker.');
    setSaving(true);
    setOperationError('');
    try {
      const upload = await uploadStickerMedia(media);
      await createOfficialSticker({
        uploadId: upload.uploadId,
        packId: selectedPackId,
        name: stickerName.trim() || 'Official Sticker',
        isPremium: false,
      });
      setMedia(null);
      setStickerName('');
      await load();
      Alert.alert('Sticker added', 'The official sticker is now available to users.');
    } catch (error) {
      console.error('[StickerManager] Failed to upload official sticker', error);
      setOperationError(error.message || 'Could not add the official sticker.');
      Alert.alert('Could not add sticker', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {operationError ? (
        <View style={[styles.section, { borderColor: colors.danger, backgroundColor: colors.dangerLight }]}>
          <Text style={[styles.text, { color: colors.danger }]}>{operationError}</Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.title}>Default free stickers</Text>
        <Text style={styles.text}>Create or restore the built-in free reaction pack. Running this again safely updates the same default stickers.</Text>
        <Pressable style={styles.button} onPress={seedDefaults} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name="sparkles-outline" size={17} color={colors.onBrand} />}
          <Text style={styles.buttonText}>{saving ? 'Working...' : 'Seed default stickers'}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Create official pack</Text>
        <TextInput value={packName} onChangeText={setPackName} placeholder="Pack name" placeholderTextColor={colors.textSecondary} style={styles.input} />
        <TextInput value={packDescription} onChangeText={setPackDescription} placeholder="Description" placeholderTextColor={colors.textSecondary} style={styles.input} />
        <Pressable style={styles.button} onPress={createPack} disabled={saving}>
          <Ionicons name="add-circle-outline" size={17} color={colors.onBrand} />
          <Text style={styles.buttonText}>Create official pack</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Upload official sticker</Text>
        <Text style={styles.text}>Select a pack, choose image or video media, then publish it as a free official sticker.</Text>
        {packs.map((pack) => (
          <Pressable key={pack.id} onPress={() => setSelectedPackId(pack.id)} style={[styles.packRow, selectedPackId === pack.id && styles.packSelected]}>
            <Ionicons name="albums-outline" size={20} color={colors.brand} />
            <View style={styles.packCopy}><Text style={styles.packName}>{pack.name}</Text><Text style={styles.packMeta}>{pack.isPremium ? 'Premium' : 'Free'} pack</Text></View>
            {selectedPackId === pack.id ? <Ionicons name="checkmark-circle" size={20} color={colors.brand} /> : null}
          </Pressable>
        ))}
        <TextInput value={stickerName} onChangeText={setStickerName} placeholder="Sticker name" placeholderTextColor={colors.textSecondary} style={styles.input} />
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={chooseMedia} disabled={saving}>
          <Ionicons name="image-outline" size={17} color={colors.textPrimary} />
          <Text style={styles.secondaryText}>{media ? 'Change media' : 'Choose sticker media'}</Text>
        </Pressable>
        {media ? <View style={styles.packRow}><View style={styles.preview}>{media.type?.startsWith('video') ? <Ionicons name="videocam-outline" size={28} color={colors.brand} /> : <Image source={{ uri: media.uri }} style={styles.previewImage} />}</View><View style={styles.packCopy}><Text style={styles.packName}>{media.fileName || media.name || 'Selected media'}</Text><Text style={styles.packMeta}>{media.type || 'Sticker media'}</Text></View></View> : null}
        <Pressable style={styles.button} onPress={uploadOfficialSticker} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name="cloud-upload-outline" size={17} color={colors.onBrand} />}
          <Text style={styles.buttonText}>{saving ? 'Uploading...' : 'Add official sticker'}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Official stickers</Text>
        <View style={styles.stickerGrid}>
          {loading ? <ActivityIndicator color={colors.brand} /> : stickers.map((sticker) => <Image key={sticker.id} source={{ uri: sticker.thumbnailUrl }} style={styles.sticker} />)}
        </View>
      </View>
    </ScrollView>
  );
}
