/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect */
import React from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import {
  listenUnreadConversationCount,
  listenUnreadGroupMessageCount,
} from '../../services/firestoreSync';

const TAB_ROUTES = ['/', '/chat', '/studyMaterials', '/groups', '/feed'];
const SWIPE_DISTANCE = 72;
const SWIPE_VELOCITY = 0.45;
const TRANSITION_DURATION = 180;
const NAVIGATION_TIMEOUT = 700;
const TAB_CONTENT_HEIGHT = 48;
const TAB_PADDING_TOP = 8;

function getTabIndex(pathname) {
  const normalized = pathname && pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return TAB_ROUTES.indexOf(normalized || '/');
}

const formatBadge = (count) => (count > 0 ? (count > 99 ? '99+' : count) : undefined);

const tabIcon = (active, inactive) => function TabIcon({ color, size, focused }) {
  return <Ionicons name={focused ? active : inactive} size={size ?? 22} color={color} />;
};

const ICONS = {
  index: tabIcon('home', 'home-outline'),
  chat: tabIcon('chatbubbles', 'chatbubbles-outline'),
  studyMaterials: tabIcon('folder', 'folder-outline'),
  groups: tabIcon('people', 'people-outline'),
  feed: tabIcon('newspaper', 'newspaper-outline'),
};

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [unreadChats, setUnreadChats] = React.useState(0);
  const [unreadGroupMessages, setUnreadGroupMessages] = React.useState(0);
  const swipeX = React.useRef(new Animated.Value(0)).current;
  // Cancels the page translation so the tab bar stays put while screens slide.
  const counterX = React.useRef(Animated.multiply(swipeX, -1)).current;

  const widthRef = React.useRef(width);
  const currentIndex = getTabIndex(pathname);
  const currentIndexRef = React.useRef(currentIndex);

  // Only engage the tab-switch gesture on a root tab screen so nested screens
  // with their own horizontal gestures (and iOS edge-swipe-back) are left alone.
  const canSwipeRef = React.useRef(currentIndex !== -1);

  React.useEffect(() => {
    widthRef.current = width;
  }, [width]);

  React.useEffect(() => {
    currentIndexRef.current = currentIndex;
    canSwipeRef.current = currentIndex !== -1;
  }, [currentIndex]);

  const isAnimatingRef = React.useRef(false);
  const pendingDirectionRef = React.useRef(0);
  const navTimeoutRef = React.useRef(null);

  const clearNavTimeout = React.useCallback(() => {
    if (navTimeoutRef.current) {
      clearTimeout(navTimeoutRef.current);
      navTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => clearNavTimeout, [clearNavTimeout]);

  // "Incoming" half of a tab switch: once the route has actually changed,
  // slide the new screen in from the correct side.
  React.useEffect(() => {
    if (pendingDirectionRef.current === 0) return;
    clearNavTimeout();
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
  }, [pathname, swipeX, clearNavTimeout]);

  const springBack = React.useCallback(() => {
    Animated.spring(swipeX, {
      toValue: 0,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start(() => {
      isAnimatingRef.current = false;
    });
  }, [swipeX]);

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
        // Rubber-band resistance past the first/last tab.
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

        if (nextIndex === current) {
          springBack();
          return;
        }

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
          // Safety net: if the pathname never changes, don't strand the screen off-canvas.
          clearNavTimeout();
          navTimeoutRef.current = setTimeout(() => {
            navTimeoutRef.current = null;
            if (pendingDirectionRef.current !== 0) {
              pendingDirectionRef.current = 0;
              springBack();
            }
          }, NAVIGATION_TIMEOUT);
        });
      },
      onPanResponderTerminate: () => {
        if (pendingDirectionRef.current === 0) springBack();
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

  const renderTabBar = React.useCallback((props) => (
    <Animated.View style={{ transform: [{ translateX: counterX }] }}>
      <BottomTabBar {...props} />
    </Animated.View>
  ), [counterX]);

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8);
  const badgeColor = colors.danger || '#EF4444';

  const screenOptions = React.useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: colors.tabBarActive,
    tabBarInactiveTintColor: colors.tabBarInactive,
    tabBarHideOnKeyboard: true,
    tabBarAllowFontScaling: false,
    lazy: true,
    tabBarStyle: {
      backgroundColor: colors.tabBarBackground,
      borderTopColor: colors.tabBarBorder || colors.borderDefault,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: TAB_PADDING_TOP + TAB_CONTENT_HEIGHT + bottomPadding,
      paddingTop: TAB_PADDING_TOP,
      paddingBottom: bottomPadding,
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
    tabBarBadgeStyle: {
      backgroundColor: badgeColor,
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
      minWidth: 18,
      height: 18,
      lineHeight: 17,
      borderRadius: 9,
    },
  }), [colors, bottomPadding, badgeColor]);

  return (
    <ProtectedRoute>
      {/* Backdrop so sliding screens never reveal a blank/black edge. */}
      <View style={{ flex: 1, backgroundColor: colors.canvas || colors.background }}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: swipeX }] }} {...swipeResponder.panHandlers}>
          <Tabs screenOptions={screenOptions} tabBar={renderTabBar}>
            <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ICONS.index }} />
            <Tabs.Screen
              name="chat"
              options={{
                title: 'Chats',
                tabBarIcon: ICONS.chat,
                tabBarBadge: formatBadge(unreadChats),
                tabBarAccessibilityLabel: unreadChats > 0 ? `Chats, ${unreadChats} unread` : 'Chats',
              }}
            />
            <Tabs.Screen name="studyMaterials" options={{ title: 'Resources', tabBarIcon: ICONS.studyMaterials }} />
            <Tabs.Screen
              name="groups"
              options={{
                title: 'Groups',
                tabBarIcon: ICONS.groups,
                tabBarBadge: formatBadge(unreadGroupMessages),
                tabBarAccessibilityLabel: unreadGroupMessages > 0 ? `Groups, ${unreadGroupMessages} unread` : 'Groups',
              }}
            />
            <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: ICONS.feed }} />
            <Tabs.Screen name="profile" options={{ href: null }} />
          </Tabs>
        </Animated.View>
      </View>
    </ProtectedRoute>
  );
}