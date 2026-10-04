import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ExpoLinking from 'expo-linking';
import NetInfo from '@react-native-community/netinfo';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
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
import { submitReport } from '../src/shared/services/support';
import { fetchRecord } from '../services/firestoreSync';
import { getGroup, getMembership } from '../src/shared/services/community';
import {
  clearLastLocation,
  getLastLocation,
  hasExplicitNavigationIntent,
  normalizeLocationPath,
  resetNavigationPersistenceMemory,
  saveLastLocation,
  shouldPersistRoute,
} from '../src/shared/navigation/navigationPersistence';
import { isRouteAllowedForRole } from '../src/shared/navigation/routePermissions';
import { getLastNotificationResponse } from '../services/pushNotifications';

import SplashScreen from './splash';

function GlobalPreloader({ navigationReady }) {
  const { loading } = useAuth();
  if (!loading && navigationReady) return null;
  return <SplashScreen />;
}

function AppContent() {
  const { colors, isDark, themeLoaded } = useTheme();
  const { profile, user, loading: authLoading } = useAuth();
  const { promo, visible: promoVisible, dismiss: dismissPromo, markClicked: markPromoClicked } = usePromoSpotlight();
  const { isOnline } = useNetwork();
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const premiumUnlocked = isPremiumActive(profile);
  const [navigationReady, setNavigationReady] = useState(false);
  const restoreAttemptedRef = useRef(false);
  const navigationReadyRef = useRef(false);
  const skipInitialRootSaveRef = useRef(false);
  const pathnameRef = useRef(pathname);
  const userIdRef = useRef(user?.uid);
  const userVerifiedRef = useRef(user?.emailVerified);
  const previousUserIdRef = useRef(user?.uid);
  const profileRoleRef = useRef(profile?.role);
  const routerRef = useRef(router);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (previousUserIdRef.current && previousUserIdRef.current !== user?.uid) {
      resetNavigationPersistenceMemory();
      pathnameRef.current = user?.uid ? pathname : '/';
    } else {
      pathnameRef.current = pathname;
    }
    previousUserIdRef.current = user?.uid;
    userIdRef.current = user?.uid;
    userVerifiedRef.current = user?.emailVerified;
    profileRoleRef.current = profile?.role;
    routerRef.current = router;
  }, [pathname, profile?.role, router, user?.emailVerified, user?.uid]);

  useEffect(() => {
    navigationReadyRef.current = navigationReady;
  }, [navigationReady]);

  useEffect(() => {
    if (authLoading || !rootNavigationState?.key || restoreAttemptedRef.current) return undefined;

    restoreAttemptedRef.current = true;
    let cancelled = false;

    const decideStartupRoute = async () => {
      try {
        const [initialUrl, lastNotificationResponse] = await Promise.all([
          Linking.getInitialURL().catch((error) => {
            console.warn('Could not inspect the app launch URL:', error?.message || error);
            return null;
          }),
          getLastNotificationResponse().catch((error) => {
            console.warn('Could not inspect the notification launch intent:', error?.message || error);
            return null;
          }),
        ]);
        if (cancelled) return;

        const initialLinkPath = initialUrl ? ExpoLinking.parse(initialUrl).path : '';
        const hasDeepLinkIntent = Boolean(initialLinkPath && normalizeLocationPath(`/${initialLinkPath}`) !== '/');
        const startupPath = normalizeLocationPath(pathnameRef.current);
        const uid = userIdRef.current;

        if (
          uid
          && userVerifiedRef.current
          && startupPath === '/'
          && !hasDeepLinkIntent
          && !lastNotificationResponse
          && !hasExplicitNavigationIntent()
        ) {
          const location = await getLastLocation(uid);
          if (location && !cancelled) {
            const role = profileRoleRef.current || 'university';
            if (!isRouteAllowedForRole(location.pathname, role)) {
              await clearLastLocation(uid);
            } else {
              let canRestore = true;
              const directMatch = location.pathname.match(/^\/messages\/([^/]+)$/);
              const groupMatch = location.pathname.match(/^\/community\/([^/]+)$/);

              if (directMatch || groupMatch) {
                const network = await NetInfo.fetch();
                const online = network.isConnected === true && network.isInternetReachable === true;
                if (online) {
                  try {
                    if (directMatch) {
                      const conversation = await fetchRecord('conversations', directMatch[1]);
                      if (!conversation) {
                        const afterRead = await NetInfo.fetch();
                        canRestore = !(afterRead.isConnected === true && afterRead.isInternetReachable === true);
                        if (canRestore) console.warn('Using the saved chat route while offline; its conversation could not be checked.');
                      } else {
                        canRestore = Array.isArray(conversation.memberIds) && conversation.memberIds.includes(uid);
                      }
                    } else {
                      const groupId = groupMatch[1];
                      const [group, membership] = await Promise.all([
                        getGroup(groupId),
                        getMembership(groupId, uid),
                      ]);
                      canRestore = Boolean(
                        group
                        && (membership || group.adminId === uid || group.ownerId === uid)
                      );
                    }
                  } catch (error) {
                    console.warn('Could not validate the saved conversation access:', error?.message || error);
                    const afterRead = await NetInfo.fetch();
                    canRestore = !(afterRead.isConnected === true && afterRead.isInternetReachable === true);
                  }
                }
              }

              if (cancelled || userIdRef.current !== uid || !userVerifiedRef.current) return;

              if (!canRestore) {
                await clearLastLocation(uid);
                routerRef.current.replace('/chat');
              } else if (
                !cancelled
                && normalizeLocationPath(pathnameRef.current) === startupPath
                && !hasExplicitNavigationIntent()
              ) {
                if (location.pathname !== '/') skipInitialRootSaveRef.current = true;
                routerRef.current.replace(location.pathname);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Could not restore the saved navigation location:', error?.message || error);
      } finally {
        if (!cancelled) {
          navigationReadyRef.current = true;
          setNavigationReady(true);
        }
      }
    };

    decideStartupRoute();
    return () => {
      cancelled = true;
    };
  }, [authLoading, rootNavigationState?.key]);

  useEffect(() => {
    if (!navigationReady || authLoading || !user?.uid || !shouldPersistRoute(pathname)) return;
    if (skipInitialRootSaveRef.current) {
      if (normalizeLocationPath(pathname) === '/') return;
      skipInitialRootSaveRef.current = false;
    }
    saveLastLocation(user.uid, pathname).catch((error) => {
      console.warn('Could not save the current navigation location:', error?.message || error);
    });
  }, [authLoading, navigationReady, pathname, user?.uid]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      if (
        previousState === 'active'
        && nextState !== 'active'
        && navigationReadyRef.current
        && userIdRef.current
        && shouldPersistRoute(pathnameRef.current)
      ) {
        saveLastLocation(userIdRef.current, pathnameRef.current, {}, { refresh: true }).catch((error) => {
          console.warn('Could not persist the navigation location before backgrounding:', error?.message || error);
        });
      }
    });
    return () => subscription.remove();
  }, []);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportProblem, setReportProblem] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const lastShakeRef = useRef(0);
  const shakeMagnitudeRef = useRef(0);

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
