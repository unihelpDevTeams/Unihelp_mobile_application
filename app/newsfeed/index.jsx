import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import SectionHeader from '../../src/shared/components/SectionHeader';
import EmptyState from '../../src/shared/components/EmptyState';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { fetchNigeriaNews } from '../../src/shared/services/news';

export default function NewsFeedPage() {
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('All');

  const styles = useThemeStyles((c, s, r) => ({
    hero: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.brand, borderRadius: r['3xl'], padding: s.lg, marginBottom: s.md },
    heroCopy: { flex: 1 },
    heroTitle: { color: c.onBrand, fontSize: 20, fontWeight: '800' },
    heroText: { marginTop: 4, color: c.onBrand, fontSize: 12, lineHeight: 18, fontWeight: '500' },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surfacePrimary,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl, paddingHorizontal: s.md, paddingVertical: s.md, marginBottom: s.md,
    },
    searchInput: { flex: 1, color: c.textPrimary },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: c.brandLight },
    activeTag: { backgroundColor: c.brand },
    tagText: { fontSize: 12, fontWeight: '700', color: c.brandText },
    activeTagText: { color: c.onBrand },
    card: {
      backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault,
      overflow: 'hidden', marginBottom: s.md,
    },
    image: { height: 180, width: '100%' },
    imageFallback: { height: 180, backgroundColor: c.borderDefault },
    body: { padding: s.lg },
    title: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    description: { marginTop: 6, fontSize: 13, lineHeight: 19, color: c.textSecondary },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    meta: { fontSize: 11, fontWeight: '700', color: c.textTertiary },
  }));

  useEffect(() => {
    fetchNigeriaNews()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const tags = ['All', 'Admissions', 'Exams', 'Scholarships', 'Campus News', 'Politics', 'Tech', 'Business', 'Sports', 'NYSC', 'Funding', 'General'];

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchSearch = !value || `${item.title} ${item.description}`.toLowerCase().includes(value);
      const matchTag = tag === 'All' || item.category === tag;
      return matchSearch && matchTag;
    });
  }, [items, search, tag]);

  return (
    <ScreenShell title="News Feed" subtitle="Trending education and campus news." showBack loading={loading}>
      <View style={styles.hero}>
        <Ionicons name="newspaper-outline" size={22} color={colors.onBrand} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>Fresh campus updates</Text>
          <Text style={styles.heroText}>Smart, student-first news powered by the same sources as the website.</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search news..." placeholderTextColor={colors.placeholder} style={styles.searchInput} />
      </View>

      <View style={styles.tagsRow}>
        {tags.map((item) => (
          <Pressable key={item} onPress={() => setTag(item)} style={[styles.tag, tag === item && styles.activeTag]}>
            <Text style={[styles.tagText, tag === item && styles.activeTagText]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Latest stories" subtitle={`${filtered.length} articles available`} icon="paper-plane-outline" />

      {filtered.length ? filtered.map((item) => (
        <Pressable key={`${item.id}-${item.title}`} style={styles.card} onPress={() => item.link && Linking.openURL(item.link).catch(() => {})}>
          {item.image ? <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" cachePolicy="disk" /> : <View style={styles.imageFallback} />}
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.description} numberOfLines={3}>{item.description || 'No description available.'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{item.category}</Text>
              <Text style={styles.meta}>{item.source}</Text>
            </View>
          </View>
        </Pressable>
      )) : (
        <EmptyState title="No articles found" description="Try another keyword or category." />
      )}
    </ScreenShell>
  );
}
