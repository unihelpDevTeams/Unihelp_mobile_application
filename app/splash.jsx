import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../src/shared/theme/createStyles';
import favicon from '../assets/images/favicon.png';

const TITLE = 'Unihelp'.split('');
const TAGLINE = ['Study', 'smarter.', 'Learn', 'faster.'];
const ORBIT_ICONS = ['book', 'bulb', 'school', 'pencil'];
const STAGE = 300; // square that holds logo, ripples and orbit
const ORBIT_RADIUS = 118;
const CHIP = 40;
const BAR_WIDTH = 168;

const makeValues = () => ({
  logoIn: new Animated.Value(0),
  float: new Animated.Value(0),
  spin: new Animated.Value(0),
  ripples: [0, 1, 2].map(() => new Animated.Value(0)),
  chips: ORBIT_ICONS.map(() => new Animated.Value(0)),
  letters: TITLE.map(() => new Animated.Value(0)),
  words: TAGLINE.map(() => new Animated.Value(0)),
  bar: new Animated.Value(0),
  shine: new Animated.Value(0),
  blobA: new Animated.Value(0),
  blobB: new Animated.Value(0),
});

export default function SplashScreen() {
  const { width, height } = useWindowDimensions();
  const ref = useRef(null);
  if (!ref.current) ref.current = makeValues();
  const v = ref.current;

  const styles = useThemeStyles((c, s, r) => ({
    container: { flex: 1, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    blob: { position: 'absolute', backgroundColor: c.brandGlow || '#FFFFFF' },
    content: { alignItems: 'center' },
    stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
    ripple: { position: 'absolute', width: 112, height: 112, borderRadius: r.full, borderWidth: 2, borderColor: c.onBrand },
    orbit: { position: 'absolute', width: STAGE, height: STAGE },
    chip: {
      position: 'absolute',
      width: CHIP,
      height: CHIP,
      borderRadius: r.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    logoContainer: {
      width: 104,
      height: 104,
      borderRadius: r.full,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    titleRow: { flexDirection: 'row', marginTop: s.md },
    letter: { fontSize: 44, fontWeight: '800', color: c.onBrand, letterSpacing: -0.5 },
    taglineRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: s.sm },
    tagline: { fontSize: 16, color: c.brandGlow || 'rgba(255,255,255,0.85)', fontWeight: '500', letterSpacing: 0.2 },
    barWrap: { position: 'absolute', bottom: 72, alignItems: 'center' },
    barTrack: { width: BAR_WIDTH, height: 5, borderRadius: r.full, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
    barFill: { width: BAR_WIDTH, height: 5, borderRadius: r.full, backgroundColor: c.onBrand, overflow: 'hidden' },
    shine: { position: 'absolute', top: 0, bottom: 0, width: 48, backgroundColor: 'rgba(255,255,255,0.7)' },
  }));

  useEffect(() => {
    let cancelled = false;
    const running = [];
    const run = (animation) => {
      running.push(animation);
      animation.start();
    };
    const drift = (value, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;

      if (reduce) {
        [v.logoIn, v.bar, ...v.chips, ...v.letters, ...v.words].forEach((value) => value.setValue(1));
        return;
      }

      // Ambient motion
      run(Animated.loop(Animated.timing(v.spin, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true })));
      run(drift(v.float, 1800));
      run(drift(v.blobA, 6500));
      run(drift(v.blobB, 8000));
      run(Animated.loop(Animated.timing(v.shine, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true })));

      // Intro choreography
      run(Animated.spring(v.logoIn, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }));

      run(
        Animated.sequence([
          Animated.delay(400),
          Animated.stagger(
            130,
            v.chips.map((chip) => Animated.spring(chip, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }))
          ),
        ])
      );

      v.ripples.forEach((ripple, i) => {
        run(
          Animated.sequence([
            Animated.delay(600 + i * 900),
            Animated.loop(Animated.timing(ripple, { toValue: 1, duration: 2700, easing: Easing.out(Easing.quad), useNativeDriver: true })),
          ])
        );
      });

      run(
        Animated.sequence([
          Animated.delay(600),
          Animated.stagger(
            75,
            v.letters.map((letter) => Animated.timing(letter, { toValue: 1, duration: 480, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }))
          ),
        ])
      );

      run(
        Animated.sequence([
          Animated.delay(1150),
          Animated.stagger(
            140,
            v.words.map((word) => Animated.timing(word, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
          ),
        ])
      );

      run(Animated.sequence([Animated.delay(800), Animated.timing(v.bar, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })]));
    });

    return () => {
      cancelled = true;
      running.forEach((animation) => animation.stop());
    };
  }, [v]);

  const spin = v.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counterSpin = v.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <View style={styles.container} accessible accessibilityLabel="Unihelp. Study smarter. Learn faster.">
      {/* Soft drifting light behind everything */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            width: width * 0.9,
            height: width * 0.9,
            borderRadius: width,
            top: -width * 0.35,
            left: -width * 0.3,
            opacity: 0.12,
            transform: [
              { translateX: v.blobA.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) },
              { translateY: v.blobA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) },
            ],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            width: width * 0.75,
            height: width * 0.75,
            borderRadius: width,
            bottom: -width * 0.25,
            right: -width * 0.25,
            opacity: 0.1,
            transform: [
              { translateX: v.blobB.interpolate({ inputRange: [0, 1], outputRange: [0, -36] }) },
              { translateY: v.blobB.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) },
            ],
          },
        ]}
      />

      <View style={[styles.content, { marginTop: -Math.min(40, height * 0.05) }]}>
        <View style={styles.stage}>
          {/* Ripples */}
          {v.ripples.map((ripple, i) => (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[
                styles.ripple,
                {
                  opacity: ripple.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.4, 0] }),
                  transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.9, 2.5] }) }],
                },
              ]}
            />
          ))}

          {/* Orbiting study icons (counter-rotated so they stay upright) */}
          <Animated.View style={[styles.orbit, { transform: [{ rotate: spin }] }]} pointerEvents="none">
            {ORBIT_ICONS.map((icon, i) => {
              const angle = (i / ORBIT_ICONS.length) * Math.PI * 2 - Math.PI / 2;
              const left = STAGE / 2 + Math.cos(angle) * ORBIT_RADIUS - CHIP / 2;
              const top = STAGE / 2 + Math.sin(angle) * ORBIT_RADIUS - CHIP / 2;
              return (
                <Animated.View
                  key={icon}
                  style={[
                    styles.chip,
                    {
                      left,
                      top,
                      opacity: v.chips[i],
                      transform: [{ rotate: counterSpin }, { scale: v.chips[i] }],
                    },
                  ]}
                >
                  <Ionicons name={icon} size={19} color="#FFFFFF" />
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: v.logoIn,
                transform: [
                  { translateY: v.float.interpolate({ inputRange: [0, 1], outputRange: [-5, 5] }) },
                  { scale: v.logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
                  { rotate: v.logoIn.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) },
                ],
              },
            ]}
          >
            <Image source={favicon} style={{ width: 76, height: 76 }} contentFit="contain" />
          </Animated.View>
        </View>

        {/* Title, letter by letter */}
        <View style={styles.titleRow}>
          {TITLE.map((char, i) => (
            <Animated.Text
              key={`${char}-${i}`}
              style={[
                styles.letter,
                {
                  opacity: v.letters[i],
                  transform: [{ translateY: v.letters[i].interpolate({ inputRange: [0, 1], outputRange: [38, 0] }) }],
                },
              ]}
            >
              {char}
            </Animated.Text>
          ))}
        </View>

        {/* Tagline, word by word */}
        <View style={styles.taglineRow}>
          {TAGLINE.map((word, i) => (
            <Animated.Text
              key={word}
              style={[
                styles.tagline,
                {
                  opacity: v.words[i],
                  transform: [{ translateY: v.words[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                },
              ]}
            >
              {word}
            </Animated.Text>
          ))}
        </View>
      </View>

      {/* Loading bar */}
      <Animated.View style={[styles.barWrap, { opacity: v.letters[0] }]}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { transform: [{ translateX: v.bar.interpolate({ inputRange: [0, 1], outputRange: [-BAR_WIDTH, 0] }) }] }]}>
            <Animated.View
              style={[styles.shine, { transform: [{ translateX: v.shine.interpolate({ inputRange: [0, 1], outputRange: [-60, BAR_WIDTH] }) }, { skewX: '-20deg' }] }]}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}