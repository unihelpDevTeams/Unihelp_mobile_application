import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import {
  listenToForegroundMessages,
  listenToNotificationResponses,
  registerPushNotificationsForCurrentUser,
} from '../services/pushNotifications';

const getRouteTarget = (data = {}) => {
  if (typeof data?.route === 'string' && data.route.startsWith('/')) {
    return {
      pathname: data.route,
      params: data.params || {},
    };
  }

  if (typeof data?.url === 'string' && data.url.startsWith('/')) {
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

    return () => {
      removeForeground.remove();
      removeResponseHandler.remove();
    };
  }, [router]);

  useEffect(() => {
    if (loading || !user) {
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
  }, [loading, user?.uid]);

  return null;
}

export function usePushNotifications() {
  return { registerPushNotificationsForCurrentUser };
}
