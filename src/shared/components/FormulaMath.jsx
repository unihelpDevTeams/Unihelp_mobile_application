import React, { useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Katex from 'react-native-katex';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';
import { typography, spacing } from '../theme';

// Helper to convert plain formula strings to KaTeX TeX format
export const toKatexSource = (raw) => {
  if (!raw) return '';
  return String(raw)
    .replace(/\*/g, '\\cdot ')
    .replace(/\bsqrt\(([^)]+)\)/gi, '\\sqrt{$1}')
    .replace(/([a-zA-Z0-9)\]])\^(-?[a-zA-Z0-9]+)(?![a-zA-Z0-9{])/g, '$1^{$2}')
    .replace(/([a-zA-Z0-9)\]])_(-?[a-zA-Z0-9]+)(?![a-zA-Z0-9{])/g, '$1_{$2}');
};

export default function FormulaMath({ source, color, size = 'display' }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState('loading');
  const expression = useMemo(() => toKatexSource(source), [source]);
  const isCompact = size === 'compact';

  useEffect(() => {
    setStatus('loading');
  }, [expression]);

  const fontSize = useMemo(() => {
    if (isCompact) return '1.15em';
    const len = expression.length;
    if (len > 70) return '1.1em';
    if (len > 45) return '1.4em';
    if (len > 25) return '1.7em';
    return '2em';
  }, [isCompact, expression]);

  const katexInlineStyle = useMemo(() => {
    const textColor = color || colors.brand;
    const justify = isCompact ? 'center' : 'flex-start';
    return `
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: ${justify};
        overflow-x: ${isCompact ? 'hidden' : 'auto'};
        overflow-y: hidden;
        background-color: transparent;
      }
      body {
        padding: ${isCompact ? '0' : '0 44px 0 12px'};
      }
      .katex {
        font-size: ${fontSize};
        font-weight: ${isCompact ? '700' : '600'};
        color: ${textColor};
        white-space: nowrap;
      }
      .katex-display {
        margin: 0;
        display: flex;
        justify-content: ${justify};
      }
    `;
  }, [color, colors.brand, fontSize, isCompact]);

  const styles = useThemeStyles((c, s) => ({
    katexShell: { flex: 1, justifyContent: 'center' },
    katex: { flex: 1 },
    katexOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: isCompact ? 'center' : 'flex-start',
      justifyContent: 'center',
      paddingHorizontal: isCompact ? 0 : s.md,
      backgroundColor: 'transparent',
    },
    katexFallbackScroll: { maxWidth: '100%' },
    katexFallbackText: {
      width: '100%',
      textAlign: isCompact ? 'center' : 'left',
      ...(isCompact ? typography.sm : typography.xl),
      ...(isCompact ? typography.bold : typography.extrabold),
      color: c.brand,
    },
  }));

  return (
    <View style={styles.katexShell}>
      {status !== 'ready' && status !== 'error' ? (
        <View style={styles.katexOverlay}>
          <ActivityIndicator size="small" color={colors.brand} />
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.katexOverlay}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.katexFallbackScroll}>
            <Text style={styles.katexFallbackText}>{source}</Text>
          </ScrollView>
        </View>
      ) : (
        <Katex
          expression={expression}
          style={styles.katex}
          inlineStyle={katexInlineStyle}
          displayMode
          throwOnError={false}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      )}
    </View>
  );
}
