import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';
import { Image } from 'react-native';

/* =========================================================
   Page Loader - Premium minimal pulse loader
   Usage: ScreenShell loading state
   ========================================================= */

export function PageLoader({ label = 'Loading...' }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(buildStyles);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnim.start();
    return () => pulseAnim.stop();
  }, [pulse]);

  const scaleCore = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.05],
  });

  const rippleScale1 = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const rippleOpacity1 = pulse.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.4, 0, 0],
  });

  const rippleScale2 = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.3],
  });

  const rippleOpacity2 = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <View style={styles.pageLoaderContainer}>
      <View style={styles.loaderGraphic}>
        {/* Ambient background ripples */}
        <Animated.View style={[styles.ripple, { transform: [{ scale: rippleScale1 }], opacity: rippleOpacity1 }]} />
        <Animated.View style={[styles.ripple, { transform: [{ scale: rippleScale2 }], opacity: rippleOpacity2 }]} />
        
        {/* Core Logo */}
        <Animated.View style={[styles.coreLogoWrap, { transform: [{ scale: scaleCore }] }]}>
          <Image source={require('../../../assets/images/icon-square.png')} style={styles.coreLogoImage} />
        </Animated.View>
      </View>
      
      {/* Sleek fade text */}
      <Animated.Text style={[styles.premiumText, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }]}>
        {label}
      </Animated.Text>
    </View>
  );
}

/* =========================================================
   FullScreenLoader - Immersive immersive loader overlay
   Usage: Global app loading, authentication state
   ========================================================= */

export function FullScreenLoader({ label = 'Just a moment...' }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(buildStyles);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnim.start();
    return () => pulseAnim.stop();
  }, [pulse]);

  const scaleCore = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  const rippleScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const rippleOpacity = pulse.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.3, 0, 0],
  });

  return (
    <View style={styles.fullScreen}>
      <View style={styles.fullScreenContent}>
        <View style={styles.fullLoaderGraphic}>
          <Animated.View style={[styles.fullRipple, { transform: [{ scale: rippleScale }], opacity: rippleOpacity }]} />
          <Animated.View style={[styles.fullRipple, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.4] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] }) }]} />
          
          <Animated.View style={[styles.fullCoreLogoWrap, { transform: [{ scale: scaleCore }] }]}>
            <Image source={require('../../../assets/images/icon-square.png')} style={styles.fullCoreLogoImage} />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.fullScreenText, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]}>
          {label}
        </Animated.Text>
      </View>
    </View>
  );
}

/* =========================================================
   Chat Thinking Loader - pulsing bubble with sparkles
   ========================================================= */

export function ChatThinkingLoader({ label = 'Thinking...' }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(buildStyles);
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0.6, 1],
    outputRange: [1, 1.18],
  });

  const opacity = pulse.interpolate({
    inputRange: [0.6, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={styles.thinkingRow}>
      <View style={styles.thinkingAvatar}>
        <Animated.View style={{ transform: [{ scale }], opacity }}>
          <Image source={require('../../../assets/images/icon-square.png')} style={{ width: 28, height: 28 }} />
        </Animated.View>
      </View>
      <View style={styles.thinkingBubble}>
        <View style={styles.thinkingDots}>
          <Dot delay={0} />
          <Dot delay={160} />
          <Dot delay={320} />
        </View>
        <Text style={styles.thinkingLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Dot({ delay }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(buildStyles);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, -6],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          transform: [{ translateY }],
          backgroundColor: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.brandLight, colors.brand],
          }),
        },
      ]}
    />
  );
}

/* =========================================================
   Widget Loading Ring - subtle icon loader
   ========================================================= */

export function WidgetIconLoader({ color, size = 18 }) {
  const { colors } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Image source={require('../../../assets/images/icon-square.png')} style={{ width: size, height: size }} />
    </Animated.View>
  );
}

/* =========================================================
   Button Inline Loader - compact spinner
   ========================================================= */

export function ButtonLoader({ color, size = 16 }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="sync-outline" size={size} color={color || '#FFFFFF'} />
    </Animated.View>
  );
}

/* =========================================================
   Uploading Loader - file upload progress
   ========================================================= */

export function UploadingLoader() {
  const styles = useThemeStyles(buildStyles);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['20%', '92%'],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 1, 0.4],
  });

  return (
    <View style={styles.uploadingRow}>
      <View style={styles.uploadingTrack}>
        <Animated.View style={[styles.uploadingFill, { width, opacity }]} />
      </View>
      <Text style={styles.uploadingLabel}>Uploading attachment…</Text>
    </View>
  );
}

const buildStyles = (c) => {
  const COLORS = {
    indigo: c.brand,
    indigoDark: c.brandDark,
    indigoSoft: c.brandLight,
    white: c.surface,
    border: c.borderDefault,
    ink: c.textPrimary,
    inkSoft: c.textSecondary,
    brandBorder: c.brandBorder,
  };
  return StyleSheet.create({
    pageLoaderContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    },
    loaderGraphic: {
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    ripple: {
      position: 'absolute',
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: COLORS.indigo,
    },
    coreLogoWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: COLORS.indigo,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      zIndex: 10,
    },
    coreLogoImage: {
      width: 28,
      height: 28,
      borderRadius: 6,
    },
    premiumText: {
      color: COLORS.inkSoft,
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.5,
    },

    // FullScreen loader
    fullScreen: {
      flex: 1,
      backgroundColor: c.background || '#F9FAFB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullScreenContent: {
      alignItems: 'center',
      gap: 32,
    },
    fullLoaderGraphic: {
      width: 120,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    fullRipple: {
      position: 'absolute',
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: COLORS.indigo,
    },
    fullCoreLogoWrap: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: COLORS.white,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: COLORS.indigo,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
      zIndex: 10,
    },
    fullCoreLogoImage: {
      width: 44,
      height: 44,
      borderRadius: 10,
    },
    fullScreenText: {
      color: COLORS.ink,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    // Thinking loader
    thinkingRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      alignSelf: 'flex-start',
      paddingRight: '10%',
      paddingVertical: 4,
    },
    thinkingAvatar: {
      width: 26,
      height: 26,
      borderRadius: 9,
      backgroundColor: COLORS.indigoSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    thinkingBubble: {
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 18,
      borderBottomLeftRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 8,
      minWidth: 110,
    },
    thinkingDots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 14,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },
    thinkingLabel: {
      color: COLORS.inkSoft,
      fontSize: 12.5,
      fontWeight: '700',
    },
    uploadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
    },
    uploadingTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: COLORS.indigoSoft,
      overflow: 'hidden',
    },
    uploadingFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: COLORS.indigo,
    },
    uploadingLabel: {
      color: COLORS.inkSoft,
      fontSize: 12.5,
      fontWeight: '700',
    },
  });
};

