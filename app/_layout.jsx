import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts as useSoraFonts, Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import * as Linking from 'expo-linking';
import '@/global.css';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { parseDeepLink, readPendingDeepLink, clearPendingDeepLink, savePendingDeepLink } from '../utils/deepLink';
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
import { submitReport } from '../src/shared/services/support';
import SplashScreen from './splash';

function GlobalPreloader({ navigationReady }) {
  const { loading } = useAuth();
  if (!loading && navigationReady) return null;
  return <SplashScreen />;
}

function AppContent() {
  const { colors, isDark, themeLoaded } = useTheme();
  const { profile, user } = useAuth();
  const { promo, visible: promoVisible, dismiss: dismissPromo, markClicked: markPromoClicked } = usePromoSpotlight();
  const { isOnline } = useNetwork();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const premiumUnlocked = isPremiumActive(profile);
  const navigationReady = Boolean(rootNavigationState?.key);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportProblem, setReportProblem] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const lastShakeRef = useRef(0);
  const shakeMagnitudeRef = useRef(0);

  useEffect(() => {
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (!initialUrl) return;

      const match = parseDeepLink(initialUrl);
      if (!match) return;

      if (!user) {
        await savePendingDeepLink(initialUrl);
        return;
      }

      router.push({ pathname: match.pathname, params: match.params || {} });
    };

    handleInitialUrl();
  }, [router, user]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      const match = parseDeepLink(url);
      if (!match) return;

      if (!user) {
        await savePendingDeepLink(url);
        return;
      }

      router.push({ pathname: match.pathname, params: match.params || {} });
    });

    return () => subscription?.remove?.();
  }, [router, user]);

  useEffect(() => {
    const resumePendingDeepLink = async () => {
      if (!user) return;
      const pending = await readPendingDeepLink();
      if (!pending) return;
      await clearPendingDeepLink();
      router.push({ pathname: pending.pathname, params: pending.params || {} });
    };

    resumePendingDeepLink();
  }, [router, user]);

  useEffect(() => {
    if (isOnline === false && premiumUnlocked && router.pathname !== '/offline-center' && router.pathname !== '/premium') {
      router.navigate('/offline-center');
    }
  }, [isOnline, premiumUnlocked, router]);

  useEffect(() => {
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      const delta = Math.abs(magnitude - shakeMagnitudeRef.current);
      const shakeThreshold = 1.6;
      const cooldownMs = 5000;

      if (delta > shakeThreshold && now - lastShakeRef.current > cooldownMs) {
        lastShakeRef.current = now;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        setReportModalVisible(true);
      }

      shakeMagnitudeRef.current = magnitude;
    });

    return () => subscription.remove();
  }, []);

  const handleSubmitReport = async () => {
    const trimmed = reportProblem.trim();
    if (!trimmed) {
      setReportError('Please describe the problem before sending your report.');
      return;
    }

    if (!user) {
      setReportError('You must be signed in to submit a report.');
      return;
    }

    setReportSubmitting(true);
    setReportError('');

    try {
      await submitReport({
        reportType: 'bug',
        title: 'Device shake report',
        description: trimmed,
        attachments: [],
      });
      setReportProblem('');
      setReportModalVisible(false);
    } catch (error) {
      setReportError(error?.message || 'Could not submit the bug report right now.');
    } finally {
      setReportSubmitting(false);
    }
  };

  // Prevent flash - don't render until theme is loaded
  if (!themeLoaded) {
    return <SplashScreen />;
  }

  return (
    <ThemeGate>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <GlobalPreloader navigationReady={navigationReady} />
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
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setReportModalVisible(false);
          setReportError('');
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' }}
          onPress={() => {
            setReportModalVisible(false);
            setReportError('');
          }}
        >
          <Pressable
            style={{
              backgroundColor: colors.surfacePrimary,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 18,
              paddingTop: 16,
              paddingBottom: 28,
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 }}>
              Report a bug
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
              Describe what happened and send it to the UniHelp team.
            </Text>
            <TextInput
              value={reportProblem}
              onChangeText={setReportProblem}
              placeholder="What went wrong?"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              style={{
                minHeight: 128,
                backgroundColor: colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: colors.borderDefault,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.textPrimary,
                textAlignVertical: 'top',
                marginBottom: 12,
              }}
            />
            {reportError ? (
              <Text style={{ color: colors.error, fontSize: 12.5, marginBottom: 12 }}>{reportError}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => {
                  setReportModalVisible(false);
                  setReportProblem('');
                  setReportError('');
                }}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.borderDefault,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitReport}
                disabled={reportSubmitting || !reportProblem.trim()}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  backgroundColor: colors.brand,
                  paddingVertical: 12,
                  alignItems: 'center',
                  opacity: reportSubmitting || !reportProblem.trim() ? 0.6 : 1,
                }}
              >
                <Text style={{ fontWeight: '800', color: colors.onBrand }}>
                  {reportSubmitting ? 'Sending...' : 'Submit'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
