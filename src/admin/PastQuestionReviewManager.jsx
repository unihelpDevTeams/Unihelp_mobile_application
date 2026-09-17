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
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getJson, postJson, putJson } from '../shared/services/backend';
import { useTheme } from '../shared/theme/ThemeContext';
import { uploadImage } from '../../services/cloudinary';

const normalizeText = (value = '') => String(value ?? '').trim();

const cloneQuestion = (question = {}, index = 0) => {
  const content = Array.isArray(question.content) && question.content.length
    ? question.content.map((block, blockIndex) => ({
        ...block,
        id: block?.id || `${question?.id || index}-block-${blockIndex}`,
      }))
    : [{ id: `${question?.id || index}-text-0`, type: 'text', value: normalizeText(question.text || question.content || '') || '' }];

  return {
    id: question.id || `draft-question-${Date.now()}-${index}`,
    number: Number(question.number ?? index + 1),
    text: normalizeText(question.text || ''),
    content,
    images: Array.isArray(question.images) ? question.images.map((image, imageIndex) => ({
      ...image,
      id: image?.id || `${question?.id || index}-image-${imageIndex}`,
      questionId: image?.questionId || question?.id || '',
    })) : [],
    subQuestions: Array.isArray(question.subQuestions) ? question.subQuestions : [],
  };
};

export default function PastQuestionReviewManager() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getJson('/api/past-questions?limit=100');
      const nextItems = Array.isArray(response?.items) ? response.items : [];
      setItems(nextItems);
      if (!selectedId && nextItems.length) {
        setSelectedId(nextItems[0].id);
      }
      if (selectedId && !nextItems.some((item) => item.id === selectedId)) {
        setSelectedId(nextItems[0]?.id || null);
      }
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load past-question drafts.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0] || null,
    [items, selectedId]
  );

  const updateSelectedItem = useCallback((updater) => {
    setItems((current) => current.map((item) => item.id === selectedId ? updater(item) : item));
  }, [selectedId]);

  const updateQuestion = useCallback((questionId, changes) => {
    updateSelectedItem((item) => ({
      ...item,
      questions: (item.questions || []).map((entry) => entry.id === questionId ? { ...entry, ...changes } : entry),
    }));
  }, [updateSelectedItem]);

  const updateQuestionText = useCallback((questionId, value) => {
    updateSelectedItem((item) => ({
      ...item,
      questions: (item.questions || []).map((entry) => {
        if (entry.id !== questionId) return entry;
        const nextEntry = { ...entry, text: value };
        const blocks = Array.isArray(entry.content) && entry.content.length ? entry.content : [{ id: `${entry.id}-text-0`, type: 'text', value: entry.text || '' }];
        const mappedBlocks = blocks.map((block, blockIndex) => 
          block.type === 'text'
            ? { ...block, id: block.id || `${entry.id}-text-${blockIndex}`, value }
            : block
        );
        return { ...nextEntry, content: mappedBlocks };
      }),
    }));
  }, [updateSelectedItem]);

  const addQuestion = useCallback(() => {
    updateSelectedItem((item) => {
      const nextQuestions = [...(item.questions || [])];
      const questionNumber = nextQuestions.length + 1;
      nextQuestions.push({
        id: `draft-question-${Date.now()}`,
        number: questionNumber,
        text: '',
        content: [{ id: `draft-question-${Date.now()}-text`, type: 'text', value: '' }],
        images: [],
        subQuestions: [],
      });
      return { ...item, questions: nextQuestions };
    });
  }, [updateSelectedItem]);

  const deleteQuestion = useCallback((questionId) => {
    updateSelectedItem((item) => ({
      ...item,
      questions: (item.questions || []).filter((entry) => entry.id !== questionId),
    }));
  }, [updateSelectedItem]);

  const reorderQuestion = useCallback((questionId, direction) => {
    updateSelectedItem((item) => {
      const questions = [...(item.questions || [])];
      const index = questions.findIndex((entry) => entry.id === questionId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= questions.length) return item;
      const reordered = [...questions];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, moved);
      return { ...item, questions: reordered.map((entry, position) => ({ ...entry, number: position + 1 })) };
    });
  }, [updateSelectedItem]);

  const addQuestionImage = useCallback(async (questionId) => {
    if (!selectedItem) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow media access so extracted figures and diagrams can be attached to the correct question.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    try {
      const uploaded = await uploadImage({
        uri: asset.uri,
        name: asset.fileName || `question-${questionId}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      });
      const imageAsset = {
        id: `${questionId}-image-${Date.now()}`,
        url: uploaded?.secure_url || uploaded?.url || '',
        publicId: uploaded?.public_id || uploaded?.publicId || '',
        caption: 'Figure',
        questionId,
      };

      updateSelectedItem((item) => ({
        ...item,
        questions: (item.questions || []).map((entry) => entry.id === questionId ? { ...entry, images: [...(entry.images || []), imageAsset] } : entry),
      }));
    } catch (uploadError) {
      Alert.alert('Image upload failed', uploadError?.message || 'Could not attach the extracted visual asset.');
    }
  }, [selectedItem, updateSelectedItem]);

  const replaceQuestionImage = useCallback(async (questionId, imageIndex) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow media access to replace an extracted diagram or figure.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    try {
      const uploaded = await uploadImage({
        uri: asset.uri,
        name: asset.fileName || `question-${questionId}-replacement.jpg`,
        type: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      });
      const imageUrl = uploaded?.secure_url || uploaded?.url || '';
      const publicId = uploaded?.public_id || uploaded?.publicId || '';
      updateSelectedItem((item) => ({
        ...item,
        questions: (item.questions || []).map((entry) => {
          if (entry.id !== questionId) return entry;
          const nextImages = [...(entry.images || [])];
          if (nextImages[imageIndex]) {
            nextImages[imageIndex] = { ...nextImages[imageIndex], url: imageUrl, publicId, questionId };
          }
          return { ...entry, images: nextImages };
        }),
      }));
    } catch (uploadError) {
      Alert.alert('Replacement failed', uploadError?.message || 'Could not replace this visual asset.');
    }
  }, [updateSelectedItem]);

  const removeQuestionImage = useCallback((questionId, imageIndex) => {
    updateSelectedItem((item) => ({
      ...item,
      questions: (item.questions || []).map((entry) => entry.id === questionId ? { ...entry, images: (entry.images || []).filter((_, index) => index !== imageIndex) } : entry),
    }));
  }, [updateSelectedItem]);

  const updateImageCaption = useCallback((questionId, imageIndex, caption) => {
    updateSelectedItem((item) => ({
      ...item,
      questions: (item.questions || []).map((entry) => {
        if (entry.id !== questionId) return entry;
        const nextImages = [...(entry.images || [])];
        if (nextImages[imageIndex]) nextImages[imageIndex] = { ...nextImages[imageIndex], caption };
        return { ...entry, images: nextImages };
      }),
    }));
  }, [updateSelectedItem]);

  const attachUnassignedVisual = useCallback((asset, questionId) => {
    updateSelectedItem((item) => ({
      ...item,
      questions: (item.questions || []).map((entry) => entry.id === questionId
        ? { ...entry, images: [...(entry.images || []), { ...asset, questionId }] }
        : entry),
      unassignedVisualAssets: (item.unassignedVisualAssets || []).filter((entry) => (
        (entry.publicId || entry.url) !== (asset.publicId || asset.url)
      )),
    }));
  }, [updateSelectedItem]);

  const saveDraft = useCallback(async () => {
    if (!selectedItem) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...selectedItem,
        status: 'draft',
        processingStatus: 'draft',
        questions: (selectedItem.questions || []).map((entry) => ({
          ...cloneQuestion(entry, 0),
          images: Array.isArray(entry.images) ? entry.images : [],
        })),
      };
      const updated = await putJson(`/api/past-questions/${encodeURIComponent(selectedItem.id)}`, payload);
      setItems((current) => current.map((item) => item.id === selectedItem.id ? { ...item, ...updated.item, status: 'draft', processingStatus: 'draft' } : item));
      Alert.alert('Draft saved', 'The review draft was saved successfully.');
    } catch (saveError) {
      setError(saveError?.message || 'Draft save failed.');
    } finally {
      setSaving(false);
    }
  }, [selectedItem]);

  const publishItem = useCallback(async () => {
    if (!selectedItem) return;
    setPublishing(true);
    setError('');
    try {
      const payload = {
        ...selectedItem,
        status: 'published',
        processingStatus: 'published',
        questions: (selectedItem.questions || []).map((entry) => ({
          ...cloneQuestion(entry, 0),
          images: Array.isArray(entry.images) ? entry.images : [],
        })),
      };
      const updated = await putJson(`/api/past-questions/${encodeURIComponent(selectedItem.id)}`, payload);
      await postJson(`/api/past-questions/${encodeURIComponent(selectedItem.id)}/publish`, {});
      setItems((current) => current.map((item) => item.id === selectedItem.id ? { ...item, ...updated.item, status: 'published', processingStatus: 'published' } : item));
      Alert.alert('Published', 'The past question is now live for students.');
    } catch (publishError) {
      setError(publishError?.message || 'Publish failed.');
    } finally {
      setPublishing(false);
    }
  }, [selectedItem]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Loading past-question drafts...</Text>
      </View>
    );
  }

  if (!selectedItem) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No draft found</Text>
        <Text style={styles.emptyText}>Uploaded past questions will appear here once the backend finishes processing.</Text>
      </View>
    );
  }

  const questions = Array.isArray(selectedItem.questions) ? selectedItem.questions : [];

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}><Ionicons name="clipboard-outline" size={22} color={colors.brand} /></View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Past Question Review</Text>
            <Text style={styles.headerSubtitle}>Draft verification before publish</Text>
          </View>
          <View style={[styles.statusPill, selectedItem.status === 'published' ? styles.statusPublished : styles.statusDraft]}>
            <Text style={styles.statusText}>{selectedItem.status || selectedItem.processingStatus || 'draft'}</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Course</Text><Text style={styles.summaryValue}>{selectedItem.courseCode || selectedItem.courseTitle || 'Not set'}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Session</Text><Text style={styles.summaryValue}>{selectedItem.session || selectedItem.year || 'Not set'}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Year</Text><Text style={styles.summaryValue}>{selectedItem.year || 'N/A'}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Exam</Text><Text style={styles.summaryValue}>{selectedItem.examType || 'Examination'}</Text></View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaStrong}>{selectedItem.title || 'Untitled past question'}</Text>
          <Text style={styles.metaMuted}>{selectedItem.department || selectedItem.institution || 'No school/department specified'}</Text>
        </View>

        {selectedItem.originalFile?.url ? (
          <Pressable style={styles.primaryButton} onPress={() => Linking.openURL(selectedItem.originalFile.url)}>
            <Ionicons name="document-text-outline" size={16} color={colors.onBrand} />
            <Text style={styles.primaryButtonText}>View original PDF</Text>
          </Pressable>
        ) : null}

        {selectedItem.warnings?.length ? (
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={18} color={colors.warning || '#D97706'} />
            <Text style={styles.warningText}>{selectedItem.warnings.join(' ')}</Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {selectedItem.unassignedVisualAssets?.length ? (
        <View style={styles.unassignedCard}>
          <Text style={styles.sectionTitle}>Visuals requiring question association</Text>
          {selectedItem.unassignedVisualAssets.map((asset, index) => (
            <View key={asset.id || asset.publicId || `${asset.url}-${index}`} style={styles.unassignedItem}>
              {asset.url ? <Image source={{ uri: asset.url }} style={styles.unassignedImage} /> : null}
              <Text style={styles.metaMuted}>{asset.caption || 'Extracted visual page'}</Text>
              <View style={styles.attachChoices}>
                {questions.map((question, questionIndex) => (
                  <Pressable
                    key={question.id || questionIndex}
                    style={styles.attachChoice}
                    onPress={() => attachUnassignedVisual(asset, question.id)}
                  >
                    <Text style={styles.attachChoiceText}>Attach to Q{question.number || questionIndex + 1}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.toolbarRow}>
        <Text style={styles.sectionTitle}>Review draft</Text>
        <View style={styles.toolbarActions}>
          <Pressable style={styles.secondaryButton} onPress={saveDraft} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="save-outline" size={15} color={colors.brand} />}
            <Text style={styles.secondaryButtonText}>{saving ? 'Saving...' : 'Save draft'}</Text>
          </Pressable>
          <Pressable style={styles.publishButton} onPress={publishItem} disabled={publishing || selectedItem.status === 'published'}>
            {publishing ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="checkmark-circle-outline" size={15} color={colors.onBrand} />}
            <Text style={styles.publishButtonText}>{publishing ? 'Publishing...' : 'Publish'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.listManager}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSelectedId(item.id)}
            style={[styles.itemSelector, item.id === selectedItem.id && styles.itemSelectorActive]}
          >
            <Text style={styles.itemSelectorTitle}>{item.title || 'Untitled'}</Text>
            <Text style={styles.itemSelectorMeta}>{item.status || item.processingStatus || 'draft'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorContent}>
        {questions.length ? questions.map((question, index) => (
          <View key={question.id || `${index}-${question.number}`} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionIndex}>Question {question.number || index + 1}</Text>
              <View style={styles.questionActions}>
                <Pressable onPress={() => reorderQuestion(question.id, -1)}><Ionicons name="chevron-up-outline" size={18} color={colors.textSecondary} /></Pressable>
                <Pressable onPress={() => reorderQuestion(question.id, 1)}><Ionicons name="chevron-down-outline" size={18} color={colors.textSecondary} /></Pressable>
                <Pressable onPress={() => deleteQuestion(question.id)}><Ionicons name="trash-outline" size={18} color={colors.danger || '#DC2626'} /></Pressable>
              </View>
            </View>

            <TextInput
              style={styles.textArea}
              multiline
              value={question.text || ''}
              onChangeText={(text) => updateQuestionText(question.id, text)}
              placeholder="Edit the question text..."
              placeholderTextColor={colors.textSecondary}
            />

            {Array.isArray(question.images) && question.images.length ? (
              <View style={styles.imageSection}>
                {question.images.map((image, imageIndex) => (
                  <View key={image.id || `${question.id}-image-${imageIndex}`} style={styles.imageCard}>
                    {image.url ? (
                      <Image source={{ uri: image.url }} style={styles.imagePreview} />
                    ) : null}
                    <TextInput
                      style={styles.captionInput}
                      value={image.caption || ''}
                      onChangeText={(caption) => updateImageCaption(question.id, imageIndex, caption)}
                      placeholder="Figure caption"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <View style={styles.imageActions}>
                      <Pressable style={styles.iconButton} onPress={() => replaceQuestionImage(question.id, imageIndex)}>
                        <Ionicons name="refresh-outline" size={15} color={colors.brand} />
                        <Text style={styles.iconButtonText}>Replace</Text>
                      </Pressable>
                      <Pressable style={styles.iconButton} onPress={() => removeQuestionImage(question.id, imageIndex)}>
                        <Ionicons name="close-circle-outline" size={15} color={colors.danger || '#DC2626'} />
                        <Text style={styles.iconButtonText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable style={styles.secondaryButton} onPress={() => addQuestionImage(question.id)}>
              <Ionicons name="images-outline" size={15} color={colors.brand} />
              <Text style={styles.secondaryButtonText}>Add image / diagram</Text>
            </Pressable>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={30} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No extracted questions</Text>
            <Text style={styles.emptyText}>Add a question block and attach the original paper details manually if extraction did not detect one.</Text>
          </View>
        )}

        <Pressable style={styles.addQuestionButton} onPress={addQuestion}>
          <Ionicons name="add-circle-outline" size={17} color={colors.onBrand} />
          <Text style={styles.addQuestionButtonText}>Add question</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => ({
  container: { gap: 12, paddingBottom: 24 },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 10 },
  loadingText: { color: colors.textSecondary, fontSize: 12.5, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 8 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  emptyText: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  headerCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 18, padding: 14, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.brandLight || '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  headerSubtitle: { color: colors.textSecondary, fontSize: 11.5, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusDraft: { backgroundColor: colors.amberLight || '#FEF3C7' },
  statusPublished: { backgroundColor: colors.greenLight || '#ECFDF5' },
  statusText: { color: colors.brandText || colors.brand, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryCard: { flexBasis: '48%', backgroundColor: colors.surfaceSecondary || colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 12, padding: 10 },
  summaryLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  summaryValue: { color: colors.textPrimary, fontSize: 12.5, fontWeight: '800', marginTop: 4 },
  metaRow: { gap: 3 },
  metaStrong: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  metaMuted: { color: colors.textSecondary, fontSize: 11.5 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 11, backgroundColor: colors.brand },
  primaryButtonText: { color: colors.onBrand, fontSize: 12.5, fontWeight: '900' },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningLight || '#FFF7ED', borderWidth: 1, borderColor: colors.warningBorder || '#FDBA74', borderRadius: 12, padding: 10 },
  warningText: { color: colors.textPrimary, fontSize: 11.5, flex: 1 },
  errorText: { color: colors.danger || '#DC2626', fontSize: 12, fontWeight: '700', paddingHorizontal: 4 },
  unassignedCard: { backgroundColor: colors.warningLight || '#FFF7ED', borderWidth: 1, borderColor: colors.warningBorder || '#FDBA74', borderRadius: 14, padding: 12, gap: 10 },
  unassignedItem: { gap: 7 },
  unassignedImage: { width: '100%', height: 180, borderRadius: 10, backgroundColor: colors.card },
  attachChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  attachChoice: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  attachChoiceText: { color: colors.textPrimary, fontSize: 11, fontWeight: '800' },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  toolbarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surfaceSecondary || colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  secondaryButtonText: { color: colors.brand || colors.textPrimary, fontSize: 11.5, fontWeight: '800' },
  publishButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  publishButtonText: { color: colors.onBrand, fontSize: 11.5, fontWeight: '800' },
  listManager: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemSelector: { backgroundColor: colors.surfaceSecondary || colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 120 },
  itemSelectorActive: { borderColor: colors.brand, backgroundColor: colors.brandLight || '#EEF2FF' },
  itemSelectorTitle: { color: colors.textPrimary, fontSize: 11.5, fontWeight: '800' },
  itemSelectorMeta: { color: colors.textSecondary, fontSize: 10, marginTop: 2, textTransform: 'uppercase' },
  editorScroll: { maxHeight: 600 },
  editorContent: { gap: 12, paddingBottom: 10 },
  questionCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 14, padding: 12, gap: 10 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionIndex: { color: colors.textPrimary, fontSize: 13.5, fontWeight: '900' },
  questionActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textArea: { minHeight: 88, borderWidth: 1, borderColor: colors.borderDefault, backgroundColor: colors.inputBackground || colors.surfaceSecondary, borderRadius: 10, padding: 10, color: colors.textPrimary, fontSize: 12.5 },
  imageSection: { gap: 10 },
  imageCard: { gap: 8, backgroundColor: colors.surfaceSecondary || colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 12, padding: 10 },
  imagePreview: { width: '100%', height: 210, borderRadius: 10, backgroundColor: colors.surfaceSecondary },
  captionInput: { minHeight: 42, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 10, paddingHorizontal: 10, color: colors.textPrimary, backgroundColor: colors.inputBackground || colors.card },
  imageActions: { flexDirection: 'row', gap: 8 },
  iconButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 7 },
  iconButtonText: { color: colors.textPrimary, fontSize: 11, fontWeight: '800' },
  addQuestionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 12 },
  addQuestionButtonText: { color: colors.onBrand, fontSize: 12.5, fontWeight: '900' },
});
