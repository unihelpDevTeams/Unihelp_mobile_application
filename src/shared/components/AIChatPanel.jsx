import React, { useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MarkdownText from './MarkdownText';
import { ChatThinkingLoader } from './AILoaders';

const COLORS = {
  indigo: '#4F46E5',
  indigoSoft: '#EEF2FF',
  white: '#FFFFFF',
  ink: '#0F172A',
  inkSoft: '#64748B',
  border: '#E2E8F0',
};

export default function AIChatPanel({ messages = [], loading = false, emptyTitle = 'Ask Unihelp AI', emptyDescription = 'Use the assistant for summaries, explanations, quizzes, and recommendations.' }) {
  const scrollRef = useRef(null);

  const hasMessages = messages.length > 0;
  const previewMessages = useMemo(() => messages.slice(-4), [messages]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Unihelp AI</Text>
          <Text style={styles.subtitle}>Your study brain for notes, questions, tutorials, and marketplace help.</Text>
        </View>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={16} color={COLORS.indigo} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: false })}
      >
        {!hasMessages ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.indigo} />
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyDescription}>{emptyDescription}</Text>
          </View>
        ) : (
          previewMessages.map((message, index) => (
            <View key={`${message.id || index}`} style={[styles.messageRow, message.role === 'user' && styles.messageRowUser]}>
              <View style={[styles.messageBubble, message.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, message.role === 'user' ? styles.userText : styles.aiText]}>
                  {message.text}
                </Text>
              </View>
            </View>
          ))
        )}
        {loading ? (
          <ChatThinkingLoader />
        ) : null}
      </ScrollView>

      <Pressable style={styles.actionRow}>
        <Ionicons name="arrow-forward" size={15} color={COLORS.indigo} />
        <Text style={styles.actionText}>Open the full AI assistant</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  headerCopy: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.ink },
  subtitle: { marginTop: 3, fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 17 },
  iconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.indigoSoft, alignItems: 'center', justifyContent: 'center' },
  messages: { maxHeight: 180 },
  messagesContent: { gap: 8, paddingBottom: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 4 },
  emptyTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  emptyDescription: { fontSize: 12, color: COLORS.inkSoft, textAlign: 'center' },
  messageRow: { alignItems: 'flex-start' },
  messageRowUser: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '88%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  aiBubble: { backgroundColor: COLORS.indigoSoft },
  userBubble: { backgroundColor: COLORS.indigo },
  messageText: { fontSize: 12.5, lineHeight: 18 },
  aiText: { color: COLORS.ink },
  userText: { color: COLORS.white },
  actionRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 12.5, fontWeight: '700', color: COLORS.indigo },
});
