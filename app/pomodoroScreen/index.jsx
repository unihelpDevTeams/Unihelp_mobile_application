import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import usePomodoro from '../../src/shared/hooks/usePomodoro';
import {
  DEFAULT_POMODORO_SETTINGS,
  POMODORO_MODES,
} from '../../src/shared/utils/pomodoroEngine';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

const MODE_DETAILS = {
  [POMODORO_MODES.FOCUS]: { label: 'Focus', icon: 'eye-outline', colorKey: 'brand' },
  [POMODORO_MODES.SHORT_BREAK]: { label: 'Short break', icon: 'cafe-outline', colorKey: 'green' },
  [POMODORO_MODES.LONG_BREAK]: { label: 'Long break', icon: 'leaf-outline', colorKey: 'info' },
};

const DEFAULT_TASKS = [
  { id: '1', title: 'Review Physics Past Questions', completed: false },
  { id: '2', title: 'Complete Mathematics Practice Test', completed: true },
];

const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

function SettingNumber({ label, value, min, max, onChangeText, styles, colors }) {
  return (
    <View style={styles.settingField}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.numberInputRow}>
        <TextInput
          accessibilityLabel={`${label} in minutes`}
          style={styles.numberInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          maxLength={3}
          selectTextOnFocus
        />
        <Text style={[styles.settingUnit, { color: colors.textTertiary }]}>min</Text>
      </View>
      <Text style={styles.settingHint}>{min}–{max} minutes</Text>
    </View>
  );
}

function SettingToggle({ label, description, value, onValueChange, styles, colors }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingHint}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.borderDefault, true: colors.brand }}
        thumbColor={colors.surfacePrimary}
      />
    </View>
  );
}

export default function PomodoroScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    state,
    settings,
    ready,
    error,
    notificationWarning,
    start,
    pause,
    reset,
    skip,
    selectMode,
    updateSettings,
  } = usePomodoro();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(DEFAULT_POMODORO_SETTINGS);
  const [settingsError, setSettingsError] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskList, setTaskList] = useState(DEFAULT_TASKS);

  const styles = useThemeStyles((c, s, r) => ({
    screen: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: s.lg, paddingTop: s.md, paddingBottom: s['4xl'], gap: s.lg },
    intro: { marginBottom: s.xs },
    eyebrow: { color: c.brand, fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
    introText: { color: c.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
    card: {
      backgroundColor: c.surfacePrimary,
      borderRadius: r['3xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.05,
      shadowRadius: 14,
      elevation: 2,
    },
    modeRow: { flexDirection: 'row', padding: 5, borderRadius: r.xl, backgroundColor: c.surfaceSecondary, gap: 4 },
    modeButton: { flex: 1, minHeight: 46, paddingHorizontal: 4, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center' },
    modeButtonActive: { backgroundColor: c.surfacePrimary, borderWidth: 1, borderColor: c.borderDefault },
    modeButtonDisabled: { opacity: 0.52 },
    modeLabel: { fontSize: 11, fontWeight: '800', color: c.textSecondary },
    timerCard: { alignItems: 'center', paddingTop: s['2xl'], paddingBottom: s['2xl'] },
    phasePill: {
      flexDirection: 'row', alignItems: 'center', gap: s.xs,
      paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: r.full,
      marginBottom: s.lg,
    },
    phasePillText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
    timer: { color: c.textPrimary, fontSize: 58, lineHeight: 70, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -2 },
    timerStatus: { color: c.textSecondary, fontSize: 13, marginTop: s.xs, minHeight: 20, textAlign: 'center' },
    progressTrack: { width: '100%', height: 8, borderRadius: r.full, backgroundColor: c.surfaceSecondary, overflow: 'hidden', marginTop: s.xl },
    progressFill: { height: '100%', borderRadius: r.full },
    progressMeta: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: s.sm },
    progressText: { color: c.textTertiary, fontSize: 11, fontWeight: '700' },
    cycleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: s.xl },
    cycleLabel: { fontSize: 12, fontWeight: '800', color: c.textSecondary },
    dotsRow: { flexDirection: 'row', gap: 7 },
    cycleDot: { height: 10, width: 10, borderRadius: 5, borderWidth: 1.5, borderColor: c.brand },
    primaryButton: {
      minHeight: 54, alignSelf: 'stretch', borderRadius: r.xl, marginTop: s.xl,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s.sm,
    },
    primaryButtonText: { color: c.onBrand, fontSize: 15, fontWeight: '900' },
    secondaryActions: { flexDirection: 'row', gap: s.sm, width: '100%', marginTop: s.sm },
    secondaryButton: {
      flex: 1, minHeight: 46, borderRadius: r.lg, borderWidth: 1, borderColor: c.borderDefault,
      backgroundColor: c.surfaceSecondary, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 7,
    },
    secondaryButtonText: { color: c.textSecondary, fontSize: 13, fontWeight: '800' },
    settingsButton: { width: 46, minHeight: 46, borderRadius: r.lg, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceSecondary },
    notice: { alignSelf: 'stretch', marginTop: s.md, padding: s.md, borderRadius: r.lg, backgroundColor: c.brandLight, flexDirection: 'row', gap: s.sm, alignItems: 'flex-start' },
    noticeText: { flex: 1, color: c.textSecondary, fontSize: 12, lineHeight: 18 },
    errorNotice: { backgroundColor: c.dangerLight },
    errorText: { color: c.danger, fontSize: 12, lineHeight: 18, flex: 1 },
    sectionTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '900', marginBottom: s.md },
    tasksCard: { gap: s.sm },
    taskInputRow: { minHeight: 48, borderRadius: r.lg, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.surfaceSecondary, paddingLeft: s.md, paddingRight: 5, flexDirection: 'row', alignItems: 'center' },
    taskInput: { flex: 1, color: c.textPrimary, fontSize: 13, paddingVertical: s.sm },
    addTaskButton: { width: 38, height: 38, borderRadius: r.md, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
    taskRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault },
    taskToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: s.sm, gap: s.sm },
    taskTitle: { flex: 1, color: c.textPrimary, fontSize: 13, fontWeight: '600' },
    taskCompleted: { color: c.textTertiary, textDecorationLine: 'line-through' },
    deleteTaskButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
    modalCard: { backgroundColor: c.modalBackground, borderTopLeftRadius: r['3xl'], borderTopRightRadius: r['3xl'], paddingHorizontal: s.lg, paddingTop: s.lg, paddingBottom: s['3xl'], maxHeight: '92%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md },
    modalTitle: { color: c.textPrimary, fontSize: 19, fontWeight: '900' },
    closeButton: { width: 42, height: 42, borderRadius: r.full, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
    modalDescription: { color: c.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: s.lg },
    settingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s.md },
    settingField: { width: '47%', gap: 5, marginBottom: s.sm },
    settingLabel: { color: c.textPrimary, fontSize: 13, fontWeight: '800' },
    numberInputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderRadius: r.md, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.surfaceSecondary, paddingHorizontal: s.md },
    numberInput: { flex: 1, color: c.textPrimary, fontSize: 16, fontWeight: '800', paddingVertical: 8 },
    settingUnit: { fontSize: 12, fontWeight: '700' },
    settingHint: { color: c.textTertiary, fontSize: 11, lineHeight: 15 },
    toggleSection: { marginTop: s.md, borderTopWidth: 1, borderTopColor: c.borderDefault },
    toggleRow: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: c.borderDefault, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s.md },
    toggleCopy: { flex: 1, gap: 3 },
    settingsError: { color: c.danger, fontSize: 12, lineHeight: 17, marginTop: s.md },
    saveButton: { minHeight: 50, borderRadius: r.lg, marginTop: s.lg, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
    saveButtonText: { color: c.onBrand, fontSize: 14, fontWeight: '900' },
  }));

  const mode = state ? MODE_DETAILS[state.mode] : MODE_DETAILS[POMODORO_MODES.FOCUS];
  const accent = colors[mode.colorKey] || colors.brand;
  const progress = state?.durationSeconds
    ? Math.min(1, Math.max(0, (state.durationSeconds - state.remainingSeconds) / state.durationSeconds))
    : 0;
  const isActive = state?.status === 'running' || state?.status === 'paused';
  const selectorDisabled = isActive;
  const cycleSession = Math.min(state?.completedSessions || 0, settings?.sessionsBeforeLongBreak || 4);
  const statusText = state?.status === 'running'
    ? 'Stay with one thing. You are doing great.'
    : state?.status === 'paused'
      ? 'Paused — your remaining time is saved.'
      : state?.status === 'completed'
        ? `${MODE_DETAILS[state.lastCompletedMode]?.label || 'Session'} complete. Your next phase is ready.`
        : state?.status === 'idle'
          ? 'A little focus goes a long way.'
          : '';

  const openSettings = () => {
    setSettingsDraft({ ...settings });
    setSettingsError('');
    setShowSettings(true);
  };

  const updateDraft = (key, value) => {
    const numeric = ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'sessionsBeforeLongBreak'].includes(key);
    setSettingsDraft((current) => ({
      ...current,
      [key]: numeric ? value.replace(/[^\d]/g, '') : value,
    }));
  };

  const saveSettings = async () => {
    const ranges = {
      focusMinutes: [1, 120, 'Focus duration'],
      shortBreakMinutes: [1, 60, 'Short break'],
      longBreakMinutes: [1, 120, 'Long break'],
      sessionsBeforeLongBreak: [1, 12, 'Sessions before long break'],
    };
    for (const [key, [min, max, label]] of Object.entries(ranges)) {
      const number = Number(settingsDraft[key]);
      if (!Number.isInteger(number) || number < min || number > max) {
        setSettingsError(`${label} must be between ${min} and ${max}.`);
        return;
      }
    }
    await updateSettings(settingsDraft);
    setShowSettings(false);
  };

  const addTask = () => {
    const title = taskName.trim();
    if (!title) return;
    setTaskList((current) => [...current, { id: `${Date.now()}-${Math.random()}`, title, completed: false }]);
    setTaskName('');
  };

  const toggleTask = (id) => {
    setTaskList((current) => current.map((item) => (
      item.id === id ? { ...item, completed: !item.completed } : item
    )));
  };

  const sessionCaption = useMemo(() => {
    const total = settings?.sessionsBeforeLongBreak || 4;
    if (state?.mode === POMODORO_MODES.LONG_BREAK) return `${total} of ${total} focus sessions · long break`;
    return `Session ${Math.min(cycleSession + 1, total)} of ${total}`;
  }, [cycleSession, settings?.sessionsBeforeLongBreak, state?.mode]);

  return (
    <ScreenShell showBack title="Focus Timer" onBack={() => router.back()} scrollable={false}>
      {!ready || !state || !settings ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand} />
          <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 13 }}>Restoring your timer…</Text>
        </View>
      ) : (
        <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>Study with intention</Text>
            <Text style={styles.introText}>Focused sessions, well-earned breaks, and steady progress.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.modeRow} accessibilityRole="tablist">
              {Object.entries(MODE_DETAILS).map(([key, item]) => {
                const selected = state.mode === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected, disabled: selectorDisabled }}
                    accessibilityLabel={`${item.label}${selectorDisabled ? ', unavailable while timer is active' : ''}`}
                    disabled={selectorDisabled}
                    onPress={() => selectMode(key)}
                    style={[styles.modeButton, selected && styles.modeButtonActive, selectorDisabled && styles.modeButtonDisabled]}
                  >
                    <Text style={[styles.modeLabel, selected && { color: colors[item.colorKey] || colors.brand }]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.timerCard, styles.card, { marginTop: 18, width: '100%', borderColor: colors.borderDefault }]}>
              <View style={[styles.phasePill, { backgroundColor: `${accent}1A` }]}>
                <Ionicons name={mode.icon} size={16} color={accent} />
                <Text style={[styles.phasePillText, { color: accent }]}>{mode.label}</Text>
              </View>
              <Text
                style={styles.timer}
                accessibilityRole="timer"
                accessibilityLabel={`${mode.label}, ${formatTime(state.remainingSeconds)} remaining`}
              >
                {formatTime(state.remainingSeconds)}
              </Text>
              <Text style={styles.timerStatus} accessibilityLiveRegion="polite">{statusText}</Text>

              <View
                style={styles.progressTrack}
                accessible
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
                accessibilityLabel={`${mode.label} progress`}
              >
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressText}>{state.status === 'running' ? 'IN PROGRESS' : state.status.toUpperCase()}</Text>
                <Text style={styles.progressText}>{sessionCaption}</Text>
              </View>

              <View style={styles.cycleRow}>
                <Text style={styles.cycleLabel}>Focus cycle</Text>
                <View style={styles.dotsRow} accessibilityLabel={`${cycleSession} of ${settings.sessionsBeforeLongBreak} focus sessions completed`}>
                  {Array.from({ length: settings.sessionsBeforeLongBreak }, (_, index) => (
                    <View
                      key={`cycle-${index}`}
                      style={[styles.cycleDot, index < cycleSession && { backgroundColor: accent, borderColor: accent }]}
                    />
                  ))}
                </View>
              </View>

              <Pressable
                onPress={state.status === 'running' ? pause : start}
                accessibilityRole="button"
                accessibilityLabel={state.status === 'running' ? 'Pause Pomodoro timer' : state.status === 'paused' ? 'Resume Pomodoro timer' : 'Start Pomodoro timer'}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: accent, opacity: pressed ? 0.88 : 1 }]}
              >
                <Ionicons name={state.status === 'running' ? 'pause' : 'play'} size={19} color={colors.onBrand} />
                <Text style={styles.primaryButtonText}>
                  {state.status === 'running'
                    ? 'Pause'
                    : state.status === 'paused'
                      ? 'Resume'
                      : `Start ${mode.label.toLowerCase()}`}
                </Text>
              </Pressable>

              <View style={styles.secondaryActions}>
                <Pressable
                  onPress={reset}
                  accessibilityRole="button"
                  accessibilityLabel="Reset current Pomodoro phase"
                  style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.75 }]}
                >
                  <Ionicons name="refresh-outline" size={17} color={colors.textSecondary} />
                  <Text style={styles.secondaryButtonText}>Reset</Text>
                </Pressable>
                <Pressable
                  onPress={skip}
                  accessibilityRole="button"
                  accessibilityLabel="Skip current Pomodoro phase"
                  style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.75 }]}
                >
                  <Ionicons name="play-skip-forward-outline" size={17} color={colors.textSecondary} />
                  <Text style={styles.secondaryButtonText}>Skip</Text>
                </Pressable>
                <Pressable
                  onPress={openSettings}
                  accessibilityRole="button"
                  accessibilityLabel="Open Pomodoro settings"
                  style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.75 }]}
                >
                  <Ionicons name="settings-outline" size={19} color={colors.textSecondary} />
                </Pressable>
              </View>

              {notificationWarning ? (
                <View style={styles.notice}>
                  <Ionicons name="notifications-off-outline" size={17} color={colors.brand} />
                  <Text style={styles.noticeText}>{notificationWarning}</Text>
                </View>
              ) : null}
              {error ? (
                <View style={[styles.notice, styles.errorNotice]}>
                  <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[styles.card, styles.tasksCard]}>
            <Text style={styles.sectionTitle}>Study session goals</Text>
            <View style={styles.taskInputRow}>
              <TextInput
                accessibilityLabel="New study goal"
                style={styles.taskInput}
                placeholder="Add a goal for this session"
                placeholderTextColor={colors.textTertiary}
                value={taskName}
                onChangeText={setTaskName}
                onSubmitEditing={addTask}
                returnKeyType="done"
                maxLength={120}
              />
              <Pressable onPress={addTask} accessibilityRole="button" accessibilityLabel="Add study goal" style={styles.addTaskButton}>
                <Ionicons name="add" size={22} color={colors.onBrand} />
              </Pressable>
            </View>
            {taskList.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <Pressable
                  onPress={() => toggleTask(task.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.completed }}
                  accessibilityLabel={task.title}
                  style={styles.taskToggle}
                >
                  <Ionicons
                    name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={21}
                    color={task.completed ? colors.success : colors.textTertiary}
                  />
                  <Text style={[styles.taskTitle, task.completed && styles.taskCompleted]}>{task.title}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTaskList((current) => current.filter((item) => item.id !== task.id))}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete goal ${task.title}`}
                  style={styles.deleteTaskButton}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowSettings(false)} accessibilityLabel="Close settings" />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Focus settings</Text>
              <Pressable onPress={() => setShowSettings(false)} accessibilityRole="button" accessibilityLabel="Close settings" style={styles.closeButton}>
                <Ionicons name="close" size={21} color={colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.modalDescription}>Changes apply to future phases. An active or paused phase keeps its original duration.</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.settingGrid}>
                <SettingNumber
                  label="Focus"
                  value={String(settingsDraft.focusMinutes)}
                  min={1}
                  max={120}
                  onChangeText={(value) => updateDraft('focusMinutes', value)}
                  styles={styles}
                  colors={colors}
                />
                <SettingNumber
                  label="Short break"
                  value={String(settingsDraft.shortBreakMinutes)}
                  min={1}
                  max={60}
                  onChangeText={(value) => updateDraft('shortBreakMinutes', value)}
                  styles={styles}
                  colors={colors}
                />
                <SettingNumber
                  label="Long break"
                  value={String(settingsDraft.longBreakMinutes)}
                  min={1}
                  max={120}
                  onChangeText={(value) => updateDraft('longBreakMinutes', value)}
                  styles={styles}
                  colors={colors}
                />
                <SettingNumber
                  label="Sessions before long break"
                  value={String(settingsDraft.sessionsBeforeLongBreak)}
                  min={1}
                  max={12}
                  onChangeText={(value) => updateDraft('sessionsBeforeLongBreak', value)}
                  styles={styles}
                  colors={colors}
                />
              </View>
              <View style={styles.toggleSection}>
                <SettingToggle
                  label="Auto-start breaks"
                  description="Start the next break when focus ends."
                  value={settingsDraft.autoStartBreak}
                  onValueChange={(value) => updateDraft('autoStartBreak', value)}
                  styles={styles}
                  colors={colors}
                />
                <SettingToggle
                  label="Auto-start focus"
                  description="Start focus when a break ends."
                  value={settingsDraft.autoStartFocus}
                  onValueChange={(value) => updateDraft('autoStartFocus', value)}
                  styles={styles}
                  colors={colors}
                />
                <SettingToggle
                  label="Sound"
                  description="Play the device's default notification sound."
                  value={settingsDraft.sound}
                  onValueChange={(value) => updateDraft('sound', value)}
                  styles={styles}
                  colors={colors}
                />
                <SettingToggle
                  label="Vibration"
                  description="Vibrate on timer completion when supported."
                  value={settingsDraft.vibration}
                  onValueChange={(value) => updateDraft('vibration', value)}
                  styles={styles}
                  colors={colors}
                />
              </View>
              {settingsError ? <Text style={styles.settingsError}>{settingsError}</Text> : null}
              <Pressable onPress={saveSettings} accessibilityRole="button" accessibilityLabel="Save Pomodoro settings" style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save settings</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}
