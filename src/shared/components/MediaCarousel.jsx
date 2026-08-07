import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
  pushValue(item.images);
  pushValue(item.imageAssets);
  pushValue(item.files);
  pushValue(item.attachments);
  pushValue(item.media);
  pushValue(item.assets);

  return candidates.find(Boolean) || null;
};

const getTitle = (item) => item?.title || item?.name || item?.subject || 'Listing';

export default function MediaCarousel({ items = [], onPressItem, renderFooter }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    wrapper: { marginBottom: s.lg },
    track: { gap: s.md, paddingHorizontal: s.lg },
    slide: { width: 296, backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, overflow: 'hidden' },
    slideMedia: { width: '100%', height: 164, backgroundColor: c.brandLight },
    slideImage: { width: '100%', height: '100%' },
    slideFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand },
    slideFallbackText: { color: c.onBrand, fontSize: 32, fontWeight: '900' },
    slideBody: { padding: s.md },
    slideTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    slideSubtitle: { marginTop: 6, fontSize: 13, color: c.textSecondary },
    slideFooter: { paddingHorizontal: s.md, paddingBottom: s.md },
    dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: s.sm },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.borderDefault },
    dotActive: { backgroundColor: c.brand, width: 18 },
  }));
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!items.length) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={296}
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.track}
        onMomentumScrollEnd={(event) => {
          const offset = event.nativeEvent.contentOffset.x;
          const index = Math.round(offset / 296);
          if (Number.isFinite(index)) setActiveIndex(index);
        }}
      >
        {items.map((item, index) => {
          const imageUrl = resolveCollectionImage(item);
          return (
            <Pressable
              key={item.id || index}
              style={styles.slide}
              onPress={() => onPressItem?.(item, index)}
            >
              <View style={styles.slideMedia}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.slideImage} contentFit="cover" cachePolicy="disk" />
                ) : (
                  <View style={styles.slideFallback}>
                    <Text style={styles.slideFallbackText}>{getTitle(item).charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <View style={styles.slideBody}>
                <Text style={styles.slideTitle} numberOfLines={1}>{getTitle(item)}</Text>
                <Text style={styles.slideSubtitle} numberOfLines={1}>{item?.description || item?.body || item?.summary || ''}</Text>
              </View>
              {renderFooter ? <View style={styles.slideFooter}>{renderFooter(item, index)}</View> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((_, index) => (
            <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}