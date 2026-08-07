import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import MarkdownText from '../../src/shared/components/MarkdownText';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { useAI } from '../../src/shared/context/AIContext';
import { uploadFile } from '../../services/cloudinary';
import { ChatThinkingLoader, UploadingLoader, ButtonLoader } from '../../src/shared/components/AILoaders';

const PROMPT_ICONS = {
  'Summarize my notes': 'document-text-outline',
  'Explain this topic simply': 'bulb-outline',
  'Build me a revision plan': 'calendar-outline',
  'Quiz me on this chapter': 'help-circle-outline',
};

const PROMPTS = Object.keys(PROMPT_ICONS);

const initialMessages = [
  {
    role: 'assistant',
    text: 'Hi, I am Unihelp AI. Ask me for explanations, summaries, quizzes, or a study plan.',
  },
];

const formatTime = (date) =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AiPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const scrollRef = useRef(null);
  const { messages, loading, error: aiError, sendMessage, setMessages, usageStatus: providerUsageStatus, refreshUsage } = useAI();
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [usageStatus, setUsageStatus] = useState(null);
  const [usageLoaded, setUsageLoaded] = useState(false);

  const styles = useThemeStyles((c, s, r) => ({
    container: { flex: 1 },
    scrollContent: { paddingTop: s.md, paddingHorizontal: s.lg, paddingBottom: 120 },

    // Status / usage card
    statusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.md,
      backgroundColor: c.card,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      marginBottom: s.md,
    },
    statusIcon: {
      width: 40,
      height: 40,
      borderRadius: r.md,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusCopy: { flex: 1 },
    statusTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '900' },
    statusText: { color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
    statusTextWarn: { color: c.warning, fontWeight: '700' },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.brandLight,
      borderRadius: r.full,
      paddingHorizontal: s.sm,
      paddingVertical: 5,
    },
    premiumBadgeText: { color: c.brandDark, fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },

    welcomeCard: { backgroundColor: c.card, borderRadius: r['3xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s.xl, marginBottom: s.xl },
    welcomeTitle: { color: c.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: s.xs },
    welcomeText: { color: c.textSecondary, fontSize: 13, lineHeight: 19 },
    usageCard: { backgroundColor: c.card, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault, padding: s.lg, marginBottom: s['2xl'], flexDirection: 'row', alignItems: 'center', gap: s.md },
    usageIconWrap: { width: 38, height: 38, borderRadius: r.md, alignItems: 'center', justifyContent: 'center' },
    usageContent: { flex: 1 },
    usageLabel: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },
    usageProgress: { color: c.textSecondary, fontSize: 11, fontWeight: '600' },
    usageUpgrade: { color: c.brandText, fontSize: 11, fontWeight: '800' },

    promptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s.xs, marginBottom: s.md },
    promptChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: s.md, paddingVertical: s.sm, borderRadius: r.full, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
    promptChipPressed: { opacity: 0.7 },
    promptChipText: { color: c.brandText, fontSize: 11, fontWeight: '800' },

    // Messages list
    messages: { gap: s.md, paddingBottom: s.md },
    messageGroup: { marginBottom: s.md },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: s.sm, maxWidth: '100%' },
    rowAi: { alignSelf: 'flex-start', paddingRight: '10%' },
    rowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end', paddingLeft: '10%' },
    avatar: {
      width: 26,
      height: 26,
      borderRadius: r.sm,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    bubbleGroup: { flexShrink: 1 },
    bubble: { maxWidth: '88%', padding: s.md, borderRadius: r['2xl'] },
    userBubble: { backgroundColor: c.brand, alignSelf: 'flex-end', borderBottomRightRadius: 6 },
    aiBubble: { backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
    loadingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bubbleText: { fontSize: 13.5, lineHeight: 20 },
    userText: { color: c.onBrand, fontWeight: '600' },
    aiText: { color: c.textPrimary },
    timeText: { fontSize: 10.5, marginTop: 4, color: c.textTertiary },
    timeTextUser: { textAlign: 'right', marginRight: 4 },
    timeTextAi: { textAlign: 'left', marginLeft: 4 },

    errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.dangerLight, borderRadius: r.lg, padding: s.md },
    errorText: { flex: 1, color: c.error, fontSize: 12.5, fontWeight: '700' },

    chipRow: { gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, backgroundColor: c.brandLight, borderRadius: r.full, paddingHorizontal: s.md, paddingVertical: 9, borderWidth: 1, borderColor: c.brandBorder },
    chipPressed: { backgroundColor: c.brandBorder },
    chipText: { color: c.brandText, fontSize: 12, fontWeight: '800' },

    composer: { backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, padding: 8, gap: 8 },
    composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    attachmentChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.brandLight, borderRadius: r.lg, paddingHorizontal: s.sm, paddingVertical: 8 },
    attachmentIconWrap: { width: 26, height: 26, borderRadius: 9, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    attachmentCopy: { flex: 1 },
    attachmentText: { color: c.brandText, fontSize: 12.5, fontWeight: '700' },
    attachmentMeta: { color: c.textSecondary, fontSize: 10.5, marginTop: 1 },
    attachButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    attachButtonPressed: { backgroundColor: c.brandBorder },
    attachButtonDisabled: { opacity: 0.4 },
    composerInput: { flex: 1, color: c.textPrimary, fontSize: 14, paddingHorizontal: 8, paddingVertical: 8, minHeight: 38, maxHeight: 110 },
    sendButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
    sendButtonPressed: { backgroundColor: c.brandDark },
    sendButtonDisabled: { opacity: 0.4 },
    uploadingIndicator: { marginLeft: 8 },
  }));

  const profileKey = profile?.uid || profile?.id || 'guest';
  const isPremium = Boolean(profile?.premium);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages(initialMessages.map((message) => ({ ...message, time: new Date() })));
    }
  }, [messages.length, setMessages]);

  useEffect(() => {
    let active = true;
    let cancelled = false;

    const refreshUsageState = async () => {
      try {
        const nextStatus = await refreshUsage();
        if (!cancelled && active) {
          setUsageStatus(nextStatus);
        }
      } finally {
        if (!cancelled && active) {
          setUsageLoaded(true);
        }
      }
    };

    refreshUsageState();
    return () => {
      active = false;
      cancelled = true;
    };
  }, [profileKey, isPremium, refreshUsage]);

  useEffect(() => {
    if (providerUsageStatus) {
      setUsageStatus(providerUsageStatus);
    }
  }, [providerUsageStatus]);

  const quotaBlocked = usageStatus?.allowed === false;
  const lowQuota = !quotaBlocked && usageStatus && usageStatus.remaining <= 2;
  const canSend = !loading && (Boolean(prompt.trim()) || Boolean(attachment)) && !quotaBlocked;

  useEffect(() => {
    if (!quotaBlocked) return;
    if (isPremium) return;
    Alert.alert('Daily limit reached', 'Upgrade to Premium to keep using AI assistance.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Upgrade', onPress: () => router.replace('/premium') },
    ]);
  }, [quotaBlocked, isPremium]);

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const normalized = {
        uri: asset.uri,
        name: asset.name || 'attachment',
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
        type: asset.mimeType || 'application/octet-stream',
      };

      if (normalized.mimeType?.startsWith('image/')) {
        const base64 = await FileSystem.readAsStringAsync(normalized.uri, { encoding: FileSystem.EncodingType.Base64 });
        setAttachment({ ...normalized, base64 });
      } else {
        setAttachment(normalized);
      }
    } catch (pickError) {
      setError(pickError?.message || 'Could not attach that file.');
    }
  };

  const removeAttachment = () => setAttachment(null);

  const sendPrompt = async (value = prompt) => {
    const text = String(value || '').trim();
    if (!text && !attachment) return;
    if (loading) return;

    setError('');
    setPrompt('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd?.({ animated: true }));

    try {
      let uploadedAttachment = null;
      if (attachment) {
        setUploadingAttachment(true);
        const uploaded = await uploadFile(
          {
            uri: attachment.uri,
            name: attachment.name,
            type: attachment.mimeType || attachment.type,
            size: attachment.size,
          },
          () => {}
        );
        uploadedAttachment = {
          name: attachment.name,
          url: uploaded?.secure_url || uploaded?.url || '',
          mimeType: attachment.mimeType || attachment.type,
          type: attachment.mimeType || attachment.type,
          base64: attachment.base64 || null,
        };
      }

      await sendMessage({ prompt: text, attachment: uploadedAttachment, context: { profile } });
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd?.({ animated: true }));
      setAttachment(null);
    } catch (sendError) {
      setError(sendError?.message || 'AI is unavailable right now.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  return (
    <ScreenShell title="AI Assistance" subtitle="Study help and quick explanations." showBack scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
        style={{ flex: 1 }}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="sparkles" size={18} color={colors.brand} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Unihelp AI</Text>
            {usageLoaded ? (
              <Text style={[styles.statusText, lowQuota && styles.statusTextWarn]} numberOfLines={2}>
                {usageStatus
                  ? `${usageStatus.remaining} ${usageStatus.remaining === 1 ? 'message' : 'messages'} left today.`
                  : profile?.premium
                    ? 'Premium answers are longer and more detailed.'
                    : 'Upgrade to Premium for longer AI answers.'}
              </Text>
            ) : (
              <Text style={styles.statusText}>Loading usage…</Text>
            )}
          </View>
          {profile?.premium ? (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={11} color={colors.indigoDark} />
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: true })}
        >
          {messages.map((message, index) => {
            const isUser = message.role === 'user';
            const showAvatar = !isUser;
            return (
              <View
                key={`${message.role}-${index}`}
                style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}
              >
                {showAvatar ? (
                  <View style={styles.avatar}>
                    <Ionicons name="sparkles" size={13} color={colors.indigo} />
                  </View>
                ) : null}
                <View style={styles.bubbleGroup}>
                  <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
                    {isUser ? (
                      <Text style={[styles.bubbleText, styles.userText]}>
                        {message.text}
                      </Text>
                    ) : (
                      <MarkdownText style={styles.bubbleText}>
                        {message.text}
                      </MarkdownText>
                    )}
                  </View>
                  {message.time ? (
                    <Text style={[styles.timeText, isUser ? styles.timeTextUser : styles.timeTextAi]}>
                      {formatTime(message.time)}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {loading ? (
            <ChatThinkingLoader label={uploadingAttachment ? 'Uploading attachment…' : 'Thinking…'} />
          ) : null}

          {error || aiError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
              <Text style={styles.errorText}>{error || aiError}</Text>
              <Pressable onPress={() => setError('')} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.danger} />
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {PROMPTS.map((label) => (
            <Pressable
              key={label}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              onPress={() => setPrompt(label)}
              disabled={loading}
            >
              <Ionicons name={PROMPT_ICONS[label]} size={13} color={colors.indigoDark} />
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          {attachment ? (
            <View style={styles.attachmentChip}>
              <View style={styles.attachmentIconWrap}>
                <Ionicons
                  name={attachment.mimeType?.startsWith('image/') ? 'image-outline' : 'document-attach-outline'}
                  size={14}
                  color={colors.brandDark}
                />
              </View>
              <View style={styles.attachmentCopy}>
                <Text style={styles.attachmentText} numberOfLines={1}>
                  {attachment.name}
                </Text>
                {attachment.size ? (
                  <Text style={styles.attachmentMeta}>{formatFileSize(attachment.size)}</Text>
                ) : null}
              </View>
              <Pressable onPress={removeAttachment} hitSlop={8} disabled={loading}>
                <Ionicons name="close-circle" size={16} color={colors.inkSoft} />
              </Pressable>
              {uploadingAttachment ? (
                <View style={styles.uploadingIndicator}>
                  <UploadingLoader />
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <Pressable
              style={({ pressed }) => [
                styles.attachButton,
                pressed && styles.attachButtonPressed,
                loading && styles.attachButtonDisabled,
              ]}
              onPress={pickAttachment}
              disabled={loading}
              hitSlop={6}
            >
              <Ionicons name="attach-outline" size={18} color={colors.brandDark} />
            </Pressable>
            <TextInput
              style={styles.composerInput}
              placeholder="Ask Unihelp AI anything..."
              placeholderTextColor={colors.textTertiary}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              editable={!loading}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                !canSend && styles.sendButtonDisabled,
                pressed && canSend && styles.sendButtonPressed,
              ]}
              onPress={() => sendPrompt()}
              disabled={!canSend}
              hitSlop={6}
            >
              {loading || uploadingAttachment ? (
                <ButtonLoader color={colors.onBrand} size={16} />
              ) : (
                <Ionicons name="arrow-up" size={18} color={colors.onBrand} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}