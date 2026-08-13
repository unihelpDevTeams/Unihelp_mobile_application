import React, { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';
import { resolveDocumentAsset, formatDocumentMeta } from '../utils/documentMedia';

const kindMeta = {
  note: { icon: 'book-outline', label: 'Note', toneKey: 'blue' },
  question: { icon: 'clipboard-outline', label: 'Past Question', toneKey: 'teal' },
  announcement: { icon: 'megaphone-outline', label: 'Announcement', toneKey: 'amber' },
};

const firstText = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim())?.trim() || '';

export default function DocumentCard({
  item,
  onPress,
  tone,
  actionLabel = 'Open',
  compact = false,
  showActions = false,
  onActionPress,
  ...rest
}) {
  const { colors, isDark } = useTheme();

  const kind = rest?.kind || item?.kind || item?.type || 'note';
  const meta = kindMeta[kind] || { icon: 'document-text-outline', label: kind, toneKey: 'brand' };
  const effectiveTone = tone || colors[meta.toneKey] || colors.brand;

  const styles = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: r['2xl'] || r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: compact ? s.md : s.lg,
      gap: s.sm,
      ...Platform.select({
        ios: {
          shadowColor: c.shadow || '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 10,
        },
        android: {
          elevation: isDark ? 0 : 2,
        },
      }),
    },
    cardPressed: {
      opacity: 0.95,
      transform: [{ scale: 0.992 }],
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: s.md,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: r.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    headerContent: {
      flex: 1,
      gap: 3,
    },
    actionMenuButton: {
      width: 34,
      height: 34,
      borderRadius: r.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
      flexWrap: 'wrap',
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      borderRadius: r.full,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    typeBadgeText: {
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    formatMeta: {
      fontSize: 11.5,
      fontWeight: '600',
      color: c.textTertiary,
    },
    title: {
      fontSize: 15.5,
      fontWeight: '800',
      color: c.textPrimary,
      lineHeight: 21,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: r.md || r.lg,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    chipText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    descriptionText: {
      fontSize: 12.5,
      color: c.textSecondary,
      lineHeight: 18,
    },
    readMoreButton: {
      alignSelf: 'flex-start',
      paddingVertical: 2,
    },
    readMoreText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: c.brand,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s.sm,
      marginTop: 2,
      paddingTop: s.sm,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: s.sm,
      flex: 1,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    statText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: s.md,
      height: 32,
      borderRadius: r.full,
      backgroundColor: c.brand,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.onBrand,
    },
  }));

  const itemTitle = item?.title || item?.name || 'Untitled Resource';
  const itemDescription = item?.description || item?.content || item?.text || '';
  const isLong = itemDescription.length > 110;
  const [expanded, setExpanded] = useState(!isLong);

  const resolved = resolveDocumentAsset(item || {});

  const chips = useMemo(() => {
    const values = [
      { icon: 'library-outline', label: firstText(item?.subject, item?.course, item?.courseCode) },
      { icon: 'business-outline', label: firstText(item?.department, item?.dept) },
      { icon: 'ribbon-outline', label: firstText(item?.level) },
      { icon: 'calendar-outline', label: item?.year ? String(item.year) : '' },
      {
        icon: resolved?.isPdf ? 'document-text-outline' : 'image-outline',
        label: resolved?.isPdf ? 'PDF' : resolved?.hasDocumentUrl ? 'File' : '',
      },
    ].filter((entry) => entry.label);

    return values.slice(0, compact ? 3 : 4);
  }, [compact, item, resolved?.hasDocumentUrl, resolved?.isPdf]);

  const hasStats =
    Boolean(item?.author) ||
    item?.likes !== undefined ||
    item?.comments !== undefined ||
    item?.downloads !== undefined ||
    Boolean(onPress);

  const documentMetaText = formatDocumentMeta(item, resolved);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${itemTitle}`}
    >
      {/* Header Section */}
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={meta.icon} size={20} color={effectiveTone} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={[styles.typeBadgeText, { color: effectiveTone }]}>{meta.label}</Text>
            </View>
            {documentMetaText ? (
              <Text style={styles.formatMeta} numberOfLines={1}>
                {documentMetaText}
              </Text>
            ) : null}
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {itemTitle}
          </Text>
        </View>

        {showActions ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              onActionPress?.(item);
            }}
            style={styles.actionMenuButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Manage ${itemTitle}`}
          >
            <Ionicons name="ellipsis-vertical" size={17} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Metadata Chips */}
      {chips.length > 0 && (
        <View style={styles.chipRow}>
          {chips.map((chip) => (
            <View key={`${chip.icon}-${chip.label}`} style={styles.chip}>
              <Ionicons name={chip.icon} size={12} color={effectiveTone} />
              <Text style={styles.chipText} numberOfLines={1}>
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Description Section */}
      {Boolean(itemDescription) && (
        <View>
          <Text style={styles.descriptionText} numberOfLines={expanded ? undefined : 2}>
            {itemDescription}
          </Text>
          {isLong && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              style={styles.readMoreButton}
              hitSlop={8}
            >
              <Text style={styles.readMoreText}>{expanded ? 'Show less' : 'Read more'}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Footer / Stats Section */}
      {hasStats && (
        <View style={styles.footer}>
          <View style={styles.statsRow}>
            {item?.author ? (
              <View style={styles.statItem}>
                <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.statText} numberOfLines={1}>
                  {item.author}
                </Text>
              </View>
            ) : null}
            {item?.likes !== undefined ? (
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.statText}>{item.likes}</Text>
              </View>
            ) : null}
            {item?.comments !== undefined ? (
              <View style={styles.statItem}>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.statText}>{item.comments}</Text>
              </View>
            ) : null}
            {item?.downloads !== undefined ? (
              <View style={styles.statItem}>
                <Ionicons name="download-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.statText}>{item.downloads}</Text>
              </View>
            ) : null}
          </View>

          {onPress ? (
            <View style={styles.actionButton}>
              <Text style={styles.actionText}>{actionLabel}</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.onBrand} />
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
