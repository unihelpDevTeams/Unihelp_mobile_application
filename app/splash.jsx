import React, { useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';
import favicon from '../assets/images/favicon.png';

export default function SplashScreen() {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const styles = useThemeStyles((c, s, r) => ({
    container: { flex: 1, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
    content: { alignItems: 'center', gap: s.xl },
    logoWrapper: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
    logoContainer: { width: 96, height: 96, borderRadius: r.full, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    appName: { fontSize: 38, fontWeight: '800', color: c.onBrand, letterSpacing: -0.5 },
    tagline: { fontSize: 16, color: c.brandGlow, fontWeight: '500', letterSpacing: 0.2 },
    spinner: { marginTop: s.lg },
  }));

  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 20, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoContainer}>
            <Image source={favicon} style={{ width: 74, height: 74 }} contentFit="contain" />
          </View>
        </View>
        <Text style={styles.appName}>Unihelp</Text>
        <Text style={styles.tagline}>Study smarter. Learn faster.</Text>
      </Animated.View>
    </View>
  );
}
