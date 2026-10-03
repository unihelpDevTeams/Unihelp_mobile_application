import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { PageLoader } from '../../src/shared/components/AILoaders';
import { useAuth } from '../../context/AuthContext';
import { isResourceAdmin } from '../../src/shared/auth/resourcePermissions';
import {
  fetchContactMessages,
  fetchReports,
  fetchSuggestions,
} from '../../src/shared/services/support';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

const TABS = [
  { key: 'contact', label: 'Contact', icon: 'mail-outline' },
  { key: 'reports', label: 'Reports', icon: 'flag-outline' },
  { key: 'suggestions', label: 'Suggestions', icon: 'bulb-outline' },
];

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const formatStatus = (status) => {
  return (status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function AdminSupportCenter() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles((themeColors) => createStyles(themeColors));
  const [activeTab, setActiveTab] = useState('contact');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const pageRef = useRef(1);
  const searchTimeoutRef = useRef(null);

  const isAdmin = isResourceAdmin(profile, user);

  const getFetchFn = useCallback(() => {
    switch (activeTab) {
      case 'contact':
        return fetchContactMessages;
      case 'reports':
        return fetchReports;
      case 'suggestions':
        return fetchSuggestions;
      default:
        return fetchContactMessages;
    }
  }, [activeTab]);

  const getCollectionName = useCallback(() => {
    switch (activeTab) {
      case 'contact':
        return COLLECTIONS.contactMessages;
      case 'reports':
        return COLLECTIONS.reports;
      case 'suggestions':
        return COLLECTIONS.suggestions;
      default:
        return COLLECTIONS.contactMessages;
    }
  }, [activeTab]);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      const fetchFn = getFetchFn();
      try {
        if (isRefresh) {
          setRefreshing(true);
          pageRef.current = 1;
        } else {
          setLoading(true);
        }
        setError('');

        const result = await fetchFn({
          statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
          searchQuery: searchQuery.trim() || undefined,
          page: isRefresh ? 1 : pageRef.current,
        });

        if (isRefresh || pageRef.current === 1) {
          setItems(result.items);
        } else {
          setItems((prev) => [...prev, ...result.items]);
        }

        if (result.hasMore) pageRef.current += 1;
        setHasMore(result.hasMore);
      } catch (fetchError) {
        setError(fetchError?.message || 'Failed to load data.');
        if (!isRefresh && pageRef.current === 1) {
          setItems([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [getFetchFn, statusFilter, searchQuery]
  );

  useEffect(() => {
    pageRef.current = 1;
    setItems([]);
    setLoading(true);
    setError('');
    fetchData();
  }, [activeTab, statusFilter]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      pageRef.current = 1;
      fetchData();
    }, 300);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    fetchData();
  };

  const handleRefresh = () => {
    pageRef.current = 1;
    fetchData(true);
  };

  const navigateToDetail = (item) => {
    const collectionName = getCollectionName();
    router.navigate({
      pathname: '/adminpanel/support-detail',
      params: {
        collection: collectionName,
        id: item.id,
        tab: activeTab,
      },
    });
  };

  const getItemTitle = (item) => {
    switch (activeTab) {
      case 'contact':
        return item.subject || 'No subject';
      case 'reports':
        return item.title || item.reportType || 'Untitled Report';
      case 'suggestions':
        return item.title || 'Untitled Suggestion';
      default:
        return 'Item';
    }
  };

  const getItemSubtitle = (item) => {
    switch (activeTab) {
      case 'contact':
        return item.name || item.email || 'Unknown';
      case 'reports':
        return item.displayName || item.email || 'Unknown';
      case 'suggestions':
        return item.category ? item.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Unknown';
      default:
        return '';
    }
  };

  const getItemPreview = (item) => {
    switch (activeTab) {
      case 'contact':
        return item.message || '';
      case 'reports':
        return item.description || '';
      case 'suggestions':
        return item.description || '';
      default:
        return '';
    }
  };

  const getItemEmail = (item) => {
    return item.email || '';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: { bg: colors.amberLight, text: colors.amber },
      in_progress: { bg: colors.blueLight, text: colors.blue },
      resolved: { bg: colors.greenLight, text: colors.green },
      closed: { bg: colors.surfaceSecondary, text: colors.textSecondary },
    };
    return statusColors[status] || statusColors.closed;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const mins = Math.floor(diff / (1000 * 60));
        return `${mins}m ago`;
      }
      return `${hours}h ago`;
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (!isAdmin) {
    return (
      <ScreenShell scrollable={false} title="Support Center" subtitle="Admin-only operations." showBack>
        <View style={styles.restricted}>
          <Ionicons name="shield-checkmark-outline" size={48} color={colors.grey} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedText}>
            You need admin privileges to access the Support Center.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  const renderStatusBadge = (status) => {
    const colors = getStatusColor(status);
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.statusText, { color: colors.text }]}>
          {formatStatus(status)}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.itemCard, pressed && styles.itemCardPressed]}
      onPress={() => navigateToDetail(item)}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleRow}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {getItemTitle(item)}
          </Text>
          {renderStatusBadge(item.status)}
        </View>
        <Text style={styles.itemSubtitle} numberOfLines={1}>
          {getItemSubtitle(item)}
        </Text>
        {getItemEmail(item) ? (
          <Text style={styles.itemEmail} numberOfLines={1}>
            {getItemEmail(item)}
          </Text>
        ) : null}
      </View>
      {getItemPreview(item) ? (
        <Text style={styles.itemPreview} numberOfLines={2}>
          {getItemPreview(item)}
        </Text>
      ) : null}
      <View style={styles.itemFooter}>
        <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
      </View>
    </Pressable>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={40} color={colors.greyLight} />
        <Text style={styles.emptyTitle}>No items found</Text>
        <Text style={styles.emptyText}>
          {searchQuery
            ? 'Try a different search term.'
            : 'No submissions yet for this section.'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.brand} />
      </View>
    );
  };

  return (
    <ScreenShell scrollable={false}
      title="Support Center"
      subtitle="Manage contact messages, reports, and suggestions"
      showBack
    >
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? colors.brandText : colors.grey}
            />
            <Text
              style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.greyLight} style={styles.searchIcon} />
        <TextInput
          placeholder="Search..."
          placeholderTextColor={colors.placeholder}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <Pressable onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.greyLight} />
          </Pressable>
        ) : null}
      </View>

      {/* Status Filter */}
      <View style={styles.filterRow}>
        {STATUS_OPTIONS.map((option) => {
          const active = statusFilter === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text
                style={[styles.filterChipText, active && styles.filterChipTextActive]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Error State */}
      {error && !loading ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Loading State */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <PageLoader label="Loading support queue..." />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}
    </ScreenShell>
  );
}

const createStyles = (colors) => ({
  restricted: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  restrictedTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  restrictedText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabActive: {
    backgroundColor: colors.brandLight,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.brandText,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 12,
    marginBottom: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brandBorder,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.brandText,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: colors.dangerLight,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  listContent: {
    gap: 8,
    paddingBottom: 40,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 14,
  },
  itemCardPressed: {
    backgroundColor: colors.canvasLight,
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted,
    marginBottom: 2,
  },
  itemEmail: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemPreview: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemDate: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
