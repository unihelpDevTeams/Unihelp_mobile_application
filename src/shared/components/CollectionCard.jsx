import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

const pickMediaUrl = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (value && typeof value === 'object') {
    if (typeof value.url === 'string' && value.url.trim()) return value.url.trim();
    if (typeof value.secure_url === 'string' && value.secure_url.trim()) return value.secure_url.trim();
    if (typeof value.previewUrl === 'string' && value.previewUrl.trim()) return value.previewUrl.trim();
    if (typeof value.fileUrl === 'string' && value.fileUrl.trim()) return value.fileUrl.trim();
    if (typeof value.downloadUrl === 'string' && value.downloadUrl.trim()) return value.downloadUrl.trim();
    if (typeof value.href === 'string' && value.href.trim()) return value.href.trim();
    if (typeof value.link === 'string' && value.link.trim()) return value.link.trim();
  }

  return null;
};

const resolveCollectionImage = (item = {}) => {
  const candidates = [];
  const pushValue = (value) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }

    const mediaUrl = pickMediaUrl(value);
    if (mediaUrl) candidates.push(mediaUrl);
  };

  pushValue(item.imageUrl);
  pushValue(item.coverUrl);
  pushValue(item.avatarUrl);
  pushValue(item.thumbnailUrl);
  pushValue(item.previewUrl);
  pushValue(item.image);
  pushValue(item.photoUrl);
  pushValue(item.photo);
  pushValue(item.cover);
  pushValue(item.avatar);
  pushValue(item.coverImage);
  pushValue(item.avatarImage);
  pushValue(item.url);
  pushValue(item.fileUrl);
  pushValue(item.downloadUrl);
  pushValue(item.images);
  pushValue(item.imageAssets);
  pushValue(item.files);
  pushValue(item.attachments);
  pushValue(item.media);
  pushValue(item.assets);

  return candidates.find(Boolean) || null;
};

export default function CollectionCard({ item, titleKey = 'title', subtitleKey = 'description', onPress, footer }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault,
      padding: s.lg, marginBottom: s.md, flexDirection: 'row', alignItems: 'flex-start', gap: s.md,
    },
    cardPressed: { transform: [{ scale: 0.99 }] },
    mediaColumn: { width: 72, height: 72, borderRadius: r.lg, overflow: 'hidden', backgroundColor: c.brandLight },
    mediaImage: { width: '100%', height: '100%' },
    mediaFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
    mediaFallbackText: { color: c.onBrand, fontSize: 22, fontWeight: '900' },
    contentColumn: { flex: 1 },
    title: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    subtitle: { marginTop: 6, color: c.textSecondary, fontSize: 13, lineHeight: 19 },
    footer: { marginTop: s.sm },
  }));
  const title = item?.[titleKey] || item?.title || item?.name || 'Untitled';
  const subtitle = item?.[subtitleKey] || item?.body || item?.summary || 'No extra details yet.';
  const imageUrl = resolveCollectionImage(item);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.mediaColumn}>
        {showImage ? (
          <Image source={{ uri: imageUrl }} style={styles.mediaImage} contentFit="cover" cachePolicy="disk" onError={() => setImageFailed(true)} />
        ) : (
          <View style={styles.mediaFallback}>
            <Text style={styles.mediaFallbackText}>{title.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.contentColumn}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Pressable>
  );
}