import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Pressable,
  Text,
  View,
  PanResponder,
  Animated,
  useWindowDimensions,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { layout } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import DailyStreakBanner from '../../src/shared/components/DailyStreakBanner';
import {
  addUserActivity,
  fetchAnnouncements,
  fetchNotes,
  fetchQuestions,
  notifyInactiveUsers,
  fetchDailyStreak,
  recordDailyStreak,
} from '../../services/firestoreSync';
import { useAuth } from '../../context/AuthContext';
import { isRouteAllowedForRole } from '../../src/shared/navigation/routePermissions';

// Curated high-res imagery for top-tier visual hierarchy
const IMAGES = {
  heroMesh: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
  hostel: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=600&auto=format&fit=crop',
  marketplace: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop',
  stories: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600&auto=format&fit=crop',
  community: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop',
};

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();

  const [streakCount, setStreakCount] = useState(0);
  const [streakDates, setStreakDates] = useState([]);
  const [, setIsFabDragging] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // Floating Action Button Physics
  const fabPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const fabPositionRef = useRef({ x: 0, y: 0 });
  const fabStartPosition = useRef({ x: 0, y: 0 });
  const fabLayout = useRef({ width: 0, height: 0 });
  const fabScale = useRef(new Animated.Value(1)).current;
  const dragDistance = useRef(0);
  const hasPositionedFab = useRef(false);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const styles = useThemeStyles((c, s, r) => ({
    // Fluid Ambient Top Bar
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: s.md,
      marginBottom: s.md,
    },
    userPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      backgroundColor: c.surface,
      paddingHorizontal: s.sm,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    avatarGlow: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    avatarTxt: {
      color: c.onBrand,
      fontSize: 16,
      fontWeight: '800',
    },
    greetingTextWrap: {
      paddingRight: s.xs,
    },
    greetingHello: {
      fontSize: 10,
      color: c.grey,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    greetingName: {
      fontSize: 15,
      fontWeight: '900',
      color: c.ink,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs,
    },
    iconBadgeBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
    },

    // Focus Zone (Dynamic Hero Card)
    focusCard: {
      borderRadius: r['3xl'],
      overflow: 'hidden',
      marginBottom: s.xl,
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 8,
    },
    focusImageBg: {
      width: '100%',
      minHeight: 210,
      justifyContent: 'space-between',
    },
    focusGradient: {
      padding: s.xl,
      justifyContent: 'space-between',
      flex: 1,
    },
    focusHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    focusTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: s.md,
      paddingVertical: 5,
      borderRadius: 999,
    },
    focusTagText: {
      color: c.onBrand,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    focusBody: {
      marginVertical: s.md,
    },
    focusTitle: {
      color: c.onBrand,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    focusSubtitle: {
      color: 'rgba(255, 255, 255, 0.85)',
      fontSize: 13,
      fontWeight: '500',
      marginTop: 4,
    },
    focusFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
    },
    btnFocusPrimary: {
      flex: 1,
      height: 46,
      borderRadius: r.xl,
      backgroundColor: c.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    btnFocusPrimaryText: {
      color: c.brandText,
      fontSize: 14,
      fontWeight: '800',
    },
    btnFocusIcon: {
      width: 46,
      height: 46,
      borderRadius: r.xl,
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // REDESIGNED TOOLKIT SECTION
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: c.ink,
      letterSpacing: -0.3,
    },
    seeAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.surface,
      paddingHorizontal: s.sm + 2,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
    },
    seeAllText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.brandText,
    },
    toolGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.sm,
      marginBottom: s.xl,
    },
    toolCard: {
      width: (screenWidth - layout.screenPadding * 2 - s.sm) / 2,
      backgroundColor: c.surface,
      borderRadius: r['2xl'],
      padding: s.md,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
      justifyContent: 'space-between',
      minHeight: 110,
    },
    toolHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toolIconContainer: {
      width: 40,
      height: 40,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolBadge: {
      fontSize: 9,
      fontWeight: '800',
      color: c.brandText,
      backgroundColor: c.background,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      overflow: 'hidden',
    },
    toolContent: {
      marginTop: s.xs,
    },
    toolTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.ink,
    },
    toolSub: {
      fontSize: 11,
      color: c.grey,
      fontWeight: '500',
      marginTop: 2,
    },

    // Horizontal Carousel Strip
    horizontalScroll: {
      marginHorizontal: -layout.screenPadding,
      paddingHorizontal: layout.screenPadding,
      marginBottom: s.xl,
    },
    horizontalCard: {
      width: 220,
      height: 140,
      marginRight: s.md,
      borderRadius: r['2xl'],
      overflow: 'hidden',
    },
    horizontalBg: {
      width: '100%',
      height: '100%',
      justifyContent: 'flex-end',
    },
    horizontalOverlay: {
      padding: s.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    horizontalTitle: {
      color: c.onBrand,
      fontSize: 15,
      fontWeight: '800',
    },

    // Floating AI Dynamic Glass Pill
    fab: {
      position: 'absolute',
      zIndex: 1000,
      maxWidth: 52,
      height: 52,
      paddingHorizontal: s.lg,
      borderRadius: 26,
      overflow: 'hidden',
      elevation: 12,
      shadowColor: c.brand,
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    fabGradient: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    fabText: {
      color: c.onBrand,
      fontSize: 13,
      fontWeight: '800',
    },
  }));

  const loadData = useCallback(async () => {
    try {
      const [, , , streakData] = await Promise.all([
        fetchAnnouncements(),
        fetchNotes(),
        fetchQuestions(),
        fetchDailyStreak(),
      ]);
      if (streakData) {
        setStreakCount(streakData.streakCount || 0);
        setStreakDates(streakData.streakDates || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!profile?.uid) return;
    addUserActivity({ type: 'open_home', message: 'Opened main dashboard' }).catch(() => {});
    recordDailyStreak().catch(() => {});
    notifyInactiveUsers().catch(() => {});
  }, [profile?.uid]);

  const handleStreakPress = useCallback(() => router.push('/streak'), [router]);

  const handleStudyNow = useCallback(async () => {
    try {
      const result = await recordDailyStreak();
      if (result) {
        setStreakCount(result.streakCount);
        setStreakDates(result.streakDates);
      }
      router.push('/streak');
    } catch {}
  }, [router]);

  const avatarInitial = (profile?.username || 'U').trim().charAt(0).toUpperCase();
  const showAvatarImage = !!profile?.photoURL && !avatarFailed;

  // Drag Clamping for AI FAB
  const clampFabPosition = useCallback(
    (nextX, nextY) => {
      const width = fabLayout.current.width || 120;
      const height = fabLayout.current.height || 52;
      const maxX = Math.max(0, screenWidth - width - layout.screenPadding);
      const maxY = Math.max(0, screenHeight - height - 100);
      return {
        x: Math.min(Math.max(nextX, layout.screenPadding), maxX),
        y: Math.min(Math.max(nextY, 20), maxY),
      };
    },
    [screenHeight, screenWidth]
  );

  const animateFabScale = useCallback(
    (toValue) => {
      Animated.spring(fabScale, {
        toValue,
        useNativeDriver: false,
        friction: 8,
        tension: 120,
      }).start();
    },
    [fabScale]
  );

  const handleFabLayout = useCallback(
    (event) => {
      const { width, height } = event.nativeEvent.layout;
      fabLayout.current = { width, height };

      if (!hasPositionedFab.current) {
        hasPositionedFab.current = true;
        const initial = clampFabPosition(
          screenWidth - width - layout.screenPadding,
          screenHeight - height - 110
        );
        fabPositionRef.current = initial;
        fabPan.setValue(initial);
      }
    },
    [clampFabPosition, fabPan, screenHeight, screenWidth]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.hypot(gestureState.dx, gestureState.dy) > 3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setIsFabDragging(true);
          animateFabScale(0.94);
          dragDistance.current = 0;
          fabPan.stopAnimation((val) => {
            fabStartPosition.current = val;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          dragDistance.current = Math.hypot(gestureState.dx, gestureState.dy);
          const nextX = fabStartPosition.current.x + gestureState.dx;
          const nextY = fabStartPosition.current.y + gestureState.dy;
          const clamped = clampFabPosition(nextX, nextY);
          fabPositionRef.current = clamped;
          fabPan.setValue(clamped);
        },
        onPanResponderRelease: () => {
          setIsFabDragging(false);
          animateFabScale(1);

          if (dragDistance.current < 8) {
            dragDistance.current = 0;
            router.push('/ai');
            return;
          }
          dragDistance.current = 0;
          const width = fabLayout.current.width || 120;
          const midX = fabPositionRef.current.x + width / 2;
          const snapLeft = layout.screenPadding;
          const snapRight = Math.max(0, screenWidth - width - layout.screenPadding);
          const targetX = midX < screenWidth / 2 ? snapLeft : snapRight;

          fabPositionRef.current = { ...fabPositionRef.current, x: targetX };
          Animated.spring(fabPan.x, {
            toValue: targetX,
            useNativeDriver: false,
            friction: 8,
            tension: 80,
          }).start();
        },
      }),
    [animateFabScale, clampFabPosition, fabPan, router, screenWidth]
  );

  // Filtered tools based on user roles
  const toolsList = [
    {
      id: 'cgpa',
      title: 'CGPA Tracker',
      sub: 'Monitor progress',
      icon: 'stats-chart',
      color: '#4F46E5',
      bgColor: '#EEF2FF',
      route: '/cgpa',
      badge: 'POPULAR',
    },
    {
      id: 'gpa',
      title: 'GPA Calc',
      sub: 'Estimate semester',
      icon: 'calculator',
      color: '#EA580C',
      bgColor: '#FFF7ED',
      route: '/gpa',
      badge: 'QUICK',
    },
    {
      id: 'timetable',
      title: 'Smart Schedule',
      sub: 'Class timetable',
      icon: 'calendar-number',
      color: '#EF4444',
      bgColor: '#FEF2F2',
      route: '/smart-timetable',
      badge: 'LIVE',
    },
    {
      id: 'formula',
      title: 'Formula Hub',
      sub: 'Math & Science',
      icon: 'code-working',
      color: '#9333EA',
      bgColor: '#F3E8FF',
      route: '/formula-hub',
      badge: 'GUIDE',
    },
  ].filter((tool) => isRouteAllowedForRole(tool.route, profile?.role));

  return (
    <ScreenShell
      showFooter
      overlayContent={
        <Animated.View
          onLayout={handleFabLayout}
          style={[
            styles.fab,
            {
              transform: [
                { translateX: fabPan.x },
                { translateY: fabPan.y },
                { scale: fabScale },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/ai')}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}>
              <Ionicons name="sparkles" size={18} color={colors.onBrand} />
              <Text style={styles.fabText}>Ask</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      }
    >
      {/* AMBIENT FLOATING HEADER BAR */}
      <View style={styles.headerBar}>
        <Pressable style={styles.userPill} onPress={() => router.push('/profile')}>
          <View style={styles.avatarGlow}>
            {showAvatarImage ? (
              <Image
                source={{ uri: profile.photoURL }}
                style={styles.avatarImg}
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <Text style={styles.avatarTxt}>{avatarInitial}</Text>
            )}
          </View>
          <View style={styles.greetingTextWrap}>
            <Text style={styles.greetingHello}>Welcome Back</Text>
            <Text style={styles.greetingName}>
              {profile?.username ? profile.username : 'Student'}
            </Text>
          </View>
        </Pressable>

        <View style={styles.topActions}>
          <Pressable style={styles.iconBadgeBtn} onPress={handleStreakPress}>
            <Ionicons name="flame" size={20} color={colors.orange} />
          </Pressable>
          <Pressable style={styles.iconBadgeBtn} onPress={() => router.push('/announcements')}>
            <Ionicons name="notifications-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      {/* DYNAMIC FOCUS ZONE HERO CARD */}
      <View style={styles.focusCard}>
        <ImageBackground
          source={{ uri: IMAGES.heroMesh }}
          style={styles.focusImageBg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.92)']}
            style={styles.focusGradient}
          >
            <View style={styles.focusHeaderRow}>
              <View style={styles.focusTag}>
                <View style={styles.liveDot} />
                <Text style={styles.focusTagText}>ACADEMIC COCKPIT</Text>
              </View>
              <Ionicons name="compass" size={22} color={colors.onBrand} />
            </View>

            <View style={styles.focusBody}>
              <Text style={styles.focusTitle}>Ready to crush today's goals?</Text>
              <Text style={styles.focusSubtitle}>
                You have {streakCount} consecutive study days logged. Keep the momentum going!
              </Text>
            </View>

            <View style={styles.focusFooterRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.btnFocusPrimary,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => router.push('/(tabs)/studyMaterials')}
              >
                <Ionicons name="library" size={18} color={colors.brandText} />
                <Text style={styles.btnFocusPrimaryText}>Study Vault</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.btnFocusIcon,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => router.push('/tasks')}
              >
                <Ionicons name="checkmark-done" size={20} color={colors.onBrand} />
              </Pressable>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* STREAK WIDGET */}
      <View style={{ marginBottom: layout.screenPadding }}>
        <DailyStreakBanner
          streakCount={streakCount}
          streakDates={streakDates}
          onPress={handleStreakPress}
          onStudyNow={handleStudyNow}
        />
      </View>

      {/* REDESIGNED ACADEMIC TOOLKIT SECTION */}
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Academic Toolkit</Text>

          {/* ALL TOOLS BUTTON */}
          <Pressable
            style={({ pressed }) => [
              styles.seeAllBtn,
              pressed && { opacity: 0.75 },
            ]}
            onPress={() => router.push('/tools')}
          >
            <Text style={styles.seeAllText}>All Tools</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.brandText} />
          </Pressable>
        </View>

        {/* HIGH-DENSITY BALANCED TOOL GRID */}
        <View style={styles.toolGrid}>
          {toolsList.map((tool) => (
            <Pressable
              key={tool.id}
              style={({ pressed }) => [
                styles.toolCard,
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => router.push(tool.route)}
            >
              <View style={styles.toolHeader}>
                <View style={[styles.toolIconContainer, { backgroundColor: tool.bgColor }]}>
                  <Ionicons name={tool.icon} size={20} color={tool.color} />
                </View>
                <Text style={styles.toolBadge}>{tool.badge}</Text>
              </View>

              <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolSub}>{tool.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* HORIZONTAL CAMPUS DISCOVERY CAROUSEL */}
      <View style={{ marginBottom: layout.screenPadding }}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Explore Campus</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          <Pressable
            style={styles.horizontalCard}
            onPress={() => router.push('/hostelmarketplace')}
          >
            <ImageBackground source={{ uri: IMAGES.hostel }} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Hostels</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          <Pressable
            style={styles.horizontalCard}
            onPress={() => router.push('/studentmarketplace')}
          >
            <ImageBackground source={{ uri: IMAGES.marketplace }} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Marketplace</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          <Pressable style={styles.horizontalCard} onPress={() => router.push('/stories')}>
            <ImageBackground source={{ uri: IMAGES.stories }} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Campus Stories</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          <Pressable style={styles.horizontalCard} onPress={() => router.push('/find-friends')}>
            <ImageBackground source={{ uri: IMAGES.community }} style={styles.horizontalBg}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.horizontalOverlay}
              >
                <Text style={styles.horizontalTitle}>Find Friends</Text>
                <Ionicons name="arrow-forward-circle" size={22} color={colors.onBrand} />
              </LinearGradient>
            </ImageBackground>
          </Pressable>
        </ScrollView>
      </View>
    </ScreenShell>
  );
}