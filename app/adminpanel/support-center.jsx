import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import {
  fetchContactMessages,
  fetchReports,
  fetchSuggestions,
} from '../../src/shared/services/support';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';

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

const STATUS_COLORS = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  resolved: { bg: '#D1FAE5', text: '#065F46' },
  closed: { bg: '#F3F4F6', text: '#4B5563' },
};

const formatStatus = (status) => {
  return (status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function AdminSupportCenter() {
  const router = useRouter();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('contact');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const lastDocRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const isAdmin = profile?.admin === true;

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
          lastDocRef.current = null;
        } else {
          setLoading(true);
        }
        setError('');

        const result = await fetchFn({
          statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
          searchQuery: searchQuery.trim() || undefined,
          lastDoc: isRefresh ? null : lastDocRef.current,
        });

        if (isRefresh || !lastDocRef.current) {
          setItems(result.items);
        } else {
          setItems((prev) => [...prev, ...result.items]);
        }

        lastDocRef.current = result.lastDoc;
        setHasMore(result.hasMore);
      } catch (fetchError) {
        setError(fetchError?.message || 'Failed to load data.');
        if (!isRefresh && !lastDocRef.current) {
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
    lastDocRef.current = null;
    setItems([]);
    setLoading(true);
    setError('');
    fetchData();
  }, [activeTab, statusFilter]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      lastDocRef.current = null;
      fetchData();
    }, 300);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    fetchData();
  };

  const handleRefresh = () => {
    lastDocRef.current = null;
    fetchData(true);
  };

  const navigateToDetail = (item) => {
    const collectionName = getCollectionName();
    router.push({
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
    return STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#4B5563' };
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
      <ScreenShell title="Support Center" subtitle="Admin-only operations." showBack>
        <View style={styles.restricted}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#64748B" />
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
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </Pressable>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={40} color="#94A3B8" />
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
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    );
  };

  return (
    <ScreenShell
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
              color={activeTab === tab.key ? '#4338CA' : '#64748B'}
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
        <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          placeholder="Search..."
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <Pressable onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
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
          <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Loading State */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading...</Text>
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

const styles = StyleSheet.create({
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
    color: '#0F172A',
  },
  restrictedText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#EEF2FF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#4338CA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
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
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#A5B4FC',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#4338CA',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
  listContent: {
    gap: 8,
    paddingBottom: 40,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  itemCardPressed: {
    backgroundColor: '#F8FAFC',
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
    color: '#0F172A',
    flex: 1,
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  itemEmail: {
    fontSize: 11,
    color: '#64748B',
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
    color: '#64748B',
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
    color: '#94A3B8',
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});