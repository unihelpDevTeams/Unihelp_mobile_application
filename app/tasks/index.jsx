import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

const DISPLAY_FONT = undefined;

const emptyTask = { title: '', description: '', dueDate: '', reminderTime: '09:00' };

// Order sections appear in: what needs attention first, at the top.
const STATUS_ORDER = ['overdue', 'today', 'upcoming', 'none', 'done'];

function getDueStatus(dueDate, completed) {
  if (completed) return 'done';
  if (!dueDate) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  if (Number.isNaN(target.getTime())) return 'none';
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  return 'upcoming';
}

function getStatusMeta(colors) {
  return {
    overdue: { label: 'Overdue', tone: colors.danger, soft: colors.dangerLight },
    today: { label: 'Due today', tone: colors.gold, soft: colors.goldLight },
    upcoming: { label: 'Upcoming', tone: colors.brand, soft: colors.brandLight },
    done: { label: 'Done', tone: colors.success, soft: colors.greenLight },
    none: { label: 'No date', tone: colors.grey, soft: colors.surfaceSecondary },
  };
}

export default function TasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const { colors } = useTheme();
  const isMounted = useRef(true);

  useEffect(() => () => { isMounted.current = false; }, []);

  const statusMeta = useMemo(() => getStatusMeta(colors), [colors]);

  const styles = useThemeStyles((c, s, r) => ({
    eyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.6,
      color: c.brand,
      marginBottom: s.sm,
    },
    progressCard: {
      backgroundColor: c.card,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginBottom: s.lg,
    },
    progressTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: s.sm,
    },
    progressHeadline: {
      fontSize: 17,
      fontWeight: '800',
      fontFamily: DISPLAY_FONT,
      color: c.textPrimary,
    },
    progressPending: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      flexDirection: 'row',
      overflow: 'hidden',
      backgroundColor: c.surfaceSecondary,
    },
    progressFill: {
      backgroundColor: c.brand,
    },
    composerToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      alignSelf: 'flex-start',
      marginBottom: s.lg,
      paddingVertical: s.xs,
    },
    composerToggleText: {
      color: c.brandText,
      fontWeight: '800',
      fontSize: 14,
    },
    composerCard: {
      backgroundColor: c.card,
      borderRadius: r['3xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginBottom: s.lg,
      overflow: 'hidden',
    },
    foldCorner: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 0,
      height: 0,
      borderTopWidth: 26,
      borderLeftWidth: 26,
      borderTopColor: c.gold,
      borderLeftColor: 'transparent',
      opacity: 0.9,
    },
    composerHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.md,
    },
    composerTitle: {
      fontSize: 15,
      fontWeight: '800',
      fontFamily: DISPLAY_FONT,
      color: c.textPrimary,
    },
    clearText: {
      color: c.textTertiary,
      fontSize: 12,
      fontWeight: '700',
    },
    input: {
      backgroundColor: c.inputBackground,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.lg,
      padding: s.md,
      marginBottom: s.md,
      color: c.textPrimary,
    },
    inputError: {
      borderColor: c.danger,
    },
    fieldError: {
      color: c.danger,
      fontSize: 11.5,
      fontWeight: '600',
      marginTop: -6,
      marginBottom: s.md,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    inputRow: {
      flexDirection: 'row',
      gap: s.md,
    },
    inputHalf: {
      flex: 1,
    },
    saveButton: {
      flexDirection: 'row',
      gap: s.sm,
      backgroundColor: c.brand,
      borderRadius: r.xl,
      paddingVertical: s.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: s.sm,
    },
    saveButtonDisabled: {
      backgroundColor: c.brandGlow,
    },
    saveButtonText: {
      color: c.onBrand,
      fontWeight: '800',
      fontSize: 14,
    },
    sectionBlock: {
      marginBottom: s.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      marginBottom: s.sm,
    },
    sectionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    sectionLabel: {
      fontSize: 12.5,
      fontWeight: '800',
      color: c.textSecondary,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    sectionCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
    },
    taskCard: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: r['3xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      marginBottom: s.md,
      overflow: 'hidden',
    },
    taskEdge: {
      width: 5,
    },
    taskBody: {
      flex: 1,
      padding: s.lg,
    },
    taskHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: s.md,
    },
    taskTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      fontFamily: DISPLAY_FONT,
      color: c.textPrimary,
    },
    taskTitleDone: {
      color: c.textSecondary,
      textDecorationLine: 'line-through',
    },
    statusPill: {
      borderRadius: r.full,
      paddingHorizontal: s.sm,
      paddingVertical: s.xs,
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    taskText: {
      marginTop: s.sm,
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    taskMeta: {
      marginTop: s.sm,
      color: c.textTertiary,
      fontSize: 11,
      fontWeight: '700',
    },
    taskActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: s.md,
    },
    stampWrap: {
      transform: [{ rotate: '-3deg' }],
    },
    stamp: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      borderWidth: 1.5,
      borderColor: c.success,
      borderRadius: r.lg,
      paddingHorizontal: s.md,
      paddingVertical: s.sm,
      minWidth: 96,
      justifyContent: 'center',
    },
    stampActive: {
      backgroundColor: c.brand,
      borderColor: c.brand,
    },
    stampPending: {
      opacity: 0.6,
    },
    stampText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: c.success,
    },
    stampTextActive: {
      color: c.onBrand,
    },
    deleteAction: {
      width: 36,
      height: 36,
      borderRadius: r.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.dangerLight,
    },
    deleteActionPending: {
      opacity: 0.6,
    },
  }));

  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter((task) => task.completed).length,
    pending: tasks.filter((task) => !task.completed).length,
  }), [tasks]);

  const progressRatio = stats.total ? stats.done / stats.total : 0;

  // Group instead of just sort: sections make the list scannable at a
  // glance, and let each group's heading carry the status color + count.
  const groupedTasks = useMemo(() => {
    const groups = { overdue: [], today: [], upcoming: [], none: [], done: [] };
    tasks.forEach((task) => {
      const status = getDueStatus(task.dueDate, task.completed);
      groups[status].push(task);
    });
    return groups;
  }, [tasks]);

  const load = async () => {
    if (!profile?.uid) {
      if (isMounted.current) setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(query(collection(db, 'tasks'), where('userId', '==', profile.uid), orderBy('createdAt', 'desc')));
      if (isMounted.current) setTasks(snap.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => { if (isMounted.current) setLoading(false); });
  }, [profile?.uid]);

  const isFormDirty = useMemo(
    () => Object.keys(form).some((key) => form[key] !== emptyTask[key]),
    [form]
  );

  const setPending = (id, value) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id); else next.delete(id);
      return next;
    });
  };

  const save = async () => {
    if (!profile?.uid) return;
    if (!form.title.trim()) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    setSaving(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        reminderTime: form.reminderTime || '09:00',
        completed: false,
        notified: false,
        userId: profile.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (!isMounted.current) return;
      setForm(emptyTask);
      setComposerOpen(false);
      await load();
    } catch (error) {
      Alert.alert('Could not save task', error?.message || 'Please try again.');
      console.log( error?.message)
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const toggleComplete = async (task) => {
    if (pendingIds.has(task.id)) return;
    setPending(task.id, true);
    try {
      await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed, updatedAt: serverTimestamp() });
      await load();
    } catch (error) {
      Alert.alert('Could not update task', error?.message || 'Please try again.');
    } finally {
      if (isMounted.current) setPending(task.id, false);
    }
  };

  const removeTask = async (task) => {
    if (pendingIds.has(task.id)) return;
    setPending(task.id, true);
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      await load();
    } catch (error) {
      Alert.alert('Could not delete task', error?.message || 'Please try again.');
      if (isMounted.current) setPending(task.id, false);
    }
  };

  const confirmDelete = (task) => {
    Alert.alert(
      'Delete task',
      `Delete "${task.title}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeTask(task) },
      ]
    );
  };

  const renderTask = (task) => {
    const status = getDueStatus(task.dueDate, task.completed);
    const meta = statusMeta[status];
    const isPending = pendingIds.has(task.id);
    return (
      <View key={task.id} style={styles.taskCard}>
        <View style={[styles.taskEdge, { backgroundColor: meta.tone }]} />
        <View style={styles.taskBody}>
          <View style={styles.taskHeaderRow}>
            <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: meta.soft }]}>
              <Text style={[styles.statusPillText, { color: meta.tone }]}>{meta.label}</Text>
            </View>
          </View>
          {task.description ? (
            <Text style={styles.taskText} numberOfLines={2}>{task.description}</Text>
          ) : null}
          <Text style={styles.taskMeta}>
            {task.dueDate || 'No due date'} · reminder {task.reminderTime || '09:00'}
          </Text>
          <View style={styles.taskActions}>
            <Pressable
              onPress={() => toggleComplete(task)}
              disabled={isPending}
              style={styles.stampWrap}
              accessibilityRole="button"
              accessibilityLabel={task.completed ? 'Mark as not done' : 'Mark as done'}
            >
              <View style={[styles.stamp, task.completed && styles.stampActive, isPending && styles.stampPending]}>
                {isPending ? (
                  <ActivityIndicator size="small" color={task.completed ? colors.onBrand : colors.success} />
                ) : (
                  <Ionicons name="checkmark" size={13} color={task.completed ? colors.onBrand : colors.success} />
                )}
                <Text style={[styles.stampText, task.completed && styles.stampTextActive]}>
                  {task.completed ? 'DONE' : 'MARK DONE'}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(task)}
              disabled={isPending}
              style={[styles.deleteAction, isPending && styles.deleteActionPending]}
              accessibilityRole="button"
              accessibilityLabel={`Delete "${task.title}"`}
              hitSlop={6}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenShell title="Tasks" subtitle="Everything due this semester, in one place." showBack loading={loading}>
      <Text style={styles.eyebrow}>YOUR SEMESTER</Text>

      <View style={styles.progressCard}>
        <View style={styles.progressTopRow}>
          <Text style={styles.progressHeadline}>{stats.done} of {stats.total || 0} cleared</Text>
          <Text style={styles.progressPending}>{stats.pending} pending</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: Math.max(progressRatio, 0.02) }]} />
          <View style={{ flex: Math.max(1 - progressRatio, 0.02) }} />
        </View>
      </View>

      <Pressable
        style={styles.composerToggle}
        onPress={() => setComposerOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={composerOpen ? 'Close new task form' : 'Add a new task'}
      >
        <Ionicons name={composerOpen ? 'remove-circle-outline' : 'add-circle'} size={20} color={colors.brand} />
        <Text style={styles.composerToggleText}>{composerOpen ? 'Close' : 'Add a new task'}</Text>
      </Pressable>

      {composerOpen ? (
        <View style={styles.composerCard}>
          <View style={styles.foldCorner} />
          <View style={styles.composerHeaderRow}>
            <Text style={styles.composerTitle}>New entry</Text>
            {isFormDirty ? (
              <Pressable onPress={() => { setForm(emptyTask); setTitleError(false); }} hitSlop={6}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            style={[styles.input, titleError && styles.inputError]}
            placeholder="What's due?"
            placeholderTextColor={colors.placeholder}
            value={form.title}
            onChangeText={(value) => {
              setForm((current) => ({ ...current, title: value }));
              if (titleError && value.trim()) setTitleError(false);
            }}
            returnKeyType="next"
          />
          {titleError ? <Text style={styles.fieldError}>Give this task a title before saving.</Text> : null}
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            placeholder="Notes (optional)"
            placeholderTextColor={colors.placeholder}
            value={form.description}
            onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.placeholder}
              value={form.dueDate}
              onChangeText={(value) => setForm((current) => ({ ...current, dueDate: value }))}
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="HH:MM"
              placeholderTextColor={colors.placeholder}
              value={form.reminderTime}
              onChangeText={(value) => setForm((current) => ({ ...current, reminderTime: value }))}
            />
          </View>
          <Pressable
            style={[styles.saveButton, (saving || !form.title.trim()) && styles.saveButtonDisabled]}
            onPress={save}
            disabled={saving || !form.title.trim()}
            accessibilityRole="button"
            accessibilityLabel="Save to planner"
          >
            {saving ? <ActivityIndicator color={colors.onBrand} /> : (
              <Text style={styles.saveButtonText}>Save to planner</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {stats.total > 0 ? (
        STATUS_ORDER.map((status) => {
          const group = groupedTasks[status];
          if (!group.length) return null;
          const meta = statusMeta[status];
          return (
            <View key={status} style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: meta.tone }]} />
                <Text style={styles.sectionLabel}>{meta.label}</Text>
                <Text style={styles.sectionCount}>{group.length}</Text>
              </View>
              {group.map(renderTask)}
            </View>
          );
        })
      ) : (
        <EmptyState title="Nothing due" description="Your slate's clear. Add a task and it'll land on your planner." />
      )}
    </ScreenShell>
  );
}