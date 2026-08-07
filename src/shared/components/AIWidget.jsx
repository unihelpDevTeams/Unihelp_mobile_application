/**
 * AIWidget - A modular AI component for embedding in any page.
 *
 * Uses the central AI context for tool execution and displays results inline.
 * Supports all 8 tool types: summarize_notes, explain_topic, generate_quiz,
 * generate_flashcards, recommend_tutorials, announcements_digest,
 * marketplace_insight, hostel_recommendation.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAI } from '../context/AIContext';
import { WidgetIconLoader } from './AILoaders';

const COLORS = {
  indigo: '#4F46E5',
  indigoDark: '#3730A3',
  indigoSoft: '#EEF2FF',
  white: '#FFFFFF',
  ink: '#0F172A',
  inkSoft: '#64748B',
  inkLight: '#94A3B8',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
};

const TOOL_ICONS = {
  summarize_notes: 'document-text-outline',
  explain_topic: 'bulb-outline',
  generate_quiz: 'help-circle-outline',
  generate_flashcards: 'layers-outline',
  recommend_tutorials: 'school-outline',
  announcements_digest: 'megaphone-outline',
  marketplace_insight: 'cart-outline',
  hostel_recommendation: 'home-outline',
};

const TOOL_LABELS = {
  summarize_notes: 'Summarize Notes',
  explain_topic: 'Explain Topic',
  generate_quiz: 'Generate Quiz',
  generate_flashcards: 'Create Flashcards',
  recommend_tutorials: 'Tutorial Recommendations',
  announcements_digest: 'Announcements Digest',
  marketplace_insight: 'Marketplace Insights',
  hostel_recommendation: 'Hostel Finder',
};

export default function AIWidget({
  tool,
  title,
  subtitle,
  icon,
  accent = COLORS.indigo,
  input = {},
  variant = 'prompt', // 'prompt' | 'inline' | 'card'
  onResult,
  children,
}) {
  const { executeTool, widgetLoading, widgetResult, clearWidgetResult } = useAI();
  const [localLoading, setLocalLoading] = useState(false);
  const [localResult, setLocalResult] = useState(null);

  const isLoading = localLoading || (widgetLoading && widgetResult?.tool === tool);
  const result = localResult || (widgetResult?.tool === tool ? widgetResult : null);

  const handlePress = async () => {
    if (isLoading) return;
    setLocalLoading(true);
    setLocalResult(null);
    clearWidgetResult();

    try {
      const res = await executeTool({ tool, input });
      setLocalResult({
        tool,
        summary: res.summary,
        items: res.items || [],
        recommendations: res.recommendations || [],
      });
      onResult?.(res);
    } catch {
      setLocalResult({ tool, summary: 'Failed to get AI response. Try again.', items: [], recommendations: [] });
    } finally {
      setLocalLoading(false);
    }
  };

  const displayIcon = icon || TOOL_ICONS[tool] || 'sparkles-outline';
  const displayTitle = title || TOOL_LABELS[tool] || 'AI Assistant';

  if (variant === 'inline' && result) {
    return (
      <View style={styles.inlineResult}>
        <View style={styles.inlineHeader}>
          <View style={[styles.inlineIcon, { backgroundColor: `${accent}14` }]}>
            <Ionicons name={displayIcon} size={16} color={accent} />
          </View>
          <Text style={styles.inlineTitle}>{displayTitle}</Text>
          <Pressable onPress={() => { setLocalResult(null); clearWidgetResult(); }} hitSlop={8}>
            <Ionicons name="close" size={16} color={COLORS.inkLight} />
          </Pressable>
        </View>
        <Text style={styles.inlineSummary}>{result.summary}</Text>
        {result.items.length > 0 && (
          <View style={styles.inlineItems}>
            {result.items.map((item, i) => (
              <View key={i} style={styles.inlineItem}>
                <Text style={styles.inlineItemTitle}>{item.title || item.question || `Item ${i + 1}`}</Text>
                {item.description ? (
                  <Text style={styles.inlineItemDesc}>{item.description}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
        {result.recommendations.length > 0 && (
          <View style={styles.inlineItems}>
            {result.recommendations.map((rec, i) => (
              <View key={i} style={styles.recommendationItem}>
                <Ionicons name="star" size={14} color={COLORS.warning} />
                <View style={styles.recCopy}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  {rec.description ? <Text style={styles.recDesc}>{rec.description}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}
        <Pressable style={styles.retryButton} onPress={handlePress} disabled={isLoading}>
          <Ionicons name="refresh" size={14} color={COLORS.indigo} />
          <Text style={styles.retryText}>Regenerate</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      {/* Prompt card / button */}
      <Pressable
        onPress={handlePress}
        disabled={isLoading}
        style={({ pressed }) => [
          variant === 'card' ? styles.card : styles.promptCard,
          { borderColor: `${accent}22` },
          pressed && styles.pressed,
          isLoading && styles.disabled,
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${accent}14` }]}>
          {isLoading ? (
            <WidgetIconLoader color={accent} size={18} />
          ) : (
            <Ionicons name={displayIcon} size={16} color={accent} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{displayTitle}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={15} color={COLORS.inkLight} />
      </Pressable>

      {/* Result shown below if exists */}
      {result && variant !== 'inline' && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>AI Result</Text>
            <Pressable onPress={() => { setLocalResult(null); clearWidgetResult(); }} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={COLORS.inkLight} />
            </Pressable>
          </View>
          <ScrollView style={styles.resultScroll} nestedScrollEnabled>
            <Text style={styles.resultSummary}>{result.summary}</Text>
            {result.items.map((item, i) => (
              <View key={i} style={styles.resultItem}>
                <Text style={styles.resultItemTitle}>{item.title || `Point ${i + 1}`}</Text>
                {item.description ? <Text style={styles.resultItemDesc}>{item.description}</Text> : null}
              </View>
            ))}
            {result.recommendations.map((rec, i) => (
              <View key={i} style={styles.recRow}>
                <Ionicons name="star" size={14} color={COLORS.warning} />
                <Text style={styles.recText}>{rec.title}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.regenerateBtn} onPress={handlePress} disabled={isLoading}>
            <Ionicons name="refresh" size={14} color={COLORS.indigo} />
            <Text style={styles.regenerateText}>Regenerate</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Prompt variant
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  pressed: { opacity: 0.9, backgroundColor: '#F8FAFC' },
  disabled: { opacity: 0.6 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  title: { fontSize: 13.5, fontWeight: '800', color: COLORS.ink },
  subtitle: { marginTop: 2, fontSize: 12, color: COLORS.inkSoft, lineHeight: 16 },

  // Result card (below prompt)
  resultCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.indigo,
  },
  resultScroll: { maxHeight: 200 },
  resultSummary: {
    fontSize: 13,
    color: COLORS.ink,
    lineHeight: 19,
    marginBottom: 10,
  },
  resultItem: {
    backgroundColor: COLORS.indigoSoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  resultItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.indigoDark,
    marginBottom: 2,
  },
  resultItemDesc: {
    fontSize: 12,
    color: COLORS.inkSoft,
    lineHeight: 16,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  recText: {
    fontSize: 12.5,
    color: COLORS.ink,
    fontWeight: '600',
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  regenerateText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.indigo,
  },

  // Inline variant
  inlineResult: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inlineIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  inlineSummary: {
    fontSize: 13,
    color: COLORS.ink,
    lineHeight: 19,
    marginBottom: 8,
  },
  inlineItems: {
    gap: 6,
    marginBottom: 8,
  },
  inlineItem: {
    backgroundColor: COLORS.indigoSoft,
    borderRadius: 10,
    padding: 10,
  },
  inlineItemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.indigoDark,
    marginBottom: 2,
  },
  inlineItemDesc: {
    fontSize: 12,
    color: COLORS.inkSoft,
    lineHeight: 16,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
  },
  recCopy: { flex: 1 },
  recTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
  recDesc: {
    fontSize: 12,
    color: COLORS.inkSoft,
    marginTop: 2,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.indigo,
  },
});