import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';
import { resolveDocumentAsset, formatDocumentMeta } from '../utils/documentMedia';

const kindMeta = {
  note: { icon: 'book-outline', label: 'Note', tone: 'blue' },
  question: { icon: 'clipboard-outline', label: 'Past Question', tone: 'teal' },
  announcement: { icon: 'megaphone-outline', label: 'Announcement', tone: 'orange' },
};

export default function DocumentCard({ item, onPress, tone, ...rest }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault,
      padding: s.lg, marginBottom: s.md,
    },
    cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
    topRow: { flexDirection: 'row', gap: s.md },
    iconWrap: { width: 38, height: 38, borderRadius: r.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    body: { flex: 1 },
    title: { fontSize: 14, fontWeight: '800', color: c.textPrimary, lineHeight: 19 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: s.xs },
    kindBadge: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: c.textTertiary },
    metaText: { fontSize: 11, color: c.textSecondary },
    bottomRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginTop: s.sm, paddingTop: s.sm },
    bottomDivider: { borderTopWidth: 1, borderTopColor: c.borderDefault },
    statText: { fontSize: 11, fontWeight: '600', color: c.textSecondary },
    actionLink: { fontSize: 12, fontWeight: '800', color: c.brandText },
    descriptionText: { marginTop: s.sm, fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    readMore: { marginTop: s.xs, fontSize: 12, fontWeight: '700', color: c.brandText },
  }));

  const itemTitle = item?.title || item?.name || 'Untitled';
  const itemDescription = item?.description || item?.content || item?.text || '';
  const kind = rest?.kind || item?.kind || item?.type || 'note';
  const meta = kindMeta[kind] || { icon: 'document-outline', label: kind, tone: 'grey' };
  const effectiveTone = tone || colors[meta.tone] || colors.brand;
  const isLong = itemDescription.length > 120;
  const [expanded, setExpanded] = React.useState(!isLong);

  const asset = item?.asset || item?.file || item?.url;
  const resolved = asset ? resolveDocumentAsset(asset) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: effectiveTone + '18' }]}>
          <Ionicons name={meta.icon} size={17} color={effectiveTone} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{itemTitle}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.kindBadge, { color: effectiveTone }]}>{meta.label}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>{formatDocumentMeta(item, resolved)}</Text>
          </View>
        </View>
      </View>

      {itemDescription ? (
        <Text style={styles.descriptionText} numberOfLines={expanded ? undefined : 3}>
          {itemDescription}
        </Text>
      ) : null}
      {isLong ? (
        <Text style={styles.readMore} onPress={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'Read more'}
        </Text>
      ) : null}

      {item?.author || item?.likes || item?.comments || item?.downloads ? (
        <View style={[styles.bottomRow, (itemDescription || isLong) && styles.bottomDivider]}>
          {item.author ? <Text style={styles.statText}>{item.author}</Text> : null}
          {item.likes !== undefined ? <Text style={styles.statText}>{item.likes} likes</Text> : null}
          {item.comments !== undefined ? <Text style={styles.statText}>{item.comments} comments</Text> : null}
          {item.downloads !== undefined ? <Text style={styles.statText}>{item.downloads} downloads</Text> : null}
          <View style={{ flex: 1 }} />
          {onPress ? <Text style={styles.actionLink}>Open</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}