import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { Video } from 'expo-av';
import { useTheme } from '../theme/ThemeContext';

export default function StickerMessage({ message, isMine, onLongPress }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const sticker = message?.sticker || {};
  const uri = sticker.assetUrl || sticker.thumbnailUrl;
  if (!uri) return <Text style={{ color: colors.textSecondary }}>Sticker unavailable</Text>;
  return <Pressable onLongPress={onLongPress} style={{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
    <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
      {sticker.type === 'animated' ? <Video source={{ uri }} style={{ width: 150, height: 150 }} resizeMode="contain" shouldPlay isLooping isMuted onLoad={() => setLoading(false)} /> : <Image source={{ uri }} style={{ width: 150, height: 150 }} resizeMode="contain" onLoad={() => setLoading(false)} />}
      {loading && <ActivityIndicator color={colors.brand} style={{ position: 'absolute' }} />}
    </View>
  </Pressable>;
}
