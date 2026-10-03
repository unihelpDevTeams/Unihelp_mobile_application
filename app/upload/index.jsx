import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  updateNote,
  updateQuestion,
  updateStudentListing,
} from '../../services/firestoreSync';
import { toCloudinaryAsset } from '../../services/cloudinary';
import { postJson, uploadFeatureMedia } from '../../src/shared/services/backend';
import { deleteCloudinaryAssets } from '../../services/mediaCleanup';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { canManageResource, canUploadResource } from '../../src/shared/auth/resourcePermissions';
import { COMMERCE_UPLOAD_LIMITS, isPremiumActive } from '../../src/shared/services/premium';

const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const RADIUS = { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 };
const DESCRIPTION_MAX = 600;

// Used only when the theme does not define a token.
const FALLBACK_COLORS = {
  brand: '#4F46E5',
  brandLight: '#EEF2FF',
  brandDark: '#3730A3',
  surface: '#FFFFFF',
  background: '#F8FAFC',
  borderDefault: '#E5E7EB',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  success: '#10B981',
  greenLight: '#ECFDF5',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',
  warning: '#B45309',
  warningLight: '#FEF3C7',
  blue: '#2563EB',
  red: '#DC2626',
  overlay: 'rgba(15,23,42,0.5)',
};

const QUESTION_TYPES = [
  'application/pdf',
  'image/*',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const IMAGE_TYPES = ['image/*'];
const PDF_TYPES = ['application/pdf'];
const RESOURCE_UPLOAD_TYPES = ['note', 'question'];
const EDIT_COLLECTIONS = {
  marketplace: 'studentMarketplace',
  hostel: 'hostels',
  note: 'notes',
  question: 'questions',
};

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

const assetIdentity = (asset = {}) => asset.publicId || asset.cloudinaryPublicId || asset.url || asset.secure_url || '';

const collectResourceAssets = (item = {}) => {
  const assets = [];
  const pushAsset = (asset) => {
    if (!asset) return;
    if (typeof asset === 'string') {
      assets.push({ url: asset });
      return;
    }
    assets.push({
      name: asset.name || asset.fileName || item.fileName || '',
      url: asset.url || asset.secure_url || asset.fileUrl || asset.downloadUrl || '',
      publicId: asset.publicId || asset.public_id || asset.cloudinaryPublicId || '',
      resourceType: asset.resourceType || asset.resource_type || asset.cloudinaryResourceType || 'raw',
      size: asset.size || asset.fileSize || 0,
      type: asset.type || asset.fileType || '',
    });
  };

  if (Array.isArray(item.files)) item.files.forEach(pushAsset);
  if (item.fileAsset) pushAsset(item.fileAsset);
  if (item.fileUrl || item.downloadUrl || item.previewUrl || item.cloudinaryPublicId) {
    pushAsset({
      name: item.fileName,
      url: item.downloadUrl || item.fileUrl || item.previewUrl,
      publicId: item.cloudinaryPublicId,
      resourceType: item.cloudinaryResourceType || 'raw',
      size: item.fileSize,
      type: item.fileType,
    });
  }

  const seen = new Set();
  return assets.filter((asset) => {
    const key = assetIdentity(asset);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const CONFIGS = {
  question: {
    key: 'question',
    title: 'Upload Past Questions',
    subtitle: 'Add course, exam, and school context so students can find the right paper.',
    cardTitle: 'Document details',
    cardIcon: 'document-text-outline',
    submitLabel: 'Compress & upload',
    successMessage: 'Question uploaded successfully.',
    routeAfter: '/(tabs)/studyMaterials?tab=questions',
    pickerTypes: QUESTION_TYPES,
    multiple: true,
    attachmentLabel: 'Selected files',
    uploadHint: 'PDF, DOC, DOCX or images',
    dropHint: 'Tap to choose files',
    formats: ['PDF', 'DOC', 'DOCX', 'Images'],
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
    routeAfter: '/(tabs)/studyMaterials?tab=notes',
    pickerTypes: PDF_TYPES,
    multiple: false,
    attachmentLabel: 'Selected PDF',
    uploadHint: 'One PDF per note',
    dropHint: 'Tap to choose a PDF',
    formats: ['PDF'],
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
    attachmentLabel: 'Photos',
    uploadHint: 'Clear photos sell faster. The first photo is your cover.',
    dropHint: 'Tap to add photos',
    formats: ['JPG', 'PNG', 'HEIC'],
    fileKind: 'images',
    fields: [
      { key: 'title', label: 'Title', placeholder: 'e.g. Mini fridge, barely used', icon: 'create-outline', type: 'text' },
      { key: 'category', label: 'Category', placeholder: 'Select category...', icon: 'pricetag-outline', type: 'select', options: MARKETPLACE_CATEGORY_OPTIONS },
      { key: 'condition', label: 'Condition', placeholder: 'Select condition...', icon: 'sparkles-outline', type: 'select', options: CONDITION_OPTIONS },
      { key: 'price', label: 'Price', placeholder: 'e.g. 25000', icon: 'cash-outline', type: 'text' },
      { key: 'location', label: 'Pickup location', placeholder: 'e.g. Main gate, Faculty of Science', icon: 'location-outline', type: 'text' },
      { key: 'availability', label: 'Availability (optional)', placeholder: 'Select availability...', icon: 'checkmark-circle-outline', type: 'select', options: MARKETPLACE_AVAILABILITY_OPTIONS },
      { key: 'phone', label: 'Phone', placeholder: 'e.g. 080XXXXXXXX', icon: 'call-outline', type: 'text' },
      { key: 'description', label: 'Description (optional)', placeholder: 'Add condition, pickup location, etc.', icon: 'document-text-outline', multiline: true, type: 'text' },
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
    attachmentLabel: 'Photos',
    uploadHint: 'Show the room, bathroom and compound. The first photo is your cover.',
    dropHint: 'Tap to add photos',
    formats: ['JPG', 'PNG', 'HEIC'],
    fileKind: 'images',
    fields: [
      { key: 'title', label: 'Title', placeholder: 'e.g. 2-bedroom self-contained', icon: 'create-outline', type: 'text' },
      { key: 'location', label: 'Location', placeholder: 'e.g. Behind Main Gate', icon: 'location-outline', type: 'text' },
      { key: 'roomType', label: 'Room type', placeholder: 'Select room type...', icon: 'bed-outline', type: 'select', options: ROOM_TYPE_OPTIONS },
      { key: 'price', label: 'Price (per year)', placeholder: 'e.g. 350000', icon: 'cash-outline', type: 'text' },
      { key: 'distance', label: 'Distance to campus (optional)', placeholder: 'e.g. 5 min walk, 10 min bike', icon: 'walk-outline', type: 'text' },
      { key: 'amenities', label: 'Amenities (optional)', placeholder: 'Select amenities...', icon: 'grid-outline', type: 'chips', options: AMENITY_OPTIONS },
      { key: 'availability', label: 'Availability (optional)', placeholder: 'Select availability...', icon: 'checkmark-circle-outline', type: 'select', options: HOSTEL_AVAILABILITY_OPTIONS },
      { key: 'phone', label: 'Phone', placeholder: 'e.g. 080XXXXXXXX', icon: 'call-outline', type: 'text' },
      { key: 'description', label: 'Description (optional)', placeholder: 'Add amenities, distance to campus, etc.', icon: 'document-text-outline', multiline: true, type: 'text' },
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

const fileBadge = (mimeType, name, colors) => {
  if (isImageMime(mimeType)) return { icon: 'image-outline', color: colors.blue, label: 'Image' };
  if (isPdfMime(mimeType, name)) return { icon: 'document-text-outline', color: colors.red, label: 'PDF' };
  return { icon: 'document-outline', color: colors.textTertiary, label: 'Doc' };
};

const formatSize = (bytes = 0) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------------------------------------------ */
/*  Presentational helpers                                            */
/* ------------------------------------------------------------------ */

function ProgressHeader({ percent, steps, onStepPress, isEdit, styles, colors }) {
  const anim = useRef(new Animated.Value(percent)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: percent, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, percent]);

  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const complete = percent >= 100;

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressTop}>
        <Text style={styles.progressTitle}>
          {complete ? (isEdit ? 'Ready to save' : 'Ready to publish') : isEdit ? 'Update your details' : 'Complete your upload'}
        </Text>
        <Text style={[styles.progressPercent, complete && { color: colors.success }]}>{Math.round(percent)}%</Text>
      </View>
      <View style={styles.progressBarTrack}>
        <Animated.View style={[styles.progressBarFill, { width }, complete && { backgroundColor: colors.success }]} />
      </View>
      <View style={styles.stepRow}>
        {steps.map((step, index) => (
          <Pressable
            key={step.key}
            onPress={() => onStepPress(step.key)}
            style={({ pressed }) => [styles.stepPill, step.done && styles.stepPillDone, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={`${step.label}${step.done ? ', done' : ''}`}
          >
            <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
              {step.done ? <Ionicons name="checkmark" size={11} color="#FFFFFF" /> : <Text style={styles.stepDotText}>{index + 1}</Text>}
            </View>
            <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]} numberOfLines={1}>
              {step.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SectionHeader({ step, done, icon, title, subtitle, trailing, styles, colors }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={[styles.sectionIconWrap, done && styles.sectionIconDone]}>
        {done ? (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        ) : step ? (
          <Text style={styles.sectionStep}>{step}</Text>
        ) : (
          <Ionicons name={icon} size={16} color={colors.brand} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

function FieldWrap({ label, required, hint, error, counter, children, styles }) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        {counter ? <Text style={styles.counter}>{counter}</Text> : null}
      </View>
      {children}
      {error ? (
        <View style={styles.fieldMessageRow}>
          <Ionicons name="alert-circle" size={13} color={StyleSheet.flatten(styles.fieldErrorText).color} />
          <Text style={styles.fieldErrorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

function UsageMeter({ count, limit, premium, noun, styles, colors }) {
  const full = count >= limit;
  const ratio = Math.min(1, limit ? count / limit : 0);
  return (
    <View style={[styles.usageCard, full && styles.usageCardFull]}>
      <View style={styles.usageTop}>
        <View style={[styles.usageIcon, full && { backgroundColor: colors.dangerLight }]}>
          <Ionicons name={full ? 'lock-closed-outline' : premium ? 'sparkles-outline' : 'layers-outline'} size={16} color={full ? colors.danger : colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.usageTitle}>{full ? `You've reached your ${noun} limit` : premium ? 'Premium plan' : 'Free plan'}</Text>
          <Text style={styles.usageText}>
            {count} of {limit} {noun} used
            {!premium ? ` · Premium raises this to ${COMMERCE_UPLOAD_LIMITS.premium}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.usageTrack}>
        <View style={[styles.usageFill, { width: `${ratio * 100}%` }, full && { backgroundColor: colors.danger }]} />
      </View>
    </View>
  );
}

function ListingPreviewCard({ kind, image, title, price, location, chips, styles, colors }) {
  return (
    <View style={styles.listingPreview}>
      <View style={styles.listingPreviewImageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={styles.listingPreviewImage} contentFit="cover" cachePolicy="disk" />
        ) : (
          <View style={styles.listingPreviewEmpty}>
            <Ionicons name={kind === 'hostel' ? 'home-outline' : 'image-outline'} size={28} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.listingPreviewTag}>
          <Text style={styles.listingPreviewTagText}>Preview</Text>
        </View>
      </View>
      <View style={styles.listingPreviewBody}>
        <Text style={styles.listingPreviewTitle} numberOfLines={2}>
          {title || (kind === 'hostel' ? 'Your hostel title' : 'Your listing title')}
        </Text>
        <Text style={styles.listingPreviewPrice}>{price > 0 ? `₦${price.toLocaleString()}` : '₦ —'}</Text>
        {location ? (
          <View style={styles.listingPreviewRow}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.listingPreviewMeta} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
        {chips.length ? (
          <View style={styles.listingPreviewChips}>
            {chips.slice(0, 3).map((chip) => (
              <View key={chip} style={styles.listingPreviewChip}>
                <Text style={styles.listingPreviewChipText} numberOfLines={1}>{chip}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function UploadPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { colors: themeColors } = useTheme();
  const colors = useMemo(() => ({ ...FALLBACK_COLORS, ...themeColors }), [themeColors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const scrollRef = useRef(null);
  const sectionY = useRef({ details: 0, files: 0 });

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
  const [touched, setTouched] = useState({});
  const [limitInfo, setLimitInfo] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const editId = params.editId ? String(params.editId) : '';
  const isEditMode = Boolean(editId);

  // Derived values that effects depend on must be declared before those effects.
  const isLimitRestricted = uploadType === 'marketplace' || uploadType === 'hostel';
  const uploadOwnerId = profile?.uid || user?.uid;
  const premiumActive = isPremiumActive(profile);
  const isFreeUser = !premiumActive;
  const uploadLimit = premiumActive ? COMMERCE_UPLOAD_LIMITS.premium : COMMERCE_UPLOAD_LIMITS.free;
  const postedBy =
    profile?.username ||
    profile?.fullName ||
    profile?.name ||
    profile?.displayName ||
    user?.displayName ||
    profile?.email ||
    user?.email ||
    '';
  const canCreateCurrentResource = canUploadResource({ type: uploadType, user, profile });
  const screenTitle = isEditMode ? config.title.replace(/^Upload/, 'Edit') : config.title;
  const submitLabel = isEditMode ? 'Save changes' : config.submitLabel;
  const noun = uploadType === 'marketplace' ? 'products' : 'hostels';
  // question/note files can be up to 50 MB; listing photos 10 MB.
  const sizeLimit = uploadType === 'question' || uploadType === 'note' ? MAX_SIZE[uploadType] : MAX_SIZE.images;

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
    setTouched({});
  }, [config.defaultForm, config.key]);

  useEffect(() => {
    if (!uploadOwnerId || !isLimitRestricted) return;
    let cancelled = false;
    (async () => {
      try {
        const collectionName = uploadType === 'marketplace' ? 'studentMarketplace' : 'hostels';
        const count = await countUserUploads(collectionName, uploadOwnerId, 'userId');
        if (!cancelled) {
          setLimitInfo({ count, limit: uploadLimit, isFree: isFreeUser });
        }
      } catch {
        if (!cancelled) setLimitInfo({ count: 0, limit: uploadLimit, isFree: isFreeUser });
      }
    })();
    return () => { cancelled = true; };
  }, [isFreeUser, isLimitRestricted, uploadLimit, uploadOwnerId, uploadType]);

  useEffect(() => {
    if (!editId || !EDIT_COLLECTIONS[uploadType]) {
      setEditItem(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const record = await fetchRecord(EDIT_COLLECTIONS[uploadType], editId);
        if (!cancelled && record) {
          setEditItem(record);
          setForm({
            ...config.defaultForm,
            title: record.title || '',
            school: record.school || '',
            schoolId: record.schoolId || '',
            course: record.course || record.courseCode || '',
            courseCode: record.courseCode || record.course || '',
            year: record.year ? String(record.year) : '',
            examType: record.examType || '',
            semester: record.semester || '',
            department: record.department || record.dept || '',
            departmentId: record.departmentId || record.deptId || '',
            dept: record.dept || record.department || '',
            deptId: record.deptId || record.departmentId || '',
            level: record.level || '',
            lecturer: record.lecturer || '',
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
        if (!cancelled) setError('Could not load this item to edit.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config.defaultForm, editId, uploadType]);

  // Fields labelled "(optional)" are no longer treated as required for questions.
  const requiredFieldKeys = useMemo(() => {
    if (uploadType === 'note') return ['title', 'course', 'dept', 'school'];
    if (uploadType === 'marketplace') return ['title', 'category', 'condition', 'price', 'location', 'phone'];
    if (uploadType === 'hostel') return ['title', 'location', 'roomType', 'price', 'phone'];
    return config.fields.filter((f) => !/\(optional\)/i.test(f.label)).map((f) => f.key);
  }, [config.fields, uploadType]);

  const existingImages = useMemo(() => {
    if (!editItem) return [];
    return editItem.images || editItem.imageAssets?.map((a) => a.url || a.secure_url).filter(Boolean) || editItem.photos || [];
  }, [editItem]);

  const existingResourceAssets = useMemo(
    () => (RESOURCE_UPLOAD_TYPES.includes(uploadType) ? collectResourceAssets(editItem || {}) : []),
    [editItem, uploadType]
  );
  const canManageCurrentEdit = !isEditMode || !RESOURCE_UPLOAD_TYPES.includes(uploadType) || canManageResource({ type: uploadType, item: editItem, user, profile });

  const missingFieldKeys = useMemo(() => requiredFieldKeys.filter((key) => !String(form[key] || '').trim()), [form, requiredFieldKeys]);
  const hasExistingAssets = existingImages.length > 0 || existingResourceAssets.length > 0;
  const filesMissing =
    uploadType === 'note'
      ? attachments.length !== 1 && !(isEditMode && hasExistingAssets)
      : attachments.length === 0 && !(isEditMode && hasExistingAssets);

  const missingItems = useMemo(() => {
    const items = missingFieldKeys.map((key) => {
      const field = config.fields.find((f) => f.key === key);
      return `Fill in ${field ? field.label.replace(/\s*\(.*?\)\s*/g, '').toLowerCase() : 'required fields'}`;
    });
    if (filesMissing) {
      items.push(uploadType === 'note' ? 'Attach exactly one PDF' : uploadType === 'question' ? 'Attach at least one file' : 'Add at least one photo');
    }
    return items;
  }, [config.fields, filesMissing, missingFieldKeys, uploadType]);

  const validation = missingItems.length === 0;
  const normalizedPrice = Number(String(form.price || '').replace(/[^\d.]/g, ''));
  const hasValidPrice = !['marketplace', 'hostel'].includes(uploadType) || (Number.isFinite(normalizedPrice) && normalizedPrice > 0);
  const hasValidYear = uploadType !== 'question' || !form.year || /^\d{4}$/.test(String(form.year).trim());
  const canUploadMore = !isLimitRestricted || isEditMode || (limitInfo?.count ?? 0) < uploadLimit;
  const uploadReady = validation && hasValidPrice && hasValidYear && canUploadMore && canCreateCurrentResource && canManageCurrentEdit;
  const primaryAttachment = attachments[0] || null;
  const previewSource = previewItem || primaryAttachment;
  const isGridKind = config.fileKind === 'images';

  const totalSteps = requiredFieldKeys.length + 1;
  const doneSteps = requiredFieldKeys.length - missingFieldKeys.length + (filesMissing ? 0 : 1);
  const completion = (doneSteps / totalSteps) * 100;
  const detailsDone = missingFieldKeys.length === 0 && hasValidPrice && hasValidYear;
  const filesDone = !filesMissing;

  const overallPercent = attachments.length
    ? Math.round(attachments.reduce((sum, item) => sum + (progress[item.id] || 0), 0) / attachments.length)
    : 0;
  const uploadedCount = attachments.filter((item) => (progress[item.id] || 0) >= 100).length;

  const scrollToStep = (key) => {
    if (key === 'publish') {
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, (sectionY.current[key] || 0) - 8), animated: true });
  };

  const ensureValidFiles = (fileList) => {
    for (const item of fileList) {
      if (item.size > sizeLimit) {
        throw new Error(`${item.name} is larger than ${formatSize(sizeLimit)}. Choose a smaller file.`);
      }
    }
  };

  const normalizeAttachment = (asset) => ({
    id: makeId(),
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

  // Attachments are tracked by id, so two files with the same name no longer clash.
  const removeAttachment = (id) => {
    setAttachments((current) => current.filter((item) => item.id !== id));
    setProgress((current) => {
      const next = { ...current };
      delete next[id];
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
    const onProgress = (percent) => {
      setProgress((current) => ({ ...current, [file.id]: Math.round(percent) }));
    };

    if (uploadType === 'hostel' || uploadType === 'marketplace') {
      return uploadFeatureMedia(file, {
        feature: uploadType === 'hostel' ? 'hostels' : 'marketplace',
        resourceType: 'image',
        onProgress,
      });
    }

    return uploadFeatureMedia(file, {
      feature: 'resources',
      resourceType: 'auto',
      onProgress,
    });
  };

  const buildPayload = (uploadedAttachments) => {
    if (uploadType === 'note') {
      const uploaded = uploadedAttachments[0];
      const payload = {
        title: form.title.trim(),
        course: form.course.trim(),
        dept: form.dept.trim(),
        school: form.school.trim(),
        level: form.level || '',
        lecturer: form.lecturer.trim(),
        description: form.description.trim(),
        schoolId: form.schoolId || '',
        departmentId: form.deptId || form.departmentId || '',
        postedBy,
      };
      if (uploaded) {
        return {
          ...payload,
          fileUrl: uploaded.url || '',
          downloadUrl: uploaded.url || '',
          previewUrl: uploaded.url || '',
          fileName: uploaded.name || '',
          fileSize: uploaded.size || 0,
          files: uploadedAttachments,
          fileAsset: {
            url: uploaded.url || '',
            publicId: uploaded.publicId || '',
            resourceType: uploaded.resourceType || 'raw',
            provider: 'r2',
          },
        };
      }
      return payload;
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
        sellerName: postedBy,
        ownerName: postedBy,
        postedBy,
        status: 'pending',
        verified: premiumActive,
        premiumUser: premiumActive,
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
        ownerName: postedBy,
        sellerName: postedBy,
        postedBy,
        status: 'pending',
        verified: premiumActive,
        premiumUser: premiumActive,
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

    const firstUploaded = uploadedAttachments[0];
    const questionPayload = {
      ...form,
    };
    if (uploadedAttachments.length) {
      questionPayload.files = uploadedAttachments;
      questionPayload.fileUrl = firstUploaded?.url || '';
      questionPayload.previewUrl = firstUploaded?.url || '';
      questionPayload.fileName = firstUploaded?.name || '';
    }
    return questionPayload;
  };

  const submitToDatabase = async (payload) => {
    if (uploadType === 'note') {
      if (isEditMode && editId) {
        return updateNote(editId, payload);
      }
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

    if (isEditMode && editId) {
      return updateQuestion(editId, payload);
    }
    return createQuestion(payload);
  };

  const handleUpload = async () => {
    Keyboard.dismiss();

    if (!uploadOwnerId) {
      setError('Please login first.');
      return;
    }

    if (!canCreateCurrentResource) {
      setError('Please sign in before uploading a resource.');
      return;
    }

    if (!canManageCurrentEdit) {
      setError(uploadType === 'question' ? 'Only admins can edit past questions.' : 'You can only edit notes you uploaded.');
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

    if (isLimitRestricted && !isEditMode && !canUploadMore) {
      setError(
        premiumActive
          ? `Premium users can upload up to ${uploadLimit} ${noun}.`
          : `Free users can upload up to ${uploadLimit} ${noun}. Upgrade to Premium for up to ${COMMERCE_UPLOAD_LIMITS.premium}.`
      );
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    const uploadedAttachments = [];

    try {
      if (RESOURCE_UPLOAD_TYPES.includes(uploadType)) {
        const duplicateCheck = await postJson('/api/resources/check-duplicate', {
          type: uploadType,
          details: uploadType === 'note'
            ? {
                title: form.title,
                course: form.course,
                school: form.school,
                schoolId: form.schoolId,
                department: form.dept,
                departmentId: form.deptId,
                level: form.level,
              }
            : {
                courseCode: form.courseCode,
                school: form.school,
                schoolId: form.schoolId,
                year: form.year,
                examType: form.examType,
                semester: form.semester,
                department: form.department,
                departmentId: form.departmentId,
                level: form.level,
              },
          excludeId: isEditMode ? editId : undefined,
        });

        if (duplicateCheck.duplicate) {
          const matched = duplicateCheck.match || {};
          const matchedDetails = [
            matched.school,
            matched.year,
          ].filter(Boolean).join(' · ');
          setError(
            `A matching ${uploadType === 'note' ? 'lecture note' : 'past question'} already exists${matched.title ? ` (“${matched.title}”)` : ''}${matchedDetails ? ` for ${matchedDetails}` : ''}. Check the Resources library before uploading another copy.`
          );
          return;
        }
      }

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
        const processed = await postJson('/api/past-questions/process', {
          ...payload,
          courseCode: form.courseCode?.trim() || payload.courseCode || '',
          courseTitle: payload.title || form.title?.trim() || '',
          department: form.department?.trim() || payload.department || '',
          institution: form.school?.trim() || payload.school || '',
          institutionId: form.schoolId || '',
          departmentId: form.departmentId || '',
          level: form.level || '',
          session: form.semester?.trim() || payload.semester || '',
          year: form.year ? Number(String(form.year).trim()) : undefined,
          examType: form.examType?.trim() || payload.examType || 'Examination',
          title: form.title?.trim() || payload.title || 'Past Question',
          originalFile: {
            url: uploadedAttachments[0]?.url || '',
            publicId: uploadedAttachments[0]?.publicId || '',
            fileName: uploadedAttachments[0]?.name || payload.fileName || 'paper.pdf',
          },
          rawText: '',
          questions: [],
          createdBy: uploadOwnerId,
          status: 'draft',
          userId: uploadOwnerId,
          userEmail: profile?.email || user?.email || '',
        });

        const draft = processed?.draft || processed?.item || {};
        await postJson('/api/past-questions', draft);
        setMessage('Past question draft created successfully. Review and publish from the structured question record.');
        setForm(config.defaultForm);
        setAttachments([]);
        setProgress({});
        setPreviewItem(null);
        router.replace(config.routeAfter);
        return;
      }

      if (uploadType === 'note') {
        payload.uploadedBy = uploadOwnerId;
        payload.userId = uploadOwnerId;
        payload.userEmail = profile?.email || user?.email || '';
      }

      await submitToDatabase(payload);

      if (isEditMode && RESOURCE_UPLOAD_TYPES.includes(uploadType) && uploadedAttachments.length) {
        const newAssetKeys = new Set(uploadedAttachments.map(assetIdentity).filter(Boolean));
        const replacedAssets = existingResourceAssets.filter((asset) => !newAssetKeys.has(assetIdentity(asset)));
        if (replacedAssets.length) {
          try {
            await deleteCloudinaryAssets({ assets: replacedAssets });
          } catch (cleanupError) {
            setError(cleanupError?.message || 'Resource updated, but the old Cloudinary file could not be removed.');
            return;
          }
        }
      }

      const bareTitle = config.title.replace(/^Upload\s*/, '');
      setMessage(isEditMode ? `${bareTitle} updated.` : config.successMessage);
      setForm(config.defaultForm);
      setAttachments([]);
      setProgress({});
      setPreviewItem(null);
      router.replace(config.routeAfter);
    } catch (submitError) {
      if (uploadedAttachments.length) {
        await deleteCloudinaryAssets({ assets: uploadedAttachments }).catch(() => {});
      }
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

  const fieldValue = (field) => form[field.key];
  const setTextValue = (key, value) => {
    let next = value;
    if (key === 'year') next = value.replace(/[^0-9]/g, '').slice(0, 4);
    if (key === 'price') next = value.replace(/[^0-9.]/g, '');
    if (key === 'phone') next = value.replace(/[^0-9+\s-]/g, '');
    setForm((current) => ({ ...current, [key]: next }));
  };

  const fieldError = (field) => {
    if (!touched[field.key]) return '';
    const value = String(form[field.key] || '').trim();
    if (field.key === 'price' && value && !(normalizedPrice > 0)) return 'Enter an amount greater than zero.';
    if (field.key === 'year' && value && !/^\d{4}$/.test(value)) return 'Use four digits, for example 2024.';
    if (requiredFieldKeys.includes(field.key) && !value && field.type === 'text') return 'This field is required.';
    return '';
  };

  const fieldHint = (field) => {
    if (field.key === 'price' && normalizedPrice > 0) return `Buyers will see ₦${normalizedPrice.toLocaleString()}`;
    if (field.key === 'phone' && isLimitRestricted) return 'Shown to interested students so they can reach you.';
    return '';
  };

  const renderField = (field) => {
    const required = requiredFieldKeys.includes(field.key);
    const wrapProps = { label: field.label.replace(/\s*\(optional\)/i, ''), required, styles };

    if (field.type === 'school') {
      const schoolValue = form.schoolId || form.school || '';
      return (
        <FieldWrap key={field.key} {...wrapProps}>
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
        </FieldWrap>
      );
    }

    if (field.type === 'department') {
      const deptValue = form.departmentId || form.deptId || '';
      return (
        <FieldWrap key={field.key} {...wrapProps}>
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
        </FieldWrap>
      );
    }

    if (field.type === 'level') {
      const levelData = ACADEMIC_LEVELS.map((l, i) => ({ id: `level-${i}`, name: l.label, value: l.value }));
      const levelIndex = ACADEMIC_LEVELS.findIndex((l) => l.value === form.level);
      const levelValue = levelIndex >= 0 ? `level-${levelIndex}` : '';
      return (
        <FieldWrap key={field.key} {...wrapProps}>
          <SearchableDropdown
            label=""
            placeholder={field.placeholder}
            data={levelData}
            value={levelValue}
            onSelect={(item) => handleLevelSelect({ value: item.value })}
            icon={field.icon}
            renderItemLabel={(i) => i.name}
          />
        </FieldWrap>
      );
    }

    if (field.type === 'select') {
      const optionData = field.options.map((opt, i) => ({ id: `${field.key}-${i}`, name: opt, value: opt }));
      const currentIndex = field.options.indexOf(form[field.key]);
      const selectValue = currentIndex >= 0 ? `${field.key}-${currentIndex}` : '';
      return (
        <FieldWrap key={field.key} {...wrapProps}>
          <SearchableDropdown
            label=""
            placeholder={field.placeholder}
            data={optionData}
            value={selectValue}
            onSelect={(item) => handleSelectField(field.key, item.value)}
            icon={field.icon}
            renderItemLabel={(i) => i.name}
          />
        </FieldWrap>
      );
    }

    if (field.type === 'chips') {
      const selected = String(form[field.key] || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      return (
        <FieldWrap key={field.key} {...wrapProps} counter={selected.length ? `${selected.length} selected` : ''}>
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
        </FieldWrap>
      );
    }

    const focused = focusedField === field.key;
    const error = fieldError(field);
    const isDescription = field.key === 'description';
    const value = fieldValue(field) || '';
    return (
      <FieldWrap
        key={field.key}
        {...wrapProps}
        error={error}
        hint={fieldHint(field)}
        counter={isDescription ? `${value.length}/${DESCRIPTION_MAX}` : ''}
      >
        <View
          style={[
            styles.inputWrap,
            field.multiline && styles.inputWrapMultiline,
            focused && styles.inputWrapFocused,
            Boolean(error) && styles.inputWrapError,
          ]}
        >
          {field.key === 'price' ? (
            <Text style={[styles.currencyPrefix, focused && { color: colors.brand }]}>₦</Text>
          ) : (
            <Ionicons name={field.icon} size={17} color={error ? colors.danger : focused ? colors.brand : colors.textTertiary} />
          )}
          <TextInput
            value={value}
            onChangeText={(next) => setTextValue(field.key, next)}
            onFocus={() => setFocusedField(field.key)}
            onBlur={() => {
              setFocusedField(null);
              setTouched((current) => ({ ...current, [field.key]: true }));
            }}
            placeholder={field.placeholder}
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, field.multiline && styles.textArea]}
            multiline={Boolean(field.multiline)}
            maxLength={isDescription ? DESCRIPTION_MAX : field.key === 'phone' ? 16 : undefined}
            keyboardType={field.key === 'price' ? 'decimal-pad' : field.key === 'phone' ? 'phone-pad' : field.key === 'year' ? 'number-pad' : 'default'}
            returnKeyType={field.multiline ? 'default' : 'next'}
            accessibilityLabel={field.label}
          />
          {value && !field.multiline ? (
            <Pressable onPress={() => setTextValue(field.key, '')} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Clear ${field.label}`}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </FieldWrap>
    );
  };

  const previewImage = primaryAttachment?.uri || existingImages[0] || null;
  const previewChips = [form.category, form.condition, form.roomType, form.availability].filter(Boolean);
  const showListingPreview = isLimitRestricted && (form.title || normalizedPrice > 0 || previewImage || form.location);

  const steps = [
    { key: 'details', label: 'Details', done: detailsDone },
    { key: 'files', label: uploadType === 'question' || uploadType === 'note' ? 'File' : 'Photos', done: filesDone },
    { key: 'publish', label: isEditMode ? 'Save' : 'Publish', done: uploadReady },
  ];

  const bannerText = error || message;
  const bannerIsError = Boolean(error);
  const helperText = !canCreateCurrentResource
    ? 'Sign in to upload resources'
    : !canManageCurrentEdit
      ? 'You do not have permission to edit this resource'
      : !canUploadMore
        ? 'You have reached your upload limit'
        : missingItems[0]
          ? `${missingItems[0]}${missingItems.length > 1 ? ` (+${missingItems.length - 1} more)` : ''}`
          : !hasValidPrice
            ? 'Enter a valid price greater than zero'
            : !hasValidYear
              ? 'Use a four-digit year'
              : '';

  return (
    <ScreenShell title={screenTitle} subtitle={config.subtitle} showBack scrollable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.column}>
            {isLimitRestricted && !isEditMode && limitInfo ? (
              <UsageMeter count={limitInfo.count} limit={uploadLimit} premium={premiumActive} noun={noun} styles={styles} colors={colors} />
            ) : null}

            <ProgressHeader percent={completion} steps={steps} onStepPress={scrollToStep} isEdit={isEditMode} styles={styles} colors={colors} />

            <View style={styles.card} onLayout={(e) => { sectionY.current.details = e.nativeEvent.layout.y; }}>
              <SectionHeader step="1" done={detailsDone} icon={config.cardIcon} title={config.cardTitle} subtitle="Fields marked * are required" styles={styles} colors={colors} />
              {config.fields.map((field) => renderField(field))}
            </View>

            {isEditMode && existingImages.length > 0 ? (
              <View style={styles.card}>
                <SectionHeader icon="images-outline" title="Current photos" subtitle="Already live on this listing" styles={styles} colors={colors} />
                <View style={styles.grid}>
                  {existingImages.map((url, index) => (
                    <View key={`${url}-${index}`} style={styles.gridTile}>
                      <Image source={{ uri: url }} style={styles.gridImage} contentFit="cover" cachePolicy="disk" />
                      {index === 0 ? (
                        <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>Cover</Text></View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {isEditMode && existingResourceAssets.length > 0 ? (
              <View style={styles.card}>
                <SectionHeader
                  icon="document-attach-outline"
                  title="Current file"
                  subtitle="Upload a replacement only when you want to change the file"
                  styles={styles}
                  colors={colors}
                />
                <View style={styles.attachmentList}>
                  {existingResourceAssets.map((asset, index) => (
                    <View key={`${assetIdentity(asset)}-${index}`} style={styles.attachmentItem}>
                      <View style={[styles.attachmentThumbPlaceholder, { backgroundColor: colors.brandLight }]}>
                        <Ionicons name="document-text-outline" size={20} color={colors.brand} />
                      </View>
                      <View style={styles.attachmentMeta}>
                        <Text style={styles.attachmentName} numberOfLines={1}>{asset.name || form.title || 'Attached resource'}</Text>
                        <Text style={styles.attachmentSize} numberOfLines={1}>{asset.resourceType || 'raw'} file</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.card} onLayout={(e) => { sectionY.current.files = e.nativeEvent.layout.y; }}>
              <SectionHeader
                step="2"
                done={filesDone}
                icon="images-outline"
                title={isEditMode && hasExistingAssets ? 'Replacement files' : config.attachmentLabel}
                subtitle={
                  isEditMode && hasExistingAssets
                    ? 'Optional. Add files only to replace the current ones'
                    : attachments.length
                      ? `${attachments.length} selected`
                      : config.uploadHint
                }
                trailing={
                  attachments.length > 0 && !uploading ? (
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
                  style={({ pressed }) => [styles.dropZone, pressed && styles.dropZonePressed]}
                  accessibilityRole="button"
                  accessibilityLabel={config.dropHint}
                >
                  <View style={styles.dropIconWrap}>
                    <Ionicons name={isGridKind ? 'camera-outline' : 'cloud-upload-outline'} size={26} color={colors.brand} />
                  </View>
                  <Text style={styles.dropTitle}>{config.dropHint}</Text>
                  <Text style={styles.dropSubtitle}>Up to {formatSize(sizeLimit)} each</Text>
                  <View style={styles.formatRow}>
                    {config.formats.map((format) => (
                      <View key={format} style={styles.formatChip}>
                        <Text style={styles.formatChipText}>{format}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              ) : isGridKind ? (
                <View style={styles.grid}>
                  {attachments.map((item, index) => {
                    const percent = progress[item.id] || 0;
                    const done = percent >= 100;
                    return (
                      <Pressable
                        key={item.id}
                        style={styles.gridTile}
                        onPress={() => openPreview(item)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={`Preview ${item.name}`}
                      >
                        <Image source={{ uri: item.uri }} style={styles.gridImage} contentFit="cover" cachePolicy="disk" />
                        {index === 0 ? (
                          <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>Cover</Text></View>
                        ) : null}
                        {uploading && percent > 0 && !done ? (
                          <View style={styles.gridProgressOverlay}>
                            <View style={styles.gridProgressTrack}>
                              <View style={[styles.gridProgressFill, { width: `${percent}%` }]} />
                            </View>
                            <Text style={styles.gridProgressText}>{percent}%</Text>
                          </View>
                        ) : null}
                        {done ? (
                          <View style={styles.gridDone}><Ionicons name="checkmark" size={13} color="#FFFFFF" /></View>
                        ) : null}
                        {!uploading ? (
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation?.();
                              removeAttachment(item.id);
                            }}
                            hitSlop={8}
                            style={styles.gridRemove}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${item.name}`}
                          >
                            <Ionicons name="close" size={13} color="#FFFFFF" />
                          </Pressable>
                        ) : null}
                      </Pressable>
                    );
                  })}
                  {config.multiple && !uploading ? (
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
                    const percent = progress[item.id] || 0;
                    const badge = fileBadge(item.mimeType, item.name, colors);
                    const done = percent >= 100;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => openPreview(item)}
                        style={styles.attachmentItem}
                        accessibilityRole="button"
                        accessibilityLabel={`Preview ${item.name}`}
                      >
                        <View style={[styles.attachmentThumbPlaceholder, { backgroundColor: `${badge.color}14` }]}>
                          <Ionicons name={badge.icon} size={20} color={badge.color} />
                        </View>

                        <View style={styles.attachmentMeta}>
                          <Text style={styles.attachmentName} numberOfLines={1}>{item.name}</Text>
                          <View style={styles.attachmentMetaRow}>
                            <View style={[styles.typeChip, { backgroundColor: `${badge.color}14` }]}>
                              <Text style={[styles.typeChipText, { color: badge.color }]}>{badge.label}</Text>
                            </View>
                            <Text style={styles.attachmentSize}>{formatSize(item.size)}</Text>
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

                        {done ? (
                          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                        ) : !uploading ? (
                          <Pressable
                            onPress={() => removeAttachment(item.id)}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${item.name}`}
                          >
                            <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                          </Pressable>
                        ) : null}
                      </Pressable>
                    );
                  })}

                  {config.multiple && !uploading ? (
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

            {showListingPreview ? (
              <View style={styles.card}>
                <SectionHeader icon="eye-outline" title="How it will look" subtitle="A quick preview of your listing card" styles={styles} colors={colors} />
                <ListingPreviewCard
                  kind={uploadType}
                  image={previewImage}
                  title={form.title.trim()}
                  price={normalizedPrice > 0 ? normalizedPrice : 0}
                  location={form.location.trim()}
                  chips={previewChips}
                  styles={styles}
                  colors={colors}
                />
              </View>
            ) : null}

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
                  <Text style={styles.previewFallbackTitle} numberOfLines={2}>{previewSource.name}</Text>
                  <Text style={styles.previewFallbackText}>Tap to open a larger preview</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerInner}>
            {bannerText ? (
              <View style={[styles.banner, bannerIsError ? styles.bannerError : styles.bannerSuccess]} accessibilityLiveRegion="polite">
                <Ionicons name={bannerIsError ? 'alert-circle' : 'checkmark-circle'} size={18} color={bannerIsError ? colors.danger : colors.success} />
                <Text style={[styles.bannerText, { color: bannerIsError ? colors.danger : colors.success }]}>{bannerText}</Text>
                {bannerIsError ? (
                  <Pressable onPress={() => setError('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss error">
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {uploading ? (
              <View style={styles.uploadStatus}>
                <View style={styles.uploadStatusTop}>
                  <Text style={styles.helperText}>
                    {overallPercent >= 100
                      ? 'Finishing up…'
                      : attachments.length > 1
                        ? `Uploading file ${Math.min(uploadedCount + 1, attachments.length)} of ${attachments.length}`
                        : 'Uploading'}
                  </Text>
                  <Text style={styles.helperText}>{overallPercent}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${overallPercent}%` }]} />
                </View>
              </View>
            ) : !uploadReady && helperText ? (
              <Pressable
                style={styles.helperRow}
                onPress={() => scrollToStep(filesMissing && missingFieldKeys.length === 0 ? 'files' : 'details')}
                accessibilityRole="button"
                accessibilityLabel={`${helperText}. Tap to go there`}
              >
                <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.helperText}>{helperText}</Text>
              </Pressable>
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
              accessibilityState={{ disabled: uploading || !uploadReady, busy: uploading }}
              accessibilityLabel={submitLabel}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.submitText}>{isEditMode ? 'Saving…' : 'Uploading…'}</Text>
                </>
              ) : (
                <>
                  <Ionicons name={isEditMode ? 'checkmark-circle-outline' : 'cloud-upload-outline'} size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>{submitLabel}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{config.attachmentLabel}</Text>
                <Text style={styles.sheetSubtitle}>
                  {config.formats.join(', ')} · up to {formatSize(sizeLimit)} each
                </Text>
              </View>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Pressable style={styles.sheetButton} onPress={pickAttachments} accessibilityRole="button" accessibilityLabel="Choose files">
              <Ionicons name="folder-open-outline" size={18} color={colors.brand} />
              <Text style={styles.sheetButtonText}>{config.multiple ? 'Choose files' : 'Choose a file'}</Text>
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
                <Text style={styles.sheetTitle} numberOfLines={1}>{previewItem?.name || 'Preview'}</Text>
                <Text style={styles.sheetSubtitle}>
                  {previewItem?.mimeType || 'Selected file'} · {formatSize(previewItem?.size || 0)}
                </Text>
              </View>
              <Pressable onPress={() => setPreviewItem(null)} hitSlop={10} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel="Close preview">
                <Ionicons name="close" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>

            {previewItem && isImageMime(previewItem.mimeType) ? (
              <Image source={{ uri: previewItem.uri }} style={styles.previewModalImage} contentFit="contain" cachePolicy="disk" />
            ) : previewItem?.uri ? (
              <View style={styles.previewFallback}>
                <Ionicons name="document-text-outline" size={30} color={colors.brand} />
                <Text style={styles.previewFallbackTitle}>{previewItem.name}</Text>
                <Text style={styles.previewFallbackText}>Your file is ready. Publish when the details look right.</Text>
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

            {previewItem && !uploading ? (
              <Pressable
                style={styles.sheetButtonDanger}
                onPress={() => {
                  removeAttachment(previewItem.id);
                  setPreviewItem(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Remove this file"
              >
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
                <Text style={styles.sheetButtonDangerText}>Remove file</Text>
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
    paddingBottom: SPACE.xxl + 40,
  },
  column: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: SPACE.lg,
  },

  /* Usage meter */
  usageCard: {
    backgroundColor: colors.brandLight,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: RADIUS.xl,
    padding: SPACE.md,
    gap: SPACE.md,
  },
  usageCardFull: { backgroundColor: colors.dangerLight, borderColor: colors.dangerBorder },
  usageTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usageIcon: { width: 34, height: 34, borderRadius: RADIUS.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  usageTitle: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  usageText: { marginTop: 2, fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  usageTrack: { height: 6, borderRadius: RADIUS.pill, backgroundColor: colors.surface, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: colors.brand },

  /* Progress header */
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: SPACE.lg,
    gap: SPACE.md,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  progressPercent: { fontSize: 14, fontWeight: '800', color: colors.brand },
  progressBarTrack: { height: 8, borderRadius: RADIUS.pill, backgroundColor: colors.brandLight, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: colors.brand },
  stepRow: { flexDirection: 'row', gap: SPACE.sm },
  stepPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  stepPillDone: { backgroundColor: colors.greenLight, borderColor: colors.success },
  stepDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.borderDefault },
  stepDotDone: { backgroundColor: colors.success },
  stepDotText: { fontSize: 10.5, fontWeight: '800', color: colors.textSecondary },
  stepLabel: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
  stepLabelDone: { color: colors.success },

  /* Cards & sections */
  card: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: SPACE.lg,
    gap: SPACE.lg,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandLight,
  },
  sectionIconDone: { backgroundColor: colors.success },
  sectionStep: { fontSize: 13, fontWeight: '900', color: colors.brand },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  cardSubtitle: { marginTop: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  clearText: { color: colors.danger, fontSize: 12.5, fontWeight: '700' },

  /* Fields */
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  required: { color: colors.danger, fontWeight: '800' },
  counter: { fontSize: 11.5, fontWeight: '700', color: colors.textTertiary },
  fieldHint: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  fieldMessageRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fieldErrorText: { fontSize: 12, fontWeight: '600', color: colors.danger },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  chipSelected: { borderColor: colors.brand, backgroundColor: colors.brand },
  chipText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
  chipTextSelected: { color: '#FFFFFF' },
  currencyPrefix: { fontSize: 15, fontWeight: '800', color: colors.textTertiary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    borderRadius: RADIUS.md,
    backgroundColor: colors.background,
    paddingHorizontal: SPACE.md,
    minHeight: 50,
  },
  inputWrapMultiline: { alignItems: 'flex-start', paddingVertical: SPACE.md },
  inputWrapFocused: { borderColor: colors.brand, backgroundColor: colors.surface },
  inputWrapError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  input: { flex: 1, fontSize: 14.5, color: colors.textPrimary, paddingVertical: 10 },
  textArea: { minHeight: 84, textAlignVertical: 'top', paddingTop: 2, paddingVertical: 0 },

  /* Drop zone */
  dropZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.brandLight,
    paddingVertical: SPACE.xxl,
    paddingHorizontal: SPACE.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dropZonePressed: { opacity: 0.85 },
  dropIconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: 6,
  },
  dropTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  dropSubtitle: { color: colors.textSecondary, fontSize: 12.5, textAlign: 'center' },
  formatRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 },
  formatChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: colors.surface },
  formatChipText: { fontSize: 11, fontWeight: '800', color: colors.brand },

  /* Photo grid */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  gridTile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  gridImage: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  coverBadgeText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' },
  gridRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  gridDone: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  gridProgressOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 6,
    gap: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  gridProgressTrack: { width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  gridProgressFill: { height: '100%', backgroundColor: '#FFFFFF' },
  gridProgressText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  gridAddTile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.brandLight,
  },
  gridAddText: { fontSize: 11, fontWeight: '700', color: colors.brand },

  /* File list */
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
  attachmentThumbPlaceholder: { width: 46, height: 46, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  attachmentMeta: { flex: 1, gap: 5 },
  attachmentName: { fontSize: 13.5, fontWeight: '700', color: colors.textPrimary },
  attachmentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChip: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  typeChipText: { fontSize: 10.5, fontWeight: '800' },
  attachmentSize: { fontSize: 11.5, color: colors.textSecondary },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: RADIUS.pill, backgroundColor: colors.borderDefault, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.pill, backgroundColor: colors.success },
  progressText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderDefault,
  },
  addMoreText: { color: colors.brand, fontSize: 13, fontWeight: '700' },

  /* Previews */
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
  previewFallbackTitle: { fontSize: 13.5, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  previewFallbackText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  listingPreview: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.background,
  },
  listingPreviewImageWrap: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.brandLight },
  listingPreviewImage: { width: '100%', height: '100%' },
  listingPreviewEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listingPreviewTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  listingPreviewTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  listingPreviewBody: { padding: SPACE.md, gap: 4 },
  listingPreviewTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  listingPreviewPrice: { fontSize: 17, fontWeight: '900', color: colors.brand },
  listingPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listingPreviewMeta: { flex: 1, fontSize: 12.5, color: colors.textSecondary },
  listingPreviewChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  listingPreviewChip: { maxWidth: '100%', paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: colors.brandLight },
  listingPreviewChipText: { fontSize: 11, fontWeight: '700', color: colors.brand },

  /* Footer */
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
    paddingBottom: SPACE.lg,
  },
  footerInner: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: SPACE.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACE.md,
  },
  bannerError: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerLight },
  bannerSuccess: { borderColor: colors.success, backgroundColor: colors.greenLight },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  uploadStatus: { gap: 6 },
  uploadStatusTop: { flexDirection: 'row', justifyContent: 'space-between' },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 2 },
  helperText: { fontSize: 12.5, color: colors.textSecondary, fontWeight: '600' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.brand,
  },
  submitButtonPressed: { backgroundColor: colors.brandDark },
  submitButtonDisabled: { backgroundColor: colors.textTertiary },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  /* Modals */
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end', padding: SPACE.md },
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: RADIUS.xl,
    backgroundColor: colors.surface,
    padding: SPACE.lg,
    gap: SPACE.md,
  },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: RADIUS.pill, backgroundColor: colors.borderDefault, marginBottom: 2 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACE.md },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  sheetSubtitle: { marginTop: 2, fontSize: 12.5, color: colors.textSecondary },
  sheetClose: { width: 30, height: 30, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: RADIUS.md,
    backgroundColor: colors.brandLight,
  },
  sheetButtonText: { color: colors.brand, fontSize: 14, fontWeight: '800' },
  sheetButtonSecondary: { alignItems: 'center', justifyContent: 'center', minHeight: 50, borderRadius: RADIUS.md, backgroundColor: colors.background },
  sheetButtonSecondaryText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  sheetButtonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: RADIUS.md,
    backgroundColor: colors.dangerLight,
  },
  sheetButtonDangerText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  previewModal: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: RADIUS.xl,
    backgroundColor: colors.surface,
    padding: SPACE.lg,
    gap: SPACE.md,
    maxHeight: '90%',
  },
  previewModalImage: { height: 320, width: '100%', borderRadius: RADIUS.lg, backgroundColor: colors.background },
});