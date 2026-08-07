
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InfoPage from '../src/shared/screens/InfoPage';
import { submitSuggestion } from '../src/shared/services/support';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';

const CATEGORIES = [
  { label: 'New Feature', value: 'new_feature', icon: 'sparkles-outline' },
  { label: 'Bug Fix', value: 'bug_fix', icon: 'bug-outline' },
  { label: 'UI/UX', value: 'ui_ux', icon: 'color-palette-outline' },
  { label: 'Performance', value: 'performance', icon: 'speedometer-outline' },
  { label: 'Marketplace', value: 'marketplace', icon: 'pricetag-outline' },
  { label: 'AI Tutor', value: 'ai_tutor', icon: 'school-outline' },
  { label: 'Community', value: 'community', icon: 'people-outline' },
  { label: 'Other', value: 'other', icon: 'ellipsis-horizontal-outline' },
];

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

export default function SuggestionPage() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    content: { gap: 14, paddingBottom: 8 },
    form: { backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.borderDefault, padding: 16, gap: 14 },
    field: { gap: 6 },
    fieldLabel: { color: c.inkLight, fontSize: 12.5, fontWeight: '700' },
    input: { borderWidth: 1, borderColor: c.inputBorder, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.textPrimary, backgroundColor: c.canvasLight },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    counterRow: { position: 'relative' },
    counter: { position: 'absolute', right: 12, bottom: 8, fontSize: 11, color: c.greyLight, fontWeight: '600' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.inputBorder, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.canvasLight },
    chipActive: { backgroundColor: c.brandLight, borderColor: c.brandGlow },
    chipPressed: { backgroundColor: c.skeletonBackground },
    chipText: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: c.brandText },
    submitButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brand, marginTop: 4, flexDirection: 'row', gap: 8 },
    submitButtonDisabled: { backgroundColor: c.brandGlow, opacity: 0.7 },
    submitButtonPressed: { backgroundColor: c.brandDark },
    submitText: { color: c.onBrand, fontSize: 14, fontWeight: '800' },
    successBox: { backgroundColor: c.greenLight, borderColor: c.green, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    successText: { color: c.teal, fontSize: 13, fontWeight: '700', flex: 1 },
    errorBox: { backgroundColor: c.redLight, borderColor: c.redBorder, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorText: { color: c.rose, fontSize: 13, fontWeight: '700', flex: 1 },
    loginHint: { fontSize: 12, color: c.greyLight, textAlign: 'center', marginTop: -4 },
  }));

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isFormValid = title.trim() && category.trim();

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Please enter a suggestion title.'); setSuccess(''); return; }
    if (!category) { setError('Please select a category.'); setSuccess(''); return; }
    if (!user) { setError('You must be logged in to submit a suggestion.'); return; }
    if (loading) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await submitSuggestion({ title: title.trim(), category: category.trim(), description: description.trim() });
      setSuccess('Your suggestion has been submitted. Thank you for helping improve Unihelp!');
      setTitle(''); setCategory(''); setDescription('');
    } catch (submitError) {
      setError(submitError?.message || 'Could not submit suggestion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <InfoPage
      title="Suggest a Feature"
      subtitle="Share your ideas to improve Unihelp"
    >
      <View style={styles.content}>
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
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Suggestion Title *</Text>
            <View style={styles.counterRow}>
              <TextInput placeholderTextColor={colors.greyLight} style={styles.input} placeholder="e.g., Dark mode scheduling" value={title} onChangeText={setTitle} maxLength={MAX_TITLE_LENGTH} />
              <Text style={styles.counter}>{title.length}/{MAX_TITLE_LENGTH}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category *</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => {
                const active = category === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && !active && styles.chipPressed]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Ionicons name={cat.icon} size={14} color={active ? colors.brandText : colors.textSecondary} />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <View style={styles.counterRow}>
              <TextInput placeholderTextColor={colors.greyLight} style={[styles.input, styles.textArea]} placeholder="How would this feature help you?" value={description} onChangeText={setDescription} multiline maxLength={MAX_DESCRIPTION_LENGTH} textAlignVertical="top" />
              <Text style={styles.counter}>{description.length}/{MAX_DESCRIPTION_LENGTH}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.submitButton, (!isFormValid || loading || !user) && styles.submitButtonDisabled, pressed && isFormValid && !loading && user && styles.submitButtonPressed]}
            onPress={handleSubmit}
            disabled={!isFormValid || loading || !user}
          >
            {loading ? <ActivityIndicator color={colors.onBrand} /> : (
              <>
                <Ionicons name="bulb" size={16} color={colors.onBrand} />
                <Text style={styles.submitText}>Submit Suggestion</Text>
              </>
            )}
          </Pressable>
          {!user && <Text style={styles.loginHint}>You need to be logged in to submit a suggestion.</Text>}
        </View>
      </View>
    </InfoPage>
  );
}
