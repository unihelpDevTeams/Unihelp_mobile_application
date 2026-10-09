import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormulaMath from './FormulaMath';
import { useTheme } from '../theme/ThemeContext';

/* -------------------------------------------------------------------------- */
/*  Constants + helpers                                                       */
/* -------------------------------------------------------------------------- */

const SUPPORTED_TYPES = new Set([
  'heading', 'paragraph', 'instruction', 'question', 'subquestion', 'image', 'diagram',
  'table', 'equation', 'numbered-list', 'bullet-list', 'caption', 'note', 'divider',
  'page-break', 'section',
]);
const NESTED_TYPES = new Set(['question', 'subquestion', 'section']);
const TEXT_SCALES = [0.9, 1, 1.12, 1.25];
const FLAG_COLOR = '#F59E0B';

// `label` is deliberately not a body-text key for questions: it holds the
// question number, and used to leak into the question text when `text` was empty.
const getText = (block = {}, keys = ['text', 'value', 'title', 'label', 'content']) => {
  for (const key of keys) {
    const entry = block[key];
    if (typeof entry === 'number') return String(entry);
    if (typeof entry === 'string' && entry.trim()) return entry;
  }
  return '';
};
const getBodyText = (block) => getText(block, ['text', 'content']);

const getAssetUrl = (asset = {}) => asset.url || asset.secure_url || asset.previewUrl || asset.fileUrl || asset.downloadUrl || '';
const getBlockCaption = (block = {}, asset = {}) => block.caption || asset.caption || asset.title || '';

const orderedBlocks = (blocks = []) => [...(Array.isArray(blocks) ? blocks : [])]
  .filter(Boolean)
  .sort((a, b) => (Number.isFinite(Number(a?.order)) ? Number(a.order) : 0) - (Number.isFinite(Number(b?.order)) ? Number(b.order) : 0));

// Sorts once and gives every block a stable `_key`, so rendering never has to
// re-sort or guess ids (study state, anchors and collapse all key off it).
const prepareBlocks = (blocks, prefix = 'b') => orderedBlocks(blocks).map((block, index) => {
  const key = block.id ? String(block.id) : `${prefix}-${index}`;
  const next = { ...block, _key: key };
  const nested = Array.isArray(block.blocks) ? block.blocks
    : (NESTED_TYPES.has(block.type) && Array.isArray(block.children) ? block.children : null);
  if (nested) next.blocks = prepareBlocks(nested, key);
  return next;
});

const shouldSkipCaption = (blocks, index) => {
  const block = blocks[index];
  if (block?.type !== 'caption') return false;
  const previous = blocks[index - 1];
  if (!previous || !['image', 'diagram'].includes(previous.type)) return false;
  const caption = getText(block).trim();
  return Boolean(caption && caption === String(previous.caption || '').trim());
};

const normalizeListItems = (block = {}) => {
  if (Array.isArray(block.items)) return block.items;
  if (Array.isArray(block.children)) return block.children;
  return [];
};

const normalizeTable = (block = {}) => ({
  columns: Array.isArray(block.columns) ? block.columns : [],
  rows: Array.isArray(block.rows) ? block.rows : [],
});

const headingLevel = (level) => Math.min(Math.max(Number(level) || 2, 1), 3);

// "(a)", "a.", "Question 3" -> "a", "a", "3" so we never render "((a))" or "1..".
const cleanLabel = (value) => String(value ?? '')
  .trim()
  .replace(/^question\s*/i, '')
  .replace(/^\(+|\)+$/g, '')
  .replace(/\.+$/, '');

const formatMarks = (value) => {
  const text = String(value ?? '').replace(/^\[|\]$/g, '').trim();
  if (!text) return '';
  return /^\d+(\.\d+)?$/.test(text) ? `${text} ${text === '1' ? 'mark' : 'marks'}` : text;
};

const sumMarks = (blocks = []) => blocks.reduce((total, block) => {
  if (block.type === 'question' || block.type === 'subquestion') {
    const marks = parseFloat(String(block.marks ?? '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(marks)) return total + marks;
  }
  return total + sumMarks(block.blocks || []);
}, 0);

const countWords = (text) => (String(text || '').trim() ? String(text).trim().split(/\s+/).length : 0);

const collectWords = (blocks = []) => blocks.reduce((total, block) => {
  let words = countWords(getText(block));
  normalizeListItems(block).forEach((item) => { words += countWords(typeof item === 'string' ? item : getText(item)); });
  (block.rows || []).forEach((row) => { if (Array.isArray(row)) row.forEach((cell) => { words += countWords(cell); }); });
  return total + words + collectWords(block.blocks || []);
}, 0);

// Top-level questions only (not subquestions), including those inside sections.
const collectQuestions = (blocks = [], out = []) => {
  blocks.forEach((block) => {
    if (block.type === 'question') out.push({ key: block._key, label: cleanLabel(block.number ?? block.label) });
    else if (block.type === 'section') collectQuestions(block.blocks || [], out);
  });
  return out;
};

const mapPageBreaks = (blocks = [], map = new Map(), counter = { n: 1 }) => {
  blocks.forEach((block) => {
    if (block.type === 'page-break') { counter.n += 1; map.set(block._key, counter.n); }
    if (block.blocks) mapPageBreaks(block.blocks, map, counter);
  });
  return map;
};

const summarize = (block) => {
  const raw = getBodyText(block) || (block.blocks || []).map((child) => getBodyText(child)).find(Boolean) || '';
  const text = raw.replace(/\s+/g, ' ').trim();
  return text.length > 110 ? `${text.slice(0, 110)}…` : text;
};

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

const ReaderContext = createContext(null);
const useReader = () => useContext(ReaderContext);

/* -------------------------------------------------------------------------- */
/*  Reader                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Props
 *  document, onOpenOriginal, canOpenOriginal, readingProgress, onLayout   (unchanged)
 *  onJumpTo(y)               optional. Enables the "Jump to" question strip; y is the offset from the
 *                            top of this reader, so scrollTo({ y: readerY + y }) in your parent.
 *  studyState / onStudyStateChange / initialStudyState
 *                            optional. { done: {[id]: true}, flagged: {[id]: true} }. Pass studyState
 *                            to control/persist it (e.g. AsyncStorage); otherwise it lives in memory.
 */
function PastQuestionDocumentReader({
  document = {},
  onOpenOriginal,
  canOpenOriginal = false,
  readingProgress = 0,
  onLayout,
  onJumpTo,
  studyState,
  onStudyStateChange,
  initialStudyState,
}) {
  const { colors } = useTheme();
  const [scaleIndex, setScaleIndex] = useState(1);
  const scale = TEXT_SCALES[scaleIndex];
  const styles = useMemo(() => createStyles(colors, scale), [colors, scale]);

  const [lightboxFigure, setLightboxFigure] = useState(null);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [localStudy, setLocalStudy] = useState(initialStudyState || { done: {}, flagged: {} });
  const study = studyState || localStudy;
  const studyRef = useRef(study);
  studyRef.current = study;

  const readerRef = useRef(null);
  const anchors = useRef(new Map());

  const content = useMemo(() => prepareBlocks(document.content), [document.content]);
  const assetMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(document.assets) ? document.assets : []).forEach((asset) => { if (asset?.id) map.set(asset.id, asset); });
    return map;
  }, [document.assets]);

  const questions = useMemo(() => collectQuestions(content), [content]);
  const pageNumbers = useMemo(() => mapPageBreaks(content), [content]);
  const stats = useMemo(() => ({
    questions: questions.length,
    marks: sumMarks(content),
    minutes: Math.max(1, Math.ceil(collectWords(content) / 200)),
  }), [content, questions.length]);

  const toggleStudy = useCallback((kind, key) => {
    const current = studyRef.current || { done: {}, flagged: {} };
    const bucket = { ...(current[kind] || {}) };
    if (bucket[key]) delete bucket[key]; else bucket[key] = true;
    const next = { done: {}, flagged: {}, ...current, [kind]: bucket };
    if (!studyState) setLocalStudy(next);
    onStudyStateChange?.(next);
  }, [onStudyStateChange, studyState]);

  const toggleCollapsed = useCallback((key) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const registerAnchor = useCallback((key, node) => {
    if (node) anchors.current.set(key, node); else anchors.current.delete(key);
  }, []);

  const jumpToQuestion = useCallback((key) => {
    const node = anchors.current.get(key);
    const root = readerRef.current;
    if (!node || !root || !onJumpTo) return;
    node.measureLayout(root, (_x, y) => onJumpTo(Math.max(0, y - 12)), () => {});
  }, [onJumpTo]);

  const ctx = useMemo(() => ({
    styles, colors, assetMap, pageNumbers, collapsed, study,
    onOpenImage: setLightboxFigure, toggleStudy, toggleCollapsed, registerAnchor,
  }), [styles, colors, assetMap, pageNumbers, collapsed, study, toggleStudy, toggleCollapsed, registerAnchor]);

  const hasOriginal = Boolean(canOpenOriginal || document.originalFile?.url);

  if (document.status && document.status !== 'published') {
    return (
      <ReaderEmptyState
        icon="lock-closed-outline"
        title="This paper isn't available yet"
        text="Only published past questions can be opened by students."
        styles={styles}
        colors={colors}
      />
    );
  }

  if (!content.length) {
    return (
      <ReaderEmptyState
        icon="document-text-outline"
        title="The readable version isn't ready"
        text={hasOriginal ? 'You can still open the original paper while we finish preparing this one.' : 'The readable content has not been published for this paper yet.'}
        styles={styles}
        colors={colors}
        hasOriginal={hasOriginal}
        onOpenOriginal={onOpenOriginal}
      />
    );
  }

  const doneCount = questions.filter((question) => study?.done?.[question.key]).length;

  return (
    <ReaderContext.Provider value={ctx}>
      <View ref={readerRef} collapsable={false} style={styles.reader} onLayout={onLayout}>
        <ReaderHeader
          document={document}
          stats={stats}
          progress={Math.min(Math.max(Math.round(Number(readingProgress) || 0), 0), 100)}
          questions={questions}
          doneCount={doneCount}
          hasOriginal={hasOriginal}
          onOpenOriginal={onOpenOriginal}
          scaleIndex={scaleIndex}
          onScaleChange={setScaleIndex}
          onJump={onJumpTo ? jumpToQuestion : null}
          study={study}
          styles={styles}
          colors={colors}
        />
        <DocumentBody blocks={content} ctx={ctx} />
        {questions.length > 0 && doneCount === questions.length ? (
          <View style={styles.finishCard}>
            <Ionicons name="trophy-outline" size={22} color={colors.success || '#059669'} />
            <Text style={styles.finishTitle}>You've worked through every question</Text>
            <Text style={styles.finishText}>Nice. Revisit anything you flagged for review.</Text>
          </View>
        ) : null}
        <FigureLightbox figure={lightboxFigure} onClose={() => setLightboxFigure(null)} styles={styles} />
      </View>
    </ReaderContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Header                                                                    */
/* -------------------------------------------------------------------------- */

function ReaderHeader({ document, stats, progress, questions, doneCount, hasOriginal, onOpenOriginal, scaleIndex, onScaleChange, onJump, study, styles, colors }) {
  const code = document.courseCode || document.course;
  const chips = [
    document.courseTitle,
    document.department || document.dept,
    document.level ? `Level ${String(document.level).replace(/^level\s*/i, '')}` : null,
    document.semester || document.examSession || document.session,
    document.year,
    document.examType,
  ].filter(Boolean).map(String);
  const title = document.title || document.name || 'Past question';

  return (
    <View style={styles.cover}>
      <View style={styles.coverTop}>
        {code ? (
          <View style={styles.codeBadge}>
            <Ionicons name="school-outline" size={14} color={colors.brand} />
            <Text style={styles.codeText}>{code}</Text>
          </View>
        ) : <View />}

      </View>

      <Text style={styles.coverTitle} accessibilityRole="header" selectable>{title}</Text>

      {chips.length ? (
        <View style={styles.chipRow}>
          {chips.map((chip, index) => (
            <View key={`${chip}-${index}`} style={styles.metaChip}><Text style={styles.metaChipText}>{chip}</Text></View>
          ))}
        </View>
      ) : null}

      <View style={styles.statRow}>
        <StatTile icon="list-outline" value={stats.questions} label={stats.questions === 1 ? 'question' : 'questions'} styles={styles} colors={colors} />
        {stats.marks ? <StatTile icon="ribbon-outline" value={stats.marks} label="marks" styles={styles} colors={colors} /> : null}
        <StatTile icon="time-outline" value={`~${stats.minutes}`} label="min to read" styles={styles} colors={colors} />
      </View>

      <View style={styles.progressBlock} accessibilityLabel={`Reading progress ${progress}%`}>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressText}>{progress}% read</Text>
          {questions.length ? <Text style={styles.progressText}>{doneCount} of {questions.length} done</Text> : null}
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.sizeControl}>
          <Pressable
            style={({ pressed }) => [styles.sizeButton, scaleIndex === 0 && styles.disabled, pressed && styles.pressed]}
            onPress={() => onScaleChange(Math.max(0, scaleIndex - 1))}
            disabled={scaleIndex === 0}
            accessibilityRole="button"
            accessibilityLabel="Decrease text size"
          >
            <Text style={styles.sizeSmall}>A</Text>
          </Pressable>
          <Text style={styles.sizeLabel}>{Math.round(TEXT_SCALES[scaleIndex] * 100)}%</Text>
          <Pressable
            style={({ pressed }) => [styles.sizeButton, scaleIndex === TEXT_SCALES.length - 1 && styles.disabled, pressed && styles.pressed]}
            onPress={() => onScaleChange(Math.min(TEXT_SCALES.length - 1, scaleIndex + 1))}
            disabled={scaleIndex === TEXT_SCALES.length - 1}
            accessibilityRole="button"
            accessibilityLabel="Increase text size"
          >
            <Text style={styles.sizeLarge}>A</Text>
          </Pressable>
        </View>
        <Text style={styles.toolbarHint}>Tap a question to collapse it</Text>
      </View>

      {onJump && questions.length > 1 ? (
        <View style={styles.jumpWrap}>
          <Text style={styles.jumpLabel}>Jump to</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jumpRow}>
            {questions.map((question, index) => {
              const done = Boolean(study?.done?.[question.key]);
              const flagged = Boolean(study?.flagged?.[question.key]);
              return (
                <Pressable
                  key={question.key}
                  style={({ pressed }) => [styles.jumpChip, done && styles.jumpChipDone, pressed && styles.pressed]}
                  onPress={() => onJump(question.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to question ${question.label || index + 1}${done ? ', done' : ''}${flagged ? ', flagged' : ''}`}
                >
                  {done
                    ? <Ionicons name="checkmark" size={13} color={colors.success || '#059669'} />
                    : <Text style={styles.jumpChipText}>{question.label || index + 1}</Text>}
                  {flagged ? <View style={styles.jumpFlag} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function StatTile({ icon, value, label, styles, colors }) {
  return (
    <View style={styles.statTile}>
      <Ionicons name={icon} size={16} color={colors.brand} />
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Body (memoized so reading-progress updates don't re-render the document)  */
/* -------------------------------------------------------------------------- */

const DocumentBody = memo(function DocumentBody({ blocks, ctx }) {
  return (
    <ReaderContext.Provider value={ctx}>
      <View style={ctx.styles.documentBody}>
        <BlockList blocks={blocks} depth={0} />
      </View>
    </ReaderContext.Provider>
  );
});

function BlockList({ blocks, depth }) {
  return blocks.map((block, index) => (shouldSkipCaption(blocks, index) ? null : (
    <DocumentBlock key={block._key} block={block} depth={depth} />
  )));
}

function DocumentBlock({ block, depth }) {
  const { styles, colors, pageNumbers } = useReader();
  const text = getText(block);

  if (!SUPPORTED_TYPES.has(block.type)) {
    // Never show "unsupported" to students: fall back to the text if there is any.
    return text ? <Text style={styles.paragraph} selectable>{text}</Text> : null;
  }

  switch (block.type) {
    case 'heading': {
      const level = headingLevel(block.level);
      return <Text style={[styles[`heading${level}`], depth > 0 && styles.nestedHeading]} accessibilityRole="header" selectable>{text}</Text>;
    }
    case 'paragraph':
      return text ? <Text style={styles.paragraph} selectable>{text}</Text> : null;
    case 'instruction':
      return (
        <View style={styles.instructionBox}>
          <View style={styles.calloutHead}>
            <Ionicons name="reader-outline" size={14} color={colors.brand} />
            <Text style={styles.calloutLabel}>Instructions</Text>
          </View>
          <Text style={styles.calloutText} selectable>{text}</Text>
        </View>
      );
    case 'note':
      return (
        <View style={styles.noteBox}>
          <View style={styles.calloutHead}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.calloutLabel, { color: colors.textSecondary }]}>Note</Text>
          </View>
          <Text style={styles.calloutText} selectable>{text}</Text>
        </View>
      );
    case 'question':
    case 'subquestion':
      return <QuestionBlock block={block} depth={depth} />;
    case 'image':
    case 'diagram':
      return <VisualBlock block={block} />;
    case 'table':
      return <TableBlock block={block} />;
    case 'equation':
      return (
        <View style={styles.equationBox}>
          {text
            ? <FormulaMath source={text} size="compact" backgroundColor="transparent" />
            : <Text style={styles.mutedText}>Equation unavailable</Text>}
        </View>
      );
    case 'numbered-list':
    case 'bullet-list':
      return <ListBlock block={block} ordered={block.type === 'numbered-list'} />;
    case 'caption':
      return text ? <Text style={styles.caption} selectable>{text}</Text> : null;
    case 'section':
      return (
        <View style={styles.sectionBlock}>
          {text ? (
            <View style={styles.sectionHead}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle} accessibilityRole="header">{text}</Text>
            </View>
          ) : null}
          <BlockList blocks={block.blocks || []} depth={depth + 1} />
        </View>
      );
    case 'divider':
      return <View style={styles.divider} />;
    case 'page-break':
      return (
        <View style={styles.pageBreak}>
          <View style={styles.pageBreakLine} />
          <Text style={styles.pageBreakText}>Page {pageNumbers.get(block._key) || ''}</Text>
          <View style={styles.pageBreakLine} />
        </View>
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Questions                                                                 */
/* -------------------------------------------------------------------------- */

function MarksPill({ marks, styles }) {
  const label = formatMarks(marks);
  return label ? <View style={styles.marksPill}><Text style={styles.marksText}>{label}</Text></View> : null;
}

function StudyButton({ icon, activeIcon, label, active, tone, onPress, styles, colors }) {
  const color = active ? tone : colors.textSecondary;
  return (
    <Pressable
      style={({ pressed }) => [styles.studyButton, active && { borderColor: tone }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
    >
      <Ionicons name={active ? activeIcon : icon} size={16} color={color} />
      <Text style={[styles.studyButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function QuestionBlock({ block, depth }) {
  const { styles, colors, collapsed, study, toggleStudy, toggleCollapsed, registerAnchor } = useReader();
  const anchorRef = useRef(null);
  const key = block._key;
  const isTopLevel = block.type === 'question' && !block._nested;

  useEffect(() => {
    if (!isTopLevel) return undefined;
    registerAnchor(key, anchorRef.current);
    return () => registerAnchor(key, null);
  }, [isTopLevel, key, registerAnchor]);

  const children = block.blocks || [];
  const body = getBodyText(block);
  const label = cleanLabel(block.number ?? block.label);
  const marks = block.marks;

  if (isTopLevel) {
    const done = Boolean(study?.done?.[key]);
    const flagged = Boolean(study?.flagged?.[key]);
    const isCollapsed = collapsed.has(key);
    const summary = summarize(block);
    return (
      <View
        ref={anchorRef}
        collapsable={false}
        style={[styles.questionCard, done && styles.questionCardDone, flagged && styles.questionCardFlagged]}
      >
        <Pressable
          style={({ pressed }) => [styles.questionHead, pressed && styles.pressed]}
          onPress={() => toggleCollapsed(key)}
          accessibilityRole="button"
          accessibilityState={{ expanded: !isCollapsed }}
          accessibilityLabel={`Question ${label || ''}. ${isCollapsed ? 'Expand' : 'Collapse'}`}
        >
          <View style={[styles.numberBadge, done && styles.numberBadgeDone]}>
            {done
              ? <Ionicons name="checkmark" size={18} color={colors.success || '#059669'} />
              : <Text style={styles.numberBadgeText} numberOfLines={1}>{label || '?'}</Text>}
          </View>
          <View style={styles.questionHeadText}>
            <Text style={styles.questionLabel}>{label ? `Question ${label}` : 'Question'}</Text>
            {isCollapsed && summary ? <Text style={styles.collapsedSummary} numberOfLines={2}>{summary}</Text> : null}
          </View>
          <MarksPill marks={marks} styles={styles} />
          {flagged ? <Ionicons name="bookmark" size={16} color={FLAG_COLOR} /> : null}
          <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.textSecondary} />
        </Pressable>

        {!isCollapsed ? (
          <>
            {body ? <Text style={styles.questionText} selectable>{body}</Text> : null}
            {children.length ? (
              <View style={styles.questionChildren}>
                <BlockList blocks={markNested(children)} depth={depth + 1} />
              </View>
            ) : null}
            <View style={styles.questionFooter}>
              <StudyButton
                icon="checkmark-circle-outline" activeIcon="checkmark-circle" label={done ? 'Done' : 'Mark as done'}
                active={done} tone={colors.success || '#059669'} onPress={() => toggleStudy('done', key)} styles={styles} colors={colors}
              />
              <StudyButton
                icon="bookmark-outline" activeIcon="bookmark" label={flagged ? 'Flagged' : 'Review later'}
                active={flagged} tone={FLAG_COLOR} onPress={() => toggleStudy('flagged', key)} styles={styles} colors={colors}
              />
            </View>
          </>
        ) : null}
      </View>
    );
  }

  // Subquestions (and questions nested inside questions) read as indented parts.
  return (
    <View style={[styles.subQuestion, depth > 2 && styles.deepSubQuestion]}>
      <View style={styles.subLabelChip}>
        <Text style={styles.subLabelText}>{label ? `(${label})` : '•'}</Text>
      </View>
      <View style={styles.questionContent}>
        {(body || formatMarks(marks)) ? (
          <View style={styles.subTextRow}>
            {body ? <Text style={styles.subQuestionText} selectable>{body}</Text> : <View style={{ flex: 1 }} />}
            <MarksPill marks={marks} styles={styles} />
          </View>
        ) : null}
        {children.length ? <BlockList blocks={markNested(children)} depth={depth + 1} /> : null}
      </View>
    </View>
  );
}

// Questions inside a question are parts, not new cards.
const markNested = (blocks) => blocks.map((block) => (block.type === 'question' ? { ...block, _nested: true } : block));

/* -------------------------------------------------------------------------- */
/*  Visuals, tables, lists                                                    */
/* -------------------------------------------------------------------------- */

function VisualBlock({ block }) {
  const { styles, colors, assetMap, onOpenImage } = useReader();
  const [failed, setFailed] = useState(false);
  const asset = block.assetId ? assetMap.get(block.assetId) : null;
  const url = getAssetUrl(asset) || getAssetUrl(block);
  const caption = getBlockCaption(block, asset);
  const altText = block.altText || asset?.altText || caption || (block.type === 'diagram' ? 'Diagram' : 'Document image');

  useEffect(() => { setFailed(false); }, [url]);

  if (!url || failed) {
    return (
      <View style={styles.imageUnavailable}>
        <Ionicons name={failed ? 'cloud-offline-outline' : 'image-outline'} size={22} color={colors.textSecondary} />
        <Text style={styles.mutedText}>
          {failed ? 'This figure failed to load. Check your connection.' : (block.type === 'diagram' ? 'Diagram unavailable' : 'Image unavailable')}
        </Text>
        {failed ? (
          <Pressable style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]} onPress={() => setFailed(false)} accessibilityRole="button" accessibilityLabel="Retry loading figure">
            <Ionicons name="refresh" size={14} color={colors.brand} />
            <Text style={styles.pillButtonText}>Retry</Text>
          </Pressable>
        ) : null}
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.visualBlock}>
      <Pressable
        style={({ pressed }) => [styles.figurePressable, pressed && styles.pressed]}
        onPress={() => onOpenImage({ url, caption, altText })}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${altText}. Open full screen`}
      >
        <Image
          source={{ uri: url }}
          style={styles.documentImage}
          contentFit="contain"
          cachePolicy="disk"
          transition={200}
          accessibilityLabel={altText}
          onError={() => setFailed(true)}
        />
        <View style={styles.expandHint}><Ionicons name="expand-outline" size={14} color={colors.textSecondary} /></View>
      </Pressable>
      {caption ? <Text style={styles.caption} selectable>{caption}</Text> : null}
    </View>
  );
}

function FigureLightbox({ figure, onClose, styles }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const image = figure?.url ? (
    <Image
      source={{ uri: figure.url }}
      style={{ width: '100%', height: Math.round(height * 0.72) }}
      contentFit="contain"
      cachePolicy="disk"
      accessibilityLabel={figure.altText || 'Document image'}
    />
  ) : null;

  return (
    <Modal visible={Boolean(figure)} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.lightbox}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close image" />
        {Platform.OS === 'ios' ? (
          <ScrollView
            style={styles.lightboxScroll}
            contentContainerStyle={styles.lightboxScrollContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            bouncesZoom
            centerContent
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {image}
          </ScrollView>
        ) : (
          <View style={styles.lightboxScrollContent} pointerEvents="box-none">{image}</View>
        )}
        <Pressable
          style={({ pressed }) => [styles.lightboxClose, { top: insets.top + 10 }, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close image"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <View style={[styles.lightboxFooter, { paddingBottom: insets.bottom + 14 }]} pointerEvents="none">
          {figure?.caption ? <Text style={styles.lightboxCaption}>{figure.caption}</Text> : null}
          {Platform.OS === 'ios' ? <Text style={styles.lightboxHint}>Pinch to zoom</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

function TableBlock({ block }) {
  const { styles } = useReader();
  const [width, setWidth] = useState(0);
  const { columns, rows } = normalizeTable(block);

  if (!columns.length && !rows.length) return <Text style={styles.mutedText}>Table unavailable</Text>;

  const columnCount = Math.max(columns.length, ...rows.map((row) => (Array.isArray(row) ? row.length : 0)), 1);
  const safeColumns = columns.length ? columns : Array.from({ length: columnCount }, (_, index) => `Column ${index + 1}`);
  // Fill the available width when the table is narrow; scroll sideways otherwise.
  const cellWidth = Math.max(116, width ? Math.floor(width / columnCount) : 142);
  const overflows = cellWidth * columnCount > width + 1 && width > 0;
  const cell = (value) => (value === null || value === undefined ? '' : String(value));

  return (
    <View style={styles.tableBlock} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.tableFrame}>
        <ScrollView horizontal showsHorizontalScrollIndicator={overflows} scrollEnabled={overflows}>
          <View>
            <View style={styles.tableRow}>
              {safeColumns.map((column, index) => (
                <Text key={`head-${index}`} style={[styles.tableCell, styles.tableHeaderCell, { width: cellWidth }]} selectable>{cell(column)}</Text>
              ))}
            </View>
            {rows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]}>
                {safeColumns.map((_, cellIndex) => (
                  <Text key={`cell-${rowIndex}-${cellIndex}`} style={[styles.tableCell, { width: cellWidth }]} selectable>{cell(row?.[cellIndex])}</Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      {overflows ? <Text style={styles.tableHint}>Swipe sideways to see more columns</Text> : null}
      {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
    </View>
  );
}

function ListBlock({ block, ordered }) {
  const { styles } = useReader();
  const items = normalizeListItems(block);
  if (!items.length) return null;
  return (
    <View style={styles.listBlock}>
      {items.map((item, index) => (
        <View key={`${ordered ? 'number' : 'bullet'}-${index}`} style={styles.listRow}>
          <Text style={styles.listMarker}>{ordered ? `${index + 1}.` : '\u2022'}</Text>
          <Text style={styles.listText} selectable>{typeof item === 'string' ? item : getText(item)}</Text>
        </View>
      ))}
    </View>
  );
}

function ReaderEmptyState({ icon, title, text, styles, colors, hasOriginal = false, onOpenOriginal }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={24} color={colors.brand} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>

    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const createStyles = (colors, scale = 1) => {
  const surface = colors.surfaceSecondary || colors.card;
  const brandLight = colors.brandLight || surface;
  const success = colors.success || '#059669';
  // Font size + proportional line height, both scaled by the reader's text-size setting.
  const ty = (size, ratio = 1.6) => ({ fontSize: Math.round(size * scale * 10) / 10, lineHeight: Math.round(size * scale * ratio) });

  return StyleSheet.create({
    reader: { gap: 16 },
    documentBody: { gap: 16 },
    pressed: { opacity: 0.82 },
    disabled: { opacity: 0.35 },

    // Cover
    cover: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      borderRadius: 20,
      padding: 16,
      gap: 14,
    },
    coverTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: brandLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
    codeText: { color: colors.brand, fontSize: 13.5, fontWeight: '900', letterSpacing: 0.4 },
    coverTitle: { color: colors.textPrimary, fontSize: 24, lineHeight: 31, fontWeight: '900' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metaChip: { borderRadius: 8, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: surface, paddingHorizontal: 9, paddingVertical: 4 },
    metaChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    pillButton: { minHeight: 34, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 999, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: surface },
    pillButtonText: { color: colors.brand, fontSize: 12.5, fontWeight: '900' },

    statRow: { flexDirection: 'row', gap: 8 },
    statTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 },
    statValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
    statLabel: { color: colors.textSecondary, fontSize: 10.5, fontWeight: '700' },

    progressBlock: { gap: 6 },
    progressTrack: { height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.borderDefault },
    progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.brand },
    progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    progressText: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '800' },

    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    sizeControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 999, backgroundColor: surface },
    sizeButton: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center' },
    sizeSmall: { color: colors.textPrimary, fontSize: 12, fontWeight: '900' },
    sizeLarge: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
    sizeLabel: { minWidth: 40, textAlign: 'center', color: colors.textSecondary, fontSize: 11.5, fontWeight: '800' },
    toolbarHint: { flex: 1, textAlign: 'right', color: colors.textSecondary, fontSize: 11.5 },

    jumpWrap: { gap: 6 },
    jumpLabel: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '800' },
    jumpRow: { gap: 7, paddingRight: 8 },
    jumpChip: { minWidth: 36, height: 36, borderRadius: 10, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: surface },
    jumpChipDone: { borderColor: success, backgroundColor: colors.greenLight || surface },
    jumpChipText: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
    jumpFlag: { position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: 4, backgroundColor: FLAG_COLOR },

    // Text
    heading1: { color: colors.textPrimary, ...ty(24, 1.33), fontWeight: '900', marginTop: 4 },
    heading2: { color: colors.textPrimary, ...ty(21, 1.38), fontWeight: '900', marginTop: 4 },
    heading3: { color: colors.textPrimary, ...ty(18, 1.44), fontWeight: '900', marginTop: 2 },
    nestedHeading: { marginTop: 8 },
    paragraph: { color: colors.textPrimary, ...ty(16, 1.62) },
    caption: { color: colors.textSecondary, ...ty(12, 1.45), textAlign: 'center', fontStyle: 'italic' },
    mutedText: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },

    // Callouts
    instructionBox: { borderLeftWidth: 3, borderLeftColor: colors.brand, backgroundColor: brandLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, gap: 6 },
    noteBox: { borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, gap: 6 },
    calloutHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    calloutLabel: { color: colors.brand, fontSize: 12, fontWeight: '900' },
    calloutText: { color: colors.textPrimary, ...ty(14.5, 1.52), fontWeight: '600' },

    // Questions
    questionCard: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 18, backgroundColor: colors.card, padding: 14, gap: 12 },
    questionCardDone: { borderColor: success },
    questionCardFlagged: { borderLeftWidth: 4, borderLeftColor: FLAG_COLOR },
    questionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    questionHeadText: { flex: 1, gap: 2 },
    numberBadge: { minWidth: 38, height: 38, borderRadius: 12, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: brandLight },
    numberBadgeDone: { backgroundColor: colors.greenLight || surface },
    numberBadgeText: { color: colors.brand, fontSize: 16, fontWeight: '900' },
    questionLabel: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '800' },
    collapsedSummary: { color: colors.textPrimary, fontSize: 13, lineHeight: 18 },
    marksPill: { borderRadius: 999, backgroundColor: surface, borderWidth: 1, borderColor: colors.borderDefault, paddingHorizontal: 9, paddingVertical: 3 },
    marksText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
    questionText: { color: colors.textPrimary, ...ty(16.5, 1.65), fontWeight: '700' },
    questionChildren: { gap: 12 },
    questionContent: { flex: 1, gap: 10 },
    questionFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDefault },
    studyButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, backgroundColor: surface },
    studyButtonText: { fontSize: 12.5, fontWeight: '800' },

    subQuestion: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    deepSubQuestion: { paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: colors.borderDefault },
    subLabelChip: { minWidth: 32, borderRadius: 8, backgroundColor: surface, borderWidth: 1, borderColor: colors.borderDefault, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, marginTop: 1 },
    subLabelText: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
    subTextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    subQuestionText: { flex: 1, color: colors.textPrimary, ...ty(15.5, 1.6), fontWeight: '600' },

    // Visuals
    visualBlock: { gap: 6 },
    figurePressable: { borderRadius: 14, overflow: 'hidden', backgroundColor: surface, borderWidth: 1, borderColor: colors.borderDefault },
    documentImage: { width: '100%', height: 224, backgroundColor: surface },
    expandHint: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault },
    imageUnavailable: { minHeight: 96, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center', padding: 14, gap: 6 },
    retryButton: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },

    // Tables
    tableBlock: { gap: 6 },
    tableFrame: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 12, overflow: 'hidden' },
    tableRow: { flexDirection: 'row' },
    tableRowAlt: { backgroundColor: surface },
    tableCell: { minHeight: 42, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.borderDefault, paddingHorizontal: 9, paddingVertical: 9, color: colors.textPrimary, ...ty(13, 1.4) },
    tableHeaderCell: { backgroundColor: brandLight, fontWeight: '900' },
    tableHint: { color: colors.textSecondary, fontSize: 11, textAlign: 'center' },

    equationBox: { minHeight: 84, borderRadius: 12, backgroundColor: surface, borderWidth: 1, borderColor: colors.borderDefault, overflow: 'hidden' },

    // Lists
    listBlock: { gap: 7 },
    listRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    listMarker: { width: 24, color: colors.brand, ...ty(15, 1.65), fontWeight: '900' },
    listText: { flex: 1, color: colors.textPrimary, ...ty(15, 1.65) },

    // Structure
    sectionBlock: { gap: 14, paddingTop: 6 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.brand },
    sectionTitle: { flex: 1, color: colors.textPrimary, ...ty(18, 1.44), fontWeight: '900' },
    divider: { height: 1, backgroundColor: colors.borderDefault, marginVertical: 8 },
    pageBreak: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
    pageBreakLine: { flex: 1, height: 1, backgroundColor: colors.borderDefault },
    pageBreakText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },

    finishCard: { alignItems: 'center', gap: 6, borderWidth: 1, borderColor: success, backgroundColor: colors.greenLight || surface, borderRadius: 18, padding: 18 },
    finishTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900', textAlign: 'center' },
    finishText: { color: colors.textSecondary, fontSize: 12.5, textAlign: 'center' },

    // Empty
    emptyCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 20, padding: 22, alignItems: 'center', gap: 10 },
    emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: brandLight },
    emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', textAlign: 'center' },
    emptyText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 320 },
    emptyOriginalButton: { minHeight: 40, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 999, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: surface, marginTop: 4 },

    // Lightbox
    lightbox: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.94)' },
    lightboxScroll: { flex: 1 },
    lightboxScrollContent: { flexGrow: 1, flex: 1, justifyContent: 'center' },
    lightboxClose: { position: 'absolute', right: 16, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.16)' },
    lightboxFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 4, paddingHorizontal: 24, paddingTop: 10 },
    lightboxCaption: { color: '#fff', fontSize: 13, lineHeight: 19, textAlign: 'center' },
    lightboxHint: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  });
};

export default memo(PastQuestionDocumentReader);