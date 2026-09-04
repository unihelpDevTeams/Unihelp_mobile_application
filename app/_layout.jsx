import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts as useSoraFonts, Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
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
import { isPremiumActive } from '../src/shared/services/premium';

function GlobalPreloader() {
  const { loading } = useAuth();
  if (!loading) return null;
  return <FullScreenLoader label="Preparing your experience..." />;
}

function AppContent() {
  const { colors, isDark, themeLoaded } = useTheme();
  const { profile } = useAuth();
  const { promo, visible: promoVisible, dismiss: dismissPromo, markClicked: markPromoClicked } = usePromoSpotlight();
  const { isOnline } = useNetwork();
  const router = useRouter();
  const premiumUnlocked = isPremiumActive(profile);

  useEffect(() => {
    if (isOnline === false && premiumUnlocked && router.pathname !== '/offline-center' && router.pathname !== '/premium') {
      router.navigate('/offline-center');
    }
  }, [isOnline, premiumUnlocked, router]);

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
          <Stack.Screen name="rewards/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="payment-success/index" options={{ presentation: 'modal' }} />
          <Stack.Screen name="stickers/create" options={{ presentation: 'card' }} />
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
  const [manropeLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const [soraLoaded] = useSoraFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  const fontsReady = manropeLoaded && soraLoaded;

  if (!fontsReady) {
    return <FullScreenLoader label="Loading fonts..." />;
  }

  const baseTextStyle = { fontFamily: 'Manrope_400Regular' };
  const previousStyle = Text.defaultProps?.style;
  Text.defaultProps = {
    ...(Text.defaultProps || {}),
    style: Array.isArray(previousStyle)
      ? [baseTextStyle, ...previousStyle]
      : [baseTextStyle, previousStyle].filter(Boolean),
  };

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
