import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { PageLoader } from '../../src/shared/components/AILoaders';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';
import { getJson, deleteJson } from '../../src/shared/services/backend';
import { blockUser, createAnnouncement, unblockUser } from '../../services/firestoreSync';
import PromoSpotlightManager from '../../src/admin/PromoSpotlightManager';
import { useTheme } from '../../src/shared/theme/ThemeContext';

const TABS = [
  { key: 'users', label: 'Users', icon: 'people-outline' },
  { key: 'listings', label: 'Listings', icon: 'storefront-outline' },
  { key: 'support', label: 'Support Center', icon: 'headset-outline' },
  { key: 'notifications', label: 'Send Notification', icon: 'notifications-outline' },
  { key: 'promoSpotlights', label: 'Promo Spotlights', icon: 'sparkles-outline' },
  { key: 'migration', label: 'Migration Tracker', icon: 'server-outline' },
];

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
  const pageStyles = useMemo(() => createPageStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState('listings');
  const [listingType, setListingType] = useState('marketplace');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = profile?.admin === true || user?.email === 'iadejuwon77@gmail.com';

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

  return (
    <ScreenShell title="Admin Panel" subtitle={`Welcome, ${profile?.username || 'Admin'}`} showBack loading={loading && activeTab !== 'notifications'}>
      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pageStyles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[pageStyles.tab, isActive && pageStyles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? colors.brandText || colors.brand : colors.textSecondary}
              />
              <Text style={[pageStyles.tabText, isActive && pageStyles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Main Content Areas */}
      {activeTab === 'users' ? (
        <UsersList colors={colors} />
      ) : activeTab === 'support' ? (
        <View style={pageStyles.notificationPlaceholder}>
          <Ionicons name="headset-outline" size={48} color={colors.brand} />
          <Text style={pageStyles.notificationTitle}>Support Center</Text>
          <Text style={pageStyles.notificationText}>
            Manage contact messages, reports, and suggestions from users.
          </Text>
          <Pressable
            style={pageStyles.notificationButton}
            onPress={() => router.navigate('/adminpanel/support-center')}
          >
            <Ionicons name="arrow-forward-outline" size={18} color={colors.onBrand || '#FFF'} />
            <Text style={pageStyles.notificationButtonText}>Open Support Center</Text>
          </Pressable>
        </View>
      ) : activeTab === 'migration' ? (
        <View style={pageStyles.notificationPlaceholder}>
          <Ionicons name="server-outline" size={48} color={colors.brand} />
          <Text style={pageStyles.notificationTitle}>Postgres Migration Tracker</Text>
          <Text style={pageStyles.notificationText}>
            Track the status of the backend migration from Firebase to PostgreSQL.
          </Text>
          <Pressable
            style={pageStyles.notificationButton}
            onPress={() => router.navigate('/adminpanel/migration-checklist')}
          >
            <Ionicons name="arrow-forward-outline" size={18} color={colors.onBrand || '#FFF'} />
            <Text style={pageStyles.notificationButtonText}>Open Migration Checklist</Text>
          </Pressable>
        </View>
      ) : activeTab === 'promoSpotlights' ? (
        <PromoSpotlightManager />
      ) : activeTab === 'listings' ? (
        <View style={pageStyles.listingToggleWrap}>
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
      ) : (
        <CreateAnnouncementForm colors={colors} />
      )}
    </ScreenShell>
  );
}

function CreateAnnouncementForm({ colors }) {
  const { profile } = useAuth();
  const annStyles = useMemo(() => createAnnouncementStyles(colors), [colors]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Announcement title is required.');
      return;
    }
    if (!body.trim()) {
      Alert.alert('Validation', 'Announcement body is required.');
      return;
    }
    setSaving(true);
    setSuccess('');
    try {
      await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        description: body.trim(),
        priority,
        authorName: profile?.username || 'Admin',
      });
      setTitle('');
      setBody('');
      setPriority('normal');
      setSuccess('Announcement created and published successfully!');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create announcement.');
    } finally {
      setSaving(false);
    }
  };

  const priorities = [
    { key: 'normal', label: 'Normal', color: colors.brand || '#6366F1' },
    { key: 'high', label: 'High', color: '#DC2626' },
    { key: 'urgent', label: 'Urgent', color: '#991B1B' },
  ];

  return (
    <View style={annStyles.container}>
      <View style={annStyles.header}>
        <View style={annStyles.headerIcon}>
          <Ionicons name="megaphone" size={22} color={colors.brand} />
        </View>
        <View style={annStyles.headerBody}>
          <Text style={annStyles.headerTitle}>Create Announcement</Text>
          <Text style={annStyles.headerSubtitle}>Broadcast a message to all users</Text>
        </View>
      </View>

      {success ? (
        <View style={annStyles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success || '#10B981'} />
          <Text style={annStyles.successText}>{success}</Text>
        </View>
      ) : null}

      <View style={annStyles.fieldGroup}>
        <Text style={annStyles.label}>Title *</Text>
        <TextInput
          style={annStyles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. New Study Materials Available"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={annStyles.fieldGroup}>
        <Text style={annStyles.label}>Body *</Text>
        <TextInput
          style={[annStyles.input, annStyles.textArea]}
          value={body}
          onChangeText={setBody}
          placeholder="Write the announcement details..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={annStyles.charCount}>{body.length} characters</Text>
      </View>

      <View style={annStyles.fieldGroup}>
        <Text style={annStyles.label}>Priority</Text>
        <View style={annStyles.priorityRow}>
          {priorities.map((p) => {
            const isSelected = priority === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => setPriority(p.key)}
                style={({ pressed }) => [
                  annStyles.priorityChip,
                  isSelected && { backgroundColor: p.color, borderColor: p.color },
                  pressed && annStyles.priorityChipPressed,
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                <Text style={[annStyles.priorityText, isSelected && annStyles.priorityTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          annStyles.submitButton,
          (saving || !title.trim() || !body.trim()) && annStyles.submitButtonDisabled,
          pressed && annStyles.submitButtonPressed,
        ]}
        onPress={handleSubmit}
        disabled={saving || !title.trim() || !body.trim()}
      >
        {saving ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Ionicons name="paper-plane" size={16} color="#FFF" />
            <Text style={annStyles.submitText}>Publish Announcement</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function UsersList({ colors }) {
  const router = useRouter();
  const userStyles = useMemo(() => createUserStyles(colors), [colors]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    if (!search.trim()) return users;
    const term = search.toLowerCase();
    return users.filter((u) =>
      [u.username, u.email, u.school, u.department].filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [users, search]);

  const getUserInitials = (u) => {
    const name = u.username || u.email || 'S';
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'S';
  };

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

  return (
    <View style={userStyles.container}>
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
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [userStyles.card, pressed && userStyles.cardPressed]}
              onPress={() => router.navigate(`/view-user-profile/${item.uid || item.id}`)}
            >
              <View style={userStyles.avatar}>
                {item.photo ? (
                  <Image source={{ uri: item.photo }} style={userStyles.avatarImage} />
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
                {item.blocked && (
                  <View style={userStyles.blockedBadge}>
                    <Ionicons name="ban-outline" size={10} color={colors.danger || '#DC2626'} />
                    <Text style={userStyles.blockedBadgeText}>Blocked</Text>
                  </View>
                )}
              </View>
              {item.admin ? (
                <View style={userStyles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.brand} />
                  <Text style={userStyles.adminBadgeText}>Admin</Text>
                </View>
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
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={userStyles.emptyWrap}>
          <Ionicons name="people-outline" size={36} color={colors.textSecondary} />
          <Text style={userStyles.emptyText}>{search ? 'No users match your search' : 'No users found'}</Text>
        </View>
      )}
    </View>
  );
}

const createPageStyles = (colors) =>
  StyleSheet.create({
    restricted: {
      flex: 1,
      alignItems: 'center',
      justify: 'center',
      paddingHorizontal: 32,
      paddingVertical: 60,
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
      backgroundColor: colors.card || '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      marginBottom: 14,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    tabActive: {
      backgroundColor: colors.brandLight || '#EEF2FF',
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary || '#6B7280',
    },
    tabTextActive: {
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
      backgroundColor: colors.card || '#FFFFFF',
      borderRadius: 14,
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
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      padding: 12,
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
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card || '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
      padding: 12,
    },
    cardPressed: { opacity: 0.9 },
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
    blockedBadgeText: { fontSize: 10, color: colors.danger || '#DC2626', fontWeight: '700' },
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
