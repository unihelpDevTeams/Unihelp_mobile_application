import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
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

const DOWNLOADABLE_TYPES = [
  { key: 'flashcards', label: 'Flashcards', icon: 'albums-outline' },
  { key: 'challenge', label: 'Challenges', icon: 'flash-outline' },
  { key: 'pastQuestions', label: 'Past Questions', icon: 'clipboard-outline' },
  { key: 'formulas', label: 'Formulas', icon: 'calculator-outline' },
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
  const [downloads, setDownloads] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);
  const [entitlement, setEntitlement] = useState(null);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const styles = useThemeStyles((c, s, r) => ({
    section: { marginBottom: s.lg, backgroundColor: c.card, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault, padding: s.md },
    hero: { gap: s.sm, backgroundColor: c.brandLight, borderColor: c.brandBorder },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md },
    title: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
    subtitle: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18 },
    summaryRow: { flexDirection: 'row', gap: s.sm, marginTop: s.md },
    summaryCard: { flex: 1, padding: s.md, borderRadius: r.lg, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault },
    summaryLabel: { fontSize: 11, fontWeight: '800', color: c.textSecondary },
    summaryValue: { marginTop: 4, fontWeight: '900', fontSize: 20, color: c.textPrimary },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: s.sm, borderBottomWidth: 1, borderBottomColor: c.borderDefault, gap: s.sm },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: s.sm, flex: 1 },
    rowText: { fontWeight: '800', color: c.textPrimary },
    rowMeta: { fontSize: 11.5, color: c.textSecondary, marginTop: 2 },
    iconWrap: { width: 34, height: 34, borderRadius: r.md, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    badge: { paddingHorizontal: s.sm, paddingVertical: 6, borderRadius: r.full, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
    badgeText: { fontSize: 10, fontWeight: '900', color: c.brandText },
    actionButton: { marginTop: s.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: r.full, backgroundColor: c.brand, paddingVertical: s.md },
    actionText: { fontWeight: '900', color: c.onBrand },
    empty: { padding: s.lg, borderRadius: r.lg, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', gap: s.xs },
    dangerText: { color: c.red, fontWeight: '800' },
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

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

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
    try {
      await syncQueuedLearningActions();
      await loadData();
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async (type, id) => {
    await removeDownload(type, id);
    await loadData();
  };

  const handleClear = () => {
    Alert.alert('Clear offline content?', 'Downloaded content will be removed, but your study progress and scores remain.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearOfflineDownloads(); await loadData(); } },
    ]);
  };

  const premiumText = accessAllowed
    ? 'Premium active. Your saved learning materials are available inside UniHelp.'
    : entitlement?.premium === false || !profile?.premium
      ? 'Available with UniHelp Premium.'
      : 'Premium needs to be validated online before offline access.';

  return (
    <ScreenShell title="Offline Library" subtitle="Premium saved learning materials" showBack scrollable>
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      ) : (
        <>
          <View style={[styles.section, styles.hero]}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{accessAllowed ? 'Offline Library available' : 'Offline Library locked'}</Text>
              <Ionicons name={accessAllowed ? 'checkmark-circle' : 'lock-closed'} size={22} color={accessAllowed ? colors.green : colors.brand} />
            </View>
            <Text style={styles.subtitle}>{premiumText}</Text>
            {!accessAllowed ? (
              <Pressable style={styles.actionButton} onPress={() => router.push('/premium')}>
                <Ionicons name="star-outline" size={16} color={colors.onBrand} />
                <Text style={styles.actionText}>View Premium</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>Offline Storage</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}><Text style={styles.summaryLabel}>RESOURCES</Text><Text style={styles.summaryValue}>{summary.totalDownloaded}</Text></View>
              <View style={styles.summaryCard}><Text style={styles.summaryLabel}>USED</Text><Text style={styles.summaryValue}>{formatSize(summary.totalSize)}</Text></View>
              <View style={styles.summaryCard}><Text style={styles.summaryLabel}>SYNC</Text><Text style={styles.summaryValue}>{summary.syncPending}</Text></View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.title}>Categories</Text>
            {DOWNLOADABLE_TYPES.map((type) => (
              <View key={type.key} style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconWrap}><Ionicons name={type.icon} size={18} color={colors.brand} /></View>
                  <View>
                    <Text style={styles.rowText}>{type.label}</Text>
                    <Text style={styles.rowMeta}>{summary.totals[type.key] || 0} saved</Text>
                  </View>
                </View>
                <View style={styles.badge}><Text style={styles.badgeText}>{summary.totals[type.key] ? 'Saved' : 'None'}</Text></View>
              </View>
            ))}
            <Pressable style={styles.actionButton} onPress={handleSync} disabled={syncing}>
              {syncing ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name="sync-outline" size={16} color={colors.onBrand} />}
              <Text style={styles.actionText}>{syncing ? 'Syncing...' : 'Sync study progress'}</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Saved Resources</Text>
              {downloads.length ? <Pressable onPress={handleClear}><Text style={styles.dangerText}>Clear</Text></Pressable> : null}
            </View>
            {downloads.length ? (
              downloads.map((item) => (
                <Pressable
                  key={`${item.type}-${item.id}`}
                  style={styles.row}
                  disabled={!accessAllowed || item.status !== 'downloaded'}
                  onPress={() => router.push({ pathname: '/offline-resource/[type]/[id]', params: { type: item.type, id: item.id } })}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.iconWrap}><Ionicons name={item.status === 'failed' ? 'alert-circle-outline' : 'cloud-done-outline'} size={17} color={item.status === 'failed' ? colors.red : colors.green} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowText} numberOfLines={1}>{item.title || item.meta?.title || item.type}</Text>
                      <Text style={styles.rowMeta}>{item.status} - {formatSize(item.size)}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => handleRemove(item.type, item.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.red} />
                  </Pressable>
                </Pressable>
              ))
            ) : (
              <View style={styles.empty}>
                <Ionicons name="cloud-download-outline" size={26} color={colors.textSecondary} />
                <Text style={styles.rowText}>No saved offline resources yet</Text>
                <Text style={styles.rowMeta}>Open a resource and choose Save for Offline.</Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScreenShell>
  );
}
