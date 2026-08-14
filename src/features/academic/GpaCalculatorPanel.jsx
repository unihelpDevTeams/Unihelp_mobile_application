import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';

import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import EmptyState from '../../shared/components/EmptyState';
import { useTheme } from '../../shared/theme/ThemeContext';
import { useThemeStyles } from '../../shared/theme/createStyles';

const GRADE_OPTIONS = [
  { label: 'A', points: 5 },
  { label: 'B', points: 4 },
  { label: 'C', points: 3 },
  { label: 'D', points: 2 },
  { label: 'E', points: 1 },
  { label: 'F', points: 0 },
];

const PRESET_UNITS = [1, 2, 3, 4, 5, 6];
const defaultCourse = { code: '', units: '', gradePoint: '' };

function classifyGpa(value, colors) {
  const gpa = Number(value) || 0;
  if (gpa >= 4.5) return { label: 'First Class', color: colors.orange, bg: colors.warningLight || `${colors.orange}1A` };
  if (gpa >= 3.5) return { label: 'Second Class (Upper)', color: colors.green, bg: colors.successLight || `${colors.green}1A` };
  if (gpa >= 2.4) return { label: 'Second Class (Lower)', color: colors.brand, bg: colors.brandLight || `${colors.brand}1A` };
  if (gpa >= 1.5) return { label: 'Third Class', color: colors.orange, bg: colors.warningLight || `${colors.orange}1A` };
  if (gpa >= 1.0) return { label: 'Pass', color: colors.textSecondary, bg: colors.surfaceSecondary };
  return { label: 'Below Pass Mark', color: colors.red, bg: colors.dangerLight || `${colors.red}1A` };
}

/* -------------------------------------------------------------------------- */
/*                               GPA HERO GAUGE                               */
/* -------------------------------------------------------------------------- */
function GpaGauge({ gpa, totalUnits, totalPoints, colors, styles }) {
  const numericGpa = Number(gpa) || 0;
  const pct = Math.max(0, Math.min(1, numericGpa / 5));
  const tier = classifyGpa(gpa, colors);

  return (
    <View style={styles.gaugeCard}>
      {/* Top Header */}
      <View style={styles.gaugeHeader}>
        <View style={styles.gaugeEyebrowRow}>
          <View style={styles.heroIconBadge}>
            <Ionicons name="school" size={13} color="#FFFFFF" />
          </View>
          <Text style={styles.gaugeEyebrow}>ESTIMATED GPA</Text>
        </View>
        <View style={[styles.tierBadge, { backgroundColor: tier.bg }]}>
          <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
          <Text style={[styles.tierBadgeText, { color: tier.color }]}>{tier.label}</Text>
        </View>
      </View>

      {/* Main Score & Stats */}
      <View style={styles.gaugeBody}>
        <View style={styles.scoreContainer}>
          <Text style={styles.gaugeValue}>{gpa}</Text>
          <Text style={styles.gaugeMaxText}>/ 5.00</Text>
        </View>
        <View style={styles.gaugeMetaContainer}>
          <View style={styles.gaugeMetaBadge}>
            <Text style={styles.gaugeMetaLabel}>TOTAL UNITS</Text>
            <Text style={styles.gaugeMetaValue}>{totalUnits}</Text>
          </View>
          <View style={styles.gaugeMetaBadge}>
            <Text style={styles.gaugeMetaLabel}>TOTAL POINTS</Text>
            <Text style={styles.gaugeMetaValue}>{totalPoints}</Text>
          </View>
        </View>
      </View>

      {/* Track & Scale */}
      <View style={styles.trackContainer}>
        <View style={styles.trackBackground}>
          <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: tier.color }]} />
          {[1, 1.5, 2.4, 3.5, 4.5].map((mark) => (
            <View key={mark} style={[styles.trackTick, { left: `${(mark / 5) * 100}%` }]} />
          ))}
        </View>
        <View style={styles.trackLabels}>
          <Text style={styles.trackLabelText}>0.0</Text>
          <Text style={styles.trackLabelText}>2.5</Text>
          <Text style={styles.trackLabelText}>5.0</Text>
        </View>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                            SINGLE COURSE ITEM                              */
/* -------------------------------------------------------------------------- */
const CourseCard = React.memo(function CourseCard({ course, index, totalCourses, onUpdate, onRemove, colors, styles }) {
  const isCustomUnit = course.units !== '' && !PRESET_UNITS.map(String).includes(course.units);

  return (
    <View style={styles.courseCard}>
      {/* Top Bar */}
      <View style={styles.courseCardHeader}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexBadgeText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
        <View style={styles.codeInputWrapper}>
          <Ionicons name="book-outline" size={15} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.codeInput}
            placeholder="Course Code (e.g. CHE 301)"
            placeholderTextColor={colors.textSecondary}
            value={course.code}
            onChangeText={(val) => onUpdate(index, { code: val })}
            autoCapitalize="characters"
          />
        </View>
        {totalCourses > 1 && (
          <Pressable
            hitSlop={10}
            onPress={() => onRemove(index)}
            style={({ pressed }) => [styles.removeButton, pressed && styles.pressedState]}
          >
            <Ionicons name="trash-outline" size={15} color={colors.red} />
          </Pressable>
        )}
      </View>

      {/* Options Row Container */}
      <View style={styles.courseCardBody}>
        {/* Units Selection */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>CREDIT UNITS</Text>
            {course.units ? <Text style={styles.fieldValueIndicator}>{course.units} Units</Text> : null}
          </View>
          <View style={styles.unitsRow}>
            {PRESET_UNITS.map((u) => {
              const isActive = String(u) === course.units;
              return (
                <Pressable
                  key={u}
                  onPress={() => onUpdate(index, { units: String(u) })}
                  style={({ pressed }) => [
                    styles.unitChip,
                    isActive && styles.unitChipActive,
                    pressed && styles.pressedState,
                  ]}
                >
                  <Text style={[styles.unitChipText, isActive && styles.unitChipTextActive]}>{u}</Text>
                </Pressable>
              );
            })}
            <TextInput
              style={[styles.unitsCustomInput, isCustomUnit && styles.unitsCustomInputActive]}
              placeholder="Custom"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              maxLength={2}
              value={isCustomUnit ? course.units : ''}
              onChangeText={(val) => onUpdate(index, { units: val })}
            />
          </View>
        </View>

        {/* Grade Selection */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>GRADE OBTAINED</Text>
            {course.gradePoint !== '' ? (
              <Text style={styles.fieldValueIndicator}>
                {GRADE_OPTIONS.find((g) => String(g.points) === course.gradePoint)?.label || ''} ({course.gradePoint} pts)
              </Text>
            ) : null}
          </View>
          <View style={styles.gradeRow}>
            {GRADE_OPTIONS.map((g) => {
              const isActive = String(g.points) === course.gradePoint;
              return (
                <Pressable
                  key={g.label}
                  onPress={() => onUpdate(index, { gradePoint: String(g.points) })}
                  style={({ pressed }) => [
                    styles.gradeChip,
                    isActive && styles.gradeChipActive,
                    pressed && styles.pressedState,
                  ]}
                >
                  <Text style={[styles.gradeChipText, isActive && styles.gradeChipTextActive]}>
                    {g.label}
                  </Text>
                  <Text style={[styles.gradeChipSub, isActive && styles.gradeChipSubActive]}>
                    {g.points}p
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/*                            MAIN PANEL COMPONENT                            */
/* -------------------------------------------------------------------------- */
export default function GpaCalculatorPanel() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const [courses, setCourses] = useState([{ ...defaultCourse }]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const styles = useThemeStyles((c, s, r) => ({
    container: {
      flex: 1,
    },
    pressedState: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },
    panelLoading: {
      minHeight: 240,
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.sm,
    },
    panelLoadingText: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    /* Hero Gauge Styles */
    gaugeCard: {
      backgroundColor: c.brand,
      borderRadius: r['2xl'],
      padding: s.lg,
      marginBottom: s.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    gaugeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: s.md,
    },
    gaugeEyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroIconBadge: {
      width: 22,
      height: 22,
      borderRadius: r.sm,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gaugeEyebrow: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.1,
    },
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: s.md,
      paddingVertical: 5,
      borderRadius: r.full,
    },
    tierDot: {
      width: 6,
      height: 6,
      borderRadius: r.full,
    },
    tierBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    gaugeBody: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: s.lg,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
    },
    gaugeValue: {
      color: c.onBrand,
      fontSize: 44,
      fontWeight: '900',
      letterSpacing: -1,
      lineHeight: 48,
    },
    gaugeMaxText: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 14,
      fontWeight: '700',
    },
    gaugeMetaContainer: {
      flexDirection: 'row',
      gap: s.xs,
    },
    gaugeMetaBadge: {
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: r.lg,
      paddingHorizontal: s.md,
      paddingVertical: 6,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    gaugeMetaLabel: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
      marginBottom: 1,
    },
    gaugeMetaValue: {
      color: c.onBrand,
      fontSize: 15,
      fontWeight: '800',
    },
    trackContainer: {
      marginTop: s.xs,
    },
    trackBackground: {
      height: 7,
      borderRadius: r.full,
      backgroundColor: 'rgba(255,255,255,0.2)',
      position: 'relative',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    trackFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: r.full,
    },
    trackTick: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: 'rgba(255,255,255,0.35)',
    },
    trackLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    trackLabelText: {
      color: 'rgba(255,255,255,0.55)',
      fontSize: 10,
      fontWeight: '700',
    },
    /* Section Headers */
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: s.sm,
      marginTop: s.xs,
    },
    sectionTitle: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    sectionBadge: {
      backgroundColor: c.surfaceSecondary,
      paddingHorizontal: s.sm,
      paddingVertical: 3,
      borderRadius: r.full,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    sectionCount: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    /* Course Cards */
    courseCard: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md,
      marginBottom: s.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    courseCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs + 2,
      paddingBottom: s.xs + 2,
    },
    indexBadge: {
      width: 28,
      height: 28,
      borderRadius: r.md,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    indexBadgeText: {
      color: c.brand,
      fontWeight: '800',
      fontSize: 11,
    },
    codeInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.lg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingHorizontal: s.sm,
      height: 38,
    },
    inputIcon: {
      marginRight: 6,
    },
    codeInput: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
      paddingVertical: 0,
    },
    removeButton: {
      width: 32,
      height: 32,
      borderRadius: r.lg,
      backgroundColor: c.dangerLight || `${c.red}12`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    courseCardBody: {
      gap: s.xs + 2,
      marginTop: s.xs,
    },
    fieldGroup: {
      marginTop: 2,
    },
    fieldLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 5,
    },
    fieldLabel: {
      color: c.textSecondary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    fieldValueIndicator: {
      color: c.brand,
      fontSize: 10,
      fontWeight: '700',
    },
    unitsRow: {
      flexDirection: 'row',
      gap: 5,
    },
    unitChip: {
      flex: 1,
      height: 34,
      borderRadius: r.lg,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitChipActive: {
      backgroundColor: c.brand,
      borderColor: c.brand,
    },
    unitChipText: {
      color: c.textPrimary,
      fontWeight: '700',
      fontSize: 12,
    },
    unitChipTextActive: {
      color: c.onBrand,
      fontWeight: '800',
    },
    unitsCustomInput: {
      width: 58,
      height: 34,
      borderRadius: r.lg,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingHorizontal: 2,
      textAlign: 'center',
      color: c.textPrimary,
      fontWeight: '700',
      fontSize: 11,
    },
    unitsCustomInputActive: {
      borderColor: c.brand,
      backgroundColor: c.brandLight,
    },
    gradeRow: {
      flexDirection: 'row',
      gap: 5,
    },
    gradeChip: {
      flex: 1,
      height: 38,
      borderRadius: r.lg,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gradeChipActive: {
      backgroundColor: c.ink,
      borderColor: c.ink,
    },
    gradeChipText: {
      color: c.textPrimary,
      fontWeight: '800',
      fontSize: 13,
      lineHeight: 15,
    },
    gradeChipTextActive: {
      color: c.onBrand,
    },
    gradeChipSub: {
      fontSize: 9,
      fontWeight: '700',
      color: c.textSecondary,
      marginTop: -1,
    },
    gradeChipSubActive: {
      color: 'rgba(255,255,255,0.75)',
    },
    /* Actions */
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: c.brand,
      borderStyle: 'dashed',
      borderRadius: r.xl,
      paddingVertical: s.sm + 2,
      marginBottom: s.sm,
      backgroundColor: c.brandLight,
    },
    addButtonText: {
      color: c.brand,
      fontWeight: '800',
      fontSize: 13,
    },
    saveButton: {
      backgroundColor: c.ink,
      borderRadius: r.xl,
      paddingVertical: s.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: s.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    saveButtonDisabled: {
      opacity: 0.45,
    },
    saveButtonText: {
      color: c.onBrand,
      fontWeight: '800',
      fontSize: 14,
      letterSpacing: 0.2,
    },
    /* History Records */
    recordCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.sm + 2,
      marginBottom: s.xs + 2,
      gap: s.sm,
    },
    recordBadge: {
      width: 44,
      height: 44,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordGpaText: {
      fontWeight: '900',
      fontSize: 15,
    },
    recordBody: {
      flex: 1,
    },
    recordTitle: {
      fontWeight: '800',
      color: c.textPrimary,
      fontSize: 13,
    },
    recordMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    recordMeta: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    recordDelete: {
      width: 30,
      height: 30,
      borderRadius: r.md,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }));

  const { gpa, totalUnits, totalPoints } = useMemo(() => {
    let points = 0;
    let units = 0;
    courses.forEach((c) => {
      const u = Number(c.units) || 0;
      const g = Number(c.gradePoint) || 0;
      if (u > 0 && c.gradePoint !== '') {
        units += u;
        points += u * g;
      }
    });
    return {
      totalUnits: units,
      totalPoints: points,
      gpa: units ? (points / units).toFixed(2) : '0.00',
    };
  }, [courses]);

  const canSave = useMemo(
    () => courses.some((c) => c.code.trim() && Number(c.units) > 0 && c.gradePoint !== ''),
    [courses]
  );

  const loadRecords = useCallback(async () => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(query(collection(db, 'GPARecords'), where('userId', '==', profile.uid)));
      const items = snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRecords(items);
    } catch {
      // Handle optional err logging
    } finally {
      setLoading(false);
    }
  }, [profile?.uid]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const updateCourse = useCallback((index, patch) => {
    setCourses((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }, []);

  const removeCourse = useCallback((index) => {
    setCourses((items) => (items.length > 1 ? items.filter((_, i) => i !== index) : items));
  }, []);

  const save = async () => {
    if (!profile?.uid || !canSave || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'GPARecords'), {
        userId: profile.uid,
        GPA: gpa,
        classification: classifyGpa(gpa, colors).label,
        courses,
        createdAt: serverTimestamp(),
      });
      await loadRecords();
      setCourses([{ ...defaultCourse }]);
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = (id) => {
    deleteDoc(doc(db, 'GPARecords', id))
      .then(() => setRecords((current) => current.filter((record) => record.id !== id)))
      .catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.panelLoading}>
        <ActivityIndicator size="small" color={colors.brand} />
        <Text style={styles.panelLoadingText}>Retrieving GPA history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gauge Header */}
      <GpaGauge
        gpa={gpa}
        totalUnits={totalUnits}
        totalPoints={totalPoints}
        colors={colors}
        styles={styles}
      />

      {/* Courses List Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Current Courses</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionCount}>
            {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
          </Text>
        </View>
      </View>

      {courses.map((course, index) => (
        <CourseCard
          key={index}
          course={course}
          index={index}
          totalCourses={courses.length}
          onUpdate={updateCourse}
          onRemove={removeCourse}
          colors={colors}
          styles={styles}
        />
      ))}

      {/* Add Course Button */}
      <Pressable
        style={({ pressed }) => [styles.addButton, pressed && styles.pressedState]}
        onPress={() => setCourses((items) => [...items, { ...defaultCourse }])}
      >
        <Ionicons name="add-circle" size={17} color={colors.brand} />
        <Text style={styles.addButtonText}>Add Another Course</Text>
      </Pressable>

      {/* Primary Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          (!canSave || saving) && styles.saveButtonDisabled,
          pressed && canSave && styles.pressedState,
        ]}
        onPress={save}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving Record...' : 'Save Semester Summary'}</Text>
      </Pressable>

      {/* History Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>GPA History</Text>
      </View>

      {records.length ? (
        records.map((item) => {
          const tier = classifyGpa(item.GPA, colors);
          return (
            <View key={item.id} style={styles.recordCard}>
              <View style={[styles.recordBadge, { backgroundColor: tier.bg }]}>
                <Text style={[styles.recordGpaText, { color: tier.color }]}>
                  {Number(item.GPA || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.recordBody}>
                <Text style={styles.recordTitle}>{item.classification || tier.label}</Text>
                <View style={styles.recordMetaRow}>
                  <Ionicons name="journal-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.recordMeta}>
                    {(item.courses || []).length} {(item.courses || []).length === 1 ? 'Course' : 'Courses'} Calculated
                  </Text>
                </View>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => removeRecord(item.id)}
                style={({ pressed }) => [styles.recordDelete, pressed && styles.pressedState]}
              >
                <Ionicons name="trash-outline" size={15} color={colors.red} />
              </Pressable>
            </View>
          );
        })
      ) : (
        <EmptyState
          title="No history found"
          description="Save your first semester calculated GPA above to start tracking your performance over time."
        />
      )}
    </View>
  );
}