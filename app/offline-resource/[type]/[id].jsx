import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../../src/shared/components/ScreenShell';
import FormulaMath from '../../../src/shared/components/FormulaMath';
import { useTheme } from '../../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../../src/shared/theme/createStyles';
import { getDownloadRecord, hasOfflineLibraryAccess } from '../../../src/shared/offline/offlineLearningService';

const normalizeParam = (value) => (Array.isArray(value) ? value[0] : value);

export default function OfflineResourceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = normalizeParam(params.type);
  const id = normalizeParam(params.id);
  const { colors } = useTheme();
  const [record, setRecord] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const styles = useThemeStyles((c, s, r) => ({
    lockCard: { backgroundColor: c.card, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault, padding: s.lg, alignItems: 'center', gap: s.sm },
    lockTitle: { color: c.textPrimary, fontSize: 18, fontWeight: '900', textAlign: 'center' },
    lockText: { color: c.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center' },
    actionButton: { marginTop: s.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: r.full, backgroundColor: c.brand, paddingVertical: s.md, paddingHorizontal: s.lg },
    actionText: { color: c.onBrand, fontWeight: '900' },
    list: { gap: s.sm, paddingBottom: 24 },
    card: { backgroundColor: c.card, borderRadius: r.lg, borderWidth: 1, borderColor: c.borderDefault, padding: s.md, gap: s.xs },
    title: { color: c.textPrimary, fontWeight: '900', fontSize: 15 },
    meta: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18 },
    webviewWrap: { flex: 1, minHeight: 520, overflow: 'hidden', borderRadius: r.lg, borderWidth: 1, borderColor: c.borderDefault },
  }));

  const load = useCallback(async () => {
    try {
      const [download, access] = await Promise.all([getDownloadRecord(type, id), hasOfflineLibraryAccess()]);
      setRecord(download);
      setAllowed(access);
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => {
    const payload = record?.payload;
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') return [payload];
    return [];
  }, [record?.payload]);

  if (loading) {
    return (
      <ScreenShell title="Offline Reader" subtitle="Loading saved resource" showBack>
        <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={colors.brand} /></View>
      </ScreenShell>
    );
  }

  if (!allowed) {
    return (
      <ScreenShell title="Premium expired" subtitle="Offline access unavailable" showBack>
        <View style={styles.lockCard}>
          <Ionicons name="lock-closed" size={28} color={colors.brand} />
          <Text style={styles.lockTitle}>Your offline learning library is unavailable until Premium is renewed.</Text>
          <Text style={styles.lockText}>The saved copy remains protected inside UniHelp and can be used again after Premium is active and validated.</Text>
          <Pressable style={styles.actionButton} onPress={() => router.push('/premium')}>
            <Ionicons name="star-outline" size={16} color={colors.onBrand} />
            <Text style={styles.actionText}>Renew Premium</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  if (!record) {
    return (
      <ScreenShell title="Offline Reader" subtitle="Resource unavailable" showBack>
        <View style={styles.lockCard}>
          <Ionicons name="cloud-offline-outline" size={28} color={colors.textSecondary} />
          <Text style={styles.lockTitle}>Offline copy not found</Text>
        </View>
      </ScreenShell>
    );
  }

  if (record.localReference) {
    return (
      <ScreenShell title={record.title || 'Offline document'} subtitle="UniHelp Reader" showBack scrollable={false}>
        <View style={styles.webviewWrap}>
          <WebView source={{ uri: record.localReference }} originWhitelist={['*']} startInLoadingState />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={record.title || 'Offline resource'} subtitle="Saved structured content" showBack>
      <FlatList
        data={items}
        keyExtractor={(item, index) => String(item.id || item.title || index)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title || item.prompt || item.question || item.subject || 'Saved item'}</Text>
            {item.formula ? <FormulaMath source={item.formula} color={colors.textPrimary} backgroundColor={colors.card} /> : null}
            {item.explanation ? <Text style={styles.meta}>{item.explanation}</Text> : null}
            {Array.isArray(item.answers) ? <Text style={styles.meta}>{item.answers.join(' / ')}</Text> : null}
          </View>
        )}
      />
    </ScreenShell>
  );
}
