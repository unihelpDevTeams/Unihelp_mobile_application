import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
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
import {
  MODES,
  MODE_BY_ID,
  ModeCard,
  ContextForm,
  SessionBar,
  ResponseActionsRow,
  LOADING_LABELS,
} from './_studyTools';

const initialMessages = [
  {
    role: 'assistant',
    text: "Welcome to your academic workspace. Pick a tool below to solve, explain, practice, summarize, plan, or research — or just ask me anything.",
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

// ---------------------------------------------------------------------------
// Small entrance animation wrapper — fades + slides up on mount only.
// ---------------------------------------------------------------------------
function FadeInUp({ children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

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
  const [inputFocused, setInputFocused] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const lastPromptRef = useRef('');

  const [activeMode, setActiveMode] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [sessionMeta, setSessionMeta] = useState({ subject: '', topic: '' });

  const styles = useThemeStyles((c, s, r) => ({
    container: { flex: 1 },
    scrollContent: { paddingTop: s.md, paddingHorizontal: s.lg, paddingBottom: 120 },

    topBar: { flexDirection: 'row', alignItems: 'center', gap: s.sm, paddingHorizontal: s.lg, paddingTop: s.sm, paddingBottom: s.md },
    topBarIcon: { width: 34, height: 34, borderRadius: r.md, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    topBarCopy: { flex: 1 },
    topBarTitle: { color: c.textPrimary, fontSize: 13.5, fontWeight: '900' },
    topBarSubtitle: { color: c.textSecondary, fontSize: 11.5, marginTop: 1 },
    topBarSubtitleWarn: { color: c.warning, fontWeight: '700' },
    premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.brandLight, borderRadius: r.full, paddingHorizontal: s.sm, paddingVertical: 5 },
    premiumBadgeText: { color: c.brandDark, fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
    upgradeLink: { color: c.brandText, fontSize: 11, fontWeight: '800' },

    // Home / workspace hero
    welcomeWrap: { flex: 1, paddingHorizontal: s.lg, paddingTop: s.md },
    welcomeIconRing: { width: 52, height: 52, borderRadius: r['2xl'], backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder, alignItems: 'center', justifyContent: 'center', marginBottom: s.md },
    welcomeTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '900', marginBottom: s.xs },
    welcomeText: { color: c.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: s.lg },
    sectionLabel: { color: c.textTertiary, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: s.sm },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },

    // Messages list
    messages: { gap: s.md, paddingBottom: s.md },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: s.sm, maxWidth: '100%' },
    rowAi: { alignSelf: 'flex-start', paddingRight: '6%' },
    rowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end', paddingLeft: '10%' },
    avatar: { width: 26, height: 26, borderRadius: r.sm, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    bubbleGroup: { flexShrink: 1 },
    userBubble: { backgroundColor: c.brand, alignSelf: 'flex-end', borderRadius: r['2xl'], borderBottomRightRadius: 6, padding: s.md, maxWidth: '100%' },
    userText: { color: c.onBrand, fontWeight: '600', fontSize: 13.5, lineHeight: 20.5 },
    studyCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r['2xl'], overflow: 'hidden', maxWidth: '100%' },
    studyCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: s.md, paddingTop: s.sm, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    studyCardHeaderIcon: { width: 20, height: 20, borderRadius: r.xs, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    studyCardHeaderText: { color: c.brandText, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
    studyCardBody: { padding: s.md },
    aiText: { fontSize: 13.5, lineHeight: 20.5, color: c.textPrimary },

    timeText: { fontSize: 10.5, marginTop: 4, color: c.textTertiary },
    timeTextUser: { textAlign: 'right', marginRight: 4 },
    timeTextAi: { textAlign: 'left', marginLeft: 4 },

    errorBox: { gap: 8, backgroundColor: c.dangerLight, borderRadius: r.lg, padding: s.md },
    errorRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    errorText: { flex: 1, color: c.error, fontSize: 12.5, fontWeight: '700', lineHeight: 18 },
    retryRow: { flexDirection: 'row', gap: s.md, marginLeft: 25 },
    retryButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    retryText: { color: c.error, fontSize: 12, fontWeight: '900', textDecorationLine: 'underline' },

    composer: { backgroundColor: c.surface, borderRadius: 20, borderWidth: 1.5, borderColor: c.borderDefault, padding: 8, gap: 8 },
    composerFocused: { borderColor: c.brand },
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
    modeStrip: { flexGrow: 0, paddingHorizontal: 4 },
    modeStripRow: { gap: 8 },
    modeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, backgroundColor: c.brandLight, borderRadius: r.full, paddingHorizontal: s.md, borderWidth: 1, borderColor: c.brandBorder },
    modeChipActive: { backgroundColor: c.brand, borderColor: c.brand },
    modeChipPressed: { backgroundColor: c.brandBorder },
    modeChipText: { color: c.brandText, fontSize: 12, fontWeight: '800' },
    modeChipTextActive: { color: c.onBrand },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: s.xl },
    modalCard: { width: '100%', maxWidth: 360, backgroundColor: c.card, borderRadius: r['2xl'], padding: s.xl, alignItems: 'center' },
    modalIcon: { width: 52, height: 52, borderRadius: r.xl, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: s.md },
    modalTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '900', textAlign: 'center', marginBottom: s.xs },
    modalText: { color: c.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: s.lg },
    modalPrimaryButton: { width: '100%', backgroundColor: c.brand, borderRadius: r.lg, paddingVertical: 13, alignItems: 'center', marginBottom: s.sm },
    modalPrimaryText: { color: c.onBrand, fontSize: 14, fontWeight: '900' },
    modalSecondaryButton: { paddingVertical: 6 },
    modalSecondaryText: { color: c.textSecondary, fontSize: 13, fontWeight: '700' },
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
        if (!cancelled && active) setUsageStatus(nextStatus);
      } finally {
        if (!cancelled && active) setUsageLoaded(true);
      }
    };

    refreshUsageState();
    return () => {
      active = false;
      cancelled = true;
    };
  }, [profileKey, isPremium, refreshUsage]);

  useEffect(() => {
    if (providerUsageStatus) setUsageStatus(providerUsageStatus);
  }, [providerUsageStatus]);

  const quotaBlocked = usageStatus?.allowed === false;
  const lowQuota = !quotaBlocked && usageStatus && usageStatus.remaining <= 2;
  const canSend = !loading && (Boolean(prompt.trim()) || Boolean(attachment)) && !quotaBlocked;
  const isEmptyConversation = messages.length <= 1 && !loading && !error && !aiError;

  useEffect(() => {
    if (!quotaBlocked) return;
    if (isPremium) return;
    setShowUpgradeModal(true);
  }, [quotaBlocked, isPremium]);

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
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

    lastPromptRef.current = text;
    setError('');
    setPrompt('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd?.({ animated: true }));

    try {
      let uploadedAttachment = null;
      if (attachment) {
        setUploadingAttachment(true);
        const uploaded = await uploadFile(
          { uri: attachment.uri, name: attachment.name, type: attachment.mimeType || attachment.type, size: attachment.size },
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

      await sendMessage({ prompt: text, attachment: uploadedAttachment, context: { profile, mode: activeMode?.id || null } });
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd?.({ animated: true }));
      setAttachment(null);
    } catch (sendError) {
      setError(sendError?.message || 'AI is unavailable right now.');
    } finally {
      setUploadingAttachment(false);
      setRegeneratingIndex(null);
    }
  };

  const retryLastPrompt = () => {
    if (!lastPromptRef.current) return;
    sendPrompt(lastPromptRef.current);
  };

  const regenerateFrom = (aiIndex) => {
    for (let i = aiIndex - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') {
        setRegeneratingIndex(aiIndex);
        sendPrompt(messages[i].text);
        return;
      }
    }
  };

  const copyMessage = async (text, index) => {
    try {
      await Clipboard.setStringAsync(text || '');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1500);
    } catch (copyError) {
      setError(copyError?.message || 'Could not copy that text.');
    }
  };

  // ---- Mode / workspace handlers -------------------------------------------------
  const openModeForm = (mode) => setFormMode(mode);
  const cancelModeForm = () => setFormMode(null);

  const startModeSession = (mode, composedPrompt, values = {}) => {
    setActiveMode(mode);
    setSessionMeta({ subject: values.subject || '', topic: values.topic || values.question?.slice(0, 40) || '' });
    setFormMode(null);
    sendPrompt(composedPrompt);
  };

  const skipModeForm = (mode) => {
    setActiveMode(mode);
    setSessionMeta({ subject: '', topic: '' });
    setFormMode(null);
  };

  const startNewSession = () => {
    setActiveMode(null);
    setFormMode(null);
    setSessionMeta({ subject: '', topic: '' });
    setMessages(initialMessages.map((message) => ({ ...message, time: new Date() })));
  };

  const handleContextualAction = (label) => {
    sendPrompt(label);
  };

  const loadingLabel = uploadingAttachment
    ? 'Uploading attachment…'
    : regeneratingIndex !== null
      ? 'Regenerating…'
      : LOADING_LABELS[activeMode?.id] || LOADING_LABELS.default;

  return (
    <ScreenShell title="AI Assistant" subtitle="Your academic workspace" showBack scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
        style={styles.container}
      >
        {/* Compact usage / premium pill */}
        <View style={styles.topBar}>
          <View style={styles.topBarIcon}>
            <Ionicons name="sparkles" size={17} color={colors.brand} />
          </View>
          <View style={styles.topBarCopy}>
            {usageLoaded ? (
              <>
                <Text style={styles.topBarTitle}>UniHelp AI</Text>
                <Text style={[styles.topBarSubtitle, lowQuota && styles.topBarSubtitleWarn]} numberOfLines={1}>
                  {usageStatus
                    ? `${usageStatus.remaining} AI ${usageStatus.remaining === 1 ? 'token' : 'tokens'} left today`
                    : profile?.premium
                      ? 'Premium answers are longer and more detailed'
                      : 'Upgrade to Premium for longer AI answers'}
                </Text>
              </>
            ) : (
              <Text style={styles.topBarSubtitle}>Loading usage…</Text>
            )}
          </View>
          {profile?.premium ? (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={11} color={colors.indigoDark} />
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          ) : (
            !quotaBlocked && lowQuota ? (
              <Pressable onPress={() => router.push('/premium')} accessibilityRole="button" accessibilityLabel="Get more AI tokens">
                <Text style={styles.upgradeLink}>Get more</Text>
              </Pressable>
            ) : null
          )}
        </View>

        {isEmptyConversation && !activeMode ? (
          <ScrollView
            style={styles.welcomeWrap}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.welcomeIconRing}>
              <Ionicons name="sparkles" size={24} color={colors.brand} />
            </View>
            <Text style={styles.welcomeTitle}>Your academic workspace</Text>
            <Text style={styles.welcomeText}>Understand more. Practice better. Study smarter.</Text>

            {formMode ? (
              <ContextForm
                mode={formMode}
                onSubmit={(composed, values) => startModeSession(formMode, composed, values)}
                onSkip={skipModeForm}
                onCancel={cancelModeForm}
                submitting={loading}
              />
            ) : (
              <>
                <Text style={styles.sectionLabel}>Academic tools</Text>
                <View style={styles.quickGrid}>
                  {MODES.map((mode) => (
                    <ModeCard key={mode.id} mode={mode} onPress={openModeForm} disabled={loading} />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: true })}>
            {activeMode ? (
              <SessionBar
                mode={activeMode}
                subject={sessionMeta.subject}
                topic={sessionMeta.topic}
                onNewSession={startNewSession}
              />
            ) : null}

            {formMode ? (
              <ContextForm
                mode={formMode}
                onSubmit={(composed, values) => startModeSession(formMode, composed, values)}
                onSkip={skipModeForm}
                onCancel={cancelModeForm}
                submitting={loading}
              />
            ) : null}

            <View style={styles.messages}>
              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                const hasPrecedingUserMessage = !isUser && messages.slice(0, index).some((m) => m.role === 'user');

                return (
                  <FadeInUp key={`${message.role}-${index}`} style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}>
                    {!isUser ? (
                      <View style={styles.avatar}>
                        <Ionicons name="sparkles" size={13} color={colors.indigo} />
                      </View>
                    ) : null}
                    <View style={styles.bubbleGroup}>
                      {isUser ? (
                        <View style={styles.userBubble}>
                          <Text style={styles.userText}>{message.text}</Text>
                        </View>
                      ) : (
                        <View style={styles.studyCard}>
                          <View style={styles.studyCardHeader}>
                            <View style={styles.studyCardHeaderIcon}>
                              <Ionicons name={(activeMode || MODE_BY_ID.explain).icon} size={11} color={colors.brandDark} />
                            </View>
                            <Text style={styles.studyCardHeaderText}>
                              {(activeMode || { label: 'UniHelp AI' }).label}
                            </Text>
                          </View>
                          <View style={styles.studyCardBody}>
                            <MarkdownText style={styles.aiText}>{message.text}</MarkdownText>
                          </View>
                        </View>
                      )}

                      {message.time ? (
                        <Text style={[styles.timeText, isUser ? styles.timeTextUser : styles.timeTextAi]}>
                          {formatTime(message.time)}
                        </Text>
                      ) : null}

                      {!isUser ? (
                        <ResponseActionsRow
                          modeId={activeMode?.id}
                          onAction={handleContextualAction}
                          onCopy={() => copyMessage(message.text, index)}
                          onRegenerate={() => regenerateFrom(index)}
                          copied={copiedIndex === index}
                          canRegenerate={hasPrecedingUserMessage}
                          disabled={loading}
                        />
                      ) : null}
                    </View>
                  </FadeInUp>
                );
              })}

              {loading ? <ChatThinkingLoader label={loadingLabel} /> : null}

              {error || aiError ? (
                <View style={styles.errorBox}>
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={17} color={colors.danger || colors.error} />
                    <Text style={styles.errorText}>{error || aiError}</Text>
                    <Pressable onPress={() => setError('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss error">
                      <Ionicons name="close" size={16} color={colors.danger || colors.error} />
                    </Pressable>
                  </View>
                  <View style={styles.retryRow}>
                    {lastPromptRef.current ? (
                      <Pressable onPress={retryLastPrompt} disabled={loading} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry last message">
                        <Ionicons name="refresh" size={13} color={colors.error} />
                        <Text style={styles.retryText}>Try again</Text>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={startNewSession} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Start a new question">
                      <Ionicons name="add-circle-outline" size={13} color={colors.error} />
                      <Text style={styles.retryText}>Start new question</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>
        )}

        {/* Mode strip — switch tools mid-conversation without losing the composer */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeStripRow}
          keyboardShouldPersistTaps="handled"
          style={styles.modeStrip}
        >
          {MODES.map((mode) => {
            const isActive = activeMode?.id === mode.id;
            return (
              <Pressable
                key={mode.id}
                style={({ pressed }) => [styles.modeChip, isActive && styles.modeChipActive, pressed && !isActive && styles.modeChipPressed]}
                onPress={() => openModeForm(mode)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={mode.label}
              >
                <Ionicons name={mode.icon} size={13} color={isActive ? colors.onBrand : colors.brandDark} />
                <Text style={[styles.modeChipText, isActive && styles.modeChipTextActive]}>{mode.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.composer, inputFocused && styles.composerFocused]}>
          {attachment ? (
            <View style={styles.attachmentChip}>
              <View style={styles.attachmentIconWrap}>
                <Ionicons name={attachment.mimeType?.startsWith('image/') ? 'image-outline' : 'document-attach-outline'} size={14} color={colors.brandDark} />
              </View>
              <View style={styles.attachmentCopy}>
                <Text style={styles.attachmentText} numberOfLines={1}>{attachment.name}</Text>
                {attachment.size ? <Text style={styles.attachmentMeta}>{formatFileSize(attachment.size)}</Text> : null}
              </View>
              <Pressable onPress={removeAttachment} hitSlop={8} disabled={loading} accessibilityRole="button" accessibilityLabel="Remove attachment">
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
              style={({ pressed }) => [styles.attachButton, pressed && styles.attachButtonPressed, loading && styles.attachButtonDisabled]}
              onPress={pickAttachment}
              disabled={loading}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Attach a file">
              <Ionicons name="attach-outline" size={18} color={colors.brandDark} />
            </Pressable>
            <TextInput
              style={styles.composerInput}
              placeholder={activeMode ? 'Ask a follow-up…' : 'Ask UniHelp AI…'}
              placeholderTextColor={colors.textTertiary}
              value={prompt}
              onChangeText={setPrompt}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              multiline
              editable={!loading}
              accessibilityLabel="Message UniHelp AI"
            />
            <Pressable
              style={({ pressed }) => [styles.sendButton, !canSend && styles.sendButtonDisabled, pressed && canSend && styles.sendButtonPressed]}
              onPress={() => sendPrompt()}
              disabled={!canSend}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Send message"
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

      {/* In-app replacement for the previous Alert.alert() quota-blocked prompt */}
      <Modal visible={showUpgradeModal} transparent animationType="fade" onRequestClose={() => setShowUpgradeModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowUpgradeModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIcon}>
              <Ionicons name="lock-closed" size={22} color={colors.brand} />
            </View>
            <Text style={styles.modalTitle}>Daily limit reached</Text>
            <Text style={styles.modalText}>
              {"You've used today's free AI tokens. Upgrade to Premium to keep studying with UniHelp AI, or come back tomorrow."}
            </Text>
            <Pressable
              style={styles.modalPrimaryButton}
              onPress={() => {
                setShowUpgradeModal(false);
                router.replace('/premium');
              }}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Premium"
            >
              <Text style={styles.modalPrimaryText}>Upgrade to Premium</Text>
            </Pressable>
            <Pressable style={styles.modalSecondaryButton} onPress={() => setShowUpgradeModal(false)} accessibilityRole="button" accessibilityLabel="Not now">
              <Text style={styles.modalSecondaryText}>Not now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}
