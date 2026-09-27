import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../theme/ThemeContext';

export default function StickerMessage({ message, isMine, onLongPress }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const sticker = message?.sticker || {};
  const uri = sticker.assetUrl || sticker.thumbnailUrl;
  const isAnimated = sticker.type === 'animated';
  const player = useVideoPlayer(isAnimated && uri ? { uri } : null, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    if (isAnimated && uri) videoPlayer.play();
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });

  if (!uri) return <Text style={{ color: colors.textSecondary }}>Sticker unavailable</Text>;
  return <Pressable onLongPress={onLongPress} style={{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
    <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
      {isAnimated
        ? error || status === 'error'
          ? <Text style={{ color: colors.textSecondary }}>Video unavailable</Text>
          : <VideoView
              player={player}
              style={{ width: 150, height: 150 }}
              contentFit="contain"
              nativeControls={false}
              onFirstFrameRender={() => setLoading(false)}
            />
        : <Image source={{ uri }} style={{ width: 150, height: 150 }} resizeMode="contain" onLoad={() => setLoading(false)} onError={() => setLoading(false)} />}
      {loading && status !== 'error' && !error && <ActivityIndicator color={colors.brand} style={{ position: 'absolute' }} />}
    </View>
  </Pressable>;
}
