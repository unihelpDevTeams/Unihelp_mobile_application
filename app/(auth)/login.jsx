import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gradients, darkGradients, shadows } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import logo from '../../assets/images/favicon.png';
import { useAuth } from '../../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_STORAGE_KEY = '@unihelp_saved_login';

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();
  const passwordRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const styles = useThemeStyles((c, s, r) => ({
    screen: { flex: 1, backgroundColor: c.canvasLight },
    keyboardView: { flex: 1 },
    content: { flexGrow: 1, paddingHorizontal: s.xl, paddingVertical: 28, justifyContent: 'center', gap: s.xl },
    badge: {
      alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: s.sm,
      backgroundColor: c.whiteTransparent, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: r.full, paddingVertical: s.sm, paddingHorizontal: s.md,
    },
    logo: { width: 28, height: 28 },
    badgeText: { color: c.ink, fontWeight: '800' },
    hero: { gap: s.sm, maxWidth: 380 },
    eyebrow: { color: c.brandText, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1 },
    title: { color: c.ink, fontSize: 28, fontWeight: '900', lineHeight: 34 },
    subtitle: { color: c.textSecondary, fontSize: 14, lineHeight: 21 },
    valueRow: { flexDirection: 'row', gap: s.sm },
    valuePill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: s.md, paddingVertical: s.sm,
      backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder, borderRadius: r.full,
    },
    valueText: { color: c.brandText, fontWeight: '800', fontSize: 11 },
    card: {
      backgroundColor: c.whiteTransparent, borderRadius: r.xl, borderWidth: 1,
      borderColor: c.borderDefault, padding: s.xl, gap: s.lg,
    },
    field: { gap: 6 },
    label: { color: c.inkLight, fontSize: 12.5, fontWeight: '700' },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, borderWidth: 1, borderColor: c.inputBorder,
      borderRadius: r.lg, paddingHorizontal: s.md, backgroundColor: c.inputBackground,
    },
    inputWrapFocused: {
      borderColor: c.brand,
    },
    inputWrapError: {
      borderColor: c.redBorder,
    },
    inputIcon: { width: 20, alignItems: 'center' },
    input: {
      flex: 1, paddingVertical: s.md, fontSize: 15, color: c.ink,
    },
    eyeButton: { padding: s.xs },
    primaryButton: {
      minHeight: 52, backgroundColor: c.brand, borderRadius: r.lg,
      alignItems: 'center', justifyContent: 'center', marginTop: s.xs, flexDirection: 'row', gap: s.sm,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: { color: c.onBrand, fontSize: 15, fontWeight: '800' },
    error: {
      color: c.rose, backgroundColor: c.redLight, borderColor: c.redBorder,
      borderWidth: 1, borderRadius: r.lg, padding: s.md, fontSize: 13, lineHeight: 19,
    },
    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: s.md },
    link: { color: c.brandText, fontWeight: '800', fontSize: 13 },
    linkSecondary: { color: c.inkMuted, fontWeight: '700', fontSize: 13 },
  }));

  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSavedCredentials = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(LOGIN_STORAGE_KEY);
        if (!isMounted || !storedValue) return;

        const parsedValue = JSON.parse(storedValue);
        if (parsedValue?.email) {
          setEmail(parsedValue.email);
        }
        if (parsedValue?.password) {
          setPassword(parsedValue.password);
        }
      } catch (storageError) {
        console.warn('Unable to restore saved login details', storageError);
      }
    };

    loadSavedCredentials();

    return () => {
      isMounted = false;
    };
  }, []);

  const validate = () => {
    if (!email.trim()) return 'Enter your email address to continue.';
    if (!EMAIL_REGEX.test(email.trim())) return 'That email address doesn\'t look right.';
    if (!password) return 'Enter your password to continue.';
    return '';
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setError('');
      await signIn(email.trim(), password);
      await AsyncStorage.setItem(
        LOGIN_STORAGE_KEY,
        JSON.stringify({ email: email.trim(), password })
      );
      router.replace('/(tabs)');
    } catch (submitError) {
      setError(
        submitError?.code === 'auth/invalid-credential' || submitError?.code === 'auth/wrong-password'
          ? 'Incorrect email or password. If you signed up with Google, please use "Forgot password" to set a password.'
          : submitError?.code === 'auth/user-not-found'
          ? 'No account found with that email address.'
          : submitError?.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please wait a moment and try again.'
          : submitError?.message || 'Something went wrong while signing in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={isDark ? darkGradients.auth : gradients.auth} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badge}>
            <Image source={logo} style={styles.logo} contentFit="contain" />
            <Text style={styles.badgeText}>Unihelp</Text>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Welcome back</Text>
            <Text style={styles.title}>Sign in to pick up right where you left off.</Text>
            <Text style={styles.subtitle}>
              Your courses, groups, notes, and study progress stay synced across mobile and web.
            </Text>
          </View>

          <View style={[styles.card, shadows.md]}>
            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="mail-outline" size={18} color={colors.icon} />
                </View>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={colors.inputPlaceholder}
                  style={styles.input}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                  accessibilityLabel="Email address"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, focusedField === 'password' && styles.inputWrapFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.icon} />
                </View>
                <TextInput
                  ref={passwordRef}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  placeholder="Enter your password"
                  placeholderTextColor={colors.inputPlaceholder}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  editable={!loading}
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword((value) => !value)}
                  style={styles.eyeButton}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.inkMuted} />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Sign in</Text>
                  <Ionicons name="arrow-forward" size={17} color={colors.onBrand} />
                </>
              )}
            </Pressable>

            <View style={styles.linkRow}>
              <Pressable onPress={() => router.navigate('/reset-password')} disabled={loading} hitSlop={8}>
                <Text style={styles.linkSecondary}>Forgot password?</Text>
              </Pressable>
              <Pressable onPress={() => router.navigate('/register')} disabled={loading} hitSlop={8}>
                <Text style={styles.link}>Create account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
