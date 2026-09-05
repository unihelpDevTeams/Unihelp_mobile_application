import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase/config';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const email = user?.email || (Array.isArray(params.email) ? params.email[0] : params.email) || 'your email address';
  const styles = useThemeStyles((c, s, r) => ({
    screen: { flex: 1, backgroundColor: c.canvasLight, justifyContent: 'center', padding: s.xl },
    card: { backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s['2xl'], alignItems: 'center' },
    iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: s.lg },
    title: { color: c.ink, fontSize: 26, fontWeight: '900', textAlign: 'center' },
    body: { color: c.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: s.md },
    email: { color: c.brandText, fontWeight: '800' },
    primaryButton: { width: '100%', minHeight: 50, borderRadius: r.xl, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginTop: s.xl },
    primaryButtonText: { color: c.onBrand, fontSize: 14, fontWeight: '800' },
    secondaryButton: { width: '100%', minHeight: 48, borderRadius: r.xl, borderWidth: 1, borderColor: c.brandBorder, alignItems: 'center', justifyContent: 'center', marginTop: s.sm },
    secondaryButtonText: { color: c.brandText, fontSize: 14, fontWeight: '800' },
    signOutButton: { padding: s.md, marginTop: s.md },
    signOutText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
  }));

  const checkVerification = async () => {
    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }
    setChecking(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Not verified yet', 'Open the link in your email, then tap Check again.');
      }
    } catch (error) {
      Alert.alert('Could not check verification', error?.message || 'Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const resendVerification = async () => {
    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('Email sent', `A new verification link was sent to ${email}.`);
    } catch (error) {
      Alert.alert('Could not resend email', error?.message || 'Please wait a moment and try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-open-outline" size={34} color={colors.brand} />
        </View>
        <Text style={styles.title}>Verify your account</Text>
        <Text style={styles.body}>
          We sent a verification link to <Text style={styles.email}>{email}</Text>. Verify your email before entering UniHelp.
        </Text>
        <Pressable style={styles.primaryButton} onPress={checkVerification} disabled={checking}>
          {checking ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.primaryButtonText}>I verified my email</Text>}
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={resendVerification} disabled={resending}>
          {resending ? <ActivityIndicator color={colors.brand} /> : <Text style={styles.secondaryButtonText}>Resend verification email</Text>}
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={logout}>
          <Text style={styles.signOutText}>Use a different account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
