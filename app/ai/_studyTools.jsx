import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

export const MODES = [
  { id: 'solve', label: 'Solve', tagline: 'Work through a difficult question', icon: 'calculator-outline' },
  { id: 'explain', label: 'Explain', tagline: 'Understand a concept step-by-step', icon: 'bulb-outline' },
  { id: 'summarize', label: 'Summarize', tagline: 'Turn your notes into key points', icon: 'document-text-outline' },
  { id: 'practice', label: 'Practice', tagline: 'Generate questions and test yourself', icon: 'school-outline' },
  { id: 'plan', label: 'Study Plan', tagline: 'Build a personalized study schedule', icon: 'calendar-outline' },
  { id: 'research', label: 'Research', tagline: 'Explore an academic topic', icon: 'search-outline' },
];

export const MODE_BY_ID = MODES.reduce((acc, m) => ({ ...acc, [m.id]: m }), {});

export const MODE_FIELDS = {
  solve: [
    { key: 'subject', label: 'Subject', placeholder: 'e.g. Calculus, Organic Chemistry' },
    { key: 'question', label: 'Your question', type: 'multiline', placeholder: 'Paste or type the question you need solved', required: true },
  ],
  explain: [
    { key: 'subject', label: 'Subject', placeholder: 'e.g. Thermodynamics' },
    { key: 'topic', label: 'Topic', placeholder: 'e.g. The First Law', required: true },
    { key: 'level', label: 'Academic level', type: 'chips', options: ['Intro', 'Undergrad', 'Advanced'] },
    { key: 'confusion', label: "What's not clicking (optional)", type: 'multiline', placeholder: 'Tell the AI where you get stuck' },
  ],
  summarize: [
    { key: 'source', label: 'Notes to summarize', type: 'multiline', placeholder: 'Paste your notes here, or attach a file below', required: true },
    { key: 'focus', label: 'Focus on (optional)', placeholder: 'e.g. definitions, formulas, dates' },
  ],
  practice: [
    { key: 'subject', label: 'Subject', placeholder: 'e.g. Mechanics' },
    { key: 'topic', label: 'Topic', placeholder: 'e.g. Projectile Motion', required: true },
    { key: 'difficulty', label: 'Difficulty', type: 'chips', options: ['Easy', 'Medium', 'Hard'] },
    { key: 'count', label: 'Number of questions', type: 'chips', options: ['5', '10', '15'] },
  ],
  plan: [
    { key: 'subject', label: 'Subject / course', placeholder: 'e.g. Mechanical Engineering', required: true },
    { key: 'timeframe', label: 'Time until exam', placeholder: 'e.g. 2 weeks, 3 days' },
    { key: 'goals', label: 'Goals or weak areas (optional)', type: 'multiline', placeholder: 'What should the plan prioritize?' },
  ],
  research: [
    { key: 'topic', label: 'Topic', placeholder: 'e.g. The causes of the 2008 financial crisis', required: true },
    { key: 'angle', label: 'Focus or angle (optional)', placeholder: 'e.g. historical context, current debate' },
  ],
};

// Builds a single well-structured prompt from the form values. The AI is
// asked to reply with clear markdown headings — this is what turns a plain
// chat answer into a "mini study resource" without needing any backend or
// response-schema changes: MarkdownText already renders the structure.
export function buildPrompt(modeId, values = {}) {
  const v = (key) => (values[key] || '').trim();

  switch (modeId) {
    case 'solve':
      return [
        `I need help solving this${v('subject') ? ` ${v('subject')}` : ''} question.`,
        'Reply in markdown with: a short **Title**, the **Explanation** of your approach, then a numbered **Step-by-step Solution**, and end with one **Quick Check** question for me to try on my own.',
        '',
        `Question: ${v('question')}`,
      ].join('\n');

    case 'explain':
      return [
        `Explain "${v('topic')}"${v('subject') ? ` in ${v('subject')}` : ''}${v('level') ? ` at an ${v('level')} level` : ''} so I actually understand it, not just memorize it.`,
        'Reply in markdown with: **Explanation**, **Key Concept**, a **Formula** section if relevant, a worked **Example**, and a **Common Mistake** students make.',
        v('confusion') ? `\nWhat I'm stuck on: ${v('confusion')}` : '',
      ].join('\n');

    case 'summarize':
      return [
        'Summarize the following notes into clear markdown with a bulleted **Key Points** section, an **Important Note** callout for anything critical, and 2-3 **Quick Check** questions at the end to test my recall.',
        v('focus') ? `Focus especially on: ${v('focus')}` : '',
        '',
        `Notes:\n${v('source')}`,
      ].join('\n');

    case 'practice':
      return [
        `Generate ${v('count') || '5'} ${(v('difficulty') || 'medium').toLowerCase()} difficulty practice questions on "${v('topic')}"${v('subject') ? ` in ${v('subject')}` : ''}.`,
        'Reply in markdown: a numbered **Practice Questions** list, then a separate **Answer Key** section at the end with brief explanations for each answer.',
      ].join('\n');

    case 'plan':
      return [
        `Build a personalized study plan for ${v('subject')}${v('timeframe') ? `, with ${v('timeframe')} until my exam` : ''}.`,
        'Reply in markdown with a **Study Plan** heading, a session-by-session breakdown, and an **Important Note** on pacing and rest.',
        v('goals') ? `\nMy goals / weak areas: ${v('goals')}` : '',
      ].join('\n');

    case 'research':
      return [
        `Help me research "${v('topic')}" at an academic level.`,
        'Reply in markdown with an **Overview**, **Key Concept** definitions, and a **Further Practice** section suggesting directions to read or think about next.',
        v('angle') ? `Focus on this angle: ${v('angle')}` : '',
      ].join('\n');

    default:
      return v('question') || v('source') || '';
  }
}

// Shown next to the AI thinking loader — replaces the generic "Thinking…"
export const LOADING_LABELS = {
  solve: 'Analyzing your question…',
  explain: 'Preparing your explanation…',
  summarize: 'Reading through your notes…',
  practice: 'Building your practice set…',
  plan: 'Mapping your study plan…',
  research: 'Researching your topic…',
  default: 'Thinking it through…',
};

// Contextual follow-ups shown under each AI response. These stand in for
// "Like / Dislike / Share" — the point is to keep the student in a learning
// loop instead of a chat loop.
export const CONTEXTUAL_ACTIONS = {
  solve: ['Try a similar question', 'Show a simpler method', 'Go deeper on that step'],
  explain: ['Make this simpler', 'Give me an example', 'Test me on this'],
  summarize: ['Generate flashcards', 'Turn into practice questions'],
  practice: ['Show the answer key', 'More questions like this'],
  plan: ['Make it less intense', 'Add more detail'],
  research: ['Summarize the key debates', 'Suggest further reading'],
  default: ['Explain deeper', 'Give me an example', 'Test me on this'],
};

// ---------------------------------------------------------------------------
// ModeCard — a single academic tool on the workspace home screen.
// ---------------------------------------------------------------------------
export function ModeCard({ mode, onPress, disabled }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    card: {
      width: '48%',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.xl,
      padding: s.md,
    },
    pressed: { backgroundColor: c.brandLight, borderColor: c.brandBorder },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: r.md,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: s.sm,
    },
    label: { color: c.textPrimary, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    tagline: { color: c.textSecondary, fontSize: 11, lineHeight: 15 },
  }));

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => onPress(mode)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${mode.label}: ${mode.tagline}`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={mode.icon} size={17} color={colors.brandDark} />
      </View>
      <Text style={styles.label}>{mode.label}</Text>
      <Text style={styles.tagline}>{mode.tagline}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ContextForm — the "guide the student toward useful context" panel that
// appears after picking a mode. Submitting builds the structured prompt
// via buildPrompt() and hands it back to the parent unchanged in shape
// from a normal composer send (same sendMessage() call underneath).
// ---------------------------------------------------------------------------
export function ContextForm({ mode, onSubmit, onSkip, onCancel, submitting }) {
  const { colors } = useTheme();
  const fields = MODE_FIELDS[mode.id] || [];
  const [values, setValues] = useState({});

  const styles = useThemeStyles((c, s, r) => ({
    wrap: { backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r.xl, padding: s.md, gap: s.md },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    iconWrap: { width: 30, height: 30, borderRadius: r.md, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.textPrimary, fontSize: 14.5, fontWeight: '900' },
    subtitle: { color: c.textSecondary, fontSize: 11.5, marginTop: 1 },
    closeButton: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
    fieldGroup: { gap: 6 },
    fieldLabel: { color: c.textSecondary, fontSize: 11.5, fontWeight: '800' },
    input: {
      backgroundColor: c.surfaceMuted || c.background,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.lg,
      paddingHorizontal: s.sm,
      paddingVertical: 10,
      color: c.textPrimary,
      fontSize: 13,
    },
    multilineInput: { minHeight: 72, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { height: 32, paddingHorizontal: s.md, borderRadius: r.full, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center' },
    chipSelected: { backgroundColor: c.brandLight, borderColor: c.brandBorder },
    chipText: { color: c.textSecondary, fontSize: 12, fontWeight: '700' },
    chipTextSelected: { color: c.brandText },
    actionsRow: { flexDirection: 'row', gap: s.sm, marginTop: s.xs },
    primaryButton: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: c.brand, borderRadius: r.lg, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    primaryButtonDisabled: { opacity: 0.5 },
    primaryText: { color: c.onBrand, fontSize: 13.5, fontWeight: '900' },
    skipButton: { paddingVertical: 12, paddingHorizontal: s.sm, alignItems: 'center', justifyContent: 'center' },
    skipText: { color: c.textSecondary, fontSize: 12.5, fontWeight: '800' },
  }));

  const setValue = (key, val) => setValues((prev) => ({ ...prev, [key]: val }));

  const requiredField = fields.find((f) => f.required);
  const canSubmit = !requiredField || Boolean((values[requiredField.key] || '').trim());

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={mode.icon} size={16} color={colors.brandDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{mode.label}</Text>
          <Text style={styles.subtitle}>{mode.tagline}</Text>
        </View>
        <Pressable onPress={onCancel} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={18} color={colors.inkSoft} />
        </Pressable>
      </View>

      {fields.map((field) => (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          {field.type === 'chips' ? (
            <View style={styles.chipRow}>
              {field.options.map((option) => {
                const selected = values[field.key] === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setValue(field.key, selected ? '' : option)}
                    accessibilityRole="button"
                    accessibilityLabel={`${field.label}: ${option}`}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              style={[styles.input, field.type === 'multiline' && styles.multilineInput]}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textTertiary}
              value={values[field.key] || ''}
              onChangeText={(text) => setValue(field.key, text)}
              multiline={field.type === 'multiline'}
              accessibilityLabel={field.label}
            />
          )}
        </View>
      ))}

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.primaryButton, (!canSubmit || submitting) && styles.primaryButtonDisabled]}
          onPress={() => onSubmit(buildPrompt(mode.id, values), values)}
          disabled={!canSubmit || submitting}
          accessibilityRole="button"
          accessibilityLabel={`Start ${mode.label}`}
        >
          <Ionicons name="arrow-forward" size={15} color={colors.onBrand} />
          <Text style={styles.primaryText}>Start</Text>
        </Pressable>
        <Pressable onPress={() => onSkip(mode)} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Skip form and type directly">
          <Text style={styles.skipText}>{"Skip, I'll type"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SessionBar — shown above the conversation once a mode/session is active.
// Communicates what the student is working on and offers a clean reset.
// ---------------------------------------------------------------------------
export function SessionBar({ mode, subject, topic, onNewSession }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder, borderRadius: r.lg, paddingHorizontal: s.sm, paddingVertical: 8, marginBottom: s.md },
    iconWrap: { width: 26, height: 26, borderRadius: r.sm, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    copy: { flex: 1 },
    title: { color: c.brandText, fontSize: 12, fontWeight: '900' },
    subtitle: { color: c.textSecondary, fontSize: 11, marginTop: 1 },
    newButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: r.full, backgroundColor: c.card },
    newText: { color: c.brandText, fontSize: 10.5, fontWeight: '800' },
  }));

  const detail = [subject, topic].filter(Boolean).join(' — ');

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={mode.icon} size={13} color={colors.brandDark} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{mode.label} session</Text>
        {detail ? <Text style={styles.subtitle} numberOfLines={1}>{detail}</Text> : null}
      </View>
      <Pressable onPress={onNewSession} style={styles.newButton} accessibilityRole="button" accessibilityLabel="Start a new session">
        <Ionicons name="add" size={12} color={colors.brandText} />
        <Text style={styles.newText}>New</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ResponseActionsRow — the contextual, mode-aware follow-up chips shown
// under each AI answer, plus compact copy/regenerate icon buttons.
// ---------------------------------------------------------------------------
export function ResponseActionsRow({ modeId, onAction, onCopy, onRegenerate, copied, canRegenerate, disabled }) {
  const { colors } = useTheme();
  const actions = CONTEXTUAL_ACTIONS[modeId] || CONTEXTUAL_ACTIONS.default;

  const styles = useThemeStyles((c, s, r) => ({
    wrap: { marginTop: 6, gap: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: r.full, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
    chipPressed: { backgroundColor: c.brandBorder },
    chipText: { color: c.brandText, fontSize: 11, fontWeight: '800' },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
    iconButton: { width: 26, height: 26, borderRadius: r.sm, alignItems: 'center', justifyContent: 'center' },
    iconButtonPressed: { backgroundColor: c.brandLight },
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.chipRow}>
        {actions.map((label) => (
          <Pressable
            key={label}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => onAction(label)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text style={styles.chipText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.iconRow}>
        <Pressable
          onPress={onCopy}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Copy response"
          hitSlop={6}
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? colors.brand : colors.inkSoft} />
        </Pressable>
        {canRegenerate ? (
          <Pressable
            onPress={onRegenerate}
            disabled={disabled}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Regenerate response"
            hitSlop={6}
          >
            <Ionicons name="refresh-outline" size={14} color={colors.inkSoft} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
