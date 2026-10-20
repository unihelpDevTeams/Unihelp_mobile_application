import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import DocumentCard from '../../src/shared/components/DocumentCard';
import { Chip } from '../../src/shared/components/Button';
import { useAuth } from '../../context/AuthContext';
import { isPremiumActive } from '../../src/shared/services/premium';
import { listResourceBookmarks, removeResourceBookmark } from '../../src/shared/services/resourceBookmarks';

const SAVE_TYPES = {
  note: { label: 'Notes', icon: 'book-outline', color: colors.brand },
  question: { label: 'Past questions', icon: 'clipboard-outline', color: colors.blue },
  cbt: { label: 'CBT papers', icon: 'desktop-outline', color: colors.teal },
};

export default function SavedScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const [activeType, setActiveType] = useState('all');
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSavedItems = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listResourceBookmarks(uid);
      setSavedItems(items || []);
    } catch {
      setSavedItems([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    const timer = setTimeout(() => { loadSavedItems(); }, 0);
    return () => clearTimeout(timer);
  }, [loadSavedItems]);

  const filteredItems = savedItems.filter((item) => {
    if (activeType === 'all') return true;
    return item.resourceType === activeType;
  });

  const handleItemPress = (item) => {
    if (item.resourceType === 'cbt') {
      router.navigate({ pathname: '/cbt', params: { courseId: item.courseId || item.resourceId } });
      return;
    }
    router.navigate({ pathname: '/view/[type]/[id]', params: { type: item.resourceType, id: item.resourceId } });
  };

  const removeSaved = (item) => {
    Alert.alert('Remove saved resource?', `Remove "${item.title}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await removeResourceBookmark({ type: item.resourceType, resourceId: item.resourceId, uid: user?.uid });
          setSavedItems((current) => current.filter((entry) => entry.id !== item.id));
        } catch (error) {
          Alert.alert('Could not remove resource', error?.message || 'Please try again.');
        }
      } },
    ]);
  };

  const renderItem = ({ item }) => {
    const typeInfo = SAVE_TYPES[item.resourceType] || SAVE_TYPES.note;
    return (
      <View style={styles.cardWrap}>
        <DocumentCard item={{ ...item, id: item.resourceId, type: item.resourceType }} tone={typeInfo.color} kind={item.resourceType} onPress={() => handleItemPress(item)} />
        <Pressable style={styles.removeButton} onPress={() => removeSaved(item)} accessibilityLabel={`Remove ${item.title} from saved resources`}><Ionicons name="bookmark" size={18} color={typeInfo.color} /></Pressable>
      </View>
    );
  };

  return (
    <ScreenShell scrollable={false} title="Saved study" subtitle="Your organised Premium resource library" showBack>
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
      {!isPremiumActive(profile) ? (
        <EmptyState title="Premium study library" description="Save individual notes, past questions, and CBT papers here with UniHelp Premium." actionLabel="Explore Premium" onAction={() => router.navigate('/premium')} />
      ) : loading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : filteredItems.length ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState
          title="Nothing saved yet"
          description="Save notes, past questions, or CBT papers to build a focused revision library."
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
  cardWrap: { position: 'relative' },
  removeButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
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
