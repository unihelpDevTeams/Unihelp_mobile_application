import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { useAuth } from '../../context/AuthContext';
import EmptyState from '../../src/shared/components/EmptyState';
import ConfirmDialog from '../../src/shared/components/ConfirmDialog';
import { deleteNotification, fetchNotificationsPage, markNotificationRead } from '../../services/firestoreSync';
import { markConversationRead } from '../../src/shared/services/community';

const PAGE_SIZE = 30;
const BANNER_DURATION_MS = 5000;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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
  // Falls back to a theme token so dark mode doesn't get a hardcoded light colour.
  mention: { icon: 'at', color: colors.orange, soft: colors.orangeLight || colors.cardElevated },
  system: { icon: 'megaphone', color: colors.brand, soft: colors.brandLight },
  reminder: { icon: 'alarm', color: colors.green, soft: colors.greenLight },
  alert: { icon: 'alert-circle', color: colors.red, soft: colors.redLight },
  premium: { icon: 'sparkles', color: colors.gold, soft: colors.goldLight },
  default: { icon: 'notifications', color: colors.brand, soft: colors.brandLight },
});

// Handles Date, ISO string, epoch number, Firestore Timestamp and { seconds } objects.
const toDate = (value) => {
  if (!value) return null;
  let date = null;
  if (value instanceof Date) date = value;
  else if (typeof value?.toDate === 'function') date = value.toDate();
  else if (typeof value?.seconds === 'number') date = new Date(value.seconds * 1000);
  else if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const formatRelativeTime = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString([], sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
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

// Returns a route string, or null when there is nowhere sensible to go.
const resolveNotificationRoute = (item) => {
  const type = String(item.type || '');
  const conversationId = item.conversationId || item.conversation_id || item.data?.conversationId || item.data?.conversation_id;
  if (conversationId) return `/messages/${conversationId}`;

  const groupId = item.groupId || item.group_id || item.data?.groupId || item.data?.group_id;
  if (groupId) return `/community/${groupId}`;

  const route = typeof item.route === 'string'
    ? item.route
    : typeof item.url === 'string'
      ? item.url
      : typeof item.data?.route === 'string'
        ? item.data.route
        : typeof item.data?.url === 'string'
          ? item.data.url
          : '';
  if (route && route !== '/notifications') {
    // Handles /messages?conversationId=abc and /messages?foo=1&conversationId=abc
    const match = route.match(/^\/messages\?(?:[^#]*&)?conversationId=([^&#]+)/);
    if (match) return `/messages/${match[1]}`;
    return route;
  }

  // Group types are checked first so "group_join_request" doesn't fall into the friends bucket.
  if (type.startsWith('group')) return '/community';
  if (type === 'direct_message' || type === 'message') return '/messages';
  if (type.includes('friend') || type.includes('request') || type.includes('blocked')) return '/friends';
  if (type === 'premium') return '/premium';
  return null;
};

/* -------------------------------------------------------------------------- */
/* Row                                                                        */
/* -------------------------------------------------------------------------- */

const NotificationRow = memo(function NotificationRow({
  item,
  meta,
  styles,
  colors,
  onOpen,
  onReply,
  onMarkRead,
  onRequestDelete,
}) {
  const title = item.title || 'Notification';
  const body = item.body || item.message || 'No message';
  const time = formatRelativeTime(item.createdAt);
  const type = String(item.type || '').toLowerCase();
  const replyRoute = resolveNotificationRoute(item);
  const canReply = ['message', 'direct_message', 'group_message'].includes(type)
    && (replyRoute?.startsWith('/messages/') || replyRoute?.startsWith('/community/'));

  return (
    <View style={[styles.row, !item.read && styles.rowUnread]}>
      <Pressable
        style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
        onPress={() => onOpen(item)}
        onLongPress={() => onRequestDelete(item)}
        delayLongPress={300}
        accessibilityRole="button"
        accessibilityLabel={`${item.read ? '' : 'Unread. '}${title}. ${body}. ${time}`}
        accessibilityHint="Opens the notification. Long press to delete."
      >
        <View style={[styles.iconWrap, { backgroundColor: meta.soft }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowTopLine}>
            <Text style={[styles.rowTitle, !item.read && styles.rowTitleUnread]} numberOfLines={1}>
              {title}
            </Text>
            {!item.read ? <View style={styles.unreadBadgeDot} /> : null}
          </View>

          <Text style={styles.rowText} numberOfLines={2}>
            {body}
          </Text>
          <Text style={styles.rowTime}>{time}</Text>
        </View>
      </Pressable>

      <View style={styles.rowActions}>
        {canReply ? (
          <Pressable
            onPress={() => onReply(item)}
            style={({ pressed }) => [styles.rowActionButton, pressed && styles.deleteButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Reply to ${title}`}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.brand} />
            <Text style={styles.rowActionText}>Reply</Text>
          </Pressable>
        ) : null}
        {!item.read ? (
          <Pressable
            onPress={() => onMarkRead(item)}
            style={({ pressed }) => [styles.rowActionButton, pressed && styles.deleteButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${title} as read`}
          >
            <Ionicons name="checkmark-done-outline" size={15} color={colors.grey} />
            <Text style={styles.rowActionSecondaryText}>Mark as read</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => onRequestDelete(item)}
          hitSlop={10}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
        >
          <Ionicons name="trash-outline" size={15} color={colors.greyLight} />
        </Pressable>
      </View>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/* Screen                                                                     */
/* -------------------------------------------------------------------------- */

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.uid;
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const typeMeta = useMemo(() => getTypeMeta(colors), [colors]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState('');

  // Refs keep pagination state fresh inside callbacks without re-creating them.
  const cursorRef = useRef(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, [user?.uid]);

  // Auto-dismiss the error banner.
  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(''), BANNER_DURATION_MS);
    return () => clearTimeout(timer);
  }, [banner]);

  /**
   * mode: 'initial' (full-screen loader), 'refresh' (pull-to-refresh, keeps list visible), 'more' (pagination)
   * A reset (initial/refresh) invalidates any in-flight request so stale pages never overwrite fresh data.
   */
  const fetchPage = useCallback(async (mode) => {
    const isMore = mode === 'more';
    if (isMore && (loadingMoreRef.current || !hasMoreRef.current)) return;

    let requestId;
    if (isMore) {
      requestId = requestIdRef.current;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setLoadMoreError(false);
    } else {
      requestId = ++requestIdRef.current;
      loadingMoreRef.current = false;
      setLoadingMore(false);
      setLoadMoreError(false);
      setLoadError(false);
      if (mode === 'initial') setLoading(true);
    }

    try {
      const page = await fetchNotificationsPage({
        pageSize: PAGE_SIZE,
        cursor: isMore ? cursorRef.current : null,
      });
      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      const nextItems = page?.items || [];
      setItems((current) => {
        if (!isMore) return nextItems;
        const seen = new Set(current.map((entry) => entry.id));
        return [...current, ...nextItems.filter((entry) => !seen.has(entry.id))];
      });
      cursorRef.current = page?.cursor ?? null;
      hasMoreRef.current = Boolean(page?.hasMore);
      setHasMore(hasMoreRef.current);
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      if (isMore) setLoadMoreError(true);
      else if (mode === 'refresh') setBanner("Couldn't refresh notifications. Pull down to try again.");
      else setLoadError(true);
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        if (isMore) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        } else {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
  }, []);

  useEffect(() => {
    fetchPage('initial');
  }, [fetchPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage('refresh');
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    fetchPage('more');
  }, [fetchPage]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  // If the "Unread" tab is empty but more pages exist, keep fetching until something shows up.
  useEffect(() => {
    if (filter === 'unread' && !loading && unreadCount === 0 && hasMore && !loadingMore && !loadMoreError) {
      fetchPage('more');
    }
  }, [filter, loading, unreadCount, hasMore, loadingMore, loadMoreError, fetchPage]);

  const sections = useMemo(() => {
    const visible = filter === 'unread' ? items.filter((item) => !item.read) : items;
    const groups = {};
    visible.forEach((item) => {
      const group = getDateGroup(item.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
    return GROUP_ORDER.filter((label) => groups[label]?.length).map((label) => ({
      title: label,
      data: groups[label],
    }));
  }, [items, filter]);

  const markNotificationAndChatRead = useCallback(async (item) => {
    await markNotificationRead(item.id);
    const conversationId = item.conversationId
      || item.conversation_id
      || item.data?.conversationId
      || item.data?.conversation_id;
    if (conversationId && userId && ['message', 'direct_message'].includes(String(item.type || '').toLowerCase())) {
      try {
        await markConversationRead(conversationId, userId);
      } catch (error) {
        if (mountedRef.current) {
          setBanner(`Notification marked as read, but the chat unread count couldn't be cleared: ${error?.message || 'Please open the chat to sync it.'}`);
        }
      }
    }
  }, [userId]);

  const markOneRead = useCallback(async (item) => {
    if (item.read) return true;
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: true } : entry)));
    try {
      await markNotificationAndChatRead(item);
      return true;
    } catch (error) {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, read: false } : entry)));
      if (mountedRef.current) {
        setBanner(error?.message || "Couldn't mark this notification as read. Please try again.");
      }
      return false;
    }
  }, [markNotificationAndChatRead]);

  const openNotification = useCallback((item) => {
    markOneRead(item);
    const route = resolveNotificationRoute(item);
    if (route) router.navigate(route);
  }, [markOneRead, router]);

  const replyToNotification = useCallback(async (item) => {
    const route = resolveNotificationRoute(item);
    await markOneRead(item);
    if (route) router.navigate(route);
  }, [markOneRead, router]);

  const requestDelete = useCallback((item) => setPendingDelete(item), []);

  const markAllRead = useCallback(async () => {
    const unread = items.filter((item) => !item.read);
    if (!unread.length || markingAll) return;

    setMarkingAll(true);
    setItems((current) => current.map((entry) => (entry.read ? entry : { ...entry, read: true })));

    const results = await Promise.allSettled(unread.map(markNotificationAndChatRead));
    if (!mountedRef.current) return;

    const failedIds = new Set(
      unread.filter((_, index) => results[index].status === 'rejected').map((item) => item.id),
    );
    if (failedIds.size) {
      // Roll back only the ones that actually failed.
      setItems((current) => current.map((entry) => (failedIds.has(entry.id) ? { ...entry, read: false } : entry)));
      setBanner(
        failedIds.size === unread.length
          ? "Couldn't mark notifications as read. Please try again."
          : `${failedIds.size} notification${failedIds.size > 1 ? 's' : ''} couldn't be marked as read.`,
      );
    }
    setMarkingAll(false);
  }, [items, markingAll, markNotificationAndChatRead]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deleting) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      await deleteNotification(target.id);
      if (!mountedRef.current) return;
      setItems((current) => current.filter((entry) => entry.id !== target.id));
    } catch (error) {
      if (mountedRef.current) {
        setBanner(error?.message || 'Could not delete this notification. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setDeleting(false);
        setPendingDelete(null);
      }
    }
  }, [pendingDelete, deleting]);

  const renderItem = useCallback(({ item }) => (
    <NotificationRow
      item={item}
      meta={typeMeta[item.type] || typeMeta.default}
      styles={styles}
      colors={colors}
      onOpen={openNotification}
      onReply={replyToNotification}
      onMarkRead={markOneRead}
      onRequestDelete={requestDelete}
    />
  ), [typeMeta, styles, colors, openNotification, replyToNotification, markOneRead, requestDelete]);

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
      <View style={styles.sectionHeaderLine} />
    </View>
  ), [styles]);

  const listFooter = useMemo(() => {
    if (loadMoreError) {
      return (
        <Pressable style={styles.footerLoader} onPress={loadMore} accessibilityRole="button">
          <Text style={styles.footerRetryText}>Couldn't load more. Tap to retry</Text>
        </Pressable>
      );
    }
    if (hasMore) {
      return (
        <View style={styles.footerLoader}>
          {loadingMore ? <ActivityIndicator size="small" color={colors.brand} /> : null}
        </View>
      );
    }
    return null;
  }, [loadMoreError, hasMore, loadingMore, loadMore, styles, colors.brand]);

  const listEmpty = useMemo(() => {
    if (hasMore || loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      );
    }
    return (
      <View style={styles.inlineEmpty}>
        <EmptyState title="No unread notifications" description="You're all caught up." />
      </View>
    );
  }, [hasMore, loadingMore, styles, colors.brand]);

  const showError = loadError && !items.length;
  const showEmpty = !loading && !showError && !items.length;
  const showList = !showError && items.length > 0;

  return (
    <ScreenShell title="Notifications" subtitle="Stay updated with your activity" showBack loading={loading} scrollable={false}>
      {banner ? (
        <Pressable onPress={() => setBanner('')} accessibilityRole="alert" accessibilityHint="Tap to dismiss">
          <Text style={styles.banner}>{banner}</Text>
        </Pressable>
      ) : null}

      {showList ? (
        <>
          <View style={styles.topBar}>
            <View style={styles.filterRow}>
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: unreadCount ? `Unread (${unreadCount})` : 'Unread' },
              ].map((tab) => {
                const active = filter === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setFilter(tab.key)}
                    style={[styles.filterTab, active && styles.filterTabActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {unreadCount ? (
              <Pressable
                style={({ pressed }) => [styles.markAllButton, pressed && styles.markAllButtonPressed]}
                onPress={markAllRead}
                disabled={markingAll}
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
              >
                {markingAll ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Text style={styles.markAllText}>Mark all read</Text>
                )}
              </Pressable>
            ) : (
              <View style={styles.caughtUp}>
                <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                <Text style={styles.caughtUpText}>All caught up</Text>
              </View>
            )}
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            windowSize={9}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={listEmpty}
            ListFooterComponent={listFooter}
          />
        </>
      ) : null}

      {showError ? (
        <View style={styles.emptyWrapper}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.greyLight} />
          </View>
          <EmptyState title="Couldn't load notifications" description="Check your connection and try again." />
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.markAllButtonPressed]}
            onPress={() => fetchPage('initial')}
            accessibilityRole="button"
          >
            <Text style={styles.markAllText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.emptyWrapper}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="notifications-off-outline" size={40} color={colors.greyLight} />
          </View>
          <EmptyState title="You are all caught up" description="New notifications will show up here." />
        </View>
      ) : null}

      <ConfirmDialog
        visible={Boolean(pendingDelete)}
        title="Delete notification?"
        message="This notification will be removed from your inbox."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Keep"
        variant="destructive"
        icon="trash-outline"
        loading={deleting}
        onCancel={() => { if (!deleting) setPendingDelete(null); }}
        onConfirm={confirmDelete}
      />
    </ScreenShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const createStyles = (colors, spacing, borderRadius) => ({
  banner: {
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brandBorder,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.grey,
  },
  filterTabTextActive: {
    color: colors.brandText,
  },
  markAllButton: {
    minHeight: 30,
    justifyContent: 'center',
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
  caughtUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  caughtUpText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.grey,
  },
  row: {
    flexDirection: 'column',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rowUnread: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brandBorder,
  },
  listContent: {
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
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
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.xs,
  },
  rowActionButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
  },
  rowActionText: {
    color: colors.brandText,
    fontSize: 11,
    fontWeight: '800',
  },
  rowActionSecondaryText: {
    color: colors.grey,
    fontSize: 11,
    fontWeight: '700',
  },
  rowTime: {
    color: colors.greyLight,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  deleteButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  deleteButtonPressed: {
    backgroundColor: colors.canvasLight,
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
  inlineEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['3xl'],
  },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  footerLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  footerRetryText: {
    color: colors.brandText,
    fontSize: 12,
    fontWeight: '700',
  },
});