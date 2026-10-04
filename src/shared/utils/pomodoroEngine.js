export const POMODORO_MODES = {
  FOCUS: 'focus',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
};

export const DEFAULT_POMODORO_SETTINGS = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreak: false,
  autoStartFocus: false,
  sound: true,
  vibration: true,
};

const clampNumber = (value, fallback, min, max) => {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
};

export function normalizePomodoroSettings(settings = {}) {
  return {
    focusMinutes: clampNumber(settings.focusMinutes, 25, 1, 120),
    shortBreakMinutes: clampNumber(settings.shortBreakMinutes, 5, 1, 60),
    longBreakMinutes: clampNumber(settings.longBreakMinutes, 15, 1, 120),
    sessionsBeforeLongBreak: clampNumber(settings.sessionsBeforeLongBreak, 4, 1, 12),
    autoStartBreak: settings.autoStartBreak === true,
    autoStartFocus: settings.autoStartFocus === true,
    sound: settings.sound !== false,
    vibration: settings.vibration !== false,
  };
}

export function getPomodoroDuration(mode, settings) {
  const normalized = normalizePomodoroSettings(settings);
  const minutes = mode === POMODORO_MODES.SHORT_BREAK
    ? normalized.shortBreakMinutes
    : mode === POMODORO_MODES.LONG_BREAK
      ? normalized.longBreakMinutes
      : normalized.focusMinutes;
  return minutes * 60;
}

export function createInitialPomodoroState(settings = DEFAULT_POMODORO_SETTINGS) {
  const normalizedSettings = normalizePomodoroSettings(settings);
  const durationSeconds = getPomodoroDuration(POMODORO_MODES.FOCUS, normalizedSettings);
  return {
    mode: POMODORO_MODES.FOCUS,
    status: 'idle',
    durationSeconds,
    remainingSeconds: durationSeconds,
    endAt: null,
    completedSessions: 0,
    totalCompletedSessions: 0,
    cycle: 0,
    lastCompletedMode: null,
    notificationId: null,
  };
}

export function normalizePomodoroState(value, settings = DEFAULT_POMODORO_SETTINGS) {
  const normalizedSettings = normalizePomodoroSettings(settings);
  const initial = createInitialPomodoroState(normalizedSettings);
  const mode = Object.values(POMODORO_MODES).includes(value?.mode) ? value.mode : initial.mode;
  const durationSeconds = clampNumber(
    value?.durationSeconds,
    getPomodoroDuration(mode, normalizedSettings),
    60,
    7200
  );
  let status = ['idle', 'running', 'paused', 'completed'].includes(value?.status)
    ? value.status
    : 'idle';
  const endAt = Number.isFinite(Number(value?.endAt)) ? Number(value.endAt) : null;
  if (status === 'running' && !(endAt > 0)) status = 'paused';

  return {
    ...initial,
    ...value,
    mode,
    status,
    durationSeconds,
    remainingSeconds: clampNumber(value?.remainingSeconds, durationSeconds, 0, durationSeconds),
    endAt: status === 'running' && endAt > 0 ? endAt : null,
    completedSessions: clampNumber(value?.completedSessions, 0, 0, normalizedSettings.sessionsBeforeLongBreak),
    totalCompletedSessions: clampNumber(value?.totalCompletedSessions, 0, 0, Number.MAX_SAFE_INTEGER),
    cycle: clampNumber(value?.cycle, 0, 0, Number.MAX_SAFE_INTEGER),
    lastCompletedMode: Object.values(POMODORO_MODES).includes(value?.lastCompletedMode)
      ? value.lastCompletedMode
      : null,
    notificationId: typeof value?.notificationId === 'string' ? value.notificationId : null,
  };
}

export function completePomodoroPhase(state, completedAt, settings) {
  const normalizedSettings = normalizePomodoroSettings(settings);
  let completedSessions = state.completedSessions;
  let totalCompletedSessions = state.totalCompletedSessions;
  let cycle = state.cycle;
  let nextMode;

  if (state.mode === POMODORO_MODES.FOCUS) {
    completedSessions += 1;
    totalCompletedSessions += 1;
    nextMode = completedSessions >= normalizedSettings.sessionsBeforeLongBreak
      ? POMODORO_MODES.LONG_BREAK
      : POMODORO_MODES.SHORT_BREAK;
  } else {
    nextMode = POMODORO_MODES.FOCUS;
    if (state.mode === POMODORO_MODES.LONG_BREAK) {
      completedSessions = 0;
      cycle += 1;
    }
  }

  const durationSeconds = getPomodoroDuration(nextMode, normalizedSettings);
  const autoStart = nextMode === POMODORO_MODES.FOCUS
    ? normalizedSettings.autoStartFocus
    : normalizedSettings.autoStartBreak;

  return {
    ...state,
    mode: nextMode,
    status: autoStart ? 'running' : 'completed',
    durationSeconds,
    remainingSeconds: durationSeconds,
    endAt: autoStart ? completedAt + durationSeconds * 1000 : null,
    completedSessions,
    totalCompletedSessions,
    cycle,
    lastCompletedMode: state.mode,
    notificationId: null,
  };
}

export function skipPomodoroPhase(state, settings) {
  const normalizedSettings = normalizePomodoroSettings(settings);
  const nextMode = state.mode === POMODORO_MODES.FOCUS
    ? POMODORO_MODES.SHORT_BREAK
    : POMODORO_MODES.FOCUS;
  const durationSeconds = getPomodoroDuration(nextMode, normalizedSettings);

  return {
    ...state,
    mode: nextMode,
    status: 'idle',
    durationSeconds,
    remainingSeconds: durationSeconds,
    endAt: null,
    completedSessions: state.mode === POMODORO_MODES.LONG_BREAK ? 0 : state.completedSessions,
    cycle: state.mode === POMODORO_MODES.LONG_BREAK ? state.cycle + 1 : state.cycle,
    lastCompletedMode: null,
    notificationId: null,
  };
}

export function recoverPomodoroState(value, settings, now = Date.now()) {
  const normalizedSettings = normalizePomodoroSettings(settings);
  let state = normalizePomodoroState(value, normalizedSettings);
  if (state.status !== 'running' || !state.endAt) return state;

  if (state.endAt > now) {
    return { ...state, remainingSeconds: Math.max(1, Math.ceil((state.endAt - now) / 1000)) };
  }

  const canSkipWholeCycles = normalizedSettings.autoStartBreak && normalizedSettings.autoStartFocus;
  const sessionsPerCycle = normalizedSettings.sessionsBeforeLongBreak;
  const cycleDurationMs = (
    sessionsPerCycle * normalizedSettings.focusMinutes
    + (sessionsPerCycle - 1) * normalizedSettings.shortBreakMinutes
    + normalizedSettings.longBreakMinutes
  ) * 60 * 1000;
  let transitions = 0;

  while (state.status === 'running' && state.endAt <= now && transitions < 512) {
    if (
      canSkipWholeCycles
      && state.mode === POMODORO_MODES.FOCUS
      && state.completedSessions === 0
    ) {
      const wholeCycles = Math.floor((now - state.endAt) / cycleDurationMs);
      if (wholeCycles > 0) {
        state = {
          ...state,
          endAt: state.endAt + wholeCycles * cycleDurationMs,
          totalCompletedSessions: state.totalCompletedSessions + wholeCycles * sessionsPerCycle,
          cycle: state.cycle + wholeCycles,
          lastCompletedMode: POMODORO_MODES.LONG_BREAK,
          notificationId: null,
        };
        continue;
      }
    }

    const completionTime = state.endAt;
    state = completePomodoroPhase(state, completionTime, normalizedSettings);
    transitions += 1;
  }

  if (state.status === 'running' && state.endAt <= now) {
    const durationSeconds = getPomodoroDuration(state.mode, normalizedSettings);
    return {
      ...state,
      status: 'paused',
      durationSeconds,
      remainingSeconds: durationSeconds,
      endAt: null,
      notificationId: null,
    };
  }

  if (state.status !== 'running') {
    return { ...state, remainingSeconds: state.durationSeconds, endAt: null, notificationId: null };
  }

  return {
    ...state,
    remainingSeconds: Math.max(1, Math.ceil((state.endAt - now) / 1000)),
    notificationId: null,
  };
}
