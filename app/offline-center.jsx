import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import ScreenShell from '../src/shared/components/ScreenShell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';
import {
  clearOfflineDownloads,
  getDownloadRecords,
  getOfflineEntitlement,
  getSyncQueue,
  hasOfflineLibraryAccess,
  removeDownload,
  syncQueuedLearningActions,
  validateOfflineEntitlement,
} from '../src/shared/offline/offlineLearningService';
import { isPremiumActive } from '../src/shared/services/premium';

const DOWNLOADABLE_TYPES = [
  { key: 'pastQuestions', label: 'Past Questions', icon: 'clipboard-outline' },
  { key: 'notes', label: 'Notes & Study Materials', icon: 'document-text-outline' },
];

const formatSize = (bytes = 0) => {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function OfflineCenterScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const { isConnected } = useNetInfo();
  const [downloads, setDownloads] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);
  const [entitlement, setEntitlement] = useState(null);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [removingIds, setRemovingIds] = useState({});

  const styles = useThemeStyles((c, s, r) => ({
    container: {
      gap: s.lg,
      paddingBottom: s.xl,
    },
    // Hero Status Card
    heroCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: accessAllowed ? (c.brandBorder || c.borderDefault) : c.borderDefault,
      padding: s.lg,
      gap: s.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroIconContainer: {
      width: 48,
      height: 48,
      borderRadius: r.lg,
      backgroundColor: accessAllowed ? (c.brandLight || c.surfaceSecondary) : c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: s.sm,
      paddingVertical: 4,
      borderRadius: r.full,
      backgroundColor: accessAllowed ? (c.brandLight || c.surfaceSecondary) : c.surfaceSecondary,
      borderWidth: 1,
      borderColor: accessAllowed ? (c.brandBorder || c.borderDefault) : c.borderDefault,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: accessAllowed ? c.brand : c.textSecondary,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    heroSubtitle: {
      fontSize: 13.5,
      color: c.textSecondary,
      lineHeight: 20,
    },
    premiumCTA: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.xs,
      borderRadius: r.lg,
      backgroundColor: c.brand,
      paddingVertical: s.md,
      marginTop: s.xs,
    },
    premiumCTAText: {
      fontWeight: '800',
      fontSize: 14,
      color: c.onBrand,
    },

    // Section Titles
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.sm,
      paddingHorizontal: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    clearText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.red,
    },

    // Mini Dashboard / Storage Metrics
    statsGrid: {
      flexDirection: 'row',
      gap: s.sm,
    },
    statCard: {
      flex: 1,
      padding: s.md,
      borderRadius: r.xl,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      gap: s.xs,
    },
    statIconWrap: {
      width: 30,
      height: 30,
      borderRadius: r.md,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 19,
      fontWeight: '900',
      color: c.textPrimary,
      marginTop: 2,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
    },

    // Category Section
    categoryCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      overflow: 'hidden',
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: s.md,
      paddingVertical: s.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderDefault,
    },
    categoryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      flex: 1,
    },
    categoryIconWrap: {
      width: 36,
      height: 36,
      borderRadius: r.lg,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
    },
    categoryMeta: {
      fontSize: 11.5,
      color: c.textSecondary,
      marginTop: 1,
    },
    categoryPill: {
      paddingHorizontal: s.sm,
      paddingVertical: 3,
      borderRadius: r.md,
      backgroundColor: c.surfaceSecondary,
    },
    categoryPillActive: {
      backgroundColor: c.brandLight || c.surfaceSecondary,
    },
    categoryPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    categoryPillTextActive: {
      color: c.brandText || c.brand,
    },

    // Sync Action
    syncButton: {
      margin: s.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.xs,
      borderRadius: r.lg,
      backgroundColor: c.brand,
      paddingVertical: s.md,
    },
    syncButtonDisabled: {
      opacity: 0.65,
    },
    syncText: {
      fontWeight: '800',
      fontSize: 14,
      color: c.onBrand,
    },

    // Saved Resources List
    resourceCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      overflow: 'hidden',
    },
    resourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: s.md,
      paddingVertical: s.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderDefault,
      gap: s.sm,
    },
    resourceRowDisabled: {
      opacity: 0.5,
    },
    resourceLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      flex: 1,
    },
    statusIconWrap: {
      width: 34,
      height: 34,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resourceTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.textPrimary,
    },
    resourceMeta: {
      fontSize: 11.5,
      color: c.textSecondary,
      marginTop: 2,
    },
    deleteBtn: {
      padding: s.xs,
      borderRadius: r.md,
    },

    // Empty State
    emptyCard: {
      padding: s.xl,
      borderRadius: r.xl,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      gap: s.xs,
    },
    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: s.xs,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: c.textPrimary,
    },
    emptySubtitle: {
      fontSize: 12.5,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 240,
    },

    loadingContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }));

  const loadData = useCallback(async () => {
    try {
      const [downloadList, queued, localEntitlement, allowed] = await Promise.all([
        getDownloadRecords(),
        getSyncQueue(),
        getOfflineEntitlement(),
        hasOfflineLibraryAccess(),
      ]);
      setDownloads(downloadList);
      setSyncQueue(queued);
      setEntitlement(localEntitlement);
      setAccessAllowed(allowed);
    } finally {
      setLoading(false);
    }
  }, []);

  const premiumUnlocked = isPremiumActive(profile);

  useEffect(() => {
    if (!premiumUnlocked) {
      router.replace('/premium');
      return;
    }
  }, [premiumUnlocked, router]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    refreshProfile?.().catch(() => {});
    validateOfflineEntitlement({ force: true }).catch(() => null).finally(loadData);
  }, [loadData, refreshProfile]);

  const summary = useMemo(() => {
    const totals = DOWNLOADABLE_TYPES.reduce((acc, item) => {
      acc[item.key] = downloads.filter((entry) => entry.type === item.key && entry.status === 'downloaded').length;
      return acc;
    }, {});
    return {
      totalDownloaded: downloads.filter((item) => item.status === 'downloaded').length,
      syncPending: syncQueue.length,
      totalSize: downloads.reduce((sum, item) => sum + Number(item.size || 0), 0),
      totals,
    };
  }, [downloads, syncQueue]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus('syncing');
    try {
      await syncQueuedLearningActions();
      setSyncStatus('success');
      await loadData();
    } catch (error) {
      setSyncStatus('error');
      Alert.alert('Sync failed', error?.message || 'We could not sync your offline study progress.');
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async (type, id) => {
    const key = `${type}-${id}`;
    setRemovingIds((current) => ({ ...current, [key]: true }));
    try {
      await removeDownload(type, id);
      setDownloads((current) => current.filter((item) => !(item.type === type && String(item.id) === String(id))));
      await loadData();
    } catch (error) {
      Alert.alert('Remove failed', error?.message || 'We could not remove this saved item.');
    } finally {
      setRemovingIds((current) => ({ ...current, [key]: false }));
    }
  };

  const handleClear = () => {
    Alert.alert('Clear offline content?', 'Downloaded content will be removed, but your study progress and scores remain.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearOfflineDownloads(); await loadData(); } },
    ]);
  };

  const premiumText = accessAllowed
    ? isConnected === false
      ? 'You\'re offline — your saved resources are still available on this device.'
      : 'Your saved learning materials are ready for offline studying anytime.'
    : entitlement?.premium === false || !profile?.premium
      ? 'Save your favorite learning materials and study anywhere with UniHelp Premium.'
      : 'Premium status requires internet validation before granting offline access.';
  const statusText = isConnected === false ? 'Last synced: offline' : syncStatus === 'success' ? 'Last synced: just now' : 'Last synced: just now';

  const getTypeLabel = (typeKey) => {
    const found = DOWNLOADABLE_TYPES.find((t) => t.key === typeKey);
    return found ? found.label : typeKey;
  };

  if (!premiumUnlocked) {
    return (
      <ScreenShell title="Offline Library" subtitle="Premium saved learning materials" showBack scrollable>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Offline Library" subtitle="Your saved learning resources, available without internet." showBack scrollable>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      ) : (
        <View style={styles.container}>
          {/* 1. Hero Status Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIconContainer}>
                <Ionicons
                  name={accessAllowed ? 'cloud-done-outline' : 'cloud-offline-outline'}
                  size={26}
                  color={accessAllowed ? colors.brand : colors.textSecondary}
                />
              </View>
              <View style={styles.statusBadge}>
                <Ionicons
                  name={accessAllowed ? 'checkmark-circle' : 'lock-closed'}
                  size={13}
                  color={accessAllowed ? colors.green : colors.textSecondary}
                />
                <Text style={styles.statusBadgeText}>
                  {accessAllowed ? 'Ready' : 'Locked'}
                </Text>
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.heroTitle}>
                {accessAllowed ? 'Offline Library Active' : 'Offline Access Locked'}
              </Text>
              <Text style={styles.heroSubtitle}>{premiumText}</Text>
              <Text style={styles.heroSubtitle}>
                {isConnected === false ? 'You\'re offline — your saved resources are still available.' : statusText}
              </Text>
            </View>

            {!accessAllowed ? (
              <Pressable style={styles.premiumCTA} onPress={() => router.push('/premium')}>
                <Ionicons name="star" size={16} color={colors.onBrand} />
                <Text style={styles.premiumCTAText}>Unlock Premium</Text>
              </Pressable>
            ) : null}
          </View>

          {/* 2. Storage Statistics Dashboard */}
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overview</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="folder-open-outline" size={16} color={colors.brand} />
                </View>
                <Text style={styles.statValue}>{summary.totalDownloaded}</Text>
                <Text style={styles.statLabel}>Saved Items</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="pie-chart-outline" size={16} color={colors.brand} />
                </View>
                <Text style={styles.statValue}>{formatSize(summary.totalSize)}</Text>
                <Text style={styles.statLabel}>Storage Used</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconWrap}>
                  <Ionicons name="sync-outline" size={16} color={colors.brand} />
                </View>
                <Text style={styles.statValue}>{summary.syncPending}</Text>
                <Text style={styles.statLabel}>Pending Sync</Text>
              </View>
            </View>
          </View>

          {/* 3. Categories & Sync */}
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>
            <View style={styles.categoryCard}>
              {DOWNLOADABLE_TYPES.map((type, idx) => {
                const count = summary.totals[type.key] || 0;
                const isLast = idx === DOWNLOADABLE_TYPES.length - 1;
                return (
                  <View
                    key={type.key}
                    style={[styles.categoryRow, isLast ? { borderBottomWidth: 0 } : null]}
                  >
                    <View style={styles.categoryLeft}>
                      <View style={styles.categoryIconWrap}>
                        <Ionicons name={type.icon} size={18} color={colors.brand} />
                      </View>
                      <View>
                        <Text style={styles.categoryText}>{type.label}</Text>
                        <Text style={styles.categoryMeta}>
                          {count > 0 ? `${count} ${count === 1 ? 'item' : 'items'} saved` : 'No downloads'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.categoryPill, count > 0 ? styles.categoryPillActive : null]}>
                      <Text style={[styles.categoryPillText, count > 0 ? styles.categoryPillTextActive : null]}>
                        {count > 0 ? `${count} saved` : '0'}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* 4. Sync Button embedded nicely in category container footer */}
              <Pressable
                style={[styles.syncButton, syncing ? styles.syncButtonDisabled : null]}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Ionicons name="sync-outline" size={16} color={colors.onBrand} />
                )}
                <Text style={styles.syncText}>
                  {syncing ? 'Syncing...' : syncStatus === 'success' ? '✓ Synced' : syncStatus === 'error' ? 'Sync failed' : 'Sync'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 5. Saved Resources List */}
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved Resources</Text>
              {downloads.length > 0 ? (
                <Pressable onPress={handleClear} hitSlop={8}>
                  <Text style={styles.clearText}>Clear All</Text>
                </Pressable>
              ) : null}
            </View>

            {downloads.length > 0 ? (
              <View style={styles.resourceCard}>
                {downloads.map((item, idx) => {
                  const isDisabled = !accessAllowed || item.status !== 'downloaded';
                  const isLast = idx === downloads.length - 1;
                  const isFailed = item.status === 'failed';

                  return (
                    <Pressable
                      key={`${item.type}-${item.id}`}
                      style={[
                        styles.resourceRow,
                        isDisabled ? styles.resourceRowDisabled : null,
                        isLast ? { borderBottomWidth: 0 } : null,
                      ]}
                      disabled={isDisabled}
                      onPress={() =>
                        router.push({
                          pathname: '/offline-resource/[type]/[id]',
                          params: { type: item.type, id: item.id },
                        })
                      }
                    >
                      <View style={styles.resourceLeft}>
                        <View
                          style={[
                            styles.statusIconWrap,
                            {
                              backgroundColor: isFailed
                                ? colors.surfaceSecondary
                                : colors.brandLight || colors.surfaceSecondary,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isFailed ? 'alert-circle-outline' : 'checkmark-done-circle-outline'}
                            size={18}
                            color={isFailed ? colors.red : colors.green || colors.brand}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resourceTitle} numberOfLines={1}>
                            {item.title || item.meta?.title || item.type}
                          </Text>
                          <Text style={styles.resourceMeta}>
                            {getTypeLabel(item.type)} • {formatSize(item.size)}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleRemove(item.type, item.id)}
                        hitSlop={10}
                        disabled={!!removingIds[`${item.type}-${item.id}`]}
                      >
                        {removingIds[`${item.type}-${item.id}`] ? (
                          <ActivityIndicator size="small" color={colors.red} />
                        ) : (
                          <Ionicons name="trash-outline" size={17} color={colors.red} />
                        )}
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              /* 6. Polished Empty State */
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="cloud-download-outline" size={28} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>Nothing saved yet</Text>
                <Text style={styles.emptySubtitle}>
                  Open a learning resource and choose &#34;Save for Offline&#34; to study without internet access.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScreenShell>
  );
}