import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { PageLoader } from '../../src/shared/components/AILoaders';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';
import { getJson, postJson, putJson, deleteJson } from '../../src/shared/services/backend';
import { blockUser, unblockUser } from '../../services/firestoreSync';
import MarketingSourcesManager from '../../src/admin/MarketingSourcesManager';
import PromoSpotlightManager from '../../src/admin/PromoSpotlightManager';
import StickerManager from '../../src/admin/StickerManager';
import AdminNewsManager from '../../src/admin/AdminNewsManager';
import PastQuestionReviewManager from '../../src/admin/PastQuestionReviewManager';
import UniversityManager from '../../src/admin/UniversityManager';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import {
  ADMIN_PREMIUM_GIFT_DAYS,
  getDaysLeft,
  getPremiumExpiry,
  getSubscriptionExpiry,
  isPremiumActive,
} from '../../src/shared/services/premium';

const ADMIN_NAV_SECTIONS = [
  { label: 'Overview', items: [{ key: 'dashboard', label: 'Dashboard', icon: 'grid-outline' }] },
  {
    label: 'People',
    items: [
      { key: 'users', label: 'Users', icon: 'people-outline' },
      { key: 'premium', label: 'Premium', icon: 'star-outline' },
    ],
  },
  {
    label: 'Content',
    items: [
      { key: 'pastQuestions', label: 'Past Questions', icon: 'clipboard-outline' },
      { key: 'notifications', label: 'Campus News', icon: 'newspaper-outline' },
      { key: 'mediaSources', label: 'Media Sources', icon: 'megaphone-outline' },
      { key: 'academicData', label: 'Universities', icon: 'school-outline' },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { key: 'listings', label: 'Listings', icon: 'storefront-outline' },
      { key: 'sponsorships', label: 'Sponsorships', icon: 'sparkles-outline' },
    ],
  },
  { label: 'Support', items: [{ key: 'support', label: 'Support Center', icon: 'headset-outline' }] },
  {
    label: 'Growth',
    items: [
      { key: 'promoSpotlights', label: 'Promo Spotlights', icon: 'sparkles-outline' },
      { key: 'streakRewards', label: 'Streak Rewards', icon: 'gift-outline' },
      { key: 'stickers', label: 'Stickers', icon: 'happy-outline' },
    ],
  },
  { label: 'System', items: [{ key: 'access', label: 'Access', icon: 'shield-checkmark-outline' }] },
];

const ADMIN_NAV_ITEMS = ADMIN_NAV_SECTIONS.flatMap((section) => section.items.map((item) => ({ ...item, section: section.label })));

const ADMIN_COLLECTION_MAP = {
  marketplace: { endpoint: '/api/marketplace', label: 'Student Marketplace' },
  hostels: { endpoint: '/api/hostels', label: 'Hostels' },
};

const LISTING_TYPES = [
  { key: 'marketplace', label: 'Marketplace', icon: 'pricetag-outline' },
  { key: 'hostels', label: 'Hostels', icon: 'home-outline' },
];

export default function AdminPanelPage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const pageStyles = useMemo(() => createPageStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [listingType, setListingType] = useState('marketplace');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [sponsoringId, setSponsoringId] = useState(null);
  const [overview, setOverview] = useState({ loading: true, error: '', metrics: {}, queues: {} });

  const isAdmin = profile?.admin === true || ['iadejuwon77@gmail.com', 'onakomayaokiki@gmail.com'].includes(String(user?.email || '').trim().toLowerCase());
  const activeNav = ADMIN_NAV_ITEMS.find((item) => item.key === activeTab) || ADMIN_NAV_ITEMS[0];
  const isWide = width >= 900;

  const fetchItems = useCallback(async () => {
    const config = ADMIN_COLLECTION_MAP[listingType];
    if (!config) return;
    setLoading(true);
    try {
      if (config.endpoint) {
        const data = await getJson(`${config.endpoint}?limit=50`);
        setItems(data?.items || []);
      } else if (config.collection) {
        const snapshot = await getDocs(
          query(collection(db, config.collection), orderBy('createdAt', 'desc'), limit(50))
        );
        setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.warn('Admin fetch error:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [listingType]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchItems();
  }, [isAdmin, fetchItems]);

  const loadOverview = useCallback(async () => {
    if (!isAdmin) return;
    setOverview((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [
        usersResult,
        marketplaceResult,
        hostelsResult,
        pastQuestionsResult,
        contactResult,
        reportsResult,
        suggestionsResult,
        announcementsResult,
        sourcesResult,
        packsResult,
        stickersResult,
      ] = await Promise.allSettled([
        getDocs(collection(db, COLLECTIONS.users)),
        getJson('/api/marketplace?limit=1'),
        getJson('/api/hostels?limit=1'),
        getJson('/api/past-questions?limit=1'),
        getJson('/api/contact?limit=1&status=pending'),
        getJson('/api/reports?limit=1&status=pending'),
        getJson('/api/suggestions?limit=1&status=pending'),
        getDocs(query(collection(db, 'announcements'), limit(100))),
        getDocs(query(collection(db, 'marketingSources'), limit(100))),
        getJson('/api/stickers/packs'),
        getJson('/api/stickers'),
      ]);

      const users = usersResult.status === 'fulfilled'
        ? usersResult.value.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        : [];
      const totalFrom = (result) => {
        if (result.status !== 'fulfilled') return 0;
        const value = result.value || {};
        return Number(value.total ?? value.count ?? value.items?.length ?? value.data?.length ?? (Array.isArray(value) ? value.length : 0)) || 0;
      };

      setOverview({
        loading: false,
        error: '',
        metrics: {
          users: users.length,
          activeUsers: users.filter((item) => !item.blocked).length,
          blockedUsers: users.filter((item) => item.blocked).length,
          premiumUsers: users.filter((item) => isPremiumActive(item)).length,
          marketplace: totalFrom(marketplaceResult),
          hostels: totalFrom(hostelsResult),
          pastQuestions: totalFrom(pastQuestionsResult),
          announcements: announcementsResult.status === 'fulfilled' ? announcementsResult.value.size : 0,
          marketingSources: sourcesResult.status === 'fulfilled' ? sourcesResult.value.size : 0,
          stickerPacks: totalFrom(packsResult),
          stickers: totalFrom(stickersResult),
        },
        queues: {
          contact: totalFrom(contactResult),
          reports: totalFrom(reportsResult),
          suggestions: totalFrom(suggestionsResult),
        },
      });
    } catch (error) {
      setOverview((current) => ({
        ...current,
        loading: false,
        error: error?.message || 'Could not load admin overview.',
      }));
    }
  }, [isAdmin]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleDelete = (item) => {
    const config = ADMIN_COLLECTION_MAP[listingType];
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${item.title || item.name || 'Untitled'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              if (config.endpoint) {
                await deleteJson(`${config.endpoint}/${item.id}`);
              } else if (config.collection) {
                const { deleteMediaDocument } = await import('../../services/mediaCleanup');
                await deleteMediaDocument(config.collection, item.id);
              }
              setItems((prev) => prev.filter((i) => i.id !== item.id));
              Alert.alert('Deleted', 'The listing has been removed.');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete listing.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const refreshListingItem = (updated) => {
    if (!updated?.id) return;
    setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  };

  const removeSponsorship = (item) => {
    setSponsoringId(item.id);
    deleteJson(`/api/marketplace/${encodeURIComponent(item.id)}/sponsor`)
      .then(refreshListingItem)
      .then(() => Alert.alert('Sponsorship removed', `${item.title || 'Listing'} is no longer promoted.`))
      .catch((error) => Alert.alert('Update failed', error.message || 'Could not remove sponsorship.'))
      .finally(() => setSponsoringId(null));
  };

  const manageSponsorship = (item) => {
    if (listingType !== 'marketplace') return;
    const actions = item.isSponsored
      ? [
          { text: 'Remove Sponsorship', style: 'destructive', onPress: () => removeSponsorship(item) },
          { text: 'Cancel', style: 'cancel' },
        ]
      : [
          {
            text: 'Paid seller flow only',
            onPress: () => Alert.alert(
              'Paid sponsorships',
              'Sellers must promote their own listings from the mobile listing detail screen and complete Flutterwave payment.'
            ),
          },
          { text: 'Cancel', style: 'cancel' },
        ];
    Alert.alert('Marketplace promotion', item.title || 'Listing', actions);
  };

  const getImageUrl = (item) => {
    const candidates = [];
    const push = (v) => {
      if (!v) return;
      if (Array.isArray(v)) v.forEach(push);
      else if (typeof v === 'string') candidates.push(v);
      else if (typeof v === 'object') {
        const url = v.url || v.secure_url || v.previewUrl || '';
        if (url) candidates.push(url);
      }
    };
    push(item.images);
    push(item.imageAssets);
    push(item.imageUrl);
    push(item.coverUrl);
    push(item.photoUrl);
    push(item.image);
    return candidates[0] || null;
  };

  const formatNaira = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? '' : `₦${n.toLocaleString()}`;
  };

  if (!isAdmin) {
    return (
      <ScreenShell title="Admin Panel" subtitle="Admin-only operations." showBack>
        <View style={pageStyles.restricted}>
          <Ionicons name="shield-checkmark-outline" size={48} color={colors.textSecondary} />
          <Text style={pageStyles.restrictedTitle}>Access Restricted</Text>
          <Text style={pageStyles.restrictedText}>
            You need admin privileges to access this panel. Contact the app administrator if you believe this is an error.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  const renderAdminContent = () => {
    if (activeTab === 'dashboard') {
      return <AdminDashboard colors={colors} overview={overview} onRefresh={loadOverview} setActiveTab={setActiveTab} />;
    }
    if (activeTab === 'users') return <UsersList colors={colors} />;
    if (activeTab === 'premium') return <UsersList colors={colors} premiumOnly />;
    if (activeTab === 'mediaSources') return <MarketingSourcesManager colors={colors} />;
    if (activeTab === 'academicData') return <UniversityManager />;
    if (activeTab === 'support') {
      return (
        <View style={pageStyles.notificationPlaceholder}>
          <Ionicons name="headset-outline" size={42} color={colors.brand} />
          <Text style={pageStyles.notificationTitle}>Support Center</Text>
          <Text style={pageStyles.notificationText}>
            Triage contact messages, reports, and product suggestions from the dedicated support queue.
          </Text>
          <View style={pageStyles.supportQueueRow}>
            <View style={pageStyles.supportQueuePill}><Text style={pageStyles.supportQueueValue}>{overview.queues.contact || 0}</Text><Text style={pageStyles.supportQueueLabel}>Contact</Text></View>
            <View style={pageStyles.supportQueuePill}><Text style={pageStyles.supportQueueValue}>{overview.queues.reports || 0}</Text><Text style={pageStyles.supportQueueLabel}>Reports</Text></View>
            <View style={pageStyles.supportQueuePill}><Text style={pageStyles.supportQueueValue}>{overview.queues.suggestions || 0}</Text><Text style={pageStyles.supportQueueLabel}>Ideas</Text></View>
          </View>
          <Pressable
            style={pageStyles.notificationButton}
            onPress={() => router.navigate('/adminpanel/support-center')}
          >
            <Ionicons name="arrow-forward-outline" size={18} color={colors.onBrand || '#FFF'} />
            <Text style={pageStyles.notificationButtonText}>Open Support Center</Text>
          </Pressable>
        </View>
      );
    }
    if (activeTab === 'promoSpotlights') return <PromoSpotlightManager />;
    if (activeTab === 'streakRewards') return <StreakRewardsAdmin colors={colors} />;
    if (activeTab === 'stickers') return <StickerManager colors={colors} />;
    if (activeTab === 'pastQuestions') return <PastQuestionReviewManager />;
    if (activeTab === 'access') return <AdminAccessPage colors={colors} profile={profile} user={user} />;
    if (activeTab === 'sponsorships') return <MarketplaceSponsorshipRecords colors={colors} />;
    if (activeTab === 'listings') {
      return (
        <View style={pageStyles.listingToggleWrap}>
          <View style={pageStyles.contentHeading}>
            <View>
              <Text style={pageStyles.contentTitle}>Listing moderation</Text>
              <Text style={pageStyles.contentSubtitle}>Review and remove marketplace content.</Text>
            </View>
            <View style={pageStyles.countBadge}>
              <Text style={pageStyles.countBadgeText}>{items.length}</Text>
            </View>
          </View>
          <View style={pageStyles.listingToggleContainer}>
            {LISTING_TYPES.map((option) => {
              const isActive = listingType === option.key;
              return (
                <Pressable
                  key={option.key}
                  onPress={() => setListingType(option.key)}
                  style={[pageStyles.listingToggle, isActive && pageStyles.listingToggleActive]}
                >
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={isActive ? colors.brandText || '#FFF' : colors.textSecondary}
                  />
                  <Text style={[pageStyles.listingToggleText, isActive && pageStyles.listingToggleTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <View style={pageStyles.loadingContainer}>
              <PageLoader label={`Loading ${ADMIN_COLLECTION_MAP[listingType].label}...`} />
            </View>
          ) : items.length === 0 ? (
            <View style={pageStyles.emptyContainer}>
              <Ionicons name="information-circle-outline" size={40} color={colors.textSecondary} />
              <Text style={pageStyles.emptyText}>No listings found</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={pageStyles.listContent}
              renderItem={({ item }) => (
                <View style={pageStyles.listingCard}>
                  <View style={pageStyles.listingLeft}>
                    {getImageUrl(item) ? (
                      <Image
                        source={{ uri: getImageUrl(item) }}
                        style={pageStyles.listingThumb}
                        contentFit="cover"
                        cachePolicy="disk"
                      />
                    ) : (
                      <View style={pageStyles.listingThumbFallback}>
                        <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
                      </View>
                    )}
                  </View>
                  <View style={pageStyles.listingBody}>
                    <Text style={pageStyles.listingTitle} numberOfLines={1}>
                      {item.title || item.name || 'Untitled'}
                    </Text>
                    {item.isSponsored ? (
                      <View style={pageStyles.sponsoredMiniBadge}>
                        <Ionicons name="sparkles" size={10} color={colors.warning || '#B45309'} />
                        <Text style={pageStyles.sponsoredMiniText}>
                          Sponsored{item.sponsoredUntil ? ` until ${new Date(item.sponsoredUntil).toLocaleDateString()}` : ''}
                        </Text>
                      </View>
                    ) : null}
                    {item.price != null && (
                      <Text style={pageStyles.listingPrice}>{formatNaira(item.price)}</Text>
                    )}
                    <Text style={pageStyles.listingOwner} numberOfLines={1}>
                      {item.sellerName || item.ownerName || 'Unknown'}
                    </Text>
                  </View>
                  <View style={pageStyles.listingActions}>
                    <Pressable
                      style={pageStyles.viewButton}
                      onPress={() =>
                        router.navigate({
                          pathname: '/view/[type]/[id]',
                          params: {
                            type: listingType === 'marketplace' ? 'listing' : 'hostel',
                            id: item.id,
                          },
                        })
                      }
                    >
                      <Ionicons name="eye-outline" size={18} color={colors.brand} />
                      </Pressable>
                    {listingType === 'marketplace' ? (
                      <Pressable
                        style={pageStyles.promoteButton}
                        onPress={() => manageSponsorship(item)}
                        disabled={sponsoringId === item.id}
                      >
                        {sponsoringId === item.id ? (
                          <ActivityIndicator size="small" color={colors.warning || '#B45309'} />
                        ) : (
                          <Ionicons name={item.isSponsored ? 'sparkles' : 'sparkles-outline'} size={18} color={colors.warning || '#B45309'} />
                        )}
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={pageStyles.deleteButton}
                      onPress={() => handleDelete(item)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? (
                        <ActivityIndicator size="small" color={colors.danger || '#DC2626'} />
                      ) : (
                        <Ionicons name="trash-outline" size={18} color={colors.danger || '#DC2626'} />
                      )}
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      );
    }
    return <AdminNewsManager />;
  };

  return (
    <ScreenShell title="Admin Panel" subtitle={activeNav?.section ? `${activeNav.section} / ${activeNav.label}` : `Welcome, ${profile?.username || 'Admin'}`} showBack loading={loading && activeTab === 'listings'}>
      <View style={pageStyles.adminHero}>
        <View style={pageStyles.heroIcon}>
          <Ionicons name="shield-checkmark" size={22} color={colors.onBrand || '#FFF'} />
        </View>
        <View style={pageStyles.heroCopy}>
          <Text style={pageStyles.heroEyebrow}>UNIHELP ADMIN</Text>
          <Text style={pageStyles.heroTitle}>{activeNav?.label || 'Dashboard'}</Text>
          <Text style={pageStyles.heroSubtitle}>Manage real UniHelp data across people, content, support, marketplace, and growth tools.</Text>
        </View>
        <Pressable style={pageStyles.refreshButton} onPress={() => { fetchItems(); loadOverview(); }}>
          <Ionicons name="refresh-outline" size={18} color={colors.onBrand || '#FFF'} />
        </Pressable>
      </View>

      <View style={[pageStyles.adminWorkspace, isWide && pageStyles.adminWorkspaceWide]}>
        <AdminSectionNav
          colors={colors}
          styles={pageStyles}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          wide={isWide}
        />
        <View style={pageStyles.adminContent}>
          <View style={pageStyles.contentHeader}>
            <View>
              <Text style={pageStyles.sectionEyebrow}>{activeNav?.section || 'Overview'}</Text>
              <Text style={pageStyles.sectionTitle}>{activeNav?.label || 'Dashboard'}</Text>
            </View>
            <View style={pageStyles.adminPill}>
              <View style={pageStyles.statusDot} />
              <Text style={pageStyles.adminPillText}>Admin</Text>
            </View>
          </View>
          {renderAdminContent()}
        </View>
      </View>
    </ScreenShell>
  );
}

function AdminSectionNav({ colors, styles, activeTab, setActiveTab, wide }) {
  const content = ADMIN_NAV_SECTIONS.map((section) => (
    <View key={section.label} style={styles.navSection}>
      <Text style={styles.navSectionLabel}>{section.label}</Text>
      <View style={wide ? styles.navItemsWide : styles.navItems}>
        {section.items.map((item) => {
          const selected = activeTab === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setActiveTab(item.key)}
              style={({ pressed }) => [
                styles.navItem,
                wide && styles.navItemWide,
                selected && styles.navItemActive,
                pressed && styles.tabPressed,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={selected ? colors.onBrand || '#FFFFFF' : colors.textSecondary || '#64748B'}
              />
              <Text style={[styles.navItemText, selected && styles.navItemTextActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  ));

  if (wide) {
    return <View style={styles.sidebarNav}>{content}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.mobileNav}
      contentContainerStyle={styles.mobileNavContent}
    >
      {content}
    </ScrollView>
  );
}

function MarketplaceSponsorshipRecords({ colors }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      gap: 12,
    },
    stateBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      paddingHorizontal: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surfaceSecondary,
    },
    stateText: {
      marginTop: 8,
      color: colors.textSecondary,
      textAlign: 'center',
      fontWeight: '700',
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14.5,
      fontWeight: '900',
    },
    pill: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: colors.brandLight,
    },
    pillText: {
      color: colors.brandDark,
      fontSize: 10.5,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    meta: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
    },
    amount: {
      color: colors.brandDark,
      fontSize: 15,
      fontWeight: '900',
    },
  }), [colors]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getJson('/api/marketplace/admin/sponsorships');
      setRecords(result.items || []);
    } catch (requestError) {
      setError(requestError.message || 'Could not load sponsorship records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const formatRecordDate = (value) => {
    if (!value) return 'Not set';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString();
  };

  const formatAmount = (record) => {
    const amount = Number(record.amountNaira ?? Number(record.amount || 0) / 100);
    return Number.isFinite(amount) ? `₦${amount.toLocaleString()}` : '';
  };

  if (loading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.stateText}>Loading sponsorship records...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <Pressable style={styles.stateBox} onPress={loadRecords}>
        <Ionicons name="warning-outline" size={28} color={colors.danger || '#DC2626'} />
        <Text style={styles.stateText}>{error}</Text>
      </Pressable>
    );
  }

  if (!records.length) {
    return (
      <View style={styles.stateBox}>
        <Ionicons name="sparkles-outline" size={32} color={colors.textSecondary} />
        <Text style={styles.stateText}>No marketplace sponsorship records yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {records.map((record) => (
        <View key={record.id} style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={2}>{record.listingTitle || record.listingId}</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{record.status || 'pending'}</Text>
            </View>
          </View>
          <Text style={styles.amount}>{formatAmount(record)} · {record.durationDays} days</Text>
          <Text style={styles.meta}>Seller: {record.sellerId}</Text>
          <Text style={styles.meta}>Reference: {record.paymentReference}</Text>
          <Text style={styles.meta}>Runs: {formatRecordDate(record.startsAt)} to {formatRecordDate(record.expiresAt)}</Text>
        </View>
      ))}
    </View>
  );
}

function AdminDashboard({ colors, overview, onRefresh, setActiveTab }) {
  const styles = useMemo(() => createDashboardStyles(colors), [colors]);
  const metrics = overview.metrics || {};
  const queues = overview.queues || {};
  const metricCards = [
    { label: 'Users', value: metrics.users || 0, detail: `${metrics.activeUsers || 0} active`, icon: 'people-outline', target: 'users' },
    { label: 'Premium', value: metrics.premiumUsers || 0, detail: 'Active entitlements', icon: 'star-outline', target: 'premium' },
    { label: 'Marketplace', value: metrics.marketplace || 0, detail: `${metrics.hostels || 0} hostels`, icon: 'storefront-outline', target: 'listings' },
    { label: 'Past Questions', value: metrics.pastQuestions || 0, detail: 'Processed documents', icon: 'document-text-outline', target: 'pastQuestions' },
  ];
  const operations = [
    { label: 'Announcements', value: metrics.announcements || 0, icon: 'newspaper-outline', target: 'notifications' },
    { label: 'Marketing sources', value: metrics.marketingSources || 0, icon: 'megaphone-outline', target: 'mediaSources' },
    { label: 'Sticker packs', value: metrics.stickerPacks || 0, icon: 'albums-outline', target: 'stickers' },
    { label: 'Stickers', value: metrics.stickers || 0, icon: 'happy-outline', target: 'stickers' },
  ];
  const support = [
    { label: 'Contact', value: queues.contact || 0 },
    { label: 'Reports', value: queues.reports || 0 },
    { label: 'Suggestions', value: queues.suggestions || 0 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.eyebrow}>LIVE OVERVIEW</Text>
          <Text style={styles.title}>Admin snapshot</Text>
          <Text style={styles.subtitle}>Counts come from Firebase and existing UniHelp backend endpoints.</Text>
        </View>
        <Pressable style={styles.refresh} onPress={onRefresh} disabled={overview.loading}>
          {overview.loading ? <ActivityIndicator size="small" color={colors.brand || '#4F46E5'} /> : <Ionicons name="refresh-outline" size={17} color={colors.brand || '#4F46E5'} />}
        </Pressable>
      </View>
      {overview.error ? (
        <View style={styles.notice}>
          <Ionicons name="alert-circle-outline" size={17} color={colors.danger || '#DC2626'} />
          <Text style={styles.noticeText}>{overview.error}</Text>
        </View>
      ) : null}
      <View style={styles.metricGrid}>
        {metricCards.map((item) => (
          <Pressable key={item.label} style={({ pressed }) => [styles.metricCard, pressed && styles.pressed]} onPress={() => setActiveTab(item.target)}>
            <View style={styles.metricTop}>
              <View style={styles.metricIcon}><Ionicons name={item.icon} size={18} color={colors.brand || '#4F46E5'} /></View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary || '#94A3B8'} />
            </View>
            <Text style={styles.metricValue}>{overview.loading ? '...' : item.value.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricDetail}>{item.detail}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Support queue</Text>
          <Pressable onPress={() => setActiveTab('support')}><Text style={styles.linkText}>Open</Text></Pressable>
        </View>
        {support.map((item) => (
          <View key={item.label} style={styles.queueRow}>
            <Text style={styles.queueLabel}>{item.label}</Text>
            <Text style={styles.queueValue}>{overview.loading ? '...' : item.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Content and growth</Text>
        <View style={styles.operationGrid}>
          {operations.map((item) => (
            <Pressable key={item.label} style={styles.operationItem} onPress={() => setActiveTab(item.target)}>
              <Ionicons name={item.icon} size={17} color={colors.brand || '#4F46E5'} />
              <View style={styles.operationCopy}>
                <Text style={styles.operationLabel}>{item.label}</Text>
                <Text style={styles.operationValue}>{overview.loading ? '...' : item.value.toLocaleString()}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function AdminAccessPage({ colors, profile, user }) {
  const styles = useMemo(() => createAccessStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="shield-checkmark-outline" size={30} color={colors.brand || '#4F46E5'} />
        <View style={styles.copy}>
          <Text style={styles.title}>Admin access</Text>
          <Text style={styles.text}>This screen uses the existing mobile admin gate: Firestore profile admin flag or the approved admin email allowlist.</Text>
        </View>
      </View>
      <View style={styles.detailCard}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.email || profile?.email || 'Unknown admin'}</Text>
        <Text style={styles.label}>Profile admin flag</Text>
        <Text style={styles.value}>{profile?.admin === true ? 'Enabled' : 'Not enabled'}</Text>
      </View>
    </View>
  );
}

function StreakRewardsAdmin({ colors }) {
  const styles = useMemo(() => StyleSheet.create({
    container: { gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.goldLight || '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
    headerCopy: { flex: 1 },
    title: { fontSize: 17, fontWeight: '900', color: colors.textPrimary },
    subtitle: { marginTop: 3, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.greenLight || '#ECFDF5' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success || '#10B981' },
    statusText: { color: colors.success || '#10B981', fontSize: 10, fontWeight: '800' },
    intro: { color: colors.textSecondary, lineHeight: 20 },
    feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 13, backgroundColor: colors.greenLight || '#ECFDF5', borderWidth: 1, borderColor: colors.success || '#10B981' },
    feedbackError: { backgroundColor: colors.dangerLight || '#FEF2F2', borderColor: colors.danger || '#DC2626' },
    feedbackText: { flex: 1, color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
    editorCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 18, padding: 14, gap: 10 },
    editorLabel: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
    editorHint: { color: colors.textTertiary || colors.textSecondary, fontSize: 11, lineHeight: 16 },
    milestoneCard: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 15, padding: 12, gap: 10, backgroundColor: colors.surfaceSecondary || colors.card },
    milestoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    milestoneNumber: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandLight || '#EEF2FF' },
    milestoneNumberText: { color: colors.brandText || colors.brand, fontWeight: '900', fontSize: 12 },
    milestoneHeaderCopy: { flex: 1 },
    milestoneTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
    milestoneSubtext: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
    fieldRow: { flexDirection: 'row', gap: 8 },
    field: { flex: 1, gap: 5 },
    fieldLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
    input: { minHeight: 42, borderWidth: 1, borderColor: colors.inputBorder || colors.borderDefault, borderRadius: 10, paddingHorizontal: 10, color: colors.textPrimary, backgroundColor: colors.inputBackground || colors.card, fontSize: 13 },
    rewardCard: { padding: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, gap: 8 },
    rewardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rewardLabel: { color: colors.textPrimary, fontSize: 11, fontWeight: '900' },
    rewardTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    typeChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.borderDefault },
    typeChipActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
    typeChipText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
    typeChipTextActive: { color: colors.brandText || colors.brand },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, borderWidth: 1, borderColor: colors.brandBorder || colors.brand, paddingVertical: 9 },
    addButtonText: { color: colors.brandText || colors.brand, fontSize: 11, fontWeight: '900' },
    removeButton: { padding: 4 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
    button: { flexDirection: 'row', gap: 8, backgroundColor: colors.brand, borderRadius: 13, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { color: colors.onBrand, fontWeight: '800' },
  }), [colors]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const createReward = (overrides = {}) => ({
    id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: 'New Reward',
    type: 'ai_tokens',
    value: 10,
    weight: 10,
    enabled: true,
    ...overrides,
  });

  const createMilestone = (days = 7, index = 0) => ({
    days,
    title: `${days} Day Streak`,
    enabled: true,
    rewards: [createReward({ id: `reward-${Date.now()}-${index}`, label: `+${days} AI Tokens`, type: 'ai_tokens', value: days, weight: 100 })],
  });

  useEffect(() => {
    getJson('/api/streak/admin/config').then((response) => {
      const next = Array.isArray(response.data) ? response.data : [];
      setMilestones(next.length ? next : [createMilestone(7, 0), createMilestone(14, 1)]);
    }).catch((error) => setStatus({ type: 'error', message: error.message || 'Could not load streak configuration.' })).finally(() => setLoading(false));
  }, []);

  const updateMilestone = (milestoneIndex, field, nextValue) => {
    setMilestones((current) => current.map((item, index) => index === milestoneIndex ? { ...item, [field]: nextValue } : item));
  };

  const updateReward = (milestoneIndex, rewardIndex, field, nextValue) => {
    setMilestones((current) => current.map((milestone, index) => index !== milestoneIndex ? milestone : {
      ...milestone,
      rewards: milestone.rewards.map((reward, currentRewardIndex) => currentRewardIndex === rewardIndex ? { ...reward, [field]: nextValue } : reward),
    }));
  };

  const addMilestone = () => {
    const lastDays = Number((milestones.at(-1)?.days) || 0);
    setMilestones((current) => [...current, createMilestone(Math.max(7, lastDays + 7), current.length)]);
  };

  const addReward = (milestoneIndex) => {
    setMilestones((current) => current.map((item, index) => index === milestoneIndex ? { ...item, rewards: [...(item.rewards || []), createReward()] } : item));
  };

  const removeMilestone = (milestoneIndex) => {
    setMilestones((current) => current.filter((_, index) => index !== milestoneIndex));
  };

  const removeReward = (milestoneIndex, rewardIndex) => {
    setMilestones((current) => current.map((item, index) => index === milestoneIndex ? { ...item, rewards: (item.rewards || []).filter((_, currentIndex) => currentIndex !== rewardIndex) } : item));
  };

  const save = async () => {
    const cleaned = milestones.filter((milestone) => milestone && milestone.days != null && milestone.title?.trim());
    if (!cleaned.length || cleaned.some((item) => !Number(item.days) || !item.title?.trim() || !Array.isArray(item.rewards) || item.rewards.length === 0)) {
      setStatus({ type: 'error', message: 'Complete each milestone and add at least one reward.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const response = await putJson('/api/streak/admin/config', { milestones: cleaned.map((item) => ({ ...item, days: Number(item.days), title: item.title.trim(), enabled: item.enabled !== false, rewards: (item.rewards || []).map((reward) => ({
        ...reward,
        enabled: reward.enabled !== false,
        weight: Number(reward.weight || 0),
        value: reward.type === 'badge' ? String(reward.value || '').trim() : Number(reward.value || 0),
      })) })) });
      setMilestones(response.data || cleaned);
      setStatus({ type: 'success', message: 'Streak reward configuration published.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'The backend rejected this configuration.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><Ionicons name="gift-outline" size={22} color={colors.gold || colors.brand} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Streak reward rules</Text>
          <Text style={styles.subtitle}>Configure the milestones that keep students coming back.</Text>
        </View>
        <View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>LIVE</Text></View>
      </View>
      <Text style={styles.intro}>Update milestone days, reward types, values, enabled states, and weights without editing raw JSON.</Text>
      {status ? <View style={[styles.feedback, status.type === 'error' && styles.feedbackError]}><Ionicons name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={18} color={status.type === 'error' ? colors.danger : colors.success} /><Text style={styles.feedbackText}>{status.message}</Text></View> : null}
      <View style={styles.editorCard}>
        <Text style={styles.editorLabel}>Milestones</Text>
        <Text style={styles.editorHint}>Set the streak day, reward title, and each reward option below.</Text>
        {loading ? <ActivityIndicator color={colors.brand} /> : milestones.map((milestone, milestoneIndex) => (
          <View key={`${milestone.days ?? milestoneIndex}-${milestoneIndex}`} style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <View style={styles.milestoneNumber}><Text style={styles.milestoneNumberText}>{milestoneIndex + 1}</Text></View>
              <View style={styles.milestoneHeaderCopy}><Text style={styles.milestoneTitle}>{milestone.title || 'Milestone'}</Text><Text style={styles.milestoneSubtext}>{(milestone.rewards || []).length} reward option(s)</Text></View>
              <Pressable style={styles.removeButton} onPress={() => removeMilestone(milestoneIndex)} disabled={saving}><Ionicons name="trash-outline" size={17} color={colors.danger || '#DC2626'} /></Pressable>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.field}><Text style={styles.fieldLabel}>STREAK DAYS</Text><TextInput value={String(milestone.days ?? '')} onChangeText={(value) => updateMilestone(milestoneIndex, 'days', value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={styles.input} /></View>
              <View style={[styles.field, { flex: 2 }]}><Text style={styles.fieldLabel}>MILESTONE NAME</Text><TextInput value={milestone.title || ''} onChangeText={(value) => updateMilestone(milestoneIndex, 'title', value)} style={styles.input} /></View>
            </View>
            <View style={styles.switchRow}><Text style={styles.switchText}>{milestone.enabled === false ? 'Milestone disabled' : 'Milestone enabled'}</Text><Pressable onPress={() => updateMilestone(milestoneIndex, 'enabled', milestone.enabled === false)}><Ionicons name={milestone.enabled === false ? 'toggle-outline' : 'toggle'} size={28} color={milestone.enabled === false ? colors.textTertiary : colors.success} /></Pressable></View>
            {(milestone.rewards || []).map((reward, rewardIndex) => (
              <View key={`${reward.id || rewardIndex}-${rewardIndex}`} style={styles.rewardCard}>
                <View style={styles.rewardHeader}><Text style={styles.rewardLabel}>Reward {rewardIndex + 1}</Text><Pressable style={styles.removeButton} onPress={() => removeReward(milestoneIndex, rewardIndex)}><Ionicons name="close-circle-outline" size={17} color={colors.textSecondary} /></Pressable></View>
                <TextInput value={reward.label || ''} onChangeText={(value) => updateReward(milestoneIndex, rewardIndex, 'label', value)} placeholder="Reward description" placeholderTextColor={colors.textTertiary} style={styles.input} />
                <View style={styles.rewardTypeRow}>{[['ai_tokens', 'AI tokens'], ['free_premium_days', 'Premium days'], ['premium_discount', 'Discount'], ['badge', 'Badge']].map(([type, label]) => <Pressable key={type} onPress={() => updateReward(milestoneIndex, rewardIndex, 'type', type)} style={[styles.typeChip, reward.type === type && styles.typeChipActive]}><Text style={[styles.typeChipText, reward.type === type && styles.typeChipTextActive]}>{label}</Text></Pressable>)}</View>
                <View style={styles.fieldRow}><View style={styles.field}><Text style={styles.fieldLabel}>VALUE</Text><TextInput value={String(reward.value ?? '')} onChangeText={(value) => updateReward(milestoneIndex, rewardIndex, 'value', reward.type === 'badge' ? value : value.replace(/[^0-9]/g, ''))} keyboardType={reward.type === 'badge' ? 'default' : 'number-pad'} style={styles.input} /></View><View style={styles.field}><Text style={styles.fieldLabel}>WEIGHT</Text><TextInput value={String(reward.weight ?? '')} onChangeText={(value) => updateReward(milestoneIndex, rewardIndex, 'weight', value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={styles.input} /></View></View>
                <View style={styles.switchRow}><Text style={styles.switchText}>{reward.enabled === false ? 'Reward disabled' : 'Reward enabled'}</Text><Pressable onPress={() => updateReward(milestoneIndex, rewardIndex, 'enabled', reward.enabled === false)}><Ionicons name={reward.enabled === false ? 'toggle-outline' : 'toggle'} size={28} color={reward.enabled === false ? colors.textTertiary : colors.success} /></Pressable></View>
              </View>
            ))}
            <Pressable style={styles.addButton} onPress={() => addReward(milestoneIndex)}><Ionicons name="add" size={16} color={colors.brand} /><Text style={styles.addButtonText}>Add reward</Text></Pressable>
          </View>
        ))}
        <Pressable style={styles.addButton} onPress={addMilestone} disabled={loading || saving}><Ionicons name="add-circle-outline" size={17} color={colors.brand} /><Text style={styles.addButtonText}>Add milestone</Text></Pressable>
      </View>
      <Pressable onPress={save} disabled={loading || saving} style={[styles.button, (loading || saving) && styles.buttonDisabled]}>
        {!loading && !saving ? <Ionicons name="save-outline" size={17} color={colors.onBrand} /> : null}
        <Text style={styles.buttonText}>{loading ? 'Loading...' : saving ? 'Saving...' : 'Save Reward Configuration'}</Text>
      </Pressable>
    </View>
  );
}

function UsersList({ colors, premiumOnly = false }) {
  const router = useRouter();
  const userStyles = useMemo(() => createUserStyles(colors), [colors]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(premiumOnly ? 'premium' : 'all');
  const [premiumTarget, setPremiumTarget] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [grantingPremium, setGrantingPremium] = useState(false);
  const [syncingPremiumId, setSyncingPremiumId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.users));
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (isMounted) {
          setUsers(
            all.sort((a, b) => {
              const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
              const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
              return bTime - aTime;
            })
          );
        }
      } catch (err) {
        console.warn('User load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const sourceValue = `${u.heardFrom || ''} ${u.heardFromOther || ''}`.trim();
      const matchesFilter = filter === 'all'
        || (filter === 'blocked' && u.blocked)
        || (filter === 'admins' && u.admin)
        || (filter === 'premium' && isPremiumActive(u))
        || (filter === 'referrals' && !!sourceValue);
      const matchesSearch = !term || [u.username, u.email, u.school, u.department, sourceValue].filter(Boolean).join(' ').toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [users, search, filter]);

  const getUserInitials = (u) => {
    const name = u.username || u.email || 'S';
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'S';
  };

  const formatShortDate = (date) => (date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No expiry');

  const handleBlockToggle = async (userItem) => {
    if (userItem.blocked) {
      Alert.alert('Unblock User', `Allow ${userItem.username || userItem.email} to access the app again?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await unblockUser(userItem.uid || userItem.id);
              setUsers((prev) => prev.map((u) => (u.id === userItem.id ? { ...u, blocked: false } : u)));
              Alert.alert('Unblocked', 'The user can now access the app.');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to unblock user.');
            }
          },
        },
      ]);
    } else {
      Alert.alert(
        'Block User',
        `Are you sure you want to block ${userItem.username || userItem.email}? They will lose access to the app.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                await blockUser(userItem.uid || userItem.id);
                setUsers((prev) => prev.map((u) => (u.id === userItem.id ? { ...u, blocked: true } : u)));
                Alert.alert('Blocked', 'The user has been blocked from accessing the app.');
              } catch (error) {
                Alert.alert('Error', error.message || 'Failed to block user.');
              }
            },
          },
        ]
      );
    }
  };

  const grantPremium = async () => {
    if (!premiumTarget || grantingPremium) return;
    setGrantingPremium(true);
    setFeedback(null);
    try {
      const response = await postJson(`/api/users/${encodeURIComponent(premiumTarget.uid || premiumTarget.id)}/premium-trial`, {});
      const grant = response.data || response;
      const fallbackExpiry = new Date(Date.now() + ADMIN_PREMIUM_GIFT_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const expiry = grant?.subscriptionExpiresAt || grant?.premiumExpiresAt || fallbackExpiry;
      setUsers((prev) => prev.map((item) => item.id === premiumTarget.id ? {
        ...item,
        premium: true,
        premiumExpiresAt: expiry,
        subscriptionExpiresAt: expiry,
        subscriptionStatus: 'admin_grant',
      } : item));
      setPremiumTarget(null);
      setFeedback({ type: 'success', title: 'Premium access granted', message: `${premiumTarget.username || 'This user'} received ${ADMIN_PREMIUM_GIFT_DAYS} days of Premium access.` });
    } catch (error) {
      setFeedback({ type: 'error', title: 'Could not grant Premium', message: error.message || 'Please try again.' });
    } finally {
      setGrantingPremium(false);
    }
  };

  const syncPremiumExpiry = async (userItem) => {
    const targetId = userItem.uid || userItem.id;
    if (!targetId || syncingPremiumId) return;

    setSyncingPremiumId(userItem.id);
    setFeedback(null);

    try {
      const response = await postJson(`/api/users/${encodeURIComponent(targetId)}/sync-premium-expiry`, {});
      const synced = response.data || response;
      const expiry = synced.subscriptionExpiresAt || synced.premiumExpiresAt;

      setUsers((prev) => prev.map((item) => item.id === userItem.id ? {
        ...item,
        premium: true,
        premiumExpiresAt: expiry,
        subscriptionExpiresAt: expiry,
        subscriptionStatus: synced.subscriptionStatus || item.subscriptionStatus || 'active',
      } : item));

      setFeedback({
        type: 'success',
        title: 'Premium expiry synced',
        message: `${userItem.username || 'This user'} now has subscriptionExpiresAt and premiumExpiresAt aligned.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Could not sync expiry',
        message: error.message || 'Please try again.',
      });
    } finally {
      setSyncingPremiumId(null);
    }
  };

  return (
    <View style={userStyles.container}>
      {feedback ? (
        <View style={[userStyles.feedbackCard, feedback.type === 'error' && userStyles.feedbackError]}>
          <Ionicons name={feedback.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={20} color={feedback.type === 'error' ? colors.danger : colors.success} />
          <View style={userStyles.feedbackCopy}><Text style={userStyles.feedbackTitle}>{feedback.title}</Text><Text style={userStyles.feedbackText}>{feedback.message}</Text></View>
          <Pressable onPress={() => setFeedback(null)}><Ionicons name="close" size={18} color={colors.textSecondary} /></Pressable>
        </View>
      ) : null}
      {premiumTarget ? (
        <View style={userStyles.confirmCard}>
          <View style={userStyles.confirmIcon}><Ionicons name="sparkles" size={21} color={colors.gold || colors.brand} /></View>
          <View style={userStyles.feedbackCopy}>
            <Text style={userStyles.feedbackTitle}>Grant {ADMIN_PREMIUM_GIFT_DAYS} days of Premium?</Text>
            <Text style={userStyles.feedbackText}>{premiumTarget.username || premiumTarget.email || 'This user'} will receive Premium access. Any active Premium time will be extended.</Text>
          </View>
          <View style={userStyles.confirmActions}>
            <Pressable style={userStyles.cancelButton} onPress={() => setPremiumTarget(null)} disabled={grantingPremium}><Text style={userStyles.cancelText}>Cancel</Text></Pressable>
            <Pressable style={userStyles.confirmButton} onPress={grantPremium} disabled={grantingPremium}>{grantingPremium ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Text style={userStyles.confirmText}>Grant access</Text>}</Pressable>
          </View>
        </View>
      ) : null}
      <View style={userStyles.usersHeader}>
        <View>
          <Text style={userStyles.sectionEyebrow}>DIRECTORY</Text>
          <Text style={userStyles.sectionTitle}>{premiumOnly ? 'Premium users' : 'User management'}</Text>
          <Text style={userStyles.sectionSubtitle}>{premiumOnly ? 'Review entitlements and sync expiry data.' : 'Review accounts and control access.'}</Text>
        </View>
        <View style={userStyles.totalBadge}>
          <Text style={userStyles.totalValue}>{users.length}</Text>
          <Text style={userStyles.totalLabel}>TOTAL</Text>
        </View>
      </View>
      <View style={userStyles.statsRow}>
        <View style={userStyles.statCard}><Text style={userStyles.statValue}>{users.filter((u) => !u.blocked).length}</Text><Text style={userStyles.statLabel}>Active</Text></View>
        <View style={userStyles.statCard}><Text style={[userStyles.statValue, userStyles.dangerValue]}>{users.filter((u) => u.blocked).length}</Text><Text style={userStyles.statLabel}>Blocked</Text></View>
        <View style={userStyles.statCard}><Text style={[userStyles.statValue, userStyles.brandValue]}>{users.filter((u) => isPremiumActive(u)).length}</Text><Text style={userStyles.statLabel}>Premium</Text></View>
        <View style={userStyles.statCard}><Text style={[userStyles.statValue, userStyles.promoValue]}>{users.filter((u) => !!(`${u.heardFrom || ''} ${u.heardFromOther || ''}`.trim())).length}</Text><Text style={userStyles.statLabel}>Sources</Text></View>
      </View>
      <View style={userStyles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={userStyles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, school..."
          placeholderTextColor={colors.textSecondary}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <View style={userStyles.filterRow}>
        {[['all', 'All users'], ['premium', 'Premium'], ['referrals', 'Referrals'], ['blocked', 'Blocked'], ['admins', 'Admins']].map(([key, label]) => (
          <Pressable key={key} onPress={() => setFilter(key)} style={({ pressed }) => [userStyles.filterChip, filter === key && userStyles.filterChipActive, pressed && userStyles.actionPressed]}>
            <Text style={[userStyles.filterText, filter === key && userStyles.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={userStyles.loadingWrap}>
          <PageLoader label="Loading users..." />
          {[1, 2, 3].map((i) => (
            <View key={i} style={userStyles.skeleton} />
          ))}
        </View>
      ) : filteredUsers.length > 0 ? (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={userStyles.listPadding}
          renderItem={({ item }) => {
            const itemPremiumActive = isPremiumActive(item);
            const itemPremiumExpiry = getPremiumExpiry(item);
            const itemDaysLeft = getDaysLeft(itemPremiumExpiry);
            const hasSubscriptionExpiry = Boolean(getSubscriptionExpiry(item.subscriptionExpiresAt));
            const needsPremiumExpirySync = itemPremiumActive && !hasSubscriptionExpiry && Boolean(itemPremiumExpiry);
            return (
            <Pressable
              style={({ pressed }) => [userStyles.card, pressed && userStyles.cardPressed]}
              onPress={() => router.navigate(`/view-user-profile/${item.uid || item.id}`)}
            >
              <View style={userStyles.avatar}>
                {item.photoThumb || item.photo || item.photoURL ? (
                  <Image source={{ uri: item.photoThumb || item.photo || item.photoURL }} style={userStyles.avatarImage} />
                ) : (
                  <Text style={userStyles.avatarText}>{getUserInitials(item)}</Text>
                )}
              </View>
              <View style={userStyles.body}>
                <Text style={userStyles.name} numberOfLines={1}>
                  {item.username || 'Student'}
                </Text>
                <Text style={userStyles.email} numberOfLines={1}>
                  {item.email || 'No email'}
                </Text>
                <View style={userStyles.metaRow}>
                  {item.role ? (
                    <View style={userStyles.metaChip}>
                      <Ionicons name="school" size={10} color={colors.brand} />
                      <Text style={userStyles.metaChipText}>{item.role}</Text>
                    </View>
                  ) : null}
                  {item.school ? (
                    <Text style={userStyles.school} numberOfLines={1}>
                      {item.school}
                    </Text>
                  ) : null}
                </View>
                {item.heardFrom || item.heardFromOther ? (
                  <View style={userStyles.referralBadge}>
                    <Ionicons name="megaphone-outline" size={10} color={colors.brand || '#4338CA'} />
                    <Text style={userStyles.referralBadgeText}>Heard from: {item.heardFromOther || item.heardFrom || 'Source'} </Text>
                  </View>
                ) : null}
                {item.blocked && (
                  <View style={userStyles.blockedBadge}>
                    <Ionicons name="ban-outline" size={10} color={colors.danger || '#DC2626'} />
                    <Text style={userStyles.blockedBadgeText}>Blocked</Text>
                  </View>
                )}
                {itemPremiumActive ? (
                  <View style={userStyles.premiumInfoRow}>
                    <Ionicons name="sparkles" size={11} color={colors.gold || '#B45309'} />
                    <Text style={userStyles.premiumInfoText} numberOfLines={1}>
                      Premium {itemDaysLeft == null ? 'active' : `${itemDaysLeft}d left`} - {formatShortDate(itemPremiumExpiry)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={userStyles.cardActions}>
                {itemPremiumActive ? <View style={userStyles.premiumBadge}><Ionicons name="sparkles" size={12} color={colors.gold || '#B45309'} /><Text style={userStyles.premiumBadgeText}>Premium</Text></View> : null}
                <Pressable style={({ pressed }) => [userStyles.premiumButton, pressed && userStyles.actionPressed]} onPress={(e) => { e.stopPropagation(); setPremiumTarget(item); }}>
                  <Ionicons name={itemPremiumActive ? 'add-circle-outline' : 'gift-outline'} size={14} color={colors.gold || '#B45309'} />
                  <Text style={userStyles.premiumButtonText}>{itemPremiumActive ? `Add ${ADMIN_PREMIUM_GIFT_DAYS}d` : `Gift ${ADMIN_PREMIUM_GIFT_DAYS}d`}</Text>
                </Pressable>
                {needsPremiumExpirySync ? (
                  <Pressable
                    style={({ pressed }) => [userStyles.syncButton, pressed && userStyles.actionPressed]}
                    onPress={(e) => {
                      e.stopPropagation();
                      syncPremiumExpiry(item);
                    }}
                    disabled={syncingPremiumId === item.id}
                  >
                    {syncingPremiumId === item.id ? (
                      <ActivityIndicator size="small" color={colors.brand || '#4338CA'} />
                    ) : (
                      <Ionicons name="sync-outline" size={14} color={colors.brand || '#4338CA'} />
                    )}
                    <Text style={userStyles.syncButtonText}>Sync expiry</Text>
                  </Pressable>
                ) : null}
                {item.admin ? (
                  <View style={userStyles.adminBadge}><Ionicons name="shield-checkmark" size={12} color={colors.brand} /><Text style={userStyles.adminBadgeText}>Admin</Text></View>
                ) : (
                <Pressable
                  style={({ pressed }) => [
                    userStyles.actionButton,
                    item.blocked ? userStyles.unblockButton : userStyles.blockButton,
                    pressed && userStyles.actionPressed,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleBlockToggle(item);
                  }}
                >
                  <Ionicons name={item.blocked ? 'checkmark-circle' : 'ban-outline'} size={14} color="#FFF" />
                  <Text style={userStyles.actionButtonText}>{item.blocked ? 'Unblock' : 'Block'}</Text>
                </Pressable>
                )}
              </View>
            </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={userStyles.emptyWrap}>
          <Ionicons name="people-outline" size={36} color={colors.textSecondary} />
          <Text style={userStyles.emptyText}>{search || filter !== 'all' ? 'No users match these filters' : 'No users found'}</Text>
        </View>
      )}
    </View>
  );
}

const createPageStyles = (colors) =>
  StyleSheet.create({
    adminHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.brandDark || '#3730A3',
      borderRadius: 20,
      padding: 18,
      marginBottom: 22,
      shadowColor: colors.shadow || '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 4,
    },
    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    heroIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: colors.brand || '#4F46E5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCopy: { flex: 1 },
    heroEyebrow: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.3,
      color: colors.brandGlow || '#C7D2FE',
    },
    heroTitle: {
      marginTop: 4,
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '900',
      color: colors.onBrand || '#FFFFFF',
    },
    heroSubtitle: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 17,
      color: colors.brandGlow || '#C7D2FE',
    },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 10,
    },
    sectionEyebrow: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      color: colors.textTertiary || '#94A3B8',
    },
    sectionTitle: {
      marginTop: 3,
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary || '#0F172A',
    },
    adminPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.greenLight || '#ECFDF5',
      borderWidth: 1,
      borderColor: colors.success || '#10B981',
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.success || '#10B981',
    },
    adminPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.success || '#10B981',
    },
    restricted: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 60,
    },
    adminWorkspace: {
      gap: 16,
    },
    adminWorkspaceWide: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    sidebarNav: {
      width: 248,
      gap: 18,
      padding: 12,
      borderRadius: 18,
      backgroundColor: colors.card || '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
    },
    mobileNav: {
      marginBottom: 2,
    },
    mobileNavContent: {
      gap: 12,
      paddingBottom: 4,
    },
    navSection: {
      gap: 7,
    },
    navSectionLabel: {
      paddingHorizontal: 4,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.textTertiary || '#94A3B8',
    },
    navItems: {
      flexDirection: 'row',
      gap: 7,
    },
    navItemsWide: {
      gap: 6,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary || '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
    },
    navItemWide: {
      width: '100%',
    },
    navItemActive: {
      backgroundColor: colors.brand || '#4F46E5',
      borderColor: colors.brand || '#4F46E5',
    },
    navItemText: {
      maxWidth: 132,
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary || '#64748B',
    },
    navItemTextActive: {
      color: colors.onBrand || '#FFFFFF',
    },
    adminContent: {
      flex: 1,
      minWidth: 0,
      gap: 14,
    },
    contentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.card || '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
    },
    restrictedTitle: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary || '#111827',
    },
    restrictedText: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textSecondary || '#6B7280',
      textAlign: 'center',
      lineHeight: 20,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary || '#F8FAFC',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      marginBottom: 20,
    },
    tabBarContent: {
      gap: 6,
      padding: 5,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    tabActive: {
      backgroundColor: colors.brand || '#4F46E5',
      shadowColor: colors.shadow || '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    tabPressed: {
      opacity: 0.78,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary || '#6B7280',
    },
    tabTextActive: {
      color: colors.onBrand || '#FFFFFF',
    },
    contentHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 2,
    },
    contentTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary || '#0F172A',
    },
    contentSubtitle: {
      marginTop: 3,
      fontSize: 12,
      color: colors.textSecondary || '#64748B',
    },
    countBadge: {
      minWidth: 34,
      height: 34,
      paddingHorizontal: 8,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brandLight || '#EEF2FF',
      borderWidth: 1,
      borderColor: colors.brandBorder || '#E0E7FF',
    },
    countBadgeText: {
      fontSize: 13,
      fontWeight: '900',
      color: colors.brandText || colors.brand || '#4338CA',
    },
    loadingContainer: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    listingToggleWrap: {
      gap: 12,
      marginBottom: 12,
    },
    listingToggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary || '#F8FAFC',
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      padding: 4,
      gap: 6,
    },
    listingToggle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    listingToggleActive: {
      backgroundColor: colors.brand || '#4F46E5',
    },
    listingToggleText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary || '#6B7280',
    },
    listingToggleTextActive: {
      color: colors.brandText || '#FFFFFF',
    },
    emptyContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      gap: 12,
    },
    emptyText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textSecondary || '#6B7280',
    },
    listContent: {
      gap: 10,
      paddingBottom: 40,
    },
    listingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card || '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      padding: 13,
      shadowColor: colors.shadow || '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    listingLeft: {
      marginRight: 12,
    },
    listingThumb: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.brandLight || '#EEF2FF',
    },
    listingThumbFallback: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.brandLight || '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    listingBody: {
      flex: 1,
    },
    listingTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary || '#111827',
    },
    listingPrice: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: '700',
      color: colors.success || '#10B981',
    },
    listingOwner: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary || '#6B7280',
    },
    sponsoredMiniBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 5,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.warningLight || '#FEF3C7',
    },
    sponsoredMiniText: {
      color: colors.warning || '#B45309',
      fontSize: 10,
      fontWeight: '900',
    },
    listingActions: {
      flexDirection: 'row',
      gap: 6,
      marginLeft: 8,
    },
    viewButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.brandLight || '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    promoteButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.warningLight || '#FEF3C7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.dangerLight || '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notificationPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 60,
      gap: 12,
    },
    notificationTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary || '#111827',
    },
    notificationText: {
      fontSize: 14,
      color: colors.textSecondary || '#6B7280',
      textAlign: 'center',
      lineHeight: 20,
    },
    notificationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.brand || '#4F46E5',
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    notificationButtonText: {
      color: colors.onBrand || '#FFFFFF',
      fontWeight: '800',
      fontSize: 14,
    },
    supportQueueRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
    },
    supportQueuePill: {
      minWidth: 78,
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary || '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
    },
    supportQueueValue: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.textPrimary || '#0F172A',
    },
    supportQueueLabel: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary || '#64748B',
    },
  });

const createDashboardStyles = (colors) =>
  StyleSheet.create({
    container: { gap: 14 },
    dashboardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
      color: colors.textTertiary || '#94A3B8',
    },
    title: {
      marginTop: 3,
      fontSize: 18,
      fontWeight: '900',
      color: colors.textPrimary || '#0F172A',
    },
    subtitle: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary || '#64748B',
    },
    refresh: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brandLight || '#EEF2FF',
      borderWidth: 1,
      borderColor: colors.brandBorder || '#E0E7FF',
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.dangerLight || '#FEF2F2',
      borderWidth: 1,
      borderColor: colors.danger || '#DC2626',
    },
    noticeText: { flex: 1, color: colors.textPrimary || '#111827', fontSize: 12, fontWeight: '700' },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: 145,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.card || '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
    },
    pressed: { opacity: 0.78 },
    metricTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    metricIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brandLight || '#EEF2FF',
    },
    metricValue: {
      marginTop: 12,
      fontSize: 25,
      fontWeight: '900',
      color: colors.textPrimary || '#0F172A',
    },
    metricLabel: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '900',
      color: colors.textPrimary || '#0F172A',
    },
    metricDetail: {
      marginTop: 3,
      fontSize: 11,
      color: colors.textSecondary || '#64748B',
    },
    panel: {
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.card || '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      gap: 10,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    panelTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.textPrimary || '#0F172A',
    },
    linkText: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.brand || '#4F46E5',
    },
    queueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 9,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle || colors.borderDefault || '#E5E7EB',
    },
    queueLabel: {
      color: colors.textSecondary || '#64748B',
      fontSize: 13,
      fontWeight: '700',
    },
    queueValue: {
      color: colors.textPrimary || '#0F172A',
      fontSize: 14,
      fontWeight: '900',
    },
    operationGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    operationItem: {
      flexGrow: 1,
      flexBasis: '47%',
      minWidth: 140,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      padding: 11,
      borderRadius: 13,
      backgroundColor: colors.surfaceSecondary || '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
    },
    operationCopy: { flex: 1 },
    operationLabel: {
      color: colors.textSecondary || '#64748B',
      fontSize: 11,
      fontWeight: '800',
    },
    operationValue: {
      marginTop: 2,
      color: colors.textPrimary || '#0F172A',
      fontSize: 14,
      fontWeight: '900',
    },
  });

const createAccessStyles = (colors) =>
  StyleSheet.create({
    container: { gap: 12 },
    card: {
      flexDirection: 'row',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.card || '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
    },
    copy: { flex: 1 },
    title: { fontSize: 16, fontWeight: '900', color: colors.textPrimary || '#0F172A' },
    text: { marginTop: 4, fontSize: 13, lineHeight: 19, color: colors.textSecondary || '#64748B' },
    detailCard: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary || '#F8FAFC',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      gap: 6,
    },
    label: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: colors.textTertiary || '#94A3B8',
    },
    value: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary || '#0F172A',
    },
  });

const createAnnouncementStyles = (colors) =>
  StyleSheet.create({
    container: { gap: 16 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.brandLight || '#EEF2FF',
      borderRadius: 16,
      padding: 16,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.card || '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBody: { flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary || '#111827' },
    headerSubtitle: { fontSize: 12, color: colors.textSecondary || '#6B7280', marginTop: 2 },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#ECFDF5',
      borderWidth: 1,
      borderColor: '#A7F3D0',
      borderRadius: 12,
      padding: 14,
    },
    successText: { fontSize: 13, fontWeight: '700', color: colors.success || '#10B981', flex: 1 },
    fieldGroup: { gap: 6 },
    label: { fontSize: 13, fontWeight: '700', color: colors.textPrimary || '#111827' },
    input: {
      backgroundColor: colors.card || '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.textPrimary || '#111827',
    },
    textArea: { minHeight: 120, paddingTop: 12 },
    charCount: { fontSize: 11, color: colors.textSecondary || '#6B7280', textAlign: 'right' },
    priorityRow: { flexDirection: 'row', gap: 8 },
    priorityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      backgroundColor: colors.card || '#FFFFFF',
    },
    priorityChipPressed: { opacity: 0.8 },
    priorityText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary || '#6B7280' },
    priorityTextActive: { color: '#FFF' },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionChip: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      backgroundColor: colors.card || '#FFFFFF',
    },
    optionChipActive: { backgroundColor: colors.brand || '#4F46E5', borderColor: colors.brand || '#4F46E5' },
    badgeChipActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
    optionText: { color: colors.textSecondary || '#6B7280', fontSize: 11, fontWeight: '800' },
    optionTextActive: { color: '#FFFFFF' },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.brand || '#4F46E5',
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 8,
    },
    submitButtonPressed: { opacity: 0.8 },
    submitButtonDisabled: { opacity: 0.5 },
    submitText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  });

const createUserStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1 },
    feedbackCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.success || '#10B981', backgroundColor: colors.greenLight || '#ECFDF5' },
    feedbackError: { borderColor: colors.danger || '#DC2626', backgroundColor: colors.dangerLight || '#FEF2F2' },
    feedbackCopy: { flex: 1 },
    feedbackTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
    feedbackText: { marginTop: 2, color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
    confirmCard: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: 13, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.gold || '#B45309', backgroundColor: colors.goldLight || '#FEF3C7' },
    confirmIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    confirmActions: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
    cancelButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.card },
    cancelText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
    confirmButton: { minWidth: 104, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.brand },
    confirmText: { color: colors.onBrand, fontSize: 11, fontWeight: '900' },
    usersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
    sectionEyebrow: { color: colors.textTertiary || colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    sectionTitle: { marginTop: 3, color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
    sectionSubtitle: { marginTop: 3, color: colors.textSecondary, fontSize: 12 },
    totalBadge: { minWidth: 52, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', borderRadius: 14, backgroundColor: colors.brandLight || '#EEF2FF', borderWidth: 1, borderColor: colors.brandBorder || colors.borderDefault },
    totalValue: { color: colors.brandText || colors.brand, fontSize: 17, fontWeight: '900' },
    totalLabel: { marginTop: 1, color: colors.brandText || colors.brand, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    statCard: { flex: 1, padding: 11, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault },
    statValue: { color: colors.success || '#10B981', fontSize: 18, fontWeight: '900' },
    dangerValue: { color: colors.danger || '#DC2626' },
    brandValue: { color: colors.brandText || colors.brand },
    promoValue: { color: colors.gold || '#B45309' },
    statLabel: { marginTop: 2, color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card || '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceSecondary || colors.card, borderWidth: 1, borderColor: colors.borderDefault },
    filterChipActive: { backgroundColor: colors.brandLight || '#EEF2FF', borderColor: colors.brandBorder || colors.brand },
    filterText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
    filterTextActive: { color: colors.brandText || colors.brand },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary || '#111827',
      paddingVertical: 0,
    },
    loadingWrap: { gap: 12, paddingVertical: 20 },
    skeleton: { height: 72, borderRadius: 14, backgroundColor: colors.borderDefault || '#E5E7EB' },
    listPadding: { gap: 8, paddingBottom: 40 },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.card || '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      padding: 12,
    },
    cardPressed: { opacity: 0.9 },
    cardActions: { alignItems: 'flex-end', gap: 7, marginLeft: 6, flexShrink: 0, maxWidth: 118 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.brandLight || '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: 44, height: 44 },
    avatarText: { fontWeight: '800', fontSize: 16, color: colors.brandText || colors.brand || '#4338CA' },
    body: { flex: 1 },
    name: { fontSize: 14, fontWeight: '800', color: colors.textPrimary || '#111827' },
    email: { fontSize: 11, color: colors.textSecondary || '#6B7280', marginTop: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.brandLight || '#EEF2FF',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    metaChipText: { fontSize: 10, fontWeight: '700', color: colors.brand || '#4338CA' },
    school: { fontSize: 10, color: colors.textSecondary || '#6B7280', flex: 1 },
    blockedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    referralBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
      backgroundColor: colors.brandLight || '#EEF2FF',
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    referralBadgeText: { fontSize: 10, color: colors.brandText || colors.brand || '#4338CA', fontWeight: '700' },
    blockedBadgeText: { fontSize: 10, color: colors.danger || '#DC2626', fontWeight: '700' },
    premiumInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 5,
      maxWidth: '100%',
    },
    premiumInfoText: { flex: 1, fontSize: 10, color: colors.gold || '#B45309', fontWeight: '800' },
    adminBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.brandLight || '#EEF2FF',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#C7D2FE',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    adminBadgeText: { fontSize: 10, fontWeight: '800', color: colors.brandText || colors.brand || '#4338CA' },
    premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.goldLight || '#FEF3C7', borderWidth: 1, borderColor: colors.gold || '#B45309' },
    premiumBadgeText: { fontSize: 10, fontWeight: '900', color: colors.gold || '#B45309' },
    premiumButton: { minWidth: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.goldLight || '#FEF3C7', borderWidth: 1, borderColor: colors.gold || '#B45309' },
    premiumButtonText: { color: colors.gold || '#B45309', fontSize: 10, fontWeight: '900', textAlign: 'center' },
    syncButton: { minWidth: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.brandLight || '#EEF2FF', borderWidth: 1, borderColor: colors.brandBorder || colors.brand || '#4338CA' },
    syncButtonText: { color: colors.brandText || colors.brand || '#4338CA', fontSize: 10, fontWeight: '900', textAlign: 'center' },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    blockButton: { backgroundColor: colors.danger || '#DC2626' },
    unblockButton: { backgroundColor: colors.success || '#10B981' },
    actionPressed: { opacity: 0.8 },
    actionButtonText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 14, color: colors.textSecondary || '#6B7280', fontWeight: '600' },
  });
