import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getJson, postJson, putJson } from '../shared/services/backend';
import { useTheme } from '../shared/theme/ThemeContext';

/* -------------------------------------------------------------------------- */
/*  Block model                                                               */
/* -------------------------------------------------------------------------- */

const BLOCK_META = {
  heading: { label: 'Heading', icon: 'text-outline', accent: '#6366F1' },
  paragraph: { label: 'Paragraph', icon: 'reorder-three-outline', accent: '#6366F1' },
  instruction: { label: 'Instruction', icon: 'megaphone-outline', accent: '#6366F1' },
  question: { label: 'Question', icon: 'help-circle-outline', accent: '#4F46E5' },
  subquestion: { label: 'Subquestion', icon: 'return-down-forward-outline', accent: '#4F46E5' },
  image: { label: 'Image', icon: 'image-outline', accent: '#0EA5E9' },
  diagram: { label: 'Diagram', icon: 'git-network-outline', accent: '#0EA5E9' },
  table: { label: 'Table', icon: 'grid-outline', accent: '#10B981' },
  equation: { label: 'Equation', icon: 'calculator-outline', accent: '#10B981' },
  'numbered-list': { label: 'Numbered list', icon: 'list-outline', accent: '#10B981' },
  'bullet-list': { label: 'Bullet list', icon: 'list-circle-outline', accent: '#10B981' },
  caption: { label: 'Caption', icon: 'pricetag-outline', accent: '#6366F1' },
  note: { label: 'Note', icon: 'bookmark-outline', accent: '#F59E0B' },
  divider: { label: 'Divider', icon: 'remove-outline', accent: '#F59E0B' },
  'page-break': { label: 'Page break', icon: 'cut-outline', accent: '#F59E0B' },
  section: { label: 'Section', icon: 'albums-outline', accent: '#F59E0B' },
};

const BLOCK_TYPES = Object.keys(BLOCK_META);
const TEXT_TYPES = new Set(['heading', 'paragraph', 'instruction', 'caption', 'note', 'section']);
const LIST_TYPES = new Set(['numbered-list', 'bullet-list']);
const VISUAL_TYPES = new Set(['image', 'diagram']);
const NESTED_TYPES = new Set(['question', 'subquestion']);
const NESTED_ADD_TYPES = ['paragraph', 'subquestion', 'image', 'equation', 'table', 'numbered-list'];

const METADATA_FIELDS = [
  ['courseCode', 'Course code'],
  ['courseTitle', 'Course title'],
  ['department', 'Department'],
  ['institution', 'Institution'],
  ['examSession', 'Session'],
  ['year', 'Year'],
  ['examType', 'Exam type'],
];

const STATUS_FILTERS = [['all', 'All'], ['draft', 'Drafts'], ['published', 'Published'], ['failed', 'Failed']];
const HISTORY_LIMIT = 50;

const metaOf = (type) => BLOCK_META[type] || { label: type || 'Block', icon: 'cube-outline', accent: '#64748B' };

const createId = (prefix = 'block') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Re-numbers blocks but reuses the original object when nothing changed, so
// memoized block editors don't re-render on every keystroke elsewhere.
const normalizeOrder = (blocks = []) => blocks.map((block, index) => {
  const nested = Array.isArray(block.blocks) ? normalizeOrder(block.blocks) : null;
  const sameNested = !nested || nested.every((child, i) => child === block.blocks[i]);
  if (block.id && block.order === index && sameNested) return block;
  const next = { ...block, id: block.id || createId(block.type || 'block'), order: index };
  if (nested) next.blocks = nested;
  return next;
});

const legacyQuestionsToContent = (questions = []) => questions.map((question, index) => {
  const questionId = question.id || createId('question');
  return {
    id: questionId,
    type: 'question',
    order: index,
    number: String(question.number ?? index + 1),
    blocks: normalizeOrder([
      { id: `${questionId}-text`, type: 'paragraph', text: question.text || '' },
      ...(Array.isArray(question.images) ? question.images.map((image) => ({
        id: image.id || createId('image'),
        type: 'image',
        assetId: image.assetId || image.id || '',
        url: image.url || '',
        publicId: image.publicId || '',
        caption: image.caption || '',
        altText: image.altText || '',
      })) : []),
      ...(Array.isArray(question.subQuestions) ? question.subQuestions.map((sub, subIndex) => ({
        id: sub.id || createId('subquestion'),
        type: 'subquestion',
        number: String(sub.number ?? subIndex + 1),
        blocks: [{ id: createId('paragraph'), type: 'paragraph', text: sub.text || '' }],
      })) : []),
    ]),
  };
});

const ensureDocumentContent = (item = {}) => {
  if (Array.isArray(item.content) && item.content.length) return normalizeOrder(item.content);
  if (Array.isArray(item.questions) && item.questions.length) return legacyQuestionsToContent(item.questions);
  return [];
};

const createBlock = (type, assets = []) => {
  const id = createId(type);
  const paragraph = () => ({ id: createId('paragraph'), type: 'paragraph', text: '', order: 0 });
  if (type === 'heading') return { id, type, level: 1, text: '', order: 0 };
  if (TEXT_TYPES.has(type)) return { id, type, text: '', order: 0 };
  if (NESTED_TYPES.has(type)) return { id, type, number: '', marks: '', blocks: [paragraph()], order: 0 };
  if (VISUAL_TYPES.has(type)) return { id, type, assetId: assets[0]?.id || '', caption: '', altText: '', order: 0 };
  if (type === 'table') return { id, type, columns: ['Column 1', 'Column 2'], rows: [['', '']], caption: '', order: 0 };
  if (type === 'equation') return { id, type, value: '', format: 'plain', order: 0 };
  if (LIST_TYPES.has(type)) return { id, type, items: [''], order: 0 };
  return { id, type, order: 0 };
};

const cloneBlock = (block) => {
  const copy = { ...block, id: createId(block.type || 'block') };
  if (Array.isArray(block.blocks)) copy.blocks = block.blocks.map(cloneBlock);
  if (Array.isArray(block.items)) copy.items = [...block.items];
  if (Array.isArray(block.columns)) copy.columns = [...block.columns];
  if (Array.isArray(block.rows)) copy.rows = block.rows.map((row) => [...row]);
  return copy;
};

const updateBlocksAtPath = (rootBlocks, path = [], updater) => {
  if (!path.length) return normalizeOrder(updater(rootBlocks));
  const [head, ...rest] = path;
  return normalizeOrder(rootBlocks.map((block, index) => (index !== head ? block : {
    ...block,
    blocks: updateBlocksAtPath(Array.isArray(block.blocks) ? block.blocks : [], rest, updater),
  })));
};

const updateBlockAtPath = (rootBlocks, path = [], updater) => updateBlocksAtPath(
  rootBlocks,
  path.slice(0, -1),
  (blocks) => blocks.map((block, index) => (index === path[path.length - 1] ? updater(block) : block)),
);

// Hard errors block saving; notes are soft review hints.
const inspectContent = (blocks = [], assets = [], out = { errors: [], notes: [] }, parentPath = [], seen = new Set(), assetIds = null) => {
  const ids = assetIds || new Set((assets || []).map((asset) => asset.id).filter(Boolean));
  blocks.forEach((block, index) => {
    const path = [...parentPath, index];
    const error = (message) => out.errors.push({ message, path });
    const note = (message) => out.notes.push({ message, path });
    if (!block || typeof block !== 'object') { error('Block is invalid.'); return; }
    if (!block.id) error('Missing id.');
    else if (seen.has(block.id)) error('Duplicate id.');
    else seen.add(block.id);
    if (!BLOCK_TYPES.includes(block.type)) error('Unsupported block type.');
    if (block.order !== index) error('Invalid order.');
    if (VISUAL_TYPES.has(block.type)) {
      if (!block.assetId) error('Choose an asset for this image.');
      else if (!ids.has(block.assetId)) error('References an asset that no longer exists.');
      else if (!String(block.altText || '').trim()) note('Add alt text for accessibility.');
    }
    if (block.type === 'table') {
      if (!Array.isArray(block.rows) || !Array.isArray(block.columns)) error('Table structure is invalid.');
      else block.rows.forEach((row, rowIndex) => {
        if (!Array.isArray(row) || row.length !== block.columns.length) error(`Row ${rowIndex + 1} does not match the columns.`);
      });
    }
    if (TEXT_TYPES.has(block.type) && !String(block.text || '').trim()) note('Text is empty.');
    if (block.type === 'equation' && !String(block.value || '').trim()) note('Equation is empty.');
    if (LIST_TYPES.has(block.type) && !(block.items || []).some((entry) => String(entry).trim())) note('List has no items.');
    if (block.type === 'question' && !String(block.number || '').trim()) note('Question has no number.');
    if (Array.isArray(block.blocks)) inspectContent(block.blocks, assets, out, path, seen, ids);
  });
  return out;
};

const pathLabel = (path) => `Block ${path.map((i) => i + 1).join('.')}`;

const countBlocks = (blocks = []) => blocks.reduce((total, block) => total + 1 + countBlocks(block.blocks || []), 0);
const countQuestions = (blocks = []) => blocks.filter((block) => block.type === 'question').length;
const sumMarks = (blocks = []) => blocks.reduce((total, block) => {
  if (NESTED_TYPES.has(block.type)) {
    const marks = parseFloat(block.marks);
    if (Number.isFinite(marks)) return total + marks;
  }
  return total + (Array.isArray(block.blocks) ? sumMarks(block.blocks) : 0);
}, 0);

const blockSummary = (block) => {
  const nestedText = Array.isArray(block.blocks) ? (block.blocks.find((child) => child.text)?.text || '') : '';
  const raw = block.text || block.value || (block.items || []).filter(Boolean).join(', ') || block.caption || nestedText;
  const text = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Empty';
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
};

const renumberQuestions = (blocks = []) => {
  let q = 0;
  return blocks.map((block) => {
    if (block.type !== 'question') return block;
    q += 1;
    let s = 0;
    return {
      ...block,
      number: String(q),
      blocks: (block.blocks || []).map((child) => (child.type === 'subquestion'
        ? { ...child, number: `(${String.fromCharCode(97 + (s++ % 26))})` }
        : child)),
    };
  });
};

const firstAssetUrl = (asset = {}) => asset.url || asset.secure_url || asset.previewUrl || asset.fileUrl || '';

/* -------------------------------------------------------------------------- */
/*  Platform-safe dialogs (Alert.alert buttons do nothing on web)             */
/* -------------------------------------------------------------------------- */

const confirmAction = ({ title, message, confirmText = 'OK', destructive = false }) => new Promise((resolve) => {
  if (Platform.OS === 'web') {
    resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false);
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) });
});

const openUrl = async (url, onError) => {
  try {
    await Linking.openURL(url);
  } catch {
    onError?.('Could not open that link.');
  }
};

/* -------------------------------------------------------------------------- */
/*  Main screen                                                               */
/* -------------------------------------------------------------------------- */

export default function PastQuestionReviewManager() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const wide = width >= 980;
  const editorMaxHeight = Math.max(420, Math.round(height * 0.72));

  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null); // { tone, text, action }
  const [mode, setMode] = useState('edit');
  const [tab, setTab] = useState('editor');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [metaOpen, setMetaOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [historyTick, setHistoryTick] = useState(0);

  const draftRef = useRef(null);
  const selectedIdRef = useRef(null);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const lastEditRef = useRef({ key: null, time: 0 });
  const saveRef = useRef(null);

  const busy = saving || publishing || converting;

  const applyDraft = useCallback((next) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const flash = useCallback((text, tone = 'success', action = null) => setNotice({ text, tone, action }), []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), notice.action ? 7000 : 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ---------- Loading ---------- */

  const hydrateDraft = useCallback((item) => {
    pastRef.current = [];
    futureRef.current = [];
    lastEditRef.current = { key: null, time: 0 };
    setHistoryTick((tick) => tick + 1);
    setCollapsed(new Set());
    setDirty(false);
    if (!item) {
      selectedIdRef.current = null;
      applyDraft(null);
      return;
    }
    selectedIdRef.current = item.id;
    applyDraft({
      ...item,
      content: ensureDocumentContent(item),
      assets: Array.isArray(item.assets) ? item.assets : [],
      processing: item.processing || { status: item.processingStatus || 'draft', warnings: item.warnings || [] },
      originalFile: item.originalFile || null,
    });
  }, [applyDraft]);

  // Reads the selected id from a ref so that selecting a document never
  // re-creates this function (which used to re-run the load effect and wipe
  // unsaved edits on every selection).
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getJson('/api/past-questions?limit=100');
      const nextItems = Array.isArray(response?.items) ? response.items : [];
      setItems(nextItems);
      const target = nextItems.find((item) => item.id === selectedIdRef.current) || nextItems[0] || null;
      hydrateDraft(target);
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load past-question drafts.');
    } finally {
      setLoading(false);
    }
  }, [hydrateDraft]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const refresh = useCallback(async () => {
    if (busy) return;
    if (dirty) {
      const ok = await confirmAction({ title: 'Discard unsaved changes?', message: 'Refreshing reloads the document from the server.', confirmText: 'Discard & refresh', destructive: true });
      if (!ok) return;
    }
    loadItems();
  }, [busy, dirty, loadItems]);

  const selectItem = useCallback(async (id) => {
    if (busy) return;
    if (id === draftRef.current?.id) { setTab('editor'); return; }
    if (dirty) {
      const ok = await confirmAction({ title: 'Discard unsaved changes?', message: 'Your edits to this document will be lost.', confirmText: 'Discard', destructive: true });
      if (!ok) return;
    }
    hydrateDraft(items.find((item) => item.id === id) || null);
    setTab('editor');
  }, [busy, dirty, hydrateDraft, items]);

  const discardChanges = useCallback(async () => {
    const ok = await confirmAction({ title: 'Discard changes?', message: 'This reverts the document to the last saved version.', confirmText: 'Discard', destructive: true });
    if (!ok) return;
    hydrateDraft(items.find((item) => item.id === draftRef.current?.id) || null);
  }, [hydrateDraft, items]);

  // Warn before closing the tab with unsaved edits (web only) and add Ctrl/Cmd+S.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onBeforeUnload = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveRef.current?.();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dirty]);

  /* ---------- Editing + history ---------- */

  const patchDraft = useCallback((changes) => {
    const current = draftRef.current;
    if (!current) return;
    applyDraft({ ...current, ...changes });
    setDirty(true);
  }, [applyDraft]);

  // `key` coalesces rapid edits to the same field into one undo step.
  const updateContent = useCallback((updater, key = null) => {
    const current = draftRef.current;
    if (!current) return;
    const previous = current.content || [];
    const next = normalizeOrder(updater(previous));
    if (next === previous) return;
    const now = Date.now();
    if (!(key && key === lastEditRef.current.key && now - lastEditRef.current.time < 1200)) {
      pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), previous];
      futureRef.current = [];
      setHistoryTick((tick) => tick + 1);
    }
    lastEditRef.current = { key, time: now };
    applyDraft({ ...current, content: next });
    setDirty(true);
  }, [applyDraft]);

  const undo = useCallback(() => {
    const current = draftRef.current;
    if (!current || !pastRef.current.length) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, current.content || []];
    lastEditRef.current = { key: null, time: 0 };
    applyDraft({ ...current, content: previous });
    setDirty(true);
    setHistoryTick((tick) => tick + 1);
  }, [applyDraft]);

  const redo = useCallback(() => {
    const current = draftRef.current;
    if (!current || !futureRef.current.length) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, current.content || []];
    lastEditRef.current = { key: null, time: 0 };
    applyDraft({ ...current, content: next });
    setDirty(true);
    setHistoryTick((tick) => tick + 1);
  }, [applyDraft]);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  void historyTick; // re-render trigger for the undo/redo buttons

  const addBlock = useCallback((type, path = []) => {
    updateContent((content) => updateBlocksAtPath(content, path, (blocks) => [...blocks, createBlock(type, draftRef.current?.assets || [])]));
    if (!path.length) flash(`${metaOf(type).label} added at the end.`, 'info');
  }, [flash, updateContent]);

  const removeBlock = useCallback((path) => {
    updateContent((content) => updateBlocksAtPath(content, path.slice(0, -1), (blocks) => blocks.filter((_, index) => index !== path[path.length - 1])));
    flash('Block removed.', 'info', { label: 'Undo', onPress: undo });
  }, [flash, undo, updateContent]);

  const duplicateBlock = useCallback((path) => {
    updateContent((content) => updateBlocksAtPath(content, path.slice(0, -1), (blocks) => {
      const index = path[path.length - 1];
      const next = [...blocks];
      next.splice(index + 1, 0, cloneBlock(blocks[index]));
      return next;
    }));
  }, [updateContent]);

  const moveBlock = useCallback((path, direction) => {
    updateContent((content) => updateBlocksAtPath(content, path.slice(0, -1), (blocks) => {
      const index = path[path.length - 1];
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return blocks;
      const next = [...blocks];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    }));
  }, [updateContent]);

  const updateBlock = useCallback((path, changes) => {
    updateContent(
      (content) => updateBlockAtPath(content, path, (block) => ({ ...block, ...changes })),
      `${path.join('.')}:${Object.keys(changes).join(',')}`,
    );
  }, [updateContent]);

  const toggleCollapse = useCallback((id) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsed(new Set((draftRef.current?.content || []).filter((block) => Array.isArray(block.blocks)).map((block) => block.id)));
  }, []);
  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  const handleRenumber = useCallback(async () => {
    const ok = await confirmAction({
      title: 'Renumber questions?',
      message: 'Questions become 1, 2, 3… and their subquestions (a), (b), (c)… You can undo this.',
      confirmText: 'Renumber',
    });
    if (!ok) return;
    updateContent(renumberQuestions);
    flash('Questions renumbered.', 'success', { label: 'Undo', onPress: undo });
  }, [flash, undo, updateContent]);

  const actions = useMemo(() => ({
    change: updateBlock,
    move: moveBlock,
    remove: removeBlock,
    duplicate: duplicateBlock,
    addNested: addBlock,
    toggleCollapse,
  }), [addBlock, duplicateBlock, moveBlock, removeBlock, toggleCollapse, updateBlock]);

  /* ---------- Server actions ---------- */

  const saveDraft = useCallback(async ({ silent = false } = {}) => {
    const current = draftRef.current;
    if (!current || busy) return null;
    const { errors } = inspectContent(current.content || [], current.assets || []);
    if (errors.length) {
      setError(`Fix ${errors.length} issue${errors.length === 1 ? '' : 's'} before saving. See the Review panel.`);
      setTab('details');
      return null;
    }
    if (!silent && current.status === 'published') {
      const ok = await confirmAction({
        title: 'Save a published document?',
        message: 'Saving moves it back to draft. Publish it again when you are done.',
        confirmText: 'Save as draft',
      });
      if (!ok) return null;
    }
    setSaving(true);
    setError('');
    try {
      const original = items.find((item) => item.id === current.id);
      const payload = {
        ...current,
        status: 'draft',
        content: normalizeOrder(current.content || []),
        assets: current.assets || [],
        originalFile: current.originalFile || original?.originalFile || null,
        extractedContent: current.extractedContent || original?.extractedContent || null,
        processing: current.processing || original?.processing || {},
      };
      const updated = await putJson(`/api/past-questions/${encodeURIComponent(current.id)}`, payload);
      const savedItem = updated?.item || payload;
      setItems((list) => list.map((item) => (item.id === current.id ? savedItem : item)));
      hydrateDraft(savedItem);
      if (!silent) flash('Draft saved.');
      return savedItem;
    } catch (saveError) {
      setError(saveError?.message || 'Draft save failed.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [busy, flash, hydrateDraft, items]);

  useEffect(() => { saveRef.current = () => saveDraft(); }, [saveDraft]);

  const convertDocument = useCallback(async () => {
    const current = draftRef.current;
    if (!current || busy) return;
    if (dirty || (current.content || []).length) {
      const ok = await confirmAction({
        title: 'Run conversion?',
        message: 'Conversion regenerates the document blocks from the extracted PDF content. Your current blocks and unsaved edits will be replaced.',
        confirmText: 'Convert',
        destructive: true,
      });
      if (!ok) return;
    }
    setConverting(true);
    setError('');
    try {
      const response = await postJson(`/api/past-questions/${encodeURIComponent(current.id)}/convert`, {});
      const converted = response?.item;
      if (!converted) throw new Error('Conversion returned no document.');
      setItems((list) => list.map((item) => (item.id === current.id ? converted : item)));
      hydrateDraft(converted);
      flash(response.warnings?.length ? 'Converted with warnings. Review carefully before publishing.' : 'Conversion complete. Review before publishing.', response.warnings?.length ? 'warning' : 'success');
    } catch (convertError) {
      setError(convertError?.message || 'Conversion failed.');
    } finally {
      setConverting(false);
    }
  }, [busy, dirty, flash, hydrateDraft]);

  const publishItem = useCallback(async () => {
    const current = draftRef.current;
    if (!current || busy) return;
    const { errors, notes } = inspectContent(current.content || [], current.assets || []);
    if (errors.length) {
      setError(`Fix ${errors.length} issue${errors.length === 1 ? '' : 's'} before publishing. See the Review panel.`);
      setTab('details');
      return;
    }
    const ok = await confirmAction({
      title: 'Publish this document?',
      message: [
        dirty ? 'Your unsaved changes will be saved first.' : null,
        notes.length ? `${notes.length} review note${notes.length === 1 ? '' : 's'} still open.` : 'No open review notes.',
        'Students will see it right away.',
      ].filter(Boolean).join('\n'),
      confirmText: 'Publish',
    });
    if (!ok) return;

    let targetId = current.id;
    if (dirty) {
      const saved = await saveDraft({ silent: true });
      if (!saved) return;
      targetId = saved.id || targetId;
    }
    setPublishing(true);
    setError('');
    try {
      const response = await postJson(`/api/past-questions/${encodeURIComponent(targetId)}/publish`, {});
      const published = response?.item || { ...(draftRef.current || current), status: 'published' };
      setItems((list) => list.map((item) => (item.id === targetId ? published : item)));
      hydrateDraft(published);
      flash('Published. Students can see this document now.');
    } catch (publishError) {
      setError(publishError?.message || 'Publish failed.');
    } finally {
      setPublishing(false);
    }
  }, [busy, dirty, flash, hydrateDraft, saveDraft]);

  /* ---------- Derived data ---------- */

  const content = draft?.content;
  const assets = draft?.assets;
  const inspection = useMemo(() => inspectContent(content || [], assets || []), [content, assets]);
  const issueMap = useMemo(() => {
    const map = {};
    inspection.errors.forEach(({ path }) => { const key = path.join('.'); map[key] = { ...(map[key] || {}), errors: (map[key]?.errors || 0) + 1 }; });
    inspection.notes.forEach(({ path }) => { const key = path.join('.'); map[key] = { ...(map[key] || {}), notes: (map[key]?.notes || 0) + 1 }; });
    return map;
  }, [inspection]);
  const issueSig = useMemo(() => Object.entries(issueMap).map(([key, value]) => `${key}:${value.errors || 0}/${value.notes || 0}`).join('|'), [issueMap]);
  const collapsedSig = useMemo(() => [...collapsed].sort().join('|'), [collapsed]);
  const stats = useMemo(() => ({
    blocks: countBlocks(content || []),
    questions: countQuestions(content || []),
    marks: sumMarks(content || []),
  }), [content]);

  const metaFilled = draft ? METADATA_FIELDS.filter(([key]) => String(draft[key] ?? '').trim()).length : 0;
  const warnings = useMemo(() => Array.from(new Set([
    ...(Array.isArray(draft?.warnings) ? draft.warnings : []),
    ...(Array.isArray(draft?.processing?.warnings) ? draft.processing.warnings : []),
  ].filter(Boolean))), [draft?.warnings, draft?.processing?.warnings]);

  const visibleDocs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const status = item.status || 'draft';
      const processing = item.processing?.status || item.processingStatus || '';
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'failed' ? processing === 'failed' : status === statusFilter);
      const haystack = `${item.title || ''} ${item.courseCode || ''} ${item.courseTitle || ''} ${item.year || ''}`.toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [items, search, statusFilter]);

  /* ---------- Early states ---------- */

  if (loading && !draft) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.mutedText}>Loading document drafts…</Text>
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={styles.centerWrap}>
        <Ionicons name={error ? 'cloud-offline-outline' : 'document-text-outline'} size={40} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>{error ? 'Could not load documents' : 'No document found'}</Text>
        <Text style={styles.emptyText}>{error || 'Uploaded past questions will appear here after processing.'}</Text>
        <Btn styles={styles} colors={colors} icon="refresh-outline" label="Try again" onPress={loadItems} loading={loading} />
      </View>
    );
  }

  const processingStatus = draft.processing?.status || draft.processingStatus || 'pending';
  const canConvert = Boolean(draft.extractedContent || draft.originalFile?.url);
  const publishDisabled = busy || (draft.status === 'published' && !dirty);

  /* ---------- Pieces ---------- */

  const header = (
    <View style={styles.topBar}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.eyebrow}>Past question editor</Text>
          <TextInput
            style={styles.titleInput}
            value={draft.title || ''}
            onChangeText={(title) => patchDraft({ title })}
            placeholder="Document title"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.statusRow}>
        <StatusPill label={draft.status || 'draft'} tone={draft.status === 'published' ? 'success' : 'draft'} colors={colors} />
        <StatusPill
          label={`Processing: ${processingStatus}`}
          tone={processingStatus === 'failed' ? 'danger' : ['completed', 'converted', 'ready'].includes(processingStatus) ? 'success' : 'draft'}
          colors={colors}
        />
        <Text style={styles.statText}>{stats.questions} questions</Text>
        <Text style={styles.statText}>{stats.blocks} blocks</Text>
        {stats.marks ? <Text style={styles.statText}>{stats.marks} marks</Text> : null}
      </View>

      <View style={styles.topActions}>
        <Btn styles={styles} colors={colors} icon="arrow-undo-outline" label="Undo" onPress={undo} disabled={!canUndo || busy} compact />
        <Btn styles={styles} colors={colors} icon="arrow-redo-outline" label="Redo" onPress={redo} disabled={!canRedo || busy} compact />
        <Btn styles={styles} colors={colors} icon="refresh-outline" label="Refresh" onPress={refresh} disabled={busy} loading={loading} compact />
        <Btn styles={styles} colors={colors} icon="sparkles-outline" label={converting ? 'Converting…' : 'Convert'} onPress={convertDocument} disabled={busy || !canConvert} loading={converting} compact />
        <View style={{ flex: 1 }} />
        <Btn styles={styles} colors={colors} icon="save-outline" label={saving ? 'Saving…' : 'Save draft'} onPress={() => saveDraft()} disabled={busy || !dirty} loading={saving} />
        <Btn styles={styles} colors={colors} variant="primary" icon="checkmark-circle-outline" label={publishing ? 'Publishing…' : 'Publish'} onPress={publishItem} disabled={publishDisabled} loading={publishing} />
      </View>
    </View>
  );

  const banners = (
    <>
      {notice ? (
        <View style={[styles.banner, styles[`banner_${notice.tone}`]]}>
          <Ionicons name={notice.tone === 'warning' ? 'warning-outline' : notice.tone === 'info' ? 'information-circle-outline' : 'checkmark-circle-outline'} size={16} color={colors.textPrimary} />
          <Text style={styles.bannerText}>{notice.text}</Text>
          {notice.action ? (
            <Pressable onPress={() => { notice.action.onPress(); setNotice(null); }} hitSlop={8}>
              <Text style={styles.bannerAction}>{notice.action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error ? (
        <View style={[styles.banner, styles.banner_error]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger || '#DC2626'} />
          <Text style={[styles.bannerText, { color: colors.danger || '#DC2626' }]}>{error}</Text>
          <Pressable onPress={() => setError('')} hitSlop={8}><Ionicons name="close" size={16} color={colors.textSecondary} /></Pressable>
        </View>
      ) : null}
      {dirty ? (
        <View style={[styles.banner, styles.banner_warning]}>
          <Ionicons name="create-outline" size={16} color={colors.textPrimary} />
          <Text style={styles.bannerText}>You have unsaved changes.</Text>
          <Pressable onPress={discardChanges} disabled={busy} hitSlop={8}><Text style={styles.bannerAction}>Discard</Text></Pressable>
          <Pressable onPress={() => saveDraft()} disabled={busy} hitSlop={8}><Text style={[styles.bannerAction, { fontWeight: '900' }]}>Save</Text></Pressable>
        </View>
      ) : null}
    </>
  );

  const metaCard = (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={() => setMetaOpen((open) => !open)} accessibilityRole="button">
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Metadata</Text>
          <Text style={styles.mutedText}>{metaFilled} of {METADATA_FIELDS.length} fields filled</Text>
        </View>
        <Ionicons name={metaOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </Pressable>
      {metaOpen ? (
        <View style={styles.metaGrid}>
          {METADATA_FIELDS.map(([key, label]) => (
            <View key={key} style={styles.metaField}>
              <Text style={styles.fieldLabel}>{label}</Text>
              <TextInput
                style={styles.input}
                value={String(draft[key] ?? '')}
                onChangeText={(value) => patchDraft({ [key]: key === 'year' ? value.replace(/[^\d]/g, '') : value })}
                placeholder={label}
                placeholderTextColor={colors.textSecondary}
                keyboardType={key === 'year' ? 'numeric' : 'default'}
                maxLength={key === 'year' ? 4 : undefined}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  const editorPane = (
    <View style={{ gap: 12 }}>
      <View style={styles.editorHeader}>
        <View style={styles.segment}>
          {[['edit', 'Edit', 'create-outline'], ['preview', 'Preview', 'eye-outline']].map(([key, label, icon]) => (
            <Pressable key={key} style={[styles.segmentItem, mode === key && styles.segmentItemActive]} onPress={() => setMode(key)} accessibilityRole="button" accessibilityState={{ selected: mode === key }}>
              <Ionicons name={icon} size={14} color={mode === key ? colors.onBrand : colors.textSecondary} />
              <Text style={[styles.segmentText, mode === key && { color: colors.onBrand }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {mode === 'edit' ? (
          <View style={styles.editorTools}>
            <Btn styles={styles} colors={colors} icon="swap-vertical-outline" label="Renumber" onPress={handleRenumber} disabled={!stats.questions} compact />
            <Btn styles={styles} colors={colors} icon="contract-outline" label="Collapse" onPress={collapseAll} compact />
            <Btn styles={styles} colors={colors} icon="expand-outline" label="Expand" onPress={expandAll} compact />
            <Btn styles={styles} colors={colors} variant="primary" icon={paletteOpen ? 'close-outline' : 'add-outline'} label="Add block" onPress={() => setPaletteOpen((open) => !open)} compact />
          </View>
        ) : null}
      </View>

      {mode === 'edit' && paletteOpen ? (
        <View style={styles.palette}>
          {BLOCK_TYPES.map((type) => {
            const meta = metaOf(type);
            return (
              <Pressable key={type} style={styles.paletteChip} onPress={() => addBlock(type)} accessibilityRole="button" accessibilityLabel={`Add ${meta.label}`}>
                <View style={[styles.typeChip, { backgroundColor: `${meta.accent}1F` }]}>
                  <Ionicons name={meta.icon} size={14} color={meta.accent} />
                </View>
                <Text style={styles.paletteText}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView
        style={{ maxHeight: editorMaxHeight }}
        contentContainerStyle={styles.editorContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {(content || []).length ? (mode === 'preview' ? (
          <View style={styles.previewPaper}>
            <PreviewBlocks blocks={content} assets={assets || []} styles={styles} colors={colors} />
          </View>
        ) : content.map((block, index) => (
          <BlockEditor
            key={block.id}
            block={block}
            path={[index]}
            pathKey={String(index)}
            depth={0}
            assets={assets || []}
            actions={actions}
            styles={styles}
            colors={colors}
            collapsed={collapsed}
            collapsedSig={collapsedSig}
            issueMap={issueMap}
            issueSig={issueSig}
          />
        ))) : (
          <View style={styles.centerWrap}>
            <Ionicons name="reader-outline" size={34} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No content blocks yet</Text>
            <Text style={styles.emptyText}>Start with a question, or run Convert if extracted content is available.</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn styles={styles} colors={colors} variant="primary" icon="help-circle-outline" label="Add question" onPress={() => addBlock('question')} />
              <Btn styles={styles} colors={colors} icon="reorder-three-outline" label="Add paragraph" onPress={() => addBlock('paragraph')} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const docsPane = (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Documents</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={15} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search title, course, year"
          placeholderTextColor={colors.textSecondary}
        />
        {search ? <Pressable onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={15} color={colors.textSecondary} /></Pressable> : null}
      </View>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(([key, label]) => (
          <Pressable key={key} style={[styles.filterChip, statusFilter === key && styles.filterChipActive]} onPress={() => setStatusFilter(key)}>
            <Text style={[styles.filterChipText, statusFilter === key && { color: colors.brand }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView style={{ maxHeight: wide ? 260 : 520 }} contentContainerStyle={{ gap: 8 }} nestedScrollEnabled>
        {visibleDocs.length ? visibleDocs.map((item) => {
          const active = item.id === draft.id;
          const status = item.status || 'draft';
          const processing = item.processing?.status || item.processingStatus || 'pending';
          return (
            <Pressable key={item.id} onPress={() => selectItem(item.id)} style={[styles.docItem, active && styles.docItemActive]} accessibilityRole="button">
              <Text style={styles.docTitle} numberOfLines={2}>{(active ? draft.title : item.title) || 'Untitled'}{active && dirty ? ' •' : ''}</Text>
              <View style={styles.docMetaRow}>
                <View style={[styles.dot, { backgroundColor: status === 'published' ? (colors.success || '#059669') : '#F59E0B' }]} />
                <Text style={styles.docMeta}>{status}</Text>
                <Text style={styles.docMeta}>·</Text>
                <Text style={[styles.docMeta, processing === 'failed' && { color: colors.danger || '#DC2626' }]}>{processing}</Text>
                {item.year ? <Text style={styles.docMeta}>· {item.year}</Text> : null}
              </View>
            </Pressable>
          );
        }) : <Text style={styles.mutedText}>No documents match.</Text>}
      </ScrollView>
    </View>
  );

  const sourceCard = (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Source</Text>
      {draft.originalFile?.url ? (
        <Btn styles={styles} colors={colors} variant="primary" icon="document-text-outline" label="View original PDF" onPress={() => openUrl(draft.originalFile.url, setError)} />
      ) : <Text style={styles.mutedText}>No original PDF URL found.</Text>}
      <Text style={styles.mutedText} numberOfLines={2}>{draft.originalFile?.fileName || 'Unknown file'}</Text>
    </View>
  );

  const reviewCard = (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.sectionTitle, { flex: 1 }]}>Review</Text>
        <Text style={[styles.countBadge, inspection.errors.length ? styles.countBadgeError : styles.countBadgeOk]}>
          {inspection.errors.length ? `${inspection.errors.length} to fix` : 'Ready'}
        </Text>
      </View>
      {inspection.errors.map((issue, index) => (
        <View key={`e-${index}`} style={styles.issueRow}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger || '#DC2626'} />
          <Text style={styles.issueText}><Text style={styles.issuePath}>{pathLabel(issue.path)}: </Text>{issue.message}</Text>
        </View>
      ))}
      {inspection.notes.slice(0, 12).map((issue, index) => (
        <View key={`n-${index}`} style={styles.issueRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warning || '#D97706'} />
          <Text style={styles.issueText}><Text style={styles.issuePath}>{pathLabel(issue.path)}: </Text>{issue.message}</Text>
        </View>
      ))}
      {inspection.notes.length > 12 ? <Text style={styles.mutedText}>+ {inspection.notes.length - 12} more notes</Text> : null}
      {warnings.map((warning, index) => (
        <View key={`w-${index}`} style={styles.issueRow}>
          <Ionicons name="warning-outline" size={16} color={colors.warning || '#D97706'} />
          <Text style={styles.issueText}>{warning}</Text>
        </View>
      ))}
      {!inspection.errors.length && !inspection.notes.length && !warnings.length ? <Text style={styles.mutedText}>No issues found.</Text> : null}
    </View>
  );

  const assetsCard = (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Assets ({(assets || []).length})</Text>
      {(assets || []).length ? assets.map((asset) => (
        <View key={asset.id || asset.publicId || asset.url} style={styles.assetItem}>
          {firstAssetUrl(asset)
            ? <Image source={{ uri: firstAssetUrl(asset) }} style={styles.assetThumb} />
            : <View style={styles.assetThumbFallback}><Ionicons name="image-outline" size={18} color={colors.textSecondary} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.assetTitle} numberOfLines={1}>{asset.id || 'Asset'}</Text>
            <Text style={styles.assetMeta}>Page {asset.pageNumber || 'N/A'}</Text>
          </View>
        </View>
      )) : <Text style={styles.mutedText}>No extracted assets.</Text>}
    </View>
  );

  /* ---------- Layout ---------- */

  return (
    <View style={styles.container}>
      {header}
      {banners}

      {wide ? (
        <View style={styles.workspace}>
          <View style={styles.mainPane}>
            {metaCard}
            {editorPane}
          </View>
          <View style={styles.sidePane}>
            {docsPane}
            {reviewCard}
            {sourceCard}
            {assetsCard}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            {[
              ['editor', 'Editor', 'create-outline', 0],
              ['details', 'Details', 'information-circle-outline', inspection.errors.length],
              ['docs', 'Documents', 'albums-outline', 0],
            ].map(([key, label, icon, badge]) => (
              <Pressable key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: tab === key }}>
                <Ionicons name={icon} size={15} color={tab === key ? colors.brand : colors.textSecondary} />
                <Text style={[styles.tabText, tab === key && { color: colors.brand }]}>{label}</Text>
                {badge ? <Text style={styles.tabBadge}>{badge}</Text> : null}
              </Pressable>
            ))}
          </View>
          {tab === 'editor' ? editorPane : null}
          {tab === 'details' ? <View style={{ gap: 12 }}>{metaCard}{reviewCard}{sourceCard}{assetsCard}</View> : null}
          {tab === 'docs' ? docsPane : null}
        </>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Small components                                                          */
/* -------------------------------------------------------------------------- */

function Btn({ styles, colors, icon, label, onPress, disabled, loading, variant = 'secondary', compact = false }) {
  const primary = variant === 'primary';
  const fg = primary ? colors.onBrand : colors.brand || colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        primary ? styles.btnPrimary : styles.btnSecondary,
        compact && styles.btnCompact,
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Ionicons name={icon} size={compact ? 14 : 15} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

function StatusPill({ label, tone, colors }) {
  const bg = tone === 'success' ? (colors.greenLight || '#ECFDF5') : tone === 'danger' ? (colors.dangerLight || '#FEE2E2') : (colors.amberLight || '#FEF3C7');
  const fg = tone === 'success' ? (colors.success || '#059669') : tone === 'danger' ? (colors.danger || '#DC2626') : (colors.brand || '#4F46E5');
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={{ color: fg, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

const sameBlockProps = (a, b) => a.block === b.block
  && a.pathKey === b.pathKey
  && a.depth === b.depth
  && a.assets === b.assets
  && a.actions === b.actions
  && a.styles === b.styles
  && a.colors === b.colors
  && a.collapsedSig === b.collapsedSig
  && a.issueSig === b.issueSig;

const BlockEditor = React.memo(function BlockEditor({ block, path, pathKey, depth, assets, actions, styles, colors, collapsed, collapsedSig, issueMap, issueSig }) {
  const meta = metaOf(block.type);
  const nestedBlocks = Array.isArray(block.blocks) ? block.blocks : [];
  const blockAsset = assets.find((asset) => asset.id === block.assetId) || null;
  const isCollapsed = collapsed.has(block.id);
  const issue = issueMap[pathKey];
  const hasNested = NESTED_TYPES.has(block.type);

  return (
    <View style={[
      styles.blockCard,
      { borderLeftColor: meta.accent, borderLeftWidth: 4 },
      depth > 0 && styles.nestedBlockCard,
      issue?.errors ? { borderColor: colors.danger || '#DC2626' } : null,
    ]}
    >
      <View style={styles.blockHeader}>
        <Pressable style={styles.blockTitleWrap} onPress={() => (hasNested || isCollapsed ? actions.toggleCollapse(block.id) : null)} accessibilityRole="button">
          <View style={[styles.typeChip, { backgroundColor: `${meta.accent}1F` }]}>
            <Ionicons name={meta.icon} size={15} color={meta.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.blockType}>{meta.label}{block.number ? ` ${block.number}` : ''}</Text>
              {issue?.errors ? <Text style={[styles.countBadge, styles.countBadgeError]}>{issue.errors}</Text> : null}
              {!issue?.errors && issue?.notes ? <Text style={[styles.countBadge, styles.countBadgeWarn]}>{issue.notes}</Text> : null}
            </View>
            <Text style={styles.blockMeta} numberOfLines={1}>{isCollapsed ? blockSummary(block) : pathLabel(path)}</Text>
          </View>
        </Pressable>
        <View style={styles.blockActions}>
          <IconBtn styles={styles} icon={isCollapsed ? 'chevron-expand-outline' : 'chevron-collapse-outline'} color={colors.textSecondary} label={isCollapsed ? 'Expand block' : 'Collapse block'} onPress={() => actions.toggleCollapse(block.id)} />
          <IconBtn styles={styles} icon="chevron-up-outline" color={colors.textSecondary} label="Move up" onPress={() => actions.move(path, -1)} />
          <IconBtn styles={styles} icon="chevron-down-outline" color={colors.textSecondary} label="Move down" onPress={() => actions.move(path, 1)} />
          <IconBtn styles={styles} icon="copy-outline" color={colors.textSecondary} label="Duplicate block" onPress={() => actions.duplicate(path)} />
          <IconBtn styles={styles} icon="trash-outline" color={colors.danger || '#DC2626'} label="Delete block" onPress={() => actions.remove(path)} />
        </View>
      </View>

      {isCollapsed ? null : (
        <>
          {TEXT_TYPES.has(block.type) ? (
            <View style={styles.fieldStack}>
              {block.type === 'heading' ? (
                <View style={styles.inlineRow}>
                  <Text style={styles.fieldLabel}>Level</Text>
                  {[1, 2, 3, 4].map((level) => (
                    <Pressable key={level} style={[styles.levelChip, (block.level || 1) === level && styles.levelChipActive]} onPress={() => actions.change(path, { level })}>
                      <Text style={[styles.levelChipText, (block.level || 1) === level && { color: colors.brand }]}>H{level}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextInput
                style={[styles.textArea, block.type === 'paragraph' && { minHeight: 92 }]}
                multiline
                value={block.text || ''}
                onChangeText={(text) => actions.change(path, { text })}
                placeholder={`${meta.label} text`}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          ) : null}

          {hasNested ? (
            <View style={styles.fieldStack}>
              <View style={styles.inlineRow}>
                <View style={styles.flexField}>
                  <Text style={styles.fieldLabel}>{block.type === 'question' ? 'Question number' : 'Subquestion label'}</Text>
                  <TextInput style={styles.input} value={String(block.number || '')} onChangeText={(number) => actions.change(path, { number })} placeholder={block.type === 'question' ? '1' : '(a)'} placeholderTextColor={colors.textSecondary} />
                </View>
                <View style={styles.flexField}>
                  <Text style={styles.fieldLabel}>Marks</Text>
                  <TextInput style={styles.input} value={String(block.marks || '')} onChangeText={(marks) => actions.change(path, { marks })} placeholder="Optional" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
                </View>
              </View>
              <View style={styles.nestedButtons}>
                {NESTED_ADD_TYPES.map((type) => (
                  <Pressable key={type} style={styles.miniButton} onPress={() => actions.addNested(type, path)}>
                    <Ionicons name={metaOf(type).icon} size={12} color={colors.brand} />
                    <Text style={styles.miniButtonText}>{metaOf(type).label}</Text>
                  </Pressable>
                ))}
              </View>
              {nestedBlocks.map((child, index) => (
                <BlockEditor
                  key={child.id}
                  block={child}
                  path={[...path, index]}
                  pathKey={`${pathKey}.${index}`}
                  depth={depth + 1}
                  assets={assets}
                  actions={actions}
                  styles={styles}
                  colors={colors}
                  collapsed={collapsed}
                  collapsedSig={collapsedSig}
                  issueMap={issueMap}
                  issueSig={issueSig}
                />
              ))}
            </View>
          ) : null}

          {VISUAL_TYPES.has(block.type) ? (
            <View style={styles.fieldStack}>
              {blockAsset && firstAssetUrl(blockAsset)
                ? <Image source={{ uri: firstAssetUrl(blockAsset) }} style={styles.imagePreview} resizeMode="contain" />
                : <Text style={styles.mutedText}>{assets.length ? 'No asset selected.' : 'No extracted assets on this document, so there is nothing to attach.'}</Text>}
              {assets.length ? (
                <>
                  <Text style={styles.fieldLabel}>Asset</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
                    <View style={styles.assetChoices}>
                      {assets.map((asset) => (
                        <Pressable key={asset.id} style={[styles.assetChoice, asset.id === block.assetId && styles.assetChoiceActive]} onPress={() => actions.change(path, { assetId: asset.id })}>
                          {firstAssetUrl(asset) ? <Image source={{ uri: firstAssetUrl(asset) }} style={styles.assetChoiceThumb} /> : null}
                          <Text style={styles.assetChoiceText} numberOfLines={1}>{asset.pageNumber ? `Page ${asset.pageNumber}` : asset.id}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </>
              ) : null}
              <TextInput style={styles.input} value={block.caption || ''} onChangeText={(caption) => actions.change(path, { caption })} placeholder="Caption" placeholderTextColor={colors.textSecondary} />
              <TextInput style={styles.input} value={block.altText || ''} onChangeText={(altText) => actions.change(path, { altText })} placeholder="Alt text (describe the image)" placeholderTextColor={colors.textSecondary} />
            </View>
          ) : null}

          {block.type === 'equation' ? (
            <TextInput style={[styles.textArea, styles.mono]} multiline value={block.value || ''} onChangeText={(value) => actions.change(path, { value })} placeholder="Equation" placeholderTextColor={colors.textSecondary} autoCapitalize="none" autoCorrect={false} />
          ) : null}

          {LIST_TYPES.has(block.type) ? <ListEditor block={block} path={path} styles={styles} colors={colors} onChange={actions.change} /> : null}
          {block.type === 'table' ? <TableEditor block={block} path={path} styles={styles} colors={colors} onChange={actions.change} /> : null}
          {block.type === 'divider' ? <View style={styles.dividerPreview} /> : null}
          {block.type === 'page-break' ? <Text style={styles.pageBreakPreview}>Page break</Text> : null}
        </>
      )}
    </View>
  );
}, sameBlockProps);

function IconBtn({ styles, icon, color, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconOnly, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}>
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  );
}

function ListEditor({ block, path, styles, colors, onChange }) {
  const items = Array.isArray(block.items) ? block.items : [];
  const ordered = block.type === 'numbered-list';
  return (
    <View style={styles.fieldStack}>
      {items.map((item, index) => (
        <View key={index} style={styles.inlineRow}>
          <Text style={styles.listIndex}>{ordered ? `${index + 1}.` : '•'}</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={item}
            onChangeText={(value) => onChange(path, { items: items.map((entry, i) => (i === index ? value : entry)) })}
            placeholder="List item"
            placeholderTextColor={colors.textSecondary}
          />
          <IconBtn styles={styles} icon="close-outline" color={colors.danger || '#DC2626'} label="Remove item" onPress={() => onChange(path, { items: items.filter((_, i) => i !== index) })} />
        </View>
      ))}
      <View style={{ flexDirection: 'row' }}>
        <Btn styles={styles} colors={colors} icon="add-outline" label="Add item" onPress={() => onChange(path, { items: [...items, ''] })} compact />
      </View>
    </View>
  );
}

function TableEditor({ block, path, styles, colors, onChange }) {
  const columns = Array.isArray(block.columns) && block.columns.length ? block.columns : ['Column 1'];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  const updateCell = (rowIndex, columnIndex, value) => {
    onChange(path, {
      rows: rows.map((row, r) => columns.map((_, c) => (r === rowIndex && c === columnIndex ? value : row?.[c] || ''))),
    });
  };
  return (
    <View style={styles.fieldStack}>
      <ScrollView horizontal nestedScrollEnabled>
        <View>
          <View style={styles.tableRow}>
            {columns.map((column, columnIndex) => (
              <TextInput
                key={columnIndex}
                style={[styles.tableCell, styles.tableHead]}
                value={column}
                onChangeText={(value) => onChange(path, { columns: columns.map((entry, i) => (i === columnIndex ? value : entry)) })}
                placeholder="Column"
                placeholderTextColor={colors.textSecondary}
              />
            ))}
          </View>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              {columns.map((_, columnIndex) => (
                <TextInput
                  key={columnIndex}
                  style={styles.tableCell}
                  value={row?.[columnIndex] || ''}
                  onChangeText={(value) => updateCell(rowIndex, columnIndex, value)}
                  placeholder="Cell"
                  placeholderTextColor={colors.textSecondary}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.nestedButtons}>
        <Pressable style={styles.miniButton} onPress={() => onChange(path, { columns, rows: [...rows, columns.map(() => '')] })}><Text style={styles.miniButtonText}>+ Row</Text></Pressable>
        <Pressable style={styles.miniButton} onPress={() => rows.length && onChange(path, { rows: rows.slice(0, -1) })}><Text style={styles.miniButtonText}>− Row</Text></Pressable>
        <Pressable style={styles.miniButton} onPress={() => onChange(path, { columns: [...columns, `Column ${columns.length + 1}`], rows: rows.map((row) => [...columns.map((_, c) => row?.[c] || ''), '']) })}><Text style={styles.miniButtonText}>+ Column</Text></Pressable>
        <Pressable style={styles.miniButton} onPress={() => columns.length > 1 && onChange(path, { columns: columns.slice(0, -1), rows: rows.map((row) => columns.slice(0, -1).map((_, c) => row?.[c] || '')) })}><Text style={styles.miniButtonText}>− Column</Text></Pressable>
      </View>
      <TextInput style={styles.input} value={block.caption || ''} onChangeText={(caption) => onChange(path, { caption })} placeholder="Table caption" placeholderTextColor={colors.textSecondary} />
    </View>
  );
}

/* Read-only rendering that approximates what students will see. */
function PreviewBlocks({ blocks, assets, styles, colors, depth = 0 }) {
  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block) => {
        const key = block.id;
        switch (block.type) {
          case 'heading':
            return <Text key={key} style={[styles.pvHeading, { fontSize: [24, 20, 17, 15][Math.min(Math.max((block.level || 1) - 1, 0), 3)] }]}>{block.text}</Text>;
          case 'section':
            return <Text key={key} style={styles.pvSection}>{block.text}</Text>;
          case 'instruction':
            return <Text key={key} style={styles.pvInstruction}>{block.text}</Text>;
          case 'note':
            return <View key={key} style={styles.pvNote}><Text style={styles.pvBody}>{block.text}</Text></View>;
          case 'caption':
            return <Text key={key} style={styles.pvCaption}>{block.text}</Text>;
          case 'question':
          case 'subquestion':
            return (
              <View key={key} style={[styles.pvQuestion, block.type === 'subquestion' && { marginLeft: 16 }]}>
                <View style={styles.pvQuestionHead}>
                  <Text style={styles.pvNumber}>{block.number || (block.type === 'question' ? '?' : '•')}</Text>
                  {block.marks ? <Text style={styles.pvMarks}>[{block.marks} marks]</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <PreviewBlocks blocks={block.blocks || []} assets={assets} styles={styles} colors={colors} depth={depth + 1} />
                </View>
              </View>
            );
          case 'image':
          case 'diagram': {
            const asset = assets.find((entry) => entry.id === block.assetId);
            return (
              <View key={key} style={{ gap: 4 }}>
                {asset && firstAssetUrl(asset)
                  ? <Image source={{ uri: firstAssetUrl(asset) }} style={styles.imagePreview} resizeMode="contain" />
                  : <View style={styles.pvMissing}><Text style={styles.mutedText}>Missing asset</Text></View>}
                {block.caption ? <Text style={styles.pvCaption}>{block.caption}</Text> : null}
              </View>
            );
          }
          case 'table':
            return (
              <View key={key} style={{ gap: 4 }}>
                <ScrollView horizontal nestedScrollEnabled>
                  <View>
                    <View style={styles.tableRow}>{(block.columns || []).map((column, i) => <Text key={i} style={[styles.pvCell, styles.pvCellHead]}>{column}</Text>)}</View>
                    {(block.rows || []).map((row, r) => (
                      <View key={r} style={styles.tableRow}>{(block.columns || []).map((_, c) => <Text key={c} style={styles.pvCell}>{row?.[c]}</Text>)}</View>
                    ))}
                  </View>
                </ScrollView>
                {block.caption ? <Text style={styles.pvCaption}>{block.caption}</Text> : null}
              </View>
            );
          case 'equation':
            return <Text key={key} style={[styles.pvBody, styles.mono, styles.pvEquation]}>{block.value}</Text>;
          case 'numbered-list':
          case 'bullet-list':
            return (
              <View key={key} style={{ gap: 4 }}>
                {(block.items || []).map((item, i) => (
                  <Text key={i} style={styles.pvBody}>{block.type === 'numbered-list' ? `${i + 1}. ` : '•  '}{item}</Text>
                ))}
              </View>
            );
          case 'divider':
            return <View key={key} style={styles.dividerPreview} />;
          case 'page-break':
            return <Text key={key} style={styles.pageBreakPreview}>Page break</Text>;
          default:
            return <Text key={key} style={styles.pvBody}>{block.text || ''}</Text>;
        }
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const createStyles = (colors) => {
  const surface = colors.surfaceSecondary || colors.card;
  const inputBg = colors.inputBackground || surface;
  const brandLight = colors.brandLight || '#EEF2FF';
  const danger = colors.danger || '#DC2626';
  const warning = colors.warning || '#D97706';
  return {
    container: { gap: 12, paddingBottom: 24 },
    centerWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, paddingHorizontal: 16, gap: 10 },
    emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    emptyText: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, textAlign: 'center', maxWidth: 360 },
    mutedText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },

    // Header
    topBar: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 18, padding: 14, gap: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    eyebrow: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '700' },
    titleInput: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: inputBg },
    statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    statText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    topActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },

    // Buttons
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, minHeight: 38 },
    btnCompact: { paddingHorizontal: 10, paddingVertical: 7, minHeight: 34 },
    btnPrimary: { backgroundColor: colors.brand },
    btnSecondary: { backgroundColor: surface, borderWidth: 1, borderColor: colors.borderDefault },
    btnText: { fontSize: 12, fontWeight: '800' },

    // Banners
    banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
    banner_success: { backgroundColor: colors.greenLight || '#ECFDF5', borderColor: colors.success || '#A7F3D0' },
    banner_info: { backgroundColor: brandLight, borderColor: colors.brandBorder || colors.borderDefault },
    banner_warning: { backgroundColor: colors.amberLight || '#FEF3C7', borderColor: warning },
    banner_error: { backgroundColor: colors.dangerLight || '#FEE2E2', borderColor: danger },
    bannerText: { flex: 1, color: colors.textPrimary, fontSize: 12.5, fontWeight: '600' },
    bannerAction: { color: colors.brand, fontSize: 12.5, fontWeight: '800' },

    // Layout
    workspace: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    mainPane: { flex: 1, minWidth: 0, gap: 12 },
    sidePane: { width: 330, gap: 12 },
    tabs: { flexDirection: 'row', backgroundColor: surface, borderRadius: 12, padding: 4, gap: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
    tabActive: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault },
    tabText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '800' },
    tabBadge: { backgroundColor: danger, color: '#fff', fontSize: 10, fontWeight: '900', borderRadius: 8, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 1 },

    // Cards
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 16, padding: 14, gap: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metaField: { flexGrow: 1, flexBasis: '30%', minWidth: 150, gap: 5 },
    fieldLabel: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '700' },
    input: { minHeight: 42, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, paddingHorizontal: 10, color: colors.textPrimary, backgroundColor: inputBg, fontSize: 13 },
    textArea: { minHeight: 72, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: inputBg, borderRadius: 10, padding: 10, color: colors.textPrimary, fontSize: 13.5, lineHeight: 20, textAlignVertical: 'top' },
    mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    countBadge: { fontSize: 10.5, fontWeight: '900', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
    countBadgeError: { color: danger, backgroundColor: colors.dangerLight || '#FEE2E2' },
    countBadgeWarn: { color: warning, backgroundColor: colors.amberLight || '#FEF3C7' },
    countBadgeOk: { color: colors.success || '#059669', backgroundColor: colors.greenLight || '#ECFDF5' },

    // Editor
    editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
    editorTools: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    segment: { flexDirection: 'row', backgroundColor: surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.borderDefault },
    segmentItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
    segmentItemActive: { backgroundColor: colors.brand },
    segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
    palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 14, padding: 10 },
    paletteChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: surface, borderRadius: 10, paddingLeft: 6, paddingRight: 12, paddingVertical: 6 },
    paletteText: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
    editorContent: { gap: 12, paddingBottom: 12 },
    typeChip: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    blockCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 14, padding: 12, gap: 10 },
    nestedBlockCard: { backgroundColor: surface, marginLeft: 8 },
    blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    blockTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
    blockType: { color: colors.textPrimary, fontSize: 13.5, fontWeight: '800' },
    blockMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 1 },
    blockActions: { flexDirection: 'row', gap: 4 },
    iconOnly: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: surface, borderWidth: 1, borderColor: colors.borderDefault },
    fieldStack: { gap: 9 },
    inlineRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    flexField: { flex: 1, gap: 5 },
    levelChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: surface },
    levelChipActive: { borderColor: colors.brand, backgroundColor: brandLight },
    levelChipText: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '800' },
    nestedButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    miniButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.card },
    miniButtonText: { color: colors.brand || colors.textPrimary, fontSize: 11, fontWeight: '700' },
    imagePreview: { width: '100%', height: 220, borderRadius: 12, backgroundColor: surface },
    assetChoices: { flexDirection: 'row', gap: 8 },
    assetChoice: { width: 92, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, padding: 4, gap: 4, alignItems: 'center' },
    assetChoiceActive: { borderColor: colors.brand, backgroundColor: brandLight },
    assetChoiceThumb: { width: '100%', height: 56, borderRadius: 7, backgroundColor: surface },
    assetChoiceText: { color: colors.textPrimary, fontSize: 10.5, fontWeight: '700' },
    listIndex: { width: 22, color: colors.textSecondary, fontWeight: '800', textAlign: 'center' },
    tableRow: { flexDirection: 'row' },
    tableCell: { width: 150, minHeight: 40, borderWidth: 1, borderColor: colors.borderDefault, paddingHorizontal: 8, color: colors.textPrimary, backgroundColor: inputBg },
    tableHead: { fontWeight: '800', backgroundColor: surface },
    dividerPreview: { height: 1, backgroundColor: colors.borderDefault, marginVertical: 10 },
    pageBreakPreview: { textAlign: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: '800', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderDefault, paddingVertical: 8 },

    // Preview
    previewPaper: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 14, padding: 18 },
    pvHeading: { color: colors.textPrimary, fontWeight: '800' },
    pvSection: { color: colors.brand, fontSize: 13, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: colors.borderDefault, paddingBottom: 4, marginTop: 6 },
    pvInstruction: { color: colors.textPrimary, fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
    pvBody: { color: colors.textPrimary, fontSize: 14.5, lineHeight: 22 },
    pvCaption: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
    pvNote: { backgroundColor: colors.amberLight || '#FEF3C7', borderRadius: 10, padding: 10 },
    pvQuestion: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    pvQuestionHead: { minWidth: 34, alignItems: 'flex-start', gap: 2 },
    pvNumber: { color: colors.brand, fontSize: 15, fontWeight: '900' },
    pvMarks: { color: colors.textSecondary, fontSize: 10.5, fontWeight: '700' },
    pvEquation: { backgroundColor: surface, borderRadius: 8, padding: 10 },
    pvCell: { width: 150, borderWidth: 1, borderColor: colors.borderDefault, paddingHorizontal: 8, paddingVertical: 8, color: colors.textPrimary, fontSize: 13 },
    pvCellHead: { fontWeight: '800', backgroundColor: surface },
    pvMissing: { height: 80, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center' },

    // Documents list
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: inputBg, borderRadius: 10, paddingHorizontal: 10 },
    searchInput: { flex: 1, minHeight: 38, color: colors.textPrimary, fontSize: 12.5 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: surface },
    filterChipActive: { borderColor: colors.brand, backgroundColor: brandLight },
    filterChipText: { color: colors.textSecondary, fontSize: 11.5, fontWeight: '800' },
    docItem: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: colors.card, gap: 4 },
    docItemActive: { borderColor: colors.brand, backgroundColor: brandLight },
    docTitle: { color: colors.textPrimary, fontSize: 12.5, fontWeight: '800' },
    docMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    docMeta: { color: colors.textSecondary, fontSize: 11 },
    dot: { width: 7, height: 7, borderRadius: 4 },

    // Review + assets
    issueRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
    issueText: { flex: 1, color: colors.textPrimary, fontSize: 12, lineHeight: 17 },
    issuePath: { fontWeight: '800' },
    assetItem: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    assetThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: surface },
    assetThumbFallback: { width: 52, height: 52, borderRadius: 10, backgroundColor: surface, alignItems: 'center', justifyContent: 'center' },
    assetTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '800' },
    assetMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  };
};