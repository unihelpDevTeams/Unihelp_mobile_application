import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import InfoPage from '../../src/shared/screens/InfoPage';
import InfoCard from '../../src/shared/components/InfoCard';
import { submitContactMessage } from '../../src/shared/services/support';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { layout } from '../../src/shared/theme';

const CONTACT_CHANNELS = [
  {
    title: 'Report an Issue',
    text: 'Open moderation flow for harmful content or account problems.',
    icon: 'warning-outline',
    route: '/report',
    color: '#EF4444',
  },
  {
    title: 'Browse FAQ',
    text: 'Check common questions before reaching out directly.',
    icon: 'help-circle-outline',
    route: '/faq',
    color: '#3B82F6',
  },
  {
    title: 'Help Center',
    text: 'Visit our hub for privacy policies and full platform guides.',
    icon: 'layers-outline',
    route: '/help-center',
    color: '#10B981',
  },
];

const MAX_MESSAGE_LENGTH = 2000;
const MAX_SUBJECT_LENGTH = 200;

function FormField({ label, inputStyle, colors, styles, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textTertiary || '#94A3B8'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && styles.inputFocused,
          inputStyle,
        ]}
        {...props}
      />
    </View>
  );
}

export default function ContactPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isFormValid = name.trim() && email.trim() && subject.trim() && message.trim();

  const styles = useThemeStyles((c, s, r) => {
    const channelWidth = screenWidth > 500 
      ? (screenWidth - layout.screenPadding * 2 - s.sm * 2) / 3 
      : '100%';

    return {
      content: {
        gap: s.lg,
        paddingBottom: s['2xl'],
      },
      sectionHeader: {
        fontSize: 12,
        fontWeight: '800',
        color: c.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: s.xs,
        marginLeft: s.xs,
      },

      // Channels Grid
      grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: s.sm,
      },
      card: {
        width: channelWidth,
        backgroundColor: c.surfaceSecondary,
        borderRadius: r.xl,
        borderWidth: 1,
        borderColor: c.borderDefault,
        padding: s.md,
        gap: s.xs,
      },
      iconWrap: {
        width: 36,
        height: 36,
        borderRadius: r.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
      },
      cardTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: c.textPrimary,
      },
      cardText: {
        fontSize: 12,
        color: c.textSecondary,
        lineHeight: 17,
      },

      // Form Styles
      formContainer: {
        backgroundColor: c.surfaceSecondary,
        borderRadius: r['2xl'],
        borderWidth: 1,
        borderColor: c.borderDefault,
        padding: s.lg,
        gap: s.md,
      },
      field: {
        gap: s.xs,
      },
      fieldLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: c.textPrimary,
      },
      input: {
        borderWidth: 1,
        borderColor: c.borderDefault,
        borderRadius: r.lg,
        paddingHorizontal: s.md,
        paddingVertical: s.md,
        fontSize: 14,
        color: c.textPrimary,
        backgroundColor: c.surface,
      },
      inputFocused: {
        borderColor: c.brand,
        backgroundColor: c.surface,
      },
      textAreaContainer: {
        position: 'relative',
      },
      textArea: {
        minHeight: 120,
        textAlignVertical: 'top',
        paddingBottom: s['2xl'],
      },
      counter: {
        position: 'absolute',
        right: s.md,
        bottom: s.sm,
        fontSize: 11,
        fontWeight: '600',
        color: c.textTertiary,
      },

      // Action Button
      submitButton: {
        height: 48,
        borderRadius: r.xl,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.brand,
        flexDirection: 'row',
        gap: s.xs,
        marginTop: s.xs,
      },
      submitButtonDisabled: {
        backgroundColor: c.borderDefault,
        opacity: 0.6,
      },
      submitButtonPressed: {
        opacity: 0.9,
      },
      submitText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
      },

      // Status Banners
      alertBox: {
        borderRadius: r.lg,
        padding: s.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: s.sm,
        borderWidth: 1,
      },
      successBox: {
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
      },
      successText: {
        color: '#047857',
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
      },
      errorBox: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
      },
      errorText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
      },
    };
  });

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all required fields marked with *');
      setSuccess('');
      return;
    }
    if (loading) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess('Your message has been sent. We usually reply within 24 hours.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (submitError) {
      setError(submitError?.message || 'Unable to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <InfoPage
      title="Contact Support"
      subtitle="Have questions or feedback? We are here to help you."
      sections={[
        {
          title: 'Direct Response',
          text: 'Fill out this support form to send a ticket to our team. We review submissions daily.',
        },
      ]}
    >
      <View style={styles.content}>
        {/* QUICK NAVIGATION CHANNELS */}
        <Text style={styles.sectionHeader}>Alternative Support Options</Text>
        <View style={styles.grid}>
          {CONTACT_CHANNELS.map((channel) => (
            <Pressable
              key={channel.title}
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => router.push(channel.route)}
              accessibilityRole="button"
            >
              <View style={[styles.iconWrap, { backgroundColor: `${channel.color}15` }]}>
                <Ionicons name={channel.icon} size={18} color={channel.color} />
              </View>
              <Text style={styles.cardTitle}>{channel.title}</Text>
              <Text style={styles.cardText} numberOfLines={2}>
                {channel.text}
              </Text>
            </Pressable>
          ))}
        </View>

        <InfoCard
          icon={<Ionicons name="mail-unread-outline" size={24} color={colors.brand} />}
          title="Send Support Ticket"
          text="All fields marked with * are required. We will reach out to the provided email address."
        />

        {/* ALERTS */}
        {success ? (
          <View style={[styles.alertBox, styles.successBox]}>
            <Ionicons name="checkmark-circle" size={20} color="#047857" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.alertBox, styles.errorBox]}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* FORM */}
        <View style={styles.formContainer}>
          <FormField
            label="Full Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Alex Johnson"
            colors={colors}
            styles={styles}
          />

          <FormField
            label="Email Address *"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            colors={colors}
            styles={styles}
          />

          <FormField
            label="Phone Number (optional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="+234 801 234 5678"
            keyboardType="phone-pad"
            colors={colors}
            styles={styles}
          />

          {/* SUBJECT INPUT */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Subject *</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                placeholderTextColor={colors.textTertiary || '#94A3B8'}
                onFocus={() => setFocusedField('subject')}
                onBlur={() => setFocusedField(null)}
                style={[
                  styles.input,
                  focusedField === 'subject' && styles.inputFocused,
                ]}
                value={subject}
                onChangeText={setSubject}
                placeholder="How can we assist you?"
                maxLength={MAX_SUBJECT_LENGTH}
              />
              <Text style={styles.counter}>
                {subject.length}/{MAX_SUBJECT_LENGTH}
              </Text>
            </View>
          </View>

          {/* MESSAGE INPUT */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Message *</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                placeholderTextColor={colors.textTertiary || '#94A3B8'}
                onFocus={() => setFocusedField('message')}
                onBlur={() => setFocusedField(null)}
                style={[
                  styles.input,
                  styles.textArea,
                  focusedField === 'message' && styles.inputFocused,
                ]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue or query in detail..."
                multiline
                maxLength={MAX_MESSAGE_LENGTH}
              />
              <Text style={styles.counter}>
                {message.length}/{MAX_MESSAGE_LENGTH}
              </Text>
            </View>
          </View>

          {/* SUBMIT BUTTON */}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              (!isFormValid || loading) && styles.submitButtonDisabled,
              pressed && isFormValid && !loading && styles.submitButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                <Text style={styles.submitText}>Send Message</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </InfoPage>
  );
}