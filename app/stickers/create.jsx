import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { createSticker, removeStickerBackground, uploadStickerMedia } from '../../src/shared/services/stickers';

const EMOJIS = ['😂', '😭', '🔥', '❤️', '💀', '🙏', '😎'];
const IMAGE_MEDIA_TYPE = 'images';
const VIDEO_MEDIA_TYPE = 'videos';

export default function CreateStickerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [media, setMedia] = useState(null);
  const [name, setName] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [emoji, setEmoji] = useState('');
  const [outline, setOutline] = useState(true);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [cropAspect, setCropAspect] = useState([1, 1]);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const styles = useThemeStyles((c, s, r) => ({
    preview: { width: '100%', aspectRatio: 1, borderRadius: r['2xl'], backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: s.lg },
    previewImage: { width: '100%', height: '100%' },
    placeholder: { color: c.textSecondary },
    label: { color: c.textPrimary, fontWeight: '800', marginBottom: 6, marginTop: s.sm },
    input: { borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.inputBackground, borderRadius: 12, padding: 12, color: c.textPrimary },
    row: { flexDirection: 'row', gap: s.sm, flexWrap: 'wrap', marginBottom: s.sm },
    choice: { borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.full, paddingHorizontal: s.md, paddingVertical: 9, backgroundColor: c.card },
    choiceActive: { borderColor: c.brand, backgroundColor: c.brandLight },
    choiceText: { color: c.textPrimary, fontWeight: '700' },
    save: { marginTop: s.lg, backgroundColor: c.brand, borderRadius: r.full, paddingVertical: 14, alignItems: 'center' },
    saveText: { color: c.onBrand, fontWeight: '800' },
  }));

  const chooseMedia = async (mediaType, aspect = cropAspect) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Allow media access to create a sticker.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [mediaType], allowsEditing: mediaType === IMAGE_MEDIA_TYPE, aspect, quality: 0.9, videoMaxDuration: 10 });
    if (!result.canceled && result.assets?.[0]) setMedia(result.assets[0]);
  };

  const save = async () => {
    if (!media || saving) return;
    setSaving(true);
    try {
      const uploaded = await uploadStickerMedia(media, setProgress, { rotation });
      const sticker = await createSticker({ uploadId: uploaded.uploadId, name: name.trim() || 'My Sticker', idempotencyKey: `create-${Date.now()}-${Math.random().toString(36).slice(2)}`, editor: { text: overlayText.trim(), emoji, outline } });
      if (removeBackground) await removeStickerBackground(sticker.id);
      Alert.alert('Sticker saved', 'Your sticker is ready to send.', [{ text: 'Open chat', onPress: () => router.back() }]);
      return sticker;
    } catch (error) {
      Alert.alert('Could not create sticker', error.message || 'Please try again.');
    } finally { setSaving(false); setProgress(0); }
  };

  return <ScreenShell title="Create Sticker" subtitle="Premium sticker creator" showBack>
    <View style={styles.preview}>{media ? (media.type?.startsWith('video') ? <Text style={styles.placeholder}>Video sticker selected</Text> : <Image source={{ uri: media.uri }} style={[styles.previewImage, { transform: [{ rotate: `${rotation}deg` }] }]} />) : <Text style={styles.placeholder}>Choose a photo or short video</Text>}</View>
    <View style={styles.row}>
      <Pressable style={styles.choice} onPress={() => chooseMedia(IMAGE_MEDIA_TYPE)}><Text style={styles.choiceText}>Choose image</Text></Pressable>
      <Pressable style={styles.choice} onPress={() => chooseMedia(VIDEO_MEDIA_TYPE)}><Text style={styles.choiceText}>Choose video</Text></Pressable>
      <Pressable style={styles.choice} onPress={() => setRotation((current) => (current + 90) % 360)}><Text style={styles.choiceText}>Rotate</Text></Pressable>
    </View>
    <Text style={styles.label}>Crop shape</Text><View style={styles.row}>{[[1, 1, 'Square'], [4, 5, 'Portrait'], [16, 9, 'Landscape']].map(([width, height, label]) => <Pressable key={label} style={[styles.choice, cropAspect[0] === width && cropAspect[1] === height && styles.choiceActive]} onPress={() => { setCropAspect([width, height]); chooseMedia(IMAGE_MEDIA_TYPE, [width, height]); }}><Text style={styles.choiceText}>{label}</Text></Pressable>)}</View>
    <Text style={styles.label}>Sticker name</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Exam Panic" placeholderTextColor={colors.textSecondary} style={styles.input} maxLength={80} />
    <Text style={styles.label}>Text overlay</Text><TextInput value={overlayText} onChangeText={setOverlayText} placeholder="Optional text" placeholderTextColor={colors.textSecondary} style={styles.input} maxLength={40} />
    <Text style={styles.label}>Emoji</Text><View style={styles.row}>{EMOJIS.map((item) => <Pressable key={item} style={[styles.choice, emoji === item && styles.choiceActive]} onPress={() => setEmoji(emoji === item ? '' : item)}><Text style={{ fontSize: 22 }}>{item}</Text></Pressable>)}</View>
    <Pressable style={[styles.choice, outline && styles.choiceActive]} onPress={() => setOutline((current) => !current)}><Text style={styles.choiceText}>{outline ? 'Outline on' : 'Outline off'}</Text></Pressable>
    <Pressable style={[styles.choice, removeBackground && styles.choiceActive, { marginTop: 8 }]} onPress={() => setRemoveBackground((current) => !current)}><Text style={styles.choiceText}>{removeBackground ? 'Background removal on' : 'Remove background'}</Text></Pressable>
    {saving && <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{progress < 100 ? `Uploading... ${progress}%` : 'Creating sticker...'}</Text>}
    <Pressable style={styles.save} onPress={save} disabled={!media || saving}>{saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.saveText}>Save Sticker</Text>}</Pressable>
  </ScreenShell>;
}
