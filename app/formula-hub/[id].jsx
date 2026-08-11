import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Katex from 'react-native-katex';

// Shared UI Components & Services
import ScreenShell from '../../src/shared/components/ScreenShell';
import { fetchRecord } from '../../services/firestoreSync';
import { COLLECTIONS } from '../../src/shared/firestoreSchema';

// Theme Context & Design System
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { shadows, typography } from '../../src/shared/theme';

// Helper to convert plain formula strings to KaTeX TeX format
const toKatexSource = (raw) => {
  if (!raw) return '';
  return String(raw)
    .replace(/\*/g, '\\cdot ')
    .replace(/\bsqrt\(([^)]+)\)/gi, '\\sqrt{$1}')
    .replace(/([a-zA-Z0-9)\]])\^(-?[a-zA-Z0-9]+)(?![a-zA-Z0-9{])/g, '$1^{$2}')
    .replace(/([a-zA-Z0-9)\]])_(-?[a-zA-Z0-9]+)(?![a-zA-Z0-9{])/g, '$1_{$2}');
};

// KaTeX Math Renderer sub-component with dynamic theme color support
//
// LEGIBILITY FIX: this component is shared between the large hero formula
// and the small variable-symbol badges. It previously rendered both at an
// identical fixed 2em font, which clipped/overflowed inside the tiny
// badge and forced long hero formulas into constant horizontal scrolling.
// `size="compact"` now renders smaller and centered for badges, and the
// default "display" size shrinks itself based on expression length so
// most formulas are fully visible without scrolling.
function FormulaMath({ source, color, size = 'display' }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState('loading');
  const expression = useMemo(() => toKatexSource(source), [source]);
  const isCompact = size === 'compact';

  // BUG FIX: previously `status` never reset when a new formula's source
  // came in on the same mounted instance, so the spinner/error state could
  // go stale and show the *previous* formula's render state momentarily.
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

  // Dynamically inject color from design system into WebView KaTeX CSS
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

// Card-shaped skeleton shown while the formula record loads — mirrors the
// real hero/info card layout instead of a generic spinner, matching the
// loading pattern used across the rest of the app.
function FormulaSkeleton() {
  const styles = useThemeStyles((c, s, r) => ({
    wrap: { padding: s.xl, gap: s.lg },
    heroSkeleton: {
      height: 190, borderRadius: r['2xl'], backgroundColor: c.brandLight,
      borderWidth: 1, borderColor: c.brandBorder, padding: s.xl, justifyContent: 'space-between',
    },
    lineWide: { height: 22, borderRadius: 6, backgroundColor: c.surfacePrimary, width: '55%' },
    formulaBlock: { height: 90, borderRadius: r.xl, backgroundColor: c.surfacePrimary },
    infoSkeleton: {
      height: 96, borderRadius: r['2xl'], backgroundColor: c.surfacePrimary,
      borderWidth: 1, borderColor: c.borderDefault, padding: s.xl, gap: s.sm,
    },
    lineNarrow: { height: 12, borderRadius: 6, backgroundColor: c.canvasLight, width: '30%' },
    lineFull: { height: 12, borderRadius: 6, backgroundColor: c.canvasLight, width: '90%' },
  }));
  return (
    <View style={styles.wrap}>
      <View style={styles.heroSkeleton}>
        <View style={styles.lineWide} />
        <View style={styles.formulaBlock} />
      </View>
      <View style={styles.infoSkeleton}>
        <View style={styles.lineNarrow} />
        <View style={styles.lineFull} />
      </View>
      <View style={styles.infoSkeleton}>
        <View style={styles.lineNarrow} />
        <View style={styles.lineFull} />
      </View>
    </View>
  );
}

export default function FormulaDetails() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();

  const [formula, setFormula] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const isMountedRef = useRef(true);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const styles = useThemeStyles((c, s, r) => ({
    scrollContent: { padding: s.xl, gap: s.lg, paddingBottom: s['4xl'] },
    heroCard: {
      backgroundColor: c.brandLight, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.brandBorder,
      padding: s.xl, ...shadows.card,
    },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md, gap: s.sm },
    heroIconWrap: { width: 40, height: 40, borderRadius: r.md, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
    heroTopRight: { flexDirection: 'row', alignItems: 'center', gap: s.sm, flexShrink: 1 },
    subjectPill: {
      maxWidth: 140, backgroundColor: c.surfacePrimary, borderRadius: r.full,
      paddingHorizontal: s.md, paddingVertical: s.xs, borderWidth: 1, borderColor: c.brandBorder,
    },
    subjectPillText: { ...typography.xs, ...typography.extrabold, color: c.brandText },
    shareButton: {
      width: 32, height: 32, borderRadius: r.md, backgroundColor: c.surfacePrimary,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.brandBorder,
    },
    shareButtonPressed: { opacity: 0.7 },
    heroTitle: { ...typography['3xl'], ...typography.extrabold, color: c.textPrimary, letterSpacing: -0.3 },
    formulaBox: {
      marginTop: s.lg, backgroundColor: c.surfacePrimary, borderRadius: r.xl, borderWidth: 1,
      borderColor: c.brandBorder, minHeight: 130, paddingVertical: s.md, paddingHorizontal: s.md,
      position: 'relative', overflow: 'hidden', ...shadows.sm,
    },
    formulaEmptyWrap: { flexDirection: 'row', alignItems: 'center', gap: s.sm, paddingVertical: s.sm },
    formulaEmptyText: { flex: 1, ...typography.sm, ...typography.medium, color: c.textSecondary },
    copyButton: {
      position: 'absolute', top: s.sm, right: s.sm, width: 32, height: 32, borderRadius: r.md,
      backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center', zIndex: 2,
    },
    copyButtonPressed: { opacity: 0.7 },
    formulaHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: s.sm },
    formulaHintText: { ...typography.xs, ...typography.medium, color: c.textSecondary },
    copiedLabel: { ...typography.xs, ...typography.bold, color: c.green },

    infoCard: {
      backgroundColor: c.surfacePrimary, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault,
      padding: s.xl, ...shadows.card,
    },
    infoHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: s.md, marginBottom: s.md },
    infoIconWrap: { width: 32, height: 32, borderRadius: r.md, alignItems: 'center', justifyContent: 'center' },
    infoTitle: { ...typography.lg, ...typography.bold, color: c.textPrimary },
    infoText: { ...typography.md, ...typography.regular, lineHeight: 22, color: c.textSecondary },
    exampleText: { ...typography.md, ...typography.regular, lineHeight: 22, color: c.textSecondary, fontStyle: 'italic' },

    variableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s.md },
    variableChip: {
      flexDirection: 'row', alignItems: 'center', gap: s.md, flexBasis: '47%', flexGrow: 1,
      backgroundColor: c.background, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault,
      paddingVertical: s.sm, paddingHorizontal: s.md,
    },
    variableSymbolBadge: { width: 48, height: 42, borderRadius: r.md, backgroundColor: c.brandLight, overflow: 'hidden' },
    variableMeaning: { flex: 1, ...typography.sm, ...typography.medium, color: c.textSecondary },

    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: s.sm, backgroundColor: c.dangerLight,
      borderRadius: r.xl, borderWidth: 1, borderColor: c.dangerBorder, margin: s.xl, padding: s.lg,
    },
    errorText: { flex: 1, color: c.danger, ...typography.sm, ...typography.semibold },
    retryButton: {
      flexDirection: 'row', alignItems: 'center', gap: s.xs, backgroundColor: c.danger,
      borderRadius: r.md, paddingHorizontal: s.md, paddingVertical: s.sm,
    },
    retryButtonPressed: { opacity: 0.85 },
    retryButtonDisabled: { opacity: 0.6 },
    retryText: { color: c.onBrand, ...typography.xs, ...typography.bold },

    notFoundCard: {
      backgroundColor: c.surfacePrimary, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.borderDefault,
      padding: s['3xl'], margin: s.xl, alignItems: 'center', ...shadows.card,
    },
    notFoundIconWrap: {
      width: 52, height: 52, borderRadius: r.xl, backgroundColor: c.background,
      alignItems: 'center', justifyContent: 'center', marginBottom: s.md,
    },
    notFoundTitle: { ...typography.xl, ...typography.bold, color: c.textPrimary },
    notFoundText: { marginTop: s.xs, ...typography.md, ...typography.regular, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
  }));

  // Single source of truth for loading the record — used on mount, id change,
  // retry, and pull-to-refresh, so all four stay in sync.
  const loadFormula = useCallback(
    async ({ silent = false } = {}) => {
      if (!id) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const result = await fetchRecord(COLLECTIONS.formulas, id);
        if (!isMountedRef.current) return;
        setFormula(result || null);
      } catch (fetchError) {
        if (isMountedRef.current) setError(fetchError?.message || 'Could not load this formula.');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [id]
  );

  useEffect(() => {
    loadFormula();
  }, [loadFormula]);

  // Dynamically map sections
  const sections = useMemo(() => {
    if (!formula) return [];

    const explanationText = formula.explanation || formula.description || formula.body || 'No description available.';
    const exampleText = formula.example || null;

    const list = [
      { title: 'Explanation', text: explanationText },
      { title: 'Subject & Category', text: `${formula.subject || 'General'} • ${formula.category || 'Formula'}` },
    ];

    if (exampleText) {
      list.push({ title: 'Worked Example', text: exampleText });
    }

    return list;
  }, [formula]);

  // LEGIBILITY FIX: when a record has no real `formula` string, the old code
  // fell back to running the plain title (or "Untitled") through KaTeX, which
  // renders ordinary words in italic math font with odd letter-spacing —
  // illegible and confusing, not a graceful fallback. Now we only hand real
  // expressions to KaTeX and show a plain message otherwise.
  const hasFormulaExpression = !!formula?.formula;
  const formulaDisplay = formula?.formula || formula?.title || 'Untitled';

  const copyFormula = async () => {
    try {
      await Clipboard.setStringAsync(formulaDisplay);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setCopied(false);
      }, 1600);
    } catch {
      // Fail silently
    }
  };

  const shareFormula = async () => {
    try {
      await Share.share({
        message: `${formula?.title || 'Formula'}\n${formulaDisplay}\n\nShared from UniHelp`,
      });
    } catch {
      // user cancelled — nothing to do
    }
  };

  // FIX: colors.info / colors.success / colors.warning don't exist on the
  // theme — they were silently falling back to hardcoded emerald/amber hex,
  // which bypasses dark mode and the app's indigo-first palette. Mapped to
  // real tokens already used elsewhere (blue / green / orange).
  const SECTION_META = {
    Explanation: { icon: 'book-outline', accent: colors.blue, soft: colors.blueLight },
    'Subject & Category': { icon: 'pricetag-outline', accent: colors.green, soft: colors.greenLight },
    'Worked Example': { icon: 'flask-outline', accent: colors.orange, soft: colors.orangeLight },
  };

  const showSkeleton = loading && !refreshing && !formula && !error;

  return (
    <ScreenShell title="Formula Details" subtitle={formula?.title || 'Formula'} showBack>
      {showSkeleton ? (
        <FormulaSkeleton />
      ) : error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => loadFormula()}
            disabled={loading}
            style={({ pressed }) => [styles.retryButton, loading && styles.retryButtonDisabled, pressed && !loading && styles.retryButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading formula"
          >
            {loading ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="refresh" size={14} color={colors.onBrand} />}
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : formula ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFormula({ silent: true })} tintColor={colors.brand} />}
        >
          {/* Main Hero Card with KaTeX Display */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="calculator-outline" size={20} color={colors.onBrand} />
              </View>
              <View style={styles.heroTopRight}>
                {formula.subject ? (
                  <View style={styles.subjectPill}>
                    <Text style={styles.subjectPillText} numberOfLines={1}>{formula.subject}</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={shareFormula}
                  hitSlop={8}
                  style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Share this formula"
                >
                  <Ionicons name="share-outline" size={15} color={colors.brand} />
                </Pressable>
              </View>
            </View>

            <Text style={styles.heroTitle}>{formula.title || 'Formula'}</Text>

            {/* LaTeX Render Container */}
            <View style={styles.formulaBox}>
              {hasFormulaExpression ? (
                <>
                  <FormulaMath source={formulaDisplay} color={colors.brand} />
                  <Pressable
                    onPress={copyFormula}
                    hitSlop={8}
                    style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Copy formula"
                  >
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? colors.green : colors.brand} />
                  </Pressable>
                </>
              ) : (
                <View style={styles.formulaEmptyWrap}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.formulaEmptyText}>No formula expression was provided for this entry.</Text>
                </View>
              )}
            </View>

            {hasFormulaExpression ? (
              <View style={styles.formulaHint}>
                <Ionicons name={copied ? 'checkmark-circle' : 'information-circle-outline'} size={13} color={copied ? colors.green : colors.textSecondary} />
                <Text style={copied ? styles.copiedLabel : styles.formulaHintText}>
                  {copied ? 'Copied formula to clipboard' : 'Tap the icon above to copy this formula'}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Variables Grid */}
          {Array.isArray(formula.variables) && formula.variables.length ? (
            <View style={styles.infoCard}>
              <View style={styles.infoHeaderRow}>
                <View style={[styles.infoIconWrap, { backgroundColor: colors.brandLight }]}>
                  <Ionicons name="apps-outline" size={16} color={colors.brand} />
                </View>
                <Text style={styles.infoTitle}>Variables</Text>
              </View>

              <View style={styles.variableGrid}>
                {formula.variables.map((variable, index) => (
                  <View key={`${variable.symbol || 'var'}-${index}`} style={styles.variableChip}>
                    <View style={styles.variableSymbolBadge}>
                      <FormulaMath source={variable.symbol || '?'} color={colors.brand} size="compact" />
                    </View>
                    <Text style={styles.variableMeaning} numberOfLines={2}>{variable.meaning || 'Meaning'}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Details Sections (Explanation, Subject, Example) */}
          {sections.map((section) => {
            const meta = SECTION_META[section.title] || { icon: 'information-circle-outline', accent: colors.brand, soft: colors.brandLight };
            return (
              <View key={section.title} style={styles.infoCard}>
                <View style={styles.infoHeaderRow}>
                  <View style={[styles.infoIconWrap, { backgroundColor: meta.soft }]}>
                    <Ionicons name={meta.icon} size={16} color={meta.accent} />
                  </View>
                  <Text style={styles.infoTitle}>{section.title}</Text>
                </View>
                <Text style={section.title === 'Worked Example' ? styles.exampleText : styles.infoText}>{section.text}</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        /* Empty / Missing Record Card */
        <View style={styles.notFoundCard}>
          <View style={styles.notFoundIconWrap}>
            <Ionicons name="search-outline" size={24} color={colors.grey} />
          </View>
          <Text style={styles.notFoundTitle}>Formula not found</Text>
          <Text style={styles.notFoundText}>
            This formula may have been moved or removed. Go back and select another entry.
          </Text>
        </View>
      )}
    </ScreenShell>
  );
}