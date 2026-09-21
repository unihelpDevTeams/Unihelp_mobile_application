import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textSize, setTextSize] = useState('medium');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [cropAspect, setCropAspect] = useState([1, 1]);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const mediaIsVideo = media?.type?.startsWith('video');
  const styles = useThemeStyles((c, s, r) => ({
    preview: { width: '100%', aspectRatio: 1, borderRadius: r['2xl'], backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: s.md, borderWidth: 1, borderColor: c.borderDefault },
    previewImage: { width: '100%', height: '100%' },
    previewOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-end', padding: 18 },
    previewText: { fontWeight: '900', textAlign: 'center', textShadowColor: '#00000099', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    previewEmoji: { position: 'absolute', top: 18, right: 18, fontSize: 46 },
    previewHint: { position: 'absolute', bottom: 12, left: 12, right: 12, textAlign: 'center', color: c.textSecondary, fontSize: 11 },
    editorBar: { flexDirection: 'row', gap: s.sm, marginBottom: s.lg },
    editorTool: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 14, backgroundColor: c.card },
    editorToolActive: { borderColor: c.brand, backgroundColor: c.brandLight },
    editorToolText: { color: c.textSecondary, fontSize: 10, fontWeight: '800' },
    editorToolTextActive: { color: c.brandText },
    helper: { color: c.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: s.md },
    placeholder: { color: c.textSecondary },
    label: { color: c.textPrimary, fontWeight: '800', marginBottom: 6, marginTop: s.sm },
    input: { borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.inputBackground, borderRadius: 12, padding: 12, color: c.textPrimary },
    row: { flexDirection: 'row', gap: s.sm, flexWrap: 'wrap', marginBottom: s.sm },
    choice: { borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.full, paddingHorizontal: s.md, paddingVertical: 9, backgroundColor: c.card },
    choiceActive: { borderColor: c.brand, backgroundColor: c.brandLight },
    choiceText: { color: c.textPrimary, fontWeight: '700' },
    colorChoice: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: c.borderDefault },
    colorChoiceActive: { borderColor: c.brand, transform: [{ scale: 1.12 }] },
    save: { marginTop: s.lg, backgroundColor: c.brand, borderRadius: r.full, paddingVertical: 14, alignItems: 'center' },
    saveText: { color: c.onBrand, fontWeight: '800' },
  }));

  const chooseMedia = async (mediaType, aspect = cropAspect) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permission needed', 'Allow media access to create a sticker.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [mediaType], allowsEditing: mediaType === IMAGE_MEDIA_TYPE, aspect, quality: 0.9, videoMaxDuration: 10 });
    if (!result.canceled && result.assets?.[0]) {
      setMedia(result.assets[0]);
      if (mediaType === VIDEO_MEDIA_TYPE) setRemoveBackground(false);
    }
  };

  const save = async () => {
    if (!media || saving) return;
    setSaving(true);
    try {
      const uploaded = await uploadStickerMedia(media, setProgress, { rotation });
      const sticker = await createSticker({
        uploadId: uploaded.uploadId,
        name: name.trim() || 'My Sticker',
        idempotencyKey: `create-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        editor: {
          text: media.type?.startsWith('video') ? '' : overlayText.trim(),
          emoji: media.type?.startsWith('video') ? '' : emoji,
          outline,
          textColor,
          textSize,
        },
      });
      if (removeBackground && !media.type?.startsWith('video')) await removeStickerBackground(sticker.id);
      Alert.alert('Sticker saved', 'Your sticker is ready to send.', [{ text: 'Open chat', onPress: () => router.back() }]);
      return sticker;
    } catch (error) {
      Alert.alert('Could not create sticker', error.message || 'Please try again.');
    } finally { setSaving(false); setProgress(0); }
  };

  const previewTextSize = textSize === 'small' ? 22 : textSize === 'large' ? 38 : 30;
  const previewTextOutline = outline ? {
    textShadowColor: '#00000099',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  } : {
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  };
  return <ScreenShell title="Create Sticker" subtitle="Make it yours, WhatsApp-style" showBack>
    <View style={styles.preview}>
      {media ? (mediaIsVideo ? <Text style={styles.placeholder}>Video sticker selected</Text> : <Image source={{ uri: media.uri }} style={[styles.previewImage, { transform: [{ rotate: `${rotation}deg` }] }]} />) : <Text style={styles.placeholder}>Choose a photo or short video</Text>}
      {media && !mediaIsVideo ? <View pointerEvents="none" style={styles.previewOverlay}>
        {emoji ? <Text style={styles.previewEmoji}>{emoji}</Text> : null}
        {overlayText ? <Text style={[styles.previewText, previewTextOutline, { color: textColor, fontSize: previewTextSize }]}>{overlayText}</Text> : null}
      </View> : null}
    </View>
    <Text style={styles.helper}>Start with a photo, then add a caption, emoji, crop, rotation, or background removal before saving.</Text>
    <View style={styles.editorBar}>
      <Pressable style={[styles.editorTool, media && styles.editorToolActive]} onPress={() => chooseMedia(IMAGE_MEDIA_TYPE)}><Ionicons name="image-outline" size={19} color={colors.brand} /><Text style={styles.editorToolText}>Photo</Text></Pressable>
      <Pressable style={[styles.editorTool, mediaIsVideo && { opacity: 0.45 }]} disabled={mediaIsVideo} onPress={() => setOverlayText((value) => value || 'Your text')}><Ionicons name="text-outline" size={19} color={colors.brand} /><Text style={styles.editorToolText}>Text</Text></Pressable>
      <Pressable style={[styles.editorTool, mediaIsVideo && { opacity: 0.45 }]} disabled={mediaIsVideo} onPress={() => setEmoji(emoji ? '' : EMOJIS[0])}><Ionicons name="happy-outline" size={19} color={colors.brand} /><Text style={styles.editorToolText}>Emoji</Text></Pressable>
      <Pressable style={[styles.editorTool, mediaIsVideo && { opacity: 0.45 }]} disabled={mediaIsVideo} onPress={() => setRemoveBackground((current) => !current)}><Ionicons name="cut-outline" size={19} color={colors.brand} /><Text style={styles.editorToolText}>Cut out</Text></Pressable>
    </View>
    <View style={styles.row}>
      <Pressable style={styles.choice} onPress={() => chooseMedia(VIDEO_MEDIA_TYPE)}><Text style={styles.choiceText}>Choose video</Text></Pressable>
      <Pressable style={styles.choice} onPress={() => setRotation((current) => (current + 90) % 360)}><Ionicons name="refresh-outline" size={16} color={colors.brand} /><Text style={styles.choiceText}>Rotate</Text></Pressable>
    </View>
    <Text style={styles.label}>Crop shape</Text><View style={styles.row}>{[[1, 1, 'Square'], [4, 5, 'Portrait'], [16, 9, 'Landscape']].map(([width, height, label]) => <Pressable key={label} style={[styles.choice, cropAspect[0] === width && cropAspect[1] === height && styles.choiceActive]} onPress={() => { setCropAspect([width, height]); chooseMedia(IMAGE_MEDIA_TYPE, [width, height]); }}><Text style={styles.choiceText}>{label}</Text></Pressable>)}</View>
    <Text style={styles.label}>Sticker name</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Exam Panic" placeholderTextColor={colors.textSecondary} style={styles.input} maxLength={80} />
    <Text style={styles.label}>Text overlay</Text><TextInput value={overlayText} onChangeText={setOverlayText} placeholder="Add a caption" placeholderTextColor={colors.textSecondary} style={styles.input} maxLength={40} />
    <View style={styles.row}>{[['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']].map(([key, label]) => <Pressable key={key} style={[styles.choice, textSize === key && styles.choiceActive]} onPress={() => setTextSize(key)}><Text style={styles.choiceText}>{label}</Text></Pressable>)}</View>
    <View style={styles.row}>{['#FFFFFF', '#000000', '#FF3B30', '#FFD60A'].map((color) => <Pressable key={color} accessibilityLabel={`Text color ${color}`} style={[styles.colorChoice, { backgroundColor: color }, textColor === color && styles.colorChoiceActive]} onPress={() => setTextColor(color)} />)}</View>
    <Text style={styles.label}>Emoji</Text><View style={styles.row}>{EMOJIS.map((item) => <Pressable key={item} style={[styles.choice, emoji === item && styles.choiceActive]} onPress={() => setEmoji(emoji === item ? '' : item)}><Text style={{ fontSize: 22 }}>{item}</Text></Pressable>)}</View>
    <Pressable style={[styles.choice, outline && styles.choiceActive]} onPress={() => setOutline((current) => !current)}><Text style={styles.choiceText}>{outline ? 'Outline on' : 'Outline off'}</Text></Pressable>
    <Pressable style={[styles.choice, removeBackground && styles.choiceActive, mediaIsVideo && { opacity: 0.45 }, { marginTop: 8 }]} disabled={mediaIsVideo} onPress={() => setRemoveBackground((current) => !current)}><Ionicons name="cut-outline" size={16} color={colors.brand} /><Text style={styles.choiceText}>{removeBackground ? 'Background removal on' : 'Remove background'}</Text></Pressable>
    {saving && <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{progress < 100 ? `Uploading... ${progress}%` : 'Creating sticker...'}</Text>}
    <Pressable style={styles.save} onPress={save} disabled={!media || saving}>{saving ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.saveText}>Save Sticker</Text>}</Pressable>
  </ScreenShell>;
}
