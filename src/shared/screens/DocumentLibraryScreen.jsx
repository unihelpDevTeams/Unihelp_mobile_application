import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';
import ScreenShell from '../components/ScreenShell';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import DocumentCard from '../components/DocumentCard';
import { PageLoader } from '../components/AILoaders';

const buildRoute = (template, params = {}) =>
  Object.entries(params).reduce((result, [key, value]) => result.replace(`[${key}]`, String(value)), template);

const stripExtension = (value) => {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/\.[a-zA-Z0-9]{2,5}$/, '').trim();
};

const withCleanDisplayFields = (item) => ({
  ...item,
  title: stripExtension(item.title),
  name: stripExtension(item.name),
});

export default function DocumentLibraryScreen({
  title,
  subtitle,
  items = [],
  loading = false,
  emptyTitle = 'No documents yet',
  emptyDescription = 'New documents will appear here once they are published.',
  detailRoute,
  detailParams = (item) => ({ id: item.id }),
  showBack = false,
  icon = 'library-outline',
  accent = null,
  uploadLabel = 'Upload',
  uploadRoute = '/upload',
  renderHeader = null,
  columns = 1, // Support 1 or 2 column layout
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const resolvedAccent = accent || colors.brand;
  const styles = useThemeStyles((c, s, r) => ({
    hero: { flexDirection: 'row', alignItems: 'center', gap: s.lg, borderRadius: r['5xl'], backgroundColor: c.brandLight, padding: s['2xl'], marginBottom: s['2xl'] },
    iconWrap: { width: 50, height: 50, borderRadius: r['2xl'], alignItems: 'center', justifyContent: 'center' },
    heroCopy: { flex: 1 },
    heroTitle: { fontSize: 19, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.3 },
    heroSubtitle: { marginTop: s.xs, fontSize: 13, lineHeight: 18, color: c.textSecondary },
    uploadButton: { flexDirection: 'row', alignItems: 'center', gap: s.xs, paddingHorizontal: s.lg, paddingVertical: 11, borderRadius: r.xl },
    uploadText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },
    headerExtras: { marginBottom: s.lg },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.card,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: r['2xl'],
      paddingHorizontal: s.lg, paddingVertical: s.md, marginBottom: s.lg,
    },
    searchInput: { flex: 1, color: c.textPrimary, fontSize: 15, paddingVertical: 0 },
    sectionRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: s.sm, marginBottom: s.sm },
    countPill: { minWidth: 28, height: 28, paddingHorizontal: s.sm, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center' },
    countPillText: { fontSize: 12, fontWeight: '800' },
    list: { gap: s.sm },
    row: { flexDirection: 'row', gap: s.sm },
    columnItem: { flex: 1, minWidth: 0 },
    loading: { backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault, paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: s.sm, color: c.textSecondary, fontSize: 13 },
  }));

  const cleanedItems = useMemo(() => items.map(withCleanDisplayFields), [items]);

  const filteredItems = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return cleanedItems;

    return cleanedItems.filter((item) =>
      [
        item.title,
        item.name,
        item.courseCode,
        item.course,
        item.department,
        item.dept,
        item.school,
        item.lecturer,
        item.year,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value)
    );
  }, [cleanedItems, search]);

  // Split items into rows for 2-column layout
  const rows = useMemo(() => {
    if (columns === 1) return filteredItems.map((item) => [item]);
    const result = [];
    for (let i = 0; i < filteredItems.length; i += 2) {
      result.push(filteredItems.slice(i, i + 2));
    }
    return result;
  }, [filteredItems, columns]);

  return (
    <ScreenShell title={title} subtitle={subtitle} showBack={showBack} loading={loading}>
      <View style={[styles.hero, { shadowColor: resolvedAccent }]}>
        <View style={[styles.iconWrap, { backgroundColor: resolvedAccent }]}>
          <Ionicons name={icon} size={22} color={colors.onBrand} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.heroSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          onPress={() => uploadRoute && router.push(uploadRoute)}
          style={({ pressed }) => [
            styles.uploadButton,
            { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
          ]}
          hitSlop={6}
        >
          <Ionicons name="add" size={16} color={colors.onBrand} />
          <Text style={styles.uploadText}>{uploadLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.greyLight} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${title.toLowerCase()}...`}
          placeholderTextColor={colors.greyLight}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.greyLight} />
          </Pressable>
        ) : null}
      </View>

      {renderHeader ? <View style={styles.headerExtras}>{renderHeader}</View> : null}

      <View style={styles.sectionRow}>
        <SectionHeader
          title="Documents"
          subtitle="Stored in the shared content system with PDF previews."
        />
        <View style={[styles.countPill, { backgroundColor: `${accent}1A` }]}>
          <Text style={[styles.countPillText, { color: accent }]}>{filteredItems.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <PageLoader label="Loading documents..." />
          <Text style={styles.loadingText}>Loading documents…</Text>
        </View>
      ) : filteredItems.length ? (
        <View style={styles.list}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={columns === 2 ? styles.row : undefined}>
              {row.map((item) => (
                <View key={item.id} style={columns === 2 ? styles.columnItem : undefined}>
                  <DocumentCard
                    item={item}
                    tone={accent}
                    onPress={() => {
                      if (!detailRoute) return;
                      router.push(buildRoute(detailRoute, detailParams(item)));
                    }}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </ScreenShell>
  );
}
