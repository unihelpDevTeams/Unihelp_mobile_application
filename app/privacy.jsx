import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../src/shared/components/ScreenShell';
import { useAuth } from '../context/AuthContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { updatePrivacySettings } from '../src/shared/services/friendships';

const FRIEND_OPTIONS = [
  { value: 'everyone', label: 'Everyone', icon: 'earth-outline' },
  { value: 'same_school', label: 'Same School', icon: 'school-outline' },
  { value: 'same_department', label: 'Same Department', icon: 'library-outline' },
  { value: 'nobody', label: 'Nobody', icon: 'lock-closed-outline' },
];

const MESSAGE_OPTIONS = [
  { value: 'everyone', label: 'Everyone', icon: 'earth-outline' },
  { value: 'same_school', label: 'Same School', icon: 'school-outline' },
  { value: 'friends_of_friends', label: 'Friends of Friends', icon: 'people-outline' },
  { value: 'nobody', label: 'Nobody', icon: 'lock-closed-outline' },
];

export default function PrivacySettingsPage() {
  const { profile, updateProfile } = useAuth();
  const { colors, spacing, borderRadius } = useTheme();
  const styles = useThemeStyles((colors, spacing, borderRadius) => ({
    hero: {
      flexDirection: 'row',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius['2xl'],
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroBody: {
      flex: 1,
    },
    heroTitle: {
      color: colors.ink,
      fontWeight: '900',
      fontSize: 16,
    },
    heroText: {
      marginTop: 5,
      color: colors.grey,
      fontSize: 13,
      lineHeight: 19,
    },
    group: {
      marginBottom: spacing.lg,
    },
    groupTitle: {
      color: colors.ink,
      fontWeight: '900',
      fontSize: 15,
    },
    groupSubtitle: {
      marginTop: 4,
      color: colors.grey,
      fontSize: 12.5,
      lineHeight: 18,
    },
    options: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    option: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
    optionSelected: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    optionText: {
      flex: 1,
      color: colors.ink,
      fontWeight: '800',
      fontSize: 13,
    },
    optionTextSelected: {
      color: colors.surface,
    },
    saveButton: {
      minHeight: 52,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    saveButtonDisabled: {
      backgroundColor: colors.brandGlow,
    },
    saveText: {
      color: colors.surface,
      fontWeight: '900',
      fontSize: 14,
    },
  }));

  function OptionGroup({ title, subtitle, value, options, onChange }) {
    return (
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{title}</Text>
        <Text style={styles.groupSubtitle}>{subtitle}</Text>
        <View style={styles.options}>
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => onChange(option.value)}
              >
                <Ionicons name={option.icon} size={17} color={selected ? colors.surface : colors.brand} />
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
                {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.onBrand} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  
  const uid = profile?.uid || profile?.id;
  const initial = useMemo(() => ({
    friendRequests: profile?.privacy?.friendRequests || 'everyone',
    messageRequests: profile?.privacy?.messageRequests || 'everyone',
  }), [profile?.privacy?.friendRequests, profile?.privacy?.messageRequests]);
  const [privacy, setPrivacy] = useState(initial);
  const [saving, setSaving] = useState(false);

  const changed = privacy.friendRequests !== initial.friendRequests || privacy.messageRequests !== initial.messageRequests;

  const save = async () => {
    if (!uid || !changed) return;
    setSaving(true);
    try {
      await updatePrivacySettings(uid, privacy);
      await updateProfile?.({ privacy });
      Alert.alert('Privacy saved', 'Your friend and message request settings were updated.');
    } catch (error) {
      Alert.alert('Could not save settings', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell title="Privacy" subtitle="Control who can reach you" showBack>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.brand} />
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.heroTitle}>Social trust controls</Text>
          <Text style={styles.heroText}>Blocked students cannot send requests, message you, or reopen a declined conversation path.</Text>
        </View>
      </View>

      <OptionGroup
        title="Friend Requests"
        subtitle="Choose who is allowed to send you friend requests."
        value={privacy.friendRequests}
        options={FRIEND_OPTIONS}
        onChange={(friendRequests) => setPrivacy((current) => ({ ...current, friendRequests }))}
      />

      <OptionGroup
        title="Message Requests"
        subtitle="Choose who can send a one-time introductory message before you become friends."
        value={privacy.messageRequests}
        options={MESSAGE_OPTIONS}
        onChange={(messageRequests) => setPrivacy((current) => ({ ...current, messageRequests }))}
      />

      <Pressable style={[styles.saveButton, (!changed || saving) && styles.saveButtonDisabled]} onPress={save} disabled={!changed || saving}>
        {saving ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name="save-outline" size={18} color={colors.onBrand} />}
        <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save privacy settings'}</Text>
      </Pressable>
    </ScreenShell>
  );
}
