import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchNotificationsPage, markNotificationRead } from '../../services/firestoreSync';

const PAGE_SIZE = 30;

const getTypeMeta = (colors) => ({
  message: { icon: 'chatbubble', color: colors.blue, soft: colors.cardElevated },
  direct_message: { icon: 'chatbubble', color: colors.blue, soft: colors.cardElevated },
  group_message: { icon: 'chatbubbles', color: colors.purple, soft: colors.cardElevated },
  group: { icon: 'people', color: colors.purple, soft: colors.cardElevated },
  group_created: { icon: 'people', color: colors.purple, soft: colors.cardElevated },
  group_join_request: { icon: 'person-add', color: colors.orange, soft: colors.cardElevated },
  friend_request_declined: { icon: 'close-circle', color: colors.grey, soft: colors.canvasLight },
  friend_removed: { icon: 'person-remove', color: colors.red, soft: colors.redLight },
  message_request_received: { icon: 'mail-unread', color: colors.blue, soft: colors.blueLight },
  message_request_accepted: { icon: 'chatbubble-ellipses', color: colors.green, soft: colors.greenLight },
  message_request_declined: { icon: 'mail-open', color: colors.grey, soft: colors.canvasLight },
  user_blocked: { icon: 'ban', color: colors.red, soft: colors.redLight },
  user_unblocked: { icon: 'lock-open', color: colors.green, soft: colors.greenLight },
  mention: { icon: 'at', color: colors.orange, soft: '#FEF3E1' },
  system: { icon: 'megaphone', color: colors.brand, soft: colors.brandLight },
  reminder: { icon: 'alarm', color: colors.green, soft: colors.greenLight },
  alert: { icon: 'alert-circle', color: colors.red, soft: colors.redLight },
  default: { icon: 'notifications', color: colors.brand, soft: colors.brandLight },
});

const toDate = (value) => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value?.toDate ? value.toDate() : value;
  return Number.isNaN(date?.getTime?.()) ? null : date;
};

const formatRelativeTime = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getDateGroup = (value) => {
  const date = toDate(value);
  if (!date) return 'Earlier';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This week';
  return 'Earlier';
};

const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Earlier'];

const resolveNotificationRoute = (item) => {
  if (item.conversationId) return `/messages/${item.conversationId}`;
  if (item.route && item.route !== '/notifications') {
    if (item.route.startsWith('/messages?conversationId=')) {
      const convId = item.route.split('=')[1];
      if (convId) return `/messages/${convId}`;
    }
    return item.route;
  }
  if (item.type === 'direct_message' || item.type === 'message') return '/messages';
  if (String(item.type || '').includes('friend') || String(item.type || '').includes('request') || String(item.type || '').includes('blocked') || String(item.type || '').includes('unblocked')) return '/friends';
  if (item.type === 'group' || item.type === 'group_created' || item.type === 'group_message') return '/community';
  return '/notifications';
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const typeMeta = useMemo(() => getTypeMeta(colors), [colors]);

  const load = useCallback(async ({ reset = false } = {}) => {
    if (reset) {
      setLoading(true);
    } else {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
    }

    try {
      const page = await fetchNotificationsPage({
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
    fetchNotificationsPage({ pageSize: PAGE_SIZE })
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load({ reset: true });
    } finally {
      setRefreshing(false);
    }
  };

  const unreadCount = items.filter((item) => !item.read).length;

  const sections = useMemo(() => {
    const groups = {};
    items.forEach((item) => {
      const group = getDateGroup(item.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
    return GROUP_ORDER.filter((label) => groups[label]?.length).map((label) => ({
      title: label,
      data: groups[label],
    }));
  }, [items]);

  const markOneRead = (item) => {
    if (item.read) return;
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
    markNotificationRead(item.id).catch(() => {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: false } : entry)));
    });
  };

  const openNotification = (item) => {
    markOneRead(item);
    const route = resolveNotificationRoute(item);
    router.push(route);
  };

  const markAllRead = async () => {
    const unread = items.filter((item) => !item.read);
    if (!unread.length) return;
    setMarkingAll(true);
    setItems((current) => current.map((entry) => ({ ...entry, read: true })));
    try {
      await Promise.all(unread.map((item) => markNotificationRead(item.id)));
    } catch {
      // best-effort; pull-to-refresh will resync
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <ScreenShell title="Notifications" subtitle="Stay updated with your activity" showBack loading={loading} scrollable={false}>
      {items.length ? (
        <>
          {/* Header Bar */}
          <View style={styles.topBar}>
            <View style={styles.unreadBadge}>
              <View style={[styles.unreadDot, unreadCount === 0 && styles.unreadDotZero]} />
              <Text style={styles.unreadLabel}>
                {unreadCount ? `${unreadCount} unread` : 'All caught up'}
              </Text>
            </View>
            {unreadCount ? (
              <Pressable
                style={({ pressed }) => [styles.markAllButton, pressed && styles.markAllButtonPressed]}
                onPress={markAllRead}
                disabled={markingAll}
              >
                {markingAll ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Text style={styles.markAllText}>Mark all read</Text>
                )}
              </Pressable>
            ) : null}
          </View>

          {/* Notification List */}
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
            onEndReached={() => {
              if (hasMore && !loadingMore) {
                load().catch(() => {});
              }
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              hasMore ? (
                <View style={styles.footerLoader}>
                  {loadingMore ? <ActivityIndicator size="small" color={colors.brand} /> : null}
                  <Text style={styles.footerLoaderText}>
                    {loadingMore ? 'Loading more notifications...' : 'Scroll for more'}
                  </Text>
                </View>
              ) : null
            }
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
                <View style={styles.sectionHeaderLine} />
              </View>
            )}
            renderItem={({ item }) => {
              const meta = typeMeta[item.type] || typeMeta.default;
              return (
                <Pressable
                  style={({ pressed }) => [ styles.row, !item.read && styles.rowUnread,
                    pressed && styles.rowPressed,]}
                  onPress={() => openNotification(item)}>
                  <View style={[styles.iconWrap, { backgroundColor: meta.soft }]}>
                    <Ionicons name={meta.icon} size={17} color={meta.color} />
                    {!item.read && <View style={styles.iconDot} />}
                  </View>
                  <View style={styles.rowBody}>
                    <View style={styles.rowTopLine}>
                      <Text style={[styles.rowTitle, !item.read && styles.rowTitleUnread]} numberOfLines={1}>
                        {item.title || 'Notification'}
                      </Text>
                      {!item.read ? <View style={styles.unreadBadgeDot} /> : null}
                    </View>
                    <Text style={styles.rowText} numberOfLines={2}>
                      {item.body || item.message || 'No message'}
                    </Text>
                    <View style={styles.rowFooter}>
                      <Text style={styles.rowTime}>{formatRelativeTime(item.createdAt)}</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.greyLight} />
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </>
      ) : (
        !loading && (
          <View style={styles.emptyWrapper}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.greyLight} />
            </View>
            <EmptyState
              title="You are all caught up"
              description="New notifications will show up here."
            />
          </View>
        )
      )}
    </ScreenShell>
  );
}

const createStyles = (colors, spacing, borderRadius) => ({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  unreadDotZero: {
    backgroundColor: colors.green,
  },
  unreadLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.grey,
  },
  markAllButton: {
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  markAllButtonPressed: {
    backgroundColor: colors.brandBorder,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brandText,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.canvasLight,
  },
  rowUnread: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brand,
  },
  listContent: {
    paddingBottom: spacing['3xl'],
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.grey,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  rowBody: {
    flex: 1,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  rowTitleUnread: {
    fontWeight: '800',
  },
  unreadBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  rowText: {
    marginTop: spacing.xs,
    color: colors.grey,
    fontSize: 12.5,
    lineHeight: 17,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rowTime: {
    color: colors.greyLight,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.canvasLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  footerLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  footerLoaderText: {
    color: colors.grey,
    fontSize: 12,
    fontWeight: '700',
  },
});
