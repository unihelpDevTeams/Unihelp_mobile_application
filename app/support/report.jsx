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

import InfoPage from '../../src/shared/screens/InfoPage';
import InfoCard from '../../src/shared/components/InfoCard';
import { submitReport } from '../../src/shared/services/support';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { layout } from '../../src/shared/theme';

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
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [reportType, setReportType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isFormValid = reportType.trim() && description.trim();

  const styles = useThemeStyles((c, s, r) => {
    const cardWidth = (screenWidth - layout.screenPadding * 2 - s.sm) / 2;

    return {
      content: {
        gap: s.lg,
        paddingBottom: s.xl,
      },

      // Section Title
      sectionHeader: {
        fontSize: 12,
        fontWeight: '800',
        color: c.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: s.xs,
        marginLeft: s.xs,
      },

      // Grid Cards
      grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: s.sm,
      },
      categoryCard: {
        width: cardWidth,
        backgroundColor: c.surfaceSecondary,
        borderRadius: r.xl,
        borderWidth: 1,
        borderColor: c.borderDefault,
        padding: s.md,
        gap: s.xs,
      },
      categoryCardActive: {
        borderColor: '#EF4444',
        backgroundColor: c.brandLight,
      },
      iconWrap: {
        width: 36,
        height: 36,
        borderRadius: r.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        marginBottom: 2,
      },
      categoryTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: c.textPrimary,
      },
      categoryText: {
        fontSize: 12,
        color: c.textSecondary,
        lineHeight: 17,
      },

      // Form Box
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

      // Chips
      chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: s.xs,
      },
      chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: c.borderDefault,
        borderRadius: 999,
        paddingHorizontal: s.md,
        paddingVertical: s.sm,
        backgroundColor: c.surface,
      },
      chipActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
      },
      chipText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: c.textSecondary,
      },
      chipTextActive: {
        color: '#DC2626',
      },

      // Submit Button
      submitButton: {
        height: 48,
        borderRadius: r.xl,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DC2626',
        flexDirection: 'row',
        gap: s.xs,
        marginTop: s.xs,
      },
      submitButtonDisabled: {
        backgroundColor: c.borderDefault,
        opacity: 0.6,
      },
      submitButtonPressed: {
        backgroundColor: '#B91C1C',
      },
      submitText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
      },

      // Alert Boxes
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
      loginHint: {
        fontSize: 12,
        color: c.textTertiary,
        textAlign: 'center',
        marginTop: -4,
      },
    };
  });

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
      title="Report an Issue"
      subtitle="Report harmful, suspicious, or policy-violating content"
      sections={[
        {
          title: 'Moderation Policy',
          text: 'Reports are reviewed by our moderation team within 24 hours. Action is taken swiftly on confirmed violations.',
        },
      ]}
    >
      <View style={styles.content}>
        {/* REPORT CATEGORY OVERVIEW */}
        <Text style={styles.sectionHeader}>Select Violation Category</Text>
        <View style={styles.grid}>
          {REPORT_TYPES.map((rt) => {
            const isSelected = reportType === rt.value;
            return (
              <Pressable
                key={rt.value}
                style={({ pressed }) => [
                  styles.categoryCard,
                  isSelected && styles.categoryCardActive,
                  pressed && { opacity: 0.88 },
                ]}
                onPress={() => setReportType(rt.value)}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={rt.icon} size={18} color="#DC2626" />
                </View>
                <Text style={styles.categoryTitle}>{rt.label}</Text>
                <Text style={styles.categoryText} numberOfLines={2}>
                  Report content related to {rt.label.toLowerCase()}.
                </Text>
              </Pressable>
            );
          })}
        </View>

        <InfoCard
          icon={<Ionicons name="shield-outline" size={24} color="#DC2626" />}
          title="Safe & Anonymous"
          text="Your report is kept strictly confidential. The reported user will not be notified of who submitted the flag."
        />

        {/* FEEDBACK MESSAGES */}
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

        {/* SUBMISSION FORM */}
        <View style={styles.formContainer}>
          {/* CATEGORY CHIPS */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Selected Category *</Text>
            <View style={styles.chipRow}>
              {REPORT_TYPES.map((rt) => {
                const active = reportType === rt.value;
                return (
                  <Pressable
                    key={rt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setReportType(rt.value)}
                  >
                    <Ionicons
                      name={rt.icon}
                      size={14}
                      color={active ? '#DC2626' : colors.textTertiary}
                    />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {rt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* TITLE INPUT */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Title (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Inappropriate item listing title"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* DESCRIPTION INPUT */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description *</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide details about the issue to help our moderation team..."
                placeholderTextColor={colors.textTertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              <Text style={styles.counter}>
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </Text>
            </View>
          </View>

          {/* SUBMIT BUTTON */}
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
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="flag" size={16} color="#FFFFFF" />
                <Text style={styles.submitText}>Submit Report</Text>
              </>
            )}
          </Pressable>

          {!user && (
            <Text style={styles.loginHint}>
              You must be logged in to submit a report.
            </Text>
          )}
        </View>
      </View>
    </InfoPage>
  );
}