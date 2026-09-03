import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import DocumentCard from '../../src/shared/components/DocumentCard';
import { Chip } from '../../src/shared/components/Button';
import { fetchSavedItems } from '../../services/firestoreSync';

const SAVE_TYPES = {
  notes: { label: 'Notes', icon: 'book-outline', color: colors.brand },
  questions: { label: 'Questions', icon: 'clipboard-outline', color: colors.blue },
  tutorials: { label: 'Tutorials', icon: 'videocam-outline', color: colors.teal },
  posts: { label: 'Posts', icon: 'document-text-outline', color: colors.purple },
  marketplace: { label: 'Marketplace', icon: 'bag-outline', color: colors.orange },
};

export default function SavedScreen() {
  const router = useRouter();
  const [activeType, setActiveType] = useState('all');
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSavedItems = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchSavedItems();
      setSavedItems(items || []);
    } catch {
      setSavedItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedItems();
  }, [loadSavedItems]);

  const filteredItems = savedItems.filter((item) => {
    if (activeType === 'all') return true;
    return item.type === activeType;
  });

  const handleItemPress = (item) => {
    router.navigate({ pathname: '/view/[type]/[id]', params: { type: item.type, id: item.id } });
  };

  const renderItem = ({ item }) => {
    const typeInfo = SAVE_TYPES[item.type] || SAVE_TYPES.notes;
    return (
      <DocumentCard
        item={item}
        tone={typeInfo.color}
        onPress={() => handleItemPress(item)}
      />
    );
  };

  return (
    <ScreenShell title="Saved" subtitle="Your bookmarked study materials" showBack>
      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <Chip label="All" selected={activeType === 'all'} onPress={() => setActiveType('all')} />
        {Object.entries(SAVE_TYPES).map(([key, type]) => (
          <Chip
            key={key}
            label={type.label}
            icon={type.icon}
            selected={activeType === key}
            onPress={() => setActiveType(key)}
          />
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : filteredItems.length ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title="Nothing saved yet"
          description="Bookmark notes, questions, and other study materials to find them quickly later."
          illustration="saved"
          actionLabel="Explore notes"
          onAction={() => router.navigate('/(tabs)/lectureNotes')}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing['3xl'],
  },
  loadingContainer: {
    gap: spacing.md,
  },
  skeletonCard: {
    height: 180,
    backgroundColor: colors.skeleton,
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.md,
  },
});