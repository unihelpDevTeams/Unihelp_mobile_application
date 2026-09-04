import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import VoiceMessageBubble from '../../src/shared/components/VoiceMessageBubble';
import VoiceRecorderBar from '../../src/shared/components/VoiceRecorderBar';
import StickerPicker from '../../src/shared/components/StickerPicker';
import StickerMessage from '../../src/shared/components/StickerMessage';
import { fetchRecord } from '../../services/firestoreSync';
import {
  markConversationRead,
  sendDirectMessage,
  deleteDirectMessage,
  clearConversationForUser,
  deleteConversationForUser,
} from '../../src/shared/services/community';
import {
  RELATIONSHIP,
  acceptFriendRequest,
  acceptMessageRequest,
  declineMessageRequest,
  listenIncomingMessageRequests,
  listenRelationship,
  sendFriendRequest,
} from '../../src/shared/services/friendships';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { getSocket } from '../../src/shared/services/socket';
import { getJson } from '../../src/shared/services/backend';

const formatTime = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value?.toDate ? value.toDate() : value;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatShortTime = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value?.toDate ? value.toDate() : value;
  return date.toLocaleDateString([], { hour: 'numeric', minute: '2-digit' });
};

const toMillis = (value) => {
  if (!value) return 0;
  const date = typeof value === 'string' ? new Date(value) : value?.toDate ? value.toDate() : value;
  return Number.isNaN(date?.getTime?.()) ? 0 : date.getTime();
};

export default function ConversationPage() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const { colors } = useTheme();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [activeMessage, setActiveMessage] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [roomBusy, setRoomBusy] = useState('');
  const [relationship, setRelationship] = useState({ state: RELATIONSHIP.NONE });
  const [pendingMessageRequest, setPendingMessageRequest] = useState(null);
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [typingName, setTypingName] = useState('');
  let typingTimeout = useRef(null);

  // Modal UI States
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [dialogConfig, setDialogConfig] = useState(null);

  const listRef = useRef(null);

  const styles = useThemeStyles((c) => ({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingHorizontal: 2 },
    avatarWrapper: { width: 56, height: 56, borderRadius: 18, overflow: 'hidden', backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 56, height: 56 },
    avatarFallback: { width: 56, height: 56, borderRadius: 18, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: c.brandDark, fontWeight: '800', fontSize: 24 },
    headerMeta: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    headerHint: { marginTop: 4, color: c.textSecondary, fontSize: 13 },
    headerAction: {
      width: 38, height: 38, borderRadius: 14, backgroundColor: c.surfaceSecondary,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.borderDefault,
    },
    headerActionPressed: { opacity: 0.82 },
    messagesPane: { flex: 1 },
    listContent: { paddingTop: 20, paddingBottom: 16, paddingHorizontal: 12 },
    bubble: { 
      paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12, 
      maxWidth: '82%', minWidth: '40%',
      shadowColor: c.shadow || '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1
    },
    bubblePressed: { opacity: 0.85 },
    mine: { 
      alignSelf: 'flex-end', backgroundColor: c.brand, 
      borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 4,
      marginLeft: 48 
    },
    theirs: { 
      alignSelf: 'flex-start', backgroundColor: c.surfacePrimary, 
      borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 4,
      marginRight: 48,
      borderWidth: 1, borderColor: c.borderDefault 
    },
    bubbleDeleted: { opacity: 0.7, backgroundColor: c.skeleton, borderWidth: 0 },
    sender: { fontWeight: '700', fontSize: 12.5, color: c.brand, marginBottom: 4, marginLeft: 2 },
    text: { color: c.textPrimary, lineHeight: 22, fontSize: 15.5 },
    stickerButton: { width: 40, height: 44, borderRadius: 22, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.borderDefault },
    mineText: { color: c.onBrand },
    deletedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    deletedText: { fontSize: 13.5, fontStyle: 'italic', color: c.textSecondary },
    mineDeletedText: { color: 'rgba(255,255,255,0.8)' },
    timestamp: { marginTop: 4, fontSize: 10.5, color: c.textTertiary, textAlign: 'right' },
    mineTimestamp: { color: 'rgba(255,255,255,0.7)' },
    replyBlock: {
      backgroundColor: 'rgba(0,0,0,0.04)', borderLeftWidth: 4, borderLeftColor: c.brand,
      padding: 10, borderRadius: 12, marginBottom: 8,
    },
    replyAuthor: { fontWeight: '800', color: c.brand, fontSize: 12.5 },
    replyText: { marginTop: 2, color: c.textSecondary, fontSize: 13.5 },
    replyPreview: {
      backgroundColor: c.surfaceSecondary, borderRadius: 18, padding: 12, marginBottom: 8,
      borderLeftWidth: 4, borderLeftColor: c.brand,
    },
    replyPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    replyPreviewLabel: { fontWeight: '800', color: c.brand, fontSize: 12.5 },
    replyCancel: { color: c.textTertiary, fontWeight: '700', fontSize: 12 },
    replyPreviewText: { color: c.textPrimary, fontSize: 14 },
    composerContainer: {
      backgroundColor: c.surfacePrimary, borderTopWidth: 1, borderTopColor: c.borderDefault,
      paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 12, paddingHorizontal: 12
    },
    composer: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    },
    input: {
      flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: c.inputBackground,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 22,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: c.textPrimary,
      fontSize: 15.5, lineHeight: 20
    },
    inputAndroid: { marginBottom: 0 },
    button: {
      backgroundColor: c.brand, borderRadius: 22, width: 44, height: 44,
      alignItems: 'center', justifyContent: 'center',
    },
    buttonDisabled: { backgroundColor: c.brandGlow, opacity: 0.6 },
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.bottomSheetBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderDefault, alignSelf: 'center', marginBottom: 14 },
    sheetTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 2 },
    sheetSubtitle: { fontSize: 13, color: c.textSecondary, textAlign: 'center', marginBottom: 14 },
    sheetPreview: {
      fontSize: 12.5, color: c.textSecondary, backgroundColor: c.surfaceSecondary,
      borderRadius: 12, padding: 10, marginBottom: 10,
    },
    sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    sheetOptionText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    sheetCancel: { marginTop: 6, paddingVertical: 13, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.borderDefault },
    sheetCancelText: { fontSize: 15, fontWeight: '700', color: c.textSecondary },
    confirmIconWrap: { alignSelf: 'center', width: 48, height: 48, borderRadius: 24, backgroundColor: c.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    confirmTitle: { fontSize: 17, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 6 },
    confirmSubtitle: { fontSize: 13.5, color: c.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 20, paddingHorizontal: 8 },
    confirmDeleteButton: { backgroundColor: c.error, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    confirmDeleteText: { color: c.onBrand, fontWeight: '800', fontSize: 14 },
    dialogPrimaryBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    dialogPrimaryText: { color: c.onBrand, fontWeight: '800', fontSize: 14.5 },
    relationshipCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, padding: 14, marginBottom: 12,
    },
    relationshipIcon: {
      width: 38, height: 38, borderRadius: 14, backgroundColor: c.surfacePrimary,
      alignItems: 'center', justifyContent: 'center',
    },
    relationshipCopy: { flex: 1 },
    relationshipTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '800' },
    relationshipText: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
    relationshipButton: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.brand, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    },
    relationshipButtonMuted: { backgroundColor: c.skeleton },
    relationshipButtonText: { color: c.onBrand, fontSize: 12, fontWeight: '800' },
    relationshipButtonTextMuted: { color: c.textSecondary },
  }));

  const currentUid = user?.uid || profile?.uid;
  const otherId = conversation?.memberIds?.find((id) => id !== currentUid);
  const otherUser = conversation?.memberInfo?.[otherId] || {};
  const headerTitle = otherUser.name || 'Chat';
  const headerSubtitle = otherUser.email || 'Direct message';

  const areFriends = relationship.state === RELATIONSHIP.FRIENDS;
  const isBlocked = relationship.state === RELATIONSHIP.BLOCKED;
  const mySentMessages = messages.filter((m) => m.senderId === currentUid);
  const hasSentIntro = mySentMessages.length > 0;

  const canChat = !isBlocked && (areFriends || !hasSentIntro);

  const visibleMessages = messages.filter((message) => {
    const clearedAt = toMillis(conversation?.clearedFor?.[currentUid]);
    return !clearedAt || toMillis(message.createdAt) > clearedAt;
  });

  const messagePreview = (message) => {
    if (!message?.text) return '';
    const text = message.text.trim();
    return text.length > 80 ? `${text.slice(0, 80).trim()}…` : text;
  };

  const scrollToBottom = (animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated }), 100);
  };

  // Helper dialog handlers
  const showAlertDialog = (title, subtitle, icon = 'alert-circle-outline', iconBgColor = colors.dangerLight, iconColor = colors.error) => {
    setDialogConfig({
      title,
      subtitle,
      icon,
      iconBgColor,
      iconColor,
      primaryText: 'OK',
      primaryStyle: 'brand',
      onPrimary: () => setDialogConfig(null),
    });
  };

  const showConfirmDialog = ({ title, subtitle, icon, iconBgColor, iconColor, primaryText, primaryStyle = 'danger', onPrimary }) => {
    setDialogConfig({
      title,
      subtitle,
      icon: icon || 'help-circle-outline',
      iconBgColor: iconBgColor || (primaryStyle === 'danger' ? colors.dangerLight : colors.brandLight),
      iconColor: iconColor || (primaryStyle === 'danger' ? colors.error : colors.brand),
      primaryText: primaryText || 'Confirm',
      primaryStyle,
      onPrimary: async () => {
        setDialogConfig(null);
        await onPrimary?.();
      },
      secondaryText: 'Cancel',
      onSecondary: () => setDialogConfig(null),
    });
  };

  useEffect(() => {
    const load = async () => {
      const data = await fetchRecord('conversations', conversationId);
      setConversation(data);
      setLoading(false);
    };

    load().catch(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return undefined;
    
    // Initial load via REST API
    getJson(`/api/chat/${conversationId}/messages`)
      .then(data => {
        if (data?.success) setMessages(data.messages || []);
      })
      .catch(err => console.log('Failed to fetch messages', err));

    const socket = getSocket();
    
    const handleConnect = () => {
      socket.emit("join_conversation", conversationId);
    };

    if (socket.connected) {
      handleConnect();
    }
    
    const handleReceiveMessage = (newMessage) => {
      setMessages((prev) => {
        if (prev.find(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });
    };
    
    const handleTyping = ({ userId, isTyping, name }) => {
      if (userId === user?.uid) return;
      setIsTyping(isTyping);
      if (isTyping && name) setTypingName(name);
    };

    socket.on("connect", handleConnect);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing_update", handleTyping);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing_update", handleTyping);
    };
  }, [conversationId]);

  useEffect(() => {
    if (messages.length) scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => scrollToBottom(true));
    return () => showSub.remove();
  }, []);

  useEffect(() => {
    if (conversationId && user?.uid) {
      markConversationRead(conversationId, user.uid).catch(() => {});
    }
  }, [conversationId, user?.uid, messages]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [otherUser.avatar]);

  useEffect(() => {
    if (!currentUid || !otherId) {
      setRelationship({ state: RELATIONSHIP.NONE });
      return undefined;
    }

    return listenRelationship(currentUid, otherId, setRelationship);
  }, [currentUid, otherId]);

  useEffect(() => {
    if (!currentUid || !otherId) {
      setPendingMessageRequest(null);
      return undefined;
    }

    return listenIncomingMessageRequests(currentUid, (rows) => {
      const request = rows.find((item) => item.from === otherId && item.status === 'pending');
      setPendingMessageRequest(request || null);
    });
  }, [currentUid, otherId]);

  const handleAddFriend = async () => {
    if (!currentUid || !otherId) return;
    setRelationshipBusy(true);
    try {
      await sendFriendRequest({
        currentUid,
        targetUid: otherId,
        currentProfile: profile,
        targetProfile: { ...otherUser, uid: otherId },
      });
    } catch (error) {
      showAlertDialog('Friend request', error.message || 'Could not send friend request.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const handleAcceptMessageRequest = async () => {
    if (!pendingMessageRequest || !currentUid) return;
    setRelationshipBusy(true);
    try {
      await acceptMessageRequest({
        request: pendingMessageRequest,
        currentUid,
        currentProfile: profile,
      });
    } catch (error) {
      showAlertDialog('Message request', error.message || 'Could not accept request.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const handleDeclineMessageRequest = async () => {
    if (!pendingMessageRequest || !currentUid) return;
    setRelationshipBusy(true);
    try {
      await declineMessageRequest({
        request: pendingMessageRequest,
        currentUid,
        currentProfile: profile,
      });
    } catch (error) {
      showAlertDialog('Message request', error.message || 'Could not decline request.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const handleAcceptFriend = async () => {
    if (!relationship.request || !currentUid) return;
    setRelationshipBusy(true);
    try {
      await acceptFriendRequest({
        request: relationship.request,
        currentUid,
        currentProfile: profile,
      });
    } catch (error) {
      showAlertDialog('Friend request', error.message || 'Could not accept friend request.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const renderRelationshipPrompt = () => {
    if (!otherId || relationship.state === RELATIONSHIP.FRIENDS) return null;

    const isReceived = relationship.state === RELATIONSHIP.RECEIVED;
    const isSent = relationship.state === RELATIONSHIP.SENT;
    const hasIntroRequest = !!pendingMessageRequest;

    const title = hasIntroRequest
      ? 'Accept intro message'
      : isReceived
        ? 'Friend request waiting'
        : isSent
          ? 'Friend request sent'
          : isBlocked
            ? 'Chat unavailable'
            : 'Add friend to keep chatting';

    const text = hasIntroRequest
      ? `${headerTitle} sent you an introductory message. Accept to become friends and continue this chat.`
      : isReceived
        ? `${headerTitle} wants to connect. Accept the request to continue this chat freely.`
        : isSent
          ? 'You can continue chatting after the request is accepted.'
          : isBlocked
            ? 'Messaging is unavailable for this student.'
            : hasSentIntro
              ? 'You have sent an intro message. Add them as a friend to continue chatting.'
              : 'You can send one intro message before becoming friends.';

    return (
      <View style={styles.relationshipCard}>
        <View style={styles.relationshipIcon}>
          <Ionicons
            name={isBlocked ? 'ban-outline' : hasIntroRequest || isReceived ? 'person-add-outline' : 'people-outline'}
            size={19}
            color={isBlocked ? colors.error : colors.brandText}
          />
        </View>
        <View style={styles.relationshipCopy}>
          <Text style={styles.relationshipTitle}>{title}</Text>
          <Text style={styles.relationshipText}>{text}</Text>
        </View>
        {hasIntroRequest ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={styles.relationshipButton} onPress={handleAcceptMessageRequest} disabled={relationshipBusy}>
              {relationshipBusy ? <ActivityIndicator color={colors.onBrand} size="small" /> : <Ionicons name="checkmark" size={15} color={colors.onBrand} />}
              <Text style={styles.relationshipButtonText}>Accept</Text>
            </Pressable>
            <Pressable style={[styles.relationshipButton, styles.relationshipButtonMuted]} onPress={handleDeclineMessageRequest} disabled={relationshipBusy}>
              {relationshipBusy ? <ActivityIndicator color={colors.textSecondary} size="small" /> : <Ionicons name="close" size={15} color={colors.textSecondary} />}
              <Text style={[styles.relationshipButtonText, styles.relationshipButtonTextMuted]}>Decline</Text>
            </Pressable>
          </View>
        ) : isReceived ? (
          <Pressable style={styles.relationshipButton} onPress={handleAcceptFriend} disabled={relationshipBusy}>
            {relationshipBusy ? <ActivityIndicator color={colors.onBrand} size="small" /> : <Ionicons name="checkmark" size={15} color={colors.onBrand} />}
            <Text style={styles.relationshipButtonText}>Accept</Text>
          </Pressable>
        ) : isSent || isBlocked ? (
          <View style={[styles.relationshipButton, styles.relationshipButtonMuted]}>
            <Text style={[styles.relationshipButtonText, styles.relationshipButtonTextMuted]}>{isSent ? 'Pending' : 'Blocked'}</Text>
          </View>
        ) : (
          <Pressable style={styles.relationshipButton} onPress={handleAddFriend} disabled={relationshipBusy}>
            {relationshipBusy ? <ActivityIndicator color={colors.onBrand} size="small" /> : <Ionicons name="person-add-outline" size={15} color={colors.onBrand} />}
            <Text style={styles.relationshipButtonText}>Add</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const send = async () => {
    if (!draft.trim() || !conversation || !user || !canChat) return;
    setSending(true);
    try {
      await sendDirectMessage(conversation, user, profile || {}, {
        text: draft.trim(),
        attachments: [],
        replyTo: replyTo ? {
          id: replyTo.id,
          senderId: replyTo.senderId || '',
          senderName: replyTo.senderName || 'Student',
          text: messagePreview(replyTo),
        } : null,
      });
      setDraft('');
      setReplyTo(null);
      scrollToBottom();
      getSocket().emit("typing", { conversationId, userId: currentUid, isTyping: false });
    } catch (error) {
      showSendError(error);
    } finally {
      setSending(false);
    }
  };

  const showSendError = (error) => {
    showAlertDialog('Message not sent', error.message || 'You can only send direct messages to friends.');
    console.error('Failed to send message', error);
  };

  const sendVoiceMessage = useCallback(async (voiceResult) => {
    if (!conversation || !user || !voiceResult?.audioUrl || !canChat) return;
    try {
      await sendDirectMessage(conversation, user, profile || {}, {
        type: 'voice',
        audioUrl: voiceResult.audioUrl,
        duration: voiceResult.duration || 0,
        played: false,
        cloudinaryPublicId: voiceResult.cloudinaryPublicId || voiceResult.publicId || '',
        replyTo: replyTo ? {
          id: replyTo.id,
          senderId: replyTo.senderId || '',
          senderName: replyTo.senderName || 'Student',
          text: '[Voice Message]',
        } : null,
      });
      setReplyTo(null);
      scrollToBottom();
    } catch (err) {
      showSendError(err);
    }
  }, [canChat, conversation, user, profile, replyTo]);

  const sendSticker = async (sticker) => {
    if (!sticker || !conversation || !user || sending || !canChat) return;
    setSending(true);
    try {
      await sendDirectMessage(conversation, user, profile || {}, {
        type: 'sticker',
        stickerId: sticker.id,
        replyTo: replyTo ? { id: replyTo.id, senderId: replyTo.senderId || '', senderName: replyTo.senderName || 'Student', text: '[Sticker]' } : null,
      });
      setReplyTo(null);
      scrollToBottom();
    } catch (error) { showSendError(error); }
    finally { setSending(false); }
  };

  const closeSheet = () => {
    setActiveMessage(null);
    setConfirmingDelete(false);
  };

  const handleReplyFromSheet = () => {
    if (activeMessage) setReplyTo(activeMessage);
    closeSheet();
  };

  const handleCopyFromSheet = async () => {
    if (activeMessage?.text) {
      await Clipboard.setStringAsync(activeMessage.text);
    }
    closeSheet();
  };

  const handleConfirmDelete = async () => {
    if (!activeMessage || !conversationId) return;
    setDeletingId(activeMessage.id);
    try {
      await deleteDirectMessage(conversationId, activeMessage.id, { voice: activeMessage.type === 'voice' });
    } catch (error) {
      showAlertDialog('Delete failed', error.message || 'Unable to delete this message.');
    } finally {
      setDeletingId(null);
      closeSheet();
    }
  };

  const clearChat = async () => {
    if (!conversationId || !currentUid) return;
    setRoomBusy('clear');
    try {
      await clearConversationForUser(conversationId, currentUid);
      setReplyTo(null);
      setActiveMessage(null);
      setConversation((current) => ({
        ...current,
        clearedFor: { ...(current?.clearedFor || {}), [currentUid]: new Date() },
        unread: { ...(current?.unread || {}), [currentUid]: 0 },
      }));
    } catch (error) {
      showAlertDialog('Clear chat failed', error.message || 'Unable to clear this chat.');
    } finally {
      setRoomBusy('');
    }
  };

  const deleteChat = async () => {
    if (!conversationId || !currentUid) return;
    setRoomBusy('delete');
    try {
      await deleteConversationForUser(conversationId, currentUid);
      router.back();
    } catch (error) {
      showAlertDialog('Delete chat failed', error.message || 'Unable to delete this chat.');
      setRoomBusy('');
    }
  };

  const showChatOptions = () => {
    if (roomBusy) return;
    setShowOptionsSheet(true);
  };

  const handlePromptClearChat = () => {
    setShowOptionsSheet(false);
    setTimeout(() => {
      showConfirmDialog({
        title: 'Clear this chat?',
        subtitle: 'Messages will be removed from your view only.',
        icon: 'brush-outline',
        iconBgColor: colors.brandLight,
        iconColor: colors.brand,
        primaryText: 'Clear chat',
        primaryStyle: 'danger',
        onPrimary: clearChat,
      });
    }, 200);
  };

  const handlePromptDeleteChat = () => {
    setShowOptionsSheet(false);
    setTimeout(() => {
      showConfirmDialog({
        title: 'Delete this chat?',
        subtitle: 'This chat room will disappear from your list until a new message arrives.',
        icon: 'trash-outline',
        iconBgColor: colors.dangerLight,
        iconColor: colors.error,
        primaryText: 'Delete chat',
        primaryStyle: 'danger',
        onPrimary: deleteChat,
      });
    }, 200);
  };

  const isMine = (item) => item.senderId === user?.uid;

  return (
    <ScreenShell title={headerTitle} subtitle={headerSubtitle} showBack loading={loading} scrollable={false}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.avatarWrapper}
          onPress={() => otherId && router.navigate(`/view-user-profile/${otherId}`)}
          disabled={!otherId}
        >
          {otherUser.avatar && !avatarFailed ? (
            <Image source={{ uri: otherUser.avatar }} style={styles.avatar} onError={() => setAvatarFailed(true)} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{(otherUser.name || 'S')[0].toUpperCase()}</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.headerMeta}>
          <Text style={styles.headerName}>{headerTitle}</Text>
          <Text style={styles.headerHint}>
            {isTyping ? `${typingName || 'Student'} is typing...` : (conversation?.lastMessage ? `Last seen ${formatShortTime(conversation.updatedAt)}` : 'Send a message to start')}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}
          onPress={showChatOptions}
          disabled={!!roomBusy}
          accessibilityRole="button"
          accessibilityLabel="Open chat options"
        >
          {roomBusy ? <ActivityIndicator size="small" color={colors.brand} /> : <Ionicons name="ellipsis-vertical" size={18} color={colors.textPrimary} />}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        <View style={styles.messagesPane}>
        {visibleMessages.length ? (
          <FlatList
            ref={listRef}
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const mine = isMine(item);
              const deleted = !!item.deleted;
              const busy = deletingId === item.id;
              const isVoice = item.type === 'voice';
              const isSticker = item.type === 'sticker';
              return (
                <View>
                  {!mine && !deleted ? <Text style={[styles.sender, (isVoice || isSticker) && { marginBottom: 4 }]}>{item.senderName || 'Student'}</Text> : null}
                  {!deleted && item.replyTo ? (
                    <View style={styles.replyBlock}>
                      <Text style={styles.replyAuthor}>{item.replyTo.senderName || 'Student'}</Text>
                      <Text style={styles.replyText}>{item.replyTo.text || ''}</Text>
                    </View>
                  ) : null}
                  {deleted ? (
                    <View style={[styles.bubble, mine ? styles.mine : styles.theirs, styles.bubbleDeleted]}>
                      <View style={styles.deletedRow}>
                        <Ionicons name="ban-outline" size={14} color={mine ? 'rgba(255,255,255,0.75)' : colors.textSecondary} />
                        <Text style={[styles.deletedText, mine && styles.mineDeletedText]}>
                          {isVoice ? 'This voice message was deleted' : 'This message was deleted'}
                        </Text>
                      </View>
                      <Text style={[styles.timestamp, mine && styles.mineTimestamp]}>{formatTime(item.createdAt)}</Text>
                    </View>
                  ) : isSticker ? (
                    <StickerMessage message={item} isMine={mine} onLongPress={() => setActiveMessage(item)} />
                  ) : isVoice ? (
                    <View>
                      <VoiceMessageBubble message={item} isMine={mine} onLongPress={() => setActiveMessage(item)} />
                      <Text style={[styles.timestamp, { marginTop: -6, marginBottom: 10 }, mine && { textAlign: 'right' }]}>{formatTime(item.createdAt)}</Text>
                    </View>
                  ) : (
                    <Pressable
                      onLongPress={() => setActiveMessage(item)}
                      delayLongPress={220}
                      style={({ pressed }) => [
                        styles.bubble,
                        mine ? styles.mine : styles.theirs,
                        pressed && styles.bubblePressed,
                      ]}
                    >
                      <Text style={[styles.text, mine && styles.mineText]}>
                        {busy ? 'Deleting…' : (item.text || item.body || item.caption || 'Attachment')}
                      </Text>
                      <Text style={[styles.timestamp, mine && styles.mineTimestamp]}>{formatTime(item.createdAt)}</Text>
                    </Pressable>
                  )}
                </View>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          />
        ) : (
          <EmptyState
            title="No messages yet"
            description="Send a message to start this chat again."
          />
        )}
      </View>

      {renderRelationshipPrompt()}

      {canChat ? (
        <View style={styles.composerContainer}>
          {replyTo ? (
            <View style={styles.replyPreview}>
              <View style={styles.replyPreviewHeader}>
                <Text style={styles.replyPreviewLabel}>Replying to {replyTo.senderName || 'Student'}</Text>
                <Pressable onPress={() => setReplyTo(null)}>
                  <Text style={styles.replyCancel}>Cancel</Text>
                </Pressable>
              </View>
              <Text style={styles.replyPreviewText}>{messagePreview(replyTo)}</Text>
            </View>
          ) : null}
          <View style={styles.composer}>
            <Pressable style={styles.stickerButton} onPress={() => setStickerPickerVisible(true)} accessibilityRole="button" accessibilityLabel="Open sticker picker">
              <Ionicons name="happy-outline" size={22} color={colors.brand} />
            </Pressable>
            <VoiceRecorderBar
              conversationId={conversationId}
              onVoiceSent={sendVoiceMessage}
            />
            <TextInput
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                const socket = getSocket();
                socket.emit("typing", { conversationId, userId: currentUid, isTyping: true, name: profile?.name || user?.displayName || 'Student' });
                if (typingTimeout.current) clearTimeout(typingTimeout.current);
                typingTimeout.current = setTimeout(() => {
                  socket.emit("typing", { conversationId, userId: currentUid, isTyping: false });
                }, 2000);
              }}
              placeholder="Type a message..."
              placeholderTextColor={colors.placeholder}
              style={[styles.input, Platform.OS !== 'ios' && styles.inputAndroid]}
              multiline
            />
            <Pressable
              style={[styles.button, (!draft.trim() || sending) && styles.buttonDisabled]}
              onPress={send}
              disabled={sending || !draft.trim()}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-up" size={18} color={colors.onBrand} />}
            </Pressable>
          </View>
        </View>
      ) : null}
      </KeyboardAvoidingView>

      <StickerPicker visible={stickerPickerVisible} onClose={() => setStickerPickerVisible(false)} onSelect={sendSticker} />

      {/* Message Context Actions Sheet */}
      <Modal visible={!!activeMessage} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={styles.modalOverlay} onPress={closeSheet}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            {!confirmingDelete ? (
              <>
                <Text style={styles.sheetPreview} numberOfLines={2}>
                  {activeMessage ? messagePreview(activeMessage) : ''}
                </Text>

                <Pressable style={styles.sheetOption} onPress={handleReplyFromSheet}>
                  <Ionicons name="arrow-undo-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.sheetOptionText}>Reply</Text>
                </Pressable>

                <Pressable style={styles.sheetOption} onPress={handleCopyFromSheet}>
                  <Ionicons name="copy-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.sheetOptionText}>Copy text</Text>
                </Pressable>

                {activeMessage && isMine(activeMessage) ? (
                  <Pressable style={styles.sheetOption} onPress={() => setConfirmingDelete(true)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Text style={[styles.sheetOptionText, { color: colors.error }]}>Delete message</Text>
                  </Pressable>
                ) : null}

                <Pressable style={styles.sheetCancel} onPress={closeSheet}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.confirmIconWrap}>
                  <Ionicons name="trash" size={22} color={colors.error} />
                </View>
                <Text style={styles.confirmTitle}>Delete this message?</Text>
                <Text style={styles.confirmSubtitle}>
                  It will be replaced with &#34;This message was deleted&#34; for everyone in this chat.
                </Text>
                <Pressable style={styles.confirmDeleteButton} onPress={handleConfirmDelete}>
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                </Pressable>
                <Pressable style={styles.sheetCancel} onPress={() => setConfirmingDelete(false)}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Chat Options Sheet */}
      <Modal visible={showOptionsSheet} transparent animationType="fade" onRequestClose={() => setShowOptionsSheet(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowOptionsSheet(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Chat options</Text>
            <Text style={styles.sheetSubtitle}>Changes only affect your side of this chat.</Text>

            <Pressable style={styles.sheetOption} onPress={handlePromptClearChat}>
              <Ionicons name="brush-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.sheetOptionText}>Clear chat</Text>
            </Pressable>

            <Pressable style={styles.sheetOption} onPress={handlePromptDeleteChat}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.sheetOptionText, { color: colors.error }]}>Delete chat</Text>
            </Pressable>

            <Pressable style={styles.sheetCancel} onPress={() => setShowOptionsSheet(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom Universal Confirmation & Error Dialog Modal */}
      <Modal visible={!!dialogConfig} transparent animationType="fade" onRequestClose={() => setDialogConfig(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => dialogConfig?.onSecondary ? dialogConfig.onSecondary() : setDialogConfig(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            {dialogConfig?.icon ? (
              <View style={[styles.confirmIconWrap, { backgroundColor: dialogConfig.iconBgColor }]}>
                <Ionicons name={dialogConfig.icon} size={24} color={dialogConfig.iconColor} />
              </View>
            ) : null}

            {dialogConfig?.title ? <Text style={styles.confirmTitle}>{dialogConfig.title}</Text> : null}
            {dialogConfig?.subtitle ? <Text style={styles.confirmSubtitle}>{dialogConfig.subtitle}</Text> : null}

            <Pressable
              style={[
                styles.dialogPrimaryBtn,
                { backgroundColor: dialogConfig?.primaryStyle === 'danger' ? colors.error : colors.brand },
              ]}
              onPress={dialogConfig?.onPrimary}
            >
              <Text style={styles.dialogPrimaryText}>{dialogConfig?.primaryText || 'OK'}</Text>
            </Pressable>

            {dialogConfig?.secondaryText ? (
              <Pressable style={styles.sheetCancel} onPress={dialogConfig.onSecondary}>
                <Text style={styles.sheetCancelText}>{dialogConfig.secondaryText}</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}