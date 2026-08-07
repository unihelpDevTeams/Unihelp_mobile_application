import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

/* =========================================================
   Page Loader - Branded full-screen or card loading
   Usage: ScreenShell loading state
   ========================================================= */

export function PageLoader({ label = 'Loading...' }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(buildStyles);
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [spin, pulse]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const labelOpacity = pulse.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={styles.pageLoaderCard}>
      <Animated.View style={[styles.logoRing, { transform: [{ rotate }] }]}>
        <View style={styles.logoCore}>
          <Ionicons name="school" size={24} color={colors.brand} />
        </View>
      </Animated.View>
      <Animated.Text style={[styles.pageLoaderText, { opacity: labelOpacity }]}>
        {label}
      </Animated.Text>
      <View style={styles.loadingBarTrack}>
        <Animated.View
          style={[
            styles.loadingBarFill,
            {
              opacity: pulse,
              transform: [
                {
                  translateX: pulse.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [-80, 280],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

/* =========================================================
   FullScreenLoader - immersive branded loader overlay
   Usage: ScreenShell loading state for full-screen experience
   ========================================================= */

export function FullScreenLoader({ label = 'Loading...' }) {
  const { colors } = useTheme();
  const styles = useThemeStyles(buildStyles);
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.3)).current;
  const bounce1 = useRef(new Animated.Value(0)).current;
  const bounce2 = useRef(new Animated.Value(0)).current;
  const bounce3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    const bounceFn = (anim, delay) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -6, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    };

    const l1 = bounceFn(bounce1, 0);
    const l2 = bounceFn(bounce2, 200);
    const l3 = bounceFn(bounce3, 400);

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [spin, pulse, bounce1, bounce2, bounce3]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.fullScreen}>
      <View style={styles.fullScreenContent}>
        <Animated.View style={[styles.fullLogoRing, { transform: [{ rotate }] }]}>
          <View style={styles.fullLogoCore}>
            <Ionicons name="school" size={32} color={colors.brand} />
          </View>
        </Animated.View>

        <View style={styles.dotsRow}>
          <Animated.View style={[styles.bounceDot, { transform: [{ translateY: bounce1 }] }]} />
          <Animated.View style={[styles.bounceDot, { transform: [{ translateY: bounce2 }] }]} />
          <Animated.View style={[styles.bounceDot, { transform: [{ translateY: bounce3 }] }]} />
        </View>

        <Animated.Text style={[styles.fullScreenText, { opacity: pulse }]}>
          {label}
        </Animated.Text>
      </View>
    </View>
  );
}

/* =========================================================
   Chat Thinking Loader - pulsing bubble with sparkles
   Usage: AI chat "thinking..." state
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
          <Ionicons name="sparkles" size={14} color={colors.brand} />
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
   Usage: AIWidget prompt card loading state
   ========================================================= */

export function WidgetIconLoader({ color, size = 18 }) {
  const { colors } = useTheme();
  const effectiveColor = color || colors.brand;
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
      <Ionicons name="sync-outline" size={size} color={effectiveColor} />
    </Animated.View>
  );
}

/* =========================================================
   Button Inline Loader - compact spinner
   Usage: buttons, send button, action buttons
   ========================================================= */

export function ButtonLoader({ color, size = 16 }) {
  const { colors } = useTheme();
  const effectiveColor = color || colors.onBrand;
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
      <Ionicons name="arrow-redo" size={size} color={effectiveColor} />
    </Animated.View>
  );
}

/* =========================================================
   Uploading Loader - file upload progress
   Usage: attachment upload state
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
  return {
  pageLoaderCard: {
    paddingVertical: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logoRing: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: COLORS.indigoSoft,
    borderWidth: 2,
    borderColor: COLORS.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCore: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageLoaderText: {
    color: COLORS.inkSoft,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  loadingBarTrack: {
    width: 200,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.indigoSoft,
    overflow: 'hidden',
    marginTop: 4,
  },
  loadingBarFill: {
    width: 80,
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.indigo,
  },

  // FullScreen loader
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContent: {
    alignItems: 'center',
    gap: 20,
  },
  fullLogoRing: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: COLORS.indigoSoft,
    borderWidth: 3,
    borderColor: COLORS.brandBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullLogoCore: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    height: 20,
  },
  bounceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.indigo,
  },
  fullScreenText: {
    color: COLORS.inkSoft,
    fontSize: 15,
    fontWeight: '700',
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
  widgetLoader: {
    width: 18,
    height: 18,
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
  };
};