import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CHALLENGE_CATEGORIES, CHALLENGE_DIFFICULTIES } from '../shared/challenge/data';

const C = {
  ink: '#0F172A',
  soft: '#64748B',
  faint: '#94A3B8',
  border: '#E2E8F0',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  ok: '#059669',
  okS: '#ECFDF5',
  warn: '#D97706',
  danger: '#DC2626',
  dangerS: '#FEF2F2',
  w: '#FFFFFF',
  ind: '#6366F1',
  indD: '#4338CA',
  indS: '#EEF2FF',
};

const LETTERS = ['A', 'B', 'C', 'D'];

const emptyForm = {
  category: 'general-knowledge',
  subject: '',
  difficulty: 'Easy',
  prompt: '',
  answers: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
  level: 'all',
  departmentId: 'all',
};

function SectionHeader({ icon, title, hint, done }) {
  return (
    <View style={st.sectionHeaderRow}>
      <View style={st.sectionHeaderLeft}>
        <View style={[st.iconBubble, done && { backgroundColor: C.okS }]}>
          <Ionicons name={icon} size={14} color={done ? C.ok : C.ind} />
        </View>
        <Text style={st.sectionTitle}>{title}</Text>
      </View>
      {hint ? <Text style={st.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

export default function ChallengeQuestionForm() {
  const [f, setF] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setA = (i, v) => {
    const a = [...f.answers];
    a[i] = v;
    upd('answers', a);
  };

  // ---- completion tracking, drives progress bar + inline validation ----
  const checks = useMemo(() => {
    const answersFilled = f.answers.every((a) => a.trim().length > 0);
    return {
      prompt: f.prompt.trim().length > 0,
      answers: answersFilled,
      explanation: f.explanation.trim().length > 0,
    };
  }, [f.prompt, f.answers, f.explanation]);

  const requiredDone = [checks.prompt, checks.answers].filter(Boolean).length;
  const requiredTotal = 2;
  const progress = requiredDone / requiredTotal;

  const isValid = checks.prompt && checks.answers;

  const reset = () => {
    setF(emptyForm);
    setTouched(false);
  };

  const save = async () => {
    setTouched(true);
    if (!isValid) {
      Alert.alert('Almost there', 'Please add a question and fill in all four answers before saving.');
      return;
    }
    try {
      setSaving(true);
      await addDoc(collection(db, 'challengeQuestions'), {
        ...f,
        subject: f.subject.trim() || f.category,
        answers: f.answers.map((a) => a.trim()),
        prompt: f.prompt.trim(),
        explanation: f.explanation.trim(),
        createdAt: serverTimestamp(),
      });
      Alert.alert('Question added 🎉', 'It has been saved to the challenge bank.');
      reset();
    } catch (e) {
      Alert.alert('Something went wrong', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const promptError = touched && !checks.prompt;
  const answersError = touched && !checks.answers;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header + progress */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={st.title}>Add Challenge Question</Text>
            <Pressable onPress={reset} hitSlop={8}>
              <Text style={st.resetLink}>Clear form</Text>
            </Pressable>
          </View>
          <View style={st.progressTrack}>
            <View style={[st.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={st.progressLabel}>
            {requiredDone === requiredTotal ? 'Ready to save' : `${requiredDone}/${requiredTotal} required fields complete`}
          </Text>
        </View>

        {/* Category & Subject card */}
        <View style={st.card}>
          <SectionHeader icon="grid-outline" title="Category & subject" />
          <Text style={st.l}>Category</Text>
          <View style={st.chipRow}>
            {CHALLENGE_CATEGORIES.map((c) => {
              const s = f.category === c.id;
              return (
                <Pressable key={c.id} style={[st.ch, s && st.chActive]} onPress={() => upd('category', c.id)}>
                  <Text style={[st.ct, s && st.ctActive]}>{c.title}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[st.l, { marginTop: 12 }]}>Subject (optional)</Text>
          <TextInput
            style={st.i}
            placeholder="e.g. Organic Chemistry"
            placeholderTextColor={C.faint}
            value={f.subject}
            onChangeText={(v) => upd('subject', v)}
          />
          <Text style={st.microHint}>Leave blank to use the category name.</Text>
        </View>

        {/* Difficulty card */}
        <View style={st.card}>
          <SectionHeader icon="speedometer-outline" title="Difficulty" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CHALLENGE_DIFFICULTIES.map((d) => {
              const s = f.difficulty === d;
              const tone = d === 'Easy' ? C.ok : d === 'Medium' ? C.warn : C.danger;
              return (
                <Pressable
                  key={d}
                  style={[st.diffPill, { borderColor: s ? tone : C.border, backgroundColor: s ? tone : C.w }]}
                  onPress={() => upd('difficulty', d)}
                >
                  <View style={[st.diffDot, { backgroundColor: s ? C.w : tone }]} />
                  <Text style={[st.ct, { color: s ? C.w : C.ink }]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Question card */}
        <View style={[st.card, promptError && st.cardError]}>
          <SectionHeader icon="help-circle-outline" title="Question" hint={`${f.prompt.length} chars`} done={checks.prompt} />
          <TextInput
            style={[st.i, st.multiline, promptError && st.inputError]}
            placeholder="Type the question here..."
            placeholderTextColor={C.faint}
            value={f.prompt}
            onChangeText={(v) => upd('prompt', v)}
            multiline
            textAlignVertical="top"
          />
          {promptError && <Text style={st.errorText}>A question is required.</Text>}
        </View>

        {/* Answers card */}
        <View style={[st.card, answersError && st.cardError]}>
          <SectionHeader icon="list-outline" title="Answers" hint="Tap a letter to mark correct" done={checks.answers} />
          <View style={{ gap: 10 }}>
            {f.answers.map((a, i) => {
              const isCorrect = f.correctIndex === i;
              return (
                <View
                  key={i}
                  style={[st.answerRow, isCorrect && st.answerRowActive, answersError && !a.trim() && st.answerRowError]}
                >
                  <Pressable style={[st.letterBadge, isCorrect && st.letterBadgeActive]} onPress={() => upd('correctIndex', i)}>
                    {isCorrect ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={st.letterText}>{LETTERS[i]}</Text>}
                  </Pressable>
                  <TextInput
                    style={st.answerInput}
                    placeholder={`Option ${LETTERS[i]}`}
                    placeholderTextColor={C.faint}
                    value={a}
                    onChangeText={(v) => setA(i, v)}
                  />
                </View>
              );
            })}
          </View>
          {answersError && <Text style={st.errorText}>Fill in all four answer options.</Text>}
          <View style={st.correctBanner}>
            <Ionicons name="checkmark-circle" size={14} color={C.ok} />
            <Text style={st.correctBannerText}>
              Correct answer: <Text style={{ fontWeight: '800' }}>{LETTERS[f.correctIndex]}</Text>
            </Text>
          </View>
        </View>

        {/* Explanation card */}
        <View style={st.card}>
          <SectionHeader icon="bulb-outline" title="Explanation" hint="Optional but recommended" done={checks.explanation} />
          <TextInput
            style={[st.i, st.multiline, { minHeight: 60 }]}
            placeholder="Explain why the correct answer is right..."
            placeholderTextColor={C.faint}
            value={f.explanation}
            onChangeText={(v) => upd('explanation', v)}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Filters card */}
        <View style={st.card}>
          <SectionHeader icon="funnel-outline" title="Visibility filters" />
          <Text style={st.l}>Level filter</Text>
          <TextInput
            style={st.i}
            placeholder='e.g. "100", "200", or "all"'
            placeholderTextColor={C.faint}
            value={f.level}
            onChangeText={(v) => upd('level', v)}
          />
          <Text style={[st.l, { marginTop: 12 }]}>Department ID filter</Text>
          <TextInput
            style={st.i}
            placeholder='"all" for all departments'
            placeholderTextColor={C.faint}
            value={f.departmentId}
            onChangeText={(v) => upd('departmentId', v)}
          />
        </View>
      </ScrollView>

      {/* Sticky save bar */}
      <View style={st.stickyBar}>
        <Pressable
          style={[st.sb, (!isValid || saving) && !touched && { opacity: 0.9 }, saving && { opacity: 0.7 }]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={st.sbt}>Save Question</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: C.ink },
  resetLink: { fontSize: 12, fontWeight: '700', color: C.ind },

  progressTrack: { height: 6, borderRadius: 999, backgroundColor: C.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.ind, borderRadius: 999 },
  progressLabel: { fontSize: 11, fontWeight: '600', color: C.soft },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardError: { borderColor: '#FCA5A5', backgroundColor: C.dangerS },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBubble: { width: 24, height: 24, borderRadius: 8, backgroundColor: C.indS, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.ink },
  sectionHint: { fontSize: 11, fontWeight: '600', color: C.faint },

  l: { color: C.ink, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  microHint: { fontSize: 11, color: C.faint, marginTop: 4 },

  i: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: C.ink,
    backgroundColor: C.w,
  },
  multiline: { minHeight: 70, paddingTop: 10 },
  inputError: { borderColor: C.danger },
  errorText: { fontSize: 11, fontWeight: '700', color: C.danger, marginTop: 2 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ch: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, backgroundColor: C.w },
  chActive: { backgroundColor: C.indS, borderColor: C.ind },
  ct: { fontSize: 11, fontWeight: '700', color: C.soft },
  ctActive: { color: C.indD },

  diffPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  diffDot: { width: 6, height: 6, borderRadius: 3 },

  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: C.w,
  },
  answerRowActive: { borderColor: C.ok, backgroundColor: C.okS },
  answerRowError: { borderColor: '#FCA5A5' },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.w,
  },
  letterBadgeActive: { backgroundColor: C.ok, borderColor: C.ok },
  letterText: { fontSize: 12, fontWeight: '800', color: C.soft },
  answerInput: { flex: 1, fontSize: 14, color: C.ink, paddingVertical: 4 },

  correctBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  correctBannerText: { fontSize: 12, color: C.soft },

  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    backgroundColor: 'rgba(248,250,252,0.96)',
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  sb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.ind,
    borderRadius: 14,
    paddingVertical: 15,
  },
  sbt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});