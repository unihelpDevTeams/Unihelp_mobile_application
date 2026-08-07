import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';
import { blockUser, createAnnouncement, unblockUser } from '../../services/firestoreSync';
import ChallengeQuestionForm from '../../src/admin/ChallengeQuestionForm';
import UniversityManager from '../../src/admin/UniversityManager';


const COLORS = {
  indigo: '#6366F1',
  indigoDark: '#4338CA',
  indigoSoft: '#EEF2FF',
  white: '#FFFFFF',
  ink: '#0F172A',
  inkSoft: '#64748B',
  border: '#E2E8F0',
  success: '#059669',
  error: '#DC2626',
  errorSoft: '#FEF2F2',
  amber: '#D97706',
  amberSoft: '#FEF3E1',
};

const TABS = [
  { key: 'users', label: 'Users', icon: 'people-outline' },
  { key: 'marketplace', label: 'Marketplace', icon: 'pricetag-outline' },
  { key: 'hostels', label: 'Hostels', icon: 'home-outline' },
  { key: 'support', label: 'Support Center', icon: 'headset-outline' },
  { key: 'challenge', label: 'Challenge Qs', icon: 'flash-outline' },
  { key: 'universities', label: 'Universities', icon: 'school-outline' },
  { key: 'notifications', label: 'Send Notification', icon: 'notifications-outline' },
];

const ADMIN_COLLECTION_MAP = {
  marketplace: { collection: COLLECTIONS.studentMarketplace, label: 'Student Marketplace' },
  hostels: { collection: COLLECTIONS.hostels, label: 'Hostels' },
};

export default function AdminPanelPage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState('marketplace');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin = profile?.admin === true || user?.email === 'iadejuwon77@gmail.com';

  const fetchItems = useCallback(async () => {
    const config = ADMIN_COLLECTION_MAP[activeTab];
    if (!config) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, config.collection), orderBy('createdAt', 'desc'), limit(50))
      );
      setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.warn('Admin fetch error:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchItems();
  }, [isAdmin, fetchItems]);

  const handleDelete = (item) => {
    const config = ADMIN_COLLECTION_MAP[activeTab];
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
              // Route through the backend so the Cloudinary assets are deleted too.
              const { deleteMediaDocument } = await import('../../services/mediaCleanup');
              await deleteMediaDocument(config.collection, item.id);
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

  // Non-admin users see a restricted message
  if (!isAdmin) {
    return (
      <ScreenShell title="Admin Panel" subtitle="Admin-only operations." showBack>
        <View style={styles.restricted}>
          <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.inkSoft} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedText}>
            You need admin privileges to access this panel. Contact the app administrator if you believe this is an error.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Admin Panel" subtitle={`Welcome, ${profile?.username || 'Admin'}`} showBack loading={loading && activeTab !== 'notifications'}>
      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? COLORS.indigoDark : COLORS.inkSoft}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Users tab */}
      {activeTab === 'users' ? (
        <UsersList />
      ) : activeTab === 'support' ? (
        <View style={styles.notificationPlaceholder}>
          <Ionicons name="headset-outline" size={48} color={COLORS.indigo} />
          <Text style={styles.notificationTitle}>Support Center</Text>
          <Text style={styles.notificationText}>
            Manage contact messages, reports, and suggestions from users.
          </Text>
          <Pressable
            style={styles.notificationButton}
            onPress={() => router.push('/adminpanel/support-center')}
          >
            <Ionicons name="arrow-forward-outline" size={18} color={COLORS.white} />
            <Text style={styles.notificationButtonText}>Open Support Center</Text>
          </Pressable>
        </View>
      ) : activeTab === 'challenge' ? (
        <ChallengeQuestionForm />
      ) : activeTab === 'universities' ? (
        <UniversityManager />
      ) : activeTab !== 'notifications' ? (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.indigo} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={40} color={COLORS.inkSoft} />
            <Text style={styles.emptyText}>No listings found</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.listingCard}>
                <View style={styles.listingLeft}>
                  {getImageUrl(item) ? (
                    <Image
                      source={{ uri: getImageUrl(item) }}
                      style={styles.listingThumb}
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                  ) : (
                    <View style={styles.listingThumbFallback}>
                      <Ionicons name="image-outline" size={20} color={COLORS.inkSoft} />
                    </View>
                  )}
                </View>
                <View style={styles.listingBody}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {item.title || item.name || 'Untitled'}
                  </Text>
                  {item.price != null && (
                    <Text style={styles.listingPrice}>{formatNaira(item.price)}</Text>
                  )}
                  <Text style={styles.listingOwner} numberOfLines={1}>
                    {item.sellerName || item.ownerName || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.listingActions}>
                  <Pressable
                    style={styles.viewButton}
                    onPress={() =>
                      router.push({
                        pathname: '/view/[type]/[id]',
                        params: {
                          type: activeTab === 'marketplace' ? 'listing' : 'hostel',
                          id: item.id,
                        },
                      })
                    }
                  >
                    <Ionicons name="eye-outline" size={18} color={COLORS.indigo} />
                  </Pressable>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color={COLORS.error} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          />
        )
      ) : (
        /* Create Announcement Form */
        <CreateAnnouncementForm />
      )}
    </ScreenShell>
  );
}

function CreateAnnouncementForm() {
  const { profile } = useAuth();
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
    { key: 'normal', label: 'Normal', color: '#6366F1' },
    { key: 'high', label: 'High', color: '#DC2626' },
    { key: 'urgent', label: 'Urgent', color: '#991B1B' },
  ];

  return (
    <View style={annStyles.container}>
      <View style={annStyles.header}>
        <View style={annStyles.headerIcon}>
          <Ionicons name="megaphone" size={22} color={COLORS.indigo} />
        </View>
        <View style={annStyles.headerBody}>
          <Text style={annStyles.headerTitle}>Create Announcement</Text>
          <Text style={annStyles.headerSubtitle}>Broadcast a message to all users</Text>
        </View>
      </View>

      {success ? (
        <View style={annStyles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
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
          placeholderTextColor={COLORS.inkSoft}
        />
      </View>

      <View style={annStyles.fieldGroup}>
        <Text style={annStyles.label}>Body *</Text>
        <TextInput
          style={[annStyles.input, annStyles.textArea]}
          value={body}
          onChangeText={setBody}
          placeholder="Write the announcement details..."
          placeholderTextColor={COLORS.inkSoft}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={annStyles.charCount}>{body.length} characters</Text>
      </View>

      <View style={annStyles.fieldGroup}>
        <Text style={annStyles.label}>Priority</Text>
        <View style={annStyles.priorityRow}>
          {priorities.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setPriority(p.key)}
              style={({ pressed }) => [
                annStyles.priorityChip,
                priority === p.key && { backgroundColor: p.color, borderColor: p.color },
                pressed && annStyles.priorityChipPressed,
              ]}
            >
              {priority === p.key ? (
                <Ionicons name="checkmark" size={14} color="#FFF" />
              ) : null}
              <Text
                style={[
                  annStyles.priorityText,
                  priority === p.key && annStyles.priorityTextActive,
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
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

function UsersList() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.users));
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(all.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        }));
      } catch {}
      setLoading(false);
    };
    load();
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
      Alert.alert(
        'Unblock User',
        `Allow ${userItem.username || userItem.email} to access the app again?`,
        [
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
        ]
      );
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
    <View>
      <View style={userStyles.searchWrap}>
        <Ionicons name="search" size={16} color={COLORS.inkSoft} />
        <TextInput
          style={userStyles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, school..."
          placeholderTextColor={COLORS.inkSoft}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={userStyles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.indigo} />
          {[1,2,3].map(i => <View key={i} style={userStyles.skeleton} />)}
        </View>
      ) : filteredUsers.length > 0 ? (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [userStyles.card, pressed && { opacity: 0.9 }]}
              onPress={() => router.push(`/view-user-profile/${item.uid || item.id}`)}
            >
              <View style={userStyles.avatar}>
                {item.photo ? (
                  <Image source={{ uri: item.photo }} style={userStyles.avatarImage} />
                ) : (
                  <Text style={userStyles.avatarText}>{getUserInitials(item)}</Text>
                )}
              </View>
              <View style={userStyles.body}>
                <Text style={userStyles.name} numberOfLines={1}>{item.username || 'Student'}</Text>
                <Text style={userStyles.email} numberOfLines={1}>{item.email || 'No email'}</Text>
                <View style={userStyles.metaRow}>
                  {item.role ? (
                    <View style={userStyles.metaChip}>
                      <Ionicons name="school" size={10} color={COLORS.indigo} />
                      <Text style={userStyles.metaChipText}>{item.role}</Text>
                    </View>
                  ) : null}
                  {item.school ? (
                    <Text style={userStyles.school} numberOfLines={1}>{item.school}</Text>
                  ) : null}
                </View>
                {item.blocked && (
                  <View style={userStyles.blockedBadge}>
                    <Ionicons name="ban-outline" size={10} color={COLORS.error} />
                    <Text style={userStyles.blockedBadgeText}>Blocked</Text>
                  </View>
                )}
              </View>
              {item.admin ? (
                <View style={userStyles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#4338CA" />
                  <Text style={userStyles.adminBadgeText}>Admin</Text>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    userStyles.actionButton,
                    item.blocked ? userStyles.unblockButton : userStyles.blockButton,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleBlockToggle(item);
                  }}
                >
                  <Ionicons name={item.blocked ? 'checkmark-circle' : 'ban-outline'} size={14} color="#FFF" />
                  <Text style={userStyles.actionButtonText}>
                    {item.blocked ? 'Unblock' : 'Block'}
                  </Text>
                </Pressable>
              )}
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={userStyles.emptyWrap}>
          <Ionicons name="people-outline" size={36} color={COLORS.inkSoft} />
          <Text style={userStyles.emptyText}>{search ? 'No users match your search' : 'No users found'}</Text>
        </View>
      )}
    </View>
  );
}

const userStyles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    paddingVertical: 0,
  },
  loadingWrap: { gap: 12, paddingVertical: 20 },
  skeleton: { height: 72, borderRadius: 14, backgroundColor: COLORS.border },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 44, height: 44 },
  avatarText: { fontWeight: '800', fontSize: 16, color: COLORS.indigoDark },
  body: { flex: 1 },
  name: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  email: { fontSize: 11, color: COLORS.inkSoft, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.indigoSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaChipText: { fontSize: 10, fontWeight: '700', color: COLORS.indigo },
  school: { fontSize: 10, color: COLORS.inkSoft, flex: 1 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminBadgeText: { fontSize: 10, fontWeight: '800', color: '#4338CA' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.inkSoft, fontWeight: '600' },
});

const annStyles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.indigoSoft,
    borderRadius: 16,
    padding: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.inkSoft,
    marginTop: 2,
  },
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
  successText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
    flex: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.ink,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.inkSoft,
    textAlign: 'right',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  priorityChipPressed: {
    opacity: 0.8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.inkSoft,
  },
  priorityTextActive: {
    color: '#FFF',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.indigo,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  submitButtonPressed: {
    backgroundColor: COLORS.indigoDark,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});

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
    color: COLORS.ink,
  },
  restrictedText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: COLORS.indigoSoft,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.inkSoft,
  },
  tabTextActive: {
    color: COLORS.indigoDark,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.inkSoft,
  },
  listContent: {
    gap: 10,
    paddingBottom: 40,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  listingLeft: {
    marginRight: 12,
  },
  listingThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.indigoSoft,
  },
  listingThumbFallback: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingBody: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  listingPrice: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
  },
  listingOwner: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.inkSoft,
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
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.errorSoft,
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
    color: COLORS.ink,
  },
  notificationText: {
    fontSize: 14,
    color: COLORS.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.indigo,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  notificationButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
