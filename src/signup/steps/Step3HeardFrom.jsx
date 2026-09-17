import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { colors, spacing, borderRadius } from '../../shared/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FALLBACK_ICON = 'radio-button-off-outline';

function SkeletonChip({ delay }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 750,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, delay]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.75] });

  return <Animated.View style={[styles.skeletonChip, { opacity }]} />;
}

function OptionChip({ option, active, onPress, index }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        delay: Math.min(index, 8) * 30,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        delay: Math.min(index, 8) * 30,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, index]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.chipWrapper, { opacity, transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.option, active && styles.optionActive]}
      >
        {option.logoUrl ? (
          <Image source={{ uri: option.logoUrl }} style={styles.optionLogo} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.optionIconWrap, active && styles.optionIconWrapActive]}>
            <Ionicons
              name={option.icon || FALLBACK_ICON}
              size={14}
              color={active ? colors.brand : colors.grey}
            />
          </View>
        )}
        <View style={styles.optionCopy}>
          <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
            {option.name}
          </Text>
          {option.category || option.description ? (
            <Text style={styles.optionMeta} numberOfLines={1}>
              {option.description || option.category}
            </Text>
          ) : null}
        </View>
        {active && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={10} color={colors.white} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function Step3HeardFrom({ formData, errors, updateField }) {
  const [remoteSources, setRemoteSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'marketingSources'), where('active', '==', true));
    let cancelled = false;

    const fetchSources = async () => {
      try {
        const snapshot = await getDocs(q);
        if (cancelled) return;
        const next = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((source) => source.name?.trim())
          .sort((a, b) => a.name.trim().localeCompare(b.name.trim()));
        setRemoteSources(next);
        setFetchError(false);
        setLoading(false);
      } catch (_error) {
        if (cancelled) return;
        setRemoteSources([]);
        setFetchError(true);
        setLoading(false);
      }
    };

    fetchSources();

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const options = useMemo(() => {
    const byName = new Map();
    remoteSources.forEach((source) => {
      const name = source.name.trim();
      byName.set(name.toLowerCase(), {
        name,
        logoUrl: source.logoUrl,
        category: source.category,
        description: source.description,
        icon: source.icon || byName.get(name.toLowerCase())?.icon,
      });
    });
    const all = Array.from(byName.values());
    const other = all.filter((source) => source.name.toLowerCase() === 'other');
    const rest = all
      .filter((source) => source.name.toLowerCase() !== 'other')
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...rest, ...other];
  }, [remoteSources]);

  const filteredOptions = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    if (!search) return options;
    return options.filter((option) => [option.name, option.category, option.description]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search)));
  }, [options, searchText]);

  const selected = formData.heardFrom || '';
  const isCustom = selected.toLowerCase() === 'other';
  const sourceCountLabel = loading ? 'Loading...' : `${options.length} options`;

  const handleSelect = (name) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    updateField('heardFrom', name);
    if (name !== 'Other') updateField('heardFromOther', '');
  };

  return (
    <View style={styles.container}>
      {/* Step Header */}
      <View style={styles.header}>
        <View style={styles.eyebrowBadge}>
          <Ionicons name="compass-outline" size={13} color={colors.brand} />
          <Text style={styles.eyebrow}>Almost done</Text>
        </View>
        <Text style={styles.title}>Where did you hear about us?</Text>
        <Text style={styles.subtitle}>
          Help us learn which partners, communities, and channels bring students to UniHelp.
        </Text>
      </View>

      {/* Main Content Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeadingWrap}>
            <Text style={styles.cardTitle}>Select Source</Text>
            <Text style={styles.cardHint}>Choose the option that fits best</Text>
          </View>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>{sourceCountLabel}</Text>
          </View>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={17} color={colors.grey} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search media sources..."
            placeholderTextColor={colors.greyLight || '#94A3B8'}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search media sources"
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText('')} accessibilityRole="button" accessibilityLabel="Clear source search">
              <Ionicons name="close-circle" size={17} color={colors.greyLight} />
            </Pressable>
          ) : null}
        </View>

        {/* Dynamic States */}
        {loading ? (
          <View style={styles.skeletonGrid}>
            {[0, 80, 150, 210, 260].map((delay) => (
              <SkeletonChip key={delay} delay={delay} />
            ))}
          </View>
        ) : (
          <>
            {fetchError ? (
              <View style={styles.sourceWarning}>
                <Ionicons name="cloud-offline-outline" size={14} color={colors.rose} />
                <Text style={styles.sourceWarningText}>Admin sources are unavailable. Try again later.</Text>
                <Pressable onPress={() => { setLoading(true); setRetryKey((value) => value + 1); }} accessibilityRole="button">
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}
            {filteredOptions.length ? (
              <View style={styles.optionGrid}>
                {filteredOptions.map((option, index) => (
                  <OptionChip
                    key={option.name}
                    option={option}
                    index={index}
                    active={selected === option.name}
                    onPress={() => handleSelect(option.name)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="search-outline" size={20} color={colors.grey} />
                </View>
                <Text style={styles.emptyTitle}>{searchText ? 'No matching sources' : 'No active sources'}</Text>
                <Text style={styles.emptyText}>{searchText ? 'Try another search term.' : 'Add and activate media sources from the admin panel.'}</Text>
              </View>
            )}
          </>
        )}

        {/* Selected Banner */}
        {selected && !isCustom ? (
          <View style={styles.selectedBanner}>
            <View style={styles.selectedCheckWrap}>
              <Ionicons name="checkmark" size={12} color={colors.white} />
            </View>
            <Text style={styles.selectedBannerText} numberOfLines={1}>
              Selected: <Text style={styles.selectedBannerValue}>{selected}</Text>
            </Text>
          </View>
        ) : null}

        {/* Custom Input Field ("Other") */}
        {isCustom ? (
          <View style={styles.customInputContainer}>
            <Text style={styles.inputLabel}>Please specify</Text>
            <View style={[styles.inputWrapper, errors.heardFromOther && styles.inputWrapperError]}>
              <Ionicons name="pencil-outline" size={16} color={colors.grey} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.heardFromOther || ''}
                placeholder="e.g. Social media, campus poster, friend"
                placeholderTextColor={colors.greyLight || '#94A3B8'}
                onChangeText={(value) => updateField('heardFromOther', value)}
                autoCapitalize="sentences"
                returnKeyType="done"
              />
            </View>
            {errors.heardFromOther ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color={colors.rose} />
                <Text style={styles.errorText}>{errors.heardFromOther}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Root Error */}
        {errors.heardFrom ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={13} color={colors.rose} />
            <Text style={styles.errorText}>{errors.heardFrom}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl || 20,
  },
  header: {
    gap: spacing.xs || 6,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full || 999,
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.grey,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl || 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg || 16,
    gap: spacing.md || 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs || 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight || '#F1F5F9',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm || 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md || 10,
    backgroundColor: colors.canvasLight || '#F8FAFC',
    paddingHorizontal: spacing.md || 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    paddingVertical: 0,
  },
  cardHeadingWrap: { flex: 1, gap: 2 },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  cardHint: { color: colors.grey, fontSize: 12 },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full || 999,
  },
  sourceBadgeText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '700',
  },
  skeletonGrid: {
    gap: spacing.sm || 8,
  },
  skeletonChip: {
    width: '100%',
    height: 68,
    borderRadius: borderRadius.md || 10,
    backgroundColor: colors.card || '#F8FAFC',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md || 12,
    gap: 4,
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card || '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  emptyText: { color: colors.grey, fontSize: 12, textAlign: 'center' },
  sourceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs || 6,
    backgroundColor: colors.redLight || '#FEF2F2',
    borderRadius: borderRadius.md || 10,
    paddingHorizontal: spacing.sm || 8,
    paddingVertical: spacing.xs || 6,
  },
  sourceWarningText: { flex: 1, color: colors.rose, fontSize: 11, fontWeight: '600' },
  retryText: { color: colors.brand, fontSize: 11, fontWeight: '800' },
  optionGrid: {
    gap: spacing.sm || 8,
  },
  chipWrapper: {
    width: '100%',
  },
  option: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md || 10,
    backgroundColor: colors.card || '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 68,
  },
  optionActive: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brand,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconWrapActive: {
    backgroundColor: colors.white,
  },
  optionLogo: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.canvasLight },
  optionCopy: { flex: 1, gap: 3 },
  optionText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  optionTextActive: { color: colors.brand, fontWeight: '700' },
  optionMeta: { color: colors.grey, fontSize: 11 },
  checkBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.greenLight || '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md || 8,
  },
  selectedCheckWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.green || '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBannerText: { flex: 1, color: colors.ink, fontSize: 12 },
  selectedBannerValue: { fontWeight: '700', color: colors.ink },
  customInputContainer: { gap: 6, marginTop: 4 },
  inputLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md || 8,
    backgroundColor: colors.card || '#F8FAFC',
    paddingHorizontal: 12,
    height: 42,
  },
  inputWrapperError: { borderColor: colors.rose },
  inputIcon: { marginRight: 2 },
  input: { flex: 1, color: colors.ink, fontSize: 13, height: '100%' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  errorText: { color: colors.rose, fontSize: 12, fontWeight: '600' },
});