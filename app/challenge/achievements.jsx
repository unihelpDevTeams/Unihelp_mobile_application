import React, { useCallback, useRef, useState } from 'react';
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
  const profileSnapshot = React.useMemo(() => ({
    uid: profile?.uid,
    username: profile?.username,
    school: profile?.school,
    department: profile?.department,
    photo: profile?.photo,
    faculty: profile?.faculty,
    level: profile?.level,
  }), [profile?.uid, profile?.username, profile?.school, profile?.department, profile?.photo, profile?.faculty, profile?.level]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const lastLoadedUidRef = useRef('');

  useFocusEffect(
    useCallback(() => {
      const currentUid = profileSnapshot.uid || 'guest';
      if (lastLoadedUidRef.current === currentUid && achievements.length > 0) {
        return () => {};
      }

      lastLoadedUidRef.current = currentUid;
      let cancelled = false;
      setLoading(true);
      fetchChallengeStats(profileSnapshot)
        .then((stats) => {
          if (!cancelled) setAchievements(getChallengeAchievements(stats));
        })
        .catch(() => {
          if (!cancelled) setAchievements([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [profileSnapshot, achievements.length])
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
