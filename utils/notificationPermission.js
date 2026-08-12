import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: 'high',
    defaultBehavior: 'default',
  }),
});

const getApiBaseUrl = () => {
  const extra = Constants.expoConfig?.extra || Constants.manifest2?.extra || {};
  return extra.EXPO_PUBLIC_APP_URL || extra.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
};

const getApiUrl = (path = '/api/notifications/push-token') => {
  const baseUrl = getApiBaseUrl();
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const requestNotificationPermission = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'web') {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId || "4126b4b6-fee5-4a7f-a0ed-481e1bc9cd87"
    });
    return token?.data || null;
  } catch (error) {
    console.log('Notification permission error:', error);
    return null;
  }
};

export const registerPushNotificationsForCurrentUser = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
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

    await fetch(getApiUrl('/api/notifications/push-token'), {
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

    return token;
  } catch (error) {
    console.log('Failed to register push token:', error);
    return token;
  }
};

export const listenToForegroundMessages = (handler) => {
  return Notifications.addNotificationReceivedListener(handler);
};

export const listenToNotificationResponses = (handler) => {
  return Notifications.addNotificationResponseReceivedListener(handler);
};
