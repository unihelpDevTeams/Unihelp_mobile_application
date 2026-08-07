import React, { useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import logo from '../../assets/images/favicon.png';
import { useAuth } from '../../context/AuthContext';
import { darkGradients, gradients, shadows } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

export default function ResetPassword() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const styles = useThemeStyles((c, s, r) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { flexGrow: 1, paddingHorizontal: s.xl, paddingVertical: 28, justifyContent: 'center', gap: s.xl },
    badge: {
      alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: s.sm,
      backgroundColor: c.whiteTransparent, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: r.full, paddingVertical: s.sm, paddingHorizontal: s.md,
    },
    logo: { width: 28, height: 28 },
    badgeText: { color: c.ink, fontWeight: '800' },
    hero: { gap: s.sm, maxWidth: 390 },
    eyebrow: { color: c.brandText, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.1 },
    title: { color: c.ink, fontSize: 28, fontWeight: '900', lineHeight: 34 },
    subtitle: { color: c.textSecondary, fontSize: 14, lineHeight: 21 },
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
    input: { flex: 1, paddingVertical: s.md, fontSize: 15, color: c.ink },
    primaryButton: {
      minHeight: 52, backgroundColor: c.brand, borderRadius: r.lg,
      alignItems: 'center', justifyContent: 'center', marginTop: s.xs, flexDirection: 'row', gap: s.sm,
    },
    primaryButtonText: { color: c.onBrand, fontSize: 15, fontWeight: '800' },
    error: {
      color: c.rose, backgroundColor: c.redLight, borderColor: c.redBorder,
      borderWidth: 1, borderRadius: r.lg, padding: s.md, fontSize: 13, lineHeight: 19,
    },
    message: {
      color: c.green, backgroundColor: c.greenLight, borderColor: c.green,
      borderWidth: 1, borderRadius: r.lg, padding: s.md, fontSize: 13, lineHeight: 19,
    },
    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: s.md },
    link: { color: c.brandText, fontWeight: '800', fontSize: 13 },
    linkSecondary: { color: c.inkMuted, fontWeight: '700', fontSize: 13 },
  }));

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Enter your email address to reset your password.');
      setMessage('');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');
      await resetPassword(email.trim());
      setMessage('Password reset email sent. Check your inbox.');
    } catch (submitError) {
      setError(submitError?.message || 'Unable to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient colors={isDark ? darkGradients.auth : gradients.auth} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.badge}>
          <Image source={logo} style={styles.logo} contentFit="contain" />
          <Text style={styles.badgeText}>Unihelp</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Reset password</Text>
          <Text style={styles.title}>We will send a secure link to your email.</Text>
          <Text style={styles.subtitle}>
            After you reset, sign back in and your profile, uploads, and preferences will continue syncing with the website.
          </Text>
        </View>

        <View style={[styles.card, shadows.md]}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.icon} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Send reset email</Text>
                <Ionicons name="send-outline" size={17} color={colors.onBrand} />
              </>
            )}
          </Pressable>

          <View style={styles.linkRow}>
            <Pressable onPress={() => router.push('/login')}>
              <Text style={styles.link}>Back to sign in</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={styles.linkSecondary}>Create account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
