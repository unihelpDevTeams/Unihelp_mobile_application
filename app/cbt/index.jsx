import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  FlatList,
  Animated,
  BackHandler,
  Modal,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { PageLoader } from '../../src/shared/components/AILoaders';
import { useTheme } from '../../src/shared/theme/ThemeContext';

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const COURSES_URL = 'https://taired-cbt.puter.site/api/v1/courses.json';
const FETCH_TIMEOUT_MS = 15000;
const PASS_MARK = 50;
const MAX_MINUTES = 300;
const MAX_HISTORY = 50;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const FONT_LEVELS = [-2, 0, 2, 4];
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const USER_KEY = 'cbt_username';
const HISTORY_KEY = 'cbt_history_v2';
const SESSION_KEY = 'cbt_session_v1';
const COURSES_KEY = 'cbt_courses_cache_v1';

const STATUS = {
  NOT_VISITED: 'not-visited',
  NOT_ANSWERED: 'not-answered',
  ANSWERED: 'answered',
  MARKED: 'marked',
  ANSWERED_MARKED: 'answered-marked',
};

// Question banks stay in memory for the session: retaking a paper costs no network.
const BANK_CACHE = new Map();

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function formatClock(totalSeconds) {
  const t = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${String(h).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}

const digitsOnly = (text) => String(text || '').replace(/[^0-9]/g, '').slice(0, 4);

// Fisher-Yates: the old `sort(() => 0.5 - Math.random())` is biased.
function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function fetchJson(url, { timeout = FETCH_TIMEOUT_MS, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const onAbort = () => controller.abort();
  signal?.addEventListener?.('abort', onAbort);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onAbort);
  }
}

const suggestMinutes = (qty) => Math.max(5, Math.round((qty * 0.75) / 5) * 5);

const pctOf = (score, total) => (total ? Math.round((score / total) * 100) : 0);

// Turns a raw API question into a normalised one. Correct answers are stored as an INDEX
// (not option text) so two options with identical text can never both be "correct".
// Returns null for unusable questions so they are skipped instead of silently marking option A.
function normalizeQuestion(q, index, courseTitle) {
  if (!q || !String(q.question || '').trim()) return null;
  const fromArray = Array.isArray(q.options);
  const options = (fromArray ? q.options : [q.a, q.b, q.c, q.d, q.e].filter(Boolean)).map((o) => String(o).trim());
  if (options.length < 2 || options.length > LETTERS.length) return null;

  let correctIndex = -1;
  const ans = q.answer ?? q.correct;
  if (typeof ans === 'string') {
    const t = ans.trim();
    if (/^[A-Fa-f]$/.test(t)) {
      if (fromArray) correctIndex = t.toUpperCase().charCodeAt(0) - 65;
      else {
        const v = q[t.toLowerCase()];
        correctIndex = v != null ? options.indexOf(String(v).trim()) : -1;
      }
    } else {
      correctIndex = options.findIndex((o) => o.toLowerCase() === t.toLowerCase());
    }
  }
  if (correctIndex < 0 || correctIndex >= options.length) return null;

  return {
    id: `Q-${index}-${Math.random().toString(36).slice(2, 8)}`,
    courseTitle,
    question: String(q.question).trim(),
    options,
    correctIndex,
    explanation: q.explanation ? String(q.explanation).trim() : '',
  };
}

// Tiny safe expression parser for the calculator (replaces `Function(...)` eval).
function evaluateExpression(input) {
  const src = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  let pos = 0;
  const fail = () => {
    throw new Error('bad expression');
  };
  const parseNumber = () => {
    const m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(pos));
    if (!m) fail();
    pos += m[0].length;
    return parseFloat(m[0]);
  };
  const parseFactor = () => {
    if (src[pos] === '-') {
      pos += 1;
      return -parseFactor();
    }
    if (src[pos] === '+') {
      pos += 1;
      return parseFactor();
    }
    let v;
    if (src[pos] === '(') {
      pos += 1;
      v = parseExpr();
      if (src[pos] !== ')') fail();
      pos += 1;
    } else {
      v = parseNumber();
    }
    while (src[pos] === '%') {
      pos += 1;
      v /= 100;
    }
    return v;
  };
  const parseTerm = () => {
    let v = parseFactor();
    while (src[pos] === '*' || src[pos] === '/') {
      const op = src[pos];
      pos += 1;
      const r = parseFactor();
      if (op === '/' && r === 0) fail();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  function parseExpr() {
    let v = parseTerm();
    while (src[pos] === '+' || src[pos] === '-') {
      const op = src[pos];
      pos += 1;
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  const result = parseExpr();
  if (pos !== src.length || !Number.isFinite(result)) fail();
  return result;
}

const formatNumber = (n) => String(Number(n.toPrecision(12)));

const CALC_ROWS = [
  ['C', '⌫', '(', ')'],
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '-'],
  ['0', '.', '%', '+'],
];
const CALC_OPS = /^[+\-×÷]$/;

/* -------------------------------------------------------------------------- */
/*                                    Theme                                   */
/* -------------------------------------------------------------------------- */
// Resolved from the app's own ThemeContext (`isDark`), not the device colour scheme.
// Tokens marked "fallback" fall back to hand-picked hex values if your theme lacks them.
function useCbtTheme(colors, isDark) {
  return useMemo(() => {
    const c = colors || {};
    return {
      textPrimary: c.textPrimary ?? (isDark ? '#F8FAFC' : '#0F172A'),
      textSecondary: c.textSecondary ?? (isDark ? '#CBD5E1' : '#475569'),
      textMuted: c.inkMuted ?? '#94A3B8',
      border: c.borderDefault ?? (isDark ? '#1E293B' : '#E2E8F0'),
      greenTint: c.greenLight ?? (isDark ? 'rgba(16,185,129,0.16)' : 'rgba(16,185,129,0.10)'),
      dangerTint: c.dangerLight ?? (isDark ? 'rgba(244,63,94,0.16)' : 'rgba(244,63,94,0.10)'),

      bg: c.background ?? (isDark ? '#020617' : '#F8FAFC'),
      card: c.surfacePrimary ?? c.surfaceSecondary ?? (isDark ? '#0F172A' : '#FFFFFF'),
      input: c.surfaceInput ?? (isDark ? '#1E293B' : '#F8FAFC'),
      chip: c.surfaceChip ?? (isDark ? '#1E293B' : '#F1F5F9'),
      overlay: 'rgba(2,6,23,0.62)',

      indigo: '#4F46E5',
      indigoTint: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)',
      green: '#10B981',
      rose: '#F43F5E',
      amber: '#F59E0B',
      amberTint: isDark ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.12)',
      slate: '#64748B',
      white: '#FFFFFF',

      // exam "terminal" chrome stays dark in both themes (it is the CBT look)
      terminal: '#0B1220',
      terminalSoft: '#1A2438',
      terminalMuted: '#94A3B8',
    };
  }, [colors, isDark]);
}

const STATUS_META = (T) => ({
  [STATUS.NOT_VISITED]: { label: 'Unvisited', bg: T.slate },
  [STATUS.NOT_ANSWERED]: { label: 'Unanswered', bg: T.rose },
  [STATUS.ANSWERED]: { label: 'Answered', bg: T.green },
  [STATUS.MARKED]: { label: 'Flagged', bg: T.amber },
  [STATUS.ANSWERED_MARKED]: { label: 'Answered + flagged', bg: T.indigo },
});

/* -------------------------------------------------------------------------- */
/*                                   Styles                                   */
/* -------------------------------------------------------------------------- */

const makeStyles = (T) =>
  StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
    centerTitle: { fontSize: 20, fontWeight: '800', color: T.textPrimary, marginTop: 16, textAlign: 'center' },
    centerText: { textAlign: 'center', color: T.textMuted, marginTop: 8, lineHeight: 20 },
    screenPad: { paddingHorizontal: 16, paddingTop: 12 },

    primaryBtn: { backgroundColor: T.indigo, paddingVertical: 15, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: T.indigo, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    primaryBtnText: { color: T.white, fontWeight: '800', fontSize: 15 },
    secondaryBtn: { backgroundColor: T.chip, paddingVertical: 14, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    secondaryBtnText: { color: T.textSecondary, fontWeight: '700', fontSize: 14 },
    btnDisabled: { backgroundColor: T.chip, shadowOpacity: 0, elevation: 0 },
    btnDisabledText: { color: T.textMuted },

    card: { backgroundColor: T.card, borderRadius: 22, borderWidth: 1, borderColor: T.border, padding: 20 },

    /* Browse */
    hero: { backgroundColor: T.indigo, borderRadius: 26, padding: 20, marginBottom: 16, shadowColor: T.indigo, shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    heroEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, fontWeight: '700' },
    heroTitle: { color: T.white, fontSize: 24, fontWeight: '900', marginTop: 4 },
    heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, marginTop: 6, lineHeight: 19, maxWidth: 240 },
    heroIconBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 16 },
    heroStats: { flexDirection: 'row', gap: 10, marginTop: 18 },
    heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
    heroStatValue: { color: T.white, fontSize: 18, fontWeight: '900' },
    heroStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 1 },

    resumeCard: { backgroundColor: T.indigoTint, borderColor: T.indigo, borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 16 },
    resumeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    resumeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.indigo, alignItems: 'center', justifyContent: 'center' },
    resumeTitle: { color: T.textPrimary, fontWeight: '800', fontSize: 14.5 },
    resumeMeta: { color: T.textSecondary, fontSize: 12, marginTop: 2 },
    resumeActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
    resumeBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },

    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.amberTint, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
    bannerText: { flex: 1, color: T.textSecondary, fontSize: 12.5, lineHeight: 17 },

    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: T.border, marginBottom: 18 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15.5, color: T.textPrimary, paddingVertical: 13 },
    sectionLabel: { fontSize: 13, fontWeight: '800', color: T.textSecondary, marginBottom: 12 },

    courseRow: { justifyContent: 'space-between' },
    courseCard: { width: '48.5%', backgroundColor: T.card, padding: 16, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: T.border },
    courseIcon: { backgroundColor: T.indigoTint, width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    courseTitle: { fontWeight: '800', color: T.textPrimary, fontSize: 14.5, lineHeight: 19, marginBottom: 4, minHeight: 38 },
    courseMeta: { fontSize: 12, color: T.textMuted, fontWeight: '600' },
    bestPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 10 },
    bestText: { fontSize: 11, fontWeight: '800' },
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { color: T.textMuted, fontWeight: '600', marginTop: 12, textAlign: 'center' },

    /* History */
    historyItem: { backgroundColor: T.card, padding: 16, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: T.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    historyTitle: { fontWeight: '800', fontSize: 15, color: T.textPrimary },
    historyMeta: { fontSize: 11.5, color: T.textMuted, marginTop: 4 },
    historyScore: { alignItems: 'center', backgroundColor: T.chip, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, minWidth: 74 },
    historyScoreValue: { fontWeight: '900', fontSize: 17 },
    historyScorePct: { fontSize: 11, color: T.textMuted, fontWeight: '700', marginTop: 1 },
    clearHistoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
    clearHistoryText: { color: T.rose, fontWeight: '700', fontSize: 13 },

    /* Setup */
    setupHeader: { borderBottomWidth: 1, borderBottomColor: T.border, paddingBottom: 16, marginBottom: 20 },
    setupEyebrow: { fontSize: 12.5, fontWeight: '700', color: T.indigo, marginBottom: 4 },
    setupTitle: { fontSize: 23, fontWeight: '900', color: T.textPrimary },
    fieldLabel: { fontWeight: '700', color: T.textSecondary, marginBottom: 8, fontSize: 13.5 },
    fieldInput: { backgroundColor: T.input, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: T.border, color: T.textPrimary },
    fieldInputError: { borderColor: T.rose },
    fieldHint: { fontSize: 12, color: T.textMuted, marginTop: 6 },
    fieldError: { fontSize: 12, color: T.rose, marginTop: 6, fontWeight: '600' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: T.chip, borderWidth: 1, borderColor: 'transparent' },
    chipActive: { backgroundColor: T.indigoTint, borderColor: T.indigo },
    chipText: { fontSize: 12.5, fontWeight: '700', color: T.textSecondary },
    chipTextActive: { color: T.indigo },
    summaryBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: T.indigoTint, borderRadius: 14, padding: 14, marginBottom: 20 },
    summaryText: { flex: 1, color: T.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '600' },

    /* Instructions */
    tileRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    tile: { flex: 1, backgroundColor: T.input, borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: T.border },
    tileValue: { fontSize: 19, fontWeight: '900', color: T.textPrimary },
    tileLabel: { fontSize: 11.5, color: T.textMuted, fontWeight: '600', marginTop: 2 },
    ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    ruleText: { flex: 1, color: T.textSecondary, fontSize: 14, lineHeight: 20 },
    agreeBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18, backgroundColor: T.input, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: T.border },
    checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: T.slate },
    checkboxOn: { backgroundColor: T.indigo, borderColor: T.indigo },
    agreeText: { flex: 1, fontWeight: '600', color: T.textPrimary, fontSize: 14 },

    /* Exam: terminal chrome */
    terminalBar: { backgroundColor: T.terminal, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    termUser: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    termAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.indigo, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#818CF8' },
    termName: { color: T.white, fontWeight: '700', fontSize: 13 },
    termSub: { color: T.terminalMuted, fontSize: 11, marginTop: 1 },
    toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toolBtn: { height: 36, minWidth: 36, paddingHorizontal: 9, borderRadius: 11, backgroundColor: T.terminalSoft, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
    toolBtnOn: { backgroundColor: T.indigo },
    toolBtnText: { color: T.white, fontWeight: '700', fontSize: 12 },

    timerBar: { paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.terminalSoft },
    timerWarn: { backgroundColor: '#B45309' },
    timerCritical: { backgroundColor: T.rose },
    timerLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
    timerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timerValue: { color: T.white, fontFamily: MONO, fontWeight: '900', fontSize: 16, fontVariant: ['tabular-nums'] },
    progressTrack: { height: 3, backgroundColor: T.terminalSoft },
    progressFill: { height: 3, backgroundColor: T.green },

    /* Exam: question */
    qScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
    qCard: { backgroundColor: T.card, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: T.border, marginBottom: 16 },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    qLabel: { fontSize: 12.5, fontWeight: '800', color: T.indigo },
    flagPill: { backgroundColor: T.amberTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 },
    flagPillText: { fontSize: 11, fontWeight: '800', color: T.amber },
    qText: { color: T.textPrimary, fontWeight: '500' },
    optionsWrap: { gap: 10 },
    option: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.card },
    optionOn: { borderColor: T.indigo, backgroundColor: T.indigoTint },
    optionLetter: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: T.chip },
    optionLetterOn: { backgroundColor: T.indigo },
    optionLetterText: { fontWeight: '800', fontSize: 12.5, color: T.textSecondary },
    optionText: { flex: 1, fontWeight: '500', color: T.textPrimary },
    clearBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14, paddingVertical: 8, paddingHorizontal: 12 },
    clearText: { color: T.textMuted, fontWeight: '700', fontSize: 13 },

    dock: { backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.border, paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    dockBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
    dockText: { fontWeight: '800', fontSize: 13 },

    /* Calculator */
    calc: { position: 'absolute', top: 10, right: 12, zIndex: 50, backgroundColor: T.terminal, borderWidth: 1, borderColor: '#334155', padding: 14, borderRadius: 20, width: 264, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
    calcHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    calcTitle: { color: T.terminalMuted, fontSize: 12, fontWeight: '700' },
    calcScreen: { backgroundColor: 'rgba(0,0,0,0.55)', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'flex-end', minHeight: 70, justifyContent: 'flex-end' },
    calcExpr: { color: T.terminalMuted, fontFamily: MONO, fontSize: 13 },
    calcResult: { color: T.green, fontFamily: MONO, fontSize: 24, fontWeight: '700', marginTop: 2 },
    calcRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    calcKey: { flex: 1, backgroundColor: T.terminalSoft, paddingVertical: 11, borderRadius: 11, alignItems: 'center' },
    calcKeyOp: { backgroundColor: '#312E81' },
    calcKeyText: { color: T.white, fontWeight: '700', fontSize: 16 },
    calcEquals: { backgroundColor: T.indigo, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },

    /* Palette sheet */
    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: T.overlay },
    sheet: { backgroundColor: T.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, maxHeight: '82%' },
    sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, marginBottom: 12 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sheetTitle: { fontSize: 19, fontWeight: '900', color: T.textPrimary },
    sheetClose: { backgroundColor: T.chip, padding: 8, borderRadius: 999 },
    countRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    countBox: { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
    countValue: { fontSize: 18, fontWeight: '900' },
    countLabel: { fontSize: 11, fontWeight: '700', marginTop: 1 },
    gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 },
    gridCell: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    gridCellCurrent: { borderColor: T.textPrimary },
    gridText: { color: T.white, fontWeight: '800' },
    legend: { backgroundColor: T.input, padding: 14, borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 16 },
    legendItem: { flexDirection: 'row', alignItems: 'center', width: '48%' },
    legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
    legendText: { fontSize: 12, fontWeight: '600', color: T.textSecondary },

    /* Results */
    resultCard: { backgroundColor: T.card, padding: 24, borderRadius: 26, borderWidth: 1, borderColor: T.border, alignItems: 'center', marginBottom: 24 },
    ring: { width: 124, height: 124, borderRadius: 62, borderWidth: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    ringValue: { fontSize: 30, fontWeight: '900' },
    resultName: { fontSize: 14, fontWeight: '700', color: T.indigo, marginBottom: 2 },
    resultScore: { fontSize: 22, fontWeight: '900', color: T.textPrimary },
    resultGrade: { fontSize: 13.5, color: T.textSecondary, marginTop: 4, textAlign: 'center', lineHeight: 19 },
    statRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 22 },
    statTile: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '900' },
    statLabel: { fontSize: 11.5, fontWeight: '700', marginTop: 1 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
    timeText: { color: T.textMuted, fontWeight: '600', fontSize: 13 },
    resultActions: { flexDirection: 'row', gap: 12, marginTop: 22, width: '100%' },
    reviewTitle: { fontWeight: '900', fontSize: 18, color: T.textPrimary, marginBottom: 12 },
    filterRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: T.border, backgroundColor: T.card },
    filterChipOn: { backgroundColor: T.indigo, borderColor: T.indigo },
    filterText: { fontSize: 12.5, fontWeight: '700', color: T.textMuted },
    filterTextOn: { color: T.white },
    reviewCard: { backgroundColor: T.card, padding: 18, borderRadius: 18, marginBottom: 14, borderWidth: 1, borderColor: T.border },
    reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    reviewQNum: { fontSize: 12.5, fontWeight: '800', color: T.indigo },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    reviewQuestion: { fontSize: 15.5, color: T.textPrimary, fontWeight: '500', lineHeight: 22, marginBottom: 14 },
    reviewOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 8 },
    reviewOptCorrect: { borderColor: T.green, backgroundColor: T.greenTint },
    reviewOptWrong: { borderColor: T.rose, backgroundColor: T.dangerTint },
    reviewLetter: { width: 26, height: 26, borderRadius: 9, backgroundColor: T.chip, alignItems: 'center', justifyContent: 'center' },
    reviewLetterText: { fontSize: 11.5, fontWeight: '800', color: T.textSecondary },
    reviewOptText: { flex: 1, color: T.textPrimary, fontSize: 14 },
    explainBox: { backgroundColor: T.indigoTint, padding: 14, borderRadius: 12, marginTop: 6 },
    explainTitle: { fontSize: 12.5, fontWeight: '800', color: T.indigo, marginBottom: 4 },
    explainText: { fontSize: 14, color: T.textPrimary, lineHeight: 20 },

    /* Dialog */
    dialogBackdrop: { flex: 1, backgroundColor: T.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    dialogCard: { backgroundColor: T.card, borderRadius: 26, padding: 24, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
    dialogIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center' },
    dialogTitle: { fontSize: 18, fontWeight: '900', color: T.textPrimary, textAlign: 'center', marginBottom: 8 },
    dialogMessage: { fontSize: 14, color: T.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
    dialogBtn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
    dialogBtnText: { fontWeight: '800', fontSize: 14 },
  });

/* -------------------------------------------------------------------------- */
/*                              Small components                              */
/* -------------------------------------------------------------------------- */

// In-app dialog (replaces Alert.alert). Backdrop tap only ever closes it; it never triggers an action.
function ConfirmDialogModal({ dialog, onClose, T, s }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!dialog) return;
    scale.setValue(0.92);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 }),
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [dialog, scale, opacity]);

  if (!dialog) return null;
  const { icon, iconColor = T.indigo, iconBg = T.indigoTint, title, message, actions = [] } = dialog;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={s.dialogBackdrop}>
        <Animated.View style={{ transform: [{ scale }], opacity, width: '100%', maxWidth: 360 }}>
          <Pressable onPress={() => {}} style={s.dialogCard}>
            {icon ? (
              <View style={[s.dialogIcon, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={26} color={iconColor} />
              </View>
            ) : null}
            {title ? <Text style={s.dialogTitle}>{title}</Text> : null}
            {message ? <Text style={s.dialogMessage}>{message}</Text> : null}
            <View style={{ gap: 10 }}>
              {actions.map((action) => {
                const bg = action.variant === 'destructive' ? T.rose : action.variant === 'secondary' ? T.chip : T.indigo;
                const color = action.variant === 'secondary' ? T.textSecondary : T.white;
                return (
                  <TouchableOpacity
                    key={action.key}
                    onPress={action.onPress}
                    style={[s.dialogBtn, { backgroundColor: bg }]}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <Text style={[s.dialogBtnText, { color }]}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function ChoiceChip({ label, active, onPress, s }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.chip, active && s.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const CourseCard = React.memo(function CourseCard({ course, best, onPress, s, T }) {
  const good = best != null && best >= PASS_MARK;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(course)}
      style={s.courseCard}
      accessibilityRole="button"
      accessibilityLabel={`Practise ${course.title}, ${course.question_count} questions`}
    >
      <View style={s.courseIcon}>
        <MaterialCommunityIcons name="file-document-edit-outline" size={22} color={T.indigo} />
      </View>
      <Text style={s.courseTitle} numberOfLines={2}>{course.title}</Text>
      <Text style={s.courseMeta}>{course.question_count} questions</Text>
      {best != null ? (
        <View style={[s.bestPill, { backgroundColor: good ? T.greenTint : T.dangerTint }]}>
          <Ionicons name="ribbon-outline" size={12} color={good ? T.green : T.rose} />
          <Text style={[s.bestText, { color: good ? T.green : T.rose }]}>Best {best}%</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

/* -------------------------------------------------------------------------- */
/*                                   Screen                                   */
/* -------------------------------------------------------------------------- */

export default function CBTPracticeScreen({ customTopNode, isEmbedded }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const T = useCbtTheme(colors, isDark);
  const s = useMemo(() => makeStyles(T), [T]);
  const statusMeta = useMemo(() => STATUS_META(T), [T]);

  // Catalogue
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [offline, setOffline] = useState(false);

  // 'browse' | 'history' | 'setup' | 'instructions' | 'exam' | 'results'
  const [stage, setStage] = useState('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState([]);
  const [resumable, setResumable] = useState(null);

  // Setup
  const [setupCourse, setSetupCourse] = useState(null);
  const [numQuestions, setNumQuestions] = useState('20');
  const [timeLimit, setTimeLimit] = useState('15');
  const [timeTouched, setTimeTouched] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [username, setUsername] = useState('');

  // Active session
  const [activeCourse, setActiveCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionIndex]: optionIndex }
  const [markedForReview, setMarkedForReview] = useState({});
  const [visited, setVisited] = useState({});
  const [endsAt, setEndsAt] = useState(null); // wall-clock deadline: immune to timer drift / backgrounding
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTimeAllocated, setTotalTimeAllocated] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);

  // Tools
  const [showPalette, setShowPalette] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [calc, setCalc] = useState({ expr: '', result: null, justEvaluated: false });
  const [fontLevel, setFontLevel] = useState(1);

  const [reviewFilter, setReviewFilter] = useState('all');
  const [dialog, setDialog] = useState(null);
  const closeDialog = useCallback(() => setDialog(null), []);

  const submittedRef = useRef(false);
  const loadTokenRef = useRef(0);
  const abortRef = useRef(null);
  const lastConfigRef = useRef(null);
  const examScrollRef = useRef(null);

  // Latest values for stable callbacks / the back handler.
  const live = useRef({});
  live.current = { stage, showCalc, loadingQuestions, dialog, questions, answers, activeCourse, username, endsAt, totalTimeAllocated };

  const displayName = username.trim() || 'Candidate';

  /* ------------------------------ Data loading ----------------------------- */

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchJson(COURSES_URL);
      if (data?.status !== 'success' || !Array.isArray(data.courses)) throw new Error('bad payload');
      setCourses(data.courses);
      setOffline(false);
      AsyncStorage.setItem(COURSES_KEY, JSON.stringify(data.courses)).catch(() => {});
    } catch (e) {
      // Fall back to the last good catalogue so the screen stays useful offline.
      try {
        const cached = await AsyncStorage.getItem(COURSES_KEY);
        const list = cached ? JSON.parse(cached) : null;
        if (Array.isArray(list) && list.length) {
          setCourses(list);
          setOffline(true);
        } else {
          setLoadError(true);
        }
      } catch (err) {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [savedUser, savedHistory, savedSession] = await Promise.all([
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(HISTORY_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        if (savedUser) setUsername(savedUser);
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        if (savedSession) {
          const snap = JSON.parse(savedSession);
          if (snap?.endsAt > Date.now() && Array.isArray(snap.questions) && snap.questions.length) setResumable(snap);
          else AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
        }
      } catch (e) {
        // storage is best-effort
      }
    })();
    loadCourses();
    return () => abortRef.current?.abort();
  }, [loadCourses]);

  /* ------------------------------ Derived data ----------------------------- */

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((c) => c.title.toLowerCase().includes(term) || String(c.id).toLowerCase().includes(term));
  }, [courses, searchTerm]);

  const bestByCourse = useMemo(() => {
    const map = {};
    history.forEach((h) => {
      const key = h.courseId || h.courseTitle;
      const pct = pctOf(h.score, h.totalQuestions);
      if (map[key] === undefined || pct > map[key]) map[key] = pct;
    });
    return map;
  }, [history]);

  const historyStats = useMemo(() => {
    if (!history.length) return { attempts: 0, average: 0 };
    const sum = history.reduce((acc, h) => acc + pctOf(h.score, h.totalQuestions), 0);
    return { attempts: history.length, average: Math.round(sum / history.length) };
  }, [history]);

  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    questions.forEach((q, idx) => {
      const a = answers[idx];
      if (a === undefined) skipped += 1;
      else if (a === q.correctIndex) correct += 1;
      else wrong += 1;
    });
    return { correct, wrong, skipped };
  }, [questions, answers]);

  const score = stats.correct;
  const percent = pctOf(score, questions.length);
  const isPass = percent >= PASS_MARK;

  const reviewList = useMemo(
    () =>
      questions.map((q, idx) => {
        const selected = answers[idx];
        return { q, idx, selected, isSkipped: selected === undefined, isCorrect: selected === q.correctIndex };
      }),
    [questions, answers]
  );

  const reviewCounts = useMemo(
    () => ({
      all: reviewList.length,
      correct: stats.correct,
      incorrect: stats.wrong,
      skipped: stats.skipped,
      marked: reviewList.filter((r) => markedForReview[r.idx]).length,
    }),
    [reviewList, stats, markedForReview]
  );

  const filteredReviewList = useMemo(() => {
    if (reviewFilter === 'correct') return reviewList.filter((r) => r.isCorrect);
    if (reviewFilter === 'incorrect') return reviewList.filter((r) => !r.isCorrect && !r.isSkipped);
    if (reviewFilter === 'skipped') return reviewList.filter((r) => r.isSkipped);
    if (reviewFilter === 'marked') return reviewList.filter((r) => markedForReview[r.idx]);
    return reviewList;
  }, [reviewList, reviewFilter, markedForReview]);

  const statusFor = useCallback(
    (index) => {
      const isAnswered = answers[index] !== undefined;
      const isMarked = Boolean(markedForReview[index]);
      if (isAnswered && isMarked) return STATUS.ANSWERED_MARKED;
      if (isMarked) return STATUS.MARKED;
      if (isAnswered) return STATUS.ANSWERED;
      if (visited[index]) return STATUS.NOT_ANSWERED;
      return STATUS.NOT_VISITED;
    },
    [answers, markedForReview, visited]
  );

  const paletteCounts = useMemo(() => {
    const out = { answered: 0, flagged: 0, remaining: 0 };
    questions.forEach((_, i) => {
      if (answers[i] !== undefined) out.answered += 1;
      else out.remaining += 1;
      if (markedForReview[i]) out.flagged += 1;
    });
    return out;
  }, [questions, answers, markedForReview]);

  /* -------------------------------- Setup ---------------------------------- */

  const setupCourseObj = useMemo(() => courses.find((c) => c.id === setupCourse) || null, [courses, setupCourse]);
  const maxQuestions = setupCourseObj?.question_count || 0;
  const qtyNum = parseInt(numQuestions, 10) || 0;
  const minsNum = parseInt(timeLimit, 10) || 0;
  const qtyError = qtyNum < 1 ? 'Enter at least 1 question.' : maxQuestions && qtyNum > maxQuestions ? `This paper has ${maxQuestions} questions.` : null;
  const timeError = minsNum < 1 ? 'Enter at least 1 minute.' : minsNum > MAX_MINUTES ? `The maximum is ${MAX_MINUTES} minutes.` : null;
  const setupValid = !qtyError && !timeError;

  const qtyPresets = useMemo(() => {
    const base = [10, 20, 40].filter((n) => !maxQuestions || n < maxQuestions);
    return maxQuestions ? [...base, maxQuestions] : base;
  }, [maxQuestions]);

  const beginSetup = useCallback((course) => {
    const qty = Math.min(20, course?.question_count || 20);
    setSetupCourse(course.id);
    setNumQuestions(String(qty));
    setTimeLimit(String(suggestMinutes(qty)));
    setTimeTouched(false);
    setStage('setup');
  }, []);

  const changeQuantity = (value) => {
    const clean = digitsOnly(value);
    setNumQuestions(clean);
    // Keep the duration in step with the question count until the user sets it themselves.
    if (!timeTouched && parseInt(clean, 10) > 0) setTimeLimit(String(suggestMinutes(parseInt(clean, 10))));
  };

  const changeTime = (value) => {
    setTimeTouched(true);
    setTimeLimit(digitsOnly(value));
  };

  /* ---------------------------- Exam lifecycle ----------------------------- */

  const resetAll = useCallback(() => {
    setStage('browse');
    setSetupCourse(null);
    setActiveCourse(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setMarkedForReview({});
    setVisited({});
    setReviewFilter('all');
    setEndsAt(null);
    setShowCalc(false);
    setShowPalette(false);
    setLoadingQuestions(false);
  }, []);

  const finishExam = useCallback(
    async ({ abandoned = false } = {}) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
      setResumable(null);

      if (abandoned) {
        resetAll();
        return;
      }

      const snap = live.current;
      const left = Math.max(0, Math.ceil(((snap.endsAt || Date.now()) - Date.now()) / 1000));
      const taken = Math.max(0, Math.min(snap.totalTimeAllocated, snap.totalTimeAllocated - left));
      setTimeSpent(taken);
      setShowCalc(false);
      setShowPalette(false);
      setStage('results');

      try {
        const correct = snap.questions.reduce((acc, q, idx) => (snap.answers[idx] === q.correctIndex ? acc + 1 : acc), 0);
        const record = {
          id: Date.now().toString(),
          candidate: snap.username.trim() || 'Candidate',
          courseId: snap.activeCourse?.id,
          courseTitle: snap.activeCourse?.title,
          score: correct,
          totalQuestions: snap.questions.length,
          timeTaken: taken,
          date: new Date().toISOString(),
        };
        const raw = await AsyncStorage.getItem(HISTORY_KEY);
        const saved = raw ? JSON.parse(raw) : [];
        const next = [record, ...saved].slice(0, MAX_HISTORY);
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        setHistory(next);
      } catch (e) {
        // history is best-effort
      }
    },
    [resetAll]
  );

  const cancelLoading = useCallback(() => {
    loadTokenRef.current += 1;
    abortRef.current?.abort();
    setLoadingQuestions(false);
    setStage('setup');
  }, []);

  const launchExam = useCallback(async (course, qty, mins) => {
    const token = loadTokenRef.current + 1;
    loadTokenRef.current = token;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    submittedRef.current = false;
    lastConfigRef.current = { course, qty, mins };
    const name = live.current.username.trim();
    if (name) AsyncStorage.setItem(USER_KEY, name).catch(() => {});

    setActiveCourse(course);
    setQuestions([]);
    setAnswers({});
    setMarkedForReview({});
    setVisited({});
    setCurrentIndex(0);
    setEndsAt(null);
    setReviewFilter('all');
    setLoadingQuestions(true);
    setStage('exam');

    const failWith = (icon, title, message) => {
      if (token !== loadTokenRef.current) return;
      setStage('setup');
      setDialog({
        icon,
        iconColor: T.rose,
        iconBg: T.dangerTint,
        title,
        message,
        actions: [{ key: 'ok', label: 'OK', variant: 'primary', onPress: closeDialog }],
      });
    };

    try {
      let bank = BANK_CACHE.get(course.id);
      if (!bank) {
        const data = await fetchJson(course.endpoint, { signal: controller.signal });
        if (data?.status !== 'success' || !Array.isArray(data.data)) throw new Error('bad payload');
        bank = data.data;
        BANK_CACHE.set(course.id, bank);
      }
      if (token !== loadTokenRef.current) return;

      const picked = [];
      const pool = shuffle(bank);
      for (let i = 0; i < pool.length && picked.length < qty; i += 1) {
        const q = normalizeQuestion(pool[i], picked.length + 1, course.title);
        if (q) picked.push(q);
      }
      if (!picked.length) {
        failWith('close-circle', 'No usable questions', 'This paper has no valid questions right now. Please try another paper.');
        return;
      }

      const allocated = mins * 60;
      setQuestions(picked);
      setVisited({ 0: true });
      setTotalTimeAllocated(allocated);
      setTimeLeft(allocated);
      setEndsAt(Date.now() + allocated * 1000);
    } catch (error) {
      if (token !== loadTokenRef.current) return;
      failWith('cloud-offline', 'Could not load the paper', 'Check your internet connection and try again.');
    } finally {
      if (token === loadTokenRef.current) setLoadingQuestions(false);
    }
  }, [T, closeDialog]);

  const startFromSetup = () => {
    if (!setupCourseObj || !setupValid) return;
    launchExam(setupCourseObj, qtyNum, minsNum);
  };

  const retake = () => {
    const cfg = lastConfigRef.current;
    if (cfg) launchExam(cfg.course, cfg.qty, cfg.mins);
    else resetAll();
  };

  const resumeSession = () => {
    const snap = resumable;
    if (!snap || snap.endsAt <= Date.now()) {
      setResumable(null);
      AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
      return;
    }
    const course = courses.find((c) => c.id === snap.courseId) || { id: snap.courseId, title: snap.courseTitle };
    submittedRef.current = false;
    lastConfigRef.current = { course, qty: snap.questions.length, mins: Math.round(snap.total / 60) };
    setActiveCourse(course);
    setQuestions(snap.questions);
    setAnswers(snap.answers || {});
    setMarkedForReview(snap.marked || {});
    setVisited(snap.visited || {});
    setCurrentIndex(Math.min(snap.currentIndex || 0, snap.questions.length - 1));
    setTotalTimeAllocated(snap.total);
    setTimeLeft(Math.max(0, Math.ceil((snap.endsAt - Date.now()) / 1000)));
    setEndsAt(snap.endsAt);
    if (snap.username) setUsername(snap.username);
    setReviewFilter('all');
    setLoadingQuestions(false);
    setStage('exam');
  };

  const discardResumable = () => {
    setDialog({
      icon: 'trash',
      iconColor: T.rose,
      iconBg: T.dangerTint,
      title: 'Discard unfinished exam?',
      message: 'Your saved answers for this session will be deleted.',
      actions: [
        { key: 'keep', label: 'Keep it', variant: 'secondary', onPress: closeDialog },
        {
          key: 'discard',
          label: 'Discard',
          variant: 'destructive',
          onPress: () => {
            closeDialog();
            setResumable(null);
            AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
          },
        },
      ],
    });
  };

  // Timer: derive the remaining time from the deadline so it stays correct after the app was backgrounded.
  useEffect(() => {
    if (stage !== 'exam' || !endsAt) return undefined;
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [stage, endsAt]);

  // Auto-submit exactly once, and only for a fully loaded session (fixes instant auto-submit on retake).
  useEffect(() => {
    if (stage !== 'exam' || !endsAt || !questions.length || timeLeft > 0 || submittedRef.current) return;
    finishExam();
    setDialog({
      icon: 'time',
      iconColor: T.indigo,
      iconBg: T.indigoTint,
      title: "Time's up",
      message: 'Your test paper was submitted automatically.',
      actions: [{ key: 'ok', label: 'View results', variant: 'primary', onPress: closeDialog }],
    });
  }, [timeLeft, stage, endsAt, questions.length, finishExam, T, closeDialog]);

  const warnAt = Math.min(300, Math.round(totalTimeAllocated * 0.2));
  const criticalAt = Math.min(60, Math.round(totalTimeAllocated * 0.1));
  const timerState = timeLeft <= criticalAt ? 'critical' : timeLeft <= warnAt ? 'warn' : 'normal';

  useEffect(() => {
    if (stage !== 'exam' || !endsAt || !totalTimeAllocated) return;
    if (timeLeft === warnAt || timeLeft === criticalAt) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave so an app kill or crash never loses an exam in progress.
  useEffect(() => {
    if (stage !== 'exam' || !endsAt || !questions.length) return undefined;
    const timer = setTimeout(() => {
      if (submittedRef.current) return;
      AsyncStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          courseId: activeCourse?.id,
          courseTitle: activeCourse?.title,
          questions,
          answers,
          marked: markedForReview,
          visited,
          currentIndex,
          endsAt,
          total: totalTimeAllocated,
          username,
        })
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [stage, endsAt, questions, answers, markedForReview, visited, currentIndex, activeCourse, totalTimeAllocated, username]);

  /* ------------------------------- Exam actions ----------------------------- */

  const goToQuestion = useCallback((index) => {
    setCurrentIndex(index);
    setVisited((prev) => (prev[index] ? prev : { ...prev, [index]: true }));
    setShowPalette(false);
    examScrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, []);

  const selectOption = (optionIndex) => setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
  const clearAnswer = () =>
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
  const toggleMark = () => setMarkedForReview((prev) => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
  const goNext = () => currentIndex < questions.length - 1 && goToQuestion(currentIndex + 1);
  const goBack = () => currentIndex > 0 && goToQuestion(currentIndex - 1);

  const requestSubmit = useCallback(() => {
    const { questions: qs, answers: ans } = live.current;
    const unanswered = qs.length - Object.keys(ans).length;
    setDialog({
      icon: unanswered > 0 ? 'alert-circle' : 'checkmark-circle',
      iconColor: unanswered > 0 ? T.amber : T.green,
      iconBg: unanswered > 0 ? T.amberTint : T.greenTint,
      title: 'Submit test paper?',
      message:
        unanswered > 0
          ? `You still have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`
          : 'You have answered every question. Submit your paper now?',
      actions: [
        { key: 'continue', label: 'Keep working', variant: 'secondary', onPress: closeDialog },
        { key: 'submit', label: 'Yes, submit', variant: 'primary', onPress: () => { closeDialog(); finishExam(); } },
      ],
    });
  }, [T, closeDialog, finishExam]);

  const confirmExitExam = useCallback(() => {
    setDialog({
      icon: 'warning',
      iconColor: T.amber,
      iconBg: T.amberTint,
      title: 'Leave this exam?',
      message: 'Submit your answers for grading, or discard the session. The clock keeps running if you resume later.',
      actions: [
        { key: 'resume', label: 'Resume exam', variant: 'secondary', onPress: closeDialog },
        { key: 'submit', label: 'Submit and exit', variant: 'primary', onPress: () => { closeDialog(); finishExam(); } },
        { key: 'discard', label: 'Discard session', variant: 'destructive', onPress: () => { closeDialog(); finishExam({ abandoned: true }); } },
      ],
    });
  }, [T, closeDialog, finishExam]);

  live.current.confirmExit = confirmExitExam;

  const confirmClearHistory = () => {
    setDialog({
      icon: 'trash',
      iconColor: T.rose,
      iconBg: T.dangerTint,
      title: 'Clear test history?',
      message: 'All saved attempts and best scores will be removed from this device.',
      actions: [
        { key: 'cancel', label: 'Cancel', variant: 'secondary', onPress: closeDialog },
        {
          key: 'clear',
          label: 'Clear history',
          variant: 'destructive',
          onPress: () => {
            closeDialog();
            setHistory([]);
            AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
          },
        },
      ],
    });
  };

  // Hardware back: close overlays first, then step back through the flow.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const cur = live.current;
      if (cur.dialog) {
        setDialog(null);
        return true;
      }
      if (cur.showCalc) {
        setShowCalc(false);
        return true;
      }
      switch (cur.stage) {
        case 'exam':
          if (cur.loadingQuestions) cancelLoading();
          else cur.confirmExit();
          return true;
        case 'results':
          resetAll();
          return true;
        case 'instructions':
          setStage('setup');
          return true;
        case 'setup':
        case 'history':
          setStage('browse');
          return true;
        default:
          return false;
      }
    });
    return () => sub.remove();
  }, [cancelLoading, resetAll]);

  /* ------------------------------- Calculator ------------------------------- */

  const handleCalcPress = (key) => {
    setCalc((prev) => {
      if (key === 'C') return { expr: '', result: null, justEvaluated: false };
      if (key === '⌫') return prev.justEvaluated ? { expr: '', result: null, justEvaluated: false } : { ...prev, expr: prev.expr.slice(0, -1) };
      if (key === '=') {
        if (!prev.expr) return prev;
        try {
          return { expr: prev.expr, result: formatNumber(evaluateExpression(prev.expr)), justEvaluated: true };
        } catch (e) {
          return { ...prev, result: 'Error', justEvaluated: true };
        }
      }
      const isOp = CALC_OPS.test(key) || key === '%';
      if (prev.justEvaluated) {
        const base = prev.result && prev.result !== 'Error' ? prev.result : '';
        return { expr: isOp && base ? base + key : key, result: null, justEvaluated: false };
      }
      if (prev.expr.length >= 40) return prev;
      const last = prev.expr.slice(-1);
      if (CALC_OPS.test(key) && CALC_OPS.test(last)) {
        // replace a trailing operator instead of stacking them (allow "×-" for negatives)
        if (key === '-' && /[×÷]/.test(last)) return { ...prev, expr: prev.expr + key };
        return { ...prev, expr: prev.expr.slice(0, -1) + key };
      }
      return { ...prev, expr: prev.expr + key };
    });
  };

  const calcPreview = useMemo(() => {
    if (calc.justEvaluated || !calc.expr) return null;
    try {
      return formatNumber(evaluateExpression(calc.expr));
    } catch (e) {
      return null;
    }
  }, [calc]);

  /* -------------------------------- Rendering ------------------------------- */

  const dialogModal = <ConfirmDialogModal dialog={dialog} onClose={closeDialog} T={T} s={s} />;
  const bottomPad = Math.max(insets.bottom, 12) + 24;

  if (loading) {
    return (
      <>
        <ScreenShell showBack title="CBT Practice" onBack={() => router.back()} scrollable={false}>
          <View style={s.center}>
            <PageLoader label="Loading question banks…" />
          </View>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <ScreenShell showBack title="CBT Practice" onBack={() => router.back()} scrollable={false}>
          <View style={s.center}>
            <Ionicons name="cloud-offline-outline" size={60} color={T.rose} />
            <Text style={s.centerTitle}>Can't reach the server</Text>
            <Text style={s.centerText}>We couldn't load the question banks. Check your connection and try again.</Text>
            <TouchableOpacity onPress={loadCourses} style={[s.primaryBtn, { marginTop: 24, paddingHorizontal: 28 }]} accessibilityRole="button">
              <Ionicons name="refresh" size={18} color={T.white} />
              <Text style={s.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  /* -------------------------------- History -------------------------------- */

  if (stage === 'history') {
    return (
      <>
        <ScreenShell showBack title="Test history" onBack={() => setStage('browse')} scrollable={false}>
          <ScrollView style={s.flex} contentContainerStyle={[s.screenPad, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
            {history.length === 0 ? (
              <View style={s.emptyWrap}>
                <Ionicons name="documents-outline" size={56} color={T.slate} />
                <Text style={s.emptyText}>No attempts yet.{'\n'}Finish a mock exam and it will show up here.</Text>
              </View>
            ) : (
              <>
                {history.map((item) => {
                  const pct = pctOf(item.score, item.totalQuestions);
                  const pass = pct >= PASS_MARK;
                  return (
                    <View key={item.id || item.date} style={s.historyItem}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={s.historyTitle} numberOfLines={1}>{item.courseTitle}</Text>
                        <Text style={s.historyMeta}>
                          {new Date(item.date).toLocaleDateString()} · {formatClock(item.timeTaken)} · {item.candidate || 'Candidate'}
                        </Text>
                      </View>
                      <View style={s.historyScore}>
                        <Text style={[s.historyScoreValue, { color: pass ? T.green : T.rose }]}>
                          {item.score}/{item.totalQuestions}
                        </Text>
                        <Text style={s.historyScorePct}>{pct}%</Text>
                      </View>
                    </View>
                  );
                })}
                <TouchableOpacity onPress={confirmClearHistory} style={s.clearHistoryBtn} accessibilityRole="button">
                  <Ionicons name="trash-outline" size={16} color={T.rose} />
                  <Text style={s.clearHistoryText}>Clear history</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  /* --------------------------------- Browse -------------------------------- */

  if (stage === 'browse') {
    const resumeAnswered = resumable ? Object.keys(resumable.answers || {}).length : 0;
    const header = (
      <View>
        {customTopNode}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroEyebrow}>Mock exam practice</Text>
              <Text style={s.heroTitle}>Ready to practise?</Text>
              <Text style={s.heroSub}>Timed papers, an on-screen calculator and full answer explanations.</Text>
            </View>
            <TouchableOpacity onPress={() => setStage('history')} style={s.heroIconBtn} accessibilityRole="button" accessibilityLabel="View test history">
              <Ionicons name="time-outline" size={22} color={T.white} />
            </TouchableOpacity>
          </View>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{courses.length}</Text>
              <Text style={s.heroStatLabel}>Papers</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{historyStats.attempts}</Text>
              <Text style={s.heroStatLabel}>Attempts</Text>
            </View>
            <View style={s.heroStat}>
              <Text style={s.heroStatValue}>{historyStats.attempts ? `${historyStats.average}%` : '–'}</Text>
              <Text style={s.heroStatLabel}>Average</Text>
            </View>
          </View>
        </View>

        {resumable ? (
          <View style={s.resumeCard}>
            <View style={s.resumeTop}>
              <View style={s.resumeIcon}>
                <Ionicons name="play" size={18} color={T.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.resumeTitle} numberOfLines={1}>Resume {resumable.courseTitle}</Text>
                <Text style={s.resumeMeta}>
                  {resumeAnswered}/{resumable.questions.length} answered · {formatClock(Math.ceil((resumable.endsAt - Date.now()) / 1000))} left
                </Text>
              </View>
            </View>
            <View style={s.resumeActions}>
              <TouchableOpacity onPress={discardResumable} style={[s.resumeBtn, { backgroundColor: T.chip }]} accessibilityRole="button">
                <Text style={s.secondaryBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resumeSession} style={[s.resumeBtn, { backgroundColor: T.indigo }]} accessibilityRole="button">
                <Text style={[s.primaryBtnText, { fontSize: 14 }]}>Resume exam</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {offline ? (
          <View style={s.banner}>
            <Ionicons name="cloud-offline-outline" size={18} color={T.amber} />
            <Text style={s.bannerText}>You're offline. Showing saved papers; starting an exam needs a connection.</Text>
            <TouchableOpacity onPress={loadCourses} accessibilityRole="button" accessibilityLabel="Retry connection">
              <Ionicons name="refresh" size={18} color={T.indigo} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={s.searchBox}>
          <Ionicons name="search" size={19} color={T.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search subject or course code"
            placeholderTextColor={T.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={T.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={s.sectionLabel}>Available papers ({filteredCourses.length})</Text>
      </View>
    );

    return (
      <>
        <ScreenShell showBack={!isEmbedded} title={isEmbedded ? "Resources" : "Mock CBT"} onBack={() => !isEmbedded && router.back()} scrollable={false}>
          <FlatList
            data={filteredCourses}
            keyExtractor={(c) => String(c.id)}
            numColumns={2}
            columnWrapperStyle={s.courseRow}
            ListHeaderComponent={header}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Ionicons name="search-outline" size={48} color={T.slate} />
                <Text style={s.emptyText}>{searchTerm ? `No papers match "${searchTerm}".` : 'No papers available yet.'}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <CourseCard course={item} best={bestByCourse[item.id] ?? bestByCourse[item.title]} onPress={beginSetup} s={s} T={T} />
            )}
            contentContainerStyle={[s.screenPad, { paddingBottom: bottomPad }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  /* --------------------------------- Setup --------------------------------- */

  if (stage === 'setup') {
    return (
      <>
        <ScreenShell showBack title="Paper setup" onBack={() => setStage('browse')} scrollable={false}>
          <ScrollView style={s.flex} contentContainerStyle={[s.screenPad, { paddingBottom: bottomPad }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.card}>
              <View style={s.setupHeader}>
                <Text style={s.setupEyebrow}>Exam setup</Text>
                <Text style={s.setupTitle}>{setupCourseObj?.title}</Text>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={s.fieldLabel}>Candidate name</Text>
                <TextInput
                  style={s.fieldInput}
                  placeholder="Enter your name"
                  placeholderTextColor={T.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  maxLength={40}
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={s.fieldLabel}>Number of questions</Text>
                <TextInput
                  style={[s.fieldInput, qtyError && s.fieldInputError]}
                  keyboardType="number-pad"
                  value={numQuestions}
                  onChangeText={changeQuantity}
                />
                {qtyError ? <Text style={s.fieldError}>{qtyError}</Text> : <Text style={s.fieldHint}>This paper has {maxQuestions} questions.</Text>}
                <View style={s.chipRow}>
                  {qtyPresets.map((n) => (
                    <ChoiceChip key={n} label={n === maxQuestions ? `All (${n})` : String(n)} active={qtyNum === n} onPress={() => changeQuantity(String(n))} s={s} />
                  ))}
                </View>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={s.fieldLabel}>Duration (minutes)</Text>
                <TextInput
                  style={[s.fieldInput, timeError && s.fieldInputError]}
                  keyboardType="number-pad"
                  value={timeLimit}
                  onChangeText={changeTime}
                />
                {timeError ? <Text style={s.fieldError}>{timeError}</Text> : <Text style={s.fieldHint}>Suggested for {qtyNum || 0} questions: {suggestMinutes(qtyNum || 0)} min.</Text>}
                <View style={s.chipRow}>
                  {[10, 15, 30, 45, 60].map((m) => (
                    <ChoiceChip key={m} label={`${m} min`} active={minsNum === m} onPress={() => changeTime(String(m))} s={s} />
                  ))}
                </View>
              </View>

              {setupValid ? (
                <View style={s.summaryBox}>
                  <Ionicons name="information-circle" size={20} color={T.indigo} />
                  <Text style={s.summaryText}>
                    {qtyNum} questions in {minsNum} minutes (about {Math.max(1, Math.round((minsNum * 60) / qtyNum))} seconds each). Pass mark is {PASS_MARK}%.
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => { setAgreed(false); setStage('instructions'); }}
                disabled={!setupValid}
                style={[s.primaryBtn, !setupValid && s.btnDisabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !setupValid }}
              >
                <Text style={[s.primaryBtnText, !setupValid && s.btnDisabledText]}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color={setupValid ? T.white : T.textMuted} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  /* ------------------------------- Instructions ------------------------------ */

  if (stage === 'instructions') {
    return (
      <>
        <ScreenShell showBack title="Exam rules" onBack={() => setStage('setup')} scrollable={false}>
          <ScrollView style={s.flex} contentContainerStyle={[s.screenPad, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
            <View style={s.card}>
              <Text style={[s.setupTitle, { marginBottom: 16 }]}>Before you begin</Text>

              <View style={s.tileRow}>
                <View style={s.tile}>
                  <Text style={s.tileValue}>{qtyNum}</Text>
                  <Text style={s.tileLabel}>Questions</Text>
                </View>
                <View style={s.tile}>
                  <Text style={s.tileValue}>{minsNum}</Text>
                  <Text style={s.tileLabel}>Minutes</Text>
                </View>
                <View style={s.tile}>
                  <Text style={s.tileValue}>{PASS_MARK}%</Text>
                  <Text style={s.tileLabel}>Pass mark</Text>
                </View>
              </View>

              {[
                ['time', 'The timer starts as soon as the paper loads and keeps running if the app is in the background.'],
                ['grid', 'Use the grid button to jump to any question and see which are answered, flagged or skipped.'],
                ['bookmark', 'Flag a question to come back to it. You can clear a response at any time.'],
                ['calculator', 'An on-screen calculator is available in the top toolbar.'],
                ['save', 'Your progress is saved automatically, so you can resume if the app closes.'],
              ].map(([icon, text]) => (
                <View key={icon} style={s.ruleRow}>
                  <Ionicons name={icon} size={20} color={T.indigo} />
                  <Text style={s.ruleText}>{text}</Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => setAgreed((v) => !v)}
                style={s.agreeBox}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
              >
                <View style={[s.checkbox, agreed && s.checkboxOn]}>
                  {agreed ? <Ionicons name="checkmark" size={16} color={T.white} /> : null}
                </View>
                <Text style={s.agreeText}>I'm ready to start this mock exam.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={startFromSetup}
                disabled={!agreed}
                style={[s.primaryBtn, !agreed && s.btnDisabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !agreed }}
              >
                <Ionicons name="rocket" size={18} color={agreed ? T.white : T.textMuted} />
                <Text style={[s.primaryBtnText, !agreed && s.btnDisabledText]}>Start exam</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  /* ---------------------------------- Exam --------------------------------- */

  if (stage === 'exam') {
    if (loadingQuestions || !questions.length) {
      return (
        <>
          <ScreenShell showBack title="Preparing exam" onBack={cancelLoading} scrollable={false}>
            <View style={s.center}>
              <PageLoader label="Preparing your paper…" />
              <TouchableOpacity onPress={cancelLoading} style={[s.secondaryBtn, { marginTop: 28, paddingHorizontal: 28 }]} accessibilityRole="button">
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScreenShell>
          {dialogModal}
        </>
      );
    }

    const currentQ = questions[currentIndex];
    const isMarked = Boolean(markedForReview[currentIndex]);
    const selected = answers[currentIndex];
    const baseFont = 16 + FONT_LEVELS[fontLevel];
    const isLast = currentIndex === questions.length - 1;
    const answeredPct = (Object.keys(answers).length / questions.length) * 100;
    const fontLabel = FONT_LEVELS[fontLevel] === 0 ? 'A' : FONT_LEVELS[fontLevel] < 0 ? 'A−' : `A${'+'.repeat(FONT_LEVELS[fontLevel] / 2)}`;

    return (
      <>
        <ScreenShell showBack title={activeCourse?.title || 'CBT exam'} onBack={confirmExitExam} scrollable={false}>
          <View style={[s.flex, { backgroundColor: T.bg }]}>
            <View style={s.terminalBar}>
              <View style={s.termUser}>
                <View style={s.termAvatar}>
                  <Ionicons name="person" size={18} color={T.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.termName} numberOfLines={1}>{displayName}</Text>
                  <Text style={s.termSub} numberOfLines={1}>{activeCourse?.title}</Text>
                </View>
              </View>
              <View style={s.toolRow}>
                <TouchableOpacity onPress={() => setShowCalc((v) => !v)} style={[s.toolBtn, showCalc && s.toolBtnOn]} accessibilityRole="button" accessibilityLabel="Toggle calculator">
                  <Ionicons name="calculator" size={18} color={T.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFontLevel((l) => (l + 1) % FONT_LEVELS.length)} style={s.toolBtn} accessibilityRole="button" accessibilityLabel="Change text size">
                  <Text style={s.toolBtnText}>{fontLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowPalette(true)} style={[s.toolBtn, s.toolBtnOn]} accessibilityRole="button" accessibilityLabel="Open question navigator">
                  <Ionicons name="grid" size={15} color={T.white} />
                  <Text style={s.toolBtnText}>{currentIndex + 1}/{questions.length}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[s.timerBar, timerState === 'warn' && s.timerWarn, timerState === 'critical' && s.timerCritical]} accessibilityLiveRegion="polite">
              <Text style={s.timerLabel}>{timerState === 'normal' ? 'Time remaining' : 'Time is running out'}</Text>
              <View style={s.timerValueRow}>
                <Ionicons name="time-outline" size={16} color={T.white} />
                <Text style={s.timerValue} accessibilityLabel={`${formatClock(timeLeft)} remaining`}>{formatClock(timeLeft)}</Text>
              </View>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${answeredPct}%` }]} />
            </View>

            <View style={s.flex}>
              <ScrollView ref={examScrollRef} style={s.flex} contentContainerStyle={s.qScroll} showsVerticalScrollIndicator={false}>
                <View style={s.qCard}>
                  <View style={s.qHeader}>
                    <Text style={s.qLabel}>Question {currentIndex + 1} of {questions.length}</Text>
                    {isMarked ? (
                      <View style={s.flagPill}>
                        <Ionicons name="bookmark" size={12} color={T.amber} />
                        <Text style={s.flagPillText}>Flagged</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[s.qText, { fontSize: baseFont, lineHeight: baseFont * 1.5 }]}>{currentQ.question}</Text>
                </View>

                <View style={s.optionsWrap}>
                  {currentQ.options.map((opt, idx) => {
                    const on = selected === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.85}
                        onPress={() => selectOption(idx)}
                        style={[s.option, on && s.optionOn]}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`Option ${LETTERS[idx]}: ${opt}`}
                      >
                        <View style={[s.optionLetter, on && s.optionLetterOn]}>
                          <Text style={[s.optionLetterText, on && { color: T.white }]}>{LETTERS[idx]}</Text>
                        </View>
                        <Text style={[s.optionText, { fontSize: baseFont - 1 }, on && { color: T.indigo }]}>{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selected !== undefined ? (
                  <TouchableOpacity onPress={clearAnswer} style={s.clearBtn} accessibilityRole="button">
                    <Ionicons name="close-circle-outline" size={16} color={T.textMuted} />
                    <Text style={s.clearText}>Clear response</Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>

              {showCalc ? (
                <View style={s.calc}>
                  <View style={s.calcHead}>
                    <Text style={s.calcTitle}>Calculator</Text>
                    <TouchableOpacity onPress={() => setShowCalc(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close calculator">
                      <Ionicons name="close" size={18} color={T.terminalMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={s.calcScreen}>
                    <Text style={s.calcExpr} numberOfLines={1}>{calc.expr || ' '}</Text>
                    <Text style={s.calcResult} numberOfLines={1} adjustsFontSizeToFit>
                      {calc.result ?? calcPreview ?? (calc.expr ? '' : '0')}
                    </Text>
                  </View>
                  {CALC_ROWS.map((row, r) => (
                    <View key={r} style={s.calcRow}>
                      {row.map((k) => (
                        <TouchableOpacity
                          key={k}
                          onPress={() => handleCalcPress(k)}
                          style={[s.calcKey, (CALC_OPS.test(k) || k === 'C' || k === '⌫') && s.calcKeyOp]}
                          accessibilityRole="button"
                          accessibilityLabel={`Calculator ${k}`}
                        >
                          <Text style={s.calcKeyText}>{k === '-' ? '−' : k}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                  <TouchableOpacity onPress={() => handleCalcPress('=')} style={s.calcEquals} accessibilityRole="button" accessibilityLabel="Calculate">
                    <Text style={s.calcKeyText}>=</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <View style={[s.dock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity
                onPress={goBack}
                disabled={currentIndex === 0}
                style={[s.dockBtn, { backgroundColor: T.chip, opacity: currentIndex === 0 ? 0.35 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel="Previous question"
                accessibilityState={{ disabled: currentIndex === 0 }}
              >
                <Ionicons name="chevron-back" size={18} color={T.indigo} />
                <Text style={[s.dockText, { color: T.textSecondary }]}>Prev</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleMark}
                style={[s.dockBtn, { flex: 1, backgroundColor: isMarked ? T.amber : T.input, borderWidth: 1, borderColor: isMarked ? T.amber : T.border }]}
                accessibilityRole="button"
                accessibilityLabel={isMarked ? 'Remove flag' : 'Flag for review'}
              >
                <Ionicons name={isMarked ? 'bookmark' : 'bookmark-outline'} size={17} color={isMarked ? T.white : T.textMuted} />
                <Text style={[s.dockText, { color: isMarked ? T.white : T.textSecondary }]}>{isMarked ? 'Flagged' : 'Flag'}</Text>
              </TouchableOpacity>

              {isLast ? (
                <TouchableOpacity onPress={requestSubmit} style={[s.dockBtn, { backgroundColor: T.green, paddingHorizontal: 20 }]} accessibilityRole="button" accessibilityLabel="Submit exam">
                  <Text style={[s.dockText, { color: T.white }]}>Submit</Text>
                  <Ionicons name="checkmark-done" size={18} color={T.white} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={goNext} style={[s.dockBtn, { backgroundColor: T.indigo, paddingHorizontal: 20 }]} accessibilityRole="button" accessibilityLabel="Next question">
                  <Text style={[s.dockText, { color: T.white }]}>Next</Text>
                  <Ionicons name="chevron-forward" size={18} color={T.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScreenShell>

        <Modal visible={showPalette} animationType="slide" transparent onRequestClose={() => setShowPalette(false)}>
          <View style={s.sheetBackdrop}>
            <Pressable style={s.flex} onPress={() => setShowPalette(false)} />
            <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHead}>
                <Text style={s.sheetTitle}>Question navigator</Text>
                <TouchableOpacity onPress={() => setShowPalette(false)} style={s.sheetClose} accessibilityRole="button" accessibilityLabel="Close navigator">
                  <Ionicons name="close" size={20} color={T.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={s.countRow}>
                <View style={[s.countBox, { backgroundColor: T.greenTint }]}>
                  <Text style={[s.countValue, { color: T.green }]}>{paletteCounts.answered}</Text>
                  <Text style={[s.countLabel, { color: T.green }]}>Answered</Text>
                </View>
                <View style={[s.countBox, { backgroundColor: T.dangerTint }]}>
                  <Text style={[s.countValue, { color: T.rose }]}>{paletteCounts.remaining}</Text>
                  <Text style={[s.countLabel, { color: T.rose }]}>Remaining</Text>
                </View>
                <View style={[s.countBox, { backgroundColor: T.amberTint }]}>
                  <Text style={[s.countValue, { color: T.amber }]}>{paletteCounts.flagged}</Text>
                  <Text style={[s.countLabel, { color: T.amber }]}>Flagged</Text>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.gridWrap}>
                  {questions.map((_, idx) => {
                    const st = statusFor(idx);
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => goToQuestion(idx)}
                        style={[s.gridCell, { backgroundColor: statusMeta[st].bg }, idx === currentIndex && s.gridCellCurrent]}
                        accessibilityRole="button"
                        accessibilityLabel={`Question ${idx + 1}, ${statusMeta[st].label}`}
                      >
                        <Text style={s.gridText}>{idx + 1}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={s.legend}>
                  {Object.values(statusMeta).map((meta) => (
                    <View key={meta.label} style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: meta.bg }]} />
                      <Text style={s.legendText}>{meta.label}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setShowPalette(false);
                    // let the sheet finish closing before the dialog opens (avoids iOS stacked-modal glitches)
                    setTimeout(requestSubmit, 320);
                  }}
                  style={s.primaryBtn}
                  accessibilityRole="button"
                >
                  <Ionicons name="checkmark-done" size={18} color={T.white} />
                  <Text style={s.primaryBtnText}>Submit paper</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
        {dialogModal}
      </>
    );
  }

  /* --------------------------------- Results -------------------------------- */

  if (stage === 'results') {
    const tone = isPass ? T.green : T.rose;
    const grade =
      percent >= 70 ? 'Excellent work. You are well prepared.' : isPass ? 'You passed. Review the misses to push higher.' : 'Not there yet. Review the explanations below and try again.';
    const filters = [
      ['all', 'All'],
      ['correct', 'Correct'],
      ['incorrect', 'Incorrect'],
      ['skipped', 'Skipped'],
      ['marked', 'Flagged'],
    ];

    return (
      <>
        <ScreenShell showBack title="Results" onBack={resetAll} scrollable={false}>
          <ScrollView style={s.flex} contentContainerStyle={[s.screenPad, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
            <View style={s.resultCard}>
              <View style={[s.ring, { borderColor: tone }]}>
                <Text style={[s.ringValue, { color: tone }]}>{percent}%</Text>
              </View>
              <Text style={s.resultName}>{displayName}</Text>
              <Text style={s.resultScore}>{score} of {questions.length} correct</Text>
              <Text style={s.resultGrade}>{grade}</Text>

              <View style={s.statRow}>
                <View style={[s.statTile, { backgroundColor: T.greenTint }]}>
                  <Text style={[s.statValue, { color: T.green }]}>{stats.correct}</Text>
                  <Text style={[s.statLabel, { color: T.green }]}>Correct</Text>
                </View>
                <View style={[s.statTile, { backgroundColor: T.dangerTint }]}>
                  <Text style={[s.statValue, { color: T.rose }]}>{stats.wrong}</Text>
                  <Text style={[s.statLabel, { color: T.rose }]}>Incorrect</Text>
                </View>
                <View style={[s.statTile, { backgroundColor: T.chip }]}>
                  <Text style={[s.statValue, { color: T.textSecondary }]}>{stats.skipped}</Text>
                  <Text style={[s.statLabel, { color: T.textSecondary }]}>Skipped</Text>
                </View>
              </View>

              <View style={s.timeRow}>
                <Ionicons name="time-outline" size={16} color={T.textMuted} />
                <Text style={s.timeText}>Time spent {formatClock(timeSpent)}</Text>
              </View>

              <View style={s.resultActions}>
                <TouchableOpacity onPress={retake} style={[s.secondaryBtn, { flex: 1 }]} accessibilityRole="button">
                  <Ionicons name="refresh" size={16} color={T.textSecondary} />
                  <Text style={s.secondaryBtnText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={resetAll} style={[s.primaryBtn, { flex: 1 }]} accessibilityRole="button">
                  <Ionicons name="albums" size={16} color={T.white} />
                  <Text style={[s.primaryBtnText, { fontSize: 14 }]}>All papers</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => router.navigate('/')} style={{ paddingTop: 16 }} accessibilityRole="button">
                <Text style={[s.clearText, { color: T.textMuted }]}>Exit to home</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.reviewTitle}>Review and explanations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0 }} contentContainerStyle={s.filterRow}>
              {filters.map(([key, label]) => {
                const on = reviewFilter === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setReviewFilter(key)}
                    style={[s.filterChip, on && s.filterChipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[s.filterText, on && s.filterTextOn]}>{label} ({reviewCounts[key]})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filteredReviewList.length === 0 ? (
              <View style={s.emptyWrap}>
                <Ionicons name="checkmark-done-circle-outline" size={44} color={T.slate} />
                <Text style={s.emptyText}>Nothing in this category.</Text>
              </View>
            ) : null}

            {filteredReviewList.map((r) => {
              const badge = r.isSkipped
                ? { label: 'Skipped', color: T.textMuted, bg: T.chip, border: T.border }
                : r.isCorrect
                  ? { label: 'Correct', color: T.green, bg: T.greenTint, border: T.green }
                  : { label: 'Incorrect', color: T.rose, bg: T.dangerTint, border: T.rose };
              return (
                <View key={r.q.id} style={s.reviewCard}>
                  <View style={s.reviewHead}>
                    <Text style={s.reviewQNum}>Question {r.idx + 1}</Text>
                    <View style={[s.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                      <Text style={[s.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={s.reviewQuestion}>{r.q.question}</Text>

                  {r.q.options.map((opt, i) => {
                    const isRight = i === r.q.correctIndex;
                    const wrongPick = i === r.selected && !isRight;
                    return (
                      <View
                        key={i}
                        style={[s.reviewOpt, isRight && s.reviewOptCorrect, wrongPick && s.reviewOptWrong]}
                        accessibilityLabel={`Option ${LETTERS[i]}: ${opt}${isRight ? ', correct answer' : ''}${wrongPick ? ', your answer' : ''}`}
                      >
                        <View style={[s.reviewLetter, isRight && { backgroundColor: T.green }, wrongPick && { backgroundColor: T.rose }]}>
                          <Text style={[s.reviewLetterText, (isRight || wrongPick) && { color: T.white }]}>{LETTERS[i]}</Text>
                        </View>
                        <Text style={s.reviewOptText}>{opt}</Text>
                        {isRight ? <Ionicons name="checkmark-circle" size={20} color={T.green} /> : null}
                        {wrongPick ? <Ionicons name="close-circle" size={20} color={T.rose} /> : null}
                      </View>
                    );
                  })}

                  {r.q.explanation ? (
                    <View style={s.explainBox}>
                      <Text style={s.explainTitle}>Explanation</Text>
                      <Text style={s.explainText}>{r.q.explanation}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </ScreenShell>
        {dialogModal}
      </>
    );
  }

  return null;
}