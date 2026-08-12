import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '@/global.css';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AIProvider } from '../src/shared/context/AIContext';
import RoleGuard from '../components/RoleGuard';
import { PushNotificationBootstrap } from '../hooks/usePushNotifications';
import { ThemeProvider, useTheme, ThemeGate } from '../src/shared/theme/ThemeContext';
import PromoSpotlight from '../src/shared/components/PromoSpotlight/PromoSpotlight';
import { usePromoSpotlight } from '../src/shared/hooks/usePromoSpotlight';

function BrandSpinner({ color, size = 24 }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);
  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="sync-outline" size={size} color={color} />
    </Animated.View>
  );
}

function GlobalPreloader() {
  const { loading } = useAuth();
  const { colors } = useTheme();
  if (!loading) return null;
  return (
    <View style={[styles.preloaderOverlay, { backgroundColor: colors.canvas }]}>
      <BrandSpinner color={colors.brand} size={32} />
      <Text style={[styles.preloaderText, { color: colors.grey }]}>Preparing Your Experience...</Text>
    </View>
  );
}

function AppContent() {
  const { colors, isDark, themeLoaded } = useTheme();
  const { promo, visible: promoVisible, dismiss: dismissPromo, markClicked: markPromoClicked } = usePromoSpotlight();

  // Prevent flash - don't render until theme is loaded
  if (!themeLoaded) {
    return (
      <View style={[styles.preloaderOverlay, { backgroundColor: colors.canvas }]}>
        <BrandSpinner color={colors.brand} size={32} />
        <Text style={[styles.preloaderText, { color: colors.grey }]}>Preparing Your Experience...</Text>
      </View>
    );
  }

  return (
    <ThemeGate>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <GlobalPreloader />
      <RoleGuard>
        <Stack
          initialRouteName="(tabs)"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.canvas },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="ai" />
          <Stack.Screen name="newsfeed" />
          <Stack.Screen name="announcements" />
          <Stack.Screen name="adminpanel" />
          <Stack.Screen name="cgpa" />
          <Stack.Screen name="create" />
          <Stack.Screen name="create-story" />
          <Stack.Screen name="create-chapter" />
          <Stack.Screen name="community" />
          <Stack.Screen name="community/[groupId]" />
          <Stack.Screen name="community-settings" />
          <Stack.Screen name="gpa" />
          <Stack.Screen name="help-center" />
          <Stack.Screen name="myhostels" />
          <Stack.Screen name="myproducts" />
          <Stack.Screen name="mystories" />
          <Stack.Screen name="premium" options={{ presentation: 'card' }} />
          <Stack.Screen name="smart-timetable" />
          <Stack.Screen name="tasks" />
          <Stack.Screen name="uploadquestion" />
          <Stack.Screen name="lecturenotesmarketplace" />
          <Stack.Screen name="hostelmarketplace" />
          <Stack.Screen name="studentmarketplace" />
          <Stack.Screen name="upload" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="messages/[conversationId]" />
          <Stack.Screen name="friends" />
          <Stack.Screen name="find-friends" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="marketplace" />
          <Stack.Screen name="stories" />
          <Stack.Screen name="support" />
          <Stack.Screen name="formula-hub" />
          <Stack.Screen name="challenge" />
          <Stack.Screen name="view" />
          <Stack.Screen name="view-user-profile" />
          <Stack.Screen name="faq" />
          <Stack.Screen name="about" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="contact" />
          <Stack.Screen name="report" />
          <Stack.Screen name="suggestion" />
          <Stack.Screen name="requests" />
          <Stack.Screen name="read-story" />
          <Stack.Screen name="splash" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="search" options={{ presentation: 'card' }} />
          <Stack.Screen name="saved" options={{ presentation: 'card' }} />
          <Stack.Screen name="downloads" options={{ presentation: 'card' }} />
          <Stack.Screen name="leaderboard" options={{ presentation: 'card' }} />
          <Stack.Screen name="achievements" options={{ presentation: 'card' }} />
          <Stack.Screen name="payment-success" options={{ presentation: 'modal' }} />
        </Stack>
      </RoleGuard>
      <PromoSpotlight
        promo={promo}
        visible={promoVisible}
        onDismiss={dismissPromo}
        onAction={markPromoClicked}
      />
    </ThemeGate>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AIProvider>
              <PushNotificationBootstrap />
              <AppContent />
            </AIProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  preloaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 9999,
  },
  preloaderText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
