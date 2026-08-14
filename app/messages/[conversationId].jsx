import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import VoiceMessageBubble from '../../src/shared/components/VoiceMessageBubble';
import VoiceRecorderBar from '../../src/shared/components/VoiceRecorderBar';
import { fetchRecord } from '../../services/firestoreSync';
import {
  markConversationRead,
  listenConversationMessages,
  sendDirectMessage,
  deleteDirectMessage,
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
  const [relationship, setRelationship] = useState({ state: RELATIONSHIP.NONE });
  const [pendingMessageRequest, setPendingMessageRequest] = useState(null);
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const listRef = useRef(null);

  const styles = useThemeStyles((c, s, r) => ({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingHorizontal: 2 },
    avatarWrapper: { width: 56, height: 56, borderRadius: 18, overflow: 'hidden', backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 56, height: 56 },
    avatarFallback: { width: 56, height: 56, borderRadius: 18, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: c.brandDark, fontWeight: '800', fontSize: 24 },
    headerMeta: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    headerHint: { marginTop: 4, color: c.textSecondary, fontSize: 13 },
    messagesPane: { flex: 1 },
    listContent: { paddingTop: 18, paddingBottom: 12 },
    bubble: { borderRadius: 22, padding: 14, marginBottom: 10, maxWidth: '82%', minWidth: '50%' },
    bubblePressed: { opacity: 0.85 },
    mine: { alignSelf: 'flex-end', backgroundColor: c.brand, marginLeft: 48 },
    theirs: { alignSelf: 'flex-start', backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, marginRight: 48 },
    bubbleDeleted: { opacity: 0.7 },
    sender: { fontWeight: '800', fontSize: 12, color: c.textSecondary, marginBottom: 6 },
    text: { color: c.textPrimary, lineHeight: 22, fontSize: 15 },
    mineText: { color: c.onBrand },
    deletedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    deletedText: { fontSize: 13.5, fontStyle: 'italic', color: c.textSecondary },
    mineDeletedText: { color: 'rgba(255,255,255,0.8)' },
    timestamp: { marginTop: 8, fontSize: 11, color: c.textSecondary, textAlign: 'right' },
    mineTimestamp: { color: 'rgba(255,255,255,0.7)' },
    replyBlock: {
      backgroundColor: c.skeleton, borderLeftWidth: 4, borderLeftColor: c.brand,
      padding: 12, borderRadius: 16, marginBottom: 10,
    },
    replyAuthor: { fontWeight: '800', color: c.textPrimary, fontSize: 12 },
    replyText: { marginTop: 4, color: c.textSecondary, fontSize: 13 },
    replyPreview: {
      backgroundColor: c.brandLight, borderRadius: 18, padding: 12, marginBottom: 12,
    },
    replyPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    replyPreviewLabel: { fontWeight: '800', color: c.textPrimary, fontSize: 12 },
    replyCancel: { color: c.error, fontWeight: '700', fontSize: 12 },
    replyPreviewText: { color: c.textPrimary, fontSize: 13 },
    composerContainer: {
      backgroundColor: c.inputBackground, borderTopWidth: 1, borderTopColor: c.borderDefault,
    },
    composer: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 12,
      paddingTop: 14, paddingHorizontal: 12, paddingBottom: 12,
    },
    input: {
      flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: c.surfacePrimary,
      borderWidth: 1, borderColor: c.borderDefault, borderRadius: 18,
      paddingHorizontal: 14, paddingVertical: 10, color: c.textPrimary,
    },
    inputAndroid: { marginBottom: 0 },
    button: {
      backgroundColor: c.brand, borderRadius: 18, width: 48, height: 48,
      alignItems: 'center', justifyContent: 'center',
    },
    buttonDisabled: { backgroundColor: c.brandGlow },
    sheetBackdrop: { flex: 1, backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.bottomSheetBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderDefault, alignSelf: 'center', marginBottom: 14 },
    sheetPreview: {
      fontSize: 12.5, color: c.textSecondary, backgroundColor: c.surfaceSecondary,
      borderRadius: 12, padding: 10, marginBottom: 10,
    },
    sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    sheetOptionText: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    sheetCancel: { marginTop: 6, paddingVertical: 13, alignItems: 'center', borderTopWidth: 1, borderTopColor: c.borderDefault },
    sheetCancelText: { fontSize: 15, fontWeight: '700', color: c.textSecondary },
    confirmIconWrap: { alignSelf: 'center', width: 44, height: 44, borderRadius: 22, backgroundColor: c.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    confirmTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary, textAlign: 'center', marginBottom: 6 },
    confirmSubtitle: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 16, paddingHorizontal: 8 },
    confirmDeleteButton: { backgroundColor: c.error, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    confirmDeleteText: { color: c.onBrand, fontWeight: '800', fontSize: 14 },
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

  const messagePreview = (message) => {
    if (!message?.text) return '';
    const text = message.text.trim();
    return text.length > 80 ? `${text.slice(0, 80).trim()}…` : text;
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
    const unsubscribe = listenConversationMessages(conversationId, setMessages);
    return () => unsubscribe?.();
  }, [conversationId]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 120);
    }
  }, [messages]);

  useEffect(() => {
    if (conversationId && user?.uid) {
      markConversationRead(conversationId, user.uid).catch(() => {});
    }
  }, [conversationId, user?.uid, messages]);

  const otherId = conversation?.memberIds?.find((id) => id !== profile?.uid);
  const otherUser = conversation?.memberInfo?.[otherId] || {};
  const headerTitle = otherUser.name || 'Chat';
  const headerSubtitle = otherUser.email || 'Direct message';
  const areFriends = relationship.state === RELATIONSHIP.FRIENDS;
  const canChat = !otherId || areFriends;

  useEffect(() => {
    setAvatarFailed(false);
  }, [otherUser.avatar]);

  useEffect(() => {
    if (!profile?.uid || !otherId) {
      setRelationship({ state: RELATIONSHIP.NONE });
      return undefined;
    }

    return listenRelationship(profile.uid, otherId, setRelationship);
  }, [profile?.uid, otherId]);

  useEffect(() => {
    if (!profile?.uid || !otherId) {
      setPendingMessageRequest(null);
      return undefined;
    }

    return listenIncomingMessageRequests(profile.uid, (rows) => {
      const request = rows.find((item) => item.from === otherId && item.status === 'pending');
      setPendingMessageRequest(request || null);
    });
  }, [profile?.uid, otherId]);

  const handleAddFriend = async () => {
    if (!profile?.uid || !otherId) return;
    setRelationshipBusy(true);
    try {
      await sendFriendRequest({
        currentUid: profile.uid,
        targetUid: otherId,
        currentProfile: profile,
        targetProfile: { ...otherUser, uid: otherId },
      });
    } catch (error) {
      Alert.alert('Friend request', error.message || 'Could not send friend request.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const handleAcceptMessageRequest = async () => {
    if (!pendingMessageRequest || !profile?.uid) return;
    setRelationshipBusy(true);
    try {
      await acceptMessageRequest({
        request: pendingMessageRequest,
        currentUid: profile.uid,
        currentProfile: profile,
      });
    } catch (error) {
      Alert.alert('Message request', error.message || 'Could not accept request.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const handleDeclineMessageRequest = async () => {
    if (!pendingMessageRequest || !profile?.uid) return;
    setRelationshipBusy(true);
    try {
      await declineMessageRequest({
        request: pendingMessageRequest,
        currentUid: profile.uid,
        currentProfile: profile,
      });
    } catch (error) {
      Alert.alert('Message request', error.message || 'Could not decline request.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const handleAcceptFriend = async () => {
    if (!relationship.request || !profile?.uid) return;
    setRelationshipBusy(true);
    try {
      await acceptFriendRequest({
        request: relationship.request,
        currentUid: profile.uid,
        currentProfile: profile,
      });
    } catch (error) {
      Alert.alert('Friend request', error.message || 'Could not accept friend request.');
    } finally {
      setRelationshipBusy(false);
    }
  };

  const renderRelationshipPrompt = () => {
    if (!otherId || relationship.state === RELATIONSHIP.FRIENDS) return null;

    const isReceived = relationship.state === RELATIONSHIP.RECEIVED;
    const isSent = relationship.state === RELATIONSHIP.SENT;
    const isBlocked = relationship.state === RELATIONSHIP.BLOCKED;
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
            : 'You can only send one intro message before you become friends.';

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
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
    } catch (error) {
      showSendError(error);
    } finally {
      setSending(false);
    }
  };

  const showSendError = (error) => {
    Alert.alert('Message not sent', error.message || 'You can only send direct messages to friends.');
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
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
    } catch (err) {
      showSendError(err);
    }
  }, [canChat, conversation, user, profile, replyTo]);

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
      Alert.alert('Delete failed', error.message || 'Unable to delete this message.');
    } finally {
      setDeletingId(null);
      closeSheet();
    }
  };

  const isMine = (item) => item.senderId === user?.uid;

  return (
    <ScreenShell title={headerTitle} subtitle={headerSubtitle} showBack loading={loading} scrollable={false}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.avatarWrapper}
          onPress={() => otherId && router.push(`/view-user-profile/${otherId}`)}
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
          <Text style={styles.headerHint}>{conversation?.lastMessage ? `Last seen ${formatShortTime(conversation.updatedAt)}` : 'Send a message to start'}</Text>
        </View>
      </View>

      <View style={styles.messagesPane}>
        {messages.length ? (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const mine = isMine(item);
              const deleted = !!item.deleted;
              const busy = deletingId === item.id;
              const isVoice = item.type === 'voice';
              return (
                <View>
                  {!mine && !deleted ? <Text style={[styles.sender, isVoice && { marginBottom: 4 }]}>{item.senderName || 'Student'}</Text> : null}
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
            description="Send the first message in this chat."
          />
        )}
      </View>

      {renderRelationshipPrompt()}

      {canChat ? (
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
          style={styles.composerContainer}
        >
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
            <VoiceRecorderBar
              conversationId={conversationId}
              onVoiceSent={sendVoiceMessage}
            />
            <TextInput
              value={draft}
              onChangeText={setDraft}
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
        </KeyboardAvoidingView>
      ) : null}

      <Modal visible={!!activeMessage} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet} />
        <View style={styles.sheet}>
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
                <Ionicons name="trash" size={20} color={colors.error} />
              </View>
              <Text style={styles.confirmTitle}>Delete this message?</Text>
              <Text style={styles.confirmSubtitle}>
                It will be replaced with This message was deleted for everyone in this chat.
              </Text>
              <Pressable style={styles.confirmDeleteButton} onPress={handleConfirmDelete}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </Pressable>
              <Pressable style={styles.sheetCancel} onPress={() => setConfirmingDelete(false)}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </ScreenShell>
  );
}
