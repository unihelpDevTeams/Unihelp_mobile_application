import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { createStory, fetchRecord, updateStory } from '../../services/firestoreSync';
import { colors as themeColors } from '../../src/shared/theme';
import { CLOUDINARY_BASE_URL, CLOUDINARY_CONFIG, isCloudinaryConfigured } from '../../config/cloudinary';

/* =========================================================================
   CONFIG
   ========================================================================= */

const TITLE_MAX = 80;
const SUMMARY_MAX = 500;
const CONTENT_MIN_FOR_PUBLISH = 200; // characters
const WPM = 200; // words per minute, for reading time estimate
const GENRE_SUGGESTIONS = ['Fantasy', 'Sci-Fi', 'Romance', 'Mystery', 'Horror', 'Drama'];

async function uploadImageAsync(uri) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.');
  }

  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'story-image.jpg' });
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  const res = await fetch(`${CLOUDINARY_BASE_URL}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Image upload failed.');
  return data;
}

const toStoryAsset = (uploaded) => ({
  url: uploaded?.secure_url || uploaded?.url || '',
  publicId: uploaded?.public_id || uploaded?.publicId || '',
  resourceType: uploaded?.resource_type || uploaded?.resourceType || 'image',
});

const storyImageUrl = (uploaded) => uploaded?.secure_url || uploaded?.url || '';


function parseStoryContent(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let buffer = [];

  const flush = () => {
    if (buffer.length) {
      blocks.push({ type: 'paragraph', text: buffer.join(' ') });
      buffer = [];
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flush();
      return;
    }
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      flush();
      blocks.push({ type: 'image', alt: imageMatch[1], src: imageMatch[2] });
    } else if (line === '***' || line === '* * *') {
      flush();
      blocks.push({ type: 'scene-break' });
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ type: 'heading', text: line.slice(3) });
    } else if (line.startsWith('- ')) {
      flush();
      blocks.push({ type: 'bullet', text: line.slice(2) });
    } else if (line.startsWith('> ')) {
      flush();
      blocks.push({ type: 'quote', text: line.slice(2) });
    } else {
      buffer.push(line);
    }
  });
  flush();
  return blocks;
}

function renderInline(text, keyPrefix) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={`${keyPrefix}-${i}`} style={styles.previewBold}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return (
        <Text key={`${keyPrefix}-${i}`} style={styles.previewItalic}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part;
  });
}

/* =========================================================================
   MAIN SCREEN
   ========================================================================= */

export default function CreateStory({ navigation }) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const editId = params.editId ? String(params.editId) : '';
  const [coverImage, setCoverImage] = useState('');
  const [coverImageUri, setCoverImageUri] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [genre, setGenre] = useState('');
  const [content, setContent] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [focusMode, setFocusMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(null); // null | 'draft' | 'publish'
  const [status, setStatus] = useState(null); // { type: 'error' | 'success', text }
  const [touched, setTouched] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageNotice, setImageNotice] = useState(null); // { type: 'error'|'success', text }
  const [, setExistingStory] = useState(null);
  const contentRef = useRef(null);

  // ---- derived stats ----
  const wordCount = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).length : 0),
    [content]
  );
  const readingTime = Math.max(1, Math.round(wordCount / WPM));
  const publishProgress = Math.min(1, content.trim().length / CONTENT_MIN_FOR_PUBLISH);
  const imageCount = useMemo(() => (content.match(/^!\[[^\]]*\]\([^)]+\)$/gm) || []).length, [content]);

  const previewBlocks = useMemo(() => (previewMode ? parseStoryContent(content) : []), [previewMode, content]);

  useEffect(() => {
    if (!editId) {
      setExistingStory(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const record = await fetchRecord('stories', editId);
        if (!cancelled && record) {
          setExistingStory(record);
          setTitle(String(record.title || ''));
          setSummary(String(record.summary || ''));
          setGenre(String(record.genre || ''));
          setContent(String(record.content || ''));
          setCoverImage(String(record.coverImage || record.coverAsset?.url || ''));
          setCoverImageUri(null);
          setTouched({});
        }
      } catch {
        if (!cancelled) setStatus({ type: 'error', text: 'Could not load this story to edit.' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editId]);

  // ---- validation ----
  const errors = useMemo(() => {
    const e = {};
    const trimmedTitle = title.trim();
    if (!trimmedTitle) e.title = 'Title is required.';
    else if (trimmedTitle.length > TITLE_MAX) e.title = `Title must be under ${TITLE_MAX} characters.`;
    if (summary.trim().length > SUMMARY_MAX) e.summary = `Summary must be under ${SUMMARY_MAX} characters.`;
    return e;
  }, [title, summary]);

  const isValidForDraft = Object.keys(errors).length === 0;
  const contentError =
    touched.content && content.trim().length < CONTENT_MIN_FOR_PUBLISH
      ? `Add at least ${CONTENT_MIN_FOR_PUBLISH} characters to publish.`
      : null;
  const isValidForPublish = isValidForDraft && content.trim().length >= CONTENT_MIN_FOR_PUBLISH;

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setFocusedField((f) => (f === field ? null : f));
  };

  /* ---- formatting toolbar helpers (all operate on the tracked selection) ---- */

  const wrapSelection = useCallback(
    (marker, placeholder = 'text') => {
      const { start, end } = selection;
      const before = content.slice(0, start);
      const selected = content.slice(start, end) || placeholder;
      const after = content.slice(end);
      const next = `${before}${marker}${selected}${marker}${after}`;
      setContent(next);
      const cursor = start + marker.length + selected.length + marker.length;
      requestAnimationFrame(() => setSelection({ start: cursor, end: cursor }));
    },
    [content, selection]
  );

  const prefixLine = useCallback(
    (prefix) => {
      const { start } = selection;
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const before = content.slice(0, lineStart);
      const after = content.slice(lineStart);
      const next = `${before}${prefix}${after}`;
      setContent(next);
      const cursor = start + prefix.length;
      requestAnimationFrame(() => setSelection({ start: cursor, end: cursor }));
    },
    [content, selection]
  );

  const insertSceneBreak = useCallback(() => {
    const { start, end } = selection;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const needsLeadingBreak = before.length && !before.endsWith('\n\n');
    const insert = `${needsLeadingBreak ? '\n\n' : ''}***\n\n`;
    const next = `${before}${insert}${after}`;
    setContent(next);
    const cursor = before.length + insert.length;
    requestAnimationFrame(() => setSelection({ start: cursor, end: cursor }));
  }, [content, selection]);

  // Inserts an image on its own line at the cursor, wherever the writer's
  // cursor currently sits — beginning, middle, or end of the story.
  const insertImageAtCursor = useCallback(
    (url, alt = '') => {
      const { start, end } = selection;
      const before = content.slice(0, start);
      const after = content.slice(end);
      const needsLeadingBreak = before.length && !before.endsWith('\n\n');
      const needsTrailingBreak = after.length && !after.startsWith('\n\n');
      const insert = `${needsLeadingBreak ? '\n\n' : ''}![${alt}](${url})${needsTrailingBreak ? '\n\n' : '\n\n'}`;
      const next = `${before}${insert}${after}`;
      setContent(next);
      const cursor = before.length + insert.length;
      requestAnimationFrame(() => setSelection({ start: cursor, end: cursor }));
    },
    [content, selection]
  );

  const pickAndInsertImage = useCallback(async () => {
    setImageNotice(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImageNotice({ type: 'error', text: 'Photo library access is needed to add an image.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;

    setImageUploading(true);
    try {
      const uploaded = await uploadImageAsync(result.assets[0].uri);
      const url = storyImageUrl(uploaded);
      insertImageAtCursor(url);
      setImageNotice({ type: 'success', text: 'Image added to your story.' });
    } catch (err) {
      setImageNotice({ type: 'error', text: err?.message || 'Could not upload that image.' });
    } finally {
      setImageUploading(false);
    }
  }, [insertImageAtCursor]);

  /* ---- cover image picker ---- */

  const pickCoverImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setStatus({ type: 'error', text: 'Photo library permission is needed to upload a cover image.' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setCoverImageUri(result.assets[0].uri);
      setStatus(null);
    } catch (error) {
      setStatus({ type: 'error', text: error?.message || 'Unable to select cover image.' });
    }
  }, []);

  /* ---- save ---- */

  const handleSave = useCallback(
    async (mode) => {
      setTouched((t) => ({ ...t, title: true, summary: true, content: true }));
      const valid = mode === 'publish' ? isValidForPublish : isValidForDraft;
      if (!valid || loading) return;

      Keyboard.dismiss();
      setLoading(mode);
      setStatus(null);

      try {
        let coverImageUrl = coverImage;
        let coverAsset = null;

        // Upload cover image if a new one was picked
        if (coverImageUri) {
          setCoverUploading(true);
          const uploaded = await uploadImageAsync(coverImageUri);
          coverImageUrl = storyImageUrl(uploaded);
          coverAsset = toStoryAsset(uploaded);
          setCoverUploading(false);
        }

        if (editId) {
          await updateStory(editId, {
            title: title.trim(),
            summary: summary.trim(),
            genre: genre.trim(),
            content: content.trim(),
            coverImage: coverImageUrl,
            coverAsset,
            status: mode === 'publish' ? 'published' : 'draft',
          });
        } else {
          await createStory({
            title: title.trim(),
            summary: summary.trim(),
            genre: genre.trim(),
            content: content.trim(),
            coverImage: coverImageUrl,
            coverAsset,
            status: mode === 'publish' ? 'published' : 'draft',
          });
        }
        setStatus({
          type: 'success',
          text: mode === 'publish' ? 'Story published!' : 'Draft saved.',
        });
        if (mode === 'publish') {
          if (editId) {
            router.replace('/mystories');
            return;
          }
          setTitle('');
          setSummary('');
          setGenre('');
          setContent('');
          setTouched({});
          setFocusMode(false);
          setPreviewMode(false);
        }
      } catch (error) {
        const isNetworkError = error?.code === 'unavailable' || error?.message?.includes('network');
        setStatus({
          type: 'error',
          text: isNetworkError
            ? "You're offline. Check your connection and try again."
            : error?.message || 'Unable to save story. Please try again.',
        });
      } finally {
        setLoading(null);
      }
    },
    [title, summary, genre, content, editId, isValidForDraft, isValidForPublish, loading, router]
  );

  const toolbarProps = {
    onBold: () => wrapSelection('**'),
    onItalic: () => wrapSelection('_'),
    onHeading: () => prefixLine('## '),
    onBullet: () => prefixLine('- '),
    onQuote: () => prefixLine('> '),
    onSceneBreak: insertSceneBreak,
    onInsertImage: pickAndInsertImage,
    imageUploading,
  };

  /* ---- focus mode: minimal chrome, editor takes the whole screen ---- */
  if (focusMode) {
    return (
      <ScreenShell title="Writing" subtitle={title || 'Untitled story'} showBack={false}>
        <View style={styles.ribbonAccent} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
        >
          <View style={styles.focusHeader}>
            <Pressable onPress={() => setFocusMode(false)} style={styles.exitFocus} hitSlop={8}>
              <Ionicons name="chevron-back" size={16} color="#B8863B" />
              <Text style={styles.exitFocusText}>Done writing</Text>
            </Pressable>
            <Text style={styles.focusStats}>
              {wordCount} words · {readingTime} min read
            </Text>
          </View>

          <Toolbar {...toolbarProps} />
          {imageNotice ? <ImageNotice notice={imageNotice} /> : null}

          <TextInput
            ref={contentRef}
            style={styles.focusEditor}
            multiline
            autoFocus
            value={content}
            onChangeText={setContent}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            placeholder="Once upon a time..."
            placeholderTextColor="#8A9186"
            textAlignVertical="top"
          />
        </KeyboardAvoidingView>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Create Story" subtitle="Writes to the stories collection." showBack>
      <View style={styles.ribbonAccent} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* ---- Details card ---- */}
            <View style={styles.card}>
              <Text style={styles.eyebrow}>Title &amp; genre</Text>

              <Field
                label="Title"
                required
                value={title}
                onChangeText={setTitle}
                onFocus={() => setFocusedField('title')}
                onBlur={() => handleBlur('title')}
                focused={focusedField === 'title'}
                placeholder="e.g. The Last Lighthouse"
                error={touched.title ? errors.title : null}
                maxLength={TITLE_MAX + 20}
                counter={`${title.length}/${TITLE_MAX}`}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Genre</Text>
                <TextInput
                  placeholder="e.g. Fantasy"
                  placeholderTextColor="#8A9186"
                  style={[styles.input, focusedField === 'genre' && styles.inputFocused]}
                  value={genre}
                  onChangeText={setGenre}
                  onFocus={() => setFocusedField('genre')}
                  onBlur={() => setFocusedField((f) => (f === 'genre' ? null : f))}
                  returnKeyType="next"
                />
                <View style={styles.chipRow}>
                  {GENRE_SUGGESTIONS.map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setGenre(g)}
                      style={[styles.chip, genre === g && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, genre === g && styles.chipTextActive]}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* ---- Cover image card ---- */}
            <View style={styles.card}>
              <Text style={styles.eyebrow}>Cover Image</Text>
              <Text style={styles.helperText}>A beautiful cover helps your story stand out.</Text>

              {coverImageUri || coverImage ? (
                <View style={styles.coverPreviewContainer}>
                  <Image
                    source={{ uri: coverImageUri || coverImage }}
                    style={styles.coverPreview}
                    contentFit="cover"
                  />
                  <Pressable style={styles.coverChangeButton} onPress={pickCoverImage}>
                    <Ionicons name="camera-outline" size={16} color="#4F46E5" />
                    <Text style={styles.coverChangeText}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.coverPlaceholder} onPress={pickCoverImage}>
                  <Ionicons name="image-outline" size={32} color="#94A3B8" />
                  <Text style={styles.coverPlaceholderText}>Tap to add a cover image</Text>
                </Pressable>
              )}
              {coverUploading && (
                <View style={styles.coverUploadingRow}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                  <Text style={styles.coverUploadingText}>Uploading cover...</Text>
                </View>
              )}
            </View>

            {/* ---- Summary card ---- */}
            <View style={styles.card}>
              <Text style={styles.eyebrow}>Summary</Text>
              <Field
                value={summary}
                onChangeText={setSummary}
                onFocus={() => setFocusedField('summary')}
                onBlur={() => handleBlur('summary')}
                focused={focusedField === 'summary'}
                placeholder="A short teaser for readers..."
                multiline
                style={styles.textArea}
                error={touched.summary ? errors.summary : null}
                maxLength={SUMMARY_MAX + 50}
                counter={`${summary.length}/${SUMMARY_MAX}`}
              />
            </View>

            {/* ---- Manuscript card ---- */}
            <View style={styles.card}>
              <View style={styles.labelRow}>
                <Text style={styles.eyebrow}>Manuscript</Text>
                <Pressable onPress={() => setFocusMode(true)} hitSlop={8} style={styles.focusLinkRow}>
                  <Ionicons name="expand-outline" size={13} color="#B8863B" />
                  <Text style={styles.focusLink}>Distraction-free</Text>
                </Pressable>
              </View>

              <SegmentedControl
                value={previewMode ? 'preview' : 'write'}
                onChange={(v) => setPreviewMode(v === 'preview')}
              />

              {!previewMode ? (
                <>
                  <Toolbar {...toolbarProps} />
                  {imageNotice ? <ImageNotice notice={imageNotice} /> : null}
                  <TextInput
                    ref={contentRef}
                    style={[styles.input, styles.storyEditor, contentError && styles.inputError]}
                    multiline
                    value={content}
                    onChangeText={setContent}
                    onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                    onBlur={() => handleBlur('content')}
                    placeholder="Start writing your story here... tap the image icon to drop a picture wherever your cursor is."
                    placeholderTextColor="#8A9186"
                    textAlignVertical="top"
                  />
                </>
              ) : (
                <StoryPreview blocks={previewBlocks} />
              )}

              <View style={styles.editorFooter}>
                <Text style={styles.helperText}>
                  {wordCount} words · ~{readingTime} min read
                  {imageCount ? ` · ${imageCount} image${imageCount === 1 ? '' : 's'}` : ''}
                </Text>
                {contentError ? <Text style={styles.errorText}>{contentError}</Text> : null}
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${publishProgress * 100}%` }]} />
              </View>
              <Text style={styles.progressLabel}>
                {publishProgress >= 1 ? 'Ready to publish' : `${Math.round(publishProgress * 100)}% to publish length`}
              </Text>
            </View>

            {status ? (
              <View
                style={[
                  styles.statusBanner,
                  status.type === 'error' ? styles.statusError : styles.statusSuccess,
                ]}
                accessibilityLiveRegion="polite"
              >
                <Ionicons
                  name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={16}
                  color={status.type === 'error' ? '#B3261E' : '#3F6B4E'}
                />
                <Text
                  style={[
                    styles.statusText,
                    status.type === 'error' ? styles.statusTextError : styles.statusTextSuccess,
                  ]}
                >
                  {status.text}
                </Text>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (!isValidForDraft || loading) && styles.buttonDisabled,
                  pressed && isValidForDraft && !loading && styles.secondaryButtonPressed,
                ]}
                onPress={() => handleSave('draft')}
                disabled={!isValidForDraft || !!loading}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isValidForDraft || !!loading, busy: loading === 'draft' }}
              >
                {loading === 'draft' ? (
                  <ActivityIndicator color="#3F4A38" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Save draft</Text>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.publishButton,
                  (!isValidForPublish || loading) && styles.buttonDisabled,
                  pressed && isValidForPublish && !loading && styles.buttonPressed,
                ]}
                onPress={() => handleSave('publish')}
                disabled={!isValidForPublish || !!loading}
                accessibilityRole="button"
                accessibilityState={{ disabled: !isValidForPublish || !!loading, busy: loading === 'publish' }}
              >
                {loading === 'publish' ? (
                  <ActivityIndicator color="#FBF8F0" />
                ) : (
                  <>
                    <View style={styles.seal}>
                      <Ionicons name="ribbon" size={13} color="#B8863B" />
                    </View>
                    <Text style={styles.buttonText}>Publish</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

/* =========================================================================
   SUBCOMPONENTS
   ========================================================================= */

function Field({ label, required, error, counter, style, focused, ...inputProps }) {
  return (
    <View style={styles.fieldGroup}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
          {counter ? <Text style={styles.counter}>{counter}</Text> : null}
        </View>
      ) : counter ? (
        <View style={[styles.labelRow, { justifyContent: 'flex-end' }]}>
          <Text style={styles.counter}>{counter}</Text>
        </View>
      ) : null}
      <TextInput
        style={[styles.input, style, focused && styles.inputFocused, error && styles.inputError]}
        placeholderTextColor="#8A9186"
        {...inputProps}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function SegmentedControl({ value, onChange }) {
  return (
    <View style={styles.segment}>
      <Pressable
        style={[styles.segmentOption, value === 'write' && styles.segmentOptionActive]}
        onPress={() => onChange('write')}
      >
        <Ionicons name="create-outline" size={14} color={value === 'write' ? '#FBF8F0' : '#52604F'} />
        <Text style={[styles.segmentText, value === 'write' && styles.segmentTextActive]}>Write</Text>
      </Pressable>
      <Pressable
        style={[styles.segmentOption, value === 'preview' && styles.segmentOptionActive]}
        onPress={() => onChange('preview')}
      >
        <Ionicons name="eye-outline" size={14} color={value === 'preview' ? '#FBF8F0' : '#52604F'} />
        <Text style={[styles.segmentText, value === 'preview' && styles.segmentTextActive]}>Preview</Text>
      </Pressable>
    </View>
  );
}

function Toolbar({ onBold, onItalic, onHeading, onBullet, onQuote, onSceneBreak, onInsertImage, imageUploading }) {
  const items = [
    { key: 'bold', icon: null, label: 'B', textStyle: { fontWeight: '800' }, onPress: onBold, a11y: 'Bold' },
    { key: 'italic', icon: null, label: 'I', textStyle: { fontStyle: 'italic' }, onPress: onItalic, a11y: 'Italic' },
    { key: 'heading', icon: null, label: 'H', textStyle: { fontWeight: '800' }, onPress: onHeading, a11y: 'Heading' },
    { key: 'bullet', icon: 'list-outline', onPress: onBullet, a11y: 'Bullet list' },
    { key: 'quote', icon: 'chatbox-outline', onPress: onQuote, a11y: 'Quote' },
    { key: 'scene', icon: 'ellipsis-horizontal', onPress: onSceneBreak, a11y: 'Scene break' },
  ];
  return (
    <View style={styles.toolbar}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          style={styles.toolbarButton}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={item.a11y}
        >
          {item.icon ? (
            <Ionicons name={item.icon} size={16} color="#3F4A38" />
          ) : (
            <Text style={[styles.toolbarButtonText, item.textStyle]}>{item.label}</Text>
          )}
        </Pressable>
      ))}

      <View style={styles.toolbarDivider} />

      <Pressable
        onPress={onInsertImage}
        disabled={imageUploading}
        style={[styles.toolbarButton, styles.toolbarImageButton]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Insert image at cursor"
      >
        {imageUploading ? (
          <ActivityIndicator size="small" color="#B8863B" />
        ) : (
          <Ionicons name="image-outline" size={16} color="#B8863B" />
        )}
      </Pressable>
    </View>
  );
}

function ImageNotice({ notice }) {
  return (
    <View style={[styles.imageNotice, notice.type === 'error' && styles.imageNoticeError]}>
      <Ionicons
        name={notice.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        size={13}
        color={notice.type === 'error' ? '#B3261E' : '#3F6B4E'}
      />
      <Text style={[styles.imageNoticeText, notice.type === 'error' && styles.imageNoticeTextError]}>
        {notice.text}
      </Text>
    </View>
  );
}

function StoryPreview({ blocks }) {
  if (!blocks.length) {
    return (
      <View style={styles.previewEmpty}>
        <Ionicons name="document-text-outline" size={22} color="#B7AF98" />
        <Text style={styles.previewEmptyText}>Nothing to preview yet — start writing to see it here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.previewCard}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <Text key={i} style={styles.previewHeading}>
                {block.text}
              </Text>
            );
          case 'quote':
            return (
              <View key={i} style={styles.previewQuote}>
                <Text style={styles.previewQuoteText}>{renderInline(block.text, `q${i}`)}</Text>
              </View>
            );
          case 'bullet':
            return (
              <View key={i} style={styles.previewBulletRow}>
                <Text style={styles.previewBulletDot}>•</Text>
                <Text style={styles.previewBulletText}>{renderInline(block.text, `b${i}`)}</Text>
              </View>
            );
          case 'image':
            return (
              <View key={i} style={styles.previewImageFrame}>
                <Image source={{ uri: block.src }} style={styles.previewImage} resizeMode="cover" />
                {block.alt ? <Text style={styles.previewImageCaption}>{block.alt}</Text> : null}
              </View>
            );
          case 'scene-break':
            return (
              <View key={i} style={styles.previewSceneBreak}>
                <Text style={styles.previewSceneBreakText}>· · ·</Text>
              </View>
            );
          case 'paragraph':
          default:
            return (
              <Text key={i} style={styles.previewParagraph}>
                {renderInline(block.text, `p${i}`)}
              </Text>
            );
        }
      })}
    </View>
  );
}

/* =========================================================================
   STYLES — "writer's desk" manuscript theme:
   warm paper surfaces, deep ink-green text, brass accent for actions.
   ========================================================================= */

const INK = themeColors.textPrimary || '#1f2730';
const INK_SOFT = themeColors.textSecondary || '#52604F';
const PAPER = themeColors.canvas || themeColors.background || '#e6edf7';
const PAPER_DEEP = themeColors.surfaceSecondary || '#d0d9ef';
const BRASS = themeColors.brand || '#3b5fb8';
const MOSS = themeColors.success || '#6366f9';
const RULE = themeColors.borderDefault || '#DED2AE';
const DANGER = themeColors.error || '#B3261E';

const styles = StyleSheet.create({
  ribbonAccent: {
    height: 3,
    backgroundColor: BRASS,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    backgroundColor: PAPER,
  },
  card: {
    backgroundColor: themeColors.card || themeColors.surfacePrimary || '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RULE,
    padding: 16,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: BRASS,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: INK,
  },
  required: {
    color: DANGER,
  },
  counter: {
    fontSize: 11,
    color: '#9A9578',
  },
  input: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 12,
    padding: 12,
    backgroundColor: PAPER,
    fontSize: 15,
    color: INK,
  },
  inputFocused: {
    borderColor: BRASS,
    backgroundColor: '#FFFDF8',
  },
  inputError: {
    borderColor: DANGER,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  storyEditor: {
    minHeight: 280,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
  },
  errorText: {
    color: DANGER,
    fontSize: 12,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PAPER_DEEP,
    borderWidth: 1,
    borderColor: RULE,
  },
  chipActive: {
    backgroundColor: '#2E3A28',
    borderColor: '#2E3A28',
  },
  chipText: {
    fontSize: 12,
    color: INK_SOFT,
  },
  chipTextActive: {
    color: '#FBF8F0',
    fontWeight: '600',
  },
  focusLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  focusLink: {
    fontSize: 12,
    color: BRASS,
    fontWeight: '600',
  },

  /* segmented write/preview control */
  segment: {
    flexDirection: 'row',
    backgroundColor: PAPER_DEEP,
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  segmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  segmentOptionActive: {
    backgroundColor: '#2E3A28',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: INK_SOFT,
  },
  segmentTextActive: {
    color: '#FBF8F0',
  },

  /* toolbar */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PAPER_DEEP,
    borderWidth: 1,
    borderColor: RULE,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
  },
  toolbarButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonText: {
    fontSize: 14,
    color: INK,
  },
  toolbarDivider: {
    width: 1,
    height: 18,
    backgroundColor: RULE,
    marginHorizontal: 4,
  },
  toolbarImageButton: {
    marginLeft: 'auto',
  },

  imageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECF4EE',
    borderWidth: 1,
    borderColor: '#CBE3D3',
    borderTopWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  imageNoticeError: {
    backgroundColor: '#FBEDEC',
    borderColor: '#F3C9C6',
  },
  imageNoticeText: {
    fontSize: 11,
    color: MOSS,
  },
  imageNoticeTextError: {
    color: DANGER,
  },

  editorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  helperText: {
    fontSize: 11,
    color: '#9A9578',
  },

  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: PAPER_DEEP,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRASS,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 10,
    color: '#9A9578',
    marginTop: 4,
  },

  /* action buttons */
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#2E3A28',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  publishButton: {
    flex: 1.3,
  },
  buttonPressed: {
    backgroundColor: '#232C1E',
  },
  buttonDisabled: {
    backgroundColor: '#AEB6A2',
  },
  buttonText: {
    color: '#FBF8F0',
    fontWeight: '700',
    fontSize: 15,
  },
  seal: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FBF8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#2E3A28',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonPressed: {
    backgroundColor: PAPER_DEEP,
  },
  secondaryButtonText: {
    color: '#2E3A28',
    fontWeight: '700',
    fontSize: 15,
  },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  statusSuccess: {
    backgroundColor: '#ECF4EE',
    borderWidth: 1,
    borderColor: '#CBE3D3',
  },
  statusError: {
    backgroundColor: '#FBEDEC',
    borderWidth: 1,
    borderColor: '#F3C9C6',
  },
  statusText: {
    fontSize: 13,
    flexShrink: 1,
  },
  statusTextSuccess: {
    color: MOSS,
  },
  statusTextError: {
    color: DANGER,
  },

  /* focus mode */
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: PAPER,
  },
  exitFocus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  exitFocusText: {
    color: BRASS,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 2,
  },
  focusStats: {
    fontSize: 12,
    color: '#9A9578',
  },
  focusEditor: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    fontSize: 16,
    lineHeight: 26,
    color: INK,
    backgroundColor: PAPER,
  },

  /* preview */
  previewCard: {
    borderWidth: 1,
    borderColor: RULE,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 16,
    backgroundColor: themeColors.card || themeColors.surfacePrimary || '#FFFFFF',
  },
  previewEmpty: {
    borderWidth: 1,
    borderColor: RULE,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.card || themeColors.surfacePrimary || '#FFFFFF',
  },
  previewEmptyText: {
    fontSize: 12,
    color: '#B7AF98',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  previewParagraph: {
    fontSize: 15,
    lineHeight: 25,
    color: INK,
    marginBottom: 14,
  },
  previewHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: INK,
    marginTop: 6,
    marginBottom: 10,
  },
  previewBold: {
    fontWeight: '800',
  },
  previewItalic: {
    fontStyle: 'italic',
  },
  previewBulletRow: {

  /* cover image */
  coverPreviewContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  coverPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  coverChangeButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  coverChangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  coverPlaceholder: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverPlaceholderText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  coverUploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  coverUploadingText: {
    fontSize: 12,
    color: '#64748B',
  },


    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 2,
  },
  previewBulletDot: {
    color: BRASS,
    fontSize: 15,
    marginRight: 8,
    lineHeight: 23,
  },
  previewBulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 23,
    color: INK,
  },
  previewQuote: {
    borderLeftWidth: 3,
    borderLeftColor: BRASS,
    paddingLeft: 12,
    marginBottom: 14,
  },
  previewQuoteText: {
    fontSize: 14,
    lineHeight: 23,
    color: INK_SOFT,
    fontStyle: 'italic',
  },
  previewSceneBreak: {
    alignItems: 'center',
    marginVertical: 16,
  },
  previewSceneBreakText: {
    color: '#C9BE9C',
    fontSize: 13,
    letterSpacing: 4,
  },
  previewImageFrame: {
    marginBottom: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: BRASS,
    padding: 4,
    borderRadius: 10,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 6,
  },
  previewImageCaption: {
    fontSize: 11,
    color: '#9A9578',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
});
