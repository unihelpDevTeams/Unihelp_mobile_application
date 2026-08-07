import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { useAuth } from '../../context/AuthContext';

// ---- design tokens -------------------------------------------------------
const COLORS = {
  canvas: '#F5F6FA',
  surface: '#FFFFFF',
  line: '#E7E9F3',
  ink: '#12142B',
  inkSoft: '#5B6178',
  indigo: '#4338CA',
  indigoSoft: '#EEF0FF',
  gold: '#B7862E',
  goldSoft: '#FBF2E1',
  rose: '#C4433A',
  roseSoft: '#FBEAE9',
  emerald: '#157F4A',
  emeraldSoft: '#E7F5EC',
};

// Nigerian 5.0-point grading scale
const GRADE_OPTIONS = [
  { label: 'A', points: 5 },
  { label: 'B', points: 4 },
  { label: 'C', points: 3 },
  { label: 'D', points: 2 },
  { label: 'E', points: 1 },
  { label: 'F', points: 0 },
];

function classifyGpa(value) {
  const gpa = Number(value) || 0;
  if (gpa >= 4.5) return { label: 'First Class', color: COLORS.gold, bg: COLORS.goldSoft };
  if (gpa >= 3.5) return { label: 'Second Class (Upper)', color: COLORS.emerald, bg: COLORS.emeraldSoft };
  if (gpa >= 2.4) return { label: 'Second Class (Lower)', color: COLORS.indigo, bg: COLORS.indigoSoft };
  if (gpa >= 1.5) return { label: 'Third Class', color: '#946200', bg: '#FBF2E1' };
  if (gpa >= 1.0) return { label: 'Pass', color: COLORS.inkSoft, bg: '#EEF0F5' };
  return { label: 'Below Pass Mark', color: COLORS.rose, bg: COLORS.roseSoft };
}

const defaultCourse = { code: '', units: '', gradePoint: '' };

function GpaGauge({ gpa }) {
  const pct = Math.max(0, Math.min(1, (Number(gpa) || 0) / 5));
  const tier = classifyGpa(gpa);
  return (
    <View style={styles.gaugeCard}>
      <View style={styles.gaugeHeaderRow}>
        <Text style={styles.gaugeEyebrow}>CURRENT GPA</Text>
        <View style={[styles.tierPill, { backgroundColor: tier.bg }]}>
          <Text style={[styles.tierPillText, { color: tier.color }]}>{tier.label}</Text>
        </View>
      </View>

      <Text style={styles.gaugeValue}>{gpa}</Text>

      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: tier.color }]} />
          {[1, 1.5, 2.4, 3.5, 4.5].map((mark) => (
            <View key={mark} style={[styles.trackTick, { left: `${(mark / 5) * 100}%` }]} />
          ))}
        </View>
        <View style={styles.trackLabels}>
          <Text style={styles.trackLabelText}>0.0</Text>
          <Text style={styles.trackLabelText}>5.0</Text>
        </View>
      </View>
    </View>
  );
}

export default function GpaPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState([{ ...defaultCourse }]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const gpa = useMemo(() => {
    const totalPoints = courses.reduce((sum, course) => sum + (Number(course.units) || 0) * (Number(course.gradePoint) || 0), 0);
    const totalUnits = courses.reduce((sum, course) => sum + (Number(course.units) || 0), 0);
    return totalUnits ? (totalPoints / totalUnits).toFixed(2) : '0.00';
  }, [courses]);

  const canSave = useMemo(
    () => courses.some((c) => c.code.trim() && Number(c.units) > 0 && c.gradePoint !== ''),
    [courses]
  );

  useEffect(() => {
    const load = async () => {
      if (!profile?.uid) {
        setLoading(false);
        return;
      }
      const snap = await getDocs(query(collection(db, 'GPARecords'), where('userId', '==', profile.uid)));
      const items = snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRecords(items);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, [profile?.uid]);

  const updateCourse = (index, patch) => {
    setCourses((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeCourse = (index) => {
    setCourses((items) => (items.length > 1 ? items.filter((_, i) => i !== index) : items));
  };

  const save = async () => {
    if (!profile?.uid || !canSave || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'GPARecords'), {
        userId: profile.uid,
        GPA: gpa,
        classification: classifyGpa(gpa).label,
        courses,
        createdAt: serverTimestamp(),
      });
      const snap = await getDocs(query(collection(db, 'GPARecords'), where('userId', '==', profile.uid)));
      const items = snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRecords(items);
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

  return (
    <ScreenShell title="GPA Calculator" subtitle="Add this semester's courses to see your standing." showBack loading={loading}>
      <GpaGauge gpa={gpa} />

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Courses this semester</Text>
        <Text style={styles.sectionCount}>{courses.length} {courses.length === 1 ? 'course' : 'courses'}</Text>
      </View>

      {courses.map((course, index) => (
        <View key={index} style={styles.courseCard}>
          <View style={styles.courseCardTop}>
            <View style={styles.courseIndexBadge}>
              <Text style={styles.courseIndexText}>{index + 1}</Text>
            </View>
            <TextInput
              style={styles.codeInput}
              placeholder="Course code, e.g. CHE 301"
              placeholderTextColor={COLORS.inkSoft}
              value={course.code}
              onChangeText={(value) => updateCourse(index, { code: value })}
            />
            {courses.length > 1 && (
              <Pressable hitSlop={10} onPress={() => removeCourse(index)} style={styles.removeButton}>
                <Ionicons name="close" size={16} color={COLORS.inkSoft} />
              </Pressable>
            )}
          </View>

          <Text style={styles.fieldLabel}>Units</Text>
          <View style={styles.unitsRow}>
            {[1, 2, 3, 4, 5, 6].map((u) => (
              <Pressable
                key={u}
                onPress={() => updateCourse(index, { units: String(u) })}
                style={[styles.unitChip, String(u) === course.units && styles.unitChipActive]}
              >
                <Text style={[styles.unitChipText, String(u) === course.units && styles.unitChipTextActive]}>{u}</Text>
              </Pressable>
            ))}
            <TextInput
              style={styles.unitsCustomInput}
              placeholder="Other"
              placeholderTextColor={COLORS.inkSoft}
              keyboardType="numeric"
              value={![1, 2, 3, 4, 5, 6].map(String).includes(course.units) ? course.units : ''}
              onChangeText={(value) => updateCourse(index, { units: value })}
            />
          </View>

          <Text style={styles.fieldLabel}>Grade</Text>
          <View style={styles.gradeRow}>
            {GRADE_OPTIONS.map((g) => (
              <Pressable
                key={g.label}
                onPress={() => updateCourse(index, { gradePoint: String(g.points) })}
                style={[styles.gradeChip, String(g.points) === course.gradePoint && styles.gradeChipActive]}
              >
                <Text style={[styles.gradeChipText, String(g.points) === course.gradePoint && styles.gradeChipTextActive]}>
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable style={styles.addButton} onPress={() => setCourses((items) => [...items, { ...defaultCourse }])}>
        <Ionicons name="add" size={18} color={COLORS.indigo} />
        <Text style={styles.addButtonText}>Add another course</Text>
      </Pressable>

      <Pressable
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={save}
        disabled={!canSave || saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save this semester'}</Text>
      </Pressable>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Your GPA history</Text>
      </View>

      {records.length ? (
        records.map((item) => {
          const tier = classifyGpa(item.GPA);
          return (
            <View key={item.id} style={styles.recordCard}>
              <View style={[styles.recordDot, { backgroundColor: tier.color }]} />
              <View style={styles.recordBody}>
                <Text style={styles.recordGpa}>{Number(item.GPA || 0).toFixed(2)}</Text>
                <Text style={styles.recordMeta}>{item.classification || tier.label} · {(item.courses || []).length} courses</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => removeRecord(item.id)} style={styles.recordDelete}>
                <Ionicons name="trash-outline" size={16} color={COLORS.rose} />
              </Pressable>
            </View>
          );
        })
      ) : (
        <EmptyState title="No records yet" description="Save a semester above and it will show up here." />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  // Hero gauge
  gaugeCard: {
    backgroundColor: COLORS.ink,
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
  },
  gaugeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gaugeEyebrow: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  tierPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gaugeValue: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginBottom: 18,
  },
  trackWrap: {
    marginTop: 2,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'visible',
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  trackTick: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  trackLabelText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionCount: {
    color: COLORS.inkSoft,
    fontSize: 12,
    fontWeight: '600',
  },

  // Course card
  courseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 16,
    marginBottom: 14,
  },
  courseCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  courseIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  courseIndexText: {
    color: COLORS.indigo,
    fontWeight: '800',
    fontSize: 12,
  },
  codeInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
    paddingVertical: 4,
  },
  removeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    color: COLORS.inkSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  unitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  unitChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipActive: {
    backgroundColor: COLORS.indigo,
    borderColor: COLORS.indigo,
  },
  unitChipText: {
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  unitsCustomInput: {
    minWidth: 60,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 10,
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeChipActive: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  gradeChipText: {
    color: COLORS.ink,
    fontWeight: '800',
    fontSize: 14,
  },
  gradeChipTextActive: {
    color: '#FFFFFF',
  },

  // Buttons
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.indigo,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 13,
    marginBottom: 10,
    backgroundColor: COLORS.indigoSoft,
  },
  addButtonText: {
    color: COLORS.indigo,
    fontWeight: '800',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: COLORS.ink,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 28,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  // Records
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
    marginBottom: 10,
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  recordBody: {
    flex: 1,
  },
  recordGpa: {
    fontWeight: '900',
    color: COLORS.ink,
    fontSize: 18,
  },
  recordMeta: {
    color: COLORS.inkSoft,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  recordDelete: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});