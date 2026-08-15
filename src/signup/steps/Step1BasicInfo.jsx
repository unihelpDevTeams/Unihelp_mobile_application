import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../shared/theme';
import { useUsernameCheck } from '../hooks/useUsernameCheck';

const LABELS = {
  firstName: 'First Name',
  lastName: 'Last Name',
  username: 'Username',
  email: 'Email Address',
  password: 'Password',
  confirmPassword: 'Confirm Password',
};

export default function Step1BasicInfo({ formData, errors, updateField }) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    onChangeUsername,
    status: usernameStatus,
    errorMessage: usernameError,
  } = useUsernameCheck();

  const handleFieldChange = (field, value) => {
    if (field === 'username') {
      onChangeUsername(value);
    }
    updateField(field, value);
  };

  const renderUsernameStatusIcon = () => {
    const usernameTooShort = !formData.username || formData.username.length < 3;
    if (usernameTooShort) return null;

    switch (usernameStatus) {
      case 'checking':
        return <ActivityIndicator size="small" color={colors.grey} />;
      case 'available':
        return <Ionicons name="checkmark-circle" size={20} color={colors.green} />;
      case 'taken':
        return <Ionicons name="close-circle" size={20} color={colors.rose} />;
      default:
        return null;
    }
  };

  // Generic text input for simple fields (no icon / secure entry)
  const renderInput = (field, extraStyle) => (
    <TextInput
      style={[styles.input, extraStyle, errors[field] && styles.inputError]}
      placeholderTextColor={colors.greyLight}
      value={formData[field]}
      placeholder={`${LABELS[field].toLowerCase()}`}
      onChangeText={(value) => handleFieldChange(field, value)}
      autoCapitalize="none"
      autoCorrect={false}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Basic Information</Text>
        <Text style={styles.subtitle}>
          Let&apos;s get started with your account details.
        </Text>
      </View>

      <View style={styles.card}>
        {/* First / Last name */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>{LABELS.firstName}</Text>
            {renderInput('firstName')}
            {errors.firstName && (
              <Text style={styles.errorText}>{errors.firstName}</Text>
            )}
          </View>

          <View style={styles.halfField}>
            <Text style={styles.label}>{LABELS.lastName}</Text>
            {renderInput('lastName')}
            {errors.lastName && (
              <Text style={styles.errorText}>{errors.lastName}</Text>
            )}
          </View>
        </View>

        {/* Username */}
        <View style={styles.field}>
          <Text style={styles.label}>{LABELS.username}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                styles.inputWithRightIcon,
                errors.username && styles.inputError,
              ]}
              placeholder="your_username"
              placeholderTextColor={colors.greyLight}
              value={formData.username}
              onChangeText={(value) => handleFieldChange('username', value)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.inputIcon}>{renderUsernameStatusIcon()}</View>
          </View>

          {errors.username && (
            <Text style={styles.errorText}>{errors.username}</Text>
          )}
          {usernameStatus === 'available' && (
            <Text style={[styles.helperText, { color: colors.green }]}>
              Username is available!
            </Text>
          )}
          {usernameStatus === 'taken' && usernameError && (
            <Text style={[styles.helperText, { color: colors.rose }]}>
              {usernameError}
            </Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>{LABELS.email}</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="you@example.com"
            placeholderTextColor={colors.greyLight}
            value={formData.email}
            onChangeText={(value) => handleFieldChange('email', value)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>{LABELS.password}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                styles.inputWithEyeIcon,
                errors.password && styles.inputError,
              ]}
              placeholder="Create a strong password"
              placeholderTextColor={colors.greyLight}
              value={formData.password}
              onChangeText={(value) => handleFieldChange('password', value)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.grey}
              />
            </Pressable>
          </View>

          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
          {formData.password && formData.password.length < 8 && (
            <Text style={styles.helperText}>
              At least 8 characters with uppercase, lowercase & a number
            </Text>
          )}
        </View>

        {/* Confirm password */}
        <View style={styles.field}>
          <Text style={styles.label}>{LABELS.confirmPassword}</Text>
          <TextInput
            style={[styles.input, errors.confirmPassword && styles.inputError]}
            placeholder="Repeat your password"
            placeholderTextColor={colors.greyLight}
            value={formData.confirmPassword}
            onChangeText={(value) => handleFieldChange('confirmPassword', value)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing['2xl'],
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.grey,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.whiteTransparent,
    borderRadius: borderRadius['5xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
    gap: 6,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.inkLight,
    fontSize: 12.5,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.greyLight,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.rose,
    borderWidth: 1.5,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputWithRightIcon: {
    paddingRight: 44,
  },
  inputIcon: {
    position: 'absolute',
    right: spacing.md,
    top: 12,
  },
  inputWithEyeIcon: {
    paddingRight: 46,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: 12,
  },
  errorText: {
    color: colors.rose,
    fontSize: 12,
    fontWeight: '500',
  },
  helperText: {
    color: colors.grey,
    fontSize: 11,
    lineHeight: 16,
  },
});