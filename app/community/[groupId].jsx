import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import StickerPicker from '../../src/shared/components/StickerPicker';
import StickerMessage from '../../src/shared/components/StickerMessage';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { useAuth } from '../../context/AuthContext';
import {
  approveGroupJoinRequest,
  formatShortTime,
  getGroup,
  getMembership,
  joinPublicGroup,
  leaveGroup,
  listGroupJoinRequests,
  listenGroupMessages,
  rejectGroupJoinRequest,
  requestJoinGroup,
  sendGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,
  startConversation,
  toggleMessageReaction, // see note at bottom of file if this doesn't exist yet in your service
  updateGroup, // see note at bottom of file if this doesn't exist yet in your service
} from '../../src/shared/services/community';
import { uploadToCloudinary } from '../../services/cloudinary'; // see note at bottom of file

const CATEGORIES = ['Academics', 'Career', 'Health', 'Social', 'Tech', 'Other'];
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const REACTION_ERROR_AUTO_DISMISS_MS = 3000;
const SWIPE_REPLY_MAX = 88;
const SWIPE_REPLY_THRESHOLD = 56;
const NEAR_BOTTOM_PX = 140;
const GROUP_WINDOW_MS = 5 * 60 * 1000;

// Deterministic pastel palette so each sender gets a consistent avatar/name colour
const AVATAR_PALETTE = ['#4F46E5', '#0EA5E9', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#8B5CF6'];
const colorForName = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};
const initialsForName = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

const pluralize = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// createdAt can be a Firestore Timestamp, a {seconds} object, a Date/ISO string, or null (pending write).
const getMillis = (message) => {
  const created = message?.createdAt;
  if (!created) return 0;
  if (typeof created.toMillis === 'function') return created.toMillis();
  if (typeof created.seconds === 'number') return created.seconds * 1000;
  const parsed = new Date(created).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const startOfDay = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const isSameDay = (a, b) => startOfDay(a) === startOfDay(b);
const dayLabel = (ms) => {
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(ms)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

// Two messages belong to one visual group if same sender, same day, and close in time.
const inSameGroup = (a, b) => {
  if (!a || !b || a.senderId !== b.senderId) return false;
  const am = getMillis(a);
  const bm = getMillis(b);
  if (am && bm) return isSameDay(am, bm) && Math.abs(bm - am) <= GROUP_WINDOW_MS;
  return true;
};

// Shared drag-to-dismiss behaviour for bottom sheets. Attach `panHandlers` to
// the sheet's handle/header only, and wrap the sheet body in an Animated.View
// using `translateY` as its transform so a downward drag past the threshold
// dismisses it, otherwise it springs back to the open position.
function useDraggableSheet(onDismiss) {
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 110 || gesture.vy > 0.9) {
          Animated.timing(translateY, { toValue: 700, duration: 180, useNativeDriver: true }).start(() => {
            translateY.setValue(0);
            onDismiss();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;
  return { translateY, panHandlers: panResponder.panHandlers };
}

export default function GroupDetailPage() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [group, setGroup] = useState(null);
  const [membership, setMembership] = useState(null);
  const [messages, setMessages] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [draft, setDraft] = useState('');
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');

  // Chat layout / scrolling
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const initialScrolledRef = useRef(false);
  const editCloseTimer = useRef(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Reactions
  const [reactionPickerFor, setReactionPickerFor] = useState(null);
  const [reactingMessageId, setReactingMessageId] = useState(null);
  const [reactionError, setReactionError] = useState('');
  const reactionErrorTimer = useRef(null);

  // Per-message "more actions" sheet (the ellipsis menu)
  const [activeMessageActions, setActiveMessageActions] = useState(null);
  const messageActionsSheet = useDraggableSheet(() => setActiveMessageActions(null));

  // Group options sheet (replaces the always-visible links list)
  const [groupOptionsVisible, setGroupOptionsVisible] = useState(false);
  const groupOptionsSheet = useDraggableSheet(() => setGroupOptionsVisible(false));

  // Admin management state
  const [editVisible, setEditVisible] = useState(false);
  const editSheet = useDraggableSheet(() => setEditVisible(false));
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Academics');
  const [editPrivacy, setEditPrivacy] = useState('public');
  const [editAllowMemberMessages, setEditAllowMemberMessages] = useState(true);
  const [editRequireApproval, setEditRequireApproval] = useState(true);
  const [editWelcomeMessage, setEditWelcomeMessage] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState(null); // local preview, pre-upload
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editMessageType, setEditMessageType] = useState('success');

  const styles = useThemeStyles((c, s, r) => ({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    flex: {
      flex: 1,
    },
    chatArea: {
      flex: 1,
    },
    // The composer is now a normal flex child under the list (not absolutely positioned),
    // so the list is always sized to end exactly where the composer begins.
    composerOuter: {
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderColor: c.borderDefault,
    },
    chatContent: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
    },

    /* Jump to latest */
    jumpButton: {
      position: 'absolute',
      right: 14,
      bottom: 12,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderDefault,
      shadowColor: c.shadow || '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },

    /* Hero / group info */
    hero: {
      backgroundColor: c.brand,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
    },
    heroActionsRow: {
      position: 'absolute',
      top: 14,
      right: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      zIndex: 2,
    },
    heroIconButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      overflow: 'hidden',
    },
    heroAvatarImage: {
      width: 46,
      height: 46,
    },
    heroAvatarText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 16,
    },
    heroTextWrap: {
      flex: 1,
      paddingRight: 70,
    },
    heroTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },
    heroText: {
      marginTop: 3,
      color: '#E0E7FF',
      fontSize: 12,
      lineHeight: 17,
    },
    metaRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.14)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    meta: {
      color: '#E0E7FF',
      fontSize: 11,
      fontWeight: '700',
    },

    /* Join / leave */
    joinButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.brand,
      borderRadius: 14,
      paddingVertical: 12,
      marginBottom: 16,
    },
    joinText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 13,
    },

    /* Reaction error toast */
    reactionToast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.dangerLight,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
    },
    reactionToastText: {
      color: c.danger,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },

    /* Date dividers */
    dateDividerWrap: {
      alignItems: 'center',
      marginVertical: 10,
    },
    dateDividerPill: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    dateDividerText: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },

    /* Messages */
    messagesWrap: {
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      marginBottom: 3,
      maxWidth: '100%',
    },
    rowEnd: {
      marginBottom: 10,
    },
    rowTheirs: {
      justifyContent: 'flex-start',
    },
    rowMine: {
      justifyContent: 'flex-end',
    },
    swipeReplyIconTheirs: {
      position: 'absolute',
      left: 38, // sits just after the 36px avatar slot so it is never hidden behind it
      top: '50%',
      marginTop: -12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swipeReplyIconMine: {
      position: 'absolute',
      right: 2,
      top: '50%',
      marginTop: -12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarSlot: {
      width: 30,
      alignItems: 'center',
      marginRight: 6,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    bubbleColumn: {
      maxWidth: '78%',
    },
    bubble: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      shadowColor: c.shadow || '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
    },
    // Only the last bubble in a group gets the "tail" corner (radius 4).
    bubbleTheirs: {
      backgroundColor: c.surfacePrimary,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderBottomRightRadius: 20,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    bubbleTheirsNoTail: {
      borderBottomLeftRadius: 20,
    },
    bubbleMine: {
      backgroundColor: c.brand,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 4,
    },
    bubbleMineNoTail: {
      borderBottomRightRadius: 20,
    },
    // Stickers float without a coloured bubble behind them.
    bubbleSticker: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      paddingHorizontal: 2,
      paddingVertical: 2,
      shadowOpacity: 0,
      elevation: 0,
    },
    messageAuthor: {
      fontWeight: '800',
      fontSize: 12,
      marginBottom: 2,
    },
    messageBody: {
      color: c.inkLight,
      fontSize: 14.5,
      lineHeight: 20,
    },
    messageBodyMine: {
      color: '#FFFFFF',
    },
    messageDeleted: {
      fontStyle: 'italic',
      opacity: 0.75,
    },
    bubbleFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: 3,
    },
    messageTime: {
      color: c.textTertiary,
      fontSize: 10,
    },
    messageTimeMine: {
      color: c.brandGlow,
    },
    kebabButton: {
      marginLeft: 4,
      paddingHorizontal: 2,
      paddingVertical: 2,
    },

    replyBlock: {
      borderLeftWidth: 3,
      padding: 8,
      borderRadius: 10,
      marginBottom: 6,
    },
    replyBlockTheirs: {
      backgroundColor: c.surfaceSecondary,
      borderLeftColor: c.brand,
    },
    replyBlockMine: {
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderLeftColor: '#FFFFFF',
    },
    replyAuthor: {
      color: c.brandDark,
      fontWeight: '800',
      fontSize: 11,
    },
    // Text on the translucent-white block inside a brand-coloured bubble must be light.
    replyAuthorMine: {
      color: '#FFFFFF',
    },
    replyText: {
      marginTop: 2,
      color: c.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    replyTextMine: {
      color: 'rgba(255,255,255,0.85)',
    },

    /* Reactions */
    reactionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
      marginTop: 5,
      marginLeft: 2,
    },
    reactionsRowMine: {
      justifyContent: 'flex-end',
      marginLeft: 0,
      marginRight: 2,
    },
    reactionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    reactionPillActive: {
      backgroundColor: c.brandLight,
      borderColor: c.brand,
    },
    reactionEmoji: {
      fontSize: 12.5,
    },
    reactionCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    reactionCountActive: {
      color: c.brandDark,
    },

    /* Quick reaction picker (long-press) */
    quickReactionBar: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderDefault,
      paddingHorizontal: 8,
      paddingVertical: 6,
      marginTop: 6,
      shadowColor: c.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    quickReactionBarMine: {
      alignSelf: 'flex-end',
    },
    quickReactionButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickReactionButtonPressed: {
      backgroundColor: c.skeleton,
    },
    quickReactionEmoji: {
      fontSize: 18,
    },

    /* Ellipsis "more actions" sheet, per message */
    actionSheetBackdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'flex-end',
    },
    actionSheetCard: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 24,
    },
    actionSheetHandleWrap: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    actionSheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderDefault,
    },
    actionSheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 13,
      paddingHorizontal: 10,
    },
    actionSheetIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionSheetIconWrapDanger: {
      backgroundColor: c.redLight,
    },
    actionSheetLabel: {
      fontSize: 14.5,
      fontWeight: '700',
      color: c.textPrimary,
    },

    /* Group options / links */
    groupOptionsPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 10,
      paddingBottom: 12,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
    },
    groupOptionsAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    groupOptionsAvatarImage: {
      width: 40,
      height: 40,
    },
    groupOptionsAvatarText: {
      color: c.brandDark,
      fontWeight: '800',
      fontSize: 15,
    },
    groupOptionsName: {
      fontSize: 15,
      fontWeight: '800',
      color: c.textPrimary,
    },
    groupOptionsMeta: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 1,
    },
    requestsCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: 12,
      marginBottom: 12,
    },
    requestsTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 8,
    },
    requestNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.brandLight,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 8,
    },
    requestNoticeText: {
      color: c.brandDark,
      fontSize: 12,
      flex: 1,
    },
    requestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: c.skeleton,
    },
    requestName: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
    },
    requestMeta: {
      fontSize: 11,
      color: c.textSecondary,
      marginTop: 2,
    },
    requestActions: {
      flexDirection: 'row',
      gap: 6,
    },
    requestApprove: {
      backgroundColor: c.teal,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    requestButtonDisabled: {
      opacity: 0.65,
    },
    requestReject: {
      backgroundColor: c.danger,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    requestActionText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    linkCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
    },
    linkIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkText: {
      flex: 1,
      color: c.textPrimary,
      fontWeight: '700',
      fontSize: 13,
    },
    dangerIconWrap: {
      backgroundColor: c.redLight,
    },
    dangerLinkText: {
      color: c.danger,
    },

    /* Composer */
    replyPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderColor: c.borderDefault,
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: 10,
    },
    replyPreviewBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 2,
    },
    replyPreviewBody: {
      flex: 1,
    },
    replyPreviewLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textPrimary,
    },
    replyPreviewText: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 1,
    },
    composer: {
      flexDirection: 'column',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 10,
      backgroundColor: c.surfacePrimary,
    },
    permissionNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.purpleLight,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    permissionNoticeText: {
      color: c.brandDark,
      fontSize: 12.5,
      fontWeight: '700',
      flex: 1,
    },
    composerInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    stickerButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inputBackground,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    inputPill: {
      flex: 1,
      backgroundColor: c.inputBackground,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 4,
      minHeight: 42,
      maxHeight: 120,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    input: {
      fontSize: 15.5,
      color: c.textPrimary,
      maxHeight: 100,
      paddingTop: Platform.OS === 'ios' ? 8 : 6,
      paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: c.brandGlow,
    },

    /* Bottom sheets (manage group / group options) */
    sheetBackdrop: {
      flex: 1,
      backgroundColor: c.overlay,
    },
    sheetWrap: {
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 28,
      maxHeight: '88%',
    },
    sheetHandleWrap: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderDefault,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 16,
      textAlign: 'center',
    },
    photoPicker: {
      alignItems: 'center',
      marginBottom: 18,
    },
    photoCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    photoImage: {
      width: 76,
      height: 76,
    },
    photoInitials: {
      color: c.brandDark,
      fontWeight: '800',
      fontSize: 24,
    },
    photoCameraBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.surface,
    },
    photoHint: {
      marginTop: 8,
      fontSize: 12.5,
      fontWeight: '700',
      color: c.brandDark,
    },
    fieldLabel: {
      fontSize: 12.5,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 6,
    },
    fieldInput: {
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 12,
      marginBottom: 14,
      backgroundColor: c.inputBackground,
      color: c.textPrimary,
      fontSize: 14,
    },
    fieldTextArea: {
      minHeight: 90,
      textAlignVertical: 'top',
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    chip: {
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 8,
      backgroundColor: c.inputBackground,
    },
    chipActive: {
      backgroundColor: c.brand,
      borderColor: c.brand,
    },
    chipText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: c.textSecondary,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    segmented: {
      flexDirection: 'row',
      backgroundColor: c.skeleton,
      borderRadius: 14,
      padding: 4,
      gap: 4,
      marginBottom: 16,
    },
    segmentOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 11,
    },
    segmentOptionActive: {
      backgroundColor: c.brand,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
    },
    segmentTextActive: {
      color: '#FFFFFF',
    },
    editMessageBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
    },
    editMessageSuccess: {
      backgroundColor: c.greenLight,
    },
    editMessageError: {
      backgroundColor: c.dangerLight,
    },
    saveButton: {
      backgroundColor: c.brand,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 6,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14,
    },
    cancelRow: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    cancelText: {
      color: c.textSecondary,
      fontWeight: '700',
      fontSize: 14,
    },
  }));

  useEffect(
    () => () => {
      clearTimeout(reactionErrorTimer.current);
      clearTimeout(editCloseTimer.current);
    },
    []
  );

  // ---- Keyboard / scroll handling ----------------------------------------

  const scrollToLatest = useCallback((animated = true) => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated }));
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      // Keep the latest message in view when the list shrinks for the keyboard.
      if (nearBottomRef.current) setTimeout(() => scrollToLatest(true), 80);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToLatest]);

  // The KeyboardAvoidingView needs to know how far it sits below the top of the window
  // (status bar + ScreenShell header). Measure it instead of guessing a magic number.
  const measureKeyboardOffset = useCallback(() => {
    containerRef.current?.measureInWindow?.((x, y) => {
      if (Number.isFinite(y)) setKeyboardOffset(y);
    });
  }, []);

  const handleScroll = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const near = distanceFromBottom < NEAR_BOTTOM_PX;
    nearBottomRef.current = near;
    setShowJumpToLatest(!near);
  }, []);

  const handleContentSizeChange = () => {
    // Only auto-follow new content if the reader is already at the bottom,
    // so incoming messages never yank someone who is reading history.
    if (!nearBottomRef.current) return;
    scrollRef.current?.scrollToEnd({ animated: initialScrolledRef.current });
    if (messages.length) initialScrolledRef.current = true;
  };

  // ---- Helpers ------------------------------------------------------------

  const messagePreview = (message) => {
    if (!message?.text) return message?.type === 'sticker' ? '[Sticker]' : '';
    const text = message.text.trim();
    return text.length > 80 ? `${text.slice(0, 80).trim()}...` : text;
  };

  const insertMention = (name) => {
    if (!name) return;
    const safeName = name.replace(/\s+/g, '');
    const prefix = draft.trimEnd();
    const mention = `@${safeName} `;
    setDraft(prefix ? `${prefix} ${mention}` : mention);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const openDm = async (message) => {
    if (!user || !message?.senderId || message.senderId === user.uid) return;
    setBusy(true);
    try {
      const conversationId = await startConversation(
        user,
        {
          id: message.senderId,
          username: message.senderName,
          photo: message.senderAvatar,
          email: message.senderEmail || '',
        },
        profile || {}
      );
      router.navigate(`/messages/${conversationId}`);
    } catch (error) {
      Alert.alert('Could not open chat', error?.message || 'Unable to start a private conversation.');
    } finally {
      setBusy(false);
    }
  };

  const groupPhotoUrl = group?.photoURL || group?.avatarUrl || group?.coverUrl || group?.avatar?.url || group?.avatar?.secure_url || '';
  const isOwnerOrAdmin = Boolean(
    group && user && (group.adminId === user.uid || group.ownerId === user.uid || membership?.role === 'admin' || membership?.role === 'owner')
  );
  const isMember = Boolean(isOwnerOrAdmin || membership);
  const isAdmin = isOwnerOrAdmin;
  const canSendMessages = Boolean(
    isAdmin ||
    (isMember && group?.allowMemberMessages !== false)
  );
  const activeText = editingMessage ? editText : draft;
  const canSubmit = Boolean(activeText.trim()) && canSendMessages && !busy;

  const load = useCallback(async () => {
    const groupData = await getGroup(groupId);
    const memberData = await getMembership(groupId, user?.uid);
    setGroup(groupData);
    setMembership(memberData);
    if (groupData && user?.uid && (groupData.adminId === user.uid || groupData.ownerId === user.uid || memberData?.role === 'admin' || memberData?.role === 'owner')) {
      const result = await listGroupJoinRequests(groupId, 20);
      setJoinRequests(Array.isArray(result?.items) ? result.items : result || []);
    } else {
      setJoinRequests([]);
    }
    setLoading(false);
  }, [groupId, user?.uid]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  // Gate on `isMember` (not the raw membership doc) so owners/admins whose privileges come
  // from group.adminId / group.ownerId still get a message listener.
  useEffect(() => {
    if (!groupId || !isMember) return undefined;
    const unsubscribe = listenGroupMessages(groupId, setMessages);
    return () => unsubscribe?.();
  }, [groupId, isMember]);

  const join = async () => {
    if (!group || !user || isOwnerOrAdmin) return;
    setBusy(true);
    try {
      if (group.privacy === 'private' && group.requireApproval !== false) {
        await requestJoinGroup(group, user, profile || {});
      } else {
        await joinPublicGroup(group, user, profile || {});
      }
      await load();
    } catch (error) {
      Alert.alert('Could not join', error?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinRequestAction = async (requestUserId, action) => {
    if (!groupId || !user?.uid || !requestUserId) return;
    setBusy(true);
    setProcessingRequestId(requestUserId);
    setRequestMessage('');
    try {
      if (action === 'approve') {
        await approveGroupJoinRequest(groupId, requestUserId, user.uid);
        setRequestMessage('Request approved successfully.');
      } else {
        await rejectGroupJoinRequest(groupId, requestUserId, user.uid);
        setRequestMessage('Request declined successfully.');
      }
      await load();
    } catch (error) {
      setRequestMessage(error?.message || 'Unable to process this request at the moment.');
    } finally {
      setBusy(false);
      setProcessingRequestId(null);
    }
  };

  const send = async () => {
    if (!draft.trim() || !group || !isMember || !canSendMessages) return;
    setBusy(true);
    try {
      await sendGroupMessage(groupId, user, profile || {}, {
        text: draft.trim(),
        attachments: [],
        replyTo: replyTo
          ? {
              id: replyTo.id,
              senderId: replyTo.senderId || '',
              senderName: replyTo.senderName || 'Student',
              text: messagePreview(replyTo),
            }
          : null,
      });
      setDraft('');
      setReplyTo(null);
      // Always follow your own message down, even if you had scrolled up.
      nearBottomRef.current = true;
      scrollToLatest(true);
    } catch (error) {
      Alert.alert('Message not sent', error?.message || 'Unable to send your message.');
    } finally {
      setBusy(false);
    }
  };

  const sendSticker = async (sticker) => {
    if (!sticker || !group || !user || !isMember || !canSendMessages || busy) return;
    setBusy(true);
    try {
      await sendGroupMessage(groupId, user, profile || {}, {
        type: 'sticker',
        stickerId: sticker.id,
        sticker: {
          id: sticker.id,
          type: sticker.type,
          assetUrl: sticker.assetUrl,
          thumbnailUrl: sticker.thumbnailUrl,
          name: sticker.name,
        },
        replyTo: replyTo
          ? {
              id: replyTo.id,
              senderId: replyTo.senderId || '',
              senderName: replyTo.senderName || 'Student',
              text: messagePreview(replyTo) || '[Sticker]',
            }
          : null,
      });
      setReplyTo(null);
      nearBottomRef.current = true;
      scrollToLatest(true);
    } catch (error) {
      Alert.alert('Sticker not sent', error?.message || 'Unable to send this sticker.');
    } finally {
      setBusy(false);
    }
  };

  const showReactionError = (message) => {
    clearTimeout(reactionErrorTimer.current);
    setReactionError(message);
    reactionErrorTimer.current = setTimeout(() => setReactionError(''), REACTION_ERROR_AUTO_DISMISS_MS);
  };

  const openReactionPicker = (message) => {
    if (!isMember || message?.deleted) return;
    Haptics.selectionAsync();
    setReactionPickerFor((current) => (current === message.id ? null : message.id));
  };

  const toggleReaction = async (message, emoji) => {
    if (!user?.uid || !groupId || !isMember) return;
    setReactionPickerFor(null);
    setReactingMessageId(message.id);
    try {
      await toggleMessageReaction(groupId, message.id, emoji, user.uid);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      showReactionError(err?.message || 'Could not add that reaction. Try again.');
    } finally {
      setReactingMessageId(null);
    }
  };

  const messageWithinEditWindow = (message) => {
    const sentAt = getMillis(message);
    return Boolean(sentAt && Date.now() - sentAt <= 60 * 60 * 1000);
  };

  const startEditingMessage = (message) => {
    if (!message || message.senderId !== user?.uid || message.type === 'sticker' || !messageWithinEditWindow(message)) return;
    setEditingMessage(message);
    setEditText(message.text || '');
    setActiveMessageActions(null);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const cancelEditingMessage = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const saveEditedMessage = async () => {
    if (!editingMessage || !editText.trim()) return;
    setBusy(true);
    try {
      await updateGroupMessage(groupId, editingMessage.id, editText, user?.uid);
      cancelEditingMessage();
    } catch (error) {
      Alert.alert('Edit failed', error.message || 'Unable to edit this message.');
    } finally {
      setBusy(false);
    }
  };

  const removeGroupMessage = (message) => {
    if (!message || message.senderId !== user?.uid || !messageWithinEditWindow(message)) return;
    Alert.alert('Delete message?', 'It will be replaced with “This message was deleted” for everyone in the group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroupMessage(groupId, message.id, user?.uid);
          } catch (error) {
            Alert.alert('Delete failed', error.message || 'Unable to delete this message.');
          }
        },
      },
    ]);
  };

  const setReplyFromSwipe = (message) => {
    if (message?.deleted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyTo(message);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const openEdit = () => {
    if (!group) return;
    setEditName(group.name || '');
    setEditDescription(group.description || '');
    setEditCategory(group.category || 'Academics');
    setEditPrivacy(group.privacy || 'public');
    setEditAllowMemberMessages(group.allowMemberMessages !== false);
    setEditRequireApproval(group.requireApproval !== false);
    setEditWelcomeMessage(group.welcomeMessage || '');
    setEditPhotoUri(null);
    setEditMessage('');
    setGroupOptionsVisible(false);
    setEditVisible(true);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setEditMessageType('error');
      setEditMessage('Photo library permission is needed to change the picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setEditPhotoUri(result.assets[0].uri);
    }
  };

  const saveEdit = async () => {
    if (!editName.trim()) {
      setEditMessageType('error');
      setEditMessage('Give the group a name.');
      return;
    }
    setSavingEdit(true);
    setEditMessage('');
    try {
      const nextPayload = {
        name: editName.trim(),
        description: editDescription.trim(),
        category: editCategory,
        privacy: editPrivacy,
        allowMemberMessages: editAllowMemberMessages,
        requireApproval: editRequireApproval,
        welcomeMessage: editWelcomeMessage.trim(),
      };

      if (editPhotoUri) {
        setUploadingPhoto(true);
        // Delete old group photo from Cloudinary before uploading new one
        const oldPhotoUrl = group?.photoURL || group?.avatarUrl || group?.coverUrl || group?.avatar?.url || group?.avatar?.secure_url || '';
        if (oldPhotoUrl && oldPhotoUrl.includes('res.cloudinary.com')) {
          try {
            const { deleteCloudinaryAssets } = await import('../../services/mediaCleanup');
            await deleteCloudinaryAssets({ urls: [oldPhotoUrl] });
          } catch (cleanupError) {
            // Non-blocking cleanup - log but don't stop the user flow
            console.log('Group photo cleanup (non-blocking):', cleanupError?.message);
          }
        }

        const uploaded = await uploadToCloudinary(
          {
            uri: editPhotoUri,
            name: `${editName.trim().replace(/\s+/g, '-').toLowerCase() || 'group'}-photo.jpg`,
            type: 'image/jpeg',
          },
          {
            resourceType: 'image',
            validationKind: 'image',
          }
        );
        nextPayload.photoURL = uploaded?.secure_url || null;
        setUploadingPhoto(false);
      }

      await updateGroup(groupId, nextPayload);
      await load();
      setEditMessageType('success');
      setEditMessage('Group updated.');
      clearTimeout(editCloseTimer.current);
      editCloseTimer.current = setTimeout(() => setEditVisible(false), 700);
    } catch (error) {
      setUploadingPhoto(false);
      setEditMessageType('error');
      setEditMessage(error?.message || 'Unable to update group.');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmLeaveGroup = () => {
    setGroupOptionsVisible(false);
    Alert.alert('Leave group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await leaveGroup(group, user.uid);
            router.replace('/community');
          } catch (error) {
            Alert.alert('Error', error?.message || 'Unable to leave group.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const activeMine = activeMessageActions && user?.uid && activeMessageActions.senderId === user.uid;
  const activeCanModify =
    Boolean(activeMine) && !activeMessageActions?.deleted && messageWithinEditWindow(activeMessageActions);

  const renderMessages = () => {
    if (!isMember) {
      return (
        <EmptyState
          title="Join to see the conversation"
          description="Members can read and send messages in this group."
        />
      );
    }
    if (!messages.length) {
      return <EmptyState title="No messages yet" description="Start the conversation when you are ready." />;
    }
    return messages.map((message, index) => {
      const mine = message.senderId === user?.uid;
      const prev = messages[index - 1];
      const next = messages[index + 1];
      const isGroupedWithPrev = inSameGroup(prev, message);
      const isGroupedWithNext = inSameGroup(message, next);
      const showHeader = !mine && !isGroupedWithPrev;
      const senderColor = colorForName(message.senderName || 'Student');
      const ms = getMillis(message);
      const prevMs = getMillis(prev);
      const showDate = Boolean(ms) && (!prevMs || !isSameDay(ms, prevMs));
      const reactionEntries = Object.entries(message.reactions || {})
        .filter(([, uids]) => Array.isArray(uids) && uids.length)
        .sort((a, b) => b[1].length - a[1].length);

      return (
        <React.Fragment key={message.id}>
          {showDate ? (
            <View style={styles.dateDividerWrap}>
              <View style={styles.dateDividerPill}>
                <Text style={styles.dateDividerText}>{dayLabel(ms)}</Text>
              </View>
            </View>
          ) : null}
          <MessageRow
            message={message}
            mine={mine}
            showHeader={showHeader}
            isGroupedWithNext={isGroupedWithNext}
            senderColor={senderColor}
            reactionEntries={reactionEntries}
            pickerOpen={reactionPickerFor === message.id}
            isReacting={reactingMessageId === message.id}
            isMember={isMember}
            colors={colors}
            styles={styles}
            user={user}
            router={router}
            formatShortTime={formatShortTime}
            initialsForName={initialsForName}
            onOpenReactionPicker={openReactionPicker}
            onToggleReaction={toggleReaction}
            onSwipeReply={setReplyFromSwipe}
            onOpenActions={setActiveMessageActions}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <ScreenShell title="Group" subtitle={group?.name || groupId} showBack loading={loading} scrollable={false}>
      {group ? (
        <View ref={containerRef} onLayout={measureKeyboardOffset} style={styles.screen}>
          {/*
            The list and the composer are siblings in one column. The composer is NOT absolutely
            positioned, so the list ends exactly where the composer starts and the last message can
            never sit underneath it. The keyboard just pads this view from the bottom.
          */}
          <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={keyboardOffset}>
            <View style={styles.chatArea}>
              <ScrollView
                ref={scrollRef}
                style={styles.flex}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={handleContentSizeChange}
                onScrollBeginDrag={() => setReactionPickerFor(null)}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              >
                {/* Group info card */}
                <View style={styles.hero}>
                  <View style={styles.heroActionsRow}>
                    {isAdmin ? (
                      <Pressable
                        style={styles.heroIconButton}
                        onPress={openEdit}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Manage group"
                      >
                        <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                      </Pressable>
                    ) : null}
                    {isMember ? (
                      <Pressable
                        style={styles.heroIconButton}
                        onPress={() => setGroupOptionsVisible(true)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Group options"
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFF" />
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroAvatar}>
                      {groupPhotoUrl ? (
                        <Image source={{ uri: groupPhotoUrl }} style={styles.heroAvatarImage} />
                      ) : (
                        <Text style={styles.heroAvatarText}>{initialsForName(group.name)}</Text>
                      )}
                    </View>
                    <View style={styles.heroTextWrap}>
                      <Text style={styles.heroTitle} numberOfLines={2}>{group.name}</Text>
                      {group.description ? (
                        <Text style={styles.heroText} numberOfLines={2}>
                          {group.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                      <Ionicons name="pricetag-outline" size={12} color="#E0E7FF" />
                      <Text style={styles.meta}>{group.category || 'General'}</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Ionicons name="people-outline" size={12} color="#E0E7FF" />
                      <Text style={styles.meta}>{pluralize(Number(group.memberCount || 0), 'member')}</Text>
                    </View>
                    {group.privacy === 'private' ? (
                      <View style={styles.metaPill}>
                        <Ionicons name="lock-closed-outline" size={12} color="#E0E7FF" />
                        <Text style={styles.meta}>Private</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Pending requests sit right under the hero so admins actually see them */}
                {isAdmin && joinRequests.length ? (
                  <View style={styles.requestsCard}>
                    <Text style={styles.requestsTitle}>Pending requests ({joinRequests.length})</Text>
                    {requestMessage ? (
                      <View style={styles.requestNotice}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.brand} />
                        <Text style={styles.requestNoticeText}>{requestMessage}</Text>
                      </View>
                    ) : null}
                    {joinRequests.map((request) => {
                      const processing = busy && processingRequestId === request.uid;
                      return (
                        <View key={request.id} style={styles.requestRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.requestName} numberOfLines={1}>{request.name || 'Student'}</Text>
                            <Text style={styles.requestMeta} numberOfLines={1}>{request.email || 'Awaiting review'}</Text>
                          </View>
                          <View style={styles.requestActions}>
                            <Pressable
                              style={[styles.requestApprove, processing && styles.requestButtonDisabled]}
                              onPress={() => handleJoinRequestAction(request.uid, 'approve')}
                              disabled={processing}
                            >
                              <Text style={styles.requestActionText}>Approve</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.requestReject, processing && styles.requestButtonDisabled]}
                              onPress={() => handleJoinRequestAction(request.uid, 'reject')}
                              disabled={processing}
                            >
                              <Text style={styles.requestActionText}>Decline</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                {!isMember ? (
                  <Pressable style={styles.joinButton} onPress={join} disabled={busy}>
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name={group.privacy === 'private' ? 'lock-closed-outline' : 'add-circle-outline'}
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.joinText}>
                          {group.privacy === 'private' ? 'Request access' : 'Join group'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : null}

                {reactionError ? (
                  <View style={styles.reactionToast}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                    <Text style={styles.reactionToastText}>{reactionError}</Text>
                  </View>
                ) : null}

                {/* Messages */}
                <View style={styles.messagesWrap}>{renderMessages()}</View>
              </ScrollView>

              {showJumpToLatest && isMember ? (
                <Pressable
                  style={styles.jumpButton}
                  onPress={() => {
                    nearBottomRef.current = true;
                    scrollToLatest(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Jump to latest message"
                >
                  <Ionicons name="chevron-down" size={20} color={colors.brand} />
                </Pressable>
              ) : null}
            </View>

            {/* Composer, docked under the list */}
            {isMember ? (
              <View style={styles.composerOuter}>
                {editingMessage ? (
                  <View style={styles.replyPreview}>
                    <View style={[styles.replyPreviewBar, { backgroundColor: colors.brand }]} />
                    <View style={styles.replyPreviewBody}>
                      <Text style={styles.replyPreviewLabel}>Editing message</Text>
                      <Text style={styles.replyPreviewText} numberOfLines={2}>{editingMessage.text || ''}</Text>
                    </View>
                    <Pressable onPress={cancelEditingMessage} hitSlop={8} accessibilityLabel="Cancel editing">
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                ) : replyTo ? (
                  <View style={styles.replyPreview}>
                    <View style={[styles.replyPreviewBar, { backgroundColor: colorForName(replyTo.senderName || 'S') }]} />
                    <View style={styles.replyPreviewBody}>
                      <Text style={styles.replyPreviewLabel}>{replyTo.senderName || 'Student'}</Text>
                      <Text style={styles.replyPreviewText} numberOfLines={1}>
                        {messagePreview(replyTo)}
                      </Text>
                    </View>
                    <Pressable onPress={() => setReplyTo(null)} hitSlop={8} accessibilityLabel="Cancel reply">
                      <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.composer,
                    // Extra home-indicator padding only when the keyboard is closed.
                    { paddingBottom: keyboardVisible ? 10 : Platform.OS === 'ios' ? 24 : 12 },
                  ]}
                >
                  {!canSendMessages ? (
                    <View style={styles.permissionNotice}>
                      <Ionicons name="lock-closed-outline" size={14} color={colors.brandDark} />
                      <Text style={styles.permissionNoticeText}>Only admins can send messages in this group.</Text>
                    </View>
                  ) : (
                    <View style={styles.composerInputRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open sticker picker"
                        style={styles.stickerButton}
                        onPress={() => setStickerPickerVisible(true)}
                        disabled={busy || Boolean(editingMessage)}
                      >
                        <Ionicons
                          name="happy-outline"
                          size={22}
                          color={editingMessage ? colors.textTertiary : colors.brand}
                        />
                      </Pressable>
                      <View style={styles.inputPill}>
                        <TextInput
                          ref={inputRef}
                          value={activeText}
                          onChangeText={editingMessage ? setEditText : setDraft}
                          placeholder={editingMessage ? 'Edit your message' : 'Write a message'}
                          placeholderTextColor={colors.textTertiary}
                          style={styles.input}
                          multiline
                          maxLength={2000}
                          accessibilityLabel="Message input"
                        />
                      </View>
                      <Pressable
                        style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
                        onPress={editingMessage ? saveEditedMessage : send}
                        disabled={!canSubmit}
                        accessibilityRole="button"
                        accessibilityLabel={editingMessage ? 'Save edit' : 'Send message'}
                      >
                        {busy ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Ionicons name={editingMessage ? 'checkmark' : 'send'} size={18} color="#fff" />
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ) : null}
          </KeyboardAvoidingView>

          <StickerPicker
            visible={stickerPickerVisible}
            onClose={() => setStickerPickerVisible(false)}
            onSelect={sendSticker}
          />
        </View>
      ) : (
        <EmptyState title="Group not found" description="This group may have been deleted or is unavailable." />
      )}

      {/* Per-message "more" sheet, opened from the bubble's ellipsis */}
      <Modal
        visible={Boolean(activeMessageActions)}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveMessageActions(null)}
      >
        <Pressable style={styles.actionSheetBackdrop} onPress={() => setActiveMessageActions(null)}>
          <Animated.View
            style={[styles.actionSheetCard, { transform: [{ translateY: messageActionsSheet.translateY }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.actionSheetHandleWrap} {...messageActionsSheet.panHandlers}>
              <View style={styles.actionSheetHandle} />
            </View>
            {activeCanModify && activeMessageActions?.type !== 'sticker' ? (
              <Pressable
                style={styles.actionSheetRow}
                onPress={() => startEditingMessage(activeMessageActions)}
              >
                <View style={styles.actionSheetIconWrap}>
                  <Ionicons name="create-outline" size={16} color={colors.brandDark} />
                </View>
                <Text style={styles.actionSheetLabel}>Edit message</Text>
              </Pressable>
            ) : null}
            {activeCanModify ? (
              <Pressable
                style={styles.actionSheetRow}
                onPress={() => {
                  const message = activeMessageActions;
                  setActiveMessageActions(null);
                  removeGroupMessage(message);
                }}
              >
                <View style={[styles.actionSheetIconWrap, styles.actionSheetIconWrapDanger]}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </View>
                <Text style={[styles.actionSheetLabel, { color: colors.danger }]}>Delete message</Text>
              </Pressable>
            ) : null}
            {!activeMessageActions?.deleted ? (
              <>
                <Pressable
                  style={styles.actionSheetRow}
                  onPress={() => {
                    setReplyTo(activeMessageActions);
                    setActiveMessageActions(null);
                    setTimeout(() => inputRef.current?.focus(), 200);
                  }}
                >
                  <View style={styles.actionSheetIconWrap}>
                    <Ionicons name="arrow-undo-outline" size={16} color={colors.brandDark} />
                  </View>
                  <Text style={styles.actionSheetLabel}>Reply</Text>
                </Pressable>
                <Pressable
                  style={styles.actionSheetRow}
                  onPress={() => {
                    const message = activeMessageActions;
                    setActiveMessageActions(null);
                    if (message) openReactionPicker(message);
                  }}
                >
                  <View style={styles.actionSheetIconWrap}>
                    <Ionicons name="happy-outline" size={16} color={colors.brandDark} />
                  </View>
                  <Text style={styles.actionSheetLabel}>React</Text>
                </Pressable>
              </>
            ) : null}
            {activeMessageActions?.senderName && !activeMessageActions?.deleted && canSendMessages ? (
              <Pressable
                style={styles.actionSheetRow}
                onPress={() => {
                  insertMention(activeMessageActions.senderName);
                  setActiveMessageActions(null);
                }}
              >
                <View style={styles.actionSheetIconWrap}>
                  <Ionicons name="at-outline" size={16} color={colors.brandDark} />
                </View>
                <Text style={styles.actionSheetLabel}>Tag {activeMessageActions.senderName}</Text>
              </Pressable>
            ) : null}
            {activeMessageActions?.senderId && !activeMine ? (
              <Pressable
                style={styles.actionSheetRow}
                onPress={() => {
                  const message = activeMessageActions;
                  setActiveMessageActions(null);
                  if (message) openDm(message);
                }}
              >
                <View style={styles.actionSheetIconWrap}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.brandDark} />
                </View>
                <Text style={styles.actionSheetLabel}>Message privately</Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Group options sheet - navigation & membership actions, draggable */}
      <Modal
        visible={groupOptionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupOptionsVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setGroupOptionsVisible(false)} />
        <View style={styles.sheetWrap}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: groupOptionsSheet.translateY }] }]}>
            <View style={styles.sheetHandleWrap} {...groupOptionsSheet.panHandlers}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.groupOptionsPreview}>
              <View style={styles.groupOptionsAvatar}>
                {groupPhotoUrl ? (
                  <Image source={{ uri: groupPhotoUrl }} style={styles.groupOptionsAvatarImage} />
                ) : (
                  <Text style={styles.groupOptionsAvatarText}>{initialsForName(group?.name)}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupOptionsName} numberOfLines={1}>{group?.name}</Text>
                <Text style={styles.groupOptionsMeta}>{pluralize(Number(group?.memberCount || 0), 'member')}</Text>
              </View>
            </View>

            <Pressable
              style={styles.linkCard}
              onPress={() => {
                setGroupOptionsVisible(false);
                router.navigate('/messages');
              }}
            >
              <View style={styles.linkIconWrap}>
                <Ionicons name="mail-outline" size={16} color={colors.brand} />
              </View>
              <Text style={styles.linkText}>Open messages</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>

            <Pressable
              style={styles.linkCard}
              onPress={() => {
                setGroupOptionsVisible(false);
                router.navigate({ pathname: '/community-settings', params: { groupId } });
              }}
            >
              <View style={styles.linkIconWrap}>
                <Ionicons name="settings-outline" size={16} color={colors.brand} />
              </View>
              <Text style={styles.linkText}>Group settings</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>

            {isAdmin ? (
              <Pressable style={styles.linkCard} onPress={openEdit}>
                <View style={styles.linkIconWrap}>
                  <Ionicons name="create-outline" size={16} color={colors.brand} />
                </View>
                <Text style={styles.linkText}>Manage this group</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ) : null}

            {isAdmin ? (
              <Pressable
                style={styles.linkCard}
                onPress={() => {
                  setGroupOptionsVisible(false);
                  router.navigate({ pathname: '/community-settings', params: { groupId } });
                }}
              >
                <View style={[styles.linkIconWrap, styles.dangerIconWrap]}>
                  <Ionicons name="person-remove-outline" size={16} color={colors.danger} />
                </View>
                {/* linkText supplies flex/size/weight; the danger style only overrides colour */}
                <Text style={[styles.linkText, styles.dangerLinkText]}>Remove member</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ) : null}

            {membership && !isAdmin ? (
              <Pressable style={styles.linkCard} onPress={confirmLeaveGroup} disabled={busy}>
                <View style={[styles.linkIconWrap, styles.dangerIconWrap]}>
                  <Ionicons name="exit-outline" size={16} color={colors.danger} />
                </View>
                <Text style={[styles.linkText, styles.dangerLinkText]}>Leave group</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      {/* Admin: manage group modal, draggable */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setEditVisible(false)} />
        <KeyboardAvoidingView behavior="padding" style={styles.sheetWrap}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: editSheet.translateY }] }]}>
            <View style={styles.sheetHandleWrap} {...editSheet.panHandlers}>
              <View style={styles.sheetHandle} />
            </View>
            <Text style={styles.sheetTitle}>Manage group</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Pressable style={styles.photoPicker} onPress={pickPhoto}>
                <View style={styles.photoCircle}>
                  {editPhotoUri ? (
                    <Image source={{ uri: editPhotoUri }} style={styles.photoImage} />
                  ) : groupPhotoUrl ? (
                    <Image source={{ uri: groupPhotoUrl }} style={styles.photoImage} />
                  ) : (
                    <Text style={styles.photoInitials}>{initialsForName(editName || group?.name)}</Text>
                  )}
                  <View style={styles.photoCameraBadge}>
                    <Ionicons name="camera" size={13} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.photoHint}>{editPhotoUri ? 'New photo selected' : 'Change group photo'}</Text>
              </Pressable>

              <Text style={styles.fieldLabel}>Group name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                style={styles.fieldInput}
                placeholder="Group name"
                placeholderTextColor={colors.textTertiary}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                style={[styles.fieldInput, styles.fieldTextArea]}
                placeholder="What's this group for?"
                placeholderTextColor={colors.textTertiary}
                multiline
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((option) => {
                  const active = option === editCategory;
                  return (
                    <Pressable
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setEditCategory(option)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Messaging permission</Text>
              <View style={styles.segmented}>
                <Pressable
                  style={[styles.segmentOption, editAllowMemberMessages && styles.segmentOptionActive]}
                  onPress={() => setEditAllowMemberMessages(true)}
                >
                  <Ionicons name="chatbubble-outline" size={14} color={editAllowMemberMessages ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.segmentText, editAllowMemberMessages && styles.segmentTextActive]}>Members can post</Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentOption, !editAllowMemberMessages && styles.segmentOptionActive]}
                  onPress={() => setEditAllowMemberMessages(false)}
                >
                  <Ionicons name="lock-closed-outline" size={14} color={!editAllowMemberMessages ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.segmentText, !editAllowMemberMessages && styles.segmentTextActive]}>Admins only</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Join approval</Text>
              <View style={styles.segmented}>
                <Pressable
                  style={[styles.segmentOption, editRequireApproval && styles.segmentOptionActive]}
                  onPress={() => setEditRequireApproval(true)}
                >
                  <Ionicons name="shield-checkmark-outline" size={14} color={editRequireApproval ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.segmentText, editRequireApproval && styles.segmentTextActive]}>Admin approval</Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentOption, !editRequireApproval && styles.segmentOptionActive]}
                  onPress={() => setEditRequireApproval(false)}
                >
                  <Ionicons name="flash-outline" size={14} color={!editRequireApproval ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.segmentText, !editRequireApproval && styles.segmentTextActive]}>Auto-join</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Welcome message</Text>
              <TextInput
                value={editWelcomeMessage}
                onChangeText={setEditWelcomeMessage}
                style={[styles.fieldInput, styles.fieldTextArea]}
                placeholder="Optional welcome note for new members"
                placeholderTextColor={colors.textTertiary}
                multiline
              />

              <Text style={styles.fieldLabel}>Privacy</Text>
              <View style={styles.segmented}>
                <Pressable
                  style={[styles.segmentOption, editPrivacy === 'public' && styles.segmentOptionActive]}
                  onPress={() => setEditPrivacy('public')}
                >
                  <Ionicons name="globe-outline" size={14} color={editPrivacy === 'public' ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.segmentText, editPrivacy === 'public' && styles.segmentTextActive]}>Public</Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentOption, editPrivacy === 'private' && styles.segmentOptionActive]}
                  onPress={() => setEditPrivacy('private')}
                >
                  <Ionicons name="lock-closed-outline" size={14} color={editPrivacy === 'private' ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.segmentText, editPrivacy === 'private' && styles.segmentTextActive]}>Private</Text>
                </Pressable>
              </View>

              {editMessage ? (
                <View style={[styles.editMessageBox, editMessageType === 'error' ? styles.editMessageError : styles.editMessageSuccess]}>
                  <Ionicons
                    name={editMessageType === 'error' ? 'alert-circle' : 'checkmark-circle'}
                    size={15}
                    color={editMessageType === 'error' ? colors.danger : colors.teal}
                  />
                  <Text style={{ color: editMessageType === 'error' ? colors.danger : colors.teal, fontSize: 12.5, flex: 1 }}>
                    {editMessage}
                  </Text>
                </View>
              ) : null}

              <Pressable style={[styles.saveButton, savingEdit && styles.saveButtonDisabled]} onPress={saveEdit} disabled={savingEdit}>
                {savingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{uploadingPhoto ? 'Uploading photo...' : 'Save changes'}</Text>
                )}
              </Pressable>

              <Pressable style={styles.cancelRow} onPress={() => setEditVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenShell>
  );
}

// Extracted so every bubble owns its own PanResponder / Animated.Value pair
// (swipe-to-reply + press scale) without recreating them on every parent render.
function MessageRow({
  message,
  mine,
  showHeader,
  isGroupedWithNext,
  senderColor,
  reactionEntries,
  pickerOpen,
  isReacting,
  isMember,
  colors,
  styles,
  user,
  router,
  formatShortTime,
  initialsForName,
  onOpenReactionPicker,
  onToggleReaction,
  onSwipeReply,
  onOpenActions,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const hasFiredHaptic = useRef(false);

  // The PanResponder is created once, so read the latest props through a ref
  // instead of capturing stale ones.
  const latest = useRef({ message, onSwipeReply });
  latest.current = { message, onSwipeReply };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        const dx = mine ? Math.min(0, gesture.dx) : Math.max(0, gesture.dx);
        const clamped = Math.max(-SWIPE_REPLY_MAX, Math.min(dx, SWIPE_REPLY_MAX));
        swipeX.setValue(clamped);
        const pastThreshold = Math.abs(clamped) >= SWIPE_REPLY_THRESHOLD;
        if (pastThreshold && !hasFiredHaptic.current) {
          hasFiredHaptic.current = true;
          Haptics.selectionAsync();
        } else if (!pastThreshold) {
          hasFiredHaptic.current = false;
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const dx = mine ? Math.min(0, gesture.dx) : Math.max(0, gesture.dx);
        if (Math.abs(dx) >= SWIPE_REPLY_THRESHOLD) {
          latest.current.onSwipeReply(latest.current.message);
        }
        hasFiredHaptic.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, bounciness: 8, speed: 16 }).start();
      },
      onPanResponderTerminate: () => {
        hasFiredHaptic.current = false;
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  const replyIconOpacity = swipeX.interpolate({
    inputRange: mine ? [-SWIPE_REPLY_THRESHOLD, 0] : [0, SWIPE_REPLY_THRESHOLD],
    outputRange: mine ? [1, 0] : [0, 1],
    extrapolate: 'clamp',
  });

  const isDeleted = Boolean(message.deleted);
  const isSticker = message.type === 'sticker' && !isDeleted;
  // Sticker bubbles are transparent, so the "mine" light-on-brand colours would be unreadable there.
  const lightFooter = mine && !isSticker;

  return (
    <View
      style={[styles.row, mine ? styles.rowMine : styles.rowTheirs, !isGroupedWithNext && styles.rowEnd]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        pointerEvents="none"
        style={[mine ? styles.swipeReplyIconMine : styles.swipeReplyIconTheirs, { opacity: replyIconOpacity }]}
      >
        <Ionicons name="arrow-undo" size={18} color={colors.brand} />
      </Animated.View>

      {!mine ? (
        <Pressable
          style={styles.avatarSlot}
          onPress={() => message.senderId && router.navigate(`/view-user-profile/${message.senderId}`)}
          disabled={!message.senderId}
        >
          {showHeader ? (
            <View style={[styles.avatar, { backgroundColor: senderColor }]}>
              <Text style={styles.avatarText}>{initialsForName(message.senderName || 'S')}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <Animated.View style={[styles.bubbleColumn, { transform: [{ translateX: swipeX }, { scale: scaleAnim }] }]}>
        <Pressable
          onLongPress={() => onOpenReactionPicker(message)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          delayLongPress={280}
          disabled={!isMember}
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            isGroupedWithNext && (mine ? styles.bubbleMineNoTail : styles.bubbleTheirsNoTail),
            isSticker && styles.bubbleSticker,
          ]}
        >
          {showHeader ? (
            <Text style={[styles.messageAuthor, { color: senderColor }]}>{message.senderName || 'Student'}</Text>
          ) : null}

          {message.replyTo ? (
            <View style={[styles.replyBlock, mine && !isSticker ? styles.replyBlockMine : styles.replyBlockTheirs]}>
              <Text style={[styles.replyAuthor, lightFooter && styles.replyAuthorMine]}>
                {message.replyTo.senderName || 'Student'}
              </Text>
              <Text style={[styles.replyText, lightFooter && styles.replyTextMine]} numberOfLines={2}>
                {message.replyTo.text || ''}
              </Text>
            </View>
          ) : null}

          {isDeleted ? (
            <Text style={[styles.messageBody, mine && styles.messageBodyMine, styles.messageDeleted]}>
              This message was deleted
            </Text>
          ) : message.type === 'sticker' ? (
            <StickerMessage message={message} isMine={mine} onLongPress={() => onOpenReactionPicker(message)} />
          ) : (
            <Text style={[styles.messageBody, mine && styles.messageBodyMine]}>{message.text || 'Attachment'}</Text>
          )}

          <View style={styles.bubbleFooter}>
            {isReacting ? (
              <ActivityIndicator size="small" color={lightFooter ? colors.brandGlow : colors.brand} style={{ marginRight: 2 }} />
            ) : null}
            {message.edited && !isDeleted ? (
              <Text style={[styles.messageTime, lightFooter && styles.messageTimeMine]}>edited</Text>
            ) : null}
            <Text style={[styles.messageTime, lightFooter && styles.messageTimeMine]}>
              {formatShortTime(message.createdAt)}
            </Text>
            {mine && !isDeleted ? (
              <Ionicons
                name="checkmark-done"
                size={14}
                color={lightFooter ? colors.brandGlow : colors.textTertiary}
              />
            ) : null}
            {!isDeleted ? (
              <Pressable
                onPress={() => onOpenActions(message)}
                hitSlop={8}
                style={styles.kebabButton}
                accessibilityRole="button"
                accessibilityLabel="Message actions"
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={13}
                  color={lightFooter ? 'rgba(255,255,255,0.85)' : colors.textTertiary}
                />
              </Pressable>
            ) : null}
          </View>
        </Pressable>

        {reactionEntries.length ? (
          <View style={[styles.reactionsRow, mine && styles.reactionsRowMine]}>
            {reactionEntries.map(([emoji, uids]) => {
              const reactedByMe = user?.uid ? uids.includes(user.uid) : false;
              return (
                <Pressable
                  key={emoji}
                  style={[styles.reactionPill, reactedByMe && styles.reactionPillActive]}
                  onPress={() => onToggleReaction(message, emoji)}
                  hitSlop={4}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={[styles.reactionCount, reactedByMe && styles.reactionCountActive]}>{uids.length}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {pickerOpen ? (
          <View style={[styles.quickReactionBar, mine && styles.quickReactionBarMine]}>
            {QUICK_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                style={({ pressed }) => [styles.quickReactionButton, pressed && styles.quickReactionButtonPressed]}
                onPress={() => onToggleReaction(message, emoji)}
                hitSlop={4}
              >
                <Text style={styles.quickReactionEmoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}