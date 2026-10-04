import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  DEFAULT_POMODORO_SETTINGS,
  createInitialPomodoroState,
  normalizePomodoroSettings,
  normalizePomodoroState,
  POMODORO_MODES,
  recoverPomodoroState,
} from '../utils/pomodoroEngine';

const STORAGE_KEY = '@unihelp_pomodoro_v1';
const isWeb = Platform.OS === 'web';
let notificationsPromise = null;
let storageWriteQueue = Promise.resolve();

export { DEFAULT_POMODORO_SETTINGS, POMODORO_MODES };

const loadNotifications = async () => {
  if (isWeb) return null;
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications').catch((error) => {
      notificationsPromise = null;
      console.warn('Pomodoro local notifications are unavailable:', error?.message || error);
      return null;
    });
  }
  return notificationsPromise;
};

export async function loadPomodoroData() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const settings = normalizePomodoroSettings(DEFAULT_POMODORO_SETTINGS);
      return { settings, state: createInitialPomodoroState(settings) };
    }

    const parsed = JSON.parse(stored);
    const settings = normalizePomodoroSettings(parsed?.settings);
    return {
      settings,
      state: normalizePomodoroState(parsed?.state, settings),
    };
  } catch (error) {
    console.warn('Could not restore the saved Pomodoro timer:', error?.message || error);
    const settings = normalizePomodoroSettings(DEFAULT_POMODORO_SETTINGS);
    return { settings, state: createInitialPomodoroState(settings) };
  }
}

export async function savePomodoroData(state, settings) {
  const normalizedSettings = normalizePomodoroSettings(settings);
  const normalizedState = normalizePomodoroState(state, normalizedSettings);
  const serialized = JSON.stringify({
    state: normalizedState,
    settings: normalizedSettings,
  });
  const write = storageWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(STORAGE_KEY, serialized));
  storageWriteQueue = write;
  await storageWriteQueue;
}

const configurePomodoroChannel = async (Notifications, settings) => {
  if (Platform.OS !== 'android' || typeof Notifications.setNotificationChannelAsync !== 'function') return undefined;

  const channelId = `pomodoro-${settings.sound ? 'sound' : 'silent'}-${settings.vibration ? 'vibrate' : 'still'}`;
  await Notifications.setNotificationChannelAsync(channelId, {
    name: 'Pomodoro timer',
    description: 'Focus and break timer alerts',
    importance: Notifications.AndroidImportance?.HIGH ?? 4,
    sound: settings.sound ? 'default' : null,
    vibrationPattern: settings.vibration ? [0, 250, 150, 250] : [],
    enableVibrate: settings.vibration,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC,
  });
  return channelId;
};

const getNotificationPermission = async (Notifications) => {
  const current = await Notifications.getPermissionsAsync();
  return current.status === 'granted';
};

const notificationCopy = (mode) => {
  if (mode === POMODORO_MODES.FOCUS) {
    return {
      title: 'Focus session complete',
      body: 'Great work! Your focus session is finished. Time for a break.',
    };
  }
  if (mode === POMODORO_MODES.LONG_BREAK) {
    return {
      title: 'Long break finished',
      body: 'Your break is over. Ready for another focus session?',
    };
  }
  return {
    title: 'Break finished',
    body: 'Your break is over. Ready for another focus session?',
  };
};

export async function cancelPomodoroNotification(notificationId) {
  if (!notificationId) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('Could not cancel the scheduled Pomodoro notification:', error?.message || error);
  }
}

export async function schedulePomodoroNotification({ endAt, mode, settings }) {
  if (isWeb || !Number.isFinite(endAt) || endAt <= Date.now()) return null;
  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  try {
    const channelId = await configurePomodoroChannel(Notifications, settings);
    const granted = await getNotificationPermission(Notifications);
    if (!granted) return null;

    const copy = notificationCopy(mode);
    const content = {
      ...copy,
      data: {
        type: 'pomodoro_completion',
        route: '/pomodoroScreen',
        mode,
      },
      sound: settings.sound ? 'default' : false,
    };

    return await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(endAt),
        ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
      },
    });
  } catch (error) {
    console.warn('Could not schedule the Pomodoro completion notification:', error?.message || error);
    return null;
  }
}

export async function restorePomodoroData(now = Date.now()) {
  const { state, settings } = await loadPomodoroData();
  const recovered = recoverPomodoroState(state, settings, now);

  await cancelPomodoroNotification(state.notificationId);

  if (recovered.status === 'running') {
    const notificationId = await schedulePomodoroNotification({
      endAt: recovered.endAt,
      mode: recovered.mode,
      settings,
    });
    recovered.notificationId = notificationId;
  } else {
    recovered.notificationId = null;
  }

  await savePomodoroData(recovered, settings);
  return { state: recovered, settings };
}
