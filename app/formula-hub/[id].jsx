import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Katex from 'react-native-katex';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { fetchRecord } from '../../services/firestoreSync';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  android: { elevation: 1 },
  default: {},
});

// Inline HTML/CSS injected into the KaTeX WebView. Kept minimal and transparent
// so the rendered math sits directly on top of the app's own card background.
const KATEX_INLINE_STYLE = `
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    overflow-x: auto;
    overflow-y: hidden;
    background-color: transparent;
  }
  body {
    padding: 0 16px;
  }
  .katex {
    font-size: 2.2em;
    font-weight: 700;
    color: #1D4ED8;
    white-space: nowrap;
  }
  .katex-display {
    margin: 0;
    display: flex;
    justify-content: flex-start;
  }
`;

const toKatexSource = (raw) => {
  if (!raw) return '';
  return String(raw)
    .replace(/\*/g, '\\cdot ')
    .replace(/\bsqrt\(([^)]+)\)/gi, '\\sqrt{$1}')
    .replace(/([a-zA-Z0-9)\]])\^(-?[a-zA-Z0-9]+)(?![a-zA-Z0-9{])/g, '$1^{$2}')
    .replace(/([a-zA-Z0-9)\]])_(-?[a-zA-Z0-9]+)(?![a-zA-Z0-9{])/g, '$1_{$2}');
};

function FormulaMath({ source }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState('loading');
  const expression = useMemo(() => toKatexSource(source), [source]);
  const styles = useThemeStyles((c) => ({
    katexShell: {
      flex: 1,
      justifyContent: 'center',
    },
    katex: {
      flex: 1,
    },
    katexOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingHorizontal: 16,
      backgroundColor: c.surface,
    },
    katexFallbackScroll: {
      maxWidth: '100%',
    },
    katexFallbackText: {
      width: '100%',
      fontSize: 24,
      fontWeight: '900',
      color: c.brand,
      lineHeight: 30,
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
          inlineStyle={KATEX_INLINE_STYLE}
          displayMode
          throwOnError={false}
          errorColor="#DC2626"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      )}
    </View>
  );
}

export default function FormulaDetails() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const [formula, setFormula] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const styles = useThemeStyles((c) => ({
    container: {
      gap: 12,
      paddingBottom: 24,
    },
    heroCard: {
      backgroundColor: c.brandLight,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.brandBorder,
      padding: 18,
      ...cardShadow,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    heroIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: c.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subjectPill: {
      maxWidth: 160,
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    subjectPillText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.brand,
    },
    heroTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: c.ink,
      letterSpacing: -0.3,
    },
    formulaBox: {
      marginTop: 14,
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.brandBorder,
      minHeight: 112,
      paddingVertical: 14,
      paddingHorizontal: 12,
      position: 'relative',
      overflow: 'hidden',
    },
    copyButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    copyButtonPressed: {
      opacity: 0.7,
    },
    copiedLabel: {
      marginTop: 8,
      fontSize: 11.5,
      fontWeight: '700',
      color: c.success,
    },
    infoCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      ...cardShadow,
    },
    infoHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    infoIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      color: c.ink,
    },
    infoText: {
      fontSize: 14,
      lineHeight: 21,
      color: c.inkSoft,
    },
    variableGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    variableChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexBasis: '48%',
      flexGrow: 1,
      backgroundColor: c.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    variableSymbolBadge: {
      width: 34,
      height: 30,
      borderRadius: 9,
      backgroundColor: c.brandLight,
      overflow: 'hidden',
    },
    variableMeaning: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 17,
      color: c.inkSoft,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.dangerLight,
      borderRadius: 16,
      padding: 14,
    },
    errorText: {
      flex: 1,
      color: c.danger,
      fontSize: 12.5,
      fontWeight: '700',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.danger,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    retryButtonPressed: {
      opacity: 0.85,
    },
    retryText: {
      color: c.onBrand,
      fontSize: 12,
      fontWeight: '800',
    },
    notFoundCard: {
      backgroundColor: c.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      padding: 28,
      alignItems: 'center',
    },
    notFoundIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    notFoundTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.ink,
    },
    notFoundText: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      color: c.inkSoft,
      textAlign: 'center',
    },
  }));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetchRecord(COLLECTIONS.formulas, id)
      .then((result) => {
        if (active) setFormula(result || null);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError?.message || 'Could not load this formula.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const sections = useMemo(() => {
    if (!formula) return [];

    const explanationText = formula.explanation || formula.description || formula.body || 'No description available.';
    const exampleText = formula.example || null;

    const list = [
      { title: 'Explanation', text: explanationText },
      { title: 'Subject', text: `${formula.subject || 'General'} • ${formula.category || 'Formula'}` },
    ];

    if (exampleText) {
      list.push({ title: 'Example', text: exampleText });
    }

    return list;
  }, [formula]);

  const formulaDisplay = formula?.formula || formula?.title || 'Untitled';

  const copyFormula = async () => {
    try {
      await Clipboard.setStringAsync(formulaDisplay);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fail silently
    }
  };

  const SECTION_META = {
    Explanation: { icon: 'book-outline', accent: colors.info, soft: colors.blueLight },
    Subject: { icon: 'pricetag-outline', accent: colors.success, soft: colors.greenLight },
    Example: { icon: 'flask-outline', accent: colors.warning, soft: colors.amberLight },
  };

  return (
    <ScreenShell title="Formula Details" subtitle={formula?.title || 'Formula'} showBack loading={loading}>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => setReloadKey((key) => key + 1)}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          >
            <Ionicons name="refresh" size={14} color={colors.onBrand} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : formula ? (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="calculator-outline" size={18} color={colors.onBrand} />
              </View>
              {formula.subject ? (
                <View style={styles.subjectPill}>
                  <Text style={styles.subjectPillText} numberOfLines={1}>
                    {formula.subject}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.heroTitle}>{formula.title || 'Formula'}</Text>

            <View style={styles.formulaBox}>
              <FormulaMath source={formulaDisplay} />
              <Pressable
                onPress={copyFormula}
                hitSlop={8}
                style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={15}
                  color={copied ? colors.success : colors.brand}
                />
              </Pressable>
            </View>
            {copied ? <Text style={styles.copiedLabel}>Copied to clipboard</Text> : null}
          </View>

          {Array.isArray(formula.variables) && formula.variables.length ? (
            <View style={styles.infoCard}>
              <View style={styles.infoHeaderRow}>
                <View style={[styles.infoIconWrap, { backgroundColor: colors.brandLight }]}>
                  <Ionicons name="apps-outline" size={14} color={colors.brand} />
                </View>
                <Text style={styles.infoTitle}>Variables</Text>
              </View>
              <View style={styles.variableGrid}>
                {formula.variables.map((variable, index) => (
                  <View key={`${variable.symbol || 'var'}-${index}`} style={styles.variableChip}>
                    <View style={styles.variableSymbolBadge}>
                      <FormulaMath source={variable.symbol || '?'} />
                    </View>
                    <Text style={styles.variableMeaning} numberOfLines={2}>
                      {variable.meaning || 'Meaning'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {sections.map((section) => {
            const meta = SECTION_META[section.title] || {
              icon: 'information-circle-outline',
              accent: colors.brand,
              soft: colors.brandLight,
            };
            return (
              <View key={section.title} style={styles.infoCard}>
                <View style={styles.infoHeaderRow}>
                  <View style={[styles.infoIconWrap, { backgroundColor: meta.soft }]}>
                    <Ionicons name={meta.icon} size={14} color={meta.accent} />
                  </View>
                  <Text style={styles.infoTitle}>{section.title}</Text>
                </View>
                <Text style={styles.infoText}>{section.text}</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.notFoundCard}>
          <View style={styles.notFoundIconWrap}>
            <Ionicons name="search-outline" size={22} color={colors.grey} />
          </View>
          <Text style={styles.notFoundTitle}>Formula not found</Text>
          <Text style={styles.notFoundText}>
            This formula may have been moved or removed. Go back and try another one.
          </Text>
        </View>
      )}
    </ScreenShell>
  );
}