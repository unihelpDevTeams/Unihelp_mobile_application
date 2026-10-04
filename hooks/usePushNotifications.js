import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  listenToForegroundMessages,
  listenToNotificationResponses,
  listenToPushTokenChanges,
  getLastNotificationResponse,
  clearLastNotificationResponse,
  registerPushNotificationsForCurrentUser,
} from '../services/pushNotifications';
import { handleNotificationAction } from '../src/shared/services/notificationActions';

const getRouteTarget = (data = {}) => {
  if (data?.type === 'pomodoro_completion') {
    return '/pomodoroScreen';
  }

  const conversationId = data?.conversationId || data?.data?.conversationId;
  if (conversationId) {
    return `/messages/${conversationId}`;
  }

  if (typeof data?.route === 'string' && data.route.startsWith('/')) {
    if (data.route.startsWith('/messages?conversationId=')) {
      const convId = data.route.split('=')[1];
      if (convId) return `/messages/${convId}`;
    }
    return {
      pathname: data.route,
      params: data.params || {},
    };
  }

  if (typeof data?.url === 'string' && data.url.startsWith('/')) {
    if (data.url.startsWith('/messages?conversationId=')) {
      const convId = data.url.split('=')[1];
      if (convId) return `/messages/${convId}`;
    }
    return {
      pathname: data.url,
      params: data.params || {},
    };
  }

  if (data?.type === 'message') {
    return '/messages';
  }

  if (data?.type === 'payment') {
    return '/premium';
  }

  if (data?.type === 'announcement') {
    return '/announcements';
  }

  return '/notifications';
};

export function PushNotificationBootstrap() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const userId = user?.uid;
  const registrationKeyRef = useRef(null);
  const handledResponsesRef = useRef(new Set());
  const pendingResponseRef = useRef(null);

  const handleNotificationResponse = useCallback(async (response, clearStoredResponse = false) => {
    if (!response) return;
    if (loading) {
      pendingResponseRef.current = { response, clearStoredResponse };
      return;
    }
    const notificationId = response?.notification?.request?.identifier;
    const responseKey = `${notificationId || 'unknown'}:${response?.actionIdentifier || 'default'}`;
    if (handledResponsesRef.current.has(responseKey)) {
      if (clearStoredResponse) await clearLastNotificationResponse();
      return;
    }
    handledResponsesRef.current.add(responseKey);
    if (handledResponsesRef.current.size > 20) {
      handledResponsesRef.current.delete(handledResponsesRef.current.values().next().value);
    }

    const payload = response?.notification?.request?.content?.data || response?.notification?.request?.content?.body || {};
    const target = getRouteTarget(payload);

    if (response?.actionIdentifier && response.actionIdentifier !== 'default') {
      const result = await handleNotificationAction({
        actionIdentifier: response.actionIdentifier,
        userText: response.userText,
        notification: response.notification,
        currentUserId: userId,
      });

      if (result?.route) {
        if (result.route === '/pomodoroScreen') router.navigate(result.route);
        else router.push(result.route);
        if (clearStoredResponse) await clearLastNotificationResponse();
        return;
      }
    }

    const isPomodoroRoute = target === '/pomodoroScreen' || target?.pathname === '/pomodoroScreen';
    if (isPomodoroRoute) router.navigate('/pomodoroScreen');
    else router.push(target);
    if (clearStoredResponse) await clearLastNotificationResponse();
  }, [loading, router, userId]);

  useEffect(() => {
    if (loading || !pendingResponseRef.current) return;
    const pending = pendingResponseRef.current;
    pendingResponseRef.current = null;
    handleNotificationResponse(pending.response, pending.clearStoredResponse);
  }, [handleNotificationResponse, loading]);

  useEffect(() => {
    const removeForeground = listenToForegroundMessages((notification) => {
      console.log('Foreground notification received:', notification);
    });

    const removeResponseHandler = listenToNotificationResponses(handleNotificationResponse);
    getLastNotificationResponse()
      .then((response) => handleNotificationResponse(response, true))
      .catch((error) => console.warn('Could not inspect the last notification response:', error?.message || error));

    const removeTokenChangeHandler = listenToPushTokenChanges();

    return () => {
      removeForeground.remove();
      removeResponseHandler.remove();
      removeTokenChangeHandler.remove();
    };
  }, [handleNotificationResponse]);

  useEffect(() => {
    if (loading || !userId) {
      registrationKeyRef.current = null;
      return;
    }

    if (registrationKeyRef.current === userId) {
      return;
    }

    registrationKeyRef.current = userId;

    let active = true;

    const register = async () => {
      const token = await registerPushNotificationsForCurrentUser();
      if (!active) {
        return;
      }

      if (!token) {
        console.log('Push notification registration skipped for this device.');
      }
    };

    register();

    return () => {
      active = false;
      registrationKeyRef.current = null;
    };
  }, [loading, userId]);

  return null;
}

export function usePushNotifications() {
  return { registerPushNotificationsForCurrentUser };
}
