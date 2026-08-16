import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import ScreenShell from '../src/shared/components/ScreenShell';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';
import { getDownloadRecords, getSyncQueue, syncQueuedLearningActions, removeDownload } from '../src/shared/offline/offlineLearningService';

const DOWNLOADABLE_TYPES = [
  { key: 'flashcards', label: 'Flashcards', icon: 'albums-outline' },
  { key: 'challenge', label: 'Challenges', icon: 'flash-outline' },
  { key: 'pastQuestions', label: 'Past Questions', icon: 'clipboard-outline' },
  { key: 'formulas', label: 'Formulas', icon: 'calculator-outline' },
  { key: 'notes', label: 'Study Materials', icon: 'document-text-outline' },
];

export default function OfflineCenterScreen() {
  const { colors } = useTheme();
  const [downloads, setDownloads] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const styles = useThemeStyles((c, s, r) => ({
    section: { marginBottom: s.lg, backgroundColor: c.card, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault, padding: s.md },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md },
    title: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
    summaryRow: { flexDirection: 'row', gap: s.sm, marginBottom: s.md },
    summaryCard: { flex: 1, padding: s.md, borderRadius: r.xl, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault },
    summaryLabel: { fontSize: 11, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.8 },
    summaryValue: { marginTop: 4, fontWeight: '800', fontSize: 22, color: c.textPrimary },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: s.sm, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    rowText: { fontWeight: '700', color: c.textPrimary },
    rowMeta: { fontSize: 11, color: c.textSecondary },
    badge: { paddingHorizontal: s.sm, paddingVertical: 6, borderRadius: r.full, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
    badgeText: { fontSize: 10, fontWeight: '800', color: c.brandText },
    actionButton: { marginTop: s.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: r.full, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder, paddingVertical: s.md },
    actionText: { fontWeight: '800', color: c.brandText },
    empty: { padding: s.lg, borderRadius: r.xl, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center' },
  }));

  const loadData = useCallback(async () => {
    try {
      const [downloadList, queued] = await Promise.all([getDownloadRecords(), getSyncQueue()]);
      setDownloads(downloadList);
      setSyncQueue(queued);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => { loadData(); }, [loadData]);

  const summary = useMemo(() => {
    const totals = DOWNLOADABLE_TYPES.reduce((acc, item) => {
      acc[item.key] = downloads.filter((entry) => entry.type === item.key).length;
      return acc;
    }, {});

    return {
      totalDownloaded: downloads.filter((item) => item.status === 'downloaded').length,
      syncPending: syncQueue.length,
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

  return (
    <ScreenShell title="Offline / Downloads" subtitle="Study content saved for offline use." showBack scrollable>
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Offline Study</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>DOWNLOADED</Text>
                <Text style={styles.summaryValue}>{summary.totalDownloaded}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>SYNC QUEUE</Text>
                <Text style={styles.summaryValue}>{summary.syncPending}</Text>
              </View>
            </View>

            {DOWNLOADABLE_TYPES.map((type) => (
              <View key={type.key} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Ionicons name={type.icon} size={18} color={colors.brand} />
                  <View>
                    <Text style={styles.rowText}>{type.label}</Text>
                    <Text style={styles.rowMeta}>{summary.totals[type.key] || 0} saved</Text>
                  </View>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{summary.totals[type.key] ? 'Saved' : 'None'}</Text>
                </View>
              </View>
            ))}

            <Pressable style={styles.actionButton} onPress={handleSync} disabled={syncing}>
              <Ionicons name={syncing ? 'sync' : 'cloud-done-outline'} size={16} color={colors.brand} />
              <Text style={styles.actionText}>{syncing ? 'Syncing...' : 'Sync saved progress'}</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Saved downloads</Text>
            </View>
            {downloads.length ? (
              downloads.map((item) => (
                <View key={`${item.type}-${item.id}`} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="download-outline" size={16} color={colors.green} />
                    <View>
                      <Text style={styles.rowText}>{item.type}</Text>
                      <Text style={styles.rowMeta}>{item.status} • {item.id}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => handleRemove(item.type, item.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.red} />
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.empty}>
                <Ionicons name="cloud-download-outline" size={26} color={colors.textSecondary} />
                <Text style={styles.rowText}>No offline downloads yet</Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({});
