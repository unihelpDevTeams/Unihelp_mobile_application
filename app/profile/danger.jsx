import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { useAuth } from '../../context/AuthContext';
import {
  deleteCurrentUserAccount,
  deleteCurrentUserActivities,
  requiresPasswordForAccountDeletion,
} from '../../src/shared/services/account';

const CONFIRM_TEXT = 'DELETE';

export default function ProfileDangerScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [busyAction, setBusyAction] = useState(null);
  const [message, setMessage] = useState(null);
  const needsPassword = useMemo(() => requiresPasswordForAccountDeletion(user), [user]);
  const canDeleteAccount = confirmText.trim().toUpperCase() === CONFIRM_TEXT && (!needsPassword || password.trim().length > 0);

  const styles = useThemeStyles((c, s, r) => ({
    content: { gap: s.lg, paddingBottom: s['4xl'] },
    warningCard: {
      backgroundColor: c.dangerLight,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      borderRadius: r.xl,
      padding: s.lg,
      gap: s.sm,
    },
    warningIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: c.modalBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '900', color: c.danger },
    body: { fontSize: 13, lineHeight: 20, color: c.textSecondary },
    section: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.xl,
      padding: s.lg,
      gap: s.md,
    },
    sectionTitle: { fontSize: 15, fontWeight: '900', color: c.textPrimary },
    input: {
      height: 46,
      borderRadius: r.lg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBackground,
      color: c.textPrimary,
      paddingHorizontal: s.md,
      fontSize: 14,
      fontWeight: '700',
    },
    button: {
      minHeight: 48,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: s.sm,
      paddingHorizontal: s.lg,
    },
    dangerButton: { backgroundColor: c.danger },
    dangerButtonDisabled: { backgroundColor: c.disabledBackground },
    secondaryButton: {
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    buttonText: { color: c.onBrand, fontSize: 14, fontWeight: '900' },
    secondaryButtonText: { color: c.textPrimary, fontSize: 14, fontWeight: '900' },
    disabledText: { color: c.disabledText },
    message: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      borderRadius: r.lg,
      padding: s.md,
      backgroundColor: c.brandLight,
      borderWidth: 1,
      borderColor: c.brandBorder,
    },
    messageError: { backgroundColor: c.dangerLight, borderColor: c.dangerBorder },
    messageText: { flex: 1, color: c.textSecondary, fontSize: 12.5, lineHeight: 18, fontWeight: '700' },
    facts: { gap: s.sm },
    factRow: { flexDirection: 'row', gap: s.sm, alignItems: 'flex-start' },
    factText: { flex: 1, color: c.textSecondary, fontSize: 12.5, lineHeight: 18 },
  }));

  const showError = (error) => {
    const code = error?.code || '';
    const text = code === 'auth/requires-recent-login'
      ? 'For your safety, unihelp needs a fresh sign-in before deleting this account. Sign out, sign in again, then return here.'
      : error?.message || 'Unable to complete this action. Please try again.';
    setMessage({ type: 'error', text });
  };

  const handleDeleteActivities = () => {
    Alert.alert(
      'Delete activity history?',
      'This clears your profile activity feed. Your account will remain active.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete activity',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyAction('activities');
              setMessage(null);
              const result = await deleteCurrentUserActivities();
              setMessage({
                type: 'success',
                text: `${result.deletedActivities} activity item${result.deletedActivities === 1 ? '' : 's'} and ${result.deletedCloudinaryAssets || 0} Uploaded asset${result.deletedCloudinaryAssets === 1 ? '' : 's'} deleted.`,
              });
            } catch (error) {
              showError(error);
            } finally {
              setBusyAction(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This will remove your activity history, uploaded media, UniHelp profile, and sign-in account. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyAction('account');
              setMessage(null);
              await deleteCurrentUserAccount({ password });
              router.replace('/(auth)/login');
            } catch (error) {
              showError(error);
            } finally {
              setBusyAction(null);
            }
          },
        },
      ]
    );
  };

  const handleFreshSignIn = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScreenShell title="Danger Zone" subtitle="Account deletion" showBack>
      <View style={styles.content}>
        <View style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning-outline" size={22} color={colors.danger} />
          </View>
          <Text style={styles.title}>Permanent account actions</Text>
          <Text style={styles.body}>
            Use this area only when you are sure. Account deletion clears your profile activity and removes access to this UniHelp account.
          </Text>
        </View>

        {message ? (
          <View style={[styles.message, message.type === 'error' && styles.messageError]} accessibilityRole="alert">
            <Ionicons name={message.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={18} color={message.type === 'error' ? colors.danger : colors.brand} />
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity history</Text>
          <Text style={styles.body}>Delete only the activity items stored under your profile. Your login and profile stay active.</Text>
          <Pressable
            onPress={handleDeleteActivities}
            disabled={busyAction !== null}
            style={({ pressed }) => [styles.secondaryButton, styles.button, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="Delete activity history"
            accessibilityState={{ disabled: busyAction !== null, busy: busyAction === 'activities' }}
          >
            {busyAction === 'activities' ? <ActivityIndicator size="small" color={colors.danger} /> : <Ionicons name="trash-outline" size={16} color={colors.danger} />}
            <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>Delete Activity</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delete account</Text>
          <View style={styles.facts}>
            <Fact text="Your profile activity feed will be deleted." colors={colors} styles={styles} />
            <Fact text="files connected to your activity, profile, and uploaded content will be deleted." colors={colors} styles={styles} />
            <Fact text="Your UniHelp profile and user-owned upload records will be removed." colors={colors} styles={styles} />
            <Fact text="Your Unihelp sign-in account will be deleted after confirmation." colors={colors} styles={styles} />
          </View>

          {needsPassword ? (
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.inputPlaceholder}
              secureTextEntry
              style={styles.input}
              accessibilityLabel="Password"
            />
          ) : null}

          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={`Type ${CONFIRM_TEXT} to confirm`}
            placeholderTextColor={colors.inputPlaceholder}
            autoCapitalize="characters"
            style={styles.input}
            accessibilityLabel="Delete account confirmation"
          />

          <Pressable
            onPress={handleDeleteAccount}
            disabled={!canDeleteAccount || busyAction !== null}
            style={({ pressed }) => [
              styles.button,
              styles.dangerButton,
              (!canDeleteAccount || busyAction !== null) && styles.dangerButtonDisabled,
              pressed && canDeleteAccount && busyAction === null && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Delete account permanently"
            accessibilityState={{ disabled: !canDeleteAccount || busyAction !== null, busy: busyAction === 'account' }}
          >
            {busyAction === 'account' ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="person-remove-outline" size={17} color={canDeleteAccount ? colors.onBrand : colors.disabledText} />}
            <Text style={[styles.buttonText, (!canDeleteAccount || busyAction !== null) && styles.disabledText]}>Delete Account</Text>
          </Pressable>

          <Pressable
            onPress={handleFreshSignIn}
            disabled={busyAction !== null}
            style={({ pressed }) => [styles.secondaryButton, styles.button, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="Sign in again before deleting account"
          >
            <Ionicons name="log-in-outline" size={16} color={colors.textPrimary} />
            <Text style={styles.secondaryButtonText}>Sign In Again</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

function Fact({ text, colors, styles }) {
  return (
    <View style={styles.factRow}>
      <Ionicons name="remove-circle-outline" size={16} color={colors.danger} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}
