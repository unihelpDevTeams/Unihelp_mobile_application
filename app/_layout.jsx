import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React from 'react';
import '@/global.css';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AIProvider } from '../src/shared/context/AIContext';
import RoleGuard from '../components/RoleGuard';
import { PushNotificationBootstrap } from '../hooks/usePushNotifications';
import { ThemeProvider, useTheme, ThemeGate } from '../src/shared/theme/ThemeContext';
import PromoSpotlight from '../src/shared/components/PromoSpotlight/PromoSpotlight';
import { usePromoSpotlight } from '../src/shared/hooks/usePromoSpotlight';
import { FullScreenLoader } from '../src/shared/components/AILoaders';

function GlobalPreloader() {
  const { loading } = useAuth();
  if (!loading) return null;
  return <FullScreenLoader label="Preparing your experience..." />;
}

function AppContent() {
  const { colors, isDark, themeLoaded } = useTheme();
  const { promo, visible: promoVisible, dismiss: dismissPromo, markClicked: markPromoClicked } = usePromoSpotlight();

  // Prevent flash - don't render until theme is loaded
  if (!themeLoaded) {
    return <FullScreenLoader label="Preparing your experience..." />;
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
          <Stack.Screen name="profile/danger" options={{ presentation: 'card' }} />
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
          <Stack.Screen name="offline-center" options={{ presentation: 'card' }} />
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
