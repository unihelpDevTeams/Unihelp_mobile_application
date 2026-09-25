import React from 'react';
import { Animated, Easing, PanResponder, Platform, Text, useWindowDimensions, View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { layout } from '../../src/shared/theme';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import {
  listenUnreadConversationCount,
  listenUnreadGroupMessageCount,
} from '../../services/firestoreSync';

// NOTE: expo-router's usePathname() strips route-group segments like
// "(tabs)" from the URL, so these must be the *resolved* paths, not the
// file-system group paths. Using "/(tabs)/chat" here was the root cause of
// the swipe glitches: it never matched, so the "current tab" index was
// always stuck at 0 and every swipe computed the wrong destination.
const TAB_ROUTES = ['/', '/chat', '/studyMaterials', '/groups', '/feed'];
const SWIPE_DISTANCE = 72;
const SWIPE_VELOCITY = 0.45;
const TRANSITION_DURATION = 180;

function getTabIndex(pathname) {
  if (pathname === '/') return 0;
  const index = TAB_ROUTES.findIndex((route, i) => i > 0 && pathname.startsWith(route));
  return index; // -1 when on a route that isn't a tab root
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [unreadChats, setUnreadChats] = React.useState(0);
  const [unreadGroupMessages, setUnreadGroupMessages] = React.useState(0);
  const swipeX = React.useRef(new Animated.Value(0)).current;

  const widthRef = React.useRef(width);
  widthRef.current = width;

  const currentIndex = getTabIndex(pathname);
  const currentIndexRef = React.useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Only let the tab-switch gesture engage when we're sitting on a root tab
  // screen. Nested screens (a chat thread, a group's swipe-to-reply list,
  // an image viewer, anything with its own horizontal gesture) are left
  // alone, and iOS's native edge-swipe-back no longer gets hijacked.
  const canSwipeRef = React.useRef(currentIndex !== -1);
  canSwipeRef.current = currentIndex !== -1;

  const isAnimatingRef = React.useRef(false);
  const pendingDirectionRef = React.useRef(0);

  // Handles the "incoming" half of a tab switch. Once the route has
  // actually changed, slide the new screen in from the correct side instead
  // of snapping it to 0 (which is what produced the old flash-back).
  React.useEffect(() => {
    if (pendingDirectionRef.current === 0) return;
    const incomingStart = -pendingDirectionRef.current * widthRef.current;
    pendingDirectionRef.current = 0;
    swipeX.setValue(incomingStart);
    Animated.timing(swipeX, {
      toValue: 0,
      duration: TRANSITION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      isAnimatingRef.current = false;
    });
  }, [pathname, swipeX]);

  const swipeResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => (
        canSwipeRef.current &&
        !isAnimatingRef.current &&
        Math.abs(gesture.dx) > 16 &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35
      ),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gesture) => {
        const atStart = currentIndexRef.current <= 0;
        const atEnd = currentIndexRef.current >= TAB_ROUTES.length - 1;
        // Rubber-band resistance past the first/last tab instead of
        // dragging freely off into nothing.
        if ((atStart && gesture.dx > 0) || (atEnd && gesture.dx < 0)) {
          swipeX.setValue(gesture.dx / 3);
        } else {
          swipeX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const movedLeft = gesture.dx < -SWIPE_DISTANCE || gesture.vx < -SWIPE_VELOCITY;
        const movedRight = gesture.dx > SWIPE_DISTANCE || gesture.vx > SWIPE_VELOCITY;
        const current = currentIndexRef.current;
        const nextIndex = movedLeft
          ? Math.min(current + 1, TAB_ROUTES.length - 1)
          : movedRight
            ? Math.max(current - 1, 0)
            : current;

        if (nextIndex !== current) {
          const direction = nextIndex > current ? -1 : 1;
          isAnimatingRef.current = true;
          Animated.timing(swipeX, {
            toValue: direction * widthRef.current,
            duration: TRANSITION_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            pendingDirectionRef.current = direction;
            router.navigate(TAB_ROUTES[nextIndex]);
          });
        } else {
          Animated.spring(swipeX, {
            toValue: 0,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }).start(() => {
          isAnimatingRef.current = false;
        });
      },
    })
  ).current;

  React.useEffect(() => {
    if (!user?.uid) {
      setUnreadChats(0);
      setUnreadGroupMessages(0);
      return undefined;
    }

    const unsubscribeChats = listenUnreadConversationCount(user.uid, setUnreadChats);
    const unsubscribeGroups = listenUnreadGroupMessageCount(user.uid, setUnreadGroupMessages);

    return () => {
      if (typeof unsubscribeChats === 'function') unsubscribeChats();
      if (typeof unsubscribeGroups === 'function') unsubscribeGroups();
    };
  }, [user?.uid]);

  return (
    <ProtectedRoute>
      <Animated.View style={{ flex: 1, transform: [{ translateX: swipeX }] }} {...swipeResponder.panHandlers}>
        <Tabs
          screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarHideOnKeyboard: true,
          lazy: true,
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopColor: colors.tabBarBorder || colors.borderDefault,
            borderTopWidth: 1,
            height: layout?.tabBarHeight || (Platform.OS === 'ios' ? 88 : 64),
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            ...Platform.select({
              ios: {
                shadowColor: colors.shadow || '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
              },
              android: {
                elevation: 8,
              },
            }),
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 3,
            letterSpacing: -0.1,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
          }}
        >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chats',
            tabBarIcon: ({ color, size, focused }) => (
              <View>
                <Ionicons
                  name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                  size={size ?? 22}
                  color={color}
                />
                {unreadChats > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -7,
                      right: -10,
                      minWidth: 17,
                      height: 17,
                      paddingHorizontal: 3,
                      borderRadius: 9,
                      backgroundColor: colors.red || '#EF4444',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: colors.tabBarBackground,
                    }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>
                      {unreadChats > 99 ? '99+' : unreadChats}
                    </Text>
                  </View>
                ) : null}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="studyMaterials"
          options={{
            title: 'Resources',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'folder' : 'folder-outline'}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: 'Groups',
            tabBarIcon: ({ color, size, focused }) => (
              <View>
                <Ionicons
                  name={focused ? 'people' : 'people-outline'}
                  size={size ?? 22}
                  color={color}
                />
                {unreadGroupMessages > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -7,
                      right: -10,
                      minWidth: 17,
                      height: 17,
                      paddingHorizontal: 3,
                      borderRadius: 9,
                      backgroundColor: colors.red || '#EF4444',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: colors.tabBarBackground,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>
                      {unreadGroupMessages > 99 ? '99+' : unreadGroupMessages}
                    </Text>
                  </View>
                ) : null}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'newspaper' : 'newspaper-outline'}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{ href: null }}
        />
        </Tabs>
      </Animated.View>
    </ProtectedRoute>
  );
}