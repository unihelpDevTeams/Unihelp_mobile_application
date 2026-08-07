import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { fetchGroups } from '../../services/firestoreSync';
import { joinPublicGroup, requestJoinGroup } from '../../src/shared/services/community';

export default function CommunityScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joiningId, setJoiningId] = useState(null);
  const [joinStates, setJoinStates] = useState({});

  const styles = useThemeStyles((c, s, r) => ({
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm,
      backgroundColor: c.surfaceSecondary, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault,
      paddingHorizontal: s.lg, marginBottom: s.lg, height: 44,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.textPrimary, padding: 0 },
    searchClear: { padding: 4 },
    createButton: {
      flexDirection: 'row', alignItems: 'center', gap: s.xs, justifyContent: 'center',
      backgroundColor: c.brand, borderRadius: r.full, paddingVertical: 12, marginBottom: s.lg,
    },
    createButtonPressed: { opacity: 0.9 },
    createButtonText: { color: c.onBrand, fontSize: 13, fontWeight: '800' },
    card: {
      backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault,
      padding: s.lg, marginBottom: s.md,
    },
    cardPressed: { opacity: 0.95 },
    cardTop: { flexDirection: 'row', gap: s.md },
    avatarWrap: {
      width: 44, height: 44, borderRadius: r.lg, backgroundColor: c.brandLight,
      alignItems: 'center', justifyContent: 'center',
    },
    cardBody: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: s.xs, marginTop: 4 },
    cardMetaText: { fontSize: 12, color: c.textSecondary },
    privateBadge: {
      width: 16, height: 16, borderRadius: 8, backgroundColor: c.amber,
      alignItems: 'center', justifyContent: 'center',
    },
    joinButton: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.teal, borderRadius: r.full, paddingHorizontal: s.md, paddingVertical: s.sm,
      alignSelf: 'flex-start', minWidth: 84, justifyContent: 'center',
    },
    joinButtonPressed: { opacity: 0.85 },
    joinButtonBusy: { opacity: 0.7 },
    joinButtonText: { color: c.onBrand, fontSize: 12, fontWeight: '700' },
    heroSection: {
      backgroundColor: c.brand, borderRadius: r['3xl'], padding: s['2xl'], marginBottom: s.lg, overflow: 'hidden',
    },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: s.md },
    heroIconWrap: {
      width: 48, height: 48, borderRadius: r.xl, backgroundColor: c.brandLight,
      alignItems: 'center', justifyContent: 'center',
    },
    heroTitle: { fontSize: 20, fontWeight: '900', color: c.onBrand, letterSpacing: -0.3 },
    heroSubtitle: { fontSize: 13, color: c.brandGlow, marginTop: 2 },
  }));

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      fetchGroups()
        .then((items) => { if (active) setGroups(Array.isArray(items) ? items : []); })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [])
  );

  const handleJoin = async (group) => {
    if (!user) { router.push('/login'); return; }
    if (joinStates[group.id] === 'joined' || joinStates[group.id] === 'requested') return;
    setJoiningId(group.id);
    try {
      if (group.privacy === 'private') {
        await requestJoinGroup(group, user, profile || {});
        setJoinStates((prev) => ({ ...prev, [group.id]: 'requested' }));
      } else {
        await joinPublicGroup(group, user, profile || {});
        setJoinStates((prev) => ({ ...prev, [group.id]: 'joined' }));
      }
    } catch {} finally { setJoiningId(null); }
  };

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter((g) => (g.name || '').toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q));
  }, [groups, search]);

  return (
    <ScreenShell title="Groups" subtitle="Study groups & communities" showBack>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="people-outline" size={20} color={colors.onBrand} />
            </View>
            <View>
              <Text style={styles.heroTitle}>Study Groups</Text>
              <Text style={styles.heroSubtitle}>{groups.length} groups available</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.icon} />
          <TextInput placeholder="Search groups..." placeholderTextColor={colors.placeholder}
            style={styles.searchInput} value={search} onChangeText={setSearch} />
          {search ? (
            <Pressable onPress={() => setSearch('')} style={styles.searchClear}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <Pressable onPress={() => router.push('/create')}
          style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}>
          <Ionicons name="add-circle-outline" size={17} color={colors.onBrand} />
          <Text style={styles.createButtonText}>Create group</Text>
        </Pressable>

        {loading ? (
          <View style={{ gap: 12 }}>{[1, 2, 3].map((i) => (
            <View key={i} style={[styles.card, { height: 90 }]} />
          ))}</View>
        ) : filteredGroups.length > 0 ? (
          filteredGroups.map((group) => {
            const isMember = group.members?.includes(user?.uid) || group.ownerId === user?.uid || group.adminId === user?.uid;
            const state = joinStates[group.id];
            const isJoining = joiningId === group.id;
            return (
              <Pressable key={group.id} onPress={() => router.push(`/community/${group.id}`)}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardTop}>
                  <View style={styles.avatarWrap}>
                    <Text style={{ color: colors.brandText, fontWeight: '800', fontSize: 16 }}>
                      {(group.name || 'G')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{group.name || 'Unnamed Group'}</Text>
                    <View style={styles.cardMeta}>
                      {group.privacy === 'private' && (
                        <View style={styles.privateBadge}>
                          <Ionicons name="lock-closed" size={9} color={colors.onBrand} />
                        </View>
                      )}
                      <Ionicons name="people-outline" size={12} color={colors.icon} />
                      <Text style={styles.cardMetaText}>{group.memberCount || group.members?.length || 0} members</Text>
                    </View>
                  </View>
                  {!isMember && !state && (
                    <Pressable onPress={() => handleJoin(group)} disabled={isJoining}
                      style={[styles.joinButton, isJoining && styles.joinButtonBusy]}>
                      {isJoining ? <ActivityIndicator size="small" color={colors.onBrand} /> :
                        <Text style={styles.joinButtonText}>{group.privacy === 'private' ? 'Request' : 'Join'}</Text>}
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          })
        ) : (
          <EmptyState title="No groups found" description="Try a different search or create a new group."
            actionLabel="Create group" onAction={() => router.push('/create')} />
        )}
      </ScrollView>
    </ScreenShell>
  );
}
