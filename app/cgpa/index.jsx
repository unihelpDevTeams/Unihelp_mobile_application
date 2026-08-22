import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
// Removed firebase/firestore imports
import { useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Removed firebase db import
import { fetchCgpaRecords, createCgpaRecord, updateCgpaRecord, deleteCgpaRecord } from "../../src/shared/services/cgpa";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../src/shared/theme/ThemeContext";
import { useThemeStyles } from "../../src/shared/theme/createStyles";
import ConfirmDialog from "../../src/shared/components/ConfirmDialog";
import ScreenShell from "../../src/shared/components/ScreenShell";
import EmptyState from "../../src/shared/components/EmptyState";
import { Image } from "expo-image";
import GpaCalculatorPanel from "../../src/features/academic/GpaCalculatorPanel";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const emptySemester = { name: "", units: "", gpa: "" };

// Scale-aware degree classification. 5.0 uses the Nigerian university system
// (First Class / 2nd Class Upper / etc). 4.0 uses US-style Latin honors.
function getClassification(cgpaValue, scaleValue, colors) {
  const v = Number(cgpaValue);
  if (!v || v <= 0) {
    return { title: "Not Rated", tone: colors.grey, icon: "minus-circle-outline" };
  }
  if (scaleValue === "4.0") {
    if (v >= 3.7) return { title: "Summa Cum Laude", tone: colors.green, icon: "trophy" };
    if (v >= 3.5) return { title: "Magna Cum Laude", tone: colors.blue, icon: "star-circle" };
    if (v >= 3.0) return { title: "Cum Laude", tone: colors.orange, icon: "thumb-up" };
    if (v >= 2.0) return { title: "Good Standing", tone: colors.orange, icon: "check-circle" };
    return { title: "Needs Improvement", tone: colors.red, icon: "alert-circle" };
  }
  if (v >= 4.5) return { title: "First Class", tone: colors.green, icon: "trophy" };
  if (v >= 3.5) return { title: "2nd Class Upper", tone: colors.blue, icon: "star-circle" };
  if (v >= 2.4) return { title: "2nd Class Lower", tone: colors.orange, icon: "thumb-up" };
  if (v >= 1.5) return { title: "Third Class", tone: colors.orange, icon: "school-outline" };
  return { title: "Pass", tone: colors.red, icon: "alert-circle" };
}

function validateSemester(semester, scaleValue) {
  const errors = {};
  const max = scaleValue === "4.0" ? 4 : 5;
  if (semester.units !== "" && semester.units !== undefined) {
    const units = Number(semester.units);
    if (Number.isNaN(units) || units <= 0) errors.units = "Enter units > 0";
  }
  if (semester.gpa !== "" && semester.gpa !== undefined) {
    const gpaVal = Number(semester.gpa);
    if (Number.isNaN(gpaVal) || gpaVal < 0 || gpaVal > max) {
      errors.gpa = `Must be 0.00 – ${max.toFixed(2)}`;
    }
  }
  return errors;
}

export default function CgpaPage() {
  const { profile } = useAuth();
  const { colors, isDark } = useTheme();
  const { tab } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState([]);
  const [saving, setSaving] = useState(false);
  const [semesters, setSemesters] = useState([{ ...emptySemester, name: "Semester 1" }]);
  const [scale, setScale] = useState("5.0");
  const [editingId, setEditingId] = useState(null);
  const [sortBy, setSortBy] = useState("recent");
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', message }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTool, setActiveTool] = useState(tab === "gpa" ? "gpa" : "cgpa");

  const scrollRef = useRef(null);
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const bannerTimeout = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  // Spin the save-button icon while a save is in flight
  useEffect(() => {
    if (!saving) {
      spinAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [saving, spinAnim]);

  useEffect(() => () => {
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  useEffect(() => {
    if (tab === "gpa" || tab === "cgpa") {
      setActiveTool(tab);
    }
  }, [tab]);

  const showBanner = useCallback((type, message) => {
    setBanner({ type, message });
    bannerAnim.setValue(0);
    Animated.timing(bannerAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    bannerTimeout.current = setTimeout(() => {
      Animated.timing(bannerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setBanner(null));
    }, 2600);
  }, [bannerAnim]);

  const styles = useThemeStyles((c, s, r) => ({
    segmentContainer: {
      flexDirection: "row",
      backgroundColor: c.surfaceSecondary,
      borderRadius: r["2xl"],
      padding: 4,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: "center",
      marginBottom: s.lg,
    },
    segmentTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: r.xl,
      gap: 6,
    },
    segmentTabActiveGpa: {
      backgroundColor: c.orange,
      ...Platform.select({
        ios: { shadowColor: c.orange, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.22, shadowRadius: 4 },
        android: { elevation: 3 },
      }),
    },
    segmentTabActiveCgpa: {
      backgroundColor: c.brand,
      ...Platform.select({
        ios: { shadowColor: c.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
        android: { elevation: 3 },
      }),
    },
    segmentText: {
      fontSize: 13.5,
      fontWeight: "700",
      color: c.textSecondary,
    },
    segmentTextActive: {
      color: c.onBrand,
      fontWeight: "800",
    },
    hero: {
      borderRadius: r["4xl"],
      padding: s.xl,
      marginBottom: s.xl,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.3)",
      ...Platform.select({
        ios: { shadowColor: c.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
        android: { elevation: 6 },
      }),
    },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: s.lg,
    },
    welcome: { color: "rgba(255,255,255,0.78)", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
    username: { color: c.onBrand, fontSize: 22, fontWeight: "900", marginTop: 2 },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.18)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.3)",
    },
    userIcon: {
      width: "100%",
      height: "100%",
    },
    scaleToggleRow: {
      flexDirection: "row",
      backgroundColor: "rgba(0,0,0,0.18)",
      borderRadius: r.xl,
      padding: 3,
      marginBottom: s.lg,
      alignSelf: "flex-start",
    },
    scalePill: { paddingHorizontal: s.md, paddingVertical: 6, borderRadius: r.lg },
    scalePillActive: { backgroundColor: "#FFFFFF" },
    scalePillText: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 12 },
    scalePillTextActive: { color: c.brand, fontWeight: "900" },

    cgpaBox: {
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: r["3xl"],
      paddingVertical: s.lg,
      paddingHorizontal: s.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    cgpaLabel: { color: "rgba(255,255,255,0.82)", fontWeight: "800", letterSpacing: 1.5, fontSize: 11 },
    cgpaValue: { fontSize: 48, color: c.onBrand, fontWeight: "900", marginVertical: 2, letterSpacing: -1 },
    cgpaHelper: { color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: s.sm, fontWeight: "600" },
    performanceBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: s.md,
      paddingVertical: 5,
      borderRadius: 999,
      marginTop: 4,
    },
    performanceText: { color: c.onBrand, marginLeft: 6, fontWeight: "800", fontSize: 13 },

    statsRow: { flexDirection: "row", gap: s.sm, marginBottom: s.xl },
    statCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: r["2xl"],
      padding: s.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.borderDefault,
      ...Platform.select({
        ios: { shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
        android: { elevation: 2 },
      }),
    },
    statIcon: { width: 34, height: 34, borderRadius: r.lg, justifyContent: "center", alignItems: "center", marginBottom: s.xs },
    statValue: { fontSize: 18, fontWeight: "900", color: c.ink },
    statLabel: { color: c.textSecondary, marginTop: 2, fontWeight: "600", fontSize: 11 },

    sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s.md },
    sectionTitle: { fontSize: 18, fontWeight: "900", color: c.ink },
    cancelEditButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: s.sm, paddingVertical: 4 },
    cancelEditText: { marginLeft: 4, color: c.textSecondary, fontWeight: "700", fontSize: 12.5 },

    semesterCard: {
      backgroundColor: c.surface,
      borderRadius: r["3xl"],
      padding: s.lg,
      marginBottom: s.lg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      ...Platform.select({
        ios: { shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
        android: { elevation: 2 },
      }),
    },
    semesterHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s.md },
    semesterTitle: { fontSize: 16, fontWeight: "900", color: c.ink },
    semesterSubtitle: { color: c.textSecondary, marginTop: 1, fontSize: 11.5 },
    deleteButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: `${c.red}12`,
      justifyContent: "center",
      alignItems: "center",
    },
    
    fieldLabel: { fontSize: 11.5, fontWeight: "700", color: c.textSecondary, marginBottom: 4, marginLeft: 2 },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingHorizontal: s.md,
      marginBottom: s.sm,
    },
    inputContainerError: { borderColor: c.red },
    input: { flex: 1, paddingVertical: 10, paddingHorizontal: s.xs, fontSize: 14, color: c.ink, fontWeight: "600" },
    inputRow: { flexDirection: "row", gap: s.sm, marginTop: s.xs },
    inputHalf: { flex: 1 },
    errorText: { color: c.red, fontSize: 11, marginTop: -2, marginBottom: s.xs, marginLeft: s.xs, fontWeight: "600" },

    previewCard: {
      marginTop: s.sm,
      borderRadius: r.xl,
      paddingVertical: s.md,
      paddingHorizontal: s.lg,
      backgroundColor: `${colors.brand}08`,
      borderWidth: 1,
      borderColor: `${colors.brand}18`,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    previewLabel: { color: c.textSecondary, fontWeight: "700", fontSize: 11, textTransform: "uppercase" },
    previewValue: { fontSize: 20, fontWeight: "900", color: c.brand, marginTop: 1 },

    addButton: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.xl,
      paddingVertical: s.md,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderStyle: "dashed",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: s.md,
    },
    addButtonText: { color: c.ink, fontWeight: "800", fontSize: 14, marginLeft: s.xs },

    saveButton: {
      marginBottom: s["2xl"],
      borderRadius: r.xl,
      overflow: "hidden",
      ...Platform.select({
        ios: { shadowColor: c.brand, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
        android: { elevation: 4 },
      }),
    },
    saveButtonDisabled: { opacity: 0.5 },
    saveGradient: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: s.lg },
    saveText: { color: c.onBrand, fontWeight: "900", fontSize: 15, marginLeft: s.xs },

    historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s.md },
    historyTitle: { fontSize: 18, fontWeight: "900", color: c.ink },
    historySubtitle: { marginTop: 1, fontSize: 12, color: c.textSecondary },
    historyBadge: {
      backgroundColor: c.brand,
      minWidth: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: s.xs,
    },
    historyBadgeText: { color: c.onBrand, fontWeight: "900", fontSize: 12 },

    sortRowContainer: { flexDirection: "row", justifyContent: "flex-end", marginBottom: s.md },
    sortRow: { flexDirection: "row", gap: s.xs, backgroundColor: c.surfaceSecondary, padding: 3, borderRadius: 999 },
    sortPill: { paddingHorizontal: s.md, paddingVertical: 5, borderRadius: 999 },
    sortPillActive: { backgroundColor: c.surface, ...Platform.select({ ios: { shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 2 }, android: { elevation: 1 } }) },
    sortPillText: { fontSize: 11.5, fontWeight: "700", color: c.textSecondary },
    sortPillTextActive: { color: c.ink, fontWeight: "800" },

    recordCard: {
      backgroundColor: c.surface,
      borderRadius: r["2xl"],
      padding: s.lg,
      marginBottom: s.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: c.borderDefault,
      ...Platform.select({
        ios: { shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
        android: { elevation: 2 },
      }),
    },
    recordCardActive: { borderColor: c.brand, borderWidth: 2 },
    recordLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    recordIcon: {
      width: 44,
      height: 44,
      borderRadius: r.xl,
      backgroundColor: `${c.brand}12`,
      justifyContent: "center",
      alignItems: "center",
      marginRight: s.md,
    },
    recordCgpa: { fontSize: 16, fontWeight: "900", color: c.ink },
    recordSemesters: { marginTop: 2, color: c.textSecondary, fontWeight: "600", fontSize: 12 },
    recordDate: { marginTop: 2, color: c.grey, fontSize: 11 },
    classChip: { paddingHorizontal: s.sm, paddingVertical: 3, borderRadius: 999, alignSelf: "flex-start", marginTop: s.xs },
    classChipText: { fontSize: 10.5, fontWeight: "800", color: c.onBrand },
    deleteRecordButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${c.red}12`,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: s.sm,
    },

    banner: {
      position: "absolute",
      top: s.md,
      left: s.lg,
      right: s.lg,
      borderRadius: r.xl,
      padding: s.md,
      flexDirection: "row",
      alignItems: "center",
      zIndex: 50,
      elevation: 10,
      shadowColor: c.shadow,
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    bannerSuccess: { backgroundColor: c.green },
    bannerError: { backgroundColor: c.red },
    bannerText: { color: c.onBrand, fontWeight: "700", marginLeft: s.sm, flex: 1, fontSize: 13 },
  }));

  const totalUnits = useMemo(
    () => semesters.reduce((sum, item) => sum + (Number(item.units) || 0), 0),
    [semesters]
  );

  const cgpa = useMemo(() => {
    let totalPoints = 0;
    semesters.forEach((semester) => {
      const units = Number(semester.units) || 0;
      const gpa = Number(semester.gpa) || 0;
      totalPoints += units * gpa;
    });
    if (!totalUnits) return "0.00";
    return (totalPoints / totalUnits).toFixed(2);
  }, [semesters, totalUnits]);

  const bestSemesterGpa = useMemo(() => {
    const values = semesters.map((s) => Number(s.gpa) || 0).filter((v) => v > 0);
    if (!values.length) return "0.00";
    return Math.max(...values).toFixed(2);
  }, [semesters]);

  const performance = useMemo(() => getClassification(cgpa, scale, colors), [cgpa, scale, colors]);

  const semesterErrors = useMemo(
    () => semesters.map((s) => validateSemester(s, scale)),
    [semesters, scale]
  );
  const hasErrors = semesterErrors.some((e) => Object.keys(e).length > 0);
  const hasValidData = semesters.some(
    (s) => Number(s.units) > 0 && s.gpa !== "" && !Number.isNaN(Number(s.gpa))
  );
  const canSave = hasValidData && !hasErrors;

  const sortedRecords = useMemo(() => {
    const copy = [...records];
    if (sortBy === "highest") {
      return copy.sort((a, b) => Number(b.cgpa || 0) - Number(a.cgpa || 0));
    }
    return copy.sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
      return bTime - aTime;
    });
  }, [records, sortBy]);

  const loadRecords = useCallback(async () => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }
    try {
      const fetchedRecords = await fetchCgpaRecords();
      setRecords(fetchedRecords);
    } catch (e) {
      console.log(e);
      showBanner("error", "Couldn't load your saved records");
    }
    setLoading(false);
  }, [profile, showBanner]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  }, [loadRecords]);

  async function saveRecord() {
    if (!profile?.uid || saving || !canSave) return;
    try {
      setSaving(true);
      if (editingId) {
        await updateCgpaRecord(editingId, {
          semesters,
          cgpa,
          scale,
        });
        showBanner("success", "Record updated");
      } else {
        await createCgpaRecord({
          semesters,
          cgpa,
          scale,
        });
        showBanner("success", "CGPA saved");
      }
      await loadRecords();
      setEditingId(null);
    } catch (e) {
      console.log(e);
      showBanner("error", "Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function loadRecordForEdit(item) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSemesters(
      item.semesters?.length
        ? item.semesters.map((s) => ({ name: s.name || "", units: String(s.units ?? ""), gpa: String(s.gpa ?? "") }))
        : [{ ...emptySemester, name: "Semester 1" }]
    );
    setScale(item.scale || "5.0");
    setEditingId(item.id);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function cancelEdit() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSemesters([{ ...emptySemester, name: "Semester 1" }]);
    setEditingId(null);
  }

  function confirmDelete(item) {
    setDeleteTarget(item);
  }

  async function removeRecord(id) {
    try {
      await deleteCgpaRecord(id);
      setRecords((prev) => prev.filter((record) => record.id !== id));
      if (editingId === id) cancelEdit();
      setDeleteTarget(null);
      showBanner("success", "Record deleted");
    } catch (e) {
      console.log(e);
      showBanner("error", "Couldn't delete that record");
    }
  }

  function switchScale(next) {
    if (next === scale) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setScale(next);
  }

  function removeSemester(index) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSemesters((prev) => prev.filter((_, i) => i !== index));
  }

  function addSemester() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSemesters((prev) => [...prev, { ...emptySemester, name: `Semester ${prev.length + 1}` }]);
  }

  function updateSemester(index, field, value) {
    setSemesters((prev) => prev.map((semester, i) => (i === index ? { ...semester, [field]: value } : semester)));
  }

  return (
    <ScreenShell
      title="GPA & CGPA"
      subtitle={activeTool === "gpa" ? "Calculate this semester's GPA" : "Track your academic journey"}
      showBack
      scrollable={activeTool === "gpa"}
      loading={activeTool === "cgpa" && loading}
    >
      <View style={styles.segmentContainer}>
        <Pressable
          onPress={() => setActiveTool("gpa")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTool === "gpa" }}
          style={[styles.segmentTab, activeTool === "gpa" && styles.segmentTabActiveGpa]}
        >
          <Ionicons
            name={activeTool === "gpa" ? "calculator" : "calculator-outline"}
            size={16}
            color={activeTool === "gpa" ? colors.onBrand : colors.textSecondary}
          />
          <Text style={[styles.segmentText, activeTool === "gpa" && styles.segmentTextActive]}>
            GPA Calculator
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTool("cgpa")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTool === "cgpa" }}
          style={[styles.segmentTab, activeTool === "cgpa" && styles.segmentTabActiveCgpa]}
        >
          <Ionicons
            name={activeTool === "cgpa" ? "stats-chart" : "stats-chart-outline"}
            size={16}
            color={activeTool === "cgpa" ? colors.onBrand : colors.textSecondary}
          />
          <Text style={[styles.segmentText, activeTool === "cgpa" && styles.segmentTextActive]}>
            CGPA Tracker
          </Text>
        </Pressable>
      </View>

      {activeTool === "gpa" ? (
        <GpaCalculatorPanel />
      ) : (
        <>
          <ConfirmDialog
            visible={Boolean(deleteTarget)}
            title="Delete this record?"
            message={deleteTarget ? `CGPA ${Number(deleteTarget.cgpa || 0).toFixed(2)} will be permanently removed. This can't be undone.` : ""}
            confirmLabel="Delete"
            variant="destructive"
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() => deleteTarget && removeRecord(deleteTarget.id)}
          />
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            {banner && (
              <Animated.View
                style={[
                  styles.banner,
                  banner.type === "success" ? styles.bannerSuccess : styles.bannerError,
                  {
                    opacity: bannerAnim,
                    transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
                  },
                ]}
              >
                <Ionicons
                  name={banner.type === "success" ? "checkmark-circle" : "alert-circle"}
                  size={18}
                  color={colors.onBrand}
                />
                <Text style={styles.bannerText}>{banner.message}</Text>
              </Animated.View>
            )}

            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 120 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} colors={[colors.brand]} />
              }
            >
              <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
                <LinearGradient
                  colors={[colors.brand, colors.brandDark || colors.brand]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.hero}
                >
                  <View style={styles.heroTop}>
                    <View>
                      <Text style={styles.welcome}>ACADEMIC OVERVIEW</Text>
                      <Text style={styles.username}>{profile?.displayName || "Student"}</Text>
                    </View>
                    <View style={styles.iconCircle}>
                      <Image source={require("@/assets/images/favicon.png")} style={styles.userIcon} />
                    </View>
                  </View>

                  <View style={styles.scaleToggleRow}>
                    <Pressable
                      onPress={() => switchScale("5.0")}
                      style={[styles.scalePill, scale === "5.0" && styles.scalePillActive]}
                      accessibilityRole="button"
                      accessibilityLabel="Use 5.0 grading scale"
                    >
                      <Text style={[styles.scalePillText, scale === "5.0" && styles.scalePillTextActive]}>5.0 Scale</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => switchScale("4.0")}
                      style={[styles.scalePill, scale === "4.0" && styles.scalePillActive]}
                      accessibilityRole="button"
                      accessibilityLabel="Use 4.0 grading scale"
                    >
                      <Text style={[styles.scalePillText, scale === "4.0" && styles.scalePillTextActive]}>4.0 Scale</Text>
                    </Pressable>
                  </View>

                  <View style={styles.cgpaBox}>
                    <Text style={styles.cgpaLabel}>CURRENT CGPA</Text>
                    <Text style={styles.cgpaValue}>{cgpa}</Text>
                    <View style={[styles.performanceBadge, { backgroundColor: performance.tone }]}>
                      <MaterialCommunityIcons name={performance.icon} size={15} color={colors.onBrand} />
                      <Text style={styles.performanceText}>{performance.title}</Text>
                    </View>
                    <Text style={styles.cgpaHelper}>
                      {totalUnits} unit{totalUnits !== 1 ? "s" : ""} • {semesters.length} semester
                      {semesters.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>

              {/* QUICK STATS */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: `${colors.brand}12` }]}>
                    <MaterialCommunityIcons name="book-open-variant" size={18} color={colors.brand} />
                  </View>
                  <Text style={styles.statValue}>{semesters.length}</Text>
                  <Text style={styles.statLabel}>Semesters</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: `${colors.green}12` }]}>
                    <MaterialCommunityIcons name="calculator-variant" size={18} color={colors.green} />
                  </View>
                  <Text style={styles.statValue}>{totalUnits}</Text>
                  <Text style={styles.statLabel}>Total Units</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: `${colors.orange}12` }]}>
                    <MaterialCommunityIcons name="trending-up" size={18} color={colors.orange} />
                  </View>
                  <Text style={styles.statValue}>{bestSemesterGpa}</Text>
                  <Text style={styles.statLabel}>Best GPA</Text>
                </View>
              </View>

              {/* SEMESTERS */}
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{editingId ? "Edit Record" : "Semester Details"}</Text>
                {editingId && (
                  <Pressable
                    onPress={cancelEdit}
                    style={styles.cancelEditButton}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing and start a new record"
                  >
                    <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                    <Text style={styles.cancelEditText}>Cancel Edit</Text>
                  </Pressable>
                )}
              </View>

              {semesters.map((semester, index) => (
                <View key={index} style={styles.semesterCard}>
                  <View style={styles.semesterHeader}>
                    <View>
                      <Text style={styles.semesterTitle}>Semester {index + 1}</Text>
                      <Text style={styles.semesterSubtitle}>Enter units & GPA for this term</Text>
                    </View>
                    {semesters.length > 1 && (
                      <Pressable
                        onPress={() => removeSemester(index)}
                        style={styles.deleteButton}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove semester ${index + 1}`}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.red} />
                      </Pressable>
                    )}
                  </View>

                  <Text style={styles.fieldLabel}>Semester Identifier</Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={18} color={colors.brand} />
                    <TextInput
                      placeholder="e.g. 100L First Semester"
                      placeholderTextColor={colors.grey}
                      style={styles.input}
                      value={semester.name}
                      onChangeText={(text) => updateSemester(index, "name", text)}
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <Text style={styles.fieldLabel}>Total Units</Text>
                      <View style={[styles.inputContainer, semesterErrors[index]?.units && styles.inputContainerError]}>
                        <MaterialCommunityIcons name="book-education-outline" size={18} color={colors.brand} />
                        <TextInput
                          keyboardType="numeric"
                          placeholder="Units"
                          placeholderTextColor={colors.grey}
                          style={styles.input}
                          value={semester.units}
                          onChangeText={(text) => updateSemester(index, "units", text.replace(/[^0-9]/g, ""))}
                          returnKeyType="next"
                        />
                      </View>
                      {semesterErrors[index]?.units && <Text style={styles.errorText}>{semesterErrors[index].units}</Text>}
                    </View>

                    <View style={styles.inputHalf}>
                      <Text style={styles.fieldLabel}>Semester GPA</Text>
                      <View style={[styles.inputContainer, semesterErrors[index]?.gpa && styles.inputContainerError]}>
                        <MaterialCommunityIcons name="chart-line" size={18} color={colors.brand} />
                        <TextInput
                          keyboardType="decimal-pad"
                          placeholder={`Max ${scale}`}
                          placeholderTextColor={colors.grey}
                          style={styles.input}
                          value={semester.gpa}
                          onChangeText={(text) => updateSemester(index, "gpa", text.replace(/[^0-9.]/g, ""))}
                          returnKeyType="done"
                        />
                      </View>
                      {semesterErrors[index]?.gpa && <Text style={styles.errorText}>{semesterErrors[index].gpa}</Text>}
                    </View>
                  </View>

                  <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>Calculated Points</Text>
                    <Text style={styles.previewValue}>
                      {((Number(semester.units) || 0) * (Number(semester.gpa) || 0)).toFixed(2)} pts
                    </Text>
                  </View>
                </View>
              ))}

              {/* ACTIONS */}
              <Pressable onPress={addSemester} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Add another semester">
                <Ionicons name="add-circle-outline" size={20} color={colors.ink} />
                <Text style={styles.addButtonText}>Add Another Semester</Text>
              </Pressable>

              <Pressable
                onPress={saveRecord}
                disabled={saving || !canSave}
                style={[styles.saveButton, (saving || !canSave) && styles.saveButtonDisabled]}
                accessibilityLabel={editingId ? "Update record" : "Save CGPA"}
              >
                <LinearGradient colors={[colors.brand, colors.brandDark || colors.brand]} style={styles.saveGradient}>
                  <Animated.View style={saving ? { transform: [{ rotate: spin }] } : undefined}>
                    <MaterialCommunityIcons
                      name={saving ? "loading" : editingId ? "content-save-edit" : "content-save"}
                      size={18}
                      color={colors.onBrand}
                    />
                  </Animated.View>
                  <Text style={styles.saveText}>
                    {saving ? "Saving..." : editingId ? "Update Record" : "Save CGPA"}
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* SAVED RECORDS */}
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyTitle}>Saved Records</Text>
                  <Text style={styles.historySubtitle}>Your academic progress logs</Text>
                </View>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>{sortedRecords.length}</Text>
                </View>
              </View>

              {sortedRecords.length > 1 && (
                <View style={styles.sortRowContainer}>
                  <View style={styles.sortRow}>
                    <Pressable
                      onPress={() => setSortBy("recent")}
                      style={[styles.sortPill, sortBy === "recent" && styles.sortPillActive]}
                    >
                      <Text style={[styles.sortPillText, sortBy === "recent" && styles.sortPillTextActive]}>Recent</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSortBy("highest")}
                      style={[styles.sortPill, sortBy === "highest" && styles.sortPillActive]}
                    >
                      <Text style={[styles.sortPillText, sortBy === "highest" && styles.sortPillTextActive]}>Highest CGPA</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {sortedRecords.length ? (
                sortedRecords.map((item) => {
                  const totalSemesters = item.semesters?.length || 0;
                  const recordClass = getClassification(item.cgpa, item.scale || "5.0", colors);
                  const isEditingThis = item.id === editingId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => loadRecordForEdit(item)}
                      style={[styles.recordCard, isEditingThis && styles.recordCardActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`Load record with CGPA ${Number(item.cgpa || 0).toFixed(2)} for editing`}
                    >
                      <View style={styles.recordLeft}>
                        <View style={styles.recordIcon}>
                          <MaterialCommunityIcons name="school" size={20} color={colors.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recordCgpa}>CGPA {Number(item.cgpa || 0).toFixed(2)}</Text>
                          <Text style={styles.recordSemesters}>
                            {totalSemesters} Semester{totalSemesters !== 1 ? "s" : ""} • {item.scale || "5.0"} scale
                          </Text>
                          {item.createdAt?.toDate && (
                            <Text style={styles.recordDate}>{item.createdAt.toDate().toLocaleDateString()}</Text>
                          )}
                          <View style={[styles.classChip, { backgroundColor: recordClass.tone }]}>
                            <Text style={styles.classChipText}>{recordClass.title}</Text>
                          </View>
                        </View>
                      </View>
                      <Pressable
                        style={styles.deleteRecordButton}
                        accessibilityRole="button"
                        accessibilityLabel="Delete record"
                        hitSlop={8}
                        onPress={() => confirmDelete(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.red} />
                      </Pressable>
                    </Pressable>
                  );
                })
              ) : (
                <EmptyState
                  icon="analytics-outline"
                  title="No Records Saved"
                  description="Save your CGPA calculations to track your academic performance over time."
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </>
      )}
    </ScreenShell>
  );
}