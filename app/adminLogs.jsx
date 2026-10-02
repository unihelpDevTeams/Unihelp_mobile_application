import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, SafeAreaView, RefreshControl, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getErrorLogs, clearErrorLogs } from '../src/utils/errorLogger';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';
import { spacing } from '../src/shared/theme';

export default function AdminLogsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useThemeStyles((c, s, r) => ({
    container: { flex: 1, backgroundColor: c.canvas },
    headerButton: { padding: s.xs, marginRight: s.md },
    headerButtonText: { color: c.rose, fontWeight: '700', fontSize: 14 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: s.xl },
    emptyText: { color: c.textSecondary, fontSize: 15, marginTop: s.sm },
    logCard: {
      backgroundColor: c.surface,
      marginHorizontal: s.md,
      marginTop: s.md,
      padding: s.md,
      borderRadius: r.lg,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: s.xs },
    logSource: { color: c.brandText, fontWeight: '800', fontSize: 13 },
    logTime: { color: c.textTertiary, fontSize: 11 },
    logMessage: { color: c.ink, fontSize: 14, fontWeight: '600', marginBottom: 4 },
    logCode: { color: c.rose, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: s.xs },
    logDetails: { color: c.textSecondary, fontSize: 12, backgroundColor: c.canvasLight, padding: 8, borderRadius: 4 },
  }));

  const loadLogs = useCallback(async () => {
    setRefreshing(true);
    try {
      const storedLogs = await getErrorLogs();
      setLogs(storedLogs);
    } catch (e) {
      console.warn(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClear = async () => {
    await clearErrorLogs();
    setLogs([]);
  };

  const renderLog = ({ item }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.logSource}>{item.source}</Text>
        <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleString()}</Text>
      </View>
      <Text style={styles.logMessage}>{item.message}</Text>
      {item.code !== 'unknown' && <Text style={styles.logCode}>Code: {item.code}</Text>}
      {item.details && item.details !== '{}' && (
        <Text style={styles.logDetails}>{item.details}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'System Logs',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerRight: () => (
            <Pressable onPress={handleClear} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Clear</Text>
            </Pressable>
          ),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ padding: spacing.sm, marginLeft: -spacing.sm }}>
              <Ionicons name="arrow-back" size={24} color={colors.ink} />
            </Pressable>
          ),
        }}
      />
      
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadLogs} tintColor={colors.brand} />}
        ListEmptyComponent={
          !refreshing && (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors.green} />
              <Text style={styles.emptyText}>No errors logged recently!</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
