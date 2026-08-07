import React from 'react';
import { Platform, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

/**
 * Lightweight markdown renderer for AI responses.
 * Handles: bold, italic, inline code, code blocks, lists, headers, and paragraphs.
 * Falls back to plain text for unsupported markdown.
 */
export default function MarkdownText({ children, style }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    container: { gap: 8 },
    paragraph: { fontSize: 13.5, lineHeight: 20, color: c.textPrimary },
    header: { fontWeight: '800', color: c.textPrimary, marginTop: 4 },
    h1: { fontSize: 18, lineHeight: 24 },
    h2: { fontSize: 16, lineHeight: 22 },
    h3: { fontSize: 14.5, lineHeight: 20 },
    bold: { fontWeight: '800' },
    italic: { fontStyle: 'italic' },
    inlineCode: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      backgroundColor: c.skeletonBackground, borderRadius: 4,
      paddingHorizontal: 4, fontSize: 12.5,
    },
    codeBlock: {
      backgroundColor: c.surfaceSecondary, borderRadius: r.md,
      padding: s.md, marginVertical: s.xs,
    },
    codeBlockText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      color: c.textPrimary, fontSize: 12, lineHeight: 18,
    },
    listBlock: { gap: 4, marginVertical: s.xs },
    listItem: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
    listBullet: { width: 16, fontSize: 13.5, lineHeight: 20, color: c.brand, fontWeight: '700' },
    listItemText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: c.textPrimary },
  }));
  const text = String(children);

  // Split into blocks by double newlines
  const blocks = text.split(/\n\n+/);

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, blockIndex) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Code block (```...```)
        if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
          const code = trimmed.slice(3, -3).trim();
          return (
            <View key={blockIndex} style={styles.codeBlock}>
              <Text style={styles.codeBlockText}>{code}</Text>
            </View>
          );
        }

        // Unordered list
        if (trimmed.split('\n').every((line) => /^\s*[-*+]\s/.test(line.trim()))) {
          return (
            <View key={blockIndex} style={styles.listBlock}>
              {trimmed.split('\n').map((line, lineIndex) => {
                const content = line.replace(/^\s*[-*+]\s/, '');
                return (
                  <View key={lineIndex} style={styles.listItem}>
                    <Text style={styles.listBullet}>{'\u2022'}</Text>
                    <InlineText style={styles.listItemText}>{content}</InlineText>
                  </View>
                );
              })}
            </View>
          );
        }

        // Ordered list
        if (trimmed.split('\n').every((line) => /^\s*\d+[.)]\s/.test(line.trim()))) {
          return (
            <View key={blockIndex} style={styles.listBlock}>
              {trimmed.split('\n').map((line, lineIndex) => {
                const content = line.replace(/^\s*\d+[.)]\s/, '');
                return (
                  <View key={lineIndex} style={styles.listItem}>
                    <Text style={styles.listBullet}>{lineIndex + 1}.</Text>
                    <InlineText style={styles.listItemText}>{content}</InlineText>
                  </View>
                );
              })}
            </View>
          );
        }

        // Header (## or ###)
        const headerMatch = trimmed.match(/^(#{1,3})\s(.+)/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          return (
            <Text
              key={blockIndex}
              style={[
                styles.header,
                level === 1 && styles.h1,
                level === 2 && styles.h2,
                level === 3 && styles.h3,
              ]}
            >
              <InlineText styles={styles}>{headerMatch[2]}</InlineText>
            </Text>
          );
        }

        // Regular paragraph
        return (
          <Text key={blockIndex} style={styles.paragraph}>
            <InlineText styles={styles} style={styles.paragraph}>{trimmed}</InlineText>
          </Text>
        );
      })}
    </View>
  );
}

/**
 * Renders inline markdown: **bold**, *italic*, `inline code`
 */
function InlineText({ children, style, styles }) {
  if (!children) return null;
  const text = String(children);

  // Split by inline patterns: **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          return (
            <Text key={index} style={styles.italic}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text key={index} style={styles.inlineCode}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}