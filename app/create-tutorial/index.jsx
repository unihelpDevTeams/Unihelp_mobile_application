import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { toCloudinaryAsset, uploadFile } from '../../services/cloudinary';
import { colors, spacing, borderRadius } from '../../src/shared/theme';

const TUTORIAL_CATEGORIES = [
  { id: 'mathematics', title: 'Mathematics', icon: 'calculator-outline' },
  { id: 'physics', title: 'Physics', icon: 'planet-outline' },
  { id: 'chemistry', title: 'Chemistry', icon: 'flask-outline' },
  { id: 'biology', title: 'Biology', icon: 'leaf-outline' },
  { id: 'computer-science', title: 'Computer Science', icon: 'code-slash-outline' },
  { id: 'engineering', title: 'Engineering', icon: 'settings-outline' },
  { id: 'accounting', title: 'Accounting', icon: 'bar-chart-outline' },
  { id: 'economics', title: 'Economics', icon: 'trending-up-outline' },
  { id: 'english', title: 'English', icon: 'book-outline' },
  { id: 'medicine', title: 'Medicine', icon: 'medkit-outline' },
  { id: 'law', title: 'Law', icon: 'scale-outline' },
  { id: 'arts', title: 'Arts & Humanities', icon: 'library-outline' },
  { id: 'general', title: 'General', icon: 'bulb-outline' },
  { id: 'other', title: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const emptyForm = {
  title: '',
  description: '',
  category: '',
  price: '',
};

export default function CreateTutorialPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ video: 0, thumb: 0, pdf: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const totalProgress = useMemo(
    () => Math.round((progress.video + progress.thumb + progress.pdf) / 3),
    [progress]
  );

  const pickAttachment = async (target) => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:
          target === 'thumbnail'
            ? ['image/*']
            : target === 'video'
              ? ['video/*']
              : ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const nextFile = {
        uri: asset.uri,
        name:
          asset.name ||
          `${target}.${target === 'video' ? 'mp4' : target === 'thumbnail' ? 'jpg' : 'pdf'}`,
        size: asset.size || 0,
        type:
          asset.mimeType ||
          (target === 'thumbnail'
            ? 'image/jpeg'
            : target === 'video'
              ? 'video/mp4'
              : 'application/pdf'),
      };

      if (target === 'video') setVideoFile(nextFile);
      if (target === 'thumbnail') setThumbnail(nextFile);
      if (target === 'pdf') setPdfFile(nextFile);
    } catch (_error) {
      setError('Could not open the file picker.');
    } finally {
      setPickerOpen(false);
    }
  };

  const uploadAttachment = async (file, kind) => {
    if (!file) return null;

    const uploaded = await uploadFile(file, (percent) => {
      setProgress((current) => ({ ...current, [kind]: Math.round(percent) }));
    });

    return uploaded;
  };

  const handleSubmit = async () => {
    if (!profile?.uid) {
      setError('Login required');
      return;
    }

    if (!form.title.trim() || !form.description.trim() || !form.category.trim() || !form.price.trim()) {
      setError('Please fill in title, description, category, and price.');
      return;
    }

    if (!videoFile) {
      setError('Please upload a video file before publishing.');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    try {
      const videoResult = await uploadAttachment(videoFile, 'video');
      const media = [toCloudinaryAsset(videoResult)];

      let thumbnailResult = null;
      let pdfResult = null;

      if (thumbnail) {
        thumbnailResult = await uploadAttachment(thumbnail, 'thumb');
        media.push(toCloudinaryAsset(thumbnailResult));
      }

      if (pdfFile) {
        pdfResult = await uploadAttachment(pdfFile, 'pdf');
        media.push(toCloudinaryAsset(pdfResult));
      }

      await addDoc(collection(db, 'tutorials'), {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        videoUrl: videoResult?.secure_url || videoResult?.url || '',
        thumbnailUrl: thumbnailResult?.secure_url || thumbnailResult?.url || '',
        pdfUrl: pdfResult?.secure_url || pdfResult?.url || '',
        media,
        videoAsset: toCloudinaryAsset(videoResult),
        tutorId: profile.uid,
        tutorName: profile.displayName || profile.username || profile.email || 'Tutor',
        createdAt: serverTimestamp(),
      });

      setMessage('Tutorial uploaded successfully.');
      setForm(emptyForm);
      setVideoFile(null);
      setThumbnail(null);
      setPdfFile(null);
      setProgress({ video: 0, thumb: 0, pdf: 0 });
      router.push('/marketplace/tutorials');
    } catch (submitError) {
      setError(submitError?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const previewImage = thumbnail?.uri || null;

  return (
    <ScreenShell title="Create Tutorial" subtitle="Publish premium tutorials like the website." showBack scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.badge}>Creator Studio</Text>
            <Text style={styles.heroTitle}>Publish Premium Tutorials Like a Pro.</Text>
            <Text style={styles.heroText}>
              Upload courses with Cloudinary-backed storage, premium UI, and the same database fields the
              website uses.
            </Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles-outline" size={22} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#4338CA" />
            <Text style={styles.featureTitle}>Secure Uploads</Text>
            <Text style={styles.featureText}>Protected Firebase uploads with optimized delivery.</Text>
          </View>
          <View style={styles.featureCard}>
            <Ionicons name="cloud-upload-outline" size={20} color="#4338CA" />
            <Text style={styles.featureTitle}>Fast Processing</Text>
            <Text style={styles.featureText}>Pick your media directly and upload in sequence.</Text>
          </View>
          <View style={styles.featureCard}>
            <Ionicons name="reader-outline" size={20} color="#4338CA" />
            <Text style={styles.featureTitle}>Premium Delivery</Text>
            <Text style={styles.featureText}>Store video, thumbnail, PDF, and media metadata together.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="create-outline" size={18} color="#4338CA" />
            <Text style={styles.cardTitle}>Tutorial details</Text>
          </View>

          {[
            ['title', 'Title'],
            ['description', 'Description'],
            ['price', 'Price'],
          ].map(([key, label]) => (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                value={form[key]}
                onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
                placeholder={label}
                placeholderTextColor="#94A3B8"
                style={[styles.input, key === 'description' && styles.textArea]}
                multiline={key === 'description'}
              />
            </View>
          ))}

          {/* Category dropdown selector */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <Pressable
              style={styles.categorySelector}
              onPress={() => setCategoryPickerOpen(true)}
            >
              {form.category ? (
                <Text style={styles.categorySelectorText}>{form.category}</Text>
              ) : (
                <Text style={styles.categorySelectorPlaceholder}>Select a category</Text>
              )}
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="attach-outline" size={18} color="#4338CA" />
            <Text style={styles.cardTitle}>Uploads</Text>
          </View>

          <View style={styles.uploadStack}>
            <UploadRow
              label="Video file"
              hint="MP4, WebM, OGG, MOV"
              icon="videocam-outline"
              value={videoFile?.name}
              progress={progress.video}
              onPress={() => {
                setPickerTarget('video');
                setPickerOpen(true);
              }}
            />
            <UploadRow
              label="Thumbnail"
              hint="JPEG, PNG, WebP, GIF"
              icon="image-outline"
              value={thumbnail?.name}
              progress={progress.thumb}
              onPress={() => {
                setPickerTarget('thumbnail');
                setPickerOpen(true);
              }}
            />
            <UploadRow
              label="PDF notes"
              hint="PDF files"
              icon="document-text-outline"
              value={pdfFile?.name}
              progress={progress.pdf}
              onPress={() => {
                setPickerTarget('pdf');
                setPickerOpen(true);
              }}
            />
          </View>

          <View style={styles.totalProgressWrap}>
            <View style={styles.totalProgressBar}>
              <View style={[styles.totalProgressFill, { width: `${totalProgress}%` }]} />
            </View>
            <Text style={styles.totalProgressText}>{totalProgress}% uploaded</Text>
          </View>
        </View>

        {previewImage ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewSubtitle}>Check the selected thumbnail or video asset before publishing.</Text>
              </View>
              <Pressable onPress={() => WebBrowser.openBrowserAsync(previewImage)} hitSlop={10}>
                <Text style={styles.previewAction}>Open</Text>
              </Pressable>
            </View>
            <Image source={{ uri: previewImage }} style={styles.previewImage} contentFit="cover" cachePolicy="disk" />
          </View>
        ) : videoFile ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewSubtitle}>Video selected. Open it externally before publishing.</Text>
              </View>
              <Pressable onPress={() => WebBrowser.openBrowserAsync(videoFile.uri)} hitSlop={10}>
                <Text style={styles.previewAction}>Open</Text>
              </Pressable>
            </View>
            <View style={styles.previewFallback}>
              <Ionicons name="videocam-outline" size={30} color="#4338CA" />
              <Text style={styles.previewFallbackTitle}>{videoFile.name}</Text>
              <Text style={styles.previewFallbackText}>A thumbnail makes the listing closer to the website’s tutorial cards.</Text>
            </View>
          </View>
        ) : null}

        {message ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#047857" />
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={uploading}
          style={({ pressed }) => [styles.submitButton, uploading && styles.submitButtonDisabled, pressed && !uploading && styles.submitButtonPressed]}
        >
          {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Publish Tutorial</Text>}
        </Pressable>
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>Choose upload type</Text>
            <Text style={styles.sheetSubtitle}>We’ll open the native picker for the selected media type.</Text>

            <Pressable style={styles.sheetButton} onPress={() => pickAttachment(pickerTarget || 'video')}>
              <Text style={styles.sheetButtonText}>Continue</Text>
            </Pressable>

            <Pressable style={styles.sheetButtonSecondary} onPress={() => setPickerOpen(false)}>
              <Text style={styles.sheetButtonSecondaryText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Category picker modal */}
      <Modal visible={categoryPickerOpen} transparent animationType="fade" onRequestClose={() => setCategoryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>Select category</Text>
            <Text style={styles.sheetSubtitle}>Choose the category that best fits your tutorial.</Text>
            <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
              {TUTORIAL_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[styles.categoryOption, form.category === cat.title && styles.categoryOptionActive]}
                  onPress={() => {
                    setForm((current) => ({ ...current, category: cat.title }));
                    setCategoryPickerOpen(false);
                  }}
                >
                  <Ionicons name={cat.icon} size={18} color={form.category === cat.title ? '#4338CA' : '#64748B'} />
                  <Text style={[styles.categoryOptionText, form.category === cat.title && styles.categoryOptionTextActive]}>
                    {cat.title}
                  </Text>
                  {form.category === cat.title && (
                    <Ionicons name="checkmark-circle" size={18} color="#4338CA" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.sheetButtonSecondary} onPress={() => setCategoryPickerOpen(false)}>
              <Text style={styles.sheetButtonSecondaryText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

function UploadRow({ label, hint, icon, value, progress, onPress }) {
  return (
    <Pressable onPress={onPress} style={stylesRow.uploadButton}>
      <View style={stylesRow.rowHeader}>
        <View style={stylesRow.rowIcon}>
          <Ionicons name={icon} size={18} color="#4338CA" />
        </View>
        <View style={stylesRow.rowCopy}>
          <Text style={stylesRow.rowLabel}>{label}</Text>
          <Text style={stylesRow.rowHint}>{hint}</Text>
        </View>
      </View>
      <Text style={stylesRow.rowValue} numberOfLines={1}>
        {value || 'Tap to select a file'}
      </Text>
      <View style={stylesRow.progressTrack}>
        <View style={[stylesRow.progressFill, { width: `${progress || 0}%` }]} />
      </View>
      <Text style={stylesRow.progressText}>{progress || 0}%</Text>
    </Pressable>
  );
}

const stylesRow = StyleSheet.create({
  uploadButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  rowCopy: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  rowHint: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748B',
  },
  rowValue: {
    fontSize: 12,
    color: '#4338CA',
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22C55E',
  },
  progressText: {
    alignSelf: 'flex-end',
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 26,
    backgroundColor: '#0F172A',
    padding: 18,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    color: '#93C5FD',
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  heroTitle: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 31,
  },
  heroText: {
    marginTop: 8,
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  featureGrid: {
    gap: 10,
  },
  featureCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 6,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  featureText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  uploadStack: {
    gap: 10,
  },
  totalProgressWrap: {
    marginTop: 14,
    gap: 8,
  },
  totalProgressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  totalProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4F46E5',
  },
  totalProgressText: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  previewCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  previewSubtitle: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  previewAction: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '800',
  },
  previewImage: {
    height: 210,
    width: '100%',
  },
  previewFallback: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  previewFallbackTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  previewFallbackText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    padding: 12,
  },
  successText: {
    flex: 1,
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    padding: 12,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonPressed: {
    opacity: 0.95,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.56)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  sheet: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  sheetButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetButtonText: {
    color: '#4338CA',
    fontSize: 13,
    fontWeight: '800',
  },
  sheetButtonSecondary: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetButtonSecondaryText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
  },
  categorySelectorText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  categorySelectorPlaceholder: {
    color: '#94A3B8',
    fontSize: 14,
  },
  categoryList: {
    maxHeight: 320,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  categoryOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  categoryOptionText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryOptionTextActive: {
    color: '#4338CA',
    fontWeight: '800',
  },
});
