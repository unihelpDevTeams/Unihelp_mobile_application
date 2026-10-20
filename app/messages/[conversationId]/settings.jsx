import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import ScreenShell from '../../../src/shared/components/ScreenShell';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../../src/shared/theme/createStyles';
import { db } from '../../../firebase/config';

export default function ConversationSettingsScreen() {
  const router = useRouter();
  const { conversationId: rawConversationId } = useLocalSearchParams();
  const conversationId = Array.isArray(rawConversationId) ? rawConversationId[0] : rawConversationId;
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const uid = user?.uid || profile?.uid;
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const styles = useThemeStyles((c, s, r) => ({
    content: { gap: s.md, paddingBottom: s['3xl'] },
    intro: { color: c.textSecondary, fontSize: 13, lineHeight: 20 },
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl, overflow: 'hidden' },
    settingRow: { minHeight: 72, paddingHorizontal: s.md, flexDirection: 'row', alignItems: 'center', gap: s.md },
    iconWrap: { width: 40, height: 40, borderRadius: r.lg, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    copy: { flex: 1 },
    title: { color: c.textPrimary, fontSize: 14, fontWeight: '800' },
    subtitle: { color: c.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
    note: { flexDirection: 'row', gap: s.sm, padding: s.md, borderRadius: r.lg, backgroundColor: c.surfaceSecondary, alignItems: 'flex-start' },
    noteText: { flex: 1, color: c.textSecondary, fontSize: 12, lineHeight: 18 },
    status: { color: c.brandText, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    dangerButton: { minHeight: 48, borderRadius: r.lg, borderWidth: 1, borderColor: c.dangerBorder, backgroundColor: c.dangerLight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: s.sm },
    dangerText: { color: c.danger, fontSize: 13, fontWeight: '800' },
  }));

  const loadSettings = useCallback(async () => {
    if (!uid || !conversationId) {
      setLoading(false);
      return;
    }
    try {
      const snapshot = await getDoc(doc(db, 'users', uid, 'conversationSettings', conversationId));
      setMuted(snapshot.exists() && snapshot.data()?.muted === true);
    } catch {
      setMessage('Could not load your settings. You can still try again.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, uid]);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      loadSettings();
    }, 0);
    return () => clearTimeout(initialLoad);
  }, [loadSettings]);

  const updateMuted = async (nextMuted) => {
    if (!uid || !conversationId || saving) return;
    const previous = muted;
    setMuted(nextMuted);
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'users', uid, 'conversationSettings', conversationId), {
        muted: nextMuted,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setMessage(nextMuted ? 'Notifications are muted for this conversation.' : 'Notifications are enabled for this conversation.');
    } catch {
      setMuted(previous);
      setMessage('Could not update notification settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell title="Conversation settings" subtitle="Controls that only affect you" showBack scrollable>
      <View style={styles.content}>
        <Text style={styles.intro}>Manage alerts for this chat without changing anything for the other person.</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.iconWrap}>
              <Ionicons name={muted ? 'notifications-off-outline' : 'notifications-outline'} size={20} color={colors.brand} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>Message notifications</Text>
              <Text style={styles.subtitle}>{muted ? 'Muted. New messages stay in the chat, without push alerts.' : 'On. You will be alerted about new messages.'}</Text>
            </View>
            {loading || saving ? <ActivityIndicator size="small" color={colors.brand} /> : <Switch value={!muted} onValueChange={(enabled) => updateMuted(!enabled)} trackColor={{ false: colors.borderDefault, true: colors.brand }} thumbColor={colors.surfacePrimary} accessibilityLabel="Toggle conversation notifications" />}
          </View>
        </View>
        {message ? <Text style={styles.status}>{message}</Text> : null}
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
          <Text style={styles.noteText}>Muted chats still receive messages. You can turn notifications back on here at any time.</Text>
        </View>
        <Pressable style={styles.dangerButton} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={17} color={colors.danger} />
          <Text style={styles.dangerText}>Back to conversation</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}
