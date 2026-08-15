import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { spacing, borderRadius, shadows } from '../../src/shared/theme';
import { useAuth } from '../../context/AuthContext';
import { searchUsers } from '../../src/shared/services/community';
import {
  RELATIONSHIP,
  listenRelationship,
  listSuggestedFriends,
  sendFriendRequest,
} from '../../src/shared/services/friendships';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'school', label: 'School' },
  { key: 'department', label: 'Department' },
  { key: 'level', label: 'Level' },
];

const nameOf = (person = {}) => person.username || person.name || person.email || 'Student';
const schoolOf = (person = {}) => person.school || person.university || '';
const metaOf = (person = {}) => [schoolOf(person), person.department, person.level].filter(Boolean).join(' | ');

function Avatar({ person, styles }) {
  const uri = person.photo || person.avatar || person.photoURL || '';
  return uri ? (
    <Image source={{ uri }} style={styles.avatar} />
  ) : (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitial}>{nameOf(person)[0]?.toUpperCase() || 'S'}</Text>
    </View>
  );
}

function RelationshipAction({ person, currentUid, currentProfile, styles }) {
  const { colors } = useTheme();
  const router = useRouter();
  const targetUid = person.id || person.uid;
  const [relationship, setRelationship] = useState({ state: RELATIONSHIP.NONE });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!currentUid || !targetUid) return undefined;
    return listenRelationship(currentUid, targetUid, setRelationship);
  }, [currentUid, targetUid]);

  const addFriend = async () => {
    setBusy(true);
    try {
      await sendFriendRequest({
        currentUid,
        targetUid,
        currentProfile,
        targetProfile: person,
      });
      Alert.alert('Request sent', `Your friend request was sent to ${nameOf(person)}.`);
    } catch (error) {
      Alert.alert('Could not send request', error.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (relationship.state === RELATIONSHIP.BLOCKED) return null;

  if (relationship.state === RELATIONSHIP.FRIENDS) {
    return (
      <Pressable style={[styles.smallButton, styles.friendButton]} onPress={() => router.push(`/view-user-profile/${targetUid}`)}>
        <Ionicons name="checkmark-circle" size={15} color={colors.green} />
        <Text style={styles.friendButtonText}>Friends</Text>
      </Pressable>
    );
  }

  if (relationship.state === RELATIONSHIP.SENT) {
    return (
      <View style={[styles.smallButton, styles.sentButton]}>
        <Ionicons name="time-outline" size={15} color={colors.grey} />
        <Text style={styles.sentButtonText}>Sent</Text>
      </View>
    );
  }

  if (relationship.state === RELATIONSHIP.RECEIVED) {
    return (
      <Pressable style={[styles.smallButton, styles.secondaryButton]} onPress={() => router.push(`/view-user-profile/${targetUid}`)}>
        <Ionicons name="mail-unread-outline" size={15} color={colors.brand} />
        <Text style={styles.secondaryButtonText}>Respond</Text>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.smallButton} onPress={addFriend} disabled={busy}>
      {busy ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="person-add-outline" size={15} color={colors.onBrand} />}
      <Text style={styles.smallButtonText}>Add</Text>
    </Pressable>
  );
}

function StudentRow({ person, currentUid, currentProfile, colors, styles }) {
  const router = useRouter();
  const targetUid = person.id || person.uid;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => router.push(`/view-user-profile/${targetUid}`)}>
      <Avatar person={person} styles={styles} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.name} numberOfLines={1}>{nameOf(person)}</Text>
          {person.verifiedTutor ? (
            <View style={styles.tutorPill}>
              <Ionicons name="shield-checkmark-outline" size={12} color={colors.teal} />
              <Text style={styles.tutorText}>Tutor</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>{metaOf(person) || person.email || 'UniHelp student'}</Text>
        {Array.isArray(person.interests) && person.interests.length ? (
          <Text style={styles.interests} numberOfLines={1}>{person.interests.slice(0, 3).join(', ')}</Text>
        ) : null}
      </View>
      <RelationshipAction person={person} currentUid={currentUid} currentProfile={currentProfile} colors={colors} styles={styles} />
    </Pressable>
  );
}

export default function FindFriendsPage() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);
  const uid = user?.uid || profile?.uid;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSuggested = useCallback(async () => {
    if (!uid) return;
    const rows = await listSuggestedFriends({ uid, profile, pageSize: 40 });
    setSuggested(rows);
  }, [profile, uid]);

  useEffect(() => {
    loadSuggested().finally(() => setLoading(false));
  }, [loadSuggested]);

  useEffect(() => {
    const run = async () => {
      if (!uid || search.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const rows = await searchUsers(search, uid, 30);
        setResults(rows);
      } finally {
        setSearching(false);
      }
    };
    const timer = setTimeout(() => {
      run().catch(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, uid]);

  const visibleRows = useMemo(() => {
    const baseRows = search.trim().length >= 2 ? results : suggested;
    return baseRows.filter((person) => {
      if (filter === 'school') return schoolOf(person) && schoolOf(person) === (profile?.school || profile?.university);
      if (filter === 'department') return person.department && person.department === profile?.department;
      if (filter === 'level') return person.level && person.level === profile?.level;
      if (filter === 'interest') return person.interests && person.interests === profile?.interests;
      return true;
    });
  }, [filter, profile, results, search, suggested]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSuggested();
      if (search.trim().length >= 2 && uid) {
        const rows = await searchUsers(search, uid, 30);
        setResults(rows);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScreenShell title="Find Friends" subtitle="Discover classmates and friends in other schools" showBack loading={loading} scrollable={false}>
      <View style={styles.searchCard}>
        <Ionicons name="search-outline" size={18} color={colors.grey} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, school, department..."
          placeholderTextColor={colors.greyLight}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {searching ? <ActivityIndicator size="small" color={colors.brand} /> : null}
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => (
          <Pressable style={[styles.filterChip, filter === item.key && styles.filterChipActive]} onPress={() => setFilter(item.key)}>
            <Text style={[styles.filterText, filter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </Pressable>
        )}
      />

      <FlatList
        data={visibleRows}
        keyExtractor={(item) => item.id || item.uid}
        renderItem={({ item }) => (
          <StudentRow person={item} currentUid={uid} currentProfile={profile} colors={colors} styles={styles} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        contentContainerStyle={visibleRows.length ? styles.listContent : styles.emptyContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={visibleRows.length ? (
          <Text style={styles.sectionTitle}>{search.trim().length >= 2 ? 'Search results' : 'Suggested for you'}</Text>
        ) : null}
        ListEmptyComponent={!loading ? (
          <EmptyState
            title={search.trim().length >= 2 ? 'No students found' : 'No suggestions yet'}
            description={search.trim().length >= 2 ? 'Try another name, school, or department.' : 'Complete your profile details to improve friend suggestions.'}
          />
        ) : null}
      />
    </ScreenShell>
  );
}

const createStyles = (c, s, r) => ({
  searchCard: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    backgroundColor: c.card,
    borderRadius: r['2xl'],
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: s.md,
    marginBottom: s.md,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    color: c.ink,
    fontSize: 14,
    paddingVertical: 10,
  },
  filters: {
    gap: s.sm,
    paddingBottom: s.md,
  },
  filterChip: {
    height: 36,
    justifyContent: 'center',
    borderRadius: r.full,
    paddingHorizontal: s.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  filterChipActive: {
    backgroundColor: c.brand,
    borderColor: c.brand,
  },
  filterText: {
    color: c.grey,
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: c.onBrand,
  },
  sectionTitle: {
    color: c.ink,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: s.sm,
  },
  listContent: {
    paddingBottom: s['3xl'],
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 90,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.md,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r['2xl'],
    padding: s.md,
    marginBottom: s.sm,
    ...shadows.card,
  },
  cardPressed: {
    backgroundColor: c.canvasLight,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: c.brandLight,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: c.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: c.brandDark,
    fontSize: 18,
    fontWeight: '900',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
  },
  name: {
    flex: 1,
    color: c.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  meta: {
    marginTop: 4,
    color: c.grey,
    fontSize: 12.5,
    lineHeight: 17,
  },
  interests: {
    marginTop: 4,
    color: c.brandText,
    fontSize: 11.5,
    fontWeight: '800',
  },
  tutorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.tealLight,
    borderRadius: r.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tutorText: {
    color: c.teal,
    fontSize: 10,
    fontWeight: '900',
  },
  smallButton: {
    minWidth: 68,
    height: 36,
    borderRadius: r.full,
    backgroundColor: c.brand,
    borderWidth: 1,
    borderColor: c.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: s.sm,
  },
  smallButtonText: {
    color: c.onBrand,
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: c.brandLight,
    borderColor: c.brandBorder,
  },
  secondaryButtonText: {
    color: c.brand,
    fontSize: 12,
    fontWeight: '900',
  },
  sentButton: {
    backgroundColor: c.canvasLight,
    borderColor: c.border,
  },
  sentButtonText: {
    color: c.grey,
    fontSize: 12,
    fontWeight: '900',
  },
  friendButton: {
    backgroundColor: c.greenLight,
    borderColor: '#A7F3D0',
  },
  friendButtonText: {
    color: c.green,
    fontSize: 12,
    fontWeight: '900',
  },
});
