/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getJson, deleteJson } from '../shared/services/backend';
import { useTheme } from '../shared/theme/ThemeContext';

export default function PastQuestionModerationManager() {
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getJson('/api/past-questions?limit=100');
      setItems(response?.items || []);
    } catch (error) {
      Alert.alert('Could not load past questions', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.title, item.courseCode, item.courseTitle, item.department, item.institution]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)));
  }, [items, query]);

  const remove = (item) => {
    Alert.alert(
      'Remove past question?',
      `Remove “${item.title || 'this document'}”? Use this only for inappropriate content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            setRemovingId(item.id);
            try {
              await deleteJson(`/api/past-questions/${encodeURIComponent(item.id)}`);
              setItems((current) => current.filter((entry) => entry.id !== item.id));
            } catch (error) {
              Alert.alert('Removal failed', error?.message || 'Please try again.');
            } finally {
              setRemovingId('');
            }
          },
        },
      ]
    );
  };

  const styles = createStyles(colors);
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={21} color={colors.brand} /></View>
        <View style={{ flex: 1 }}><Text style={styles.title}>Past question moderation</Text><Text style={styles.subtitle}>Papers publish automatically. Remove only inappropriate content.</Text></View>
      </View>
      <View style={styles.search}><Ionicons name="search-outline" size={18} color={colors.textSecondary} /><TextInput value={query} onChangeText={setQuery} placeholder="Search past questions" placeholderTextColor={colors.textSecondary} style={styles.input} /></View>
      {loading ? <View style={styles.empty}><ActivityIndicator color={colors.brand} /></View> : <FlatList data={visible} keyExtractor={(item) => item.id} contentContainerStyle={visible.length ? styles.list : styles.empty} ListEmptyComponent={<Text style={styles.emptyText}>No past questions found.</Text>} renderItem={({ item }) => <View style={styles.card}><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.title || 'Untitled paper'}</Text><Text style={styles.meta}>{[item.courseCode || item.courseTitle, item.department, item.year].filter(Boolean).join(' • ') || 'No metadata'}</Text></View><Pressable onPress={() => remove(item)} disabled={removingId === item.id} style={styles.remove}>{removingId === item.id ? <ActivityIndicator size="small" color={colors.error} /> : <><Ionicons name="trash-outline" size={17} color={colors.error} /><Text style={styles.removeText}>Remove</Text></>}</Pressable></View>} />}
    </View>
  );
}

const createStyles = (c) => StyleSheet.create({
  page: { flex: 1, padding: 16, backgroundColor: c.background }, header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 }, icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: c.brandLight }, title: { color: c.textPrimary, fontSize: 18, fontWeight: '800' }, subtitle: { color: c.textSecondary, fontSize: 13, marginTop: 2, lineHeight: 18 }, search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.surface, borderRadius: 14, marginBottom: 12 }, input: { flex: 1, minHeight: 44, color: c.textPrimary, fontSize: 14 }, list: { gap: 10, paddingBottom: 24 }, card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderColor: c.borderDefault, borderWidth: 1, borderRadius: 16, padding: 14 }, cardTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '700' }, meta: { color: c.textSecondary, fontSize: 12, marginTop: 4 }, remove: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 10, backgroundColor: c.errorLight }, removeText: { color: c.error, fontSize: 12, fontWeight: '800' }, empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }, emptyText: { color: c.textSecondary },
});
