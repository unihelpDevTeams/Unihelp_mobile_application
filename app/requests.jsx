import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { colors, spacing, borderRadius, shadows } from '../src/shared/theme';
import ScreenShell from '../src/shared/components/ScreenShell';
import EmptyState from '../src/shared/components/EmptyState';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'view', label: 'Browse Requests', icon: 'search-outline' },
  { key: 'create', label: 'Make a Request', icon: 'add-circle-outline' },
];

const REQUEST_TYPES = [
  { key: 'note', label: 'Lecture Note', icon: 'book-outline', color: colors.brand },
  { key: 'question', label: 'Past Question', icon: 'clipboard-outline', color: colors.blue },
];

export default function RequestsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('view');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reqType, setReqType] = useState('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [notesSnap, questionsSnap] = await Promise.all([
          getDocs(query(collection(db, 'noteRequests'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'questionRequests'), orderBy('createdAt', 'desc'))),
        ]);
        const noteReqs = notesSnap.docs.map((d) => ({ ...d.data(), id: d.id, type: 'note' }));
        const questionReqs = questionsSnap.docs.map((d) => ({ ...d.data(), id: d.id, type: 'question' }));
        setRequests([...noteReqs, ...questionReqs].sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        }));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setSuccess('');
    try {
      const collectionName = reqType === 'note' ? 'noteRequests' : 'questionRequests';
      await addDoc(collection(db, collectionName), {
        title: title.trim(),
        description: description.trim(),
        course: course.trim(),
        type: reqType,
        userId: user?.uid || 'anonymous',
        userName: profile?.username || user?.displayName || 'Anonymous',
        status: 'open',
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000),
      });
      setTitle('');
      setDescription('');
      setCourse('');
      setSuccess('Your request has been submitted! It will be visible for 48 hours.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit request.');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (ts) => {
    try {
      const date = ts?.toDate?.() || new Date(ts);
      const now = new Date();
      const diff = now - date;
      const hours = Math.floor(diff / 3600000);
      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago (${48 - Math.min(days, 48)}h left)`;
    } catch { return ''; }
  };

  return (
    <ScreenShell title="Requests" subtitle="Request notes & past questions from the community" showBack>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={16} color={tab === t.key ? colors.surface : colors.grey} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'create' ? (
        <View style={styles.form}>
          {/* Type selector */}
          <Text style={styles.label}>Request Type</Text>
          <View style={styles.typeRow}>
            {REQUEST_TYPES.map((rt) => (
              <Pressable
                key={rt.key}
                style={({ pressed }) => [
                  styles.typeChip,
                  reqType === rt.key && { backgroundColor: rt.color, borderColor: rt.color },
                  pressed && styles.typeChipPressed,
                ]}
                onPress={() => setReqType(rt.key)}
              >
                <Ionicons name={rt.icon} size={16} color={reqType === rt.key ? '#FFF' : rt.color} />
                <Text style={[styles.typeChipText, reqType === rt.key && { color: '#FFF' }]}>{rt.label}</Text>
              </Pressable>
            ))}
          </View>

          {success ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Title *</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Calculus Lecture Notes - Chapter 5" placeholderTextColor={colors.greyLight} />

          <Text style={styles.label}>Course / Subject</Text>
          <TextInput style={styles.input} value={course} onChangeText={setCourse} placeholder="e.g. MTH 101" placeholderTextColor={colors.greyLight} />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Any specific details about what you need..." placeholderTextColor={colors.greyLight} multiline numberOfLines={4} textAlignVertical="top" />

          <Pressable
            style={({ pressed }) => [styles.submitBtn, (!title.trim() || saving) && styles.submitBtnDisabled, pressed && { opacity: 0.8 }]}
            onPress={handleSubmit}
            disabled={saving || !title.trim()}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#FFF" />
                <Text style={styles.submitText}>Submit Request</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.hint}>Requests automatically expire after 48 hours</Text>
        </View>
      ) : (
        <>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.brand} />
              {[1,2,3].map(i => <View key={i} style={styles.skeleton} />)}
            </View>
          ) : requests.length > 0 ? (
            <View style={styles.list}>
              {requests.map((req) => (
                <View key={req.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.cardIcon, { backgroundColor: req.type === 'note' ? colors.brandLight : '#0EA5E915' }]}>
                      <Ionicons name={req.type === 'note' ? 'book' : 'clipboard'} size={16} color={req.type === 'note' ? colors.brand : '#0EA5E9'} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{req.title}</Text>
                      <Text style={styles.cardMeta}>
                        {req.userName || 'Anonymous'} · {formatTime(req.createdAt)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: req.status === 'fulfilled' ? '#05966915' : '#F59E0B15' }]}>
                      <Text style={[styles.statusText, { color: req.status === 'fulfilled' ? '#059669' : '#D97706' }]}>
                        {req.status === 'fulfilled' ? 'Fulfilled' : 'Open'}
                      </Text>
                    </View>
                  </View>
                  {req.description ? <Text style={styles.cardDesc} numberOfLines={2}>{req.description}</Text> : null}
                  {req.course ? (
                    <View style={styles.courseChip}>
                      <Ionicons name="school-outline" size={12} color={colors.brand} />
                      <Text style={styles.courseChipText}>{req.course}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title="No requests yet" description="Be the first to request a note or past question." actionLabel="Make a Request" onAction={() => setTab('create')} />
          )}
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing['2xl'],
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabActive: {
    backgroundColor: colors.brand,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.grey,
  },
  tabTextActive: {
    color: colors.surface,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipPressed: { opacity: 0.8 },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkMuted,
  },
  form: { gap: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: borderRadius.xl,
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  hint: {
    fontSize: 11,
    color: colors.greyLight,
    textAlign: 'center',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: borderRadius.md,
    padding: 12,
  },
  successText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    flex: 1,
  },
  list: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  cardMeta: {
    fontSize: 11,
    color: colors.grey,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  courseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    backgroundColor: colors.brandLight,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  courseChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand,
  },
  loadingWrap: {
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  skeleton: {
    height: 100,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.skeleton,
  },
});