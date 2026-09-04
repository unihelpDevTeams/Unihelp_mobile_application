import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { isPremiumActive } from '../services/premium';
import { fetchFavoriteStickers, fetchRecentStickers, fetchStickerPacks, fetchStickers, recordStickerUse } from '../services/stickers';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

export default function StickerPicker({ visible, onClose, onSelect }) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState('packs');
  const [selectedPackId, setSelectedPackId] = useState('');
  const [packs, setPacks] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const premium = isPremiumActive(profile);
  const styles = useThemeStyles((c, s, r) => ({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.bottomSheetBackground, minHeight: '52%', maxHeight: '76%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: s.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md },
    title: { color: c.textPrimary, fontSize: 18, fontWeight: '900' },
    tabs: { flexDirection: 'row', gap: s.sm, marginBottom: s.md },
    tab: { paddingHorizontal: s.md, paddingVertical: 8, borderRadius: r.full, backgroundColor: c.surfaceSecondary },
    tabActive: { backgroundColor: c.brand },
    tabText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
    tabTextActive: { color: c.onBrand },
    grid: { gap: 10 },
    sticker: { width: '22%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    image: { width: 62, height: 62 },
    pack: { backgroundColor: c.surfaceSecondary, borderRadius: r['2xl'], padding: s.md, marginBottom: s.sm },
    packTitle: { color: c.textPrimary, fontWeight: '800' },
    packMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    create: { marginTop: s.md, borderWidth: 1, borderColor: c.gold, borderRadius: r.full, paddingVertical: 12, alignItems: 'center' },
    createText: { color: c.gold, fontWeight: '800' },
    error: { color: c.error, textAlign: 'center', marginVertical: s.md },
  }));

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true); setError('');
    Promise.all([fetchStickerPacks(), tab === 'recent' ? fetchRecentStickers() : tab === 'favorites' ? fetchFavoriteStickers() : fetchStickers(selectedPackId ? { packId: selectedPackId } : {})])
      .then(([packData, stickerData]) => { if (!cancelled) { setPacks(packData); setStickers(stickerData); } })
      .catch((loadError) => { if (!cancelled) setError(loadError.message || 'Could not load stickers.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, tab, selectedPackId]);

  const select = async (sticker) => {
    try { await recordStickerUse(sticker.id); } catch {}
    onSelect(sticker);
    onClose();
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
        <View style={styles.header}><Text style={styles.title}>Stickers</Text><Pressable accessibilityLabel="Close sticker picker" onPress={onClose}><Ionicons name="close" size={22} color={colors.textPrimary} /></Pressable></View>
        <View style={styles.tabs}>{[['recent', 'Recent'], ['favorites', 'Favorites'], ['packs', 'Packs']].map(([key, label]) => <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}><Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text></Pressable>)}</View>
        {loading ? <ActivityIndicator color={colors.brand} /> : error ? <Text style={styles.error}>{error}</Text> : tab === 'packs' ? <FlatList data={packs} keyExtractor={(item) => item.id} renderItem={({ item }) => <Pressable onPress={() => { setSelectedPackId(item.id); setTab('pack'); }} style={styles.pack}><Text style={styles.packTitle}>{item.name}</Text><Text style={styles.packMeta}>{item.description || 'Sticker pack'}</Text></Pressable>} ListEmptyComponent={<Text style={styles.packMeta}>No sticker packs available yet.</Text>} /> : <FlatList data={stickers} numColumns={4} columnWrapperStyle={styles.grid} keyExtractor={(item) => item.id} renderItem={({ item }) => <Pressable style={styles.sticker} onPress={() => select(item)} accessibilityLabel={`Send ${item.name}`}><Image source={{ uri: item.thumbnailUrl }} style={styles.image} /></Pressable>} ListEmptyComponent={<Text style={styles.packMeta}>No stickers here yet.</Text>} />}
        <Pressable style={styles.create} onPress={() => premium ? (onClose(), router.navigate('/stickers/create')) : router.navigate('/premium')}><Text style={styles.createText}>{premium ? '+ Create Sticker' : 'Create Sticker with Premium'}</Text></Pressable>
      </Pressable>
    </Pressable>
  </Modal>;
}
