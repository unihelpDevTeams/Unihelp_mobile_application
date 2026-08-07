import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import SectionHeader from '../../src/shared/components/SectionHeader';
import { spacing } from '../../src/shared/theme';
import { useAuth } from '../../context/AuthContext';
import { fetchChallengeStats, getChallengeAchievements } from '../../src/shared/challenge/service';
import { AchievementTile } from '../../src/shared/challenge/components/ChallengePieces';

export default function ChallengeAchievementsScreen() {
  const { profile } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      fetchChallengeStats(profile || {})
        .then((stats) => {
          if (!cancelled) setAchievements(getChallengeAchievements(stats));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [profile])
  );

  return (
    <ScreenShell title="Achievements" subtitle="Badges, milestones, and mastery progress." showBack loading={loading}>
      <SectionHeader title="Badges" subtitle="Locked badges show exactly how close you are." icon="ribbon-outline" />
      <View style={styles.grid}>
        {achievements.map((item) => (
          <AchievementTile key={item.id} item={item} />
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
