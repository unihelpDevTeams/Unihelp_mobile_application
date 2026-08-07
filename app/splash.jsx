import React, { useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';

export default function SplashScreen() {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const styles = useThemeStyles((c, s, r) => ({
    container: { flex: 1, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
    content: { alignItems: 'center', gap: s.xl },
    logoWrapper: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
    logoContainer: { width: 96, height: 96, borderRadius: r.full, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    appName: { fontSize: 38, fontWeight: '800', color: c.onBrand, letterSpacing: -0.5 },
    tagline: { fontSize: 16, color: c.brandGlow, fontWeight: '500', letterSpacing: 0.2 },
    spinner: { marginTop: s.lg },
  }));

  const spinAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);

  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoContainer}>
            <Ionicons name="school" size={48} color={colors.brand} />
          </View>
        </View>
        <Text style={styles.appName}>Unihelp</Text>
        <Text style={styles.tagline}>Study smarter. Learn faster.</Text>
        <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]}>
          <Ionicons name="sync-outline" size={24} color={colors.onBrand} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
