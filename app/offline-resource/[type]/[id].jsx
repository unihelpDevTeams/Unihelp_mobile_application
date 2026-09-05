import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../../src/shared/components/ScreenShell';
import FormulaMath from '../../../src/shared/components/FormulaMath';
import { useTheme } from '../../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../../src/shared/theme/createStyles';
import { getDownloadRecord, hasOfflineLibraryAccess, removeDownload } from '../../../src/shared/offline/offlineLearningService';

const PAGE_SIZE = 10;

const normalizeParam = (value) => (Array.isArray(value) ? value[0] : value);

const TYPE_CONFIG = {
  pastQuestions: { label: 'Past Questions', icon: 'clipboard-outline' },
  notes: { label: 'Notes & Study Materials', icon: 'document-text-outline' },
};

export default function OfflineResourceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = normalizeParam(params.type);
  const id = normalizeParam(params.id);
  const { colors } = useTheme();
  
  const [record, setRecord] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [readerError, setReaderError] = useState(false);

  const flatListRef = useRef(null);

  const styles = useThemeStyles((c, s, r) => ({
    lockCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.xl,
      alignItems: 'center',
      gap: s.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    lockIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.brandLight || c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockTitle: {
      color: c.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    lockText: {
      color: c.textSecondary,
      fontSize: 13.5,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 280,
    },
    actionButton: {
      marginTop: s.xs,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.xs,
      borderRadius: r.lg,
      backgroundColor: c.brand,
      paddingVertical: s.md,
      paddingHorizontal: s.xl,
      width: '100%',
    },
    actionText: {
      color: c.onBrand,
      fontWeight: '800',
      fontSize: 14,
    },

    // Resource Summary Header Banner
    metaCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
      marginBottom: s.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    metaLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      flex: 1,
    },
    metaIconWrap: {
      width: 40,
      height: 40,
      borderRadius: r.lg,
      backgroundColor: c.brandLight || c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metaTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.textPrimary,
    },
    metaSubtitle: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    offlineBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: s.sm,
      paddingVertical: 4,
      borderRadius: r.full,
      backgroundColor: c.brandLight || c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.brandBorder || c.borderDefault,
    },
    offlineBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.brand,
    },
    deleteBtn: {
      width: 36,
      height: 36,
      borderRadius: r.lg,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: deleting ? 0.5 : 1,
    },

    // Content Cards
    listContainer: {
      gap: s.md,
      paddingBottom: s.xl,
    },
    studyCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      gap: s.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemBadge: {
      paddingHorizontal: s.sm,
      paddingVertical: 2,
      borderRadius: r.md,
      backgroundColor: c.surfaceSecondary,
    },
    itemBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textSecondary,
    },
    cardMainTitle: {
      color: c.textPrimary,
      fontWeight: '800',
      fontSize: 15.5,
      lineHeight: 22,
    },

    // Formula Box
    formulaBox: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.lg,
      padding: s.md,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formulaLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textSecondary,
      marginBottom: s.xs,
      alignSelf: 'flex-start',
    },

    // Answers / Options Grid
    optionsContainer: {
      gap: s.xs,
      marginTop: s.xs,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: s.sm,
      padding: s.md,
      borderRadius: r.lg,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    optionIndex: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.brandLight || c.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    optionIndexText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.brand,
    },
    optionText: {
      flex: 1,
      fontSize: 13.5,
      color: c.textPrimary,
      lineHeight: 20,
    },

    // Explanation Box
    explanationBox: {
      backgroundColor: c.brandLight || c.surfaceSecondary,
      borderRadius: r.lg,
      padding: s.md,
      borderWidth: 1,
      borderColor: c.brandBorder || c.borderDefault,
      gap: 4,
    },
    explanationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    explanationTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.brandText || c.brand,
    },
    explanationText: {
      fontSize: 13,
      color: c.textPrimary,
      lineHeight: 19,
    },

    // Pagination Footer
    paginationContainer: {
      marginTop: s.sm,
      marginBottom: s.xl,
      gap: s.sm,
    },
    progressBarBg: {
      height: 4,
      borderRadius: 2,
      backgroundColor: c.surfaceSecondary,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: c.brand,
      borderRadius: 2,
    },
    paginationControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.xs,
    },
    pageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: s.sm,
      paddingHorizontal: s.md,
      borderRadius: r.lg,
    },
    pageBtnDisabled: {
      opacity: 0.35,
    },
    pageBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
    },
    pageIndicator: {
      fontSize: 12.5,
      fontWeight: '800',
      color: c.textSecondary,
    },

    // Webview Container
    webviewWrap: {
      flex: 1,
      minHeight: 520,
      overflow: 'hidden',
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      backgroundColor: c.card,
    },

    // Loading Skeletons
    loadingWrap: {
      gap: s.md,
      paddingVertical: s.md,
    },
    skeletonHeader: {
      height: 64,
      borderRadius: r.xl,
      backgroundColor: c.surfaceSecondary,
    },
    skeletonCard: {
      height: 180,
      borderRadius: r.xl,
      backgroundColor: c.surfaceSecondary,
    },
  }));

  const load = useCallback(async () => {
    try {
      const [download, access] = await Promise.all([getDownloadRecord(type, id), hasOfflineLibraryAccess()]);
      if (download?.localReference) {
        const localFile = await FileSystem.getInfoAsync(download.localReference);
        if (!localFile.exists) {
          await removeDownload(type, id);
          setRecord(null);
        } else {
          setRecord(download);
        }
      } else {
        setRecord(download);
      }
      setAllowed(access);
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteOffline = useCallback(() => {
    Alert.alert(
      'Remove from Offline Library',
      `Remove "${record?.title || 'this resource'}" from UniHelp Offline Library? You can save it again later.`,
      [
        { text: 'Keep', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            setDeleting(true);
            try {
              await removeDownload(type, id);
              Alert.alert(
                'Removed',
                'Removed from Offline Library.',
                [{ text: 'OK', onPress: () => router.back() }],
              );
            } catch (error) {
              Alert.alert('Error', error?.message || 'Failed to delete offline copy. Please try again.');
              setDeleting(false);
            }
          },
          style: 'destructive',
        },
      ],
    );
  }, [record?.title, type, id, router]);

  const items = useMemo(() => {
    const payload = record?.payload;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') return [payload];
    return [];
  }, [record?.payload]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const typeMeta = TYPE_CONFIG[type] || { label: 'Resource', icon: 'document-text-outline' };

  if (loading) {
    return (
      <ScreenShell title="Offline Reader" subtitle="Loading saved resource" showBack>
        <View style={styles.loadingWrap}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
        </View>
      </ScreenShell>
    );
  }

  if (!allowed) {
    return (
      <ScreenShell title="Premium Expired" subtitle="Offline access unavailable" showBack>
        <View style={styles.lockCard}>
          <View style={styles.lockIconWrap}>
            <Ionicons name="lock-closed" size={28} color={colors.brand} />
          </View>
          <Text style={styles.lockTitle}>Offline Library Locked</Text>
          <Text style={styles.lockText}>
            Your Premium access needs to be renewed before your saved offline materials can be opened.
          </Text>
          <Pressable style={styles.actionButton} onPress={() => router.navigate('/premium')}>
            <Ionicons name="star" size={16} color={colors.onBrand} />
            <Text style={styles.actionText}>Renew Premium</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  if (!record) {
    return (
      <ScreenShell title="Offline Reader" subtitle="Resource unavailable" showBack>
        <View style={styles.lockCard}>
          <View style={styles.lockIconWrap}>
            <Ionicons name="cloud-offline-outline" size={28} color={colors.textSecondary} />
          </View>
          <Text style={styles.lockTitle}>Offline Copy Unavailable</Text>
          <Text style={styles.lockText}>The saved resource could not be found on this device.</Text>
        </View>
      </ScreenShell>
    );
  }

  if (record.localReference) {
    if (readerError) {
      return (
        <ScreenShell title="Offline Reader" subtitle="Resource unavailable" showBack>
          <View style={styles.lockCard}>
            <Ionicons name="alert-circle-outline" size={30} color={colors.textSecondary} />
            <Text style={styles.lockTitle}>Could not open this resource</Text>
            <Text style={styles.lockText}>The private offline copy appears to be damaged. Return to the resource and save it again.</Text>
            <Pressable style={styles.actionButton} onPress={() => router.back()}>
              <Text style={styles.actionText}>Return to resource</Text>
            </Pressable>
          </View>
        </ScreenShell>
      );
    }
    return (
      <ScreenShell title={record.title || 'Offline Document'} subtitle="UniHelp Reader" showBack scrollable={false}>
        <View style={styles.webviewWrap}>
          <WebView
            source={{ uri: record.localReference }}
            style={styles.webview}
            originWhitelist={['file://*']}
            allowFileAccess
            onLoad={() => setReaderError(false)}
            onError={() => setReaderError(true)}
          />
        </View>
      </ScreenShell>
    );
  }

  const renderHeader = () => (
    <View style={styles.metaCard}>
      <View style={styles.metaLeft}>
        <View style={styles.metaIconWrap}>
          <Ionicons name={typeMeta.icon} size={20} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.metaTitle} numberOfLines={1}>{record.title || 'Saved Content'}</Text>
          <Text style={styles.metaSubtitle}>
            {typeMeta.label} • {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={styles.offlineBadge}>
          <Ionicons name="checkmark-circle" size={12} color={colors.brand} />
          <Text style={styles.offlineBadgeText}>Offline</Text>
        </View>
        <Pressable
          style={styles.deleteBtn}
          onPress={handleDeleteOffline}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Remove from Offline Library"
        >
          {deleting ? (
            <ActivityIndicator size={16} color={colors.textSecondary} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (items.length <= PAGE_SIZE) return null;
    const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.paginationControls}>
          <Pressable
            style={[styles.pageBtn, currentPage === 1 ? styles.pageBtnDisabled : null]}
            disabled={currentPage === 1}
            onPress={() => handlePageChange(currentPage - 1)}
            accessibilityRole="button"
            accessibilityLabel="Previous page"
          >
            <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
            <Text style={styles.pageBtnText}>Previous</Text>
          </Pressable>

          <Text style={styles.pageIndicator}>
            {currentPage} / {totalPages}
          </Text>

          <Pressable
            style={[styles.pageBtn, currentPage === totalPages ? styles.pageBtnDisabled : null]}
            disabled={currentPage === totalPages}
            onPress={() => handlePageChange(currentPage + 1)}
            accessibilityRole="button"
            accessibilityLabel="Next page"
          >
            <Text style={styles.pageBtnText}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderItem = ({ item, index }) => {
    const globalIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
    const titleText = item.title || item.prompt || item.question || item.subject || `Item ${globalIndex}`;

    return (
      <View style={styles.studyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.itemBadge}>
            <Text style={styles.itemBadgeText}>#{globalIndex}</Text>
          </View>
        </View>

        <Text style={styles.cardMainTitle}>{titleText}</Text>

        {item.formula ? (
          <View style={styles.formulaBox}>
            <Text style={styles.formulaLabel}>FORMULA</Text>
            <FormulaMath source={item.formula} color={colors.textPrimary} backgroundColor="transparent" />
          </View>
        ) : null}

        {Array.isArray(item.answers) && item.answers.length > 0 ? (
          <View style={styles.optionsContainer}>
            {item.answers.map((ans, aIdx) => {
              const optionLetter = String.fromCharCode(65 + aIdx);
              return (
                <View key={aIdx} style={styles.optionRow}>
                  <View style={styles.optionIndex}>
                    <Text style={styles.optionIndexText}>{optionLetter}</Text>
                  </View>
                  <Text style={styles.optionText}>{ans}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {item.explanation ? (
          <View style={styles.explanationBox}>
            <View style={styles.explanationHeader}>
              <Ionicons name="information-circle-outline" size={15} color={colors.brandText || colors.brand} />
              <Text style={styles.explanationTitle}>Explanation</Text>
            </View>
            <Text style={styles.explanationText}>{item.explanation}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenShell title={record.title || 'Offline Resource'} subtitle={typeMeta.label} showBack>
      <FlatList
        ref={flatListRef}
        data={paginatedItems}
        keyExtractor={(item, index) => String(item.id || item.title || index)}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </ScreenShell>
  );
}