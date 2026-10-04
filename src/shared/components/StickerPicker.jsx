import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { isPremiumActive } from '../services/premium';
import {
  fetchFavoriteStickers,
  fetchRecentStickers,
  fetchStickerPacks,
  fetchStickers,
  favoriteSticker,
  deleteSticker,
  recordStickerUse,
} from '../services/stickers';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

const COLUMNS = 4;
const GRID_GAP = 10;
const FALLBACK_CELL = 70;
const TOAST_DURATION_MS = 3000;
const HEART_ACTIVE = '#FF4D6D';

const TABS = [
  { key: 'mine', label: 'Mine', icon: 'person-outline' },
  { key: 'recent', label: 'Recent', icon: 'time-outline' },
  { key: 'favorites', label: 'Favorites', icon: 'heart-outline' },
  { key: 'packs', label: 'Packs', icon: 'albums-outline' },
];

const getImageUri = (item) => item?.thumbnailUrl || item?.imageUrl || item?.url || '';

/* -------------------------------------------------------------------------- */
/* Sticker cell                                                               */
/* -------------------------------------------------------------------------- */

const StickerCell = memo(function StickerCell({
  item, size, favorite, onSelect, onOptions, onToggleFavorite, styles, colors,
}) {
  const [failed, setFailed] = useState(false);
  const uri = getImageUri(item);
  const label = item.name || 'sticker';
  const imageSize = Math.max(size - 18, 32);

  return (
    <Pressable
      style={({ pressed }) => [styles.sticker, { width: size, height: size }, pressed && styles.stickerPressed]}
      onPress={() => onSelect(item)}
      onLongPress={() => onOptions(item)}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`Send ${label}`}
      accessibilityHint="Long press for sticker options"
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={{ width: imageSize, height: imageSize }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons name="image-outline" size={26} color={colors.textSecondary} />
      )}
      <Pressable
        hitSlop={8}
        onPress={() => onToggleFavorite(item)}
        style={[styles.favoriteBadge, favorite && styles.favoriteBadgeActive]}
        accessibilityRole="button"
        accessibilityLabel={favorite ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      >
        <Ionicons
          name={favorite ? 'heart' : 'heart-outline'}
          size={12}
          color={favorite ? HEART_ACTIVE : '#F8FAFC'}
        />
      </Pressable>
    </Pressable>
  );
});

/* -------------------------------------------------------------------------- */
/* Picker                                                                     */
/* -------------------------------------------------------------------------- */

export default function StickerPicker({ visible, onClose, onSelect }) {
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [tab, setTab] = useState('mine'); // 'mine' | 'recent' | 'favorites' | 'packs' | 'pack'
  const [selectedPackId, setSelectedPackId] = useState('');
  const [packs, setPacks] = useState([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [packsError, setPacksError] = useState('');
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);
  const [panel, setPanel] = useState(null); // { type: 'actions' | 'confirmDelete', sticker }
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null); // { message, tone }

  const selectingRef = useRef(false);
  const favoriteBusyRef = useRef(new Set());

  const uid = user?.uid || user?.id;
  const premium = isPremiumActive(profile);
  const activeTab = tab === 'pack' ? 'packs' : tab;
  const sheetHeight = Math.round(windowHeight * 0.72);
  const cellSize = gridWidth > 0
    ? Math.floor((gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS)
    : FALLBACK_CELL;

  const showToast = useCallback((message, tone = 'success') => setToast({ message, tone }), []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Reset transient UI when the sheet closes so it always opens on "Mine".
  useEffect(() => {
    if (visible) {
      selectingRef.current = false;
      return;
    }
    setTab('mine');
    setSelectedPackId('');
    setPanel(null);
    setToast(null);
    setDeleting(false);
  }, [visible]);

  // Packs: fetched once per open (and on retry), not on every tab switch.
  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    setPacksLoading(true);
    setPacksError('');
    fetchStickerPacks()
      .then((data) => { if (!cancelled) setPacks(data || []); })
      .catch((loadError) => {
        console.error('[StickerPicker] Failed to load packs:', loadError);
        if (!cancelled) setPacksError(loadError?.message || 'Could not load sticker packs.');
      })
      .finally(() => { if (!cancelled) setPacksLoading(false); });
    return () => { cancelled = true; };
  }, [visible, retryKey]);

  // Stickers for the active tab. The "packs" list tab needs no stickers.
  useEffect(() => {
    if (!visible || tab === 'packs') return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setStickers([]); // never show the previous tab's stickers under a new tab

    const request = tab === 'recent'
      ? fetchRecentStickers()
      : tab === 'favorites'
        ? fetchFavoriteStickers()
        : tab === 'mine'
          ? fetchStickers({ owner: 'me' })
          : fetchStickers(selectedPackId ? { packId: selectedPackId } : {});

    request
      .then((data) => { if (!cancelled) setStickers(data || []); })
      .catch((loadError) => {
        console.error('[StickerPicker] Failed to load stickers:', loadError);
        if (!cancelled) setError(loadError?.message || 'Could not load stickers.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [visible, tab, selectedPackId, retryKey]);

  const isFavorite = useCallback(
    (item) => Boolean(item.favorite || item.isFavorite || tab === 'favorites'),
    [tab],
  );

  const handleSelect = useCallback((sticker) => {
    if (selectingRef.current) return;
    selectingRef.current = true;
    // Send immediately; usage tracking must never delay or block the message.
    onSelect?.(sticker);
    onClose?.();
    recordStickerUse(sticker.id).catch((recordError) => {
      console.error('[StickerPicker] Failed to record sticker use:', recordError);
    });
  }, [onSelect, onClose]);

  const toggleFavorite = useCallback(async (sticker) => {
    if (favoriteBusyRef.current.has(sticker.id)) return;
    favoriteBusyRef.current.add(sticker.id);

    const next = !isFavorite(sticker);
    // Optimistic update.
    setStickers((current) => current.flatMap((item) => {
      if (item.id !== sticker.id) return [item];
      if (!next && tab === 'favorites') return [];
      return [{ ...item, favorite: next, isFavorite: next }];
    }));

    try {
      await favoriteSticker(sticker.id, next);
    } catch (favoriteError) {
      console.error('[StickerPicker] Failed to toggle favorite:', favoriteError);
      if (tab === 'favorites') {
        setRetryKey((key) => key + 1); // re-sync the removed item
      } else {
        setStickers((current) => current.map((item) => (
          item.id === sticker.id ? { ...item, favorite: !next, isFavorite: !next } : item
        )));
      }
      showToast(favoriteError?.message || 'Could not update favorite. Please try again.', 'error');
    } finally {
      favoriteBusyRef.current.delete(sticker.id);
    }
  }, [isFavorite, tab, showToast]);

  const confirmDelete = useCallback(async () => {
    const target = panel?.sticker;
    if (!target || deleting) return;
    setDeleting(true);
    try {
      await deleteSticker(target.id);
      setStickers((current) => current.filter((item) => item.id !== target.id));
      showToast('Sticker deleted');
    } catch (deleteError) {
      console.error('[StickerPicker] Failed to delete sticker:', deleteError);
      showToast(deleteError?.message || 'Could not delete sticker. Please try again.', 'error');
    } finally {
      setDeleting(false);
      setPanel(null);
    }
  }, [panel, deleting, showToast]);

  const openOptions = useCallback((sticker) => setPanel({ type: 'actions', sticker }), []);

  const dismissPanel = useCallback(() => {
    if (!deleting) setPanel(null);
  }, [deleting]);

  const goCreate = () => {
    onClose?.();
    router.navigate(premium ? '/stickers/create' : '/premium');
  };

  const goEdit = (sticker) => {
    setPanel(null);
    onClose?.();
    router.navigate({ pathname: '/stickers/create', params: { stickerId: sticker.id } });
  };

  const selectedPack = useMemo(
    () => packs.find((item) => item.id === selectedPackId),
    [packs, selectedPackId],
  );

  const retry = () => setRetryKey((key) => key + 1);

  const renderCenterState = ({ icon, title, body, action }) => (
    <View style={styles.centerState}>
      <View style={styles.centerIcon}>
        <Ionicons name={icon} size={30} color={colors.textSecondary} />
      </View>
      <Text style={styles.centerTitle}>{title}</Text>
      {body ? <Text style={styles.centerBody}>{body}</Text> : null}
      {action}
    </View>
  );

  const retryButton = (
    <Pressable
      style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
      onPress={retry}
      accessibilityRole="button"
    >
      <Ionicons name="refresh" size={14} color={colors.onBrand} />
      <Text style={styles.retryText}>Try again</Text>
    </Pressable>
  );

  const renderPacks = () => {
    if (packsLoading) return <ActivityIndicator style={styles.loader} color={colors.brand} />;
    if (packsError) {
      return renderCenterState({
        icon: 'cloud-offline-outline', title: "Couldn't load packs", body: packsError, action: retryButton,
      });
    }
    return (
      <FlatList
        key="sticker-packs-list"
        data={packs}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderCenterState({
          icon: 'albums-outline', title: 'No packs yet', body: 'Sticker packs will show up here.',
        })}
        renderItem={({ item }) => {
          const count = typeof item.stickerCount === 'number' ? item.stickerCount : item.count;
          return (
            <Pressable
              onPress={() => { setSelectedPackId(item.id); setTab('pack'); }}
              style={({ pressed }) => [styles.pack, pressed && styles.packPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.name} pack`}
            >
              <View style={styles.packIcon}>
                <Ionicons name="albums" size={20} color={colors.brand} />
              </View>
              <View style={styles.packBody}>
                <Text style={styles.packTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.packMeta} numberOfLines={1}>
                  {item.description || 'Sticker pack'}{typeof count === 'number' ? ` · ${count}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          );
        }}
      />
    );
  };

  const renderGrid = () => {
    if (loading) return <ActivityIndicator style={styles.loader} color={colors.brand} />;
    if (error) {
      return renderCenterState({
        icon: 'cloud-offline-outline', title: "Couldn't load stickers", body: error, action: retryButton,
      });
    }
    const empty = tab === 'mine'
      ? { icon: 'sparkles-outline', title: 'No stickers yet', body: 'Stickers you create will appear here.' }
      : tab === 'favorites'
        ? { icon: 'heart-outline', title: 'No favorites yet', body: 'Tap the heart on a sticker to save it here.' }
        : tab === 'recent'
          ? { icon: 'time-outline', title: 'Nothing recent', body: 'Stickers you send will appear here.' }
          : { icon: 'happy-outline', title: 'No stickers here yet', body: undefined };

    return (
      <FlatList
        key={`sticker-grid-${COLUMNS}`}
        data={stickers}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.gridRow}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderCenterState(empty)}
        ListFooterComponent={stickers.length ? <Text style={styles.hint}>Long press a sticker for more options</Text> : null}
        renderItem={({ item }) => (
          <StickerCell
            item={item}
            size={cellSize}
            favorite={isFavorite(item)}
            onSelect={handleSelect}
            onOptions={openOptions}
            onToggleFavorite={toggleFavorite}
            styles={styles}
            colors={colors}
          />
        )}
      />
    );
  };

  const renderPanel = () => {
    if (!panel) return null;
    const sticker = panel.sticker;
    const isOwner = Boolean(uid && sticker.ownerId === uid);
    const favorite = isFavorite(sticker);
    const uri = getImageUri(sticker);

    return (
      <View style={styles.layer} pointerEvents="box-none">
        <Pressable style={styles.layerBackdrop} onPress={dismissPanel} accessibilityLabel="Dismiss" />
        <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
          {panel.type === 'actions' ? (
            <>
              <View style={styles.panelHeader}>
                <View style={styles.panelPreview}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.panelPreviewImage} resizeMode="contain" />
                  ) : (
                    <Ionicons name="image-outline" size={26} color={colors.textSecondary} />
                  )}
                </View>
                <Text style={styles.panelTitle} numberOfLines={1}>{sticker.name || 'Sticker'}</Text>
              </View>

              <PanelRow
                styles={styles}
                icon="send-outline"
                label="Send sticker"
                color={colors.textPrimary}
                onPress={() => { setPanel(null); handleSelect(sticker); }}
              />
              <PanelRow
                styles={styles}
                icon={favorite ? 'heart-dislike-outline' : 'heart-outline'}
                label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                color={colors.textPrimary}
                onPress={() => { setPanel(null); toggleFavorite(sticker); }}
              />
              {isOwner ? (
                <>
                  <PanelRow
                    styles={styles}
                    icon="create-outline"
                    label="Edit sticker"
                    color={colors.textPrimary}
                    onPress={() => goEdit(sticker)}
                  />
                  <PanelRow
                    styles={styles}
                    icon="trash-outline"
                    label="Delete sticker"
                    color={colors.error}
                    onPress={() => setPanel({ type: 'confirmDelete', sticker })}
                  />
                </>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.panelCancel, pressed && styles.panelRowPressed]}
                onPress={dismissPanel}
                accessibilityRole="button"
              >
                <Text style={styles.panelCancelText}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.confirmIcon}>
                <Ionicons name="trash-outline" size={24} color={colors.error} />
              </View>
              <Text style={styles.confirmTitle}>Delete sticker?</Text>
              <Text style={styles.confirmBody}>
                {`"${sticker.name || 'This sticker'}" will be removed from your sticker library.`}
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  style={({ pressed }) => [styles.confirmButton, styles.confirmKeep, pressed && styles.panelRowPressed]}
                  onPress={dismissPanel}
                  disabled={deleting}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmKeepText}>Keep</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.confirmButton, styles.confirmDelete, pressed && styles.confirmDeletePressed]}
                  onPress={confirmDelete}
                  disabled={deleting}
                  accessibilityRole="button"
                >
                  {deleting
                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                    : <Text style={styles.confirmDeleteText}>Delete</Text>}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close sticker picker" />

        <View style={[styles.sheet, { height: sheetHeight, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Stickers</Text>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Close sticker picker"
              onPress={onClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.tabsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {TABS.map(({ key, label, icon }) => {
                const active = activeTab === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => { setSelectedPackId(''); setTab(key); }}
                    style={[styles.tab, active && styles.tabActive]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons name={icon} size={14} color={active ? colors.onBrand : colors.textSecondary} />
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {tab === 'pack' ? (
            <View style={styles.packHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to sticker packs"
                onPress={() => { setSelectedPackId(''); setTab('packs'); }}
                style={({ pressed }) => [styles.packBack, pressed && styles.closeButtonPressed]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </Pressable>
              <Text style={styles.packHeaderTitle} numberOfLines={1}>{selectedPack?.name || 'Sticker pack'}</Text>
            </View>
          ) : null}

          <View style={styles.content} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
            {tab === 'packs' ? renderPacks() : renderGrid()}
          </View>

          <Pressable
            style={({ pressed }) => [styles.create, pressed && styles.createPressed]}
            onPress={goCreate}
            accessibilityRole="button"
          >
            <Ionicons name={premium ? 'add-circle-outline' : 'lock-closed-outline'} size={18} color={colors.gold} />
            <Text style={styles.createText}>{premium ? 'Create Sticker' : 'Create Sticker with Premium'}</Text>
          </Pressable>

          {toast ? (
            <Pressable
              onPress={() => setToast(null)}
              style={[styles.toast, toast.tone === 'error' ? styles.toastError : styles.toastSuccess]}
              accessibilityRole="alert"
            >
              <Ionicons
                name={toast.tone === 'error' ? 'alert-circle' : 'checkmark-circle'}
                size={16}
                color={toast.tone === 'error' ? '#FFFFFF' : colors.onBrand}
              />
              <Text style={[styles.toastText, toast.tone === 'error' ? styles.toastTextError : styles.toastTextSuccess]} numberOfLines={2}>
                {toast.message}
              </Text>
            </Pressable>
          ) : null}

          {renderPanel()}
        </View>
      </View>
    </Modal>
  );
}

function PanelRow({ styles, icon, label, color, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.panelRow, pressed && styles.panelRowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.panelRowText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const createStyles = (c, s, r) => ({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bottomSheetBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: s.lg,
    paddingTop: s.sm,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.surfaceSecondary,
    marginBottom: s.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md },
  title: { color: c.textPrimary, fontSize: 20, fontWeight: '900' },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSecondary,
  },
  closeButtonPressed: { opacity: 0.7 },

  tabsWrap: { marginBottom: s.md, marginHorizontal: -s.lg },
  tabs: { gap: s.sm, paddingHorizontal: s.lg },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: s.md,
    paddingVertical: 8,
    borderRadius: r.full,
    backgroundColor: c.surfaceSecondary,
  },
  tabActive: { backgroundColor: c.brand },
  tabText: { color: c.textSecondary, fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: c.onBrand },

  content: { flex: 1 },
  listContent: { flexGrow: 1, paddingBottom: s.md },
  loader: { marginTop: s.xl || 32 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  sticker: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r['2xl'],
    backgroundColor: c.surfaceSecondary,
  },
  stickerPressed: { opacity: 0.75, transform: [{ scale: 0.95 }] },
  favoriteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15,23,42,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBadgeActive: { backgroundColor: 'rgba(15,23,42,0.88)' },
  hint: { textAlign: 'center', color: c.textSecondary, fontSize: 11, fontWeight: '600', marginTop: s.xs, opacity: 0.8 },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: s.xl || 32, paddingHorizontal: s.lg },
  centerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSecondary,
    marginBottom: s.md,
  },
  centerTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  centerBody: { color: c.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 4 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: s.md,
    backgroundColor: c.brand,
    borderRadius: r.full,
    paddingHorizontal: s.lg,
    paddingVertical: 10,
  },
  retryButtonPressed: { opacity: 0.85 },
  retryText: { color: c.onBrand, fontWeight: '800', fontSize: 13 },

  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: r['2xl'],
    padding: s.md,
    marginBottom: s.sm,
  },
  packPressed: { opacity: 0.8 },
  packIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bottomSheetBackground,
  },
  packBody: { flex: 1 },
  packTitle: { color: c.textPrimary, fontWeight: '800', fontSize: 14 },
  packMeta: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  packHeader: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginBottom: s.md },
  packBack: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSecondary,
  },
  packHeaderTitle: { flex: 1, color: c.textPrimary, fontWeight: '800', fontSize: 15 },

  create: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: s.sm,
    borderWidth: 1,
    borderColor: c.gold,
    borderRadius: r.full,
    paddingVertical: 12,
  },
  createPressed: { opacity: 0.7 },
  createText: { color: c.gold, fontWeight: '800' },

  toast: {
    position: 'absolute',
    top: 10,
    left: s.lg,
    right: s.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: r.xl,
    paddingHorizontal: s.md,
    paddingVertical: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  toastSuccess: { backgroundColor: c.brand },
  toastError: { backgroundColor: c.error },
  toastText: { flex: 1, fontSize: 13, fontWeight: '700' },
  toastTextSuccess: { color: c.onBrand },
  toastTextError: { color: '#FFFFFF' },

  // In-sheet layers (replace Alert.alert; avoids stacking native dialogs over a Modal)
  layer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  layerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },
  panel: {
    backgroundColor: c.bottomSheetBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: s.lg,
    paddingHorizontal: s.lg,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: s.md, marginBottom: s.sm },
  panelPreview: {
    width: 56,
    height: 56,
    borderRadius: r['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSecondary,
  },
  panelPreviewImage: { width: 44, height: 44 },
  panelTitle: { flex: 1, color: c.textPrimary, fontSize: 16, fontWeight: '800' },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.md,
    paddingVertical: 14,
    paddingHorizontal: s.sm,
    borderRadius: r.xl,
  },
  panelRowPressed: { backgroundColor: c.surfaceSecondary },
  panelRowText: { fontSize: 15, fontWeight: '700' },
  panelCancel: { alignItems: 'center', paddingVertical: 14, marginTop: s.xs, borderRadius: r.xl },
  panelCancelText: { color: c.textSecondary, fontSize: 15, fontWeight: '800' },

  confirmIcon: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSecondary,
    marginBottom: s.md,
  },
  confirmTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  confirmBody: { color: c.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: s.lg },
  confirmActions: { flexDirection: 'row', gap: s.sm },
  confirmButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.full,
  },
  confirmKeep: { backgroundColor: c.surfaceSecondary },
  confirmKeepText: { color: c.textPrimary, fontWeight: '800' },
  confirmDelete: { backgroundColor: c.error },
  confirmDeletePressed: { opacity: 0.85 },
  confirmDeleteText: { color: '#FFFFFF', fontWeight: '800' },
});