import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  listenToForegroundMessages,
  listenToNotificationResponses,
  listenToPushTokenChanges,
  registerPushNotificationsForCurrentUser,
} from '../services/pushNotifications';

const getRouteTarget = (data = {}) => {
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

  useEffect(() => {
    const removeForeground = listenToForegroundMessages((notification) => {
      console.log('Foreground notification received:', notification);
    });

    const removeResponseHandler = listenToNotificationResponses((response) => {
      const target = getRouteTarget(response?.notification?.request?.content?.data || {});
      if (typeof target === 'string') {
        router.push(target);
      } else {
        router.push(target);
      }
    });

    const removeTokenChangeHandler = listenToPushTokenChanges();

    return () => {
      removeForeground.remove();
      removeResponseHandler.remove();
      removeTokenChangeHandler.remove();
    };
  }, [router]);

  useEffect(() => {
    if (loading || !userId) {
      return;
    }

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
    };
  }, [loading, userId]);

  return null;
}

export function usePushNotifications() {
  return { registerPushNotificationsForCurrentUser };
}
