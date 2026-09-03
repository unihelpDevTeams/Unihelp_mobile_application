import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import ConfirmDialog from '../../src/shared/components/ConfirmDialog';
import { fetchDownloadedItems, deleteDownload } from '../../services/firestoreSync';

export default function DownloadsScreen() {
  const router = useRouter();
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadDownloads = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchDownloadedItems();
      setDownloads(items || []);
    } catch {
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const handleDelete = (item) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDownload(deleteTarget.id);
      setDownloads((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      Alert.alert('Error', 'Could not delete the download.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpen = (item) => {
    router.navigate({ pathname: '/view/[type]/[id]', params: { type: item.type, id: item.id } });
  };

  const totalSize = downloads.reduce((sum, item) => sum + (item.size || 0), 0);
  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderDownload = ({ item }) => {
    const typeColor = item.type === 'note' ? colors.brand : item.type === 'question' ? colors.blue : colors.teal;
    return (
      <View style={styles.downloadCard}>
        <View style={styles.downloadHeader}>
          <View style={[styles.downloadIcon, { backgroundColor: `${typeColor}15` }]}>
            <Ionicons
              name={item.type === 'note' ? 'document-text-outline' : item.type === 'question' ? 'clipboard-outline' : 'videocam-outline'}
              size={20}
              color={typeColor}
            />
          </View>
          <View style={styles.downloadInfo}>
            <Text style={styles.downloadTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.downloadMeta}>{formatSize(item.size)} • {item.downloadDate || 'Recently'}</Text>
          </View>
          <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.red} />
          </Pressable>
        </View>
        <Pressable
          style={({ pressed }) => [styles.openButton, pressed && styles.openButtonPressed]}
          onPress={() => handleOpen(item)}
        >
          <Text style={styles.openButtonText}>Open {item.type === 'note' ? 'PDF' : 'File'}</Text>
        </Pressable>
      </View>
    );
  };

  const headerContent = downloads.length > 0 ? (
    <View style={styles.storageCard}>
      <View style={styles.storageHeader}>
        <View style={styles.storageIcon}>
          <Ionicons name="download-outline" size={20} color={colors.brand} />
        </View>
        <Text style={styles.storageTitle}>Storage</Text>
      </View>
      <View style={styles.storageBar}>
        <View style={[styles.storageFill, { width: `${Math.min((totalSize / 100000000) * 100, 100)}%` }]} />
      </View>
      <Text style={styles.storageText}>{formatSize(totalSize)} used • Available offline</Text>
    </View>
  ) : null;

  return (
    <ScreenShell title="Downloads" subtitle="Access your offline study materials" showBack>
      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title="Delete download?"
        message={deleteTarget ? `Remove "${deleteTarget.title}" from your downloads?` : ''}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      {headerContent}

      {loading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : downloads.length ? (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          renderItem={renderDownload}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title="No downloads yet"
          description="Download lecture notes, videos, and questions for offline access."
          illustration="downloads"
          actionLabel="Browse notes"
          onAction={() => router.navigate('/(tabs)/lectureNotes')}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  storageCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  storageIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  storageBar: {
    height: 8,
    backgroundColor: colors.canvasLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  storageFill: {
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 4,
  },
  storageText: {
    fontSize: 12,
    color: colors.grey,
  },
  list: {
    paddingBottom: spacing['3xl'],
  },
  loadingContainer: {
    gap: spacing.md,
  },
  skeletonCard: {
    height: 100,
    backgroundColor: colors.skeleton,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  downloadCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  downloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  downloadIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  downloadMeta: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 2,
  },
  openButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.md,
  },
  openButtonPressed: {
    opacity: 0.8,
  },
  openButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandText,
  },
});
