import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import '@/global.css';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AIProvider } from '../src/shared/context/AIContext';
import RoleGuard from '../components/RoleGuard';
import { PushNotificationBootstrap } from '../hooks/usePushNotifications';
import { ThemeProvider, useTheme, ThemeGate } from '../src/shared/theme/ThemeContext';
import PromoSpotlight from '../src/shared/components/PromoSpotlight/PromoSpotlight';
import { usePromoSpotlight } from '../src/shared/hooks/usePromoSpotlight';
import { FullScreenLoader } from '../src/shared/components/AILoaders';
import { NetworkProvider, useNetwork } from '../context/NetworkContext';
import OfflineBanner from '../components/OfflineBanner';

function GlobalPreloader() {
  const { loading } = useAuth();
  if (!loading) return null;
  return <FullScreenLoader label="Preparing your experience..." />;
}

function AppContent() {
  const { colors, isDark, themeLoaded } = useTheme();
  const { promo, visible: promoVisible, dismiss: dismissPromo, markClicked: markPromoClicked } = usePromoSpotlight();
  const { isOnline } = useNetwork();
  const router = useRouter();

  useEffect(() => {
    if (isOnline === false) {
      router.push('/offline-center');
    }
  }, [isOnline, router]);

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
          <Stack.Screen name="premium/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="profile/danger" options={{ presentation: 'card' }} />
          <Stack.Screen name="splash" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="search/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="saved/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="downloads/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="offline-center" options={{ presentation: 'card' }} />
          <Stack.Screen name="leaderboard/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="achievements/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="payment-success/index" options={{ presentation: 'modal' }} />
        </Stack>
      </RoleGuard>
      <PromoSpotlight
        promo={promo}
        visible={promoVisible}
        onDismiss={dismissPromo}
        onAction={markPromoClicked}
      />
      <OfflineBanner />
    </ThemeGate>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NetworkProvider>
          <ThemeProvider>
            <AuthProvider>
              <AIProvider>
                <PushNotificationBootstrap />
                <AppContent />
              </AIProvider>
            </AuthProvider>
          </ThemeProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
