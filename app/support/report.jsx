import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InfoPage from '../../src/shared/screens/InfoPage';
import InfoCard from '../../src/shared/components/InfoCard';
import { submitReport } from '../../src/shared/services/support';
import { useAuth } from '../../context/AuthContext';

const REPORT_TYPES = [
  { label: 'Scam', value: 'scam', icon: 'warning-outline' },
  { label: 'Harassment', value: 'harassment', icon: 'shield-outline' },
  { label: 'Copyright', value: 'copyright', icon: 'document-text-outline' },
  { label: 'Spam', value: 'spam', icon: 'mail-outline' },
  { label: 'Inappropriate', value: 'inappropriate', icon: 'flag-outline' },
  { label: 'Other', value: 'other', icon: 'ellipsis-horizontal-outline' },
];

const MAX_DESCRIPTION_LENGTH = 3000;

export default function ReportPage() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isFormValid = reportType.trim() && description.trim();

  const handleSubmit = async () => {
    if (!reportType.trim() || !description.trim()) {
      setError('Please choose a category and add report details.');
      setSuccess('');
      return;
    }

    if (!user) {
      setError('You must be logged in to submit a report.');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await submitReport({
        reportType: reportType.trim(),
        title: title.trim(),
        description: description.trim(),
      });
      setSuccess('Report submitted successfully. Our moderation team will review it.');
      setReportType('');
      setTitle('');
      setDescription('');
    } catch (submitError) {
      setError(submitError?.message || 'Unable to submit your report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <InfoPage
      title="Report"
      subtitle="Report harmful, suspicious, or broken content"
      sections={[
        { title: 'Moderation', text: 'Reports are reviewed by our moderation team. We take all reports seriously.' },
        { title: 'What to include', text: 'Add a clear title and detailed description to help us investigate quickly.' },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.grid}>
          {REPORT_TYPES.map((reportType) => (
            <View key={reportType.value} style={styles.card}>
              <View style={styles.iconWrap}>
                <Ionicons name={reportType.icon} size={18} color="#B91C1C" />
              </View>
              <Text style={styles.title}>{reportType.label}</Text>
              <Text style={styles.text}>Use this category when the issue matches {reportType.label.toLowerCase()}.</Text>
            </View>
          ))}
        </View>

        <InfoCard title="Submit a report" text="All fields marked with * are required. You must be logged in to submit a report." />

        {success ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={20} color="#047857" />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Report Type *</Text>
            <View style={styles.chipRow}>
              {REPORT_TYPES.map((rt) => {
                const active = reportType === rt.value;
                return (
                  <Pressable
                    key={rt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setReportType(rt.value)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{rt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Field label="Title (optional)" value={title} onChangeText={setTitle} placeholder="Brief title for the report" />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description *</Text>
            <View style={styles.counterRow}>
              <TextInput
                placeholderTextColor="#94A3B8"
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Explain what happened in detail..."
                multiline
                maxLength={MAX_DESCRIPTION_LENGTH}
                textAlignVertical="top"
              />
              <Text style={styles.counter}>{description.length}/{MAX_DESCRIPTION_LENGTH}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              (!isFormValid || loading || !user) && styles.submitButtonDisabled,
              pressed && isFormValid && !loading && user && styles.submitButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || loading || !user}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="flag" size={16} color="#FFFFFF" />
                <Text style={styles.submitText}>Submit Report</Text>
              </>
            )}
          </Pressable>
          {!user && (
            <Text style={styles.loginHint}>You need to be logged in to submit a report.</Text>
          )}
        </View>
      </View>
    </InfoPage>
  );
}

function Field({ label, inputStyle, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#94A3B8" style={[styles.input, inputStyle]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  text: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 12.5,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  counterRow: {
    position: 'relative',
  },
  counter: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#B91C1C',
  },
  submitButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B91C1C',
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#FCA5A5',
    opacity: 0.7,
  },
  submitButtonPressed: {
    backgroundColor: '#991B1B',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  successBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  loginHint: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: -4,
  },
});