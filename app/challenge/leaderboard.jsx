import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';
import { useAuth } from '../../context/AuthContext';
import { fetchChallengeLeaderboard } from '../../src/shared/challenge/service';
import { LeaderboardRow } from '../../src/shared/challenge/components/ChallengePieces';

const TABS = [
  { key: 'global', label: 'Global' },
  { key: 'university', label: 'University' },
  { key: 'department', label: 'Department' },
  { key: 'friends', label: 'Friends' },
];

export default function ChallengeLeaderboardScreen() {
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
  const [scope, setScope] = useState('global');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const lastLoadedKeyRef = useRef('');
  const rowsRef = useRef([]);

  useFocusEffect(
    useCallback(() => {
      const currentKey = `${profileSnapshot.uid || 'guest'}:${scope}`;
      const hasLoadedRows = lastLoadedKeyRef.current === currentKey && rowsRef.current.length > 0;

      if (hasLoadedRows) {
        return () => {};
      }

      lastLoadedKeyRef.current = currentKey;
      let cancelled = false;
      setLoading(true);
      fetchChallengeLeaderboard({ scope, profile: profileSnapshot })
        .then((data) => {
          if (!cancelled) {
            rowsRef.current = data;
            setRows(data);
          }
        })
        .catch(() => {
          if (!cancelled) {
            rowsRef.current = [];
            setRows([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [profileSnapshot, scope])
  );

  return (
    <ScreenShell title="Leaderboard" subtitle="Compare XP, points, and streaks." showBack loading={loading}>
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable key={tab.key} style={[styles.tab, scope === tab.key && styles.tabActive]} onPress={() => setScope(tab.key)}>
            <Text style={[styles.tabText, scope === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {rows.length ? (
        rows.map((item, index) => (
          <LeaderboardRow key={item.uid || item.id} item={item} index={index} isCurrentUser={(item.uid || item.id) === profile?.uid} />
        ))
      ) : (
        <EmptyState title="No leaderboard entries yet" description="Complete a challenge to appear in this ranking." icon="trophy-outline" />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  tab: {
    flexGrow: 1,
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tabActive: { backgroundColor: colors.brandLight },
  tabText: { color: colors.grey, fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: colors.brandText },
});
