import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { favoriteSticker, fetchFavoriteStickers } from '../services/stickers';
import { useTheme } from '../theme/ThemeContext';

export default function StickerMessage({ message, isMine, onLongPress }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [updatingFavorite, setUpdatingFavorite] = useState(false);
  const favoriteSyncVersionRef = useRef(0);
  const sticker = message?.sticker || {};
  const editor = sticker.editor || {};
  const uri = sticker.assetUrl || sticker.thumbnailUrl;
  const isAnimated = sticker.type === 'animated';
  const mine = Boolean((user?.uid || user?.id) && message?.senderId === (user?.uid || user?.id));
  const player = useVideoPlayer(isAnimated && uri ? { uri } : null, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    if (isAnimated && uri) videoPlayer.play();
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (!actionsOpen || !sticker.id) return undefined;
    let cancelled = false;
    const requestVersion = ++favoriteSyncVersionRef.current;
    fetchFavoriteStickers()
      .then((items) => {
        if (!cancelled && favoriteSyncVersionRef.current === requestVersion) {
          setFavorite((items || []).some((item) => item.id === sticker.id));
        }
      })
      .catch((loadError) => {
        console.error('[StickerMessage] Failed to load favorite stickers:', loadError);
      });
    return () => { cancelled = true; };
  }, [actionsOpen, sticker.id]);

  const toggleFavorite = async () => {
    if (!sticker.id || updatingFavorite) return;
    const next = !favorite;
    favoriteSyncVersionRef.current += 1;
    setFavorite(next);
    setUpdatingFavorite(true);
    try {
      await favoriteSticker(sticker.id, next);
    } catch (favoriteError) {
      console.error('[StickerMessage] Failed to update favorite:', favoriteError);
      setFavorite(!next);
      Alert.alert('Favorite not saved', favoriteError?.message || 'Could not update favorite. Please try again.');
    } finally {
      setUpdatingFavorite(false);
    }
  };

  if (!uri) return <Text style={{ color: colors.textSecondary }}>Sticker unavailable</Text>;
  return <>
    <Pressable onPress={() => setActionsOpen(true)} onLongPress={onLongPress} style={{ alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: 10 }} accessibilityRole="button" accessibilityLabel="Open sticker actions">
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
      {!isAnimated && editor.emoji ? (
        <Text style={{ position: 'absolute', top: 8, right: 8, fontSize: 30 }}>{editor.emoji}</Text>
      ) : null}
      {!isAnimated && editor.text ? (
        <Text
          numberOfLines={2}
          style={{
            position: 'absolute', bottom: 9, left: 8, right: 8,
            color: editor.textColor || '#FFFFFF', fontWeight: '900', textAlign: 'center',
            fontSize: editor.textSize === 'large' ? 20 : editor.textSize === 'small' ? 12 : 16,
            textShadowColor: editor.outline === false ? 'transparent' : '#000000',
            textShadowOffset: { width: 1, height: 1 }, textShadowRadius: editor.outline === false ? 0 : 2,
          }}
        >
          {editor.text}
        </Text>
      ) : null}
      {loading && status !== 'error' && !error && <ActivityIndicator color={colors.brand} style={{ position: 'absolute' }} />}
    </View>
    </Pressable>
    <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.52)' }}>
        <Pressable style={{ flex: 1 }} onPress={() => setActionsOpen(false)} accessibilityLabel="Close sticker actions" />
        <View style={{ backgroundColor: colors.bottomSheetBackground, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 6 }}>
          <View style={{ alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.surfaceSecondary, marginBottom: 8 }} />
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            {uri ? <Image source={{ uri }} style={{ width: 104, height: 104 }} resizeMode="contain" /> : null}
            <Text style={{ color: colors.textPrimary, fontWeight: '800', marginTop: 6 }}>{sticker.name || 'Sticker'}</Text>
          </View>
          <StickerAction icon={favorite ? 'heart-dislike-outline' : 'heart-outline'} label={favorite ? 'Remove from favorites' : 'Add to favorites'} color={colors.textPrimary} disabled={updatingFavorite} onPress={toggleFavorite} />
          {mine ? <StickerAction icon="create-outline" label="Edit sticker" color={colors.textPrimary} onPress={() => { setActionsOpen(false); router.navigate({ pathname: '/stickers/create', params: { stickerId: sticker.id } }); }} /> : null}
          <StickerAction icon="close-outline" label="Cancel" color={colors.textSecondary} onPress={() => setActionsOpen(false)} />
        </View>
      </View>
    </Modal>
  </>;
}

function StickerAction({ icon, label, color, disabled, onPress }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, opacity: pressed || disabled ? 0.6 : 1 })} accessibilityRole="button">
    <Ionicons name={icon} size={21} color={color} />
    <Text style={{ color, fontSize: 16, fontWeight: '700' }}>{label}</Text>
  </Pressable>;
}
