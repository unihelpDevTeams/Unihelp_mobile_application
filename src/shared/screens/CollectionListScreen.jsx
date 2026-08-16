import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing } from '../theme';
import SectionHeader from '../components/SectionHeader';
import CollectionCard from '../components/CollectionCard';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme/ThemeContext';

export default function CollectionListScreen({
  title,
  subtitle,
  items = [],
  loading = false,
  emptyTitle,
  emptyDescription,
  showBack = false,
  renderFooter,
  detailRoute,
  detailParams = (item) => ({ id: item.id }),
  titleKey,
  subtitleKey,
  actionLabel,
  onActionPress,
  renderHeader = null,
  renderFeatured = null,
  renderListFooter = null,
  pageSize = 0,
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => {
    if (!pageSize || items.length === 0) return 1;
    return Math.max(1, Math.ceil(items.length / pageSize));
  }, [items.length, pageSize]);

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  const visibleItems = useMemo(() => {
    if (!pageSize) return items;
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [currentPage, items, pageSize]);

  const buildRoute = (routeTemplate, params = {}) => {
    if (!routeTemplate) return null;
    return Object.entries(params).reduce(
      (result, [key, value]) => result.replace(`[${key}]`, String(value)),
      routeTemplate
    );
  };

  const styles = StyleSheet.create({
    pagination: {
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderDefault || '#E5E7EB',
      gap: spacing.sm,
    },
    pagerProgress: {
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.surfaceSecondary || '#F3F4F6',
      overflow: 'hidden',
    },
    pagerProgressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.brand || '#4F46E5',
    },
    pagerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    pageButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary || '#F3F4F6',
      borderWidth: 1,
      borderColor: colors.borderDefault || '#E5E7EB',
    },
    pageButtonDisabled: {
      opacity: 0.45,
    },
    pageButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary || '#111827',
    },
    pageIndicator: {
      minWidth: 72,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary || '#6B7280',
    },
  });

  const navEnabled = pageSize > 0 && items.length > pageSize;
  const progressPercent = navEnabled ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} actionLabel={actionLabel} onPress={onActionPress} />

      {renderHeader ? <View style={{ marginBottom: spacing.lg }}>{renderHeader}</View> : null}

      {renderFeatured ? <View style={{ marginBottom: spacing.lg }}>{renderFeatured}</View> : null}

      {visibleItems.length ? (
        visibleItems.map((item) => (
          <CollectionCard
            key={item.id || `${item.title || 'item'}-${item.subject || ''}`}
            item={item}
            titleKey={titleKey}
            subtitleKey={subtitleKey}
            onPress={() => {
              if (!detailRoute) return;
              router.push(buildRoute(detailRoute, detailParams(item)));
            }}
            footer={renderFooter ? renderFooter(item) : null}
          />
        ))
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}

      {navEnabled ? (
        <View style={styles.pagination}>
          <View style={styles.pagerProgress}>
            <View style={[styles.pagerProgressFill, { width: `${progressPercent}%` }]} />
          </View>

          <View style={styles.pagerRow}>
            <Pressable
              style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
              disabled={currentPage === 1}
              onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <Text style={styles.pageButtonText}>Previous</Text>
            </Pressable>

            <Text style={styles.pageIndicator}>
              {currentPage} / {totalPages}
            </Text>

            <Pressable
              style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              <Text style={styles.pageButtonText}>Next</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {renderListFooter ? renderListFooter() : null}
    </>
  );
}
