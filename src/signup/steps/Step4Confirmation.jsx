import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image as RNImage } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../shared/theme';

function SummaryRow({ label, value, onEdit }) {
  if (!value) return null;
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryRowContent}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}>
          <Ionicons name="pencil" size={14} color={colors.brandText} />
        </Pressable>
      )}
    </View>
  );
}

function SectionHeader({ title, step, onEdit }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={styles.sectionStepDot}>
          <Text style={styles.sectionStepDotText}>{step}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} style={({ pressed }) => [styles.sectionEditButton, pressed && styles.editButtonPressed]}>
          <Ionicons name="create-outline" size={16} color={colors.brandText} />
          <Text style={styles.sectionEditButtonText}>Edit</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Step4Confirmation({ formData, onEditStep }) {
  const fullName = `${formData.firstName} ${formData.lastName}`.trim();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="checkmark-circle" size={40} color={colors.green} />
        </View>
        <Text style={styles.headerTitle}>Almost there!</Text>
        <Text style={styles.headerSubtitle}>Review your information before creating your account.</Text>
      </View>

      {formData.photoURI && (
        <View style={styles.profilePhotoWrap}>
          <RNImage source={{ uri: formData.photoURI }} style={styles.profilePhoto} />
        </View>
      )}

      <View style={styles.card}>
        <SectionHeader title="Basic Information" step={1} onEdit={() => onEditStep(1)} />
        <SummaryRow label="Name" value={fullName} />
        <SummaryRow label="Username" value={formData.username} />
        <SummaryRow label="Email" value={formData.email} />
      </View>

      <View style={styles.card}>
        <SectionHeader title="Academic Information" step={2} onEdit={() => onEditStep(2)} />
        <SummaryRow label="University" value={formData.universityName} />
        <SummaryRow
          label="Student Type"
          value="University Student"
        />
        <SummaryRow label="Department" value={formData.departmentName} />
        <SummaryRow label="Faculty" value={formData.faculty} />
        <SummaryRow label="Level" value={formData.level ? `${formData.level} Level` : ''} />
      </View>

      <View style={styles.card}>
        <SectionHeader title="Profile" step={3} onEdit={() => onEditStep(3)} />
        <SummaryRow label="Bio" value={formData.bio} />
        {formData.interests?.length > 0 && (
          <View style={styles.interestsSection}>
            <Text style={styles.summaryLabel}>Interests</Text>
            <View style={styles.interestsRow}>
              {formData.interests.map((interest) => (
                <View key={interest} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.lg, paddingBottom: spacing['2xl'] },

  header: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  headerIconWrap: { marginBottom: spacing.xs },
  headerTitle: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  headerSubtitle: { color: colors.grey, fontSize: 14, lineHeight: 21, textAlign: 'center' },

  profilePhotoWrap: { alignItems: 'center' },
  profilePhoto: { width: 80, height: 80, borderRadius: 24 },

  card: {
    backgroundColor: colors.whiteTransparent,
    borderRadius: borderRadius['5xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionStepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  sectionStepDotText: { color: colors.surface, fontWeight: '800', fontSize: 12 },
  sectionTitle: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  sectionEditButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionEditButtonText: { color: colors.brandText, fontWeight: '600', fontSize: 12 },

  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  summaryRowContent: { flex: 1, gap: 2 },
  summaryLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: colors.ink, fontSize: 15, fontWeight: '600' },

  editButton: { padding: spacing.xs, marginTop: -2 },
  editButtonPressed: { opacity: 0.7 },

  interestsSection: { gap: spacing.xs },
  interestsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  interestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.brandLight,
    borderWidth: 1,
    borderColor: colors.brandBorder,
  },
  interestChipText: { fontSize: 12, fontWeight: '600', color: colors.brandText },
});
