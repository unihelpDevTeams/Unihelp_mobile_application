import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchAnnouncementsPage } from '../../services/firestoreSync';

const PAGE_SIZE = 20;

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const styles = useThemeStyles((c, s, r) => ({
    filterRow: { flexDirection: 'row', gap: s.sm, marginBottom: s['2xl'] },
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: s.lg, paddingVertical: 10, borderRadius: r.full, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault },
    filterChipActive: { backgroundColor: c.brand, borderColor: c.brand },
    filterChipPressed: { opacity: 0.8 },
    filterChipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
    filterChipTextActive: { color: c.onBrand },
    list: { gap: s.md },
    card: { backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s.lg },
    cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: s.md, marginBottom: s.sm },
    cardIcon: { width: 36, height: 36, borderRadius: r.md, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    cardMeta: { fontSize: 11.5, color: c.textSecondary, marginTop: s.xs },
    cardText: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
    pinnedBadge: { backgroundColor: c.brandLight, borderRadius: r.full, paddingHorizontal: s.sm, paddingVertical: 4 },
    pinnedBadgeText: { fontSize: 10, fontWeight: '800', color: c.brand },
    priorityTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: s.sm, backgroundColor: c.dangerLight, alignSelf: 'flex-start', paddingHorizontal: s.sm, paddingVertical: 4, borderRadius: r.full },
    priorityText: { fontSize: 10, fontWeight: '800' },
    loadingWrap: { gap: s.md, paddingVertical: s.xl },
    loadingText: { textAlign: 'center', color: c.textSecondary, fontSize: 13, fontWeight: '600' },
    skeleton: { height: 120, borderRadius: r['2xl'], backgroundColor: c.skeletonBackground },
    loadMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s.sm, backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl, paddingVertical: s.md, marginTop: s.md },
    loadMoreButtonPressed: { backgroundColor: c.canvasLight },
    loadMoreText: { color: c.brand, fontSize: 13, fontWeight: '800' },
  }));

  const loadAnnouncements = useCallback(async ({ reset = false } = {}) => {
    if (reset) {
      setLoading(true);
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    }

    try {
      const page = await fetchAnnouncementsPage({
        pageSize: PAGE_SIZE,
        cursor: reset ? null : cursor,
      });

      setItems((current) => {
        const nextItems = page.items || [];
        if (reset) return nextItems;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...nextItems.filter((item) => !seen.has(item.id))];
      });
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAnnouncementsPage({ pageSize: PAGE_SIZE })
      .then((page) => {
        if (!mounted) return;
        setItems(page.items || []);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    const now = Date.now();
    const dayMs = 86400000;
    return items.filter((item) => {
      const createdAt = item.createdAt?.toDate?.()?.getTime?.() || 0;
      if (filter === 'recent') return now - createdAt < 7 * dayMs;
      if (filter === 'pinned') return item.pinned === true;
      return true;
    });
  }, [items, filter]);

  const formatDate = (item) => {
    try {
      const date = item.createdAt?.toDate?.() || new Date(item.createdAt);
      const now = new Date();
      const diff = now - date;
      const days = Math.floor(diff / 86400000);
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#DC2626';
      case 'urgent': return '#DC2626';
      default: return colors.brand;
    }
  };

  const filters = [
    { key: 'all', label: 'All', icon: 'megaphone-outline' },
    { key: 'recent', label: 'Recent', icon: 'time-outline' },
    { key: 'pinned', label: 'Pinned', icon: 'pin-outline' },
  ];

  return (
    <ScreenShell title="Announcements" subtitle="Stay updated with the latest news from the team." showBack>
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={({ pressed }) => [
              styles.filterChip,
              filter === f.key && styles.filterChipActive,
              pressed && styles.filterChipPressed,
            ]}
          >
            <Ionicons
              name={f.icon}
              size={14}
              color={filter === f.key ? colors.surface : colors.inkMuted}
            />
            <Text
              style={[
                styles.filterChipText,
                filter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Loading announcements...</Text>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : filteredItems.length > 0 ? (
        <View style={styles.list}>
          {filteredItems.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push({ pathname: '/view/[type]/[id]', params: { type: 'announcement', id: item.id } })}
            >
              <View style={styles.cardTop}>
                <View style={[styles.cardIcon, { backgroundColor: (item.priority === 'high' ? '#DC2626' : colors.brand) + '15' }]}>
                  <Ionicons
                    name={item.pinned ? 'pin' : 'megaphone'}
                    size={16}
                    color={item.priority === 'high' ? '#DC2626' : colors.brand}
                  />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title || 'Untitled Announcement'}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.authorName || 'Admin'} · {formatDate(item)}
                  </Text>
                </View>
                {item.pinned && (
                  <View style={styles.pinnedBadge}>
                    <Text style={styles.pinnedBadgeText}>Pinned</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardText} numberOfLines={3}>
                {item.body || item.description || 'No additional details.'}
              </Text>
              {(item.priority === 'high' || item.priority === 'urgent') && (
                <View style={styles.priorityTag}>
                  <Ionicons name="alert-circle" size={12} color={getPriorityColor(item.priority)} />
                  <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                    {item.priority.toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
          {hasMore ? (
            <Pressable onPress={() => loadAnnouncements().catch(() => {})} disabled={loadingMore} style={({ pressed }) => [styles.loadMoreButton, pressed && styles.loadMoreButtonPressed]}>
              {loadingMore ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="chevron-down" size={16} color={colors.brand} />}
              <Text style={styles.loadMoreText}>{loadingMore ? 'Loading more...' : 'Load more announcements'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <EmptyState
          title={filter === 'all' ? 'No announcements' : `No ${filter} announcements`}
          description={
            filter === 'all'
              ? 'New announcements from the team will appear here.'
              : 'No announcements match this filter.'
          }
          actionLabel={filter !== 'all' ? 'View all' : undefined}
          onAction={filter !== 'all' ? () => setFilter('all') : undefined}
        />
      )}
    </ScreenShell>
  );
}
