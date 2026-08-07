import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import SearchableDropdown from '../../src/signup/components/SearchableDropdown';
import { useUniversities } from '../../src/signup/hooks/useUniversities';
import { useDepartments } from '../../src/signup/hooks/useDepartments';
import { ACADEMIC_LEVELS } from '../../src/signup/validation';
import { useAuth } from '../../context/AuthContext';
import {
  countUserUploads,
  createHostelListing,
  createNote,
  createQuestion,
  createStudentListing,
  fetchRecord,
  updateHostelListing,
  updateStudentListing,
} from '../../services/firestoreSync';
import {
  toCloudinaryAsset,
  uploadFile,
  uploadImage,
  uploadPDF,
} from '../../services/cloudinary';
import { useTheme } from '../../src/shared/theme/ThemeContext';

const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const RADIUS = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 };

const QUESTION_TYPES = [
  'application/pdf',
  'image/*',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const IMAGE_TYPES = ['image/*'];
const PDF_TYPES = ['application/pdf'];

const EXAM_TYPE_OPTIONS = [
  'Semester exam',
  'Mid-semester test',
  'Continuous assessment (CA)',
  'Quiz',
  'Test',
  'Practice questions',
  'Take-home assignment',
];

const SEMESTER_OPTIONS = ['First semester', 'Second semester', 'Summer/resit'];

const CONDITION_OPTIONS = ['New', 'Like new', 'Fairly used', 'Needs repair'];

const MARKETPLACE_CATEGORY_OPTIONS = [
  'Electronics',
  'Furniture',
  'Books & study materials',
  'Clothing & fashion',
  'Kitchen & appliances',
  'Sports & fitness',
  'Beauty & personal care',
  'Other',
];

const MARKETPLACE_AVAILABILITY_OPTIONS = ['Available now', 'Reserved', 'Negotiable'];

const ROOM_TYPE_OPTIONS = [
  'Self-contained',
  'Single room',
  'Shared room (2 in a room)',
  'Shared room (3+ in a room)',
  'Studio apartment',
  'Full apartment',
];

const HOSTEL_AVAILABILITY_OPTIONS = ['Vacant now', 'Available from next session', 'Negotiable'];

const AMENITY_OPTIONS = [
  'Water',
  'Light/Power (NEPA)',
  'Prepaid meter',
  'Wi-Fi',
  'Wardrobe',
  'Kitchen',
  'Air conditioning',
  'Furnished',
  'Security',
  'Parking',
];

const CONFIGS = {
  question: {
    key: 'question',
    title: 'Upload Past Questions',
    subtitle: 'Add course, exam, and school context so students can find the right paper.',
    cardTitle: 'Document details',
    cardIcon: 'document-text-outline',
    submitLabel: 'Compress & upload',
    successMessage: 'Question uploaded successfully.',
    routeAfter: '/(tabs)/pastQuestions',
    pickerTypes: QUESTION_TYPES,
    multiple: true,
    attachmentLabel: 'Selected files',
    uploadHint: 'Images, PDF, DOC, DOCX supported',
    dropHint: 'Drag & drop files or tap to upload',
    fileKind: 'mixed',
    fields: [
      { key: 'school', label: 'School', placeholder: 'Search for your school...', icon: 'business-outline', type: 'school' },
      { key: 'title', label: 'Title', placeholder: 'e.g. Mid-semester test', icon: 'create-outline', type: 'text' },
      { key: 'courseCode', label: 'Course code', placeholder: 'e.g. CSC 301', icon: 'pricetag-outline', type: 'text' },
      { key: 'year', label: 'Year', placeholder: 'e.g. 2024', icon: 'calendar-outline', type: 'text' },
      { key: 'examType', label: 'Exam type', placeholder: 'Select exam type...', icon: 'clipboard-outline', type: 'select', options: EXAM_TYPE_OPTIONS },
      { key: 'semester', label: 'Semester/session (optional)', placeholder: 'Select semester...', icon: 'time-outline', type: 'select', options: SEMESTER_OPTIONS },
      { key: 'department', label: 'Department', placeholder: 'Search for your department...', icon: 'library-outline', type: 'department' },
      { key: 'level', label: 'Level', placeholder: 'Select your level...', icon: 'layers-outline', type: 'level' },
    ],
    defaultForm: { school: '', schoolId: '', title: '', courseCode: '', year: '', examType: '', semester: '', department: '', departmentId: '', level: '' },
  },
  note: {
    key: 'note',
    title: 'Upload Lecture Note',
    subtitle: 'PDF only. The file is compressed before upload.',
    cardTitle: 'Lecture note details',
    cardIcon: 'library-outline',
    submitLabel: 'Upload PDF',
    successMessage: 'PDF uploaded successfully.',
    routeAfter: '/lecturenotesmarketplace',
    pickerTypes: PDF_TYPES,
    multiple: false,
    attachmentLabel: 'Selected PDF',
    uploadHint: 'PDF only',
    dropHint: 'Choose a PDF to upload',
    fileKind: 'pdf',
    fields: [
      { key: 'title', label: 'Lecture note title', placeholder: 'e.g. Data Structures — Week 4', icon: 'create-outline', type: 'text' },
      { key: 'course', label: 'Course code', placeholder: 'e.g. CSC 204', icon: 'pricetag-outline', type: 'text' },
      { key: 'dept', label: 'Department', placeholder: 'Search for your department...', icon: 'library-outline', type: 'department' },
      { key: 'school', label: 'School', placeholder: 'Search for your school...', icon: 'business-outline', type: 'school' },
      { key: 'level', label: 'Level', placeholder: 'Select your level...', icon: 'layers-outline', type: 'level' },
      { key: 'lecturer', label: 'Lecturer name (optional)', placeholder: 'e.g. Dr. Adebayo', icon: 'person-outline', type: 'text' },
      { key: 'description', label: 'Short summary (optional)', placeholder: 'What topic, week, or chapter does this note cover?', icon: 'document-text-outline', multiline: true, type: 'text' },
    ],
    defaultForm: { title: '', course: '', dept: '', deptId: '', school: '', schoolId: '', level: '', lecturer: '', description: '' },
  },
  marketplace: {
    key: 'marketplace',
    title: 'Upload Student Listing',
    subtitle: 'Share photos, price, condition, pickup details, and contact information.',
    cardTitle: 'Listing details',
    cardIcon: 'storefront-outline',
    submitLabel: 'Upload listing',
    successMessage: 'Listing uploaded successfully.',
    routeAfter: '/studentmarketplace',
    pickerTypes: IMAGE_TYPES,
    multiple: true,
    attachmentLabel: 'Selected photos',
    uploadHint: 'Images only',
    dropHint: 'Choose listing photos',
    fileKind: 'images',
    fields: [
      { key: 'title', label: 'Title', placeholder: 'e.g. Mini fridge, barely used', icon: 'create-outline', type: 'text' },
      { key: 'category', label: 'Category', placeholder: 'Select category...', icon: 'pricetag-outline', type: 'select', options: MARKETPLACE_CATEGORY_OPTIONS },
      { key: 'condition', label: 'Condition', placeholder: 'Select condition...', icon: 'sparkles-outline', type: 'select', options: CONDITION_OPTIONS },
      { key: 'price', label: 'Price', placeholder: 'e.g. 25000', icon: 'cash-outline', type: 'text' },
      { key: 'location', label: 'Pickup location', placeholder: 'e.g. Main gate, Faculty of Science', icon: 'location-outline', type: 'text' },
      { key: 'availability', label: 'Availability', placeholder: 'Select availability...', icon: 'checkmark-circle-outline', type: 'select', options: MARKETPLACE_AVAILABILITY_OPTIONS },
      { key: 'phone', label: 'Phone', placeholder: 'e.g. 080XXXXXXXX', icon: 'call-outline', type: 'text' },
      { key: 'description', label: 'Description', placeholder: 'Add condition, pickup location, etc.', icon: 'document-text-outline', multiline: true, type: 'text' },
    ],
    defaultForm: { title: '', category: '', condition: '', price: '', location: '', availability: '', phone: '', description: '' },
  },
  hostel: {
    key: 'hostel',
    title: 'Upload Hostel Listing',
    subtitle: 'Add photos, rent, location, amenities, and inspection/contact details.',
    cardTitle: 'Hostel details',
    cardIcon: 'home-outline',
    submitLabel: 'Upload hostel',
    successMessage: 'Hostel uploaded successfully.',
    routeAfter: '/hostelmarketplace',
    pickerTypes: IMAGE_TYPES,
    multiple: true,
    attachmentLabel: 'Selected photos',
    uploadHint: 'Images only',
    dropHint: 'Choose hostel photos',
    fileKind: 'images',
    fields: [
      { key: 'title', label: 'Title', placeholder: 'e.g. 2-bedroom self-contained', icon: 'create-outline', type: 'text' },
      { key: 'location', label: 'Location', placeholder: 'e.g. Behind Main Gate', icon: 'location-outline', type: 'text' },
      { key: 'roomType', label: 'Room type', placeholder: 'Select room type...', icon: 'bed-outline', type: 'select', options: ROOM_TYPE_OPTIONS },
      { key: 'price', label: 'Price', placeholder: 'e.g. 350000', icon: 'cash-outline', type: 'text' },
      { key: 'distance', label: 'Distance to campus', placeholder: 'e.g. 5 min walk, 10 min bike', icon: 'walk-outline', type: 'text' },
      { key: 'amenities', label: 'Amenities', placeholder: 'Select amenities...', icon: 'grid-outline', type: 'chips', options: AMENITY_OPTIONS },
      { key: 'availability', label: 'Availability', placeholder: 'Select availability...', icon: 'checkmark-circle-outline', type: 'select', options: HOSTEL_AVAILABILITY_OPTIONS },
      { key: 'phone', label: 'Phone', placeholder: 'e.g. 080XXXXXXXX', icon: 'call-outline', type: 'text' },
      { key: 'description', label: 'Description', placeholder: 'Add amenities, distance to campus, etc.', icon: 'document-text-outline', multiline: true, type: 'text' },
    ],
    defaultForm: { title: '', location: '', roomType: '', price: '', distance: '', amenities: '', availability: '', phone: '', description: '' },
  },
};

const MAX_SIZE = {
  question: 50 * 1024 * 1024,
  note: 50 * 1024 * 1024,
  images: 10 * 1024 * 1024,
};

const normalizeType = (value) => {
  const input = Array.isArray(value) ? value[0] : value;
  if (input === 'note' || input === 'marketplace' || input === 'hostel') return input;
  return 'question';
};

const isImageMime = (mimeType = '') => String(mimeType).startsWith('image/');
const isPdfMime = (mimeType = '', name = '') =>
  String(mimeType) === 'application/pdf' || String(name).toLowerCase().endsWith('.pdf');

// Takes `colors` as a parameter instead of reading it from module scope
// (it only exists inside the component via useTheme()).
const fileBadge = (mimeType, name, colors) => {
  if (isImageMime(mimeType)) return { icon: 'image-outline', color: colors.blue, label: 'Image' };
  if (isPdfMime(mimeType, name)) return { icon: 'document-text-outline', color: colors.red, label: 'PDF' };
  return { icon: 'document-outline', color: colors.textTertiary, label: 'Doc' };
};

/* ------------------------------------------------------------------ */
/*  Small presentational helper — keeps every card header consistent.  */
/*  Takes styles/colors as props instead of reading module-scope       */
/*  values that only exist inside UploadPage.                          */
/* ------------------------------------------------------------------ */
function SectionHeader({ step, icon, title, subtitle, trailing, styles, colors }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionIconWrap}>
          {step ? <Text style={styles.sectionStep}>{step}</Text> : <Ionicons name={icon} size={16} color={colors.brand} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        </View>
        {trailing}
      </View>
    </View>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const uploadType = normalizeType(params.type);
  const config = CONFIGS[uploadType] || CONFIGS.question;

  const { universities, loading: ul, searchText: us, setSearchText: sus, loadMore: lmu } = useUniversities();
  const { departments, loading: dl, searchText: ds, setSearchText: sds, selectUniversity } = useDepartments();

  const [form, setForm] = useState(config.defaultForm);
  const [attachments, setAttachments] = useState([]);
  const [progress, setProgress] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const editId = params.editId ? String(params.editId) : '';
  const isEditMode = Boolean(editId);

  // Derived values that effects below depend on — these must be declared
  // before any useEffect that references them in its dependency array.
  // (Referencing a `const` in a dependency array before its declaration
  // line executes throws "Cannot access before initialization" — the
  // dependency array is evaluated synchronously during render, unlike the
  // effect body itself which only runs after render completes.)
  const isLimitRestricted = uploadType === 'marketplace' || uploadType === 'hostel';
  const isFreeUser = !profile?.premium;
  const freeLimit = 5;
  const postedBy = profile?.username || profile?.fullName;

  useEffect(() => {
    setForm({ ...config.defaultForm });
    setAttachments([]);
    setProgress({});
    setMessage('');
    setError('');
    setUploading(false);
    setPreviewItem(null);
    setLimitInfo(null);
    setEditItem(null);
  }, [config.defaultForm, config.key]);

  useEffect(() => {
    if (!profile?.uid || !isLimitRestricted) return;
    let cancelled = false;
    (async () => {
      try {
        const collectionName = uploadType === 'marketplace' ? 'studentMarketplace' : 'hostels';
        const count = await countUserUploads(collectionName, profile.uid, 'userId');
        if (!cancelled) {
          setLimitInfo({ count, limit: freeLimit, isFree: !profile?.premium });
        }
      } catch {
        if (!cancelled) setLimitInfo({ count: 0, limit: freeLimit, isFree: !profile?.premium });
      }
    })();
    return () => { cancelled = true; };
  }, [isLimitRestricted, profile?.premium, profile?.uid, uploadType]);

  useEffect(() => {
    if (!editId || !['marketplace', 'hostel'].includes(uploadType)) {
      setEditItem(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const record = await fetchRecord(uploadType === 'marketplace' ? 'studentMarketplace' : 'hostels', editId);
        if (!cancelled && record) {
          setEditItem(record);
          setForm({
            ...config.defaultForm,
            title: record.title || '',
            category: record.category || '',
            condition: record.condition || '',
            price: record.price ? String(record.price) : '',
            location: record.location || '',
            availability: record.availability || '',
            phone: record.phone || '',
            description: record.description || '',
            roomType: record.roomType || record.type || '',
            distance: record.distance || '',
            amenities: Array.isArray(record.amenities) ? record.amenities.join(', ') : record.amenities || '',
          });
        }
      } catch {
        if (!cancelled) setError('Could not load this listing to edit.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config.defaultForm, editId, uploadType]);

  const requiredFieldKeys = useMemo(() => {
    if (uploadType === 'note') return ['title', 'course', 'dept', 'school'];
    if (uploadType === 'marketplace') return ['title', 'category', 'condition', 'price', 'location', 'phone'];
    if (uploadType === 'hostel') return ['title', 'location', 'roomType', 'price', 'phone'];
    return config.fields.map((f) => f.key);
  }, [config.fields, uploadType]);

  const existingImages = useMemo(() => {
    if (!editItem) return [];
    return editItem.images || editItem.imageAssets?.map((a) => a.url || a.secure_url).filter(Boolean) || editItem.photos || [];
  }, [editItem]);

  const missingItems = useMemo(() => {
    const items = [];
    const emptyField = requiredFieldKeys.find((key) => !String(form[key] || '').trim());
    if (emptyField) {
      const field = config.fields.find((f) => f.key === emptyField);
      items.push(`Fill in ${field ? field.label.replace(' (optional)', '').toLowerCase() : 'required fields'}`);
    }
    const hasExistingAssets = existingImages.length > 0;
    if (uploadType === 'note' && attachments.length !== 1) {
      items.push('Attach exactly one PDF');
    } else if (uploadType !== 'note' && attachments.length === 0 && !(isEditMode && hasExistingAssets)) {
      items.push(uploadType === 'question' ? 'Attach at least one file' : 'Attach at least one photo');
    }
    return items;
  }, [attachments.length, config.fields, existingImages.length, form, isEditMode, requiredFieldKeys, uploadType]);

  const validation = missingItems.length === 0;
  const normalizedPrice = Number(String(form.price || '').replace(/[^\d.]/g, ''));
  const hasValidPrice = !['marketplace', 'hostel'].includes(uploadType) || (Number.isFinite(normalizedPrice) && normalizedPrice > 0);
  const hasValidYear = uploadType !== 'question' || !form.year || /^\d{4}$/.test(String(form.year).trim());
  const canUploadMore = !isLimitRestricted || !isFreeUser || (limitInfo?.count ?? 0) < freeLimit;
  const uploadReady = validation && hasValidPrice && hasValidYear && canUploadMore;
  const primaryAttachment = attachments[0] || null;
  const previewSource = previewItem || primaryAttachment;
  const isGridKind = config.fileKind === 'images';
  const uploadedCount = attachments.filter((item) => (progress[item.name] || 0) >= 100).length;

  const ensureValidFiles = (fileList) => {
    const kind = config.fileKind;
    const limit = MAX_SIZE[kind] || MAX_SIZE.images;

    for (const item of fileList) {
      if (item.size > limit) {
        throw new Error(`${item.name} is too large`);
      }
    }
  };

  const normalizeAttachment = (asset) => ({
    uri: asset.uri,
    name: asset.name || 'file',
    mimeType: asset.mimeType || asset.type || 'application/octet-stream',
    size: asset.size || 0,
  });

  const pickAttachments = async () => {
    setError('');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: config.pickerTypes,
        multiple: config.multiple,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const nextFiles = result.assets.map(normalizeAttachment);
      ensureValidFiles(nextFiles);

      setAttachments((current) => {
        if (!config.multiple) {
          return nextFiles.slice(0, 1);
        }

        const merged = [...current];
        nextFiles.forEach((file) => {
          const exists = merged.some((item) => item.name === file.name && item.size === file.size);
          if (!exists) {
            merged.push(file);
          }
        });
        return merged;
      });
    } catch (pickError) {
      setError(pickError?.message || 'Could not open the file picker.');
    } finally {
      setPickerOpen(false);
    }
  };

  const removeAttachment = (name) => {
    setAttachments((current) => current.filter((item) => item.name !== name));
    setProgress((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const clearAll = () => {
    setAttachments([]);
    setProgress({});
    setMessage('');
    setError('');
    setPreviewItem(null);
  };

  const openPreview = async (item) => {
    if (!item) return;
    if (isImageMime(item.mimeType)) {
      setPreviewItem(item);
      return;
    }

    if (item.uri?.startsWith('http')) {
      await WebBrowser.openBrowserAsync(item.uri, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      return;
    }

    setPreviewItem(item);
  };

  const uploadAttachment = async (file) => {
    if (config.fileKind === 'pdf') {
      return uploadPDF(file, (percent) => {
        setProgress((current) => ({ ...current, [file.name]: Math.round(percent) }));
      });
    }

    if (config.fileKind === 'images') {
      return uploadImage(file, (percent) => {
        setProgress((current) => ({ ...current, [file.name]: Math.round(percent) }));
      });
    }

    return uploadFile(file, (percent) => {
      setProgress((current) => ({ ...current, [file.name]: Math.round(percent) }));
    });
  };

  const buildPayload = (uploadedAttachments) => {
    if (uploadType === 'note') {
      const uploaded = uploadedAttachments[0];
      return {
        title: form.title.trim(),
        course: form.course.trim(),
        dept: form.dept.trim(),
        school: form.school.trim(),
        level: form.level || '',
        lecturer: form.lecturer.trim(),
        description: form.description.trim(),
        fileUrl: uploaded?.url || '',
        downloadUrl: uploaded?.url || '',
        previewUrl: uploaded?.url || '',
        fileName: uploaded?.name || '',
        fileSize: uploaded?.size || 0,
        files: uploadedAttachments,
        fileAsset: uploaded ? toCloudinaryAsset(uploaded) : null,
        cloudinaryPublicId: uploaded?.publicId || '',
        cloudinaryResourceType: uploaded?.resourceType || 'raw',
        postedBy,
      };
    }

    if (uploadType === 'marketplace') {
      const basePayload = {
        title: form.title.trim(),
        category: form.category.trim(),
        condition: form.condition.trim(),
        price: normalizedPrice,
        location: form.location.trim(),
        availability: form.availability.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
        status: 'pending',
        verified: Boolean(profile?.premium),
        premiumUser: Boolean(profile?.premium),
      };
      if (uploadedAttachments.length) {
        return {
          ...basePayload,
          images: uploadedAttachments.map((item) => item.url),
          imageAssets: uploadedAttachments.map((item) => toCloudinaryAsset(item)),
        };
      }
      return basePayload;
    }

    if (uploadType === 'hostel') {
      const basePayload = {
        title: form.title.trim(),
        location: form.location.trim(),
        roomType: form.roomType.trim(),
        price: normalizedPrice,
        distance: form.distance.trim(),
        amenities: form.amenities.trim(),
        availability: form.availability.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
        status: 'pending',
        verified: Boolean(profile?.premium),
        premiumUser: Boolean(profile?.premium),
      };
      if (uploadedAttachments.length) {
        return {
          ...basePayload,
          images: uploadedAttachments.map((item) => item.url),
          imageAssets: uploadedAttachments.map((item) => toCloudinaryAsset(item)),
        };
      }
      return basePayload;
    }

    return {
      ...form,
      files: uploadedAttachments,
      fileUrl: uploadedAttachments[0]?.url || '',
      previewUrl: uploadedAttachments[0]?.url || '',
      fileName: uploadedAttachments[0]?.name || '',
    };
  };

  const submitToDatabase = async (payload) => {
    if (uploadType === 'note') {
      return createNote(payload);
    }

    if (uploadType === 'marketplace') {
      if (isEditMode && editId) {
        return updateStudentListing(editId, payload);
      }
      return createStudentListing(payload);
    }

    if (uploadType === 'hostel') {
      if (isEditMode && editId) {
        return updateHostelListing(editId, payload);
      }
      return createHostelListing(payload);
    }

    return createQuestion(payload);
  };

  const handleUpload = async () => {
    Keyboard.dismiss();

    if (!profile?.uid) {
      setError('Please login first.');
      return;
    }

    if (!validation) {
      setError('Please fill all required fields and attach at least one file.');
      return;
    }

    if (!hasValidPrice) {
      setError('Enter a valid price greater than zero.');
      return;
    }

    if (!hasValidYear) {
      setError('Enter the year as four digits, for example 2024.');
      return;
    }

    if (isLimitRestricted && isFreeUser && !canUploadMore) {
      setError(`Free users can upload up to ${freeLimit} ${uploadType === 'marketplace' ? 'products' : 'hostels'}. Upgrade to Premium to publish more.`);
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    try {
      const uploadedAttachments = [];

      for (const file of attachments) {
        const uploaded = await uploadAttachment(file);
        uploadedAttachments.push({
          name: file.name,
          url: uploaded.secure_url || uploaded.url || '',
          publicId: uploaded.public_id || uploaded.publicId || '',
          resourceType: uploaded.resource_type || uploaded.resourceType || '',
          size: file.size,
          type: file.mimeType,
          postedBy,
        });
      }

      const payload = buildPayload(uploadedAttachments);

      if (uploadType === 'question') {
        payload.userId = profile.uid;
        payload.userEmail = profile.email || '';
      }

      if (uploadType === 'note') {
        payload.uploadedBy = profile.uid;
        payload.userId = profile.uid;
        payload.userEmail = profile.email || '';
      }

      await submitToDatabase(payload);

      const bareTitle = config.title.replace(/^Upload\s*/, '');
      setMessage(isEditMode ? `${bareTitle} updated.` : config.successMessage);
      setForm(config.defaultForm);
      setAttachments([]);
      setProgress({});
      setPreviewItem(null);
      router.replace(config.routeAfter);
    } catch (submitError) {
      setError(submitError?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSchoolSelect = (item) => {
    setForm((current) => ({
      ...current,
      school: item.name,
      schoolId: item.id,
      department: '',
      departmentId: '',
      dept: '',
      deptId: '',
    }));
    selectUniversity(item.id);
  };

  const handleDepartmentSelect = (item) => {
    setForm((current) => ({
      ...current,
      department: item.name,
      departmentId: item.id,
      dept: item.name,
      deptId: item.id,
    }));
  };

  const handleLevelSelect = (item) => {
    setForm((current) => ({
      ...current,
      level: item.value,
    }));
  };

  const handleSelectField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const toggleChipValue = (key, option) => {
    setForm((current) => {
      const selected = String(current[key] || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      const next = selected.includes(option)
        ? selected.filter((v) => v !== option)
        : [...selected, option];
      return { ...current, [key]: next.join(', ') };
    });
  };

  const renderField = (field) => {
    if (field.type === 'school') {
      const schoolValue = form.schoolId || form.school || '';
      return (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <SearchableDropdown
            label=""
            placeholder={field.placeholder}
            data={universities}
            value={schoolValue}
            onSelect={handleSchoolSelect}
            loading={ul}
            searchText={us}
            onSearchChange={sus}
            onLoadMore={lmu}
            icon={field.icon}
            renderItemLabel={(i) => i.shortName ? `${i.name} (${i.shortName})` : i.name}
          />
        </View>
      );
    }

    if (field.type === 'department') {
      const deptValue = form.departmentId || form.deptId || '';
      return (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <SearchableDropdown
            label=""
            placeholder={field.placeholder}
            data={departments}
            value={deptValue}
            onSelect={handleDepartmentSelect}
            loading={dl}
            searchText={ds}
            onSearchChange={sds}
            icon={field.icon}
            renderItemLabel={(i) => `${i.name}${i.faculty ? ` (${i.faculty})` : ''}`}
          />
        </View>
      );
    }

    if (field.type === 'level') {
      const levelData = ACADEMIC_LEVELS.map((l, i) => ({ id: `level-${i}`, name: l.label, value: l.value }));
      const levelValue = form.level ? `level-${ACADEMIC_LEVELS.findIndex((l) => l.value === form.level)}` : '';
      return (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <SearchableDropdown
            label=""
            placeholder={field.placeholder}
            data={levelData}
            value={levelValue}
            onSelect={(item) => handleLevelSelect({ value: item.value })}
            icon={field.icon}
            renderItemLabel={(i) => i.name}
          />
        </View>
      );
    }

    if (field.type === 'select') {
      const optionData = field.options.map((opt, i) => ({ id: `${field.key}-${i}`, name: opt, value: opt }));
      const currentIndex = field.options.indexOf(form[field.key]);
      const selectValue = currentIndex >= 0 ? `${field.key}-${currentIndex}` : '';
      return (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <SearchableDropdown
            label=""
            placeholder={field.placeholder}
            data={optionData}
            value={selectValue}
            onSelect={(item) => handleSelectField(field.key, item.value)}
            icon={field.icon}
            renderItemLabel={(i) => i.name}
          />
        </View>
      );
    }

    if (field.type === 'chips') {
      const selected = String(form[field.key] || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      return (
        <View key={field.key} style={styles.field}>
          <View style={styles.chipsLabelRow}>
            <Text style={styles.label}>{field.label}</Text>
            {selected.length ? <Text style={styles.chipsCount}>{selected.length} selected</Text> : null}
          </View>
          <View style={styles.chipsWrap}>
            {field.options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => toggleChipValue(field.key, option)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option}
                >
                  {isSelected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginRight: 4 }} /> : null}
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View key={field.key} style={styles.field}>
        <Text style={styles.label}>{field.label}</Text>
        <View
          style={[
            styles.inputWrap,
            field.multiline && styles.inputWrapMultiline,
            focusedField === field.key && styles.inputWrapFocused,
          ]}
        >
          {field.key === 'price' ? (
            <Text style={[styles.currencyPrefix, focusedField === field.key && { color: colors.brand }]}>₦</Text>
          ) : (
            <Ionicons
              name={field.icon}
              size={17}
              color={focusedField === field.key ? colors.brand : colors.textTertiary}
            />
          )}
          <TextInput
            value={form[field.key]}
            onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
            onFocus={() => setFocusedField(field.key)}
            onBlur={() => setFocusedField(null)}
            placeholder={field.placeholder}
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, field.multiline && styles.textArea]}
            multiline={Boolean(field.multiline)}
            keyboardType={field.key === 'price' ? 'decimal-pad' : field.key === 'phone' || field.key === 'year' ? 'numeric' : 'default'}
            returnKeyType={field.multiline ? 'default' : 'next'}
          />
        </View>
      </View>
    );
  };

  return (
    <ScreenShell title={config.title} subtitle={config.subtitle} showBack scrollable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isLimitRestricted && limitInfo ? (
            <View style={styles.limitBanner}>
              <View style={styles.limitBannerIcon}>
                <Ionicons name="lock-open-outline" size={16} color={colors.brand} />
              </View>
              <View style={styles.limitBannerCopy}>
                <Text style={styles.limitBannerTitle}>Free-user upload limit</Text>
                <Text style={styles.limitBannerText}>
                  {limitInfo.count}/{freeLimit} {uploadType === 'marketplace' ? 'products' : 'hostels'} used. Premium unlocks unlimited publishing.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.brand} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.badge}>{isEditMode ? 'Edit' : 'Upload'}</Text>
              <Text style={styles.heroTitle}>{config.title}</Text>
              <Text style={styles.heroText}>{config.subtitle}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <SectionHeader step="1" icon={config.cardIcon} title={config.cardTitle} styles={styles} colors={colors} />
            {config.fields.map((field) => renderField(field))}
          </View>

          {isEditMode && existingImages.length > 0 ? (
            <View style={styles.card}>
              <SectionHeader
                icon="images-outline"
                title="Current photos"
                subtitle="Already live on this listing"
                styles={styles}
                colors={colors}
              />
              <View style={styles.grid}>
                {existingImages.map((url, index) => (
                  <View key={`${url}-${index}`} style={styles.gridTile}>
                    <Image source={{ uri: url }} style={styles.gridImage} contentFit="cover" cachePolicy="disk" />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.card}>
            <SectionHeader
              step="2"
              icon="images-outline"
              title={isEditMode && existingImages.length > 0 ? 'Add new photos (optional)' : config.attachmentLabel}
              trailing={
                attachments.length > 0 ? (
                  <Pressable onPress={clearAll} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear all selected files">
                    <Text style={styles.clearText}>Clear all</Text>
                  </Pressable>
                ) : null
              }
              styles={styles}
              colors={colors}
            />

            {attachments.length === 0 ? (
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={styles.dropZone}
                accessibilityRole="button"
                accessibilityLabel={config.dropHint}
              >
                <View style={styles.dropIconWrap}>
                  <Ionicons name="add" size={26} color={colors.brand} />
                </View>
                <Text style={styles.dropTitle}>{config.dropHint}</Text>
                <Text style={styles.dropSubtitle}>{config.uploadHint}</Text>
              </Pressable>
            ) : isGridKind ? (
              <View style={styles.grid}>
                {attachments.map((item) => {
                  const percent = progress[item.name] || 0;
                  return (
                    <Pressable
                      key={`${item.name}-${item.size}`}
                      style={styles.gridTile}
                      onPress={() => openPreview(item)}
                      accessibilityRole="imagebutton"
                      accessibilityLabel={`Preview ${item.name}`}
                    >
                      <Image source={{ uri: item.uri }} style={styles.gridImage} contentFit="cover" cachePolicy="disk" />
                      {uploading && percent > 0 && percent < 100 ? (
                        <View style={styles.gridProgressOverlay}>
                          <Text style={styles.gridProgressText}>{percent}%</Text>
                        </View>
                      ) : null}
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          removeAttachment(item.name);
                        }}
                        hitSlop={8}
                        style={styles.gridRemove}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.name}`}
                      >
                        <Ionicons name="close" size={13} color="#FFFFFF" />
                      </Pressable>
                    </Pressable>
                  );
                })}
                {config.multiple ? (
                  <Pressable
                    onPress={() => setPickerOpen(true)}
                    style={styles.gridAddTile}
                    accessibilityRole="button"
                    accessibilityLabel="Add more photos"
                  >
                    <Ionicons name="add" size={22} color={colors.brand} />
                    <Text style={styles.gridAddText}>Add more</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.attachmentList}>
                {attachments.map((item) => {
                  const percent = progress[item.name] || 0;
                  const badge = fileBadge(item.mimeType, item.name, colors);

                  return (
                    <Pressable
                      key={`${item.name}-${item.size}`}
                      onPress={() => openPreview(item)}
                      style={styles.attachmentItem}
                      accessibilityRole="button"
                      accessibilityLabel={`Preview ${item.name}`}
                    >
                      <View style={[styles.attachmentThumbPlaceholder, { backgroundColor: `${badge.color}14` }]}>
                        <Ionicons name={badge.icon} size={20} color={badge.color} />
                      </View>

                      <View style={styles.attachmentMeta}>
                        <Text style={styles.attachmentName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.attachmentMetaRow}>
                          <View style={[styles.typeChip, { backgroundColor: `${badge.color}14` }]}>
                            <Text style={[styles.typeChipText, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                          <Text style={styles.attachmentSize}>{(item.size / 1024).toFixed(1)} KB</Text>
                        </View>
                        {percent > 0 ? (
                          <View style={styles.progressRow}>
                            <View style={styles.progressTrack}>
                              <View style={[styles.progressFill, { width: `${percent}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{percent}%</Text>
                          </View>
                        ) : null}
                      </View>

                      <Pressable
                        onPress={() => removeAttachment(item.name)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.name}`}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                      </Pressable>
                    </Pressable>
                  );
                })}

                {config.multiple ? (
                  <Pressable
                    onPress={() => setPickerOpen(true)}
                    style={styles.addMoreRow}
                    accessibilityRole="button"
                    accessibilityLabel="Add another file"
                  >
                    <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
                    <Text style={styles.addMoreText}>Add another file</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>

          {previewSource && !isGridKind ? (
            <View style={styles.card}>
              <SectionHeader icon="eye-outline" title="Preview" subtitle="Review before you publish" styles={styles} colors={colors} />
              <Pressable
                onPress={() => setPreviewItem(previewSource)}
                style={styles.previewFallback}
                accessibilityRole="button"
                accessibilityLabel="Open larger preview"
              >
                <Ionicons name="document-text-outline" size={28} color={colors.brand} />
                <Text style={styles.previewFallbackTitle}>{previewSource.name}</Text>
                <Text style={styles.previewFallbackText}>Tap to open a larger preview</Text>
              </Pressable>
            </View>
          ) : null}

          {message ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {(!uploadReady && !uploading) ? (
            <View style={styles.helperRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.helperText}>
                {missingItems[0] || (!hasValidPrice ? 'Enter a valid price greater than zero' : !hasValidYear ? 'Use a four-digit year' : 'Upgrade to publish more items')}
              </Text>
            </View>
          ) : null}
          {uploading && attachments.length > 1 ? (
            <View style={styles.helperRow}>
              <Text style={styles.helperText}>Uploading file {Math.min(uploadedCount + 1, attachments.length)} of {attachments.length}…</Text>
            </View>
          ) : null}
          <Pressable
            onPress={handleUpload}
            disabled={uploading || !uploadReady}
            style={({ pressed }) => [
              styles.submitButton,
              (uploading || !uploadReady) && styles.submitButtonDisabled,
              pressed && !uploading && uploadReady && styles.submitButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={config.submitLabel}
          >
            {uploading ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.submitText}>Uploading…</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>{config.submitLabel}</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{config.title}</Text>
                <Text style={styles.sheetSubtitle}>{config.dropHint}</Text>
              </View>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Pressable style={styles.sheetButton} onPress={pickAttachments} accessibilityRole="button" accessibilityLabel="Choose files">
              <Ionicons name="folder-open-outline" size={18} color={colors.brand} />
              <Text style={styles.sheetButtonText}>Choose files</Text>
            </Pressable>

            <Pressable style={styles.sheetButtonSecondary} onPress={() => setPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={styles.sheetButtonSecondaryText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(previewItem)} transparent animationType="fade" onRequestClose={() => setPreviewItem(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewItem(null)}>
          <Pressable style={styles.previewModal} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {previewItem?.name || 'Preview'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {previewItem?.mimeType || 'Selected file'} · {((previewItem?.size || 0) / 1024).toFixed(1)} KB
                </Text>
              </View>
              <Pressable onPress={() => setPreviewItem(null)} hitSlop={10} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Close preview">
                <Ionicons name="close" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>

            {previewItem && isImageMime(previewItem.mimeType) ? (
              <Image source={{ uri: previewItem.uri }} style={styles.previewModalImage} contentFit="cover" cachePolicy="disk" />
            ) : previewItem?.uri ? (
              <View style={styles.previewFallback}>
                <Ionicons name="document-text-outline" size={30} color={colors.brand} />
                <Text style={styles.previewFallbackTitle}>{previewItem.name}</Text>
                <Text style={styles.previewFallbackText}>Preview the file details here and publish when ready.</Text>
              </View>
            ) : null}

            {previewItem?.uri && !isImageMime(previewItem.mimeType) && previewItem.uri.startsWith('http') ? (
              <Pressable
                style={styles.sheetButton}
                onPress={() =>
                  WebBrowser.openBrowserAsync(previewItem.uri, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET })
                }
                accessibilityRole="button"
                accessibilityLabel="Open file"
              >
                <Ionicons name="open-outline" size={18} color={colors.brand} />
                <Text style={styles.sheetButtonText}>Open file</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: {
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.xxl + 84,
    gap: SPACE.lg,
  },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.brandLight,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: RADIUS.xl,
    padding: SPACE.md,
    marginBottom: SPACE.md,
  },
  limitBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitBannerCopy: {
    flex: 1,
  },
  limitBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.brandDark,
  },
  limitBannerText: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderRadius: RADIUS.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: SPACE.lg,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandLight,
  },
  heroCopy: { flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    color: colors.brand,
    backgroundColor: colors.brandLight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  heroTitle: {
    marginTop: 6,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  heroText: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: SPACE.lg,
    gap: SPACE.md,
  },
  sectionHeaderWrap: { marginBottom: SPACE.xs },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandLight,
  },
  sectionStep: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.brand,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    marginTop: 1,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  clearText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  field: { gap: 6 },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipsCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textTertiary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    borderRadius: RADIUS.md,
    backgroundColor: colors.background,
    paddingHorizontal: SPACE.md,
    height: 50,
  },
  inputWrapMultiline: {
    height: undefined,
    alignItems: 'flex-start',
    paddingVertical: SPACE.md,
  },
  inputWrapFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: 'top',
    paddingTop: 2,
  },
  dropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDefault,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.background,
    paddingVertical: SPACE.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dropIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandLight,
    marginBottom: 4,
  },
  dropTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  dropSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  gridTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  gridProgressOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  gridProgressText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  gridAddTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.background,
  },
  gridAddText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.brand,
  },
  attachmentList: { gap: SPACE.sm },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.background,
    padding: SPACE.md,
  },
  attachmentThumbPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentMeta: { flex: 1, gap: 5 },
  attachmentName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attachmentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChip: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  attachmentSize: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.borderDefault,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
    backgroundColor: colors.success,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
  },
  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACE.sm,
  },
  addMoreText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '700',
  },
  previewFallback: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: SPACE.lg,
    gap: 6,
  },
  previewFallbackTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  previewFallbackText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.greenLight,
    backgroundColor: colors.greenLight,
    padding: SPACE.md,
  },
  successText: {
    flex: 1,
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerLight,
    padding: SPACE.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.lg,
    gap: SPACE.sm,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.brand,
  },
  submitButtonPressed: { backgroundColor: colors.brandDark },
  submitButtonDisabled: { backgroundColor: colors.textTertiary },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    padding: SPACE.md,
  },
  sheet: {
    borderRadius: RADIUS.xl,
    backgroundColor: colors.surface,
    padding: SPACE.lg,
    gap: SPACE.md,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.borderDefault,
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACE.md,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: RADIUS.md,
    backgroundColor: colors.brandLight,
  },
  sheetButtonText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '800',
  },
  sheetButtonSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: RADIUS.md,
    backgroundColor: colors.background,
  },
  sheetButtonSecondaryText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  previewModal: {
    borderRadius: RADIUS.xl,
    backgroundColor: colors.surface,
    padding: SPACE.lg,
    gap: SPACE.md,
    maxHeight: '90%',
  },
  previewModalImage: {
    minHeight: 260,
    width: '100%',
    borderRadius: RADIUS.lg,
    backgroundColor: colors.background,
  },
});