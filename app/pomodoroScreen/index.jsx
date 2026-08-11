import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Vibration,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';

const MODES = {
  FOCUS: { id: 'FOCUS', label: 'Focus', defaultMinutes: 25, color: '#6366F1' },
  SHORT_BREAK: { id: 'SHORT_BREAK', label: 'Short Break', defaultMinutes: 5, color: '#10B981' },
  LONG_BREAK: { id: 'LONG_BREAK', label: 'Long Break', defaultMinutes: 15, color: '#0EA5E9' },
};

export default function PomodoroScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Timer Configuration State
  const [activeMode, setActiveMode] = useState(MODES.FOCUS);
  const [focusTime, setFocusTime] = useState(25);
  const [shortBreakTime, setShortBreakTime] = useState(5);
  const [longBreakTime, setLongBreakTime] = useState(15);

  // Active Timer Engine State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Settings Modal & Task Tracking
  const [showSettings, setShowSettings] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskList, setTaskList] = useState([
    { id: '1', title: 'Review Physics Past Questions', completed: false },
    { id: '2', title: 'Complete Mathematics Practice Test', completed: true },
  ]);

  const timerRef = useRef(null);

  // Dynamic Theme Styling Values
  const dynamicStyles = {
    cardBg: colors.surface || (isDark ? '#1E293B' : '#FFFFFF'),
    borderColor: colors.border || (isDark ? '#334155' : '#E2E8F0'),
    primaryText: colors.text || (isDark ? '#F8FAFC' : '#0F172A'),
    subText: isDark ? '#94A3B8' : '#64748B',
    inputBg: isDark ? '#0F172A' : '#F8FAFC',
    tabBg: isDark ? '#1E293B' : '#E2E8F0',
  };

  // Handle Mode Switch
  const switchMode = (mode) => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveMode(mode);

    let minutes = mode.defaultMinutes;
    if (mode.id === 'FOCUS') minutes = focusTime;
    if (mode.id === 'SHORT_BREAK') minutes = shortBreakTime;
    if (mode.id === 'LONG_BREAK') minutes = longBreakTime;

    setTimeLeft(minutes * 60);
  };

  // Timer Mechanism
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimerCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Completion Trigger
  const handleTimerCompletion = () => {
    setIsRunning(false);
    Vibration.vibrate([500, 500, 500]);

    if (activeMode.id === 'FOCUS') {
      const updatedSessions = completedSessions + 1;
      setCompletedSessions(updatedSessions);

      if (updatedSessions % 4 === 0) {
        Alert.alert('🎉 Great Job!', 'You completed 4 Focus Sessions! Take a Long Break.', [
          { text: 'Start Long Break', onPress: () => switchMode(MODES.LONG_BREAK) },
        ]);
      } else {
        Alert.alert('⏱ Session Complete', 'Time for a short break!', [
          { text: 'Start Break', onPress: () => switchMode(MODES.SHORT_BREAK) },
        ]);
      }
    } else {
      Alert.alert('☕ Break Over', 'Ready to jump back into Focus mode?', [
        { text: 'Start Focus', onPress: () => switchMode(MODES.FOCUS) },
      ]);
    }
  };

  const togglePlayPause = () => setIsRunning((prev) => !prev);

  const resetTimer = () => {
    setIsRunning(false);
    let minutes = focusTime;
    if (activeMode.id === 'SHORT_BREAK') minutes = shortBreakTime;
    if (activeMode.id === 'LONG_BREAK') minutes = longBreakTime;
    setTimeLeft(minutes * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    if (activeMode.id === 'FOCUS') return focusTime * 60;
    if (activeMode.id === 'SHORT_BREAK') return shortBreakTime * 60;
    return longBreakTime * 60;
  };

  const progressPercent = Math.min(
    100,
    Math.max(0, ((getTotalDuration() - timeLeft) / getTotalDuration()) * 100)
  );

  const addTask = () => {
    if (!taskName.trim()) return;
    setTaskList((prev) => [...prev, { id: Date.now().toString(), title: taskName.trim(), completed: false }]);
    setTaskName('');
  };

  const toggleTask = (id) => {
    setTaskList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const deleteTask = (id) => {
    setTaskList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <ScreenShell showBack title="Focus Timer" onBack={() => router.back()}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mode Selector Tabs */}
        <View style={[styles.tabBar, { backgroundColor: dynamicStyles.tabBg }]}>
          {Object.values(MODES).map((mode) => {
            const isActive = activeMode.id === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => switchMode(mode)}
                style={[
                  styles.tabItem,
                  isActive && [styles.activeTab, { backgroundColor: dynamicStyles.cardBg }]
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? activeMode.color : dynamicStyles.subText }
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Primary Dial Display */}
        <View style={[styles.card, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.borderColor }]}>
          <Text style={[styles.sessionSub, { color: dynamicStyles.subText }]}>
            {activeMode.label} Session
          </Text>

          <Text style={[styles.timerDisplay, { color: dynamicStyles.primaryText }]}>
            {formatTime(timeLeft)}
          </Text>

          {/* Progress Bar */}
          <View style={[styles.progressTrack, { backgroundColor: dynamicStyles.inputBg }]}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercent}%`, backgroundColor: activeMode.color }
              ]}
            />
          </View>

          {/* Session Tracker Pill */}
          <View style={[styles.pillBadge, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#6366F1" />
            <Text style={styles.pillBadgeText}>
              Completed Focus Sessions: {completedSessions}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={resetTimer}
              style={[styles.iconControlBtn, { backgroundColor: dynamicStyles.inputBg }]}
            >
              <Ionicons name="reload" size={20} color={dynamicStyles.subText} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={togglePlayPause}
              style={[styles.playBtn, { backgroundColor: activeMode.color }]}
            >
              <Ionicons name={isRunning ? 'pause' : 'play'} size={22} color="white" />
              <Text style={styles.playBtnText}>
                {isRunning ? 'Pause' : 'Start'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={[styles.iconControlBtn, { backgroundColor: dynamicStyles.inputBg }]}
            >
              <Ionicons name="settings-outline" size={20} color={dynamicStyles.subText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Session Goal Tasks */}
        <View style={[styles.card, { backgroundColor: dynamicStyles.cardBg, borderColor: dynamicStyles.borderColor, marginBottom: 40 }]}>
          <Text style={[styles.cardTitle, { color: dynamicStyles.primaryText }]}>Study Session Goals</Text>

          <View style={[styles.taskInputRow, { backgroundColor: dynamicStyles.inputBg, borderColor: dynamicStyles.borderColor }]}>
            <TextInput
              style={[styles.taskInput, { color: dynamicStyles.primaryText }]}
              placeholder="Add task for this session..."
              placeholderTextColor="#94A3B8"
              value={taskName}
              onChangeText={setTaskName}
            />
            <TouchableOpacity onPress={addTask} style={styles.addTaskBtn}>
              <Ionicons name="add" size={18} color="white" />
            </TouchableOpacity>
          </View>

          {taskList.map((item) => (
            <View
              key={item.id}
              style={[styles.taskRow, { borderBottomColor: dynamicStyles.borderColor }]}
            >
              <TouchableOpacity onPress={() => toggleTask(item.id)} style={styles.taskTouchArea}>
                <Ionicons
                  name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={item.completed ? '#10B981' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.taskTitle,
                    { color: dynamicStyles.primaryText },
                    item.completed && { textDecorationLine: 'line-through', color: dynamicStyles.subText }
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => deleteTask(item.id)}>
                <Ionicons name="trash-outline" size={18} color="#F43F5E" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Timer Duration Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: dynamicStyles.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: dynamicStyles.primaryText }]}>Timer Durations (Minutes)</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16, marginBottom: 24 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: dynamicStyles.subText }]}>Focus Session</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: dynamicStyles.inputBg, borderColor: dynamicStyles.borderColor, color: dynamicStyles.primaryText }]}
                  keyboardType="numeric"
                  value={String(focusTime)}
                  onChangeText={(val) => setFocusTime(Number(val) || 25)}
                />
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: dynamicStyles.subText }]}>Short Break</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: dynamicStyles.inputBg, borderColor: dynamicStyles.borderColor, color: dynamicStyles.primaryText }]}
                  keyboardType="numeric"
                  value={String(shortBreakTime)}
                  onChangeText={(val) => setShortBreakTime(Number(val) || 5)}
                />
              </View>

              <View>
                <Text style={[styles.fieldLabel, { color: dynamicStyles.subText }]}>Long Break</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: dynamicStyles.inputBg, borderColor: dynamicStyles.borderColor, color: dynamicStyles.primaryText }]}
                  keyboardType="numeric"
                  value={String(longBreakTime)}
                  onChangeText={(val) => setLongBreakTime(Number(val) || 15)}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                setShowSettings(false);
                switchMode(activeMode);
              }}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 12 },
  tabBar: { flexDirection: 'row', padding: 6, borderRadius: 16, marginBottom: 24 },
  tabItem: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  activeTab: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { padding: 24, borderRadius: 28, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, alignItems: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: '900', alignSelf: 'flex-start', marginBottom: 16 },
  sessionSub: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  timerDisplay: { fontSize: 56, fontWeight: '900', fontFamily: 'Platform', marginVertical: 12 },
  progressTrack: { width: '100%', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 20 },
  progressBar: { height: '100%', borderRadius: 6 },
  pillBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 24 },
  pillBadgeText: { fontSize: 12, fontWeight: '700', color: '#6366F1', marginLeft: 6 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconControlBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  playBtnText: { color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase' },
  taskInputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, width: '100%', borderWidth: 1, marginBottom: 16 },
  taskInput: { flex: 1, fontWeight: '500', paddingVertical: 8, fontSize: 15 },
  addTaskBtn: { backgroundColor: '#6366F1', padding: 10, borderRadius: 12 },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, width: '100%' },
  taskTouchArea: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  taskTitle: { marginLeft: 12, fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  closeBtn: { backgroundColor: '#F1F5F9', padding: 8, borderRadius: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  textInput: { borderRadius: 12, padding: 14, borderWidth: 1, fontWeight: '700', fontSize: 16 },
  saveBtn: { backgroundColor: '#6366F1', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});