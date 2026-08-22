import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import SectionHeader from '../../src/shared/components/SectionHeader';
import { spacing } from '../../src/shared/theme';
import { CHALLENGE_CATEGORIES, getRecommendedCategories } from '../../src/shared/challenge/data';
import { CategoryCard } from '../../src/shared/challenge/components/ChallengePieces';
import { useAuth } from '../../context/AuthContext';

export default function ChallengeCategoriesScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const sortedCategories = useMemo(() => {
    const recommended = getRecommendedCategories(profile || {});
    const recommendedIds = new Set(recommended.map((c) => c.id));
    const rest = CHALLENGE_CATEGORIES.filter((c) => !recommendedIds.has(c.id));
    return [...recommended, ...rest];
  }, [profile]);

  const subtitle = `Personalized challenges for ${profile?.department || 'your department'} at ${profile?.level || 'your level'}.`;

  return (
    <ScreenShell title="Categories" subtitle={subtitle} showBack>
      <SectionHeader title="All challenge categories" subtitle="Personalized to your department, level and goals." icon="grid-outline" />
      <View style={styles.grid}>
        {sortedCategories.map((item) => (
          <CategoryCard key={item.id} item={item} onPress={() => router.navigate({ pathname: '/challenge/question', params: { category: item.id } })} />
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
