import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import PastQuestionReviewManager from '../../src/admin/PastQuestionReviewManager';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import {
  ADMIN_PREMIUM_GIFT_DAYS,
  getDaysLeft,
  getPremiumExpiry,
  getSubscriptionExpiry,
  isPremiumActive,
} from '../../src/shared/services/premium';

/* ============================================================================
 * Constants & navigation model
 * ----------------------------------------------------------------------------
 * NOTE: the email allowlist below is a client-side convenience gate only.
 * Every admin endpoint MUST also verify admin rights on the server.
 * ========================================================================== */
const ADMIN_EMAILS = ['iadejuwon77@gmail.com', 'onakomayaokiki@gmail.com'];
const USERS_PAGE_SIZE = 25;
const TOAST_MS = 4500;

const ADMIN_NAV_SECTIONS = [
  {
    label: 'Main',
    items: [{ key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', description: 'A live snapshot of users, content and open support items.' }],
  },
  {
    label: 'People',
    items: [
      { key: 'users', label: 'Users', icon: 'people-outline', description: 'Review accounts, gift Premium and control access.' },
      { key: 'premium', label: 'Premium', icon: 'star-outline', description: 'Review entitlements and fix missing expiry dates.' },
    ],
  },
  {
    label: 'Content',
    items: [
      { key: 'pastQuestions', label: 'Past Questions', icon: 'clipboard-outline', description: 'Review uploaded past questions before they go live.' },
      { key: 'mediaSources', label: 'Media Sources', icon: 'megaphone-outline', description: 'Manage where new students say they heard about UniHelp.' },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { key: 'listings', label: 'Listings', icon: 'storefront-outline', description: 'Search, inspect and remove marketplace and hostel listings.' },
      { key: 'sponsorships', label: 'Sponsorships', icon: 'ribbon-outline', description: 'Paid listing promotions and their payment status.' },
    ],
  },
  {
    label: 'Support',
    items: [{ key: 'support', label: 'Support Center', icon: 'headset-outline', description: 'Contact messages, reports and product suggestions.' }],
  },
  {
    label: 'Growth',
    items: [
      { key: 'promoSpotlights', label: 'Promo Spotlights', icon: 'flash-outline', description: 'Control the promotions students see in the app.' },
      { key: 'streakRewards', label: 'Streak Rewards', icon: 'gift-outline', description: 'Set the milestones and rewards that keep students coming back.' },
      { key: 'stickers', label: 'Stickers', icon: 'happy-outline', description: 'Manage sticker packs and individual stickers.' },
    ],
  },
  {
    label: 'Finance',
    items: [{ key: 'revenue', label: 'Revenue', icon: 'cash-outline', description: 'Verified payments, fees and distributable profit.' }],
  },
  {
    label: 'System',
    items: [{ key: 'access', label: 'Access', icon: 'shield-checkmark-outline', description: 'How admin access is granted for this account.' }],
  },
];

const ADMIN_NAV_ITEMS = ADMIN_NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.label }))
);

const ADMIN_COLLECTION_MAP = {
  marketplace: { endpoint: '/api/marketplace', label: 'Student Marketplace' },
  hostels: { endpoint: '/api/hostels', label: 'Hostels' },
};

const LISTING_TYPES = [
  { key: 'marketplace', label: 'Marketplace', icon: 'pricetag-outline' },
  { key: 'hostels', label: 'Hostels', icon: 'home-outline' },
];

/* ============================================================================
 * Helpers
 * ========================================================================== */
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value, fallback = 'Not set') => {
  const date = toDate(value);
  return date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : fallback;
};

const formatNaira = (value, decimals = false) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return `₦${num.toLocaleString(undefined, decimals ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : undefined)}`;
};

const timeAgo = (date) => {
  if (!date) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
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
  [item.images, item.imageAssets, item.imageUrl, item.coverUrl, item.photoUrl, item.image].forEach(push);
  return candidates[0] || null;
};

// Normalised colour tokens so every stylesheet shares the same fallbacks.
const tokens = (colors = {}) => ({
  brand: colors.brand || '#4F46E5',
  brandLight: colors.brandLight || '#EEF2FF',
  brandText: colors.brandText || colors.brand || '#4338CA',
  brandBorder: colors.brandBorder || '#C7D2FE',
  onBrand: colors.onBrand || '#FFFFFF',
  card: colors.card || colors.surface || '#FFFFFF',
  surface2: colors.surfaceSecondary || '#F8FAFC',
  border: colors.borderDefault || '#E5E7EB',
  text: colors.textPrimary || '#0F172A',
  textSec: colors.textSecondary || '#64748B',
  textTer: colors.textTertiary || colors.textSecondary || '#94A3B8',
  success: colors.success || '#10B981',
  successLight: colors.successLight || colors.greenLight || '#ECFDF5',
  danger: colors.danger || '#DC2626',
  dangerLight: colors.dangerLight || '#FEF2F2',
  warning: colors.gold || colors.warning || '#B45309',
  warningLight: colors.goldLight || colors.warningLight || '#FEF3C7',
  input: colors.inputBackground || colors.card || '#FFFFFF',
  inputBorder: colors.inputBorder || colors.borderDefault || '#E5E7EB',
});

const useTokens = (colors) => useMemo(() => tokens(colors), [colors.background]);

const Chip = ({ label, active, onPress, styles, count }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
    style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>
      {label}
      {count != null ? `  ${count}` : ''}
    </Text>
  </Pressable>
);

const sharedStyles = (t) => ({
  pressed: { opacity: 0.75 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border },
  chipActive: { backgroundColor: t.brandLight, borderColor: t.brand },
  chipText: { color: t.textSec, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: t.brandText },
});

/* ============================================================================
 * Confirmation dialog (Alert.alert with buttons does not work on web, so every
 * destructive action goes through this modal instead)
 * ========================================================================== */
function ConfirmDialog({ config, onClose, colors }) {
  const t = useTokens(colors);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
        sheet: { width: '100%', maxWidth: 420, borderRadius: 20, padding: 20, backgroundColor: t.card, gap: 10, borderWidth: 1, borderColor: t.border },
        icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.brandLight },
        iconDanger: { backgroundColor: t.dangerLight },
        title: { fontSize: 17, fontWeight: '800', color: t.text },
        message: { fontSize: 14, lineHeight: 20, color: t.textSec },
        actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
        cancel: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.card },
        cancelText: { color: t.textSec, fontWeight: '700', fontSize: 13 },
        confirm: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, backgroundColor: t.brand },
        confirmDanger: { backgroundColor: t.danger },
        confirmText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
      }),
    [t]
  );
  if (!config) return null;
  const danger = config.tone === 'danger';
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={[styles.icon, danger && styles.iconDanger]}>
            <Ionicons name={config.icon || (danger ? 'warning-outline' : 'help-circle-outline')} size={22} color={danger ? t.danger : t.brand} />
          </View>
          <Text style={styles.title}>{config.title}</Text>
          {config.message ? <Text style={styles.message}>{config.message}</Text> : null}
          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirm, danger && styles.confirmDanger]}
              onPress={() => {
                const run = config.onConfirm;
                onClose();
                run?.();
              }}
            >
              <Text style={styles.confirmText}>{config.confirmLabel || 'Confirm'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ============================================================================
 * Toast (page-level, so feedback is visible no matter where the admin scrolled)
 * ========================================================================== */
function Toast({ toast, onClose, colors }) {
  const t = useTokens(colors);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { position: 'absolute', left: 12, right: 12, top: 8, alignItems: 'center', zIndex: 50 },
        card: { width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, backgroundColor: t.card, shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
        copy: { flex: 1 },
        title: { color: t.text, fontSize: 13, fontWeight: '800' },
        message: { marginTop: 2, color: t.textSec, fontSize: 12, lineHeight: 17 },
      }),
    [t]
  );
  if (!toast) return null;
  const tone = { success: [t.success, 'checkmark-circle'], error: [t.danger, 'alert-circle'], info: [t.brand, 'information-circle'] }[toast.type || 'info'];
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.card, { borderColor: tone[0] }]} accessibilityLiveRegion="polite">
        <Ionicons name={tone[1]} size={20} color={tone[0]} />
        <View style={styles.copy}>
          {toast.title ? <Text style={styles.title}>{toast.title}</Text> : null}
          {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Dismiss message" hitSlop={8}>
          <Ionicons name="close" size={18} color={t.textSec} />
        </Pressable>
      </View>
    </View>
  );
}

/* ============================================================================
 * Main page
 * ========================================================================== */
export default function AdminPanelPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const t = useTokens(colors);
  const pageStyles = useMemo(() => createPageStyles(t), [t]);

  const [activeTab, setActiveTab] = useState(() => {
    const requested = Array.isArray(params?.tab) ? params.tab[0] : params?.tab;
    return ADMIN_NAV_ITEMS.some((item) => item.key === requested) ? requested : 'dashboard';
  });
  const [listingType, setListingType] = useState('marketplace');
  const [items, setItems] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [sponsoringId, setSponsoringId] = useState(null);
  const [overview, setOverview] = useState({ loading: true, error: '', metrics: {}, queues: {} });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, forceTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const toastTimer = useRef(null);

  const userEmail = String(user?.email || '').trim().toLowerCase();
  const hasAdminFlag = profile?.admin === true;
  const isAllowlisted = ADMIN_EMAILS.includes(userEmail);
  const isAdmin = hasAdminFlag || isAllowlisted;
  const activeNav = ADMIN_NAV_ITEMS.find((item) => item.key === activeTab) || ADMIN_NAV_ITEMS[0];
  const isWide = width >= 900;

  const selectTab = useCallback(
    (key) => {
      setActiveTab(key);
      try {
        router.setParams?.({ tab: key });
      } catch (_) {
        /* deep-link param is a nicety; ignore failures */
      }
    },
    [router]
  );

  const notify = useCallback((next) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const askConfirm = useCallback((config) => setConfirm(config), []);

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  // Re-render every 30s so "Updated 2m ago" stays honest.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchItems = useCallback(async () => {
    const config = ADMIN_COLLECTION_MAP[listingType];
    if (!config) return;
    setListingsLoading(true);
    setListingsError('');
    try {
      if (config.endpoint) {
        const data = await getJson(`${config.endpoint}?limit=50`);
        setItems(data?.items || []);
      } else if (config.collection) {
        const snapshot = await getDocs(query(collection(db, config.collection), orderBy('createdAt', 'desc'), limit(50)));
        setItems(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.warn('Admin fetch error:', error);
      setItems([]);
      setListingsError(error?.message || 'Could not load listings.');
    } finally {
      setListingsLoading(false);
    }
  }, [listingType]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchItems();
  }, [isAdmin, fetchItems]);

  const loadOverview = useCallback(async () => {
    if (!isAdmin) return;
    setOverview((current) => ({ ...current, loading: true, error: '' }));
    setUsersLoading(true);
    try {
      const [usersResult, marketplaceResult, hostelsResult, pastQuestionsResult, contactResult, reportsResult, suggestionsResult, announcementsResult, sourcesResult, packsResult, stickersResult] =
        await Promise.allSettled([
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

      // Users are fetched once here and shared with the Users / Premium tabs.
      const loadedUsers =
        usersResult.status === 'fulfilled'
          ? usersResult.value.docs
              .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
              .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
          : [];
      setUsers(loadedUsers);
      setUsersLoading(false);

      // `limit=1` endpoints only tell us the true count through `total`/`count`;
      // counting returned items there would always report 1.
      const totalFrom = (result, allowLength = false) => {
        if (result.status !== 'fulfilled') return 0;
        const value = result.value || {};
        const explicit = value.total ?? value.count;
        if (explicit != null) return Number(explicit) || 0;
        if (!allowLength) return 0;
        return Number(value.items?.length ?? value.data?.length ?? (Array.isArray(value) ? value.length : 0)) || 0;
      };

      const failed = [usersResult, marketplaceResult, hostelsResult, contactResult, reportsResult].filter((r) => r.status === 'rejected').length;

      setOverview({
        loading: false,
        error: failed ? `${failed} data source${failed > 1 ? 's' : ''} could not be reached. Some numbers may be incomplete.` : '',
        metrics: {
          users: loadedUsers.length,
          activeUsers: loadedUsers.filter((u) => !u.blocked).length,
          blockedUsers: loadedUsers.filter((u) => u.blocked).length,
          premiumUsers: loadedUsers.filter((u) => isPremiumActive(u)).length,
          marketplace: totalFrom(marketplaceResult),
          hostels: totalFrom(hostelsResult),
          pastQuestions: totalFrom(pastQuestionsResult),
          announcements: announcementsResult.status === 'fulfilled' ? announcementsResult.value.size : 0,
          marketingSources: sourcesResult.status === 'fulfilled' ? sourcesResult.value.size : 0,
          stickerPacks: totalFrom(packsResult, true),
          stickers: totalFrom(stickersResult, true),
        },
        queues: {
          contact: totalFrom(contactResult),
          reports: totalFrom(reportsResult),
          suggestions: totalFrom(suggestionsResult),
        },
      });
      setLastUpdated(new Date());
    } catch (error) {
      setUsersLoading(false);
      setOverview((current) => ({ ...current, loading: false, error: error?.message || 'Could not load admin overview.' }));
    }
  }, [isAdmin]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const refreshAll = () => {
    fetchItems();
    loadOverview();
  };

  /* ---- Listing actions -------------------------------------------------- */
  const handleDelete = (item) => {
    const config = ADMIN_COLLECTION_MAP[listingType];
    askConfirm({
      title: 'Delete this listing?',
      message: `"${item.title || item.name || 'Untitled'}" will be removed permanently. This cannot be undone.`,
      confirmLabel: 'Delete listing',
      tone: 'danger',
      icon: 'trash-outline',
      onConfirm: async () => {
        setDeletingId(item.id);
        try {
          if (config.endpoint) {
            await deleteJson(`${config.endpoint}/${item.id}`);
          } else if (config.collection) {
            const { deleteMediaDocument } = await import('../../services/mediaCleanup');
            await deleteMediaDocument(config.collection, item.id);
          }
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          notify({ type: 'success', title: 'Listing deleted', message: 'The listing has been removed.' });
        } catch (error) {
          notify({ type: 'error', title: 'Could not delete listing', message: error?.message || 'Please try again.' });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const removeSponsorship = async (item) => {
    setSponsoringId(item.id);
    try {
      const updated = await deleteJson(`/api/marketplace/${encodeURIComponent(item.id)}/sponsor`);
      const patch = updated?.data || updated || {};
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isSponsored: false, sponsoredUntil: null, ...(patch.id ? patch : {}) } : i))
      );
      notify({ type: 'success', title: 'Sponsorship removed', message: `${item.title || 'Listing'} is no longer promoted.` });
    } catch (error) {
      notify({ type: 'error', title: 'Could not remove sponsorship', message: error?.message || 'Please try again.' });
    } finally {
      setSponsoringId(null);
    }
  };

  const manageSponsorship = (item) => {
    if (listingType !== 'marketplace') return;
    if (item.isSponsored) {
      askConfirm({
        title: 'Remove sponsorship?',
        message: `"${item.title || 'This listing'}" will stop being promoted straight away. The seller's payment is not refunded automatically.`,
        confirmLabel: 'Remove sponsorship',
        tone: 'danger',
        icon: 'sparkles-outline',
        onConfirm: () => removeSponsorship(item),
      });
    } else {
      notify({
        type: 'info',
        title: 'Sellers pay to promote',
        message: 'Sponsorships are bought by sellers from their own listing, through Flutterwave. Admins can only remove them.',
      });
    }
  };

  /* ---- Access gate ------------------------------------------------------ */
  if (!isAdmin) {
    return (
      <ScreenShell scrollable={false} title="Admin Panel" subtitle="Admin-only operations." showBack>
        <View style={pageStyles.restricted}>
          <Ionicons name="shield-checkmark-outline" size={48} color={t.textSec} />
          <Text style={pageStyles.restrictedTitle}>Access restricted</Text>
          <Text style={pageStyles.restrictedText}>
            You need admin privileges to open this panel. If you think this is a mistake, contact the app administrator.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  const supportTotal = (overview.queues.contact || 0) + (overview.queues.reports || 0) + (overview.queues.suggestions || 0);
  const navBadges = { support: supportTotal };

  const renderAdminContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard colors={colors} overview={overview} setActiveTab={selectTab} />;
      case 'users':
        return <UsersList colors={colors} users={users} setUsers={setUsers} loading={usersLoading} currentUid={user?.uid} notify={notify} askConfirm={askConfirm} />;
      case 'premium':
        return <UsersList colors={colors} users={users} setUsers={setUsers} loading={usersLoading} currentUid={user?.uid} notify={notify} askConfirm={askConfirm} premiumOnly />;
      case 'mediaSources':
        return <MarketingSourcesManager colors={colors} />;
      case 'support':
        return (
          <View style={pageStyles.supportCard}>
            <View style={pageStyles.supportIcon}>
              <Ionicons name="headset-outline" size={26} color={t.brand} />
            </View>
            <Text style={pageStyles.supportTitle}>{supportTotal ? `${supportTotal} item${supportTotal > 1 ? 's' : ''} waiting for a reply` : 'Your support queue is clear'}</Text>
            <Text style={pageStyles.supportText}>Triage contact messages, reports and product suggestions in the support queue.</Text>
            <View style={pageStyles.supportQueueRow}>
              {[
                ['Contact', overview.queues.contact],
                ['Reports', overview.queues.reports],
                ['Suggestions', overview.queues.suggestions],
              ].map(([label, value]) => (
                <View key={label} style={pageStyles.supportQueuePill}>
                  <Text style={pageStyles.supportQueueValue}>{overview.loading ? '…' : value || 0}</Text>
                  <Text style={pageStyles.supportQueueLabel}>{label}</Text>
                </View>
              ))}
            </View>
            <Pressable style={({ pressed }) => [pageStyles.primaryButton, pressed && pageStyles.pressed]} onPress={() => router.navigate('/adminpanel/support-center')}>
              <Text style={pageStyles.primaryButtonText}>Open support queue</Text>
              <Ionicons name="arrow-forward" size={16} color={t.onBrand} />
            </Pressable>
          </View>
        );
      case 'promoSpotlights':
        return <PromoSpotlightManager />;
      case 'streakRewards':
        return <StreakRewardsAdmin colors={colors} notify={notify} askConfirm={askConfirm} />;
      case 'stickers':
        return <StickerManager colors={colors} />;
      case 'pastQuestions':
        return <PastQuestionReviewManager />;
      case 'access':
        return <AdminAccessPage colors={colors} profile={profile} user={user} viaFlag={hasAdminFlag} viaEmail={isAllowlisted} />;
      case 'revenue':
        return <AdminRevenuePage colors={colors} notify={notify} />;
      case 'sponsorships':
        return <MarketplaceSponsorshipRecords colors={colors} />;
      case 'listings':
        return (
          <ListingsModeration
            colors={colors}
            listingType={listingType}
            setListingType={setListingType}
            items={items}
            loading={listingsLoading}
            error={listingsError}
            onRetry={fetchItems}
            deletingId={deletingId}
            sponsoringId={sponsoringId}
            onDelete={handleDelete}
            onSponsor={manageSponsorship}
            onView={(item) =>
              router.navigate({
                pathname: '/view/[type]/[id]',
                params: { type: listingType === 'marketplace' ? 'listing' : 'hostel', id: item.id },
              })
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <ScreenShell scrollable={false} title="Admin Panel" subtitle="Operations console" showBack>
      <View style={pageStyles.root}>
        <ScrollView contentContainerStyle={pageStyles.pageScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={pageStyles.topBar}>
            <View style={pageStyles.adminPill}>
              <View style={pageStyles.statusDot} />
              <Text style={pageStyles.adminPillText} numberOfLines={1}>
                {profile?.username || user?.email || 'Admin'}
              </Text>
            </View>
            <View style={pageStyles.topBarMeta}>
              <Text style={pageStyles.updatedText}>{overview.loading ? 'Refreshing…' : `Updated ${timeAgo(lastUpdated)}`}</Text>
              <Pressable
                style={({ pressed }) => [pageStyles.refreshButton, pressed && pageStyles.pressed]}
                onPress={refreshAll}
                accessibilityLabel="Refresh admin data"
                disabled={overview.loading}
              >
                {overview.loading ? <ActivityIndicator size="small" color={t.textSec} /> : <Ionicons name="refresh-outline" size={16} color={t.textSec} />}
              </Pressable>
            </View>
          </View>

          <View style={[pageStyles.workspace, isWide && pageStyles.workspaceWide]}>
            <AdminSectionNav t={t} styles={pageStyles} activeTab={activeTab} setActiveTab={selectTab} wide={isWide} badges={navBadges} />
            <View style={pageStyles.content}>
              <View style={pageStyles.contentHeader}>
                <Text style={pageStyles.sectionEyebrow}>{activeNav.section}</Text>
                <Text style={pageStyles.sectionTitle}>{activeNav.label}</Text>
                <Text style={pageStyles.sectionDescription}>{activeNav.description}</Text>
              </View>
              {renderAdminContent()}
            </View>
          </View>
        </ScrollView>
        <Toast toast={toast} onClose={() => setToast(null)} colors={colors} />
        <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} colors={colors} />
      </View>
    </ScreenShell>
  );
}

/* ============================================================================
 * Navigation
 * ========================================================================== */
function AdminSectionNav({ t, styles, activeTab, setActiveTab, wide, badges }) {
  const content = ADMIN_NAV_SECTIONS.map((section, sectionIndex) => (
    <View key={section.label} style={[styles.navSection, !wide && sectionIndex > 0 && styles.navSectionDivider]}>
      {wide ? <Text style={styles.navSectionLabel}>{section.label}</Text> : null}
      <View style={wide ? styles.navItemsWide : styles.navItems}>
        {section.items.map((item) => {
          const selected = activeTab === item.key;
          const badge = badges?.[item.key] || 0;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setActiveTab(item.key)}
              style={({ pressed }) => [
                styles.navItem,
                wide && styles.navItemWide,
                selected && (wide ? styles.navItemActiveWide : styles.navItemActiveMobile),
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={item.icon} size={16} color={selected ? (wide ? t.brandText : t.onBrand) : t.textSec} />
              <Text style={[styles.navItemText, wide && styles.navItemTextWide, selected && (wide ? styles.navItemTextActiveWide : styles.navItemTextActiveMobile)]} numberOfLines={1}>
                {item.label}
              </Text>
              {badge > 0 ? (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  ));

  if (wide) return <View style={styles.sidebarNav}>{content}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileNav} contentContainerStyle={styles.mobileNavContent}>
      {content}
    </ScrollView>
  );
}

/* ============================================================================
 * Dashboard
 * ========================================================================== */
function AdminDashboard({ colors, overview, setActiveTab }) {
  const t = useTokens(colors);
  const styles = useMemo(() => createDashboardStyles(t), [t]);
  const metrics = overview.metrics || {};
  const queues = overview.queues || {};
  const busy = overview.loading;
  const val = (n) => (busy ? '…' : Number(n || 0).toLocaleString());
  const premiumRate = metrics.users ? Math.round(((metrics.premiumUsers || 0) / metrics.users) * 100) : 0;

  const metricCards = [
    { label: 'Users', value: metrics.users, detail: `${(metrics.activeUsers || 0).toLocaleString()} active · ${(metrics.blockedUsers || 0).toLocaleString()} blocked`, icon: 'people-outline', target: 'users' },
    { label: 'Premium', value: metrics.premiumUsers, detail: `${premiumRate}% of all users`, icon: 'star-outline', target: 'premium' },
    { label: 'Marketplace', value: metrics.marketplace, detail: `${(metrics.hostels || 0).toLocaleString()} hostels listed`, icon: 'storefront-outline', target: 'listings' },
    { label: 'Past questions', value: metrics.pastQuestions, detail: 'Processed documents', icon: 'document-text-outline', target: 'pastQuestions' },
  ];
  const operations = [
    { label: 'Announcements', value: metrics.announcements, icon: 'newspaper-outline', target: null },
    { label: 'Media sources', value: metrics.marketingSources, icon: 'megaphone-outline', target: 'mediaSources' },
    { label: 'Sticker packs', value: metrics.stickerPacks, icon: 'albums-outline', target: 'stickers' },
    { label: 'Stickers', value: metrics.stickers, icon: 'happy-outline', target: 'stickers' },
  ];
  const queueRows = [
    { label: 'Contact messages', value: queues.contact || 0 },
    { label: 'Reports', value: queues.reports || 0 },
    { label: 'Suggestions', value: queues.suggestions || 0 },
  ];
  const pending = queueRows.reduce((sum, row) => sum + row.value, 0);

  return (
    <View style={styles.container}>
      {overview.error ? (
        <View style={styles.notice}>
          <Ionicons name="alert-circle-outline" size={17} color={t.danger} />
          <Text style={styles.noticeText}>{overview.error}</Text>
        </View>
      ) : null}

      <View style={styles.metricGrid}>
        {metricCards.map((item) => (
          <Pressable key={item.label} style={({ pressed }) => [styles.metricCard, pressed && styles.pressed]} onPress={() => setActiveTab(item.target)} accessibilityRole="button" accessibilityLabel={`${item.label}: open`}>
            <View style={styles.metricTop}>
              <View style={styles.metricIcon}>
                <Ionicons name={item.icon} size={17} color={t.brand} />
              </View>
              <Ionicons name="chevron-forward" size={15} color={t.textTer} />
            </View>
            <Text style={styles.metricValue}>{val(item.value)}</Text>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <Text style={styles.metricDetail} numberOfLines={2}>{item.detail}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Needs attention</Text>
          <Pressable onPress={() => setActiveTab('support')} accessibilityRole="link">
            <Text style={styles.linkText}>Open support</Text>
          </Pressable>
        </View>
        {!busy && pending === 0 ? (
          <View style={styles.allClear}>
            <Ionicons name="checkmark-circle" size={18} color={t.success} />
            <Text style={styles.allClearText}>Nothing is waiting for you.</Text>
          </View>
        ) : (
          queueRows.map((row) => (
            <Pressable key={row.label} style={styles.queueRow} onPress={() => setActiveTab('support')}>
              <Text style={styles.queueLabel}>{row.label}</Text>
              <View style={[styles.queueCount, row.value > 0 && styles.queueCountActive]}>
                <Text style={[styles.queueValue, row.value > 0 && styles.queueValueActive]}>{val(row.value)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Content and growth</Text>
        <View style={styles.operationGrid}>
          {operations.map((item) => {
            const Wrapper = item.target ? Pressable : View;
            return (
              <Wrapper key={item.label} style={styles.operationItem} {...(item.target ? { onPress: () => setActiveTab(item.target), accessibilityRole: 'button' } : {})}>
                <Ionicons name={item.icon} size={16} color={t.brand} />
                <View style={styles.operationCopy}>
                  <Text style={styles.operationLabel}>{item.label}</Text>
                  <Text style={styles.operationValue}>{val(item.value)}</Text>
                </View>
              </Wrapper>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ============================================================================
 * Listings moderation
 * ========================================================================== */
function ListingsModeration({ colors, listingType, setListingType, items, loading, error, onRetry, deletingId, sponsoringId, onDelete, onSponsor, onView }) {
  const t = useTokens(colors);
  const styles = useMemo(() => createListingStyles(t), [t]);
  const [search, setSearch] = useState('');
  const [sponsoredOnly, setSponsoredOnly] = useState(false);
  const label = ADMIN_COLLECTION_MAP[listingType].label;

  useEffect(() => {
    if (listingType !== 'marketplace') setSponsoredOnly(false);
  }, [listingType]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (sponsoredOnly && !item.isSponsored) return false;
      if (!term) return true;
      return [item.title, item.name, item.sellerName, item.ownerName].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [items, search, sponsoredOnly]);

  return (
    <View style={styles.wrap}>
      <View style={styles.toggleContainer}>
        {LISTING_TYPES.map((option) => {
          const isActive = listingType === option.key;
          return (
            <Pressable key={option.key} onPress={() => setListingType(option.key)} accessibilityRole="button" accessibilityState={{ selected: isActive }} style={[styles.toggle, isActive && styles.toggleActive]}>
              <Ionicons name={option.icon} size={16} color={isActive ? t.onBrand : t.textSec} />
              <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={t.textSec} />
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search by title or seller" placeholderTextColor={t.textTer} />
          {search ? (
            <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search" hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={t.textSec} />
            </Pressable>
          ) : null}
        </View>
        {listingType === 'marketplace' ? (
          <Chip label="Sponsored" active={sponsoredOnly} onPress={() => setSponsoredOnly((v) => !v)} styles={styles} />
        ) : null}
      </View>
      <Text style={styles.resultCount}>
        {loading ? 'Loading…' : `${visible.length} of ${items.length} ${label.toLowerCase()} (latest 50)`}
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <PageLoader label={`Loading ${label}...`} />
        </View>
      ) : error ? (
        <Pressable style={styles.centerBox} onPress={onRetry}>
          <Ionicons name="warning-outline" size={32} color={t.danger} />
          <Text style={styles.emptyText}>{error}</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </Pressable>
      ) : visible.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="file-tray-outline" size={36} color={t.textSec} />
          <Text style={styles.emptyText}>{search || sponsoredOnly ? 'No listings match your filters' : 'No listings yet'}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {visible.map((item) => {
            const imageUrl = getImageUrl(item);
            return (
              <View key={item.id} style={styles.card}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" cachePolicy="disk" />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Ionicons name="image-outline" size={20} color={t.textSec} />
                  </View>
                )}
                <View style={styles.body}>
                  <Text style={styles.title} numberOfLines={1}>{item.title || item.name || 'Untitled'}</Text>
                  {item.isSponsored ? (
                    <View style={styles.sponsoredBadge}>
                      <Ionicons name="sparkles" size={10} color={t.warning} />
                      <Text style={styles.sponsoredText}>Sponsored{item.sponsoredUntil ? ` until ${formatDate(item.sponsoredUntil)}` : ''}</Text>
                    </View>
                  ) : null}
                  {item.price != null ? <Text style={styles.price}>{formatNaira(item.price)}</Text> : null}
                  <Text style={styles.owner} numberOfLines={1}>{item.sellerName || item.ownerName || 'Unknown seller'}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable style={({ pressed }) => [styles.iconButton, styles.viewButton, pressed && styles.pressed]} onPress={() => onView(item)} accessibilityLabel="View listing">
                    <Ionicons name="eye-outline" size={18} color={t.brand} />
                  </Pressable>
                  {listingType === 'marketplace' ? (
                    <Pressable style={({ pressed }) => [styles.iconButton, styles.promoteButton, pressed && styles.pressed]} onPress={() => onSponsor(item)} disabled={sponsoringId === item.id} accessibilityLabel={item.isSponsored ? 'Remove sponsorship' : 'Sponsorship info'}>
                      {sponsoringId === item.id ? <ActivityIndicator size="small" color={t.warning} /> : <Ionicons name={item.isSponsored ? 'sparkles' : 'sparkles-outline'} size={18} color={t.warning} />}
                    </Pressable>
                  ) : null}
                  <Pressable style={({ pressed }) => [styles.iconButton, styles.deleteButton, pressed && styles.pressed]} onPress={() => onDelete(item)} disabled={deletingId === item.id} accessibilityLabel="Delete listing">
                    {deletingId === item.id ? <ActivityIndicator size="small" color={t.danger} /> : <Ionicons name="trash-outline" size={18} color={t.danger} />}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ============================================================================
 * Sponsorship records
 * ========================================================================== */
function MarketplaceSponsorshipRecords({ colors }) {
  const t = useTokens(colors);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        ...sharedStyles(t),
        wrap: { gap: 12 },
        summaryRow: { flexDirection: 'row', gap: 8 },
        summaryCard: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
        summaryValue: { color: t.text, fontSize: 17, fontWeight: '900' },
        summaryLabel: { marginTop: 2, color: t.textSec, fontSize: 11, fontWeight: '700' },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        stateBox: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface2 },
        stateText: { color: t.textSec, textAlign: 'center', fontWeight: '700' },
        card: { borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.card, padding: 14, gap: 8 },
        topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
        title: { flex: 1, color: t.text, fontSize: 14.5, fontWeight: '900' },
        pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
        pillText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
        meta: { color: t.textSec, fontSize: 12, lineHeight: 17, fontWeight: '600' },
        amount: { color: t.brandText, fontSize: 15, fontWeight: '900' },
      }),
    [t]
  );

  const load = useCallback(async () => {
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
    load();
  }, [load]);

  const amountOf = (record) => {
    const amount = Number(record.amountNaira ?? Number(record.amount || 0) / 100);
    return Number.isFinite(amount) ? amount : 0;
  };
  const statusTone = (value) => {
    const s = String(value || 'pending').toLowerCase();
    if (['active', 'paid', 'successful', 'completed'].includes(s)) return { bg: t.successLight, fg: t.success };
    if (['failed', 'cancelled', 'canceled', 'refunded'].includes(s)) return { bg: t.dangerLight, fg: t.danger };
    if (s === 'expired') return { bg: t.surface2, fg: t.textSec };
    return { bg: t.warningLight, fg: t.warning };
  };

  const statuses = useMemo(() => Array.from(new Set(records.map((r) => String(r.status || 'pending').toLowerCase()))), [records]);
  const visible = records.filter((r) => status === 'all' || String(r.status || 'pending').toLowerCase() === status);
  const totalValue = records.filter((r) => ['active', 'paid', 'successful', 'completed', 'expired'].includes(String(r.status || '').toLowerCase())).reduce((sum, r) => sum + amountOf(r), 0);
  const activeCount = records.filter((r) => String(r.status || '').toLowerCase() === 'active').length;

  if (loading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator color={t.brand} />
        <Text style={styles.stateText}>Loading sponsorship records...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <Pressable style={styles.stateBox} onPress={load}>
        <Ionicons name="warning-outline" size={28} color={t.danger} />
        <Text style={styles.stateText}>{error}</Text>
        <Text style={[styles.stateText, { color: t.brand }]}>Tap to retry</Text>
      </Pressable>
    );
  }
  if (!records.length) {
    return (
      <View style={styles.stateBox}>
        <Ionicons name="ribbon-outline" size={32} color={t.textSec} />
        <Text style={styles.stateText}>No sponsorships yet. They appear here once a seller pays to promote a listing.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}><Text style={styles.summaryValue}>{records.length}</Text><Text style={styles.summaryLabel}>Records</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryValue}>{activeCount}</Text><Text style={styles.summaryLabel}>Running now</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryValue}>{formatNaira(totalValue)}</Text><Text style={styles.summaryLabel}>Paid</Text></View>
      </View>
      <View style={styles.chipRow}>
        <Chip label="All" active={status === 'all'} onPress={() => setStatus('all')} styles={styles} />
        {statuses.map((s) => (
          <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={status === s} onPress={() => setStatus(s)} styles={styles} />
        ))}
      </View>
      {visible.map((record) => {
        const tone = statusTone(record.status);
        return (
          <View key={record.id} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.title} numberOfLines={2}>{record.listingTitle || record.listingId}</Text>
              <View style={[styles.pill, { backgroundColor: tone.bg }]}>
                <Text style={[styles.pillText, { color: tone.fg }]}>{record.status || 'pending'}</Text>
              </View>
            </View>
            <Text style={styles.amount}>{formatNaira(amountOf(record))} for {record.durationDays} days</Text>
            <Text style={styles.meta}>Seller: {record.sellerId}</Text>
            <Text style={styles.meta} selectable>Reference: {record.paymentReference}</Text>
            <Text style={styles.meta}>Runs {formatDate(record.startsAt)} to {formatDate(record.expiresAt)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ============================================================================
 * Access
 * ========================================================================== */
function AdminAccessPage({ colors, profile, user, viaFlag, viaEmail }) {
  const t = useTokens(colors);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { gap: 12 },
        card: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
        copy: { flex: 1 },
        title: { fontSize: 16, fontWeight: '900', color: t.text },
        text: { marginTop: 4, fontSize: 13, lineHeight: 19, color: t.textSec },
        detail: { padding: 16, borderRadius: 16, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border, gap: 4 },
        label: { marginTop: 8, fontSize: 12, fontWeight: '700', color: t.textTer },
        value: { fontSize: 14, fontWeight: '800', color: t.text },
      }),
    [t]
  );
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="shield-checkmark-outline" size={30} color={t.brand} />
        <View style={styles.copy}>
          <Text style={styles.title}>You have admin access</Text>
          <Text style={styles.text}>Access is granted by the admin flag on your profile or by the approved admin email list. Every admin action is also checked by the backend.</Text>
        </View>
      </View>
      <View style={styles.detail}>
        <Text style={[styles.label, { marginTop: 0 }]}>Signed in as</Text>
        <Text style={styles.value} selectable>{user?.email || profile?.email || 'Unknown admin'}</Text>
        <Text style={styles.label}>Profile admin flag</Text>
        <Text style={styles.value}>{viaFlag ? 'Enabled' : 'Not enabled'}</Text>
        <Text style={styles.label}>Approved email list</Text>
        <Text style={styles.value}>{viaEmail ? 'Listed' : 'Not listed'}</Text>
      </View>
    </View>
  );
}

/* ============================================================================
 * Streak rewards
 * ========================================================================== */
const REWARD_TYPES = [
  ['ai_tokens', 'AI tokens'],
  ['free_premium_days', 'Premium days'],
  ['premium_discount', 'Discount %'],
  ['badge', 'Badge'],
];

function StreakRewardsAdmin({ colors, notify, askConfirm }) {
  const t = useTokens(colors);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        ...sharedStyles(t),
        container: { gap: 14 },
        topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
        intro: { flex: 1, color: t.textSec, lineHeight: 20, fontSize: 13 },
        liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: t.successLight },
        liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.success },
        liveText: { color: t.success, fontSize: 11, fontWeight: '800' },
        dirty: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, backgroundColor: t.warningLight },
        dirtyText: { flex: 1, color: t.warning, fontSize: 12, fontWeight: '700' },
        milestoneCard: { borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 12, gap: 10, backgroundColor: t.card },
        milestoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        milestoneDays: { minWidth: 44, height: 44, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.brandLight },
        milestoneDaysValue: { color: t.brandText, fontWeight: '900', fontSize: 15 },
        milestoneDaysLabel: { color: t.brandText, fontSize: 9, fontWeight: '700' },
        milestoneCopy: { flex: 1 },
        milestoneTitle: { color: t.text, fontSize: 14, fontWeight: '900' },
        milestoneSub: { color: t.textSec, fontSize: 11, marginTop: 2 },
        fieldRow: { flexDirection: 'row', gap: 8 },
        field: { flex: 1, gap: 5 },
        fieldLabel: { color: t.textSec, fontSize: 11, fontWeight: '700' },
        input: { minHeight: 42, borderWidth: 1, borderColor: t.inputBorder, borderRadius: 10, paddingHorizontal: 10, color: t.text, backgroundColor: t.input, fontSize: 13 },
        rewardCard: { padding: 10, borderRadius: 12, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border, gap: 8 },
        rewardDisabled: { opacity: 0.6 },
        rewardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        rewardLabel: { color: t.text, fontSize: 12, fontWeight: '800' },
        chance: { color: t.brandText, fontSize: 11, fontWeight: '800' },
        typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
        switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        switchText: { color: t.textSec, fontSize: 12, fontWeight: '700' },
        iconBtn: { padding: 4 },
        addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, borderWidth: 1, borderStyle: 'dashed', borderColor: t.brand, paddingVertical: 10 },
        addButtonText: { color: t.brandText, fontSize: 12, fontWeight: '800' },
        saveButton: { flexDirection: 'row', gap: 8, backgroundColor: t.brand, borderRadius: 13, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
        saveDisabled: { opacity: 0.5 },
        saveText: { color: t.onBrand, fontWeight: '800' },
        errorBox: { alignItems: 'center', gap: 8, padding: 20, borderRadius: 14, borderWidth: 1, borderColor: t.danger, backgroundColor: t.dangerLight },
        errorText: { color: t.text, textAlign: 'center', fontSize: 13, fontWeight: '700' },
      }),
    [t]
  );

  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const createReward = (overrides = {}) => ({ id: uid(), label: 'New reward', type: 'ai_tokens', value: 10, weight: 10, enabled: true, ...overrides });
  const createMilestone = (days = 7) => ({
    _key: uid(),
    days,
    title: `${days} day streak`,
    enabled: true,
    rewards: [createReward({ label: `+${days} AI tokens`, value: days, weight: 100 })],
  });
  // Stable keys keep TextInputs mounted (and focused) while the admin types.
  const withKeys = (list) =>
    list.map((m) => ({ ...m, _key: m._key || uid(), rewards: (m.rewards || []).map((r) => ({ ...r, id: r.id || uid() })) }));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await getJson('/api/streak/admin/config');
      const next = Array.isArray(response.data) ? response.data : [];
      setMilestones(next.length ? withKeys(next) : [createMilestone(7), createMilestone(14)]);
      setDirty(false);
    } catch (error) {
      setLoadError(error.message || 'Could not load streak configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (updater) => {
    setMilestones(updater);
    setDirty(true);
  };
  const updateMilestone = (mi, field, value) => edit((cur) => cur.map((m, i) => (i === mi ? { ...m, [field]: value } : m)));
  const updateReward = (mi, ri, field, value) =>
    edit((cur) => cur.map((m, i) => (i !== mi ? m : { ...m, rewards: m.rewards.map((r, j) => (j === ri ? { ...r, [field]: value } : r)) })));
  const addMilestone = () => {
    const lastDays = milestones.reduce((max, m) => Math.max(max, Number(m.days) || 0), 0);
    edit((cur) => [...cur, createMilestone(lastDays + 7)]);
  };
  const addReward = (mi) => edit((cur) => cur.map((m, i) => (i === mi ? { ...m, rewards: [...(m.rewards || []), createReward()] } : m)));
  const removeMilestone = (mi) => {
    const target = milestones[mi];
    askConfirm({
      title: 'Remove this milestone?',
      message: `"${target?.title || 'Milestone'}" and its rewards will be removed once you publish.`,
      confirmLabel: 'Remove',
      tone: 'danger',
      onConfirm: () => edit((cur) => cur.filter((_, i) => i !== mi)),
    });
  };
  const removeReward = (mi, ri) => edit((cur) => cur.map((m, i) => (i === mi ? { ...m, rewards: (m.rewards || []).filter((_, j) => j !== ri) } : m)));

  const chanceOf = (milestone, reward) => {
    if (reward.enabled === false) return 'Off';
    const total = (milestone.rewards || []).filter((r) => r.enabled !== false).reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
    if (!total) return '0%';
    return `${Math.round(((Number(reward.weight) || 0) / total) * 100)}% chance`;
  };

  const validate = () => {
    if (!milestones.length) return 'Add at least one milestone.';
    const seen = new Set();
    for (const m of milestones) {
      const label = m.title?.trim() || 'A milestone';
      if (!Number(m.days) || Number(m.days) < 1) return `${label} needs a streak length of at least 1 day.`;
      if (!m.title?.trim()) return 'Every milestone needs a name.';
      if (seen.has(Number(m.days))) return `Two milestones share ${m.days} days. Each streak length can only be used once.`;
      seen.add(Number(m.days));
      if (!Array.isArray(m.rewards) || !m.rewards.length) return `${label} needs at least one reward.`;
      for (const r of m.rewards) {
        if (!r.label?.trim()) return `Every reward in ${label} needs a description.`;
        const emptyValue = r.type === 'badge' ? !String(r.value || '').trim() : !(Number(r.value) > 0);
        if (emptyValue) return `"${r.label}" in ${label} needs a value.`;
      }
      if (m.enabled !== false && !m.rewards.some((r) => r.enabled !== false && Number(r.weight) > 0)) {
        return `${label} is enabled but none of its rewards can be won. Enable a reward and give it a weight above 0.`;
      }
    }
    return null;
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const payload = [...milestones]
        .sort((a, b) => Number(a.days) - Number(b.days))
        .map(({ _key, ...m }) => ({
          ...m,
          days: Number(m.days),
          title: m.title.trim(),
          enabled: m.enabled !== false,
          rewards: m.rewards.map((r) => ({
            ...r,
            label: r.label.trim(),
            enabled: r.enabled !== false,
            weight: Number(r.weight || 0),
            value: r.type === 'badge' ? String(r.value || '').trim() : Number(r.value || 0),
          })),
        }));
      const response = await putJson('/api/streak/admin/config', { milestones: payload });
      setMilestones(withKeys(response.data || payload));
      setDirty(false);
      notify({ type: 'success', title: 'Streak rules published', message: 'Students will see the new rewards straight away.' });
    } catch (error) {
      notify({ type: 'error', title: 'Could not publish', message: error.message || 'The backend rejected this configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const problem = validate();
    if (problem) {
      notify({ type: 'error', title: 'Fix this before publishing', message: problem });
      return;
    }
    askConfirm({
      title: 'Publish streak rules?',
      message: 'These changes go live for every student immediately.',
      confirmLabel: 'Publish',
      icon: 'cloud-upload-outline',
      onConfirm: doSave,
    });
  };

  if (loading) return <ActivityIndicator color={t.brand} style={{ marginVertical: 40 }} />;
  if (loadError) {
    return (
      <Pressable style={styles.errorBox} onPress={load}>
        <Ionicons name="alert-circle-outline" size={26} color={t.danger} />
        <Text style={styles.errorText}>{loadError}</Text>
        <Text style={[styles.errorText, { color: t.brand }]}>Tap to retry</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.intro}>Weights decide how likely each reward is within its milestone. Nothing changes for students until you publish.</Text>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text></View>
      </View>
      {dirty ? (
        <View style={styles.dirty}>
          <Ionicons name="create-outline" size={16} color={t.warning} />
          <Text style={styles.dirtyText}>You have unpublished changes.</Text>
        </View>
      ) : null}

      {milestones.map((milestone, mi) => (
        <View key={milestone._key} style={styles.milestoneCard}>
          <View style={styles.milestoneHeader}>
            <View style={styles.milestoneDays}>
              <Text style={styles.milestoneDaysValue}>{milestone.days || '?'}</Text>
              <Text style={styles.milestoneDaysLabel}>days</Text>
            </View>
            <View style={styles.milestoneCopy}>
              <Text style={styles.milestoneTitle} numberOfLines={1}>{milestone.title || 'Untitled milestone'}</Text>
              <Text style={styles.milestoneSub}>{(milestone.rewards || []).length} reward option{(milestone.rewards || []).length === 1 ? '' : 's'}</Text>
            </View>
            <Pressable style={styles.iconBtn} onPress={() => removeMilestone(mi)} disabled={saving} accessibilityLabel="Remove milestone">
              <Ionicons name="trash-outline" size={18} color={t.danger} />
            </Pressable>
          </View>

          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Streak days</Text>
              <TextInput value={String(milestone.days ?? '')} onChangeText={(v) => updateMilestone(mi, 'days', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={styles.input} />
            </View>
            <View style={[styles.field, { flex: 2 }]}>
              <Text style={styles.fieldLabel}>Milestone name</Text>
              <TextInput value={milestone.title || ''} onChangeText={(v) => updateMilestone(mi, 'title', v)} style={styles.input} />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{milestone.enabled === false ? 'Milestone is off' : 'Milestone is on'}</Text>
            <Pressable onPress={() => updateMilestone(mi, 'enabled', milestone.enabled === false)} accessibilityRole="switch" accessibilityState={{ checked: milestone.enabled !== false }}>
              <Ionicons name={milestone.enabled === false ? 'toggle-outline' : 'toggle'} size={30} color={milestone.enabled === false ? t.textTer : t.success} />
            </Pressable>
          </View>

          {(milestone.rewards || []).map((reward, ri) => (
            <View key={reward.id} style={[styles.rewardCard, reward.enabled === false && styles.rewardDisabled]}>
              <View style={styles.rewardHeader}>
                <Text style={styles.rewardLabel}>Reward {ri + 1}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.chance}>{chanceOf(milestone, reward)}</Text>
                  <Pressable style={styles.iconBtn} onPress={() => removeReward(mi, ri)} accessibilityLabel="Remove reward">
                    <Ionicons name="close-circle-outline" size={18} color={t.textSec} />
                  </Pressable>
                </View>
              </View>
              <TextInput value={reward.label || ''} onChangeText={(v) => updateReward(mi, ri, 'label', v)} placeholder="What the student sees, e.g. +10 AI tokens" placeholderTextColor={t.textTer} style={styles.input} />
              <View style={styles.typeRow}>
                {REWARD_TYPES.map(([type, label]) => (
                  <Chip key={type} label={label} active={reward.type === type} onPress={() => updateReward(mi, ri, 'type', type)} styles={styles} />
                ))}
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{reward.type === 'badge' ? 'Badge name' : 'Value'}</Text>
                  <TextInput value={String(reward.value ?? '')} onChangeText={(v) => updateReward(mi, ri, 'value', reward.type === 'badge' ? v : v.replace(/[^0-9]/g, ''))} keyboardType={reward.type === 'badge' ? 'default' : 'number-pad'} style={styles.input} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Weight</Text>
                  <TextInput value={String(reward.weight ?? '')} onChangeText={(v) => updateReward(mi, ri, 'weight', v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" style={styles.input} />
                </View>
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>{reward.enabled === false ? 'Reward is off' : 'Reward is on'}</Text>
                <Pressable onPress={() => updateReward(mi, ri, 'enabled', reward.enabled === false)} accessibilityRole="switch" accessibilityState={{ checked: reward.enabled !== false }}>
                  <Ionicons name={reward.enabled === false ? 'toggle-outline' : 'toggle'} size={30} color={reward.enabled === false ? t.textTer : t.success} />
                </Pressable>
              </View>
            </View>
          ))}

          <Pressable style={styles.addButton} onPress={() => addReward(mi)}>
            <Ionicons name="add" size={16} color={t.brand} />
            <Text style={styles.addButtonText}>Add reward</Text>
          </Pressable>
        </View>
      ))}

      <Pressable style={styles.addButton} onPress={addMilestone} disabled={saving}>
        <Ionicons name="add-circle-outline" size={17} color={t.brand} />
        <Text style={styles.addButtonText}>Add milestone</Text>
      </Pressable>

      <Pressable onPress={save} disabled={saving || !dirty} style={({ pressed }) => [styles.saveButton, (saving || !dirty) && styles.saveDisabled, pressed && styles.pressed]}>
        {saving ? <ActivityIndicator size="small" color={t.onBrand} /> : <Ionicons name="cloud-upload-outline" size={17} color={t.onBrand} />}
        <Text style={styles.saveText}>{saving ? 'Publishing...' : dirty ? 'Publish changes' : 'No changes to publish'}</Text>
      </Pressable>
    </View>
  );
}

/* ============================================================================
 * Users
 * ========================================================================== */
function UsersList({ colors, users, setUsers, loading, premiumOnly = false, currentUid, notify, askConfirm }) {
  const router = useRouter();
  const t = useTokens(colors);
  const styles = useMemo(() => createUserStyles(t), [t]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(premiumOnly ? 'premium' : 'all');
  const [shown, setShown] = useState(USERS_PAGE_SIZE);
  const [syncingPremiumId, setSyncingPremiumId] = useState(null);
  const [grantingId, setGrantingId] = useState(null);

  const sourceOf = (u) => `${u.heardFrom || ''} ${u.heardFromOther || ''}`.trim();

  const counts = useMemo(() => {
    const c = { all: users.length, premium: 0, referrals: 0, blocked: 0, admins: 0 };
    users.forEach((u) => {
      if (isPremiumActive(u)) c.premium += 1;
      if (sourceOf(u)) c.referrals += 1;
      if (u.blocked) c.blocked += 1;
      if (u.admin) c.admins += 1;
    });
    return c;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'blocked' && u.blocked) ||
        (filter === 'admins' && u.admin) ||
        (filter === 'premium' && isPremiumActive(u)) ||
        (filter === 'referrals' && !!sourceOf(u));
      if (!matchesFilter) return false;
      if (!term) return true;
      return [u.username, u.email, u.school, u.department, sourceOf(u)].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [users, search, filter]);

  useEffect(() => {
    setShown(USERS_PAGE_SIZE);
  }, [search, filter]);

  const initialsOf = (u) => {
    const name = u.username || u.email || 'S';
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'S';
  };
  const shortDate = (date) => (date ? formatDate(date) : 'No expiry');

  const patchUser = (id, patch) => setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const handleBlockToggle = (userItem) => {
    const name = userItem.username || userItem.email || 'this user';
    const unblocking = !!userItem.blocked;
    askConfirm({
      title: unblocking ? `Unblock ${name}?` : `Block ${name}?`,
      message: unblocking ? 'They will be able to use the app again.' : 'They will lose access to the app until you unblock them.',
      confirmLabel: unblocking ? 'Unblock' : 'Block user',
      tone: unblocking ? 'brand' : 'danger',
      icon: unblocking ? 'checkmark-circle-outline' : 'ban-outline',
      onConfirm: async () => {
        try {
          if (unblocking) await unblockUser(userItem.uid || userItem.id);
          else await blockUser(userItem.uid || userItem.id);
          patchUser(userItem.id, { blocked: !unblocking });
          notify({ type: 'success', title: unblocking ? 'User unblocked' : 'User blocked', message: `${name} ${unblocking ? 'can use the app again.' : 'no longer has access.'}` });
        } catch (error) {
          notify({ type: 'error', title: unblocking ? 'Could not unblock user' : 'Could not block user', message: error.message || 'Please try again.' });
        }
      },
    });
  };

  const grantPremium = async (target) => {
    setGrantingId(target.id);
    try {
      const response = await postJson(`/api/users/${encodeURIComponent(target.uid || target.id)}/premium-trial`, {});
      const grant = response.data || response;
      const fallback = new Date(Date.now() + ADMIN_PREMIUM_GIFT_DAYS * 86400000).toISOString();
      const expiry = grant?.subscriptionExpiresAt || grant?.premiumExpiresAt || fallback;
      patchUser(target.id, { premium: true, premiumExpiresAt: expiry, subscriptionExpiresAt: expiry, subscriptionStatus: 'admin_grant' });
      notify({ type: 'success', title: 'Premium access granted', message: `${target.username || 'This user'} received ${ADMIN_PREMIUM_GIFT_DAYS} days of Premium.` });
    } catch (error) {
      notify({ type: 'error', title: 'Could not grant Premium', message: error.message || 'Please try again.' });
    } finally {
      setGrantingId(null);
    }
  };

  const askGrant = (target) =>
    askConfirm({
      title: `Grant ${ADMIN_PREMIUM_GIFT_DAYS} days of Premium?`,
      message: `${target.username || target.email || 'This user'} will receive Premium access. Any active Premium time is extended.`,
      confirmLabel: 'Grant access',
      icon: 'gift-outline',
      onConfirm: () => grantPremium(target),
    });

  const syncPremiumExpiry = async (userItem) => {
    const targetId = userItem.uid || userItem.id;
    if (!targetId || syncingPremiumId) return;
    setSyncingPremiumId(userItem.id);
    try {
      const response = await postJson(`/api/users/${encodeURIComponent(targetId)}/sync-premium-expiry`, {});
      const synced = response.data || response;
      const expiry = synced.subscriptionExpiresAt || synced.premiumExpiresAt;
      patchUser(userItem.id, { premium: true, premiumExpiresAt: expiry, subscriptionExpiresAt: expiry, subscriptionStatus: synced.subscriptionStatus || userItem.subscriptionStatus || 'active' });
      notify({ type: 'success', title: 'Expiry date fixed', message: `${userItem.username || 'This user'} now has matching expiry dates.` });
    } catch (error) {
      notify({ type: 'error', title: 'Could not fix expiry date', message: error.message || 'Please try again.' });
    } finally {
      setSyncingPremiumId(null);
    }
  };

  const filters = [
    ['all', 'All'],
    ['premium', 'Premium'],
    ['referrals', 'Referrals'],
    ['blocked', 'Blocked'],
    ['admins', 'Admins'],
  ];
  const pageItems = filteredUsers.slice(0, shown);

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{loading ? '…' : users.length - counts.blocked}</Text><Text style={styles.statLabel}>Active</Text></View>
        <View style={styles.statCard}><Text style={[styles.statValue, { color: t.danger }]}>{loading ? '…' : counts.blocked}</Text><Text style={styles.statLabel}>Blocked</Text></View>
        <View style={styles.statCard}><Text style={[styles.statValue, { color: t.brandText }]}>{loading ? '…' : counts.premium}</Text><Text style={styles.statLabel}>Premium</Text></View>
        <View style={styles.statCard}><Text style={[styles.statValue, { color: t.warning }]}>{loading ? '…' : counts.referrals}</Text><Text style={styles.statLabel}>With source</Text></View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={t.textSec} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search by name, email or school" placeholderTextColor={t.textTer} autoCapitalize="none" />
        {search ? (
          <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search" hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={t.textSec} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {filters.map(([key, label]) => (
          <Chip key={key} label={label} count={counts[key]} active={filter === key} onPress={() => setFilter(key)} styles={styles} />
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <PageLoader label="Loading users..." />
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : filteredUsers.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.resultCount}>Showing {pageItems.length} of {filteredUsers.length}</Text>
          {pageItems.map((item) => {
            const premiumActive = isPremiumActive(item);
            const premiumExpiry = getPremiumExpiry(item);
            const daysLeft = getDaysLeft(premiumExpiry);
            const hasSubscriptionExpiry = Boolean(getSubscriptionExpiry(item.subscriptionExpiresAt));
            const needsSync = premiumActive && !hasSubscriptionExpiry && Boolean(premiumExpiry);
            const isSelf = currentUid && (item.uid || item.id) === currentUid;
            const photo = item.photoThumb || item.photo || item.photoURL;
            return (
              <Pressable key={item.id} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => router.navigate(`/view-user-profile/${item.uid || item.id}`)}>
                <View style={styles.avatar}>
                  {photo ? <Image source={{ uri: photo }} style={styles.avatarImage} contentFit="cover" cachePolicy="disk" /> : <Text style={styles.avatarText}>{initialsOf(item)}</Text>}
                </View>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>{item.username || 'Student'}</Text>
                  <Text style={styles.email} numberOfLines={1}>{item.email || 'No email'}</Text>
                  <View style={styles.metaRow}>
                    {item.role ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="school" size={10} color={t.brand} />
                        <Text style={styles.metaChipText}>{item.role}</Text>
                      </View>
                    ) : null}
                    {item.school ? <Text style={styles.school} numberOfLines={1}>{item.school}</Text> : null}
                  </View>
                  {sourceOf(item) ? (
                    <View style={styles.referralBadge}>
                      <Ionicons name="megaphone-outline" size={10} color={t.brandText} />
                      <Text style={styles.referralBadgeText} numberOfLines={1}>Heard from {item.heardFromOther || item.heardFrom}</Text>
                    </View>
                  ) : null}
                  {item.blocked ? (
                    <View style={styles.blockedBadge}>
                      <Ionicons name="ban-outline" size={10} color={t.danger} />
                      <Text style={styles.blockedBadgeText}>Blocked</Text>
                    </View>
                  ) : null}
                  {premiumActive ? (
                    <View style={styles.premiumInfoRow}>
                      <Ionicons name="sparkles" size={11} color={t.warning} />
                      <Text style={styles.premiumInfoText} numberOfLines={1}>
                        Premium {daysLeft == null ? 'active' : `${daysLeft}d left`} until {shortDate(premiumExpiry)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.cardActions}>
                  <Pressable
                    style={({ pressed }) => [styles.premiumButton, pressed && styles.pressed]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      askGrant(item);
                    }}
                    disabled={grantingId === item.id}
                  >
                    {grantingId === item.id ? <ActivityIndicator size="small" color={t.warning} /> : <Ionicons name={premiumActive ? 'add-circle-outline' : 'gift-outline'} size={14} color={t.warning} />}
                    <Text style={styles.premiumButtonText}>{premiumActive ? `Add ${ADMIN_PREMIUM_GIFT_DAYS}d` : `Gift ${ADMIN_PREMIUM_GIFT_DAYS}d`}</Text>
                  </Pressable>
                  {needsSync ? (
                    <Pressable
                      style={({ pressed }) => [styles.syncButton, pressed && styles.pressed]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        syncPremiumExpiry(item);
                      }}
                      disabled={syncingPremiumId === item.id}
                    >
                      {syncingPremiumId === item.id ? <ActivityIndicator size="small" color={t.brand} /> : <Ionicons name="sync-outline" size={14} color={t.brand} />}
                      <Text style={styles.syncButtonText}>Fix expiry</Text>
                    </Pressable>
                  ) : null}
                  {item.admin || isSelf ? (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield-checkmark" size={12} color={t.brand} />
                      <Text style={styles.adminBadgeText}>{isSelf && !item.admin ? 'You' : 'Admin'}</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [styles.actionButton, item.blocked ? styles.unblockButton : styles.blockButton, pressed && styles.pressed]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleBlockToggle(item);
                      }}
                    >
                      <Ionicons name={item.blocked ? 'checkmark-circle' : 'ban-outline'} size={14} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>{item.blocked ? 'Unblock' : 'Block'}</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          })}
          {shown < filteredUsers.length ? (
            <Pressable style={({ pressed }) => [styles.loadMore, pressed && styles.pressed]} onPress={() => setShown((n) => n + USERS_PAGE_SIZE)}>
              <Text style={styles.loadMoreText}>Show {Math.min(USERS_PAGE_SIZE, filteredUsers.length - shown)} more</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={36} color={t.textSec} />
          <Text style={styles.emptyText}>{search || filter !== 'all' ? 'No users match these filters' : 'No users yet'}</Text>
        </View>
      )}
    </View>
  );
}

/* ============================================================================
 * Revenue
 * ========================================================================== */
function AdminRevenuePage({ colors, notify }) {
  const t = useTokens(colors);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        ...sharedStyles(t),
        container: { gap: 14, paddingBottom: 24 },
        headerCard: { padding: 20, borderRadius: 18, backgroundColor: t.brand, gap: 6 },
        headerTitle: { color: t.onBrand, fontSize: 13, fontWeight: '700', opacity: 0.9 },
        headerValue: { color: t.onBrand, fontSize: 32, fontWeight: '900' },
        headerSub: { color: t.onBrand, fontSize: 12, opacity: 0.8 },
        grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
        metricCard: { flexGrow: 1, flexBasis: '45%', padding: 14, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, gap: 4 },
        metricLabel: { color: t.textSec, fontSize: 12, fontWeight: '700' },
        metricValue: { color: t.text, fontSize: 18, fontWeight: '900' },
        sectionTitle: { color: t.text, fontSize: 16, fontWeight: '900', marginTop: 6 },
        breakdownCard: { padding: 16, borderRadius: 14, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border },
        breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.border },
        breakdownLabel: { color: t.textSec, fontSize: 13, fontWeight: '600' },
        breakdownValue: { color: t.text, fontSize: 13, fontWeight: '800' },
        breakdownTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 },
        breakdownTotalLabel: { color: t.brandText, fontSize: 14, fontWeight: '900' },
        breakdownTotalValue: { color: t.brandText, fontSize: 15, fontWeight: '900' },
        toolbar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
        searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
        searchInput: { flex: 1, color: t.text, fontSize: 14, paddingVertical: 0 },
        exportButton: { height: 44, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.brandLight, borderWidth: 1, borderColor: t.brandBorder },
        exportText: { color: t.brandText, fontWeight: '800', fontSize: 12 },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        txCard: { padding: 14, borderRadius: 12, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, gap: 6 },
        txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
        txType: { flex: 1, color: t.text, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
        txAmount: { color: t.brandText, fontSize: 14, fontWeight: '900' },
        txRef: { color: t.textSec, fontSize: 12, fontWeight: '600' },
        txMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
        txDate: { color: t.textTer, fontSize: 11 },
        txStatus: { fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, overflow: 'hidden' },
        emptyBox: { padding: 24, alignItems: 'center', gap: 6 },
        emptyText: { color: t.textSec, textAlign: 'center' },
        errorBox: { alignItems: 'center', gap: 8, padding: 20, borderRadius: 14, borderWidth: 1, borderColor: t.danger, backgroundColor: t.dangerLight },
        errorText: { color: t.text, textAlign: 'center', fontSize: 13, fontWeight: '700' },
      }),
    [t]
  );

  // Debounce so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const [statsRes, txRes] = await Promise.allSettled([getJson('/api/revenue'), getJson(`/api/revenue/transactions?${params.toString()}`)]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.items || []);
      if (statsRes.status === 'rejected' && txRes.status === 'rejected') {
        setError(statsRes.reason?.message || 'Could not load revenue data.');
      }
    } catch (e) {
      setError(e?.message || 'Could not load revenue data.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const typeOf = (tx) => String(tx.type || 'payment');
  const prettyType = (value) => value.replace(/_/g, ' ');
  const types = useMemo(() => Array.from(new Set(transactions.map(typeOf))), [transactions]);
  const visible = transactions.filter((tx) => typeFilter === 'all' || typeOf(tx) === typeFilter);

  const statusTone = (value) => {
    const s = String(value || '').toLowerCase();
    if (['successful', 'success', 'completed'].includes(s)) return { bg: t.successLight, fg: t.success };
    if (s === 'pending') return { bg: t.warningLight, fg: t.warning };
    return { bg: t.dangerLight, fg: t.danger };
  };

  const exportCsv = async () => {
    if (!visible.length) return;
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['date', 'type', 'amount', 'status', 'customer', 'reference'].join(','),
      ...visible.map((tx) =>
        [toDate(tx.created_at)?.toISOString() || '', typeOf(tx), tx.amount, tx.status, tx.customer_email || tx.user_id, tx.transaction_id || tx.reference].map(esc).join(',')
      ),
    ];
    try {
      await Share.share({ title: 'UniHelp transactions', message: rows.join('\n') });
    } catch (e) {
      notify({ type: 'error', title: 'Could not export', message: e?.message || 'Sharing was not available.' });
    }
  };

  if (loading && !stats) return <PageLoader label="Loading financials..." />;
  if (error && !stats) {
    return (
      <Pressable style={styles.errorBox} onPress={loadData}>
        <Ionicons name="alert-circle-outline" size={26} color={t.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={[styles.errorText, { color: t.brand }]}>Tap to retry</Text>
      </Pressable>
    );
  }

  const s = stats || {};

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Total gross revenue</Text>
        <Text style={styles.headerValue}>{formatNaira(s.totalRevenue || 0, true)}</Text>
        <Text style={styles.headerSub}>From all verified transactions</Text>
      </View>

      <View style={styles.grid}>
        {[
          ['Today', formatNaira(s.revenueToday || 0, true)],
          ['This week', formatNaira(s.revenueWeek || 0, true)],
          ['This month', formatNaira(s.revenueMonth || 0, true)],
          ['Transactions', Number(s.totalTransactions || 0).toLocaleString()],
        ].map(([label, value]) => (
          <View key={label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Breakdown</Text>
      <View style={styles.breakdownCard}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Gross revenue</Text>
          <Text style={styles.breakdownValue}>{formatNaira(s.totalRevenue || 0, true)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Gateway fees (estimated)</Text>
          <Text style={[styles.breakdownValue, { color: t.danger }]}>− {formatNaira(s.totalFees || 0, true)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Net revenue</Text>
          <Text style={styles.breakdownValue}>{formatNaira(s.netRevenue || 0, true)}</Text>
        </View>
        <View style={styles.breakdownTotalRow}>
          <Text style={styles.breakdownTotalLabel}>Distributable profit (50%)</Text>
          <Text style={styles.breakdownTotalValue}>{formatNaira(s.reinvestmentFund || 0, true)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={t.textSec} />
          <TextInput style={styles.searchInput} placeholder="Search by reference or email" placeholderTextColor={t.textTer} value={searchInput} onChangeText={setSearchInput} autoCapitalize="none" />
          {searchInput ? (
            <Pressable onPress={() => setSearchInput('')} accessibilityLabel="Clear search" hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={t.textSec} />
            </Pressable>
          ) : null}
        </View>
        <Pressable style={({ pressed }) => [styles.exportButton, pressed && styles.pressed, !visible.length && { opacity: 0.5 }]} onPress={exportCsv} disabled={!visible.length} accessibilityLabel="Export transactions as CSV">
          <Ionicons name="download-outline" size={16} color={t.brandText} />
          <Text style={styles.exportText}>Export</Text>
        </Pressable>
      </View>

      {types.length > 1 ? (
        <View style={styles.chipRow}>
          <Chip label="All types" active={typeFilter === 'all'} onPress={() => setTypeFilter('all')} styles={styles} />
          {types.map((type) => (
            <Chip key={type} label={prettyType(type)} active={typeFilter === type} onPress={() => setTypeFilter(type)} styles={styles} />
          ))}
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={t.brand} /> : null}

      {!loading && visible.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="receipt-outline" size={32} color={t.textSec} />
          <Text style={styles.emptyText}>{search || typeFilter !== 'all' ? 'No transactions match these filters.' : 'No transactions yet.'}</Text>
        </View>
      ) : (
        visible.map((tx) => {
          const tone = statusTone(tx.status);
          const created = toDate(tx.created_at);
          return (
            <View key={tx.id || tx.transaction_id || tx.reference} style={styles.txCard}>
              <View style={styles.txHeader}>
                <Text style={styles.txType}>{prettyType(typeOf(tx))}</Text>
                <Text style={styles.txAmount}>{formatNaira(tx.amount || 0, true)}</Text>
              </View>
              <Text style={styles.txRef} selectable>{tx.customer_email || tx.user_id} · {tx.transaction_id || tx.reference}</Text>
              <View style={styles.txMetaRow}>
                <Text style={styles.txDate}>{created ? created.toLocaleString() : 'Date unknown'}</Text>
                <Text style={[styles.txStatus, { backgroundColor: tone.bg, color: tone.fg }]}>{(tx.status || 'unknown').toUpperCase()}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

/* ============================================================================
 * Styles
 * ========================================================================== */
const createPageStyles = (t) =>
  StyleSheet.create({
    root: { flex: 1 },
    pageScroll: { paddingBottom: 48 },
    pressed: { opacity: 0.75 },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 12, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: t.border },
    topBarMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    updatedText: { fontSize: 12, color: t.textTer, fontWeight: '600' },
    adminPill: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 200, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.success },
    adminPillText: { fontSize: 12, fontWeight: '700', color: t.textSec },
    refreshButton: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border },

    restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60 },
    restrictedTitle: { marginTop: 16, fontSize: 18, fontWeight: '800', color: t.text },
    restrictedText: { marginTop: 8, fontSize: 14, color: t.textSec, textAlign: 'center', lineHeight: 20 },

    workspace: { gap: 16 },
    workspaceWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },

    sidebarNav: { width: 236, gap: 18, paddingVertical: 4, ...(Platform.OS === 'web' ? { position: 'sticky', top: 12 } : {}) },
    mobileNav: { flexGrow: 0 },
    mobileNavContent: { alignItems: 'center', gap: 4, paddingBottom: 4, paddingRight: 8 },
    navSection: { gap: 4 },
    navSectionDivider: { marginLeft: 6, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: t.border },
    navSectionLabel: { paddingHorizontal: 10, marginBottom: 2, fontSize: 12, fontWeight: '700', color: t.textTer },
    navItems: { flexDirection: 'row', gap: 6 },
    navItemsWide: { gap: 1 },
    navItem: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 38, paddingHorizontal: 11, borderRadius: 10, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border },
    navItemWide: { width: '100%', backgroundColor: 'transparent', borderWidth: 0, paddingVertical: 8 },
    navItemActiveWide: { backgroundColor: t.brandLight },
    navItemActiveMobile: { backgroundColor: t.brand, borderColor: t.brand },
    navItemText: { fontSize: 13, fontWeight: '700', color: t.textSec },
    navItemTextWide: { flex: 1 },
    navItemTextActiveWide: { color: t.brandText, fontWeight: '800' },
    navItemTextActiveMobile: { color: t.onBrand },
    navBadge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: t.danger },
    navBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

    content: { flex: 1, minWidth: 0, gap: 16, width: '100%' },
    contentHeader: { gap: 2 },
    sectionEyebrow: { fontSize: 12, fontWeight: '700', color: t.textTer },
    sectionTitle: { fontSize: 22, fontWeight: '900', color: t.text },
    sectionDescription: { marginTop: 2, fontSize: 13, lineHeight: 19, color: t.textSec, maxWidth: 520 },

    supportCard: { alignItems: 'center', gap: 12, padding: 24, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
    supportIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.brandLight },
    supportTitle: { fontSize: 17, fontWeight: '800', color: t.text, textAlign: 'center' },
    supportText: { fontSize: 14, color: t.textSec, textAlign: 'center', lineHeight: 20, maxWidth: 380 },
    supportQueueRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    supportQueuePill: { minWidth: 92, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border },
    supportQueueValue: { fontSize: 18, fontWeight: '900', color: t.text },
    supportQueueLabel: { marginTop: 2, fontSize: 12, fontWeight: '700', color: t.textSec },
    primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.brand, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, marginTop: 4 },
    primaryButtonText: { color: t.onBrand, fontWeight: '800', fontSize: 14 },
  });

const createDashboardStyles = (t) =>
  StyleSheet.create({
    ...sharedStyles(t),
    container: { gap: 14 },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: t.dangerLight, borderWidth: 1, borderColor: t.danger },
    noticeText: { flex: 1, color: t.text, fontSize: 12, fontWeight: '700' },
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metricCard: { flexGrow: 1, flexBasis: '47%', minWidth: 145, padding: 14, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
    metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    metricIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: t.brandLight },
    metricValue: { marginTop: 12, fontSize: 26, fontWeight: '900', color: t.text },
    metricLabel: { marginTop: 2, fontSize: 13, fontWeight: '800', color: t.text },
    metricDetail: { marginTop: 3, fontSize: 12, color: t.textSec, lineHeight: 16 },
    panel: { padding: 14, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, gap: 8 },
    panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    panelTitle: { fontSize: 15, fontWeight: '900', color: t.text },
    linkText: { fontSize: 13, fontWeight: '800', color: t.brand },
    allClear: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    allClearText: { color: t.textSec, fontSize: 13, fontWeight: '600' },
    queueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: t.border },
    queueLabel: { color: t.textSec, fontSize: 14, fontWeight: '600' },
    queueCount: { minWidth: 30, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignItems: 'center', backgroundColor: t.surface2 },
    queueCountActive: { backgroundColor: t.dangerLight },
    queueValue: { color: t.textSec, fontSize: 13, fontWeight: '800' },
    queueValueActive: { color: t.danger },
    operationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    operationItem: { flexGrow: 1, flexBasis: '47%', minWidth: 140, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: 12, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border },
    operationCopy: { flex: 1 },
    operationLabel: { color: t.textSec, fontSize: 12, fontWeight: '700' },
    operationValue: { marginTop: 2, color: t.text, fontSize: 15, fontWeight: '900' },
  });

const createListingStyles = (t) =>
  StyleSheet.create({
    ...sharedStyles(t),
    wrap: { gap: 12 },
    toggleContainer: { flexDirection: 'row', backgroundColor: t.surface2, borderRadius: 13, borderWidth: 1, borderColor: t.border, padding: 4, gap: 6 },
    toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 12 },
    toggleActive: { backgroundColor: t.brand },
    toggleText: { fontSize: 13, fontWeight: '700', color: t.textSec },
    toggleTextActive: { color: t.onBrand },
    toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
    searchInput: { flex: 1, fontSize: 14, color: t.text, paddingVertical: 0 },
    resultCount: { fontSize: 12, color: t.textTer, fontWeight: '600' },
    centerBox: { paddingVertical: 48, alignItems: 'center', gap: 10 },
    emptyText: { fontSize: 14, fontWeight: '700', color: t.textSec, textAlign: 'center' },
    retryText: { fontSize: 13, fontWeight: '700', color: t.brand },
    list: { gap: 10 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.card, borderRadius: 14, borderWidth: 1, borderColor: t.border, padding: 12 },
    thumb: { width: 54, height: 54, borderRadius: 10, backgroundColor: t.brandLight },
    thumbFallback: { width: 54, height: 54, borderRadius: 10, backgroundColor: t.brandLight, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0 },
    title: { fontSize: 14, fontWeight: '800', color: t.text },
    price: { marginTop: 2, fontSize: 13, fontWeight: '700', color: t.success },
    owner: { marginTop: 2, fontSize: 12, color: t.textSec },
    sponsoredBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: t.warningLight },
    sponsoredText: { color: t.warning, fontSize: 11, fontWeight: '800' },
    actions: { flexDirection: 'row', gap: 6 },
    iconButton: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    viewButton: { backgroundColor: t.brandLight },
    promoteButton: { backgroundColor: t.warningLight },
    deleteButton: { backgroundColor: t.dangerLight },
  });

const createUserStyles = (t) =>
  StyleSheet.create({
    ...sharedStyles(t),
    container: { gap: 14 },
    statsRow: { flexDirection: 'row', gap: 8 },
    statCard: { flex: 1, padding: 11, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.border },
    statValue: { color: t.success, fontSize: 18, fontWeight: '900' },
    statLabel: { marginTop: 2, color: t.textSec, fontSize: 11, fontWeight: '700' },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
    searchInput: { flex: 1, fontSize: 14, color: t.text, paddingVertical: 0 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    loadingWrap: { gap: 12, paddingVertical: 20 },
    skeleton: { height: 72, borderRadius: 14, backgroundColor: t.border },
    list: { gap: 8 },
    resultCount: { fontSize: 12, color: t.textTer, fontWeight: '600', marginBottom: 2 },
    card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: t.card, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 12 },
    cardPressed: { opacity: 0.9 },
    cardActions: { alignItems: 'flex-end', gap: 7, marginLeft: 4, flexShrink: 0, maxWidth: 118 },
    avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: t.brandLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImage: { width: 44, height: 44 },
    avatarText: { fontWeight: '800', fontSize: 16, color: t.brandText },
    body: { flex: 1, minWidth: 0 },
    name: { fontSize: 14, fontWeight: '800', color: t.text },
    email: { fontSize: 12, color: t.textSec, marginTop: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: t.brandLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    metaChipText: { fontSize: 11, fontWeight: '700', color: t.brandText },
    school: { fontSize: 11, color: t.textSec, flex: 1 },
    referralBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, backgroundColor: t.brandLight, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start', maxWidth: '100%' },
    referralBadgeText: { flexShrink: 1, fontSize: 11, color: t.brandText, fontWeight: '700' },
    blockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    blockedBadgeText: { fontSize: 11, color: t.danger, fontWeight: '700' },
    premiumInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, maxWidth: '100%' },
    premiumInfoText: { flex: 1, fontSize: 11, color: t.warning, fontWeight: '700' },
    adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: t.brandLight, borderWidth: 1, borderColor: t.brandBorder, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
    adminBadgeText: { fontSize: 11, fontWeight: '800', color: t.brandText },
    premiumButton: { minWidth: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: t.warningLight, borderWidth: 1, borderColor: t.warning },
    premiumButtonText: { color: t.warning, fontSize: 11, fontWeight: '800', textAlign: 'center' },
    syncButton: { minWidth: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: t.brandLight, borderWidth: 1, borderColor: t.brand },
    syncButtonText: { color: t.brandText, fontSize: 11, fontWeight: '800', textAlign: 'center' },
    actionButton: { minWidth: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
    blockButton: { backgroundColor: t.danger },
    unblockButton: { backgroundColor: t.success },
    actionButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    loadMore: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface2, marginTop: 4 },
    loadMoreText: { color: t.brandText, fontWeight: '800', fontSize: 13 },
    emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 14, color: t.textSec, fontWeight: '600' },
  });