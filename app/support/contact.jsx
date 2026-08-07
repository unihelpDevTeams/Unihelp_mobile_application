
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import InfoPage from '../../src/shared/screens/InfoPage';
import InfoCard from '../../src/shared/components/InfoCard';
import { submitContactMessage } from '../../src/shared/services/support';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

const CONTACT_CHANNELS = [
  { title: 'Report an issue', text: 'Open the report flow for moderation, upload, or account problems.', icon: 'warning-outline', route: '/report' },
  { title: 'Browse FAQ', text: 'Check the most common answers before sending a message.', icon: 'help-circle-outline', route: '/faq' },
  { title: 'Help Center', text: 'Use the support hub for privacy, terms, and app guidance.', icon: 'layers-outline', route: '/help-center' },
];

const MAX_MESSAGE_LENGTH = 2000;
const MAX_SUBJECT_LENGTH = 200;

function Field({ label, inputStyle, colors, styles, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.greyLight} style={[styles.input, inputStyle]} {...props} />
    </View>
  );
}

export default function ContactPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    content: { gap: 14, paddingBottom: 8 },
    grid: { gap: 12 },
    card: {
      backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.borderDefault, padding: 16,
    },
    cardPressed: { opacity: 0.85 },
    iconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight, marginBottom: 10 },
    title: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
    text: { marginTop: 6, color: c.textSecondary, fontSize: 13, lineHeight: 19 },
    form: { backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.borderDefault, padding: 16, gap: 12 },
    field: { gap: 6 },
    fieldLabel: { color: c.inkLight, fontSize: 12.5, fontWeight: '700' },
    input: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.textPrimary, backgroundColor: c.canvasLight },
    textArea: { minHeight: 110, textAlignVertical: 'top' },
    counterRow: { position: 'relative' },
    counter: { position: 'absolute', right: 12, bottom: 8, fontSize: 11, color: c.greyLight, fontWeight: '600' },
    submitButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand, marginTop: 4, flexDirection: 'row', gap: 8 },
    submitButtonDisabled: { backgroundColor: c.brandGlow, opacity: 0.7 },
    submitButtonPressed: { backgroundColor: c.brandDark },
    submitText: { color: c.onBrand, fontSize: 14, fontWeight: '800' },
    successBox: { backgroundColor: c.greenLight, borderColor: c.green, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    successText: { color: c.teal, fontSize: 13, fontWeight: '700', flex: 1 },
    errorBox: { backgroundColor: c.redLight, borderColor: c.redBorder, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorText: { color: c.rose, fontSize: 13, fontWeight: '700', flex: 1 },
  }));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isFormValid = name.trim() && email.trim() && subject.trim() && message.trim();

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all required fields.');
      setSuccess('');
      return;
    }
    if (loading) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await submitContactMessage({
        name: name.trim(), email: email.trim(), phone: phone.trim(), subject: subject.trim(), message: message.trim(),
      });
      setSuccess('Message sent successfully. We will get back to you soon!');
      setName(''); setEmail(''); setPhone(''); setSubject(''); setMessage('');
    } catch (submitError) {
      setError(submitError?.message || 'Unable to send your message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <InfoPage
      title="Contact"
      subtitle="Get in touch with our support team"
      sections={[
        { title: 'Contact Support', text: 'Use this form to send us a message. We typically respond within 24 hours.' },
        { title: 'Quick Links', text: 'For urgent issues like account problems or moderation, use the options below.' },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.grid}>
          {CONTACT_CHANNELS.map((channel) => (
            <Pressable key={channel.title} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={() => router.push(channel.route)} accessibilityRole="button">
              <View style={styles.iconWrap}>
                <Ionicons name={channel.icon} size={18} color={colors.brandText} />
              </View>
              <Text style={styles.title}>{channel.title}</Text>
              <Text style={styles.text}>{channel.text}</Text>
            </Pressable>
          ))}
        </View>

        <InfoCard title="Send us a message" text="Fill out the form below and we will get back to you as soon as possible." />

        {success ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={20} color={colors.teal} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={colors.rose} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Field label="Full name *" value={name} onChangeText={setName} placeholder="John Doe" colors={colors} styles={styles} />
          <Field label="Email *" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" colors={colors} styles={styles} />
          <Field label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="+234 801 234 5678" keyboardType="phone-pad" colors={colors} styles={styles} />
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Subject *</Text>
            <View style={styles.counterRow}>
              <TextInput placeholderTextColor={colors.greyLight} style={styles.input} value={subject} onChangeText={setSubject} placeholder="How can we help?" maxLength={MAX_SUBJECT_LENGTH} />
              <Text style={styles.counter}>{subject.length}/{MAX_SUBJECT_LENGTH}</Text>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Message *</Text>
            <View style={styles.counterRow}>
              <TextInput placeholderTextColor={colors.greyLight} style={[styles.input, styles.textArea]} value={message} onChangeText={setMessage} placeholder="Tell us what happened..." multiline maxLength={MAX_MESSAGE_LENGTH} textAlignVertical="top" />
              <Text style={styles.counter}>{message.length}/{MAX_MESSAGE_LENGTH}</Text>
            </View>
          </View>

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
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <>
                <Ionicons name="send" size={16} color={colors.onBrand} />
                <Text style={styles.submitText}>Send Message</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </InfoPage>
  );
}
