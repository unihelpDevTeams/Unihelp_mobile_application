import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import ConfirmDialog from '../../src/shared/components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

const STATUS_AUTO_DISMISS_MS = 3500;

const SLOT_MINUTES = 15;
const DAY_START_MINUTES = 8 * 60; // 08:00
const DAY_END_MINUTES = 18 * 60; // 18:00

const DAY_OPTIONS = [
  { key: 'mon', label: 'Mon', full: 'Monday' },
  { key: 'tue', label: 'Tue', full: 'Tuesday' },
  { key: 'wed', label: 'Wed', full: 'Wednesday' },
  { key: 'thu', label: 'Thu', full: 'Thursday' },
  { key: 'fri', label: 'Fri', full: 'Friday' },
  { key: 'sat', label: 'Sat', full: 'Saturday' },
  { key: 'sun', label: 'Sun', full: 'Sunday' },
];
const DEFAULT_ACTIVE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

const DURATION_OPTIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 hr' },
  { minutes: 90, label: '1.5 hr' },
  { minutes: 120, label: '2 hr' },
];

const COLOR_OPTIONS = ['#4F46E5', '#0EA5E9', '#10B981', '#F97316', '#F43F5E', '#9333EA', '#EAB308', '#14B8A6'];

const MAX_SESSIONS_PER_WEEK = 6;

function storageKeyFor(uid) {
  return `smart-timetable:${uid || 'guest'}`;
}

function formatMinutes(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  const paddedMinutes = minutes.toString().padStart(2, '0');
  return `${hours12}:${paddedMinutes} ${period}`;
}

function durationLabel(minutes) {
  const match = DURATION_OPTIONS.find((option) => option.minutes === minutes);
  return match ? match.label : `${minutes} min`;
}

function dayLabel(key) {
  return DAY_OPTIONS.find((day) => day.key === key)?.full || key;
}

// Greedy, load-balanced placement: longer sessions are placed first (better
// packing), and for every session we prefer whichever active day currently
// has the least scheduled time — and, among ties, a day this course isn't
// already sitting on — so the week ends up spread out rather than clumped.
function generateSchedule(courses, activeDays) {
  const slotsPerDay = Math.floor((DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_MINUTES);
  const occupancy = {};
  const dayLoadMinutes = {};
  activeDays.forEach((day) => {
    occupancy[day] = new Array(slotsPerDay).fill(null);
    dayLoadMinutes[day] = 0;
  });

  const queue = [];
  courses.forEach((course) => {
    for (let i = 0; i < course.sessionsPerWeek; i += 1) queue.push(course);
  });
  queue.sort((a, b) => b.durationMinutes - a.durationMinutes);

  const entries = [];
  const unscheduled = [];

  queue.forEach((course) => {
    const neededSlots = course.durationMinutes / SLOT_MINUTES;

    const rankedDays = [...activeDays].sort((dayA, dayB) => {
      const usedByCourseA = occupancy[dayA].includes(course.id);
      const usedByCourseB = occupancy[dayB].includes(course.id);
      if (usedByCourseA !== usedByCourseB) return usedByCourseA ? 1 : -1;
      return dayLoadMinutes[dayA] - dayLoadMinutes[dayB];
    });

    let placed = false;
    for (const day of rankedDays) {
      const slots = occupancy[day];
      for (let start = 0; start <= slots.length - neededSlots; start += 1) {
        let free = true;
        for (let offset = 0; offset < neededSlots; offset += 1) {
          if (slots[start + offset]) {
            free = false;
            break;
          }
        }
        if (free) {
          for (let offset = 0; offset < neededSlots; offset += 1) slots[start + offset] = course.id;
          dayLoadMinutes[day] += course.durationMinutes;
          const startMinutes = DAY_START_MINUTES + start * SLOT_MINUTES;
          entries.push({
            id: `${course.id}-${day}-${start}`,
            courseId: course.id,
            title: course.title,
            color: course.color,
            day,
            startMinutes,
            endMinutes: startMinutes + course.durationMinutes,
          });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) unscheduled.push(course);
  });

  entries.sort((a, b) => a.startMinutes - b.startMinutes);
  return { entries, unscheduled };
}

function buildPdfHtml({ entries, generatedAt }) {
  const rows = entries.length
    ? entries
        .map(
          (entry) => `
            <tr>
              <td>${dayLabel(entry.day)}</td>
              <td>${formatMinutes(entry.startMinutes)} – ${formatMinutes(entry.endMinutes)}</td>
              <td><span class="dot" style="background:${entry.color}"></span>${escapeHtml(entry.title)}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="3">No sessions scheduled.</td></tr>';

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #0F172A; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p.meta { color: #64748B; font-size: 12px; margin-top: 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; }
          th { background: #EEF2FF; color: #3730A3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; margin-right: 8px; }
        </style>
      </head>
      <body>
        <h1>My Weekly Timetable</h1>
        <p class="meta">Generated ${new Date(generatedAt).toLocaleString()}</p>
        <table>
          <thead>
            <tr><th>Day</th><th>Time</th><th>Course</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
}

function escapeHtml(value = '') {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export default function SmartTimetablePage() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles(buildStyles);
  const storageKey = storageKeyFor(profile?.uid);

  const isMountedRef = useRef(true);
  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  const [loading, setLoading] = useState(true);
  const [activeDays, setActiveDays] = useState(DEFAULT_ACTIVE_DAYS);
  const [courses, setCourses] = useState([]);
  const [schedule, setSchedule] = useState(null); // { entries, unscheduled, generatedAt }
  const [scheduleStale, setScheduleStale] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const [titleDraft, setTitleDraft] = useState('');
  const [colorDraft, setColorDraft] = useState(COLOR_OPTIONS[0]);
  const [sessionsDraft, setSessionsDraft] = useState(2);
  const [durationDraft, setDurationDraft] = useState(60);

  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState(null);

  const safeSetStatus = (value) => {
    if (isMountedRef.current) setStatus(value);
  };

  useEffect(() => {
    if (!status) return undefined;
    const timer = setTimeout(() => safeSetStatus(null), STATUS_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [status]);

  // Load any previously saved timetable for this user.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.courses)) setCourses(parsed.courses);
        if (Array.isArray(parsed?.activeDays) && parsed.activeDays.length) setActiveDays(parsed.activeDays);
        if (parsed?.schedule) setSchedule(parsed.schedule);
      } catch {
        // Corrupted or missing data just means we start from a blank slate.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [storageKey]);

  const persist = async (overrides = {}) => {
    const payload = {
      courses: overrides.courses ?? courses,
      activeDays: overrides.activeDays ?? activeDays,
      schedule: overrides.schedule !== undefined ? overrides.schedule : schedule,
    };
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      safeSetStatus({ type: 'error', message: "Couldn't save your timetable to this device. Your changes are still visible for now." });
    }
  };

  const toggleDay = (dayKey) => {
    const next = activeDays.includes(dayKey)
      ? activeDays.filter((key) => key !== dayKey)
      : [...activeDays, dayKey].sort((a, b) => DAY_OPTIONS.findIndex((d) => d.key === a) - DAY_OPTIONS.findIndex((d) => d.key === b));
    setActiveDays(next);
    if (schedule) setScheduleStale(true);
    persist({ activeDays: next });
  };

  const addCourse = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      safeSetStatus({ type: 'error', message: 'Give your course a name first.' });
      return;
    }
    const course = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      title: trimmed,
      color: colorDraft,
      sessionsPerWeek: sessionsDraft,
      durationMinutes: durationDraft,
    };
    const next = [...courses, course];
    setCourses(next);
    setTitleDraft('');
    setSessionsDraft(2);
    setDurationDraft(60);
    if (schedule) setScheduleStale(true);
    persist({ courses: next });
    safeSetStatus({ type: 'info', message: `${trimmed} added.` });
  };

  const removeCourse = (id) => {
    const next = courses.filter((course) => course.id !== id);
    setCourses(next);
    if (schedule) setScheduleStale(true);
    persist({ courses: next });
  };

  const clearAll = () => {
    setClearConfirmOpen(true);
  };

  const confirmClearAll = () => {
    setClearConfirmOpen(false);
    setCourses([]);
    setSchedule(null);
    setScheduleStale(false);
    persist({ courses: [], schedule: null });
  };

  const handleGenerate = () => {
    if (!courses.length) {
      safeSetStatus({ type: 'error', message: 'Add at least one course before generating a timetable.' });
      return;
    }
    if (!activeDays.length) {
      safeSetStatus({ type: 'error', message: 'Select at least one available day.' });
      return;
    }

    setGenerating(true);
    try {
      const { entries, unscheduled } = generateSchedule(courses, activeDays);
      const nextSchedule = { entries, unscheduled, generatedAt: Date.now() };
      setSchedule(nextSchedule);
      setScheduleStale(false);
      persist({ schedule: nextSchedule });
      if (unscheduled.length) {
        safeSetStatus({
          type: 'error',
          message: `Your plan is ready, but ${unscheduled.length} session${unscheduled.length > 1 ? 's' : ''} couldn't fit — try freeing up more days.`,
        });
      } else {
        safeSetStatus({ type: 'info', message: 'Your balanced timetable is ready.' });
      }
    } catch {
      safeSetStatus({ type: 'error', message: "Something went wrong generating your timetable. Please try again." });
    } finally {
      if (isMountedRef.current) setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!schedule?.entries?.length) {
      safeSetStatus({ type: 'error', message: 'Generate a timetable before downloading.' });
      return;
    }

    setExporting(true);
    try {
      const html = buildPdfHtml(schedule);
      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync().catch(() => false);
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save your timetable' });
      } else {
        safeSetStatus({ type: 'info', message: 'PDF created, but sharing is not available on this device.' });
      }
    } catch {
      safeSetStatus({ type: 'error', message: "Couldn't create the PDF. Please try again." });
    } finally {
      if (isMountedRef.current) setExporting(false);
    }
  };

  const groupedByDay = useMemo(() => {
    if (!schedule?.entries?.length) return [];
    return activeDays
      .map((day) => ({
        day,
        entries: schedule.entries.filter((entry) => entry.day === day),
      }))
      .filter((group) => group.entries.length);
  }, [schedule, activeDays]);

  const maxSessions = Math.min(MAX_SESSIONS_PER_WEEK, Math.max(1, activeDays.length || MAX_SESSIONS_PER_WEEK));

  return (
    <ScreenShell
      title="Smart Timetable"
      subtitle="Add your courses and get a balanced weekly plan — saved automatically on this device."
      showBack
      loading={loading}
    >
      <ConfirmDialog
        visible={clearConfirmOpen}
        title="Clear everything?"
        message="This removes all courses and your generated timetable from this device."
        confirmLabel="Clear all"
        variant="destructive"
        onCancel={() => setClearConfirmOpen(false)}
        onConfirm={confirmClearAll}
      />
      {status ? (
        <View style={[styles.statusPill, status.type === 'error' ? styles.statusError : styles.statusInfo]}>
          <Ionicons
            name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={16}
            color={status.type === 'error' ? colors.rose : colors.teal}
          />
          <Text style={[styles.statusText, status.type === 'error' ? styles.statusTextError : styles.statusTextInfo]}>
            {status.message}
          </Text>
          <Pressable onPress={() => safeSetStatus(null)} hitSlop={8}>
            <Ionicons name="close" size={15} color={status.type === 'error' ? colors.rose : colors.teal} />
          </Pressable>
        </View>
      ) : null}

      {/* Active days */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Which days work for you?</Text>
        <View style={styles.dayRow}>
          {DAY_OPTIONS.map((day) => {
            const active = activeDays.includes(day.key);
            return (
              <Pressable
                key={day.key}
                onPress={() => toggleDay(day.key)}
                style={[styles.dayChip, active && styles.dayChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Add course */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add a course</Text>
        <TextInput
          value={titleDraft}
          onChangeText={setTitleDraft}
          placeholder="e.g. Organic Chemistry"
          placeholderTextColor={colors.greyLight}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Sessions per week</Text>
        <View style={styles.stepperRow}>
          <Pressable
            style={styles.stepperButton}
            onPress={() => setSessionsDraft((value) => Math.max(1, value - 1))}
            accessibilityLabel="Decrease sessions per week"
          >
            <Ionicons name="remove" size={16} color={colors.brandDark} />
          </Pressable>
          <Text style={styles.stepperValue}>{sessionsDraft}</Text>
          <Pressable
            style={styles.stepperButton}
            onPress={() => setSessionsDraft((value) => Math.min(maxSessions, value + 1))}
            accessibilityLabel="Increase sessions per week"
          >
            <Ionicons name="add" size={16} color={colors.brandDark} />
          </Pressable>
        </View>

        <Text style={styles.fieldLabel}>Session length</Text>
        <View style={styles.pillRow}>
          {DURATION_OPTIONS.map((option) => {
            const active = durationDraft === option.minutes;
            return (
              <Pressable
                key={option.minutes}
                onPress={() => setDurationDraft(option.minutes)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map((color) => {
            const active = colorDraft === color;
            return (
              <Pressable
                key={color}
                onPress={() => setColorDraft(color)}
                style={[styles.colorSwatch, { backgroundColor: color }, active && styles.colorSwatchActive]}
                accessibilityLabel={`Select color ${color}`}
              >
                {active ? <Ionicons name="checkmark" size={14} color={colors.onBrand} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]} onPress={addCourse}>
          <Ionicons name="add-circle-outline" size={16} color={colors.onBrand} />
          <Text style={styles.addButtonText}>Add course</Text>
        </Pressable>
      </View>

      {/* Course list */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>Your courses</Text>
        {courses.length ? (
          <Pressable onPress={clearAll} hitSlop={6}>
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>

      {courses.length ? (
        <View style={styles.card}>
          {courses.map((course, index) => (
            <View key={course.id} style={[styles.courseRow, index !== courses.length - 1 && styles.rowDivider]}>
              <View style={[styles.courseDot, { backgroundColor: course.color }]} />
              <View style={styles.courseCopy}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {course.title}
                </Text>
                <Text style={styles.courseMeta}>
                  {course.sessionsPerWeek}x per week · {durationLabel(course.durationMinutes)}
                </Text>
              </View>
              <Pressable onPress={() => removeCourse(course.id)} hitSlop={8} accessibilityLabel={`Remove ${course.title}`}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title="No courses yet" description="Add a course above to start building your timetable." />
      )}

      {/* Generate button */}
      <Pressable
        style={({ pressed }) => [
          styles.generateButton,
          !courses.length && styles.generateButtonDisabled,
          pressed && courses.length > 0 && styles.generateButtonPressed,
        ]}
        onPress={handleGenerate}
        disabled={generating || !courses.length}
      >
        {generating ? (
          <ActivityIndicator color={colors.onBrand} />
        ) : (
          <>
            <Ionicons name="sparkles-outline" size={16} color={colors.onBrand} />
            <Text style={styles.generateButtonText}>{schedule ? 'Regenerate timetable' : 'Generate timetable'}</Text>
          </>
        )}
      </Pressable>

      {/* Schedule */}
      {schedule ? (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Your weekly plan</Text>
          </View>

          {scheduleStale ? (
            <View style={styles.staleBanner}>
              <Ionicons name="refresh-outline" size={14} color={colors.amber} />
              <Text style={styles.staleBannerText}>Your courses changed — regenerate to refresh this plan.</Text>
            </View>
          ) : null}

          {schedule.unscheduled?.length ? (
            <View style={styles.warningCard}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.rose} />
              <Text style={styles.warningText}>
                Couldn&apous;t fit: {schedule.unscheduled.map((course) => course.title).join(', ')}. Try adding more
                available days or reducing sessions.
              </Text>
            </View>
          ) : null}

          {groupedByDay.length ? (
            groupedByDay.map((group) => (
              <View key={group.day} style={styles.card}>
                <Text style={styles.dayHeading}>{dayLabel(group.day)}</Text>
                {group.entries.map((entry, index) => (
                  <View key={entry.id} style={[styles.entryRow, index !== group.entries.length - 1 && styles.rowDivider]}>
                    <View style={[styles.courseDot, { backgroundColor: entry.color }]} />
                    <View style={styles.courseCopy}>
                      <Text style={styles.courseTitle} numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text style={styles.courseMeta}>
                        {formatMinutes(entry.startMinutes)} – {formatMinutes(entry.endMinutes)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <EmptyState title="Nothing scheduled" description="None of your sessions could be placed. Try adjusting your courses or days." />
          )}

          <Pressable
            style={({ pressed }) => [styles.downloadButton, pressed && !exporting && styles.downloadButtonPressed]}
            onPress={handleDownload}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={colors.brandDark} />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color={colors.brandDark} />
                <Text style={styles.downloadButtonText}>Download as PDF</Text>
              </>
            )}
          </Pressable>
        </>
      ) : null}
    </ScreenShell>
  );
}

const shadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 2 },
});

const buildStyles = (c, s, r) => ({
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusInfo: { backgroundColor: c.greenLight, borderColor: c.green },
  statusError: { backgroundColor: c.redLight, borderColor: c.redBorder },
  statusText: { flex: 1, fontSize: 13 },
  statusTextInfo: { color: c.teal },
  statusTextError: { color: c.rose },

  card: {
    backgroundColor: c.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.borderDefault,
    padding: 16,
    marginBottom: 16,
    ...shadow,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: c.textPrimary,
    marginBottom: 12,
  },

  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: c.skeletonBackground,
    borderWidth: 1,
    borderColor: c.borderDefault,
  },
  dayChipActive: { backgroundColor: c.brand, borderColor: c.brand },
  dayChipText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  dayChipTextActive: { color: c.onBrand },

  input: {
    borderWidth: 1,
    borderColor: c.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: c.textPrimary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: c.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '800',
    color: c.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: c.skeletonBackground,
    borderWidth: 1,
    borderColor: c.borderDefault,
  },
  pillActive: { backgroundColor: c.brandLight, borderColor: c.brand },
  pillText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  pillTextActive: { color: c.brandDark },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 2,
    borderColor: c.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.brand,
    borderRadius: 14,
    paddingVertical: 13,
  },
  addButtonPressed: { backgroundColor: c.brandDark },
  addButtonText: { color: c.onBrand, fontWeight: '800', fontSize: 14 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
  clearText: { color: c.danger, fontWeight: '700', fontSize: 13 },

  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: c.skeletonBackground },
  courseDot: { width: 10, height: 10, borderRadius: 5 },
  courseCopy: { flex: 1 },
  courseTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
  courseMeta: { marginTop: 2, fontSize: 12, color: c.textSecondary },

  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.brandDark,
    borderRadius: 16,
    paddingVertical: 15,
    marginBottom: 20,
    marginTop: 20,
  },
  generateButtonDisabled: { backgroundColor: c.inputBorder },
  generateButtonPressed: { backgroundColor: c.brandDark },
  generateButtonText: { color: c.onBrand, fontWeight: '800', fontSize: 15 },

  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.amberLight,
    borderWidth: 1,
    borderColor: c.amber,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  staleBannerText: { flex: 1, color: c.amber, fontSize: 12, fontWeight: '600' },

  warningCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: c.redLight,
    borderWidth: 1,
    borderColor: c.redBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { flex: 1, color: c.rose, fontSize: 12, lineHeight: 18 },

  dayHeading: { fontSize: 13, fontWeight: '800', color: c.brandDark, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.brandLight,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 4,
    marginBottom: 24,
  },
  downloadButtonPressed: { backgroundColor: c.brandBorder },
  downloadButtonText: { color: c.brandDark, fontWeight: '800', fontSize: 15 },
});
