import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Linking, Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../../src/shared/components/ScreenShell';
import { deleteNote, deleteQuestion, fetchDetailRecord } from '../../../services/firestoreSync';
import { COLLECTIONS } from '../../../src/shared/firestoreSchema';
import { resolveDocumentAsset, formatDocumentMeta } from '../../../src/shared/utils/documentMedia';
import { isPreviewImageUrl } from '../../../src/shared/services/cloudinary';
import { useAuth } from '../../../context/AuthContext';
import { startConversation, sendDirectMessage } from '../../../src/shared/services/community';
import { getUserProfileById } from '../../../src/shared/services/friendships';
import { useTheme } from '../../../src/shared/theme/ThemeContext';
import { canManageResource } from '../../../src/shared/auth/resourcePermissions';
import { getDownloadRecord, saveResourceForOffline } from '../../../src/shared/offline/offlineLearningService';
import { getApiUrl } from '../../../src/shared/services/backend';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCREEN_PADDING = 18;
const GALLERY_GAP = 4;
// Single source of truth for gallery paging math, so the slide width,
// snapToInterval, and scroll-index calculation can never drift apart.
const GALLERY_SLIDE_WIDTH = SCREEN_WIDTH - 2 * SCREEN_PADDING;
const GALLERY_STEP = GALLERY_SLIDE_WIDTH + GALLERY_GAP;

const collectionMap = {
  announcement: COLLECTIONS.announcements,
  note: COLLECTIONS.notes,
  question: COLLECTIONS.questions,
  group: COLLECTIONS.groups,
  story: COLLECTIONS.stories,
  hostel: COLLECTIONS.hostels,
  listing: COLLECTIONS.studentMarketplace,
  tutorial: COLLECTIONS.tutorials,
  studyMaterial: COLLECTIONS.studyMaterials,
  formula: COLLECTIONS.formulas,
};

// How each record type is labelled and accented in the UI.
const TYPE_META = {
  announcement: { label: 'Announcement', icon: 'megaphone' },
  note: { label: 'Note', icon: 'document-text' },
  question: { label: 'Past Question', icon: 'help-circle' },
  group: { label: 'Group', icon: 'people' },
  story: { label: 'Story', icon: 'book' },
  hostel: { label: 'Hostel', icon: 'home' },
  listing: { label: 'Marketplace listing', icon: 'pricetag' },
  tutorial: { label: 'Tutorial', icon: 'play-circle' },
  studyMaterial: { label: 'Study material', icon: 'library' },
  formula: { label: 'Formula sheet', icon: 'calculator' },
};

const pdfExportLockdownScript = `
  (function () {
    const hideSelectors = [
      '.download',
      '.print',
      '[aria-label*="Download"]',
      '[aria-label*="Print"]',
      '[title*="Download"]',
      '[title*="Print"]',
      '[data-l10n-id*="download"]',
      '[data-l10n-id*="print"]',
      '.toolbarButton',
      '.secondaryToolbarButton'
    ];

    const removeToolbarButtons = () => {
      document.querySelectorAll(hideSelectors.join(',')).forEach((element) => {
        const text = (element.textContent || '').toLowerCase();
        if (text.includes('download') || text.includes('print') || text.includes('save')) {
          element.remove();
          return;
        }

        const label = (element.getAttribute('aria-label') || '').toLowerCase();
        const title = (element.getAttribute('title') || '').toLowerCase();
        if (label.includes('download') || label.includes('print') || title.includes('download') || title.includes('print')) {
          element.remove();
        }
      });

      const viewer = document.querySelector('#mainContainer');
      if (viewer) {
        viewer.style.setProperty('user-select', 'none', 'important');
        viewer.style.setProperty('-webkit-user-select', 'none', 'important');
      }
    };

    const blockPrint = () => {
      window.print = function () {};
      document.addEventListener('contextmenu', function (event) {
        event.preventDefault();
      }, { passive: false });
      document.addEventListener('copy', function (event) {
        event.preventDefault();
      }, { passive: false });
      document.addEventListener('keydown', function (event) {
        const isPrintShortcut = event.ctrlKey && (event.key === 'p' || event.key === 'P');
        if (isPrintShortcut) {
          event.preventDefault();
          event.stopPropagation();
        }
      }, { passive: false });
    };

    const style = document.createElement('style');
    style.innerHTML = [
      'html, body, #outerContainer, #mainContainer, #viewerContainer, .page {',
      '  user-select: none !important;',
      '  -webkit-user-select: none !important;',
      '  -webkit-touch-callout: none !important;',
      '}',
      '.download, .print, [aria-label*="Download"], [aria-label*="Print"],',
      '[title*="Download"], [title*="Print"],',
      '[data-l10n-id*="download"], [data-l10n-id*="print"] {',
      '  display: none !important;',
      '}'
    ].join(' ');
    document.head.appendChild(style);

    removeToolbarButtons();
    blockPrint();

    const observer = new MutationObserver(() => {
      removeToolbarButtons();
    });

    const target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
    }
  })();
  true;
`;

const formatDate = (value) => {
  if (!value) return '';
  const rawDate = typeof value === 'string' ? new Date(value) : value?.toDate ? value.toDate() : value;
  const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatNaira = (value) => {
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `₦${number.toLocaleString()}`;
};

// Normalizes a Nigerian-style phone number into wa.me's expected format
// (digits only, country code, no leading zero/plus).
const toWhatsAppNumber = (rawPhone) => {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits;
};

// expo-router's useLocalSearchParams returns string | string[] depending on
// how the route was navigated to (repeated query params come back as an
// array). Every other place in this file treats `type`/`id` as a plain
// string, so without this, a record opened via certain deep links could
// silently fail to load or crash on the collectionMap[type] lookup.
const normalizeParam = (value) => (Array.isArray(value) ? value[0] : value);

// Builds a type-aware list of {icon, label, value} fields from whatever
// the record actually has, instead of one fixed field list for every type.
const buildFields = (item, type) => {
  if (!item) return [];
  const fields = [];
  const seen = new Set();
  const add = (icon, label, value) => {
    if (value === undefined || value === null || value === '' || seen.has(label)) return;
    seen.add(label);
    fields.push({ icon, label, value: String(value) });
  };

  if (['note', 'question', 'studyMaterial'].includes(type)) {
    add('book-outline', 'Course', item.course);
    add('barcode-outline', 'Course code', item.courseCode);
    add('school-outline', 'School', item.school);
    add('layers-outline', 'Department', item.department || item.dept);
    add('ribbon-outline', 'Level', item.level);
    add('clipboard-outline', 'Exam type', item.examType);
    add('time-outline', 'Semester/session', item.semester || item.session);
    add('person-outline', 'Lecturer', item.lecturer);
    add('calendar-outline', 'Year', item.year ? String(item.year) : undefined);
  }

  if (type === 'group') {
    add('pricetag-outline', 'Category', item.category);
    add('lock-closed-outline', 'Privacy', item.privacy === 'private' ? 'Private' : 'Public');
    add('people-outline', 'Members', item.memberCount ? `${item.memberCount} members` : undefined);
  }

  if (type === 'story') {
    add('bookmark-outline', 'Genre', item.genre);
    add('person-outline', 'Author', item.authorName || item.author);
  }

  if (type === 'hostel') {
    add('location-outline', 'Location', item.location || item.address);
    add('bed-outline', 'Room type', item.roomType || item.type);
    add('walk-outline', 'Distance', item.distance);
    add('grid-outline', 'Amenities', Array.isArray(item.amenities) ? item.amenities.join(', ') : item.amenities);
    add('checkmark-circle-outline', 'Availability', item.availability);
    add('call-outline', 'Phone', item.phone || item.contactPhone);
  }

  if (type === 'listing') {
    add('pricetag-outline', 'Category', item.category);
    add('pricetag-outline', 'Condition', item.condition);
    add('person-outline', 'Seller', item.sellerName || item.ownerName);
    add('location-outline', 'Pickup location', item.location);
    add('checkmark-circle-outline', 'Availability', item.availability);
    add('call-outline', 'Phone', item.phone || item.contactPhone);
  }

  if (type === 'tutorial') {
    add('person-outline', 'Instructor', item.instructor || item.tutorName);
    add('time-outline', 'Duration', item.duration);
    add('bar-chart-outline', 'Level', item.level);
  }

  if (type === 'formula') {
    add('book-outline', 'Subject', item.subject);
  }

  if (type === 'announcement') {
    add('megaphone-outline', 'Audience', item.audience);
    add('person-outline', 'Posted by', item.postedBy || item.authorName);
    add('alert-circle-outline', 'Priority', item.urgent ? 'Urgent' : undefined);
  }

  const dateValue = formatDate(item.createdAt || item.postedAt || item.publishedAt);
  add('time-outline', type === 'announcement' ? 'Posted' : 'Added', dateValue);

  return fields;
};

export default function RecordViewPage() {
  const params = useLocalSearchParams();
  const type = normalizeParam(params.type);
  const id = normalizeParam(params.id);
  const router = useRouter();
  const { user, profile } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewError, setPdfPreviewError] = useState(false);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const [offlineRecord, setOfflineRecord] = useState(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [deletingResource, setDeletingResource] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const galleryRef = useRef(null);
  const lightboxRef = useRef(null);
  const previewFileRef = useRef(null);
  const lightboxInitialScrollRef = useRef(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const skeletonAnim = useRef(new Animated.Value(0.4)).current;
  const isMounted = useRef(true);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => () => { isMounted.current = false; }, []);

  useEffect(() => {
    if (!loading) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(skeletonAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [loading, skeletonAnim]);

  const asset = useMemo(() => resolveDocumentAsset(item || {}), [item]);
  const typeMeta = TYPE_META[type] || { label: 'Details', icon: 'document' };

  const ownerId =
    item?.ownerId ||
    item?.sellerId ||
    item?.userId ||
    item?.postedById ||
    item?.uploadedBy ||
    item?.creatorId ||
    item?.authorId ||
    item?.tutorId ||
    null;
  const ownerName =
    item?.sellerName ||
    item?.ownerName ||
    item?.postedBy ||
    item?.uploaderName ||
    item?.authorName ||
    item?.username ||
    item?.displayName ||
    item?.userName ||
    ownerProfile?.username ||
    ownerProfile?.fullName ||
    ownerProfile?.name ||
    ownerProfile?.displayName ||
    ownerProfile?.email ||
    item?.sellerEmail ||
    item?.ownerEmail ||
    (['listing', 'hostel'].includes(type) ? (type === 'hostel' ? 'Hostel uploader' : 'Marketplace uploader') : 'Uploader');
  const ownerEmail = item?.sellerEmail || item?.ownerEmail || ownerProfile?.email || '';
  const ownerPhoto = item?.sellerAvatar || item?.ownerAvatar || item?.sellerPhoto || ownerProfile?.photo || ownerProfile?.photoURL || null;
  const ownerPhone = item?.sellerPhone || item?.contactPhone || item?.phone || null;
  const whatsAppNumber = toWhatsAppNumber(ownerPhone);
  const canMessageInApp = Boolean(ownerId && user && ownerId !== user.uid);
  const canWhatsApp = Boolean(whatsAppNumber);
  const showContactCta = ['listing', 'hostel'].includes(type) && (canMessageInApp || canWhatsApp);
  const canManageCurrentResource =
    ['note', 'question'].includes(type) && canManageResource({ type, item, user, profile });
  const isCommerceType = ['listing', 'hostel'].includes(type);
  const isHostel = type === 'hostel';
  const premiumExpiry = profile?.subscriptionExpiresAt || profile?.premiumExpiresAt || profile?.expiresAt;
  const premiumExpiryDate = premiumExpiry?.toDate ? premiumExpiry.toDate() : premiumExpiry ? new Date(premiumExpiry) : null;
  const isPremiumUser = Boolean(
    profile?.premium &&
    profile?.subscriptionStatus !== 'expired' &&
    (!premiumExpiryDate || Number.isNaN(premiumExpiryDate.getTime()) || premiumExpiryDate.getTime() > Date.now())
  );
  // This is a UX gate only. The offline endpoint must remain the authority for
  // entitlement checks; client state can be stale or tampered with.
  const canSaveOffline = Boolean(
    asset?.hasDocumentUrl &&
    isPremiumUser &&
    ['note', 'question', 'studyMaterial'].includes(type)
  );

  const load = useCallback(async () => {
    const collectionName = collectionMap[type];
    if (!collectionName || !id) {
      if (isMounted.current) {
        setLoading(false);
        setLoadError(!collectionName ? 'Unknown content type.' : 'Missing record id.');
      }
      return;
    }

    try {
      if (isMounted.current) setLoadError('');
      const record = await fetchDetailRecord(type, id);
      if (isMounted.current) setItem(record);
    } catch (error) {
      if (isMounted.current) setLoadError(error?.message || 'Could not load this record.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!ownerId || !['listing', 'hostel'].includes(type)) {
      setOwnerProfile(null);
      return undefined;
    }

    let cancelled = false;
    getUserProfileById(ownerId)
      .then((data) => {
        if (!cancelled) setOwnerProfile(data || null);
      })
      .catch(() => {
        if (!cancelled) setOwnerProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [ownerId, type]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (isMounted.current) setRefreshing(false);
  }, [load]);

  useEffect(() => {
    if (contactSheetVisible) {
      sheetAnim.setValue(0);
      Animated.timing(sheetAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [contactSheetVisible, sheetAnim]);

  const title = item?.title || item?.name || 'Untitled';
  const description = item?.description || item?.body || item?.summary || '';
  const descriptionIsLong = description.length > 220;
  const displayedDescription =
    descriptionIsLong && !descriptionExpanded ? `${description.slice(0, 220).trim()}...` : description;

  const createdDate = formatDate(item?.createdAt || item?.postedAt || item?.publishedAt);
  const ownerLabel = ownerName ? `by ${ownerName}` : '';
  const recordMeta = [createdDate, ownerLabel].filter(Boolean).join(' • ');

  const fields = useMemo(() => buildFields(item, type), [item, type]);
  const displayPrice = item?.price ?? item?.rent;
  const formattedPrice = displayPrice !== undefined && displayPrice !== null && displayPrice !== '' ? formatNaira(displayPrice) : '';
  const primaryLocation = item?.location || item?.address || item?.area || '';
  const contactRole = isHostel ? 'agent' : 'seller';
  const contactLabel = `Contact ${contactRole}`;
  const commerceHighlights = useMemo(() => {
    if (!isCommerceType || !item) return [];
    const highlights = [];
    const add = (icon, label, value) => {
      if (value === undefined || value === null || value === '') return;
      highlights.push({ icon, label, value: String(value) });
    };

    if (isHostel) {
      add('location-outline', 'Area', primaryLocation);
      add('bed-outline', 'Room', item.roomType || item.type);
      add('walk-outline', 'Distance', item.distance);
      add('checkmark-circle-outline', 'Status', item.availability || (item.verified ? 'Verified' : 'Available'));
      return highlights.slice(0, 4);
    }

    add('pricetag-outline', 'Category', item.category);
    add('shield-checkmark-outline', 'Condition', item.condition);
    add('location-outline', 'Pickup', primaryLocation);
    add('checkmark-circle-outline', 'Status', item.availability || (item.verified ? 'Verified' : 'Available'));
    return highlights.slice(0, 4);
  }, [isCommerceType, isHostel, item, primaryLocation]);
  const hasFileAsset = Boolean(asset?.hasDocumentUrl);

  useEffect(() => {
    if (!id || !['note', 'question', 'studyMaterial'].includes(type)) {
      setOfflineRecord(null);
      return undefined;
    }
    let cancelled = false;
    getDownloadRecord(type, id)
      .then((record) => {
        if (!cancelled) setOfflineRecord(record);
      })
      .catch(() => {
        if (!cancelled) setOfflineRecord(null);
      });
    return () => { cancelled = true; };
  }, [id, type]);

  const closePdfPreview = () => {
    const previewFile = previewFileRef.current;
    previewFileRef.current = null;
    if (previewFile) {
      FileSystem.deleteAsync(previewFile, { idempotent: true }).catch(() => {});
    }
    setPdfPreviewOpen(false);
    setPdfPreviewUrl('');
    setPdfPreviewLoading(false);
  };

  const openPdfPreview = async () => {
    if (!asset?.hasDocumentUrl || !id || !type) return;
    closePdfPreview();
    setPdfPreviewUrl('');
    setPdfPreviewError(false);
    setPdfPreviewLoading(true);
    setPdfPreviewOpen(true);
    try {
      const token = await user?.getIdToken?.();
      if (!token) throw new Error('Please sign in to preview this document.');
      const previewUri = `${FileSystem.cacheDirectory}unihelp-preview-${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.pdf`;
      const previewEndpoint = `${getApiUrl()}/api/offline-library/preview/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
      const result = await FileSystem.downloadAsync(previewEndpoint, previewUri, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!result?.uri || result.status !== 200) {
        await FileSystem.deleteAsync(previewUri, { idempotent: true }).catch(() => {});
        throw new Error('Preview file was not created.');
      }
      previewFileRef.current = result.uri;
      if (isMounted.current) setPdfPreviewUrl(result.uri);
    } catch (_error) {
      if (isMounted.current) {
        setPdfPreviewLoading(false);
        setPdfPreviewError(true);
      }
    }
  };

  useEffect(() => () => {
    if (previewFileRef.current) {
      FileSystem.deleteAsync(previewFileRef.current, { idempotent: true }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!pdfPreviewOpen || !pdfPreviewLoading) return undefined;
    const timeout = setTimeout(() => {
      setPdfPreviewLoading(false);
      setPdfPreviewError(true);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [pdfPreviewLoading, pdfPreviewOpen]);

  const saveDocumentOffline = async () => {
    if (!canSaveOffline) {
      Alert.alert(
        isPremiumUser ? 'Save unavailable' : 'Premium required',
        isPremiumUser
          ? 'This resource has no document available for offline saving.'
          : 'Offline Library requires an active UniHelp Premium subscription.',
        !isPremiumUser
          ? [{ text: 'Cancel', style: 'cancel' }, { text: 'View Premium', onPress: () => router.push('/premium') }]
          : undefined,
      );
      return;
    }

    setSavingOffline(true);
    try {
      const saved = await saveResourceForOffline({
        resourceType: type,
        resourceId: id,
        resource: item,
        fileName: asset?.fileName,
      });
      setOfflineRecord(saved);
      Alert.alert('Available Offline', 'This resource is saved inside UniHelp and can be opened from Offline Library.');
    } catch (error) {
      setOfflineRecord((current) => ({ ...(current || {}), status: 'failed', reason: error?.message || 'Save failed' }));
      Alert.alert('Save failed', error?.message || 'We could not save this resource right now.');
    } finally {
      if (isMounted.current) setSavingOffline(false);
    }
  };

  const messageOwnerInApp = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to message the owner directly.');
      return;
    }
    if (!ownerId) return;
    setMessaging(true);
    try {
      const conversationId = await startConversation(
        user,
        { id: ownerId, username: ownerName, photo: ownerPhoto, email: ownerEmail },
        profile || {}
      );
      const conversationRef = { id: conversationId, memberIds: [user.uid, ownerId] };
      await sendDirectMessage(conversationRef, user, profile || {}, {
        text: `Hi, I'm interested in "${title}" - is it still available?`,
        attachments: [],
        replyTo: null,
      });
      setContactSheetVisible(false);
      router.push(`/messages/${conversationId}`);
    } catch (error) {
      Alert.alert('Could not start chat', error?.message || 'Please try again.');
    } finally {
      if (isMounted.current) setMessaging(false);
    }
  };

  const messageOwnerOnWhatsApp = async () => {
    if (!whatsAppNumber) return;
    const message = `Hi, I'm interested in "${title}" on UniHelp - is it still available?`;
    const url = `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
      setContactSheetVisible(false);
    } catch (_error) {
      Alert.alert("Couldn't open WhatsApp", 'Make sure WhatsApp is installed on this device.');
    }
  };

  const shareRecord = async () => {
    try {
      await Share.share({
        title,
        message: `${title}${description ? `\n\n${description.slice(0, 200)}` : ''}`,
      });
    } catch (_error) {
      // user cancelled or share failed silently - no surface error
    }
  };

  const deleteCurrentResource = async () => {
    setDeletingResource(true);
    try {
      if (type === 'question') {
        await deleteQuestion(id);
      } else {
        await deleteNote(id);
      }
      Alert.alert('Resource deleted', 'The resource and its Cloudinary file have been removed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Delete failed', error?.message || 'Unable to delete this resource.');
    } finally {
      setDeletingResource(false);
    }
  };

  const openResourceActions = () => {
    if (!canManageCurrentResource || deletingResource) return;
    Alert.alert(title || 'Resource actions', 'Choose what you want to do.', [
      {
        text: 'Edit',
        onPress: () => router.push({ pathname: '/upload', params: { type, editId: id } }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete resource?', 'This removes the Firestore record and its Cloudinary file.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: deleteCurrentResource },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const mediaItems = useMemo(() => {
    if (!item) return [];
    const candidates = [];
    const pushValue = (value) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        value.forEach(pushValue);
        return;
      }
      if (typeof value === 'string' && value.trim()) {
        candidates.push(value.trim());
        return;
      }
      if (typeof value === 'object') {
        const nested = [value.url, value.secure_url, value.previewUrl, value.fileUrl, value.downloadUrl].find(
          (entry) => typeof entry === 'string' && entry.trim()
        );
        if (nested) candidates.push(nested.trim());
      }
    };

    pushValue(item.images);
    pushValue(item.imageAssets);
    pushValue(item.files);
    pushValue(item.coverUrl);
    pushValue(item.avatarUrl);
    pushValue(item.thumbnailUrl);
    pushValue(item.previewUrl);
    pushValue(item.imageUrl);
    pushValue(item.image);
    pushValue(item.photoUrl);
    pushValue(item.photo);

    return [...new Set(candidates.filter(Boolean))];
  }, [item]);

  const showMediaGallery = !hasFileAsset && mediaItems.length > 0;
  const isGalleryType = ['listing', 'hostel'].includes(type);

  const handleGalleryScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / GALLERY_STEP);
    if (Number.isFinite(index) && index >= 0 && index < mediaItems.length) {
      setGalleryIndex(index);
    }
  };

  const jumpToGallerySlide = (index) => {
    galleryRef.current?.scrollTo({ x: index * GALLERY_STEP, animated: true });
    setGalleryIndex(index);
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    lightboxInitialScrollRef.current = false;
    setLightboxVisible(true);
  };

  useEffect(() => {
    if (!lightboxVisible || lightboxInitialScrollRef.current) return;
    lightboxInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      lightboxRef.current?.scrollTo({ x: lightboxIndex * SCREEN_WIDTH, animated: false });
    });
  }, [lightboxIndex, lightboxVisible]);

  const handleLightboxScroll = (event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH);
    if (Number.isFinite(index) && index >= 0 && index < mediaItems.length) {
      setLightboxIndex(index);
    }
  };

  const showStickyFooter = showContactCta || hasFileAsset;
  const pdfViewerUrl = useMemo(() => {
    if (!pdfPreviewUrl || pdfPreviewUrl.startsWith('file://')) return pdfPreviewUrl;
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfPreviewUrl)}`;
  }, [pdfPreviewUrl]);

  return (
    <ScreenShell title="Details" subtitle={item?.title || item?.name || 'Record details'} showBack loading={loading}>
      {loading ? (
        <View style={styles.skeletonWrap}>
          <View style={styles.skeletonTopRow}>
            <Animated.View style={[styles.skeletonPill, { opacity: skeletonAnim }]} />
            <Animated.View style={[styles.skeletonCircle, { opacity: skeletonAnim }]} />
          </View>
          <Animated.View style={[styles.skeletonImage, { opacity: skeletonAnim }]} />
          <Animated.View style={[styles.skeletonLine, { width: '70%', opacity: skeletonAnim }]} />
          <Animated.View style={[styles.skeletonLine, { width: '45%', opacity: skeletonAnim }]} />
          <View style={styles.skeletonFieldGrid}>
            <Animated.View style={[styles.skeletonFieldCard, { opacity: skeletonAnim }]} />
            <Animated.View style={[styles.skeletonFieldCard, { opacity: skeletonAnim }]} />
            <Animated.View style={[styles.skeletonFieldCard, { opacity: skeletonAnim }]} />
            <Animated.View style={[styles.skeletonFieldCard, { opacity: skeletonAnim }]} />
          </View>
        </View>
      ) : item ? (
        <View style={styles.pageBody}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, showStickyFooter && styles.scrollContentWithFooter]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />
          }
        >
          <View style={styles.typeRow}>
            <View style={styles.typeBadge}>
              <Ionicons name={typeMeta.icon} size={13} color={colors.brandText} />
              <Text style={styles.typeBadgeText}>{typeMeta.label.toUpperCase()}</Text>
            </View>
            <View style={styles.topActions}>
              {canManageCurrentResource ? (
                <Pressable
                  style={({ pressed }) => [styles.shareButton, pressed && styles.pressedSubtle]}
                  onPress={openResourceActions}
                  hitSlop={8}
                  disabled={deletingResource}
                  accessibilityRole="button"
                  accessibilityLabel="Manage resource"
                >
                  {deletingResource ? (
                    <ActivityIndicator size="small" color={colors.icon} />
                  ) : (
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.icon} />
                  )}
                </Pressable>
              ) : null}
              {canMessageInApp ? (
                <Pressable
                  style={({ pressed }) => [styles.shareButton, pressed && styles.pressedSubtle]}
                  onPress={messageOwnerInApp}
                  hitSlop={8}
                  disabled={messaging}
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${ownerName}`}
                >
                  {messaging ? (
                    <ActivityIndicator size="small" color={colors.notification} />
                  ) : (
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.brandText} />
                  )}
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.shareButton, pressed && styles.pressedSubtle]}
                onPress={shareRecord}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Share"
              >
                <Ionicons name="share-outline" size={18} color={colors.icon} />
              </Pressable>
            </View>
          </View>

          {!isCommerceType && item.price !== undefined && item.price !== null && item.price !== '' ? (
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>{formatNaira(item.price)}</Text>
            </View>
          ) : null}

          {!isCommerceType && recordMeta ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{recordMeta}</Text>
            </View>
          ) : null}

          {hasFileAsset ? (
            <View style={styles.documentCard}>
              <View style={styles.previewWrap}>
                {asset.previewUrl && isPreviewImageUrl(asset.previewUrl) ? (
                  <Image source={{ uri: asset.previewUrl }} style={styles.preview} contentFit="cover" cachePolicy="disk" transition={250} />
                ) : (
                  <View style={styles.previewFallback}>
                    <Text style={styles.previewFallbackTitle}>PDF</Text>
                    <Text style={styles.previewFallbackText}>Document preview unavailable</Text>
                  </View>
                )}
              </View>

              <View style={styles.documentBody}>
                <Text style={styles.documentTitle}>{title || asset.fileName}</Text>
                <Text style={styles.documentMeta}>
                  {asset.hasDocumentUrl ? formatDocumentMeta(item) || asset.fileName : 'No document file is attached to this item.'}
                </Text>

                <View style={styles.buttonRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.flexButton,
                      !asset.hasDocumentUrl && styles.disabledButton,
                      pressed && asset.hasDocumentUrl && styles.pressedBrand,
                    ]}
                    onPress={openPdfPreview}
                    disabled={!asset.hasDocumentUrl}
                    accessibilityRole="button"
                    accessibilityLabel="Preview document"
                  >
                    <Ionicons name="eye-outline" size={15} color={colors.onBrand} />
                    <Text style={styles.primaryButtonText}>Preview document</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {showMediaGallery && isGalleryType ? (
            <View style={styles.galleryCard}>
              <ScrollView
                ref={galleryRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={GALLERY_STEP}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={styles.galleryTrack}
                onScroll={handleGalleryScroll}
                scrollEventThrottle={16}
                onScrollEndDrag={handleGalleryScroll}
                onMomentumScrollEnd={handleGalleryScroll}
              >
                {mediaItems.map((url, index) => (
                  <Pressable
                    key={`${url}-${index}`}
                    style={styles.gallerySlide}
                    onPress={() => openLightbox(index)}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`Photo ${index + 1} of ${mediaItems.length}, tap to view full screen`}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.galleryImage}
                      contentFit="cover"
                      cachePolicy="disk"
                      transition={300}
                    />
                  </Pressable>
                ))}
              </ScrollView>

              {mediaItems.length > 1 ? (
                <View style={styles.galleryDots}>
                  {mediaItems.map((_, index) => (
                    <Pressable
                      key={index}
                      onPress={() => jumpToGallerySlide(index)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Go to photo ${index + 1}`}
                    >
                      <View style={[styles.galleryDot, index === galleryIndex && styles.galleryDotActive]} />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {mediaItems.length > 1 ? (
                <View style={styles.galleryCounter}>
                  <Text style={styles.galleryCounterText}>
                    {galleryIndex + 1} / {mediaItems.length}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : showMediaGallery ? (
            <Pressable style={styles.mediaCard} onPress={() => openLightbox(0)} accessibilityRole="imagebutton" accessibilityLabel="View photo full screen">
              <Image source={{ uri: mediaItems[0] }} style={styles.heroImage} contentFit="cover" cachePolicy="disk" transition={250} />
              {mediaItems.length > 1 ? (
                <View style={styles.mediaCountBadge}>
                  <Text style={styles.mediaCountText}>+{mediaItems.length - 1} more photos</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {isCommerceType ? (
            <View style={styles.commerceCard}>
              <View style={styles.commerceHeaderRow}>
                <View style={styles.commerceTitleWrap}>
                  <View style={styles.commerceEyebrowRow}>
                    <Ionicons name={isHostel ? 'home-outline' : 'bag-handle-outline'} size={13} color={colors.brandText} />
                    <Text style={styles.commerceEyebrow}>{isHostel ? 'Student housing' : 'Campus marketplace'}</Text>
                  </View>
                  <Text style={styles.commerceTitle}>{title}</Text>
                  {recordMeta ? <Text style={styles.commerceMeta}>{recordMeta}</Text> : null}
                </View>
                {item?.verified ? (
                  <View style={styles.verifiedPill}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                    <Text style={styles.verifiedPillText}>Verified</Text>
                  </View>
                ) : null}
              </View>

              {formattedPrice ? (
                <View style={styles.commercePriceRow}>
                  <Text style={styles.commercePrice}>{formattedPrice}</Text>
                  {isHostel ? <Text style={styles.commercePriceHint}>per listing</Text> : null}
                </View>
              ) : null}

              {commerceHighlights.length ? (
                <View style={styles.commerceHighlights}>
                  {commerceHighlights.map((highlight) => (
                    <View key={highlight.label} style={styles.highlightCard}>
                      <Ionicons name={highlight.icon} size={15} color={colors.brandText} />
                      <Text style={styles.highlightLabel}>{highlight.label}</Text>
                      <Text style={styles.highlightValue} numberOfLines={2}>{highlight.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.ownerPanel}>
                <View style={styles.ownerAvatar}>
                  {ownerPhoto ? (
                    <Image source={{ uri: ownerPhoto }} style={styles.ownerAvatarImage} contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <Text style={styles.ownerAvatarText}>{(ownerName || contactRole).charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.ownerCopy}>
                  <Text style={styles.ownerLabel}>{isHostel ? 'Listed by' : 'Sold by'}</Text>
                  <Text style={styles.ownerName} numberOfLines={1}>{ownerName}</Text>
                  <Text style={styles.ownerHint}>{canWhatsApp ? 'WhatsApp available' : 'Open details to contact'}</Text>
                </View>
                {showContactCta ? (
                  <Pressable
                    onPress={() => setContactSheetVisible(true)}
                    style={({ pressed }) => [styles.ownerContactButton, pressed && styles.pressedBrand]}
                    accessibilityRole="button"
                    accessibilityLabel={contactLabel}
                  >
                    <Ionicons name="chatbubbles-outline" size={15} color={colors.onBrand} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {!isCommerceType && !hasFileAsset && !showMediaGallery ? (
            <View style={styles.titleCard}>
              <Text style={styles.documentTitle}>{title}</Text>
            </View>
          ) : null}

          {description ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.sectionLabel}>{isCommerceType ? (isHostel ? 'PROPERTY OVERVIEW' : 'PRODUCT OVERVIEW') : 'DESCRIPTION'}</Text>
              <Text style={styles.descriptionText}>{displayedDescription}</Text>
              {descriptionIsLong ? (
                <Pressable onPress={() => setDescriptionExpanded((value) => !value)} hitSlop={6}>
                  <Text style={styles.readMore}>{descriptionExpanded ? 'Show less' : 'Read more'}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {fields.length ? (
            <>
              <Text style={styles.sectionLabel}>DETAILS</Text>
              <View style={styles.fieldGrid}>
                {fields.map((field) => (
                  <View key={field.label} style={styles.fieldCard}>
                    <Ionicons name={field.icon} size={15} color={colors.icon} />
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <Text style={styles.fieldValue} numberOfLines={2}>
                      {field.value}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>

        {showStickyFooter ? (
          <View style={styles.stickyFooter}>
            {showContactCta ? (
              <Pressable
                style={({ pressed }) => [styles.stickyContactButton, styles.flexButton, pressed && styles.pressedBrand]}
                onPress={() => setContactSheetVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={`Contact ${ownerName}`}
              >
                <Ionicons name="chatbubbles-outline" size={17} color={colors.onBrand} />
                <Text style={styles.stickyContactButtonText}>{contactLabel}</Text>
              </Pressable>
            ) : null}
            {hasFileAsset ? (
              <Pressable
                style={({ pressed }) => [
                  styles.stickyDownloadButton,
                  styles.flexButton,
                  !canSaveOffline && styles.disabledButton,
                  pressed && canSaveOffline && styles.pressedSubtle,
                ]}
                onPress={saveDocumentOffline}
                disabled={savingOffline || !canSaveOffline}
                accessibilityRole="button"
                accessibilityLabel="Save resource for offline"
              >
                {savingOffline ? (
                  <>
                    <ActivityIndicator color={colors.brandDark} />
                    <Text style={styles.stickyDownloadText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name={!isPremiumUser ? 'lock-closed-outline' : offlineRecord?.status === 'downloaded' ? 'checkmark-circle-outline' : 'cloud-download-outline'}
                      size={16}
                      color={colors.brandDark}
                    />
                    <Text style={styles.stickyDownloadText}>
                      {!isPremiumUser
                        ? 'Premium required'
                        : offlineRecord?.status === 'downloaded'
                          ? '✓ Available Offline'
                          : offlineRecord?.status === 'failed'
                            ? 'Save Failed • Retry'
                            : `Save for Offline`}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={24} color={colors.textSecondary} />
          </View>
          <Text style={styles.title}>Item not found</Text>
          <Text style={styles.body}>{loadError || 'This record is not available yet.'}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.pressedBrand]}
            onPress={() => { setLoading(true); load(); }}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Ionicons name="refresh-outline" size={15} color={colors.onBrand} />
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={contactSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactSheetVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setContactSheetVisible(false)} />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
                },
              ],
              opacity: sheetAnim,
            },
          ]}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{contactLabel}</Text>
          <Text style={styles.sheetSubtitle} numberOfLines={1}>
            About: {title}
          </Text>

          {canMessageInApp ? (
            <Pressable
              style={({ pressed }) => [styles.sheetOption, pressed && styles.pressedSubtle]}
              onPress={messageOwnerInApp}
              disabled={messaging}
              accessibilityRole="button"
              accessibilityLabel="Message on Unihelp"
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: colors.brandLight }]}>
                {messaging ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Ionicons name="chatbubble-ellipses" size={17} color={colors.brand} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>Message on Unihelp</Text>
                <Text style={styles.sheetOptionHint}>Sends a DM about this {isHostel ? 'hostel' : 'product'}</Text>
              </View>
            </Pressable>
          ) : null}

          {canWhatsApp ? (
            <Pressable
              style={({ pressed }) => [styles.sheetOption, pressed && styles.pressedSubtle]}
              onPress={messageOwnerOnWhatsApp}
              accessibilityRole="button"
              accessibilityLabel="Message on WhatsApp"
            >
              <View style={[styles.sheetOptionIcon, { backgroundColor: colors.greenLight }]}>
                <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>WhatsApp</Text>
                <Text style={styles.sheetOptionHint}>Opens a chat with {ownerPhone}</Text>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.sheetCancel, pressed && styles.pressedSubtle]}
            onPress={() => setContactSheetVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </Modal>

      <Modal
        visible={pdfPreviewOpen}
        animationType="slide"
        onRequestClose={closePdfPreview}
      >
        <View style={styles.previewModal}>
          <View style={styles.previewModalHeader}>
            <Text style={styles.previewModalTitle}>PDF preview</Text>
            <Pressable
              onPress={closePdfPreview}
              style={styles.previewModalClose}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
            >
              <Text style={styles.previewModalCloseText}>Close</Text>
            </Pressable>
          </View>
          {pdfPreviewError ? (
            <View style={styles.webviewLoading}>
              <Ionicons name="cloud-offline-outline" size={30} color={colors.textSecondary} />
              <Text style={styles.loadingText}>We could not load a preview for this file.</Text>
              <Text style={styles.previewErrorHint}>You can still save eligible Premium resources for offline use from the detail page.</Text>
            </View>
          ) : pdfPreviewUrl ? (
            <WebView
              source={{ uri: pdfViewerUrl || pdfPreviewUrl }}
              style={styles.webview}
              originWhitelist={['*']}
              allowFileAccess
              allowUniversalAccessFromFileURLs={false}
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url || '';
                return url.startsWith('file://') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('about:blank');
              }}
              startInLoadingState
              javaScriptEnabled
              injectedJavaScript={pdfExportLockdownScript}
              allowsBackForwardNavigationGestures={false}
              onLoadStart={() => setPdfPreviewLoading(true)}
              onLoad={() => setPdfPreviewLoading(false)}
              onLoadEnd={() => setPdfPreviewLoading(false)}
              onHttpError={() => {
                setPdfPreviewError(true);
                setPdfPreviewLoading(false);
              }}
              onError={() => {
                setPdfPreviewError(true);
                setPdfPreviewLoading(false);
              }}
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator color={colors.brand} />
                  <Text style={styles.loadingText}>Opening document...</Text>
                </View>
              )}
            />
          ) : (
            <View style={styles.webviewLoading}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.loadingText}>Preparing private preview...</Text>
            </View>
          )}
          {pdfPreviewLoading && !pdfPreviewError ? (
            <View pointerEvents="none" style={styles.webviewLoading}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.loadingText}>Opening document...</Text>
            </View>
          ) : null}
          <View style={styles.previewModalActions}>
            <Pressable
              style={({ pressed }) => [styles.previewModalAction, pressed && styles.pressedSubtle]}
              onPress={closePdfPreview}
              accessibilityRole="button"
              accessibilityLabel="Close document preview"
            >
              <Ionicons name="reader-outline" size={16} color={colors.brandDark} />
              <Text style={styles.previewModalActionText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={styles.lightbox}>
          <Pressable
            style={styles.lightboxClose}
            onPress={() => setLightboxVisible(false)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close full screen photo"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
          <ScrollView
            ref={lightboxRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleLightboxScroll}
          >
            {mediaItems.map((url, index) => (
              <View key={`${url}-${index}`} style={styles.lightboxSlide}>
                <Image source={{ uri: url }} style={styles.lightboxImage} contentFit="contain" transition={200} />
              </View>
            ))}
          </ScrollView>
          {mediaItems.length > 1 ? (
            <View style={styles.lightboxCounter}>
              <Text style={styles.lightboxCounterText}>{lightboxIndex + 1} / {mediaItems.length}</Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </ScreenShell>
  );
}

const createStyles = (colors) => StyleSheet.create({
  pageBody: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: SCREEN_PADDING,
  },
  scrollContentWithFooter: {
    paddingBottom: 24,
  },
  skeletonWrap: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 4,
  },
  skeletonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  skeletonPill: {
    width: 110,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.borderDefault,
  },
  skeletonCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.borderDefault,
  },
  skeletonImage: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    backgroundColor: colors.borderDefault,
    marginBottom: 16,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.borderDefault,
    marginBottom: 10,
  },
  skeletonFieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  skeletonFieldCard: {
    width: '47%',
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.borderDefault,
  },
  loadingText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 13,
  },
  previewErrorHint: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.brandDark,
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressedSubtle: {
    backgroundColor: colors.surfaceSecondary,
  },
  pressedBrand: {
    opacity: 0.85,
  },
  priceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.greenLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  priceBadgeText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.success,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: colors.onBrand,
    fontWeight: '800',
    fontSize: 13,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDefault,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  sheetSubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: 10,
  },
  sheetOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sheetOptionHint: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  sheetCancel: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  documentCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  previewWrap: {
    height: 220,
    backgroundColor: colors.brandLight,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  previewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFallbackTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    color: colors.brand,
  },
  previewFallbackText: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  galleryCard: {
    position: 'relative',
    backgroundColor: colors.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  galleryTrack: {
    gap: GALLERY_GAP,
  },
  gallerySlide: {
    width: GALLERY_SLIDE_WIDTH,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.brandLight,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  galleryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.placeholder,
  },
  galleryDotActive: {
    backgroundColor: colors.brand,
    width: 16,
    borderRadius: 4,
  },
  galleryCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.overlay,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  galleryCounterText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  mediaCard: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.brandLight,
  },
  mediaCountBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  mediaCountText: {
    backgroundColor: colors.overlay,
    color: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  metaRow: {
    marginBottom: 12,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  titleCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 16,
    marginBottom: 14,
  },
  commerceCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  commerceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  commerceTitleWrap: {
    flex: 1,
  },
  commerceEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  commerceEyebrow: {
    color: colors.brandText,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  commerceTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  commerceMeta: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.greenLight,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  verifiedPillText: {
    color: colors.success,
    fontSize: 10.5,
    fontWeight: '900',
  },
  commercePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 14,
  },
  commercePrice: {
    color: colors.brandDark,
    fontSize: 26,
    fontWeight: '900',
  },
  commercePriceHint: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  commerceHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  highlightCard: {
    width: '47%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 12,
  },
  highlightLabel: {
    marginTop: 7,
    color: colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  highlightValue: {
    marginTop: 3,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  ownerPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ownerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  ownerAvatarText: {
    color: colors.brandDark,
    fontSize: 16,
    fontWeight: '900',
  },
  ownerCopy: {
    flex: 1,
  },
  ownerLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ownerName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  ownerHint: {
    color: colors.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
  },
  ownerContactButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentBody: {
    padding: 16,
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  documentMeta: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  flexButton: {
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.brand,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 16,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  descriptionText: {
    // Was hardcoded to '#334155' (light-mode inkLight), which stayed frozen
    // and unreadable against a dark background in dark mode.
    color: colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 20,
  },
  readMore: {
    marginTop: 8,
    color: colors.brandDark,
    fontWeight: '700',
    fontSize: 12.5,
  },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  fieldCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 12,
  },
  fieldLabel: {
    marginTop: 6,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  fieldValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 18,
    margin: SCREEN_PADDING,
  },
  errorIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  body: {
    marginTop: 8,
    color: colors.textSecondary,
    lineHeight: 21,
    fontSize: 13,
  },
  stickyFooter: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  stickyContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: 16,
    minHeight: 52,
  },
  stickyContactButtonText: {
    color: colors.onBrand,
    fontWeight: '800',
    fontSize: 14,
  },
  stickyDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brandLight,
    borderRadius: 14,
    minHeight: 50,
  },
  stickyDownloadText: {
    color: colors.brandDark,
    fontWeight: '800',
    fontSize: 13.5,
  },
  previewModal: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  previewModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  previewModalClose: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewModalCloseText: {
    color: colors.brand,
    fontWeight: '700',
  },
  webview: {
    flex: 1,
  },
  previewModalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    backgroundColor: colors.surface,
  },
  previewModalAction: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandLight,
    borderRadius: 14,
    paddingVertical: 11,
  },
  previewModalActionText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: '800',
  },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightbox: {
    flex: 1,
    backgroundColor: '#000000',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxSlide: {
    width: SCREEN_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxCounter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lightboxCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
