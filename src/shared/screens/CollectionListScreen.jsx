import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { spacing } from '../theme';
import SectionHeader from '../components/SectionHeader';
import CollectionCard from '../components/CollectionCard';
import EmptyState from '../components/EmptyState';

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
}) {
  const router = useRouter();
  const buildRoute = (routeTemplate, params = {}) => {
    if (!routeTemplate) return null;
    return Object.entries(params).reduce(
      (result, [key, value]) => result.replace(`[${key}]`, String(value)),
      routeTemplate
    );
  };

  return (
    <>
      <SectionHeader title={title} subtitle={subtitle} actionLabel={actionLabel} onPress={onActionPress} />

      {renderHeader ? <View style={{ marginBottom: spacing.lg }}>{renderHeader}</View> : null}

      {renderFeatured ? <View style={{ marginBottom: spacing.lg }}>{renderFeatured}</View> : null}

      {items.length ? (
        items.map((item) => (
          <CollectionCard
            key={item.id}
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
      {renderListFooter ? renderListFooter() : null}
    </>
  );
}
