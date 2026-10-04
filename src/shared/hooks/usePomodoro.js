import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  createInitialPomodoroState,
  completePomodoroPhase,
  getPomodoroDuration,
  normalizePomodoroSettings,
  POMODORO_MODES,
  skipPomodoroPhase,
} from '../utils/pomodoroEngine';
import {
  cancelPomodoroNotification,
  DEFAULT_POMODORO_SETTINGS,
  restorePomodoroData,
  savePomodoroData,
  schedulePomodoroNotification,
} from '../services/pomodoroService';

const remainingAt = (state, now) => {
  if (state.status !== 'running' || !state.endAt) return state.remainingSeconds;
  return Math.max(0, Math.ceil((state.endAt - now) / 1000));
};

export default function usePomodoro() {
  const [snapshot, setSnapshot] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notificationWarning, setNotificationWarning] = useState('');
  const stateRef = useRef(null);
  const settingsRef = useRef(DEFAULT_POMODORO_SETTINGS);
  const operationRef = useRef(false);
  const completionRef = useRef(false);

  const publish = useCallback((state, settings = settingsRef.current) => {
    stateRef.current = state;
    settingsRef.current = settings;
    setSnapshot({ state, settings });
    savePomodoroData(state, settings).catch((saveError) => {
      console.warn('Could not save Pomodoro state locally:', saveError?.message || saveError);
      setError('Your timer is active, but its latest state could not be saved on this device.');
    });
  }, []);

  const runExclusive = useCallback(async (action) => {
    if (operationRef.current) return;
    operationRef.current = true;
    setError('');
    try {
      await action();
    } catch (actionError) {
      console.error('Pomodoro action failed:', actionError);
      setError(actionError?.message || 'Could not update the Pomodoro timer. Please try again.');
    } finally {
      operationRef.current = false;
    }
  }, []);

  const reconcileExpiredPhase = useCallback(async () => {
    const current = stateRef.current;
    if (!current || current.status !== 'running' || completionRef.current) return;
    if (remainingAt(current, Date.now()) > 0) return;

    completionRef.current = true;
    const settings = settingsRef.current;
    try {
      await cancelPomodoroNotification(current.notificationId);
      let next = completePomodoroPhase(current, current.endAt, settings);
      publish(next, settings);

      if (settings.vibration) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((hapticError) => {
          console.warn('Pomodoro completion haptics are unavailable:', hapticError?.message || hapticError);
        });
      }

      if (next.status === 'running') {
        const notificationId = await schedulePomodoroNotification({
          endAt: next.endAt,
          mode: next.mode,
          settings,
        });
        next = { ...next, notificationId };
        if (!notificationId) setNotificationWarning('The timer is running, but completion notifications are unavailable or not permitted.');
        else setNotificationWarning('');
        publish(next, settings);
      }
    } finally {
      completionRef.current = false;
    }
  }, [publish]);

  const refreshFromClock = useCallback(async () => {
    const current = stateRef.current;
    if (!current || current.status !== 'running') return;
    if (remainingAt(current, Date.now()) <= 0) {
      await runExclusive(reconcileExpiredPhase);
      return;
    }

    const refreshed = {
      ...current,
      remainingSeconds: remainingAt(current, Date.now()),
    };
    stateRef.current = refreshed;
    setSnapshot({ state: refreshed, settings: settingsRef.current });
  }, [reconcileExpiredPhase, runExclusive]);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const restored = await restorePomodoroData(Date.now());
      if (!active) return;
      stateRef.current = restored.state;
      settingsRef.current = restored.settings;
      setSnapshot({ state: restored.state, settings: restored.settings });
      setReady(true);
    };
    restore().catch((restoreError) => {
      console.error('Could not restore the Pomodoro timer:', restoreError);
      if (active) {
        const initial = createInitialPomodoroState(DEFAULT_POMODORO_SETTINGS);
        stateRef.current = initial;
        settingsRef.current = DEFAULT_POMODORO_SETTINGS;
        setSnapshot({ state: initial, settings: DEFAULT_POMODORO_SETTINGS });
        setError('Saved timer data could not be loaded. A fresh timer is ready.');
        setReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || snapshot?.state.status !== 'running') return undefined;
    const timer = setInterval(() => {
      void refreshFromClock();
    }, 1000);
    return () => clearInterval(timer);
  }, [ready, snapshot?.state.status, refreshFromClock]);

  useEffect(() => {
    if (!ready) return undefined;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshFromClock();
    });
    return () => subscription.remove();
  }, [ready, refreshFromClock]);

  const start = useCallback(() => runExclusive(async () => {
    const current = stateRef.current;
    if (!current || current.status === 'running' || completionRef.current) return;
    const remainingSeconds = Math.max(1, current.remainingSeconds || current.durationSeconds);
    const next = {
      ...current,
      status: 'running',
      remainingSeconds,
      endAt: Date.now() + remainingSeconds * 1000,
      notificationId: null,
    };
    await cancelPomodoroNotification(current.notificationId);
    publish(next);
    const notificationId = await schedulePomodoroNotification({
      endAt: next.endAt,
      mode: next.mode,
      settings: settingsRef.current,
    });
    const scheduled = { ...next, notificationId };
    if (!notificationId) setNotificationWarning('The timer is running, but completion notifications are unavailable or not permitted.');
    else setNotificationWarning('');
    publish(scheduled);
    Haptics.selectionAsync().catch((hapticError) => {
      console.warn('Pomodoro haptics are unavailable:', hapticError?.message || hapticError);
    });
  }), [publish, runExclusive]);

  const pause = useCallback(() => runExclusive(async () => {
    const current = stateRef.current;
    if (!current || current.status !== 'running' || completionRef.current) return;
    const seconds = remainingAt(current, Date.now());
    if (seconds <= 0) {
      await reconcileExpiredPhase();
      return;
    }
    await cancelPomodoroNotification(current.notificationId);
    publish({
      ...current,
      status: 'paused',
      remainingSeconds: seconds,
      endAt: null,
      notificationId: null,
    });
    Haptics.selectionAsync().catch((hapticError) => {
      console.warn('Pomodoro haptics are unavailable:', hapticError?.message || hapticError);
    });
  }), [publish, reconcileExpiredPhase, runExclusive]);

  const reset = useCallback(() => runExclusive(async () => {
    const current = stateRef.current;
    if (!current || completionRef.current) return;
    await cancelPomodoroNotification(current.notificationId);
    const durationSeconds = getPomodoroDuration(current.mode, settingsRef.current);
    publish({
      ...current,
      status: 'idle',
      durationSeconds,
      remainingSeconds: durationSeconds,
      endAt: null,
      lastCompletedMode: null,
      notificationId: null,
    });
    setNotificationWarning('');
    Haptics.selectionAsync().catch((hapticError) => {
      console.warn('Pomodoro haptics are unavailable:', hapticError?.message || hapticError);
    });
  }), [publish, runExclusive]);

  const skip = useCallback(() => runExclusive(async () => {
    const current = stateRef.current;
    if (!current || completionRef.current) return;
    await cancelPomodoroNotification(current.notificationId);
    publish(skipPomodoroPhase(current, settingsRef.current));
    setNotificationWarning('');
    Haptics.selectionAsync().catch((hapticError) => {
      console.warn('Pomodoro haptics are unavailable:', hapticError?.message || hapticError);
    });
  }), [publish, runExclusive]);

  const selectMode = useCallback((mode) => runExclusive(async () => {
    const current = stateRef.current;
    if (!current || current.status === 'running' || current.status === 'paused' || completionRef.current) return;
    if (!Object.values(POMODORO_MODES).includes(mode)) return;
    await cancelPomodoroNotification(current.notificationId);
    const durationSeconds = getPomodoroDuration(mode, settingsRef.current);
    publish({
      ...current,
      mode,
      status: 'idle',
      durationSeconds,
      remainingSeconds: durationSeconds,
      endAt: null,
      lastCompletedMode: null,
      notificationId: null,
    });
  }), [publish, runExclusive]);

  const updateSettings = useCallback((value) => runExclusive(async () => {
    const current = stateRef.current;
    if (!current || completionRef.current) return;
    const settings = normalizePomodoroSettings(value);
    const durationSeconds = getPomodoroDuration(current.mode, settings);
    const canChangeCurrentDuration = current.status === 'idle' || current.status === 'completed';
    const cycleCount = settings.sessionsBeforeLongBreak === settingsRef.current.sessionsBeforeLongBreak
      ? current.completedSessions
      : current.mode === POMODORO_MODES.LONG_BREAK
        ? Math.min(current.completedSessions, settings.sessionsBeforeLongBreak)
        : 0;
    let next = {
      ...current,
      completedSessions: cycleCount,
      ...(canChangeCurrentDuration
        ? { durationSeconds, remainingSeconds: durationSeconds }
        : {}),
    };

    if (current.status === 'running') {
      await cancelPomodoroNotification(current.notificationId);
      next = { ...next, notificationId: null };
    }
    publish(next, settings);

    if (next.status === 'running') {
      const notificationId = await schedulePomodoroNotification({
        endAt: next.endAt,
        mode: next.mode,
        settings,
      });
      next = { ...next, notificationId };
      if (!notificationId) setNotificationWarning('The timer is running, but completion notifications are unavailable or not permitted.');
      publish(next, settings);
    }
  }), [publish, runExclusive]);

  const state = snapshot?.state;
  const settings = snapshot?.settings;

  return {
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
  };
}
