import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { createSticker, fetchOwnedSticker, removeStickerBackground, updateSticker, uploadStickerMedia } from '../../src/shared/services/stickers';

const EMOJIS = ['😂', '😭', '🔥', '❤️', '💀', '🙏', '😎', '🥹', '😤', '🤯', '👀', '💯'];
const IMAGE_MEDIA_TYPE = 'images';
const VIDEO_MEDIA_TYPE = 'videos';
const MAX_VIDEO_MS = 10500;
const NAME_MAX = 80;
const TEXT_MAX = 40;

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FF3B30', '#FFD60A', '#34C759', '#0A84FF'];
const TEXT_SIZES = [
  { key: 'small', label: 'Small', scale: 0.07 },
  { key: 'medium', label: 'Medium', scale: 0.095 },
  { key: 'large', label: 'Large', scale: 0.125 },
];
const CROPS = [
  { key: 'square', label: 'Square', aspect: [1, 1], icon: 'square-outline' },
  { key: 'portrait', label: 'Portrait', aspect: [4, 5], icon: 'phone-portrait-outline' },
  { key: 'landscape', label: 'Landscape', aspect: [16, 9], icon: 'phone-landscape-outline' },
];
const TABS = [
  { key: 'caption', label: 'Caption', icon: 'text-outline' },
  { key: 'emoji', label: 'Emoji', icon: 'happy-outline' },
  { key: 'crop', label: 'Crop', icon: 'crop-outline' },
  { key: 'cutout', label: 'Cut out', icon: 'cut-outline' },
];
const OUTLINE_OFFSETS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

const isVideoAsset = (asset) => String(asset?.type || '').startsWith('video');
const hashString = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

// Caption with a real outline (8 offset copies underneath) so the preview matches a stroked sticker.
function CaptionText({ text, color, size, outline }) {
  const offset = Math.max(1, Math.round(size / 14));
  const outlineColor = color.toUpperCase() === '#000000' ? '#FFFFFF' : '#000000';
  const base = { fontSize: size, fontWeight: '900', textAlign: 'center' };
  return (
    <View style={{ alignSelf: 'stretch' }}>
      {outline
        ? OUTLINE_OFFSETS.map(([dx, dy], i) => (
            <Text key={i} style={[base, { color: outlineColor, position: 'absolute', width: '100%', left: dx * offset, top: dy * offset }]}>{text}</Text>
          ))
        : null}
      <Text style={[base, { color }]}>{text}</Text>
    </View>
  );
}

export default function CreateStickerScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { stickerId } = useLocalSearchParams();
  const { colors } = useTheme();

  const editingId = Array.isArray(stickerId) ? stickerId[0] : stickerId;
  const [loadingSticker, setLoadingSticker] = useState(Boolean(editingId));
  const [media, setMedia] = useState(null);
  const [name, setName] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [emoji, setEmoji] = useState('');
  const [outline, setOutline] = useState(true);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textSize, setTextSize] = useState('medium');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [cropKey, setCropKey] = useState('square');
  const [activeTab, setActiveTab] = useState('caption');
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const savingRef = useRef(false);
  const savedRef = useRef(false);
  const uploadRef = useRef(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!editingId) {
      return undefined;
    }
    let active = true;
    fetchOwnedSticker(editingId)
      .then((sticker) => {
        if (!active) return;
        setMedia({
          uri: sticker.originalAssetUrl || sticker.assetUrl,
          type: sticker.isAnimated ? 'video' : 'image',
          width: sticker.width || 1,
          height: sticker.height || 1,
          duration: Number(sticker.duration || 0) * 1000,
        });
        setName(sticker.name || '');
        setOverlayText(sticker.editor?.text || '');
        setEmoji(sticker.editor?.emoji || '');
        setOutline(sticker.editor?.outline !== false);
        setTextColor(sticker.editor?.textColor || '#FFFFFF');
        setTextSize(sticker.editor?.textSize || 'medium');
      })
      .catch((error) => {
        console.error('[CreateSticker] Failed to load owned sticker for editing:', error);
        if (active) {
          Alert.alert('Could not load sticker', error?.message || 'Please try again.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }
      })
      .finally(() => {
        if (active) setLoadingSticker(false);
      });
    return () => { active = false; };
  }, [editingId, router]);

  const mediaIsVideo = isVideoAsset(media);
  const hasImage = !!media && !mediaIsVideo;
  const cropAspect = (CROPS.find((c) => c.key === cropKey) || CROPS[0]).aspect;
  useEffect(() => {
    dirtyRef.current = !!media || !!overlayText.trim() || !!name.trim();
  }, [media, name, overlayText]);

  const styles = useThemeStyles((c, s, r) => ({
    preview: { width: '100%', aspectRatio: 1, borderRadius: r['2xl'], backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: c.borderDefault },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: s.lg },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
    emptySub: { color: c.textSecondary, fontSize: 12, lineHeight: 17, textAlign: 'center' },
    videoWrap: { alignItems: 'center', justifyContent: 'center', gap: 6, padding: s.lg },
    removeMedia: { position: 'absolute', top: 12, left: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: s.sm, minHeight: 4 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: r.full, backgroundColor: c.brandLight },
    metaChipText: { color: c.brandText, fontSize: 11, fontWeight: '800' },
    helper: { color: c.textSecondary, fontSize: 12, lineHeight: 17 },
    sourceRow: { flexDirection: 'row', gap: s.sm, marginTop: s.md, marginBottom: s.md },
    source: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 14, backgroundColor: c.card },
    sourceActive: { borderColor: c.brand, backgroundColor: c.brandLight },
    sourceText: { color: c.textPrimary, fontWeight: '800', fontSize: 13 },
    tabs: { flexDirection: 'row', backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 4, marginBottom: s.sm },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    tabActive: { backgroundColor: c.card, borderColor: c.borderDefault },
    tabText: { color: c.textSecondary, fontSize: 11, fontWeight: '800' },
    tabTextActive: { color: c.brandText },
    panel: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.borderDefault, padding: s.md, marginBottom: s.md },
    label: { color: c.textPrimary, fontWeight: '800', marginBottom: 6, marginTop: s.sm },
    labelFirst: { color: c.textPrimary, fontWeight: '800', marginBottom: 6 },
    input: { borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.inputBackground, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: c.textPrimary },
    counter: { color: c.textSecondary, fontSize: 11, textAlign: 'right', marginTop: 4 },
    row: { flexDirection: 'row', gap: s.sm, flexWrap: 'wrap', alignItems: 'center' },
    choice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.full, paddingHorizontal: s.md, paddingVertical: 9, backgroundColor: c.card },
    choiceActive: { borderColor: c.brand, backgroundColor: c.brandLight },
    choiceText: { color: c.textPrimary, fontWeight: '700' },
    emojiChoice: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.borderDefault, borderRadius: 14, backgroundColor: c.card },
    swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center' },
    swatchActive: { borderColor: c.brand, transform: [{ scale: 1.12 }] },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.md, marginTop: s.md },
    switchText: { flex: 1 },
    switchTitle: { color: c.textPrimary, fontWeight: '800' },
    notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    noticeText: { flex: 1, color: c.textSecondary, fontSize: 12, lineHeight: 17 },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceSecondary, overflow: 'hidden', marginTop: s.sm },
    progressFill: { height: '100%', backgroundColor: c.brand },
    progressText: { color: c.textSecondary, fontSize: 12, marginTop: 6 },
    save: { marginTop: s.md, backgroundColor: c.brand, borderRadius: r.full, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveDisabled: { opacity: 0.5 },
    saveText: { color: c.onBrand, fontWeight: '800', fontSize: 15 },
  }));

  // Warn before leaving with unsaved work.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (savedRef.current || !(dirtyRef.current || savingRef.current)) return;
      e.preventDefault();
      Alert.alert('Discard sticker?', 'Your edits will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation]);

  const pickMedia = async (kind, aspect = cropAspect) => {
    if (savingRef.current) return;
    const isImage = kind === 'image';
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [isImage ? IMAGE_MEDIA_TYPE : VIDEO_MEDIA_TYPE],
        allowsEditing: isImage,
        aspect,
        quality: 0.9,
        videoMaxDuration: 10,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!isImage && asset.duration && asset.duration > MAX_VIDEO_MS) {
        Alert.alert('Video too long', 'Pick a video that is 10 seconds or shorter.');
        return;
      }
      uploadRef.current = null;
      setMedia(asset);
      setRotation(0);
      if (!isImage) setRemoveBackground(false);
    } catch (_error) {
      Alert.alert('Could not open your library', 'Allow photo and video access in Settings, then try again.');
    }
  };

  const clearMedia = () => {
    if (savingRef.current) return;
    uploadRef.current = null;
    setMedia(null);
    setRotation(0);
    setRemoveBackground(false);
  };

  const reset = () => {
    savedRef.current = false;
    uploadRef.current = null;
    setMedia(null);
    setName('');
    setOverlayText('');
    setEmoji('');
    setOutline(true);
    setTextColor('#FFFFFF');
    setTextSize('medium');
    setRemoveBackground(false);
    setRotation(0);
    setProgress(0);
    setActiveTab('caption');
  };

  const save = async () => {
    if (!media || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setProgress(0);

    const video = isVideoAsset(media);
    const finalName = name.trim() || 'My Sticker';
    const editor = {
      text: video ? '' : overlayText.trim(),
      emoji: video ? '' : emoji,
      outline,
      textColor,
      textSize,
    };

    let sticker;
    try {
      // Reuse a finished upload when retrying after a failed create, so we never upload twice.
      if (editingId) {
        sticker = await updateSticker(editingId, { name: finalName, editor });
      } else {
        // Reuse a finished upload when retrying after a failed create, so we never upload twice.
        const uploadKey = `${media.uri}|${rotation}`;
        if (uploadRef.current?.key !== uploadKey) {
          const uploaded = await uploadStickerMedia(media, (value) => setProgress(Number(value) || 0), { rotation });
          uploadRef.current = { key: uploadKey, uploaded };
        }
        const { uploaded } = uploadRef.current;
        // Same content => same key (retries never duplicate). Edited content => new key.
        sticker = await createSticker({
          uploadId: uploaded.uploadId,
          name: finalName,
          idempotencyKey: `create-${uploaded.uploadId}-${hashString(JSON.stringify({ finalName, editor }))}`,
          editor,
        });
      }
    } catch (error) {
      Alert.alert(editingId ? 'Could not update sticker' : 'Could not create sticker', error?.message || 'Please try again.');
      savingRef.current = false;
      setSaving(false);
      setProgress(0);
      return;
    }

    let backgroundFailed = false;
    if (removeBackground && !video) {
      try {
        await removeStickerBackground(sticker.id);
      } catch (_error) {
        backgroundFailed = true;
      }
    }

    savedRef.current = true;
    savingRef.current = false;
    setSaving(false);
    setProgress(0);
    Alert.alert(
      editingId ? 'Sticker updated' : 'Sticker saved',
      backgroundFailed
        ? 'Your sticker is saved, but the background could not be removed. Try Cut out again from your sticker library.'
        : editingId ? 'Your sticker changes are saved.' : 'Your sticker is ready to send.',
      editingId
        ? [{ text: 'Done', onPress: () => router.back() }]
        : [
            { text: 'Make another', onPress: reset },
            { text: 'Open chat', onPress: () => router.back() },
          ],
      { cancelable: false },
    );
    return sticker;
  };

  // ---- Preview geometry: the stage matches the real (rotated) image so the preview is what you save. ----
  const nw = media?.width || 1;
  const nh = media?.height || 1;
  const quarter = rotation % 180 !== 0;
  const rw = quarter ? nh : nw;
  const rh = quarter ? nw : nh;
  const innerW = Math.max(0, box.w - 2);
  const innerH = Math.max(0, box.h - 2);
  const fit = innerW && innerH ? Math.min(innerW / rw, innerH / rh) : 0;
  const stageW = rw * fit;
  const stageH = rh * fit;
  const sizeScale = (TEXT_SIZES.find((t) => t.key === textSize) || TEXT_SIZES[1]).scale;
  const captionSize = Math.max(12, stageW * sizeScale);
  const showCaption = !!overlayText.trim();

  const metaChips = [];
  if (media) metaChips.push({ icon: mediaIsVideo ? 'videocam-outline' : 'image-outline', text: mediaIsVideo ? `Video${media.duration ? ` · ${Math.max(1, Math.round(media.duration / 1000))}s` : ''}` : 'Photo' });
  if (hasImage && rotation) metaChips.push({ icon: 'refresh-outline', text: `Rotated ${rotation}°` });
  if (hasImage && removeBackground) metaChips.push({ icon: 'cut-outline', text: 'Background removed on save' });

  const canSave = !!media && !saving;
  const progressPct = Math.max(0, Math.min(100, Math.round(progress)));

  const videoNotice = (
    <View style={styles.notice}>
      <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
      <Text style={styles.noticeText}>Video stickers keep their original look. Captions, emoji, crop and cut out are available for photos.</Text>
    </View>
  );

  const renderPanel = () => {
    if (mediaIsVideo) return videoNotice;

    if (activeTab === 'caption') {
      return (
        <>
          <Text style={styles.labelFirst}>Caption</Text>
          <TextInput value={overlayText} onChangeText={setOverlayText} placeholder="Add a caption" placeholderTextColor={colors.textSecondary} style={styles.input} maxLength={TEXT_MAX} returnKeyType="done" />
          <Text style={styles.counter}>{overlayText.length}/{TEXT_MAX}</Text>
          <Text style={styles.label}>Size</Text>
          <View style={styles.row}>
            {TEXT_SIZES.map((item) => (
              <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: textSize === item.key }} style={[styles.choice, textSize === item.key && styles.choiceActive]} onPress={() => setTextSize(item.key)}>
                <Text style={styles.choiceText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Color</Text>
          <View style={styles.row}>
            {TEXT_COLORS.map((color) => (
              <Pressable key={color} accessibilityRole="button" accessibilityLabel={`Text color ${color}`} accessibilityState={{ selected: textColor === color }} style={[styles.swatch, { backgroundColor: color }, textColor === color && styles.swatchActive]} onPress={() => setTextColor(color)}>
                {textColor === color ? <Ionicons name="checkmark" size={18} color={color.toUpperCase() === '#FFFFFF' || color.toUpperCase() === '#FFD60A' ? '#000000' : '#FFFFFF'} /> : null}
              </Pressable>
            ))}
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Outline</Text>
              <Text style={styles.helper}>Keeps text readable on busy photos.</Text>
            </View>
            <Switch value={outline} onValueChange={setOutline} trackColor={{ true: colors.brand }} />
          </View>
        </>
      );
    }

    if (activeTab === 'emoji') {
      return (
        <>
          <Text style={styles.labelFirst}>Corner emoji</Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" accessibilityLabel="No emoji" accessibilityState={{ selected: !emoji }} style={[styles.emojiChoice, !emoji && styles.choiceActive]} onPress={() => setEmoji('')}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
            {EMOJIS.map((item) => (
              <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Emoji ${item}`} accessibilityState={{ selected: emoji === item }} style={[styles.emojiChoice, emoji === item && styles.choiceActive]} onPress={() => setEmoji(emoji === item ? '' : item)}>
                <Text style={{ fontSize: 24 }}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </>
      );
    }

    if (activeTab === 'crop') {
      return (
        <>
          <Text style={styles.labelFirst}>Crop shape</Text>
          <View style={styles.row}>
            {CROPS.map((item) => (
              <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: cropKey === item.key }} style={[styles.choice, cropKey === item.key && styles.choiceActive]} onPress={() => setCropKey(item.key)}>
                <Ionicons name={item.icon} size={16} color={colors.brand} />
                <Text style={styles.choiceText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.helper, { marginTop: 8 }]}>The shape is applied when you pick a photo{hasImage ? '. Crop again to use the new shape.' : '.'}</Text>
          {hasImage ? (
            <View style={[styles.row, { marginTop: 10 }]}>
              <Pressable accessibilityRole="button" style={styles.choice} onPress={() => pickMedia('image', cropAspect)}>
                <Ionicons name="crop-outline" size={16} color={colors.brand} />
                <Text style={styles.choiceText}>Crop again</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.label}>Rotate</Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" accessibilityLabel="Rotate left" disabled={!hasImage} style={[styles.choice, !hasImage && { opacity: 0.45 }]} onPress={() => setRotation((v) => (v + 270) % 360)}>
              <Ionicons name="arrow-undo-outline" size={16} color={colors.brand} />
              <Text style={styles.choiceText}>Left</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Rotate right" disabled={!hasImage} style={[styles.choice, !hasImage && { opacity: 0.45 }]} onPress={() => setRotation((v) => (v + 90) % 360)}>
              <Ionicons name="arrow-redo-outline" size={16} color={colors.brand} />
              <Text style={styles.choiceText}>Right</Text>
            </Pressable>
            {rotation ? (
              <Pressable accessibilityRole="button" style={styles.choice} onPress={() => setRotation(0)}>
                <Text style={styles.choiceText}>Reset</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      );
    }

    return (
      <View style={[styles.switchRow, { marginTop: 0 }]}>
        <View style={styles.switchText}>
          <Text style={styles.switchTitle}>Remove background</Text>
          <Text style={styles.helper}>Runs after saving. Works best on a clear subject against a plain background.</Text>
        </View>
        <Switch value={removeBackground} onValueChange={setRemoveBackground} trackColor={{ true: colors.brand }} />
      </View>
    );
  };

  if (loadingSticker) {
    return (
      <ScreenShell title="Edit Sticker" showBack>
        <ActivityIndicator color={colors.brand} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={editingId ? 'Edit Sticker' : 'Create Sticker'} subtitle="Make it yours, WhatsApp-style" showBack>
      <View style={styles.preview} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {!media ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Choose a photo" style={styles.emptyWrap} onPress={() => pickMedia('image')}>
            <View style={styles.emptyIcon}><Ionicons name="add" size={32} color={colors.brand} /></View>
            <Text style={styles.emptyTitle}>Choose a photo or short video</Text>
            <Text style={styles.emptySub}>Then add a caption, emoji, crop, rotation or cut out the background.</Text>
          </Pressable>
        ) : mediaIsVideo ? (
          <View style={styles.videoWrap}>
            <Ionicons name="videocam" size={44} color={colors.brand} />
            <Text style={styles.emptyTitle}>Video sticker selected</Text>
            <Text style={styles.emptySub}>Up to 10 seconds</Text>
          </View>
        ) : stageW > 0 ? (
          <View style={{ width: stageW, height: stageH, overflow: 'hidden' }}>
            <Image
              source={{ uri: media.uri }}
              resizeMode="cover"
              style={{ position: 'absolute', width: nw * fit, height: nh * fit, left: (stageW - nw * fit) / 2, top: (stageH - nh * fit) / 2, transform: [{ rotate: `${rotation}deg` }] }}
            />
            <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { padding: stageW * 0.05, justifyContent: 'flex-end' }]}>
              {emoji ? <Text style={{ position: 'absolute', top: stageW * 0.04, right: stageW * 0.05, fontSize: Math.max(24, stageW * 0.16) }}>{emoji}</Text> : null}
              {showCaption ? <CaptionText text={overlayText.trim()} color={textColor} size={captionSize} outline={outline} /> : null}
            </View>
          </View>
        ) : null}
        {media && !editingId ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Remove selected media" hitSlop={8} style={styles.removeMedia} onPress={clearMedia}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        {metaChips.map((chip) => (
          <View key={chip.text} style={styles.metaChip}>
            <Ionicons name={chip.icon} size={12} color={colors.brandText} />
            <Text style={styles.metaChipText}>{chip.text}</Text>
          </View>
        ))}
      </View>

      {!editingId ? <View style={styles.sourceRow}>
        <Pressable accessibilityRole="button" disabled={saving} style={[styles.source, hasImage && styles.sourceActive]} onPress={() => pickMedia('image')}>
          <Ionicons name="image-outline" size={19} color={colors.brand} />
          <Text style={styles.sourceText}>{hasImage ? 'Change photo' : 'Photo'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={saving} style={[styles.source, mediaIsVideo && styles.sourceActive]} onPress={() => pickMedia('video')}>
          <Ionicons name="videocam-outline" size={19} color={colors.brand} />
          <Text style={styles.sourceText}>{mediaIsVideo ? 'Change video' : 'Video'}</Text>
        </Pressable>
      </View> : null}

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.tab, active && styles.tabActive, mediaIsVideo && { opacity: 0.5 }]} onPress={() => setActiveTab(tab.key)}>
              <Ionicons name={tab.icon} size={18} color={active ? colors.brand : colors.textSecondary} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.panel}>{renderPanel()}</View>

      <Text style={styles.labelFirst}>Sticker name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Exam Panic" placeholderTextColor={colors.textSecondary} style={styles.input} maxLength={NAME_MAX} returnKeyType="done" />
      <Text style={styles.counter}>{name.length}/{NAME_MAX}</Text>

      {saving ? (
        <View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct < 100 ? progressPct : 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{progressPct < 100 ? `Uploading… ${progressPct}%` : 'Creating sticker…'}</Text>
        </View>
      ) : null}

      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} style={[styles.save, !canSave && styles.saveDisabled]} onPress={save} disabled={!canSave}>
        {saving ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name="checkmark-circle-outline" size={20} color={colors.onBrand} />}
        <Text style={styles.saveText}>{saving ? 'Saving…' : editingId ? 'Save changes' : media ? 'Save sticker' : 'Choose a photo or video first'}</Text>
      </Pressable>
    </ScreenShell>
  );
}