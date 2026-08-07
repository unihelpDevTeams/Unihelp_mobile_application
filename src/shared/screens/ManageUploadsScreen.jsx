import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import ScreenShell from '../components/ScreenShell';
import EmptyState from '../components/EmptyState';
import { shadows } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';
import { useAuth } from '../../../context/AuthContext';
import {
  deleteHostelListing,
  deleteStory,
  deleteStudentListing,
  fetchUserDocuments,
} from '../../../services/firestoreSync';

const CONFIGS = {
  hostels: {
    title: 'My Hostels',
    subtitle: 'Manage hostel photos, rent details, availability, and cleanup.',
    collection: 'hostels',
    ownerField: 'userId',
    emptyTitle: 'No hostel uploads yet',
    emptyDescription: 'Your hostel listings will appear here after you publish them.',
    uploadRoute: '/upload?type=hostel',
    editRoute: (id) => ({ pathname: '/upload', params: { type: 'hostel', editId: id } }),
    viewRoute: (id) => ({ pathname: '/view/[type]/[id]', params: { type: 'hostel', id } }),
    deleteItem: deleteHostelListing,
    createLabel: 'Add hostel',
    icon: 'home-outline',
    accent: 'blue',
  },
  listings: {
    title: 'My Listings',
    subtitle: 'Keep product listings organized, current, and easy to remove.',
    collection: 'studentMarketplace',
    ownerField: 'userId',
    emptyTitle: 'No product listings yet',
    emptyDescription: 'Listings you upload to the student marketplace will appear here.',
    uploadRoute: '/upload?type=marketplace',
    editRoute: (id) => ({ pathname: '/upload', params: { type: 'marketplace', editId: id } }),
    viewRoute: (id) => ({ pathname: '/view/[type]/[id]', params: { type: 'listing', id } }),
    deleteItem: deleteStudentListing,
    createLabel: 'Sell item',
    icon: 'storefront-outline',
    accent: 'brand',
  },
  stories: {
    title: 'My Stories',
    subtitle: 'Review drafts, published stories, covers, and story media.',
    collection: 'stories',
    ownerField: 'authorId',
    emptyTitle: 'No stories yet',
    emptyDescription: 'Drafts and published stories you create will appear here.',
    uploadRoute: '/stories/create',
    editRoute: (id) => ({ pathname: '/stories/create', params: { editId: id } }),
    viewRoute: (id) => ({ pathname: '/stories/[storyId]', params: { storyId: id } }),
    deleteItem: deleteStory,
    createLabel: 'Create story',
    icon: 'book-outline',
    accent: 'purple',
  },
};

const getTitle = (item) => item.title || item.name || 'Untitled';
const getDescription = (item) => item.description || item.summary || item.content || 'No description yet.';
const getImage = (item) => {
  if (item.coverImage) return item.coverImage;
  if (item.coverUrl) return item.coverUrl;
  if (item.imageUrl) return item.imageUrl;
  if (Array.isArray(item.images) && item.images[0]) return item.images[0];
  if (Array.isArray(item.imageAssets) && item.imageAssets[0]?.url) return item.imageAssets[0].url;
  return null;
};
const formatPrice = (value) => {
  const amount = Number(String(value || '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return `NGN ${amount.toLocaleString()}`;
};
const normalize = (value = '') => String(value).trim().toLowerCase();

export default function ManageUploadsScreen({ type }) {
  const config = CONFIGS[type] || CONFIGS.listings;
  const router = useRouter();
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState('');
  const [notice, setNotice] = useState('');
  const uid = profile?.uid || user?.uid;
  const accentColor = colors[config.accent] || colors.brand;

  const styles = useThemeStyles((c, s, r) => ({
    notice: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, padding: s.md, borderRadius: r.lg,
      borderWidth: 1, borderColor: c.green, backgroundColor: c.greenLight, marginBottom: s.md,
    },
    noticeText: { flex: 1, color: c.green, fontSize: 12.5, fontWeight: '800' },
    hero: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl,
      padding: s.lg, gap: s.md, marginBottom: s.lg,
    },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: s.md },
    heroIcon: { width: 44, height: 44, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center' },
    heroCopy: { flex: 1, minWidth: 0 },
    heroTitle: { color: c.textPrimary, fontSize: 19, fontWeight: '900' },
    heroSubtitle: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
    createButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: r.lg, paddingHorizontal: s.md, minHeight: 40 },
    createText: { color: c.onBrand, fontWeight: '900', fontSize: 12.5 },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.inputBackground,
      borderWidth: 1, borderColor: c.inputBorder, borderRadius: r.lg, paddingHorizontal: s.md,
    },
    searchInput: { flex: 1, color: c.textPrimary, fontSize: 14, paddingVertical: s.md },
    statsRow: { flexDirection: 'row', gap: s.sm },
    stat: { flex: 1, borderRadius: r.lg, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.surfaceSecondary, padding: s.md },
    statValue: { color: c.textPrimary, fontSize: 17, fontWeight: '900' },
    statLabel: { color: c.textTertiary, fontSize: 11, fontWeight: '800', marginTop: 2 },
    chips: { gap: s.sm, paddingBottom: s.sm, marginBottom: s.sm },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: r.full, borderWidth: 1,
      borderColor: c.borderDefault, backgroundColor: c.surfaceSecondary, paddingHorizontal: s.md, paddingVertical: 9, marginRight: s.sm,
    },
    chipActive: { borderColor: c.brand, backgroundColor: c.brand },
    chipText: { color: c.textPrimary, fontSize: 12, fontWeight: '800' },
    chipTextActive: { color: c.onBrand },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.md },
    sectionTitle: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    sectionCount: { color: c.textTertiary, fontSize: 12, fontWeight: '800' },
    card: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl,
      padding: s.md, marginBottom: s.md, gap: s.md,
    },
    cardTop: { flexDirection: 'row', gap: s.md },
    thumb: { width: 68, height: 68, borderRadius: r.lg, overflow: 'hidden', backgroundColor: c.brandLight },
    thumbImage: { width: '100%', height: '100%' },
    thumbFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    cardTitle: { flex: 1, color: c.textPrimary, fontSize: 15.5, fontWeight: '900' },
    badge: { borderRadius: r.full, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { fontSize: 10.5, fontWeight: '900' },
    description: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 5 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: c.textTertiary, fontSize: 11.5, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: s.sm },
    actionButton: {
      flex: 1, minHeight: 40, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center',
      flexDirection: 'row', gap: 6, borderWidth: 1,
    },
    actionText: { fontSize: 12.5, fontWeight: '900' },
    viewButton: { backgroundColor: c.surfaceSecondary, borderColor: c.borderDefault },
    viewText: { color: c.textPrimary },
    editButton: { backgroundColor: c.brandLight, borderColor: c.brandBorder },
    editText: { color: c.brandText },
    deleteButton: { backgroundColor: c.dangerLight, borderColor: c.dangerBorder },
    deleteText: { color: c.danger },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.redLight, borderColor: c.redBorder, borderWidth: 1, borderRadius: r.lg, padding: s.md },
    errorText: { flex: 1, color: c.red, fontSize: 13, fontWeight: '800' },
  }));

  const loadItems = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setItems(await fetchUserDocuments(config.collection, uid, config.ownerField));
    } catch (loadError) {
      setError(loadError?.message || 'Could not load your uploads.');
    } finally {
      setLoading(false);
    }
  }, [config.collection, config.ownerField, uid]);

  useFocusEffect(useCallback(() => {
    let active = true;
    loadItems().finally(() => {
      if (!active) return;
    });
    return () => { active = false; };
  }, [loadItems]));

  const stats = useMemo(() => {
    const draft = items.filter((item) => item.status === 'draft').length;
    const published = items.filter((item) => item.status !== 'draft').length;
    return { total: items.length, draft, published };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = normalize(query);
    return items.filter((item) => {
      const status = item.status || 'published';
      if (statusFilter === 'draft' && status !== 'draft') return false;
      if (statusFilter === 'published' && status === 'draft') return false;
      const text = normalize(`${getTitle(item)} ${getDescription(item)} ${item.category || ''} ${item.location || ''} ${item.genre || ''}`);
      return !q || text.includes(q);
    });
  }, [items, query, statusFilter]);

  const confirmDelete = (item) => {
    Alert.alert(
      'Delete upload?',
      'This removes the document and its Cloudinary media. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
      ]
    );
  };

  const handleDelete = async (item) => {
    setDeletingId(item.id);
    setError('');
    setNotice('');
    try {
      await config.deleteItem(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice('Item Deleted successfully.');
    } catch (deleteError) {
      setError(deleteError?.message || 'Could not delete this upload.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <ScreenShell title={config.title} subtitle={config.subtitle} showBack loading={loading}>
      {notice ? (
        <View style={styles.notice}>
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.green} />
          <Text style={styles.noticeText}>{notice}</Text>
          <Pressable onPress={() => setNotice('')} hitSlop={8}>
            <Ionicons name="close" size={15} color={colors.green} />
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={17} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={loadItems} hitSlop={8}>
            <Ionicons name="refresh" size={17} color={colors.red} />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.hero, shadows.sm]}>
        <View style={styles.heroTop}>
          <View style={[styles.heroIcon, { backgroundColor: `${accentColor}22` }]}>
            <Ionicons name={config.icon} size={22} color={accentColor} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{config.title}</Text>
            <Text style={styles.heroSubtitle}>{config.subtitle}</Text>
          </View>
          <Pressable onPress={() => router.push(config.uploadRoute)} style={[styles.createButton, { backgroundColor: accentColor }]}>
            <Ionicons name="add" size={17} color={colors.onBrand} />
            <Text style={styles.createText}>{config.createLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your uploads"
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={6}>
              <Ionicons name="close-circle" size={18} color={colors.iconSecondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Total" value={stats.total} styles={styles} />
          <Stat label="Published" value={stats.published} styles={styles} />
          <Stat label="Drafts" value={stats.draft} styles={styles} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[
          { key: 'all', label: 'All', icon: 'albums-outline' },
          { key: 'published', label: 'Published', icon: 'checkmark-circle-outline' },
          { key: 'draft', label: 'Drafts', icon: 'document-outline' },
        ].map((filter) => (
          <Pressable key={filter.key} onPress={() => setStatusFilter(filter.key)} style={({ pressed }) => [styles.chip, statusFilter === filter.key && styles.chipActive, pressed && { opacity: 0.82 }]}>
            <Ionicons name={filter.icon} size={14} color={statusFilter === filter.key ? colors.onBrand : colors.brand} />
            <Text style={[styles.chipText, statusFilter === filter.key && styles.chipTextActive]}>{filter.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Uploads</Text>
        <Text style={styles.sectionCount}>{filteredItems.length} result{filteredItems.length === 1 ? '' : 's'}</Text>
      </View>

      {filteredItems.length ? (
        filteredItems.map((item) => (
          <UploadCard
            key={item.id}
            item={item}
            config={config}
            accentColor={accentColor}
            deleting={deletingId === item.id}
            styles={styles}
            colors={colors}
            onView={() => router.push(config.viewRoute(item.id))}
            onEdit={() => router.push(config.editRoute(item.id))}
            onDelete={() => confirmDelete(item)}
          />
        ))
      ) : (
        <EmptyState
          title={items.length ? 'No uploads match your filters' : config.emptyTitle}
          description={items.length ? 'Try another search term or status filter.' : config.emptyDescription}
        />
      )}
    </ScreenShell>
  );
}

function Stat({ label, value, styles }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function UploadCard({ item, config, accentColor, deleting, styles, colors, onView, onEdit, onDelete }) {
  const title = getTitle(item);
  const imageUrl = getImage(item);
  const [imageFailed, setImageFailed] = useState(false);
  const status = item.status || 'published';
  const price = formatPrice(item.price);
  const meta = [
    price ? { icon: 'cash-outline', text: price } : null,
    item.location ? { icon: 'location-outline', text: item.location } : null,
    item.category ? { icon: 'pricetag-outline', text: item.category } : null,
    item.genre ? { icon: 'sparkles-outline', text: item.genre } : null,
    item.availability ? { icon: 'checkmark-circle-outline', text: item.availability } : null,
  ].filter(Boolean).slice(0, 3);

  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          {imageUrl && !imageFailed ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbImage} contentFit="cover" cachePolicy="disk" onError={() => setImageFailed(true)} />
          ) : (
            <View style={[styles.thumbFallback, { backgroundColor: `${accentColor}22` }]}>
              <Ionicons name={config.icon} size={24} color={accentColor} />
            </View>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            <View style={[styles.badge, { backgroundColor: status === 'draft' ? colors.amberLight : colors.greenLight }]}>
              <Text style={[styles.badgeText, { color: status === 'draft' ? colors.amber : colors.green }]}>{status === 'draft' ? 'Draft' : 'Live'}</Text>
            </View>
          </View>
          <Text style={styles.description} numberOfLines={2}>{getDescription(item)}</Text>
        </View>
      </View>

      {meta.length ? (
        <View style={styles.metaRow}>
          {meta.map((entry) => (
            <View key={`${entry.icon}-${entry.text}`} style={styles.meta}>
              <Ionicons name={entry.icon} size={13} color={colors.iconSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>{entry.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={onView} style={({ pressed }) => [styles.actionButton, styles.viewButton, pressed && { opacity: 0.82 }]}>
          <Ionicons name="eye-outline" size={15} color={colors.textPrimary} />
          <Text style={[styles.actionText, styles.viewText]}>View</Text>
        </Pressable>
        <Pressable onPress={onEdit} style={({ pressed }) => [styles.actionButton, styles.editButton, pressed && { opacity: 0.82 }]}>
          <Ionicons name="create-outline" size={15} color={colors.brandText} />
          <Text style={[styles.actionText, styles.editText]}>Edit</Text>
        </Pressable>
        <Pressable disabled={deleting} onPress={onDelete} style={({ pressed }) => [styles.actionButton, styles.deleteButton, deleting && { opacity: 0.65 }, pressed && !deleting && { opacity: 0.82 }]}>
          {deleting ? <ActivityIndicator size="small" color={colors.danger} /> : <Ionicons name="trash-outline" size={15} color={colors.danger} />}
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
