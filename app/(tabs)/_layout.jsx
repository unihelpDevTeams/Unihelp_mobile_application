import React from 'react';
import { Platform, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { layout } from '../../src/shared/theme';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';
import {
  listenUnreadConversationCount,
  listenUnreadGroupMessageCount,
} from '../../services/firestoreSync';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [unreadChats, setUnreadChats] = React.useState(0);
  const [unreadGroupMessages, setUnreadGroupMessages] = React.useState(0);

  React.useEffect(() => {
    if (!user?.uid) {
      setUnreadChats(0);
      setUnreadGroupMessages(0);
      return undefined;
    }

    const unsubscribeChats = listenUnreadConversationCount(user.uid, setUnreadChats);
    const unsubscribeGroups = listenUnreadGroupMessageCount(user.uid, setUnreadGroupMessages);

    return () => {
      unsubscribeChats();
      unsubscribeGroups();
    };
  }, [user?.uid]);

  return (
    <ProtectedRoute>
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
                    }}
                  >
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
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}