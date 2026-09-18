import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getJson, postJson, putJson } from '../shared/services/backend';
import { useTheme } from '../shared/theme/ThemeContext';

const BLOCK_TYPES = [
  'heading',
  'paragraph',
  'instruction',
  'question',
  'subquestion',
  'image',
  'diagram',
  'table',
  'equation',
  'numbered-list',
  'bullet-list',
  'caption',
  'note',
  'divider',
  'page-break',
  'section',
];

const TEXT_TYPES = new Set(['heading', 'paragraph', 'instruction', 'caption', 'note', 'section']);
const LIST_TYPES = new Set(['numbered-list', 'bullet-list']);
const VISUAL_TYPES = new Set(['image', 'diagram']);
const NESTED_TYPES = new Set(['question', 'subquestion']);

const createId = (prefix = 'block') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeOrder = (blocks = []) => blocks.map((block, index) => ({
  ...block,
  id: block.id || createId(block.type || 'block'),
  order: index,
  blocks: Array.isArray(block.blocks) ? normalizeOrder(block.blocks) : block.blocks,
}));

const legacyQuestionsToContent = (questions = []) => questions.map((question, index) => ({
  id: question.id || createId('question'),
  type: 'question',
  order: index,
  number: String(question.number ?? index + 1),
  blocks: normalizeOrder([
    { id: `${question.id || createId('question')}-text`, type: 'paragraph', text: question.text || '' },
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
}));

const ensureDocumentContent = (item = {}) => {
  if (Array.isArray(item.content) && item.content.length) return normalizeOrder(item.content);
  if (Array.isArray(item.questions) && item.questions.length) return legacyQuestionsToContent(item.questions);
  return [];
};

const createBlock = (type, assets = []) => {
  const id = createId(type);
  if (type === 'heading') return { id, type, level: 1, text: '', order: 0 };
  if (TEXT_TYPES.has(type)) return { id, type, text: '', order: 0 };
  if (type === 'question') return { id, type, number: '', marks: '', blocks: [{ id: createId('paragraph'), type: 'paragraph', text: '', order: 0 }], order: 0 };
  if (type === 'subquestion') return { id, type, number: '', marks: '', blocks: [{ id: createId('paragraph'), type: 'paragraph', text: '', order: 0 }], order: 0 };
  if (VISUAL_TYPES.has(type)) {
    const asset = assets[0] || {};
    return { id, type, assetId: asset.id || '', caption: '', altText: '', order: 0 };
  }
  if (type === 'table') return { id, type, columns: ['Column 1', 'Column 2'], rows: [['', '']], caption: '', order: 0 };
  if (type === 'equation') return { id, type, value: '', format: 'plain', order: 0 };
  if (LIST_TYPES.has(type)) return { id, type, items: [''], order: 0 };
  return { id, type, order: 0 };
};

const updateBlocksAtPath = (rootBlocks, path = [], updater) => {
  if (!path.length) return normalizeOrder(updater(rootBlocks));
  const [head, ...rest] = path;
  return normalizeOrder(rootBlocks.map((block, index) => {
    if (index !== head) return block;
    return {
      ...block,
      blocks: updateBlocksAtPath(Array.isArray(block.blocks) ? block.blocks : [], rest, updater),
    };
  }));
};

const updateBlockAtPath = (rootBlocks, path = [], updater) => {
  const parentPath = path.slice(0, -1);
  const blockIndex = path[path.length - 1];
  return updateBlocksAtPath(rootBlocks, parentPath, (blocks) => blocks.map((block, index) => (
    index === blockIndex ? updater(block) : block
  )));
};

const validateContent = (blocks = [], assets = [], errors = [], path = 'content', seenIds = new Set()) => {
  const assetIds = new Set((assets || []).map((asset) => asset.id).filter(Boolean));
  blocks.forEach((block, index) => {
    const label = `${path}[${index}]`;
    if (!block?.id) errors.push(`${label} is missing an id.`);
    if (block?.id && seenIds.has(block.id)) errors.push(`${label} has a duplicate id.`);
    if (block?.id) seenIds.add(block.id);
    if (!BLOCK_TYPES.includes(block?.type)) errors.push(`${label} has an unsupported type.`);
    if (block.order !== index) errors.push(`${label} has an invalid order.`);
    if (VISUAL_TYPES.has(block?.type)) {
      if (!block.assetId) errors.push(`${label} needs an asset reference.`);
      if (block.assetId && !assetIds.has(block.assetId)) errors.push(`${label} references a missing asset.`);
    }
    if (block.type === 'table' && (!Array.isArray(block.rows) || !Array.isArray(block.columns))) {
      errors.push(`${label} has an invalid table structure.`);
    }
    if (block.type === 'table' && Array.isArray(block.rows) && Array.isArray(block.columns)) {
      block.rows.forEach((row, rowIndex) => {
        if (!Array.isArray(row) || row.length !== block.columns.length) {
          errors.push(`${label}.rows[${rowIndex}] does not match the table columns.`);
        }
      });
    }
    if (Array.isArray(block.blocks)) validateContent(block.blocks, assets, errors, `${label}.blocks`, seenIds);
  });
  return errors;
};

const firstAssetUrl = (asset = {}) => asset.url || asset.secure_url || asset.previewUrl || asset.fileUrl || '';

export default function PastQuestionReviewManager() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0] || null,
    [items, selectedId]
  );

  const hydrateDraft = useCallback((item) => {
    if (!item) {
      setDraft(null);
      return;
    }
    setDraft({
      ...item,
      content: ensureDocumentContent(item),
      assets: Array.isArray(item.assets) ? item.assets : [],
      processing: item.processing || { status: item.processingStatus || 'draft', warnings: item.warnings || [] },
      originalFile: item.originalFile || null,
    });
    setDirty(false);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getJson('/api/past-questions?limit=100');
      const nextItems = Array.isArray(response?.items) ? response.items : [];
      setItems(nextItems);
      const nextSelected = selectedId && nextItems.some((item) => item.id === selectedId)
        ? selectedId
        : nextItems[0]?.id || null;
      setSelectedId(nextSelected);
      hydrateDraft(nextItems.find((item) => item.id === nextSelected) || nextItems[0] || null);
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load past-question drafts.');
    } finally {
      setLoading(false);
    }
  }, [hydrateDraft, selectedId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const selectItem = useCallback((id) => {
    if (dirty) {
      Alert.alert('Unsaved changes', 'Save or discard your changes before switching documents.', [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            const next = items.find((item) => item.id === id);
            setSelectedId(id);
            hydrateDraft(next);
          },
        },
      ]);
      return;
    }
    const next = items.find((item) => item.id === id);
    setSelectedId(id);
    hydrateDraft(next);
  }, [dirty, hydrateDraft, items]);

  const patchDraft = useCallback((updater) => {
    setDraft((current) => {
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return next;
    });
    setDirty(true);
  }, []);

  const updateContent = useCallback((updater) => {
    patchDraft((current) => ({ ...current, content: normalizeOrder(updater(current.content || [])) }));
  }, [patchDraft]);

  const addBlock = useCallback((type, path = []) => {
    updateContent((content) => updateBlocksAtPath(content, path, (blocks) => [...blocks, createBlock(type, draft?.assets || [])]));
  }, [draft?.assets, updateContent]);

  const removeBlock = useCallback((path) => {
    updateContent((content) => updateBlocksAtPath(content, path.slice(0, -1), (blocks) => blocks.filter((_, index) => index !== path[path.length - 1])));
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
    updateContent((content) => updateBlockAtPath(content, path, (block) => ({ ...block, ...changes })));
  }, [updateContent]);

  const updateNestedBlocks = useCallback((path, updater) => {
    updateContent((content) => updateBlockAtPath(content, path, (block) => ({
      ...block,
      blocks: normalizeOrder(updater(Array.isArray(block.blocks) ? block.blocks : [])),
    })));
  }, [updateContent]);

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    const validationErrors = validateContent(draft.content || [], draft.assets || []);
    if (validationErrors.length) {
      Alert.alert('Fix document issues', validationErrors.slice(0, 5).join('\n'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...draft,
        status: 'draft',
        content: normalizeOrder(draft.content || []),
        assets: draft.assets || [],
        originalFile: draft.originalFile || selectedItem?.originalFile || null,
        extractedContent: draft.extractedContent || selectedItem?.extractedContent || null,
        processing: draft.processing || selectedItem?.processing || {},
      };
      const updated = await putJson(`/api/past-questions/${encodeURIComponent(draft.id)}`, payload);
      const savedItem = updated.item || payload;
      setItems((current) => current.map((item) => item.id === draft.id ? savedItem : item));
      hydrateDraft(savedItem);
      Alert.alert('Draft saved', 'Your document edits were saved.');
    } catch (saveError) {
      setError(saveError?.message || 'Draft save failed.');
    } finally {
      setSaving(false);
    }
  }, [draft, hydrateDraft, selectedItem]);

  const convertDocument = useCallback(async () => {
    if (!draft) return;
    setConverting(true);
    setError('');
    try {
      const response = await postJson(`/api/past-questions/${encodeURIComponent(draft.id)}/convert`, {});
      const converted = response.item;
      setItems((current) => current.map((item) => item.id === draft.id ? converted : item));
      hydrateDraft(converted);
      Alert.alert('Conversion complete', response.warnings?.length ? 'Converted with warnings. Please review carefully.' : 'Gemini conversion completed. Please review before publishing.');
    } catch (convertError) {
      setError(convertError?.message || 'Conversion failed.');
    } finally {
      setConverting(false);
    }
  }, [draft, hydrateDraft]);

  const publishItem = useCallback(async () => {
    if (!draft) return;
    if (dirty) {
      Alert.alert('Save changes first', 'Please save the current draft before publishing.');
      return;
    }
    Alert.alert('Publish this document?', 'Make sure you have reviewed the converted content and warnings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          setPublishing(true);
          setError('');
          try {
            const updated = await postJson(`/api/past-questions/${encodeURIComponent(draft.id)}/publish`, {});
            const published = updated.item || { ...draft, status: 'published' };
            setItems((current) => current.map((item) => item.id === draft.id ? published : item));
            hydrateDraft(published);
            Alert.alert('Published', 'The document is now live for students.');
          } catch (publishError) {
            setError(publishError?.message || 'Publish failed.');
          } finally {
            setPublishing(false);
          }
        },
      },
    ]);
  }, [dirty, draft, hydrateDraft]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Loading document drafts...</Text>
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No document found</Text>
        <Text style={styles.emptyText}>Uploaded past questions will appear here after processing.</Text>
      </View>
    );
  }

  const warnings = Array.from(new Set([
    ...(Array.isArray(draft.warnings) ? draft.warnings : []),
    ...(Array.isArray(draft.processing?.warnings) ? draft.processing.warnings : []),
  ].filter(Boolean)));

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.titleArea}>
          <Text style={styles.eyebrow}>Past Question Document Editor</Text>
          <TextInput
            style={styles.titleInput}
            value={draft.title || ''}
            onChangeText={(title) => patchDraft({ title })}
            placeholder="Document title"
            placeholderTextColor={colors.textSecondary}
          />
          <View style={styles.statusRow}>
            <StatusPill label={draft.status || 'draft'} tone={draft.status === 'published' ? 'success' : 'draft'} colors={colors} />
            <StatusPill label={draft.processing?.status || draft.processingStatus || 'pending'} tone={draft.processing?.status === 'failed' ? 'danger' : 'draft'} colors={colors} />
            {dirty ? <Text style={styles.unsavedText}>Unsaved changes</Text> : null}
          </View>
        </View>
        <View style={styles.topActions}>
          <Pressable style={styles.secondaryButton} onPress={loadItems}>
            <Ionicons name="arrow-back-outline" size={15} color={colors.brand} />
            <Text style={styles.secondaryButtonText}>Back to list</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={convertDocument} disabled={converting || !draft.extractedContent}>
            {converting ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="sparkles-outline" size={15} color={colors.brand} />}
            <Text style={styles.secondaryButtonText}>{converting ? 'Converting...' : 'Convert'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={saveDraft} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="save-outline" size={15} color={colors.brand} />}
            <Text style={styles.secondaryButtonText}>{saving ? 'Saving...' : 'Save Draft'}</Text>
          </Pressable>
          <Pressable style={styles.publishButton} onPress={publishItem} disabled={publishing || draft.status === 'published'}>
            {publishing ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="checkmark-circle-outline" size={15} color={colors.onBrand} />}
            <Text style={styles.publishButtonText}>{publishing ? 'Publishing...' : 'Publish'}</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.workspace}>
        <View style={styles.mainPane}>
          <View style={styles.metaCard}>
            <Text style={styles.sectionTitle}>Metadata</Text>
            <View style={styles.metaGrid}>
              {[
                ['courseCode', 'Course code'],
                ['courseTitle', 'Course title'],
                ['department', 'Department'],
                ['institution', 'Institution'],
                ['examSession', 'Session'],
                ['year', 'Year'],
                ['examType', 'Exam type'],
              ].map(([key, label]) => (
                <View key={key} style={styles.metaField}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={String(draft[key] ?? '')}
                    onChangeText={(value) => patchDraft({ [key]: key === 'year' ? value.replace(/[^\d]/g, '') : value })}
                    placeholder={label}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.editorHeader}>
            <Text style={styles.sectionTitle}>Document Blocks</Text>
            <Text style={styles.blockCount}>{(draft.content || []).length} blocks</Text>
          </View>

          <AddBlockBar onAdd={(type) => addBlock(type)} styles={styles} />

          <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorContent}>
            {(draft.content || []).length ? draft.content.map((block, index) => (
              <BlockEditor
                key={block.id || index}
                block={block}
                path={[index]}
                depth={0}
                assets={draft.assets || []}
                styles={styles}
                colors={colors}
                onChange={updateBlock}
                onMove={moveBlock}
                onRemove={removeBlock}
                onAddNested={addBlock}
                onNestedBlocks={updateNestedBlocks}
              />
            )) : (
              <View style={styles.emptyState}>
                <Ionicons name="reader-outline" size={34} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No content blocks</Text>
                <Text style={styles.emptyText}>Add blocks manually or run conversion if extracted content is available.</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.sidePane}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <ScrollView style={styles.selectorScroll} contentContainerStyle={styles.selectorContent}>
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => selectItem(item.id)}
                style={[styles.itemSelector, item.id === draft.id && styles.itemSelectorActive]}
              >
                <Text style={styles.itemSelectorTitle}>{item.title || 'Untitled'}</Text>
                <Text style={styles.itemSelectorMeta}>{item.status || item.processingStatus || 'draft'} - {item.processing?.status || 'pending'}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Source</Text>
            {draft.originalFile?.url ? (
              <Pressable style={styles.primaryButton} onPress={() => Linking.openURL(draft.originalFile.url)}>
                <Ionicons name="document-text-outline" size={16} color={colors.onBrand} />
                <Text style={styles.primaryButtonText}>View Original PDF</Text>
              </Pressable>
            ) : <Text style={styles.mutedText}>No original PDF URL found.</Text>}
            <Text style={styles.mutedText}>{draft.originalFile?.fileName || 'Unknown file'}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Warnings</Text>
            {warnings.length ? warnings.map((warning, index) => (
              <View key={`${warning}-${index}`} style={styles.warningRow}>
                <Ionicons name="warning-outline" size={16} color={colors.warning || '#D97706'} />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            )) : <Text style={styles.mutedText}>No warnings reported.</Text>}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Assets</Text>
            {(draft.assets || []).length ? draft.assets.map((asset) => (
              <View key={asset.id || asset.publicId || asset.url} style={styles.assetItem}>
                {firstAssetUrl(asset) ? <Image source={{ uri: firstAssetUrl(asset) }} style={styles.assetThumb} /> : <View style={styles.assetThumbFallback}><Ionicons name="image-outline" size={18} color={colors.textSecondary} /></View>}
                <View style={styles.assetText}>
                  <Text style={styles.assetTitle}>{asset.id || 'Asset'}</Text>
                  <Text style={styles.assetMeta}>Page {asset.pageNumber || 'N/A'}</Text>
                </View>
              </View>
            )) : <Text style={styles.mutedText}>No extracted assets.</Text>}
          </View>
        </View>
      </View>
    </View>
  );
}

function StatusPill({ label, tone, colors }) {
  const bg = tone === 'success' ? (colors.greenLight || '#ECFDF5') : tone === 'danger' ? (colors.dangerLight || '#FEE2E2') : (colors.amberLight || '#FEF3C7');
  const fg = tone === 'success' ? (colors.success || '#059669') : tone === 'danger' ? (colors.danger || '#DC2626') : (colors.brand || '#4F46E5');
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}>
      <Text style={{ color: fg, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

function AddBlockBar({ onAdd, styles }) {
  return (
    <View style={styles.addBlockBar}>
      <Text style={styles.addBlockLabel}>Add block</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.addBlockChoices}>
          {BLOCK_TYPES.map((type) => (
            <Pressable key={type} style={styles.addBlockChip} onPress={() => onAdd(type)}>
              <Ionicons name="add-outline" size={13} color={styles._colors.brand} />
              <Text style={styles.addBlockChipText}>{type}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function BlockEditor({ block, path, depth, assets, styles, colors, onChange, onMove, onRemove, onAddNested, onNestedBlocks }) {
  const blockAsset = assets.find((asset) => asset.id === block.assetId) || null;
  const nestedBlocks = Array.isArray(block.blocks) ? block.blocks : [];

  return (
    <View style={[styles.blockCard, depth > 0 && styles.nestedBlockCard]}>
      <View style={styles.blockHeader}>
        <View>
          <Text style={styles.blockType}>{block.type}</Text>
          <Text style={styles.blockMeta}>Order {block.order ?? path[path.length - 1]}</Text>
        </View>
        <View style={styles.blockActions}>
          <Pressable onPress={() => onMove(path, -1)} style={styles.iconOnly}><Ionicons name="chevron-up-outline" size={17} color={colors.textSecondary} /></Pressable>
          <Pressable onPress={() => onMove(path, 1)} style={styles.iconOnly}><Ionicons name="chevron-down-outline" size={17} color={colors.textSecondary} /></Pressable>
          <Pressable onPress={() => onRemove(path)} style={styles.iconOnly}><Ionicons name="trash-outline" size={17} color={colors.danger || '#DC2626'} /></Pressable>
        </View>
      </View>

      {TEXT_TYPES.has(block.type) ? (
        <View style={styles.fieldStack}>
          {block.type === 'heading' ? (
            <View style={styles.inlineRow}>
              <Text style={styles.fieldLabel}>Level</Text>
              <TextInput style={styles.smallInput} value={String(block.level || 1)} keyboardType="numeric" onChangeText={(value) => onChange(path, { level: Math.min(Math.max(Number(value) || 1, 1), 6) })} />
            </View>
          ) : null}
          <TextInput
            style={[styles.textArea, block.type === 'paragraph' && { minHeight: 92 }]}
            multiline
            value={block.text || ''}
            onChangeText={(text) => onChange(path, { text })}
            placeholder={`${block.type} text`}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      ) : null}

      {NESTED_TYPES.has(block.type) ? (
        <View style={styles.fieldStack}>
          <View style={styles.inlineRow}>
            <View style={styles.flexField}>
              <Text style={styles.fieldLabel}>{block.type === 'question' ? 'Question number' : 'Subquestion label'}</Text>
              <TextInput style={styles.input} value={String(block.number || '')} onChangeText={(number) => onChange(path, { number })} placeholder="1" placeholderTextColor={colors.textSecondary} />
            </View>
            <View style={styles.flexField}>
              <Text style={styles.fieldLabel}>Marks</Text>
              <TextInput style={styles.input} value={String(block.marks || '')} onChangeText={(marks) => onChange(path, { marks })} placeholder="Optional" placeholderTextColor={colors.textSecondary} />
            </View>
          </View>
          <View style={styles.nestedTools}>
            <Text style={styles.fieldLabel}>Nested content</Text>
            <View style={styles.nestedButtons}>
              {['paragraph', 'subquestion', 'image', 'equation', 'table', 'numbered-list'].map((type) => (
                <Pressable key={type} style={styles.miniButton} onPress={() => onAddNested(type, path)}>
                  <Text style={styles.miniButtonText}>+ {type}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {nestedBlocks.map((child, index) => (
            <BlockEditor
              key={child.id || index}
              block={child}
              path={[...path, index]}
              depth={depth + 1}
              assets={assets}
              styles={styles}
              colors={colors}
              onChange={onChange}
              onMove={onMove}
              onRemove={onRemove}
              onAddNested={onAddNested}
              onNestedBlocks={onNestedBlocks}
            />
          ))}
        </View>
      ) : null}

      {VISUAL_TYPES.has(block.type) ? (
        <View style={styles.fieldStack}>
          {blockAsset && firstAssetUrl(blockAsset) ? <Image source={{ uri: firstAssetUrl(blockAsset) }} style={styles.imagePreview} /> : <Text style={styles.mutedText}>No asset selected.</Text>}
          <Text style={styles.fieldLabel}>Asset</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.assetChoices}>
              {assets.map((asset) => (
                <Pressable key={asset.id} style={[styles.assetChoice, asset.id === block.assetId && styles.assetChoiceActive]} onPress={() => onChange(path, { assetId: asset.id })}>
                  <Text style={styles.assetChoiceText}>{asset.id}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <TextInput style={styles.input} value={block.caption || ''} onChangeText={(caption) => onChange(path, { caption })} placeholder="Caption" placeholderTextColor={colors.textSecondary} />
          <TextInput style={styles.input} value={block.altText || ''} onChangeText={(altText) => onChange(path, { altText })} placeholder="Alt text" placeholderTextColor={colors.textSecondary} />
        </View>
      ) : null}

      {block.type === 'equation' ? (
        <TextInput style={styles.textArea} multiline value={block.value || ''} onChangeText={(value) => onChange(path, { value })} placeholder="Equation value" placeholderTextColor={colors.textSecondary} />
      ) : null}

      {LIST_TYPES.has(block.type) ? (
        <ListEditor block={block} path={path} styles={styles} colors={colors} onChange={onChange} />
      ) : null}

      {block.type === 'table' ? (
        <TableEditor block={block} path={path} styles={styles} colors={colors} onChange={onChange} />
      ) : null}

      {block.type === 'divider' ? <View style={styles.dividerPreview} /> : null}
      {block.type === 'page-break' ? <Text style={styles.pageBreakPreview}>Page break</Text> : null}
    </View>
  );
}

function ListEditor({ block, path, styles, colors, onChange }) {
  const items = Array.isArray(block.items) ? block.items : [];
  return (
    <View style={styles.fieldStack}>
      {items.map((item, index) => (
        <View key={index} style={styles.inlineRow}>
          <Text style={styles.listIndex}>{index + 1}</Text>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={item}
            onChangeText={(value) => onChange(path, { items: items.map((entry, itemIndex) => itemIndex === index ? value : entry) })}
            placeholder="List item"
            placeholderTextColor={colors.textSecondary}
          />
          <Pressable style={styles.iconOnly} onPress={() => onChange(path, { items: items.filter((_, itemIndex) => itemIndex !== index) })}>
            <Ionicons name="close-outline" size={17} color={colors.danger || '#DC2626'} />
          </Pressable>
        </View>
      ))}
      <Pressable style={styles.secondaryButton} onPress={() => onChange(path, { items: [...items, ''] })}>
        <Ionicons name="add-outline" size={15} color={colors.brand} />
        <Text style={styles.secondaryButtonText}>Add item</Text>
      </Pressable>
    </View>
  );
}

function TableEditor({ block, path, styles, colors, onChange }) {
  const columns = Array.isArray(block.columns) && block.columns.length ? block.columns : ['Column 1'];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  const updateCell = (rowIndex, columnIndex, value) => {
    const nextRows = rows.map((row, rIndex) => rIndex === rowIndex
      ? columns.map((_, cIndex) => cIndex === columnIndex ? value : row?.[cIndex] || '')
      : columns.map((_, cIndex) => row?.[cIndex] || ''));
    onChange(path, { rows: nextRows });
  };
  return (
    <View style={styles.fieldStack}>
      <ScrollView horizontal>
        <View>
          <View style={styles.tableRow}>
            {columns.map((column, columnIndex) => (
              <TextInput
                key={columnIndex}
                style={styles.tableCell}
                value={column}
                onChangeText={(value) => onChange(path, { columns: columns.map((entry, index) => index === columnIndex ? value : entry) })}
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
        <Pressable style={styles.miniButton} onPress={() => onChange(path, { rows: [...rows, columns.map(() => '')] })}><Text style={styles.miniButtonText}>+ Row</Text></Pressable>
        <Pressable style={styles.miniButton} onPress={() => rows.length && onChange(path, { rows: rows.slice(0, -1) })}><Text style={styles.miniButtonText}>- Row</Text></Pressable>
        <Pressable style={styles.miniButton} onPress={() => onChange(path, { columns: [...columns, `Column ${columns.length + 1}`], rows: rows.map((row) => [...row, '']) })}><Text style={styles.miniButtonText}>+ Column</Text></Pressable>
        <Pressable style={styles.miniButton} onPress={() => columns.length > 1 && onChange(path, { columns: columns.slice(0, -1), rows: rows.map((row) => row.slice(0, -1)) })}><Text style={styles.miniButtonText}>- Column</Text></Pressable>
      </View>
      <TextInput style={styles.input} value={block.caption || ''} onChangeText={(caption) => onChange(path, { caption })} placeholder="Table caption" placeholderTextColor={colors.textSecondary} />
    </View>
  );
}

const createStyles = (colors) => ({
  _colors: colors,
  container: { gap: 12, paddingBottom: 24 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 10 },
  loadingText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 8 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  emptyText: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  topBar: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 18, padding: 14, gap: 12 },
  titleArea: { gap: 5 },
  eyebrow: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  titleInput: { color: colors.textPrimary, fontSize: 19, fontWeight: '900', borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.inputBackground || colors.surfaceSecondary },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unsavedText: { color: colors.warning || '#D97706', fontSize: 12, fontWeight: '800' },
  workspace: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  mainPane: { flex: 1, minWidth: 520, gap: 12 },
  sidePane: { width: 320, maxWidth: '100%', gap: 12 },
  metaCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 16, padding: 12, gap: 10 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaField: { flexBasis: '31%', minWidth: 140, gap: 5 },
  fieldLabel: { color: colors.textSecondary, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase' },
  input: { minHeight: 42, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, paddingHorizontal: 10, color: colors.textPrimary, backgroundColor: colors.inputBackground || colors.surfaceSecondary, fontSize: 12.5 },
  smallInput: { width: 70, minHeight: 38, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 9, paddingHorizontal: 8, color: colors.textPrimary, backgroundColor: colors.inputBackground || colors.surfaceSecondary },
  textArea: { minHeight: 72, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.inputBackground || colors.surfaceSecondary, borderRadius: 10, padding: 10, color: colors.textPrimary, fontSize: 12.5, textAlignVertical: 'top' },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.textPrimary, fontSize: 15.5, fontWeight: '900' },
  blockCount: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  addBlockBar: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 14, padding: 10, gap: 8 },
  addBlockLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  addBlockChoices: { flexDirection: 'row', gap: 7 },
  addBlockChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.surfaceSecondary || colors.card, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  addBlockChipText: { color: colors.textPrimary, fontSize: 11.5, fontWeight: '800' },
  editorScroll: { maxHeight: 720 },
  editorContent: { gap: 12, paddingBottom: 12 },
  blockCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 14, padding: 12, gap: 10 },
  nestedBlockCard: { backgroundColor: colors.surfaceSecondary || colors.card, marginLeft: 10 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockType: { color: colors.textPrimary, fontSize: 13.5, fontWeight: '900', textTransform: 'capitalize' },
  blockMeta: { color: colors.textSecondary, fontSize: 10.5, marginTop: 2 },
  blockActions: { flexDirection: 'row', gap: 6 },
  iconOnly: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSecondary || colors.card, borderWidth: 1, borderColor: colors.borderDefault },
  fieldStack: { gap: 9 },
  inlineRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  flexField: { flex: 1, gap: 5 },
  nestedTools: { gap: 7 },
  nestedButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniButton: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.card },
  miniButtonText: { color: colors.brand || colors.textPrimary, fontSize: 11, fontWeight: '800' },
  imagePreview: { width: '100%', height: 220, borderRadius: 12, backgroundColor: colors.surfaceSecondary },
  assetChoices: { flexDirection: 'row', gap: 7 },
  assetChoice: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  assetChoiceActive: { borderColor: colors.brand, backgroundColor: colors.brandLight || '#EEF2FF' },
  assetChoiceText: { color: colors.textPrimary, fontSize: 11, fontWeight: '800' },
  listIndex: { width: 22, color: colors.textSecondary, fontWeight: '800' },
  tableRow: { flexDirection: 'row' },
  tableCell: { width: 150, minHeight: 40, borderWidth: 1, borderColor: colors.borderDefault, paddingHorizontal: 8, color: colors.textPrimary, backgroundColor: colors.inputBackground || colors.surfaceSecondary },
  dividerPreview: { height: 1, backgroundColor: colors.borderDefault, marginVertical: 10 },
  pageBreakPreview: { textAlign: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderDefault, paddingVertical: 8 },
  selectorScroll: { maxHeight: 180 },
  selectorContent: { gap: 8 },
  itemSelector: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  itemSelectorActive: { borderColor: colors.brand, backgroundColor: colors.brandLight || '#EEF2FF' },
  itemSelectorTitle: { color: colors.textPrimary, fontSize: 12, fontWeight: '900' },
  itemSelectorMeta: { color: colors.textSecondary, fontSize: 10.5, marginTop: 3 },
  infoCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 14, padding: 12, gap: 10 },
  warningRow: { flexDirection: 'row', gap: 7, alignItems: 'flex-start' },
  warningText: { color: colors.textPrimary, fontSize: 11.5, lineHeight: 17, flex: 1 },
  mutedText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  assetItem: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  assetThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.surfaceSecondary },
  assetThumbFallback: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  assetText: { flex: 1 },
  assetTitle: { color: colors.textPrimary, fontSize: 11.5, fontWeight: '900' },
  assetMeta: { color: colors.textSecondary, fontSize: 10.5, marginTop: 2 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 11, backgroundColor: colors.brand },
  primaryButtonText: { color: colors.onBrand, fontSize: 12.5, fontWeight: '900' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surfaceSecondary || colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  secondaryButtonText: { color: colors.brand || colors.textPrimary, fontSize: 11.5, fontWeight: '800' },
  publishButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  publishButtonText: { color: colors.onBrand, fontSize: 11.5, fontWeight: '800' },
  errorText: { color: colors.danger || '#DC2626', fontSize: 12, fontWeight: '700', paddingHorizontal: 4 },
});
