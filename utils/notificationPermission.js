import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const DEFAULT_API_URL = 'https://unihelp-backend-vdps.onrender.com';
const ANDROID_DEFAULT_CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: 'high',
    defaultBehavior: 'default',
  }),
});

const getExtra = () => Constants.expoConfig?.extra || Constants.manifest2?.extra || Constants.manifest?.extra || {};

const getApiBaseUrl = () => {
  const extra = getExtra();
  return extra.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
};

const getApiUrl = (path = '/api/notifications/push-token') => {
  const baseUrl = getApiBaseUrl();
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const getEasProjectId = () => {
  const extra = getExtra();
  return extra?.eas?.projectId || Constants.easConfig?.projectId || null;
};

export const configureAndroidNotificationChannels = async () => {
  if (Platform.OS !== 'android') {
    return null;
  }

  const channel = await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: 'Default',
    description: 'General UniHelp notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4F46E5',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
  });

  console.log('[push-debug] Android notification channel ready:', {
    id: ANDROID_DEFAULT_CHANNEL_ID,
    importance: channel?.importance,
  });

  return channel;
};

export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'web') {
      console.log('[push-debug] Push notification registration skipped on web.');
      return null;
    }

    await configureAndroidNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    console.log('[push-debug] Existing notification permission status:', existingStatus);

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        android: {},
      });
      finalStatus = status;
      console.log('[push-debug] Requested notification permission result:', status);
    }

    if (finalStatus !== 'granted') {
      console.log('[push-debug] Push notification permission denied:', finalStatus);
      return null;
    }

    const projectId = getEasProjectId();
    console.log('[push-debug] EAS project ID for Expo push token:', projectId);

    if (!projectId) {
      console.log('[push-debug] Missing EAS project ID; cannot request an Expo push token.');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('[push-debug] Generated Expo push token:', token?.data);
    return token?.data || null;
  } catch (error) {
    console.log('Notification permission error:', error);
    return null;
  }
};

export const registerPushNotificationsForCurrentUser = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log('[push-debug] Push registration skipped; no authenticated user yet.');
    return null;
  }

  const token = await requestNotificationPermission();
  if (!token) {
    return null;
  }

  try {
    await setDoc(
      doc(db, 'users', currentUser.uid),
      {
        expoPushToken: token,
        pushNotificationsEnabled: true,
        pushTokenUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const idToken = await currentUser.getIdToken();

    const response = await fetch(getApiUrl('/api/notifications/push-token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        expoPushToken: token,
        deviceType: Platform.OS,
      }),
    });

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.log('[push-debug] Backend push token save failed:', {
        status: response.status,
        response: responseBody,
      });
    } else {
      console.log('[push-debug] Push token saved for authenticated user:', {
        uid: currentUser.uid,
        deviceType: Platform.OS,
        backend: getApiBaseUrl(),
      });
    }

    return token;
  } catch (error) {
    console.log('Failed to register push token:', error);
    return token;
  }
};

export const listenToPushTokenChanges = () => {
  if (Platform.OS === 'web') {
    return { remove: () => {} };
  }

  return Notifications.addPushTokenListener(async () => {
    console.log('[push-debug] Native push token changed; refreshing Expo push token registration.');
    await registerPushNotificationsForCurrentUser();
  });
};

export const listenToForegroundMessages = (handler) => {
  return Notifications.addNotificationReceivedListener(handler);
};

export const listenToNotificationResponses = (handler) => {
  return Notifications.addNotificationResponseReceivedListener(handler);
};
