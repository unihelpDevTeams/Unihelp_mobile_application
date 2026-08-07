import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { useThemeStyles } from '../../theme/createStyles';

export function AnimatedPressable({ children, style, onPress, disabled, accessibilityLabel }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      onPressIn={() => {
        scale.value = withTiming(0.98, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
    >
      <Animated.View style={[style, animatedStyle, disabled && { opacity: 0.5 }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function ChallengeBadge({ label, icon, tone }) {
  const { colors } = useTheme();
  const effectiveTone = tone || colors.brand;
  const st = useThemeStyles((c, s, r) => ({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: s.sm + 2,
      paddingVertical: 4,
      borderRadius: r.full,
    },
  }));
  return (
    <View style={[st.badge, { backgroundColor: effectiveTone + '14', borderWidth: 1, borderColor: effectiveTone + '30' }]}>
      {icon ? <Ionicons name={icon} size={12} color={effectiveTone} /> : null}
      <Text style={{ color: effectiveTone, fontSize: 11, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value = 0, tone, height = 9 }) {
  const { colors } = useTheme();
  const effectiveTone = tone || colors.brand;
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [value, width]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View style={{ width: '100%', height, backgroundColor: colors.borderDefault, borderRadius: height / 2, overflow: 'hidden' }}>
      <Animated.View
        style={[
          { height: '100%', backgroundColor: effectiveTone, borderRadius: height / 2 },
          animatedStyle,
        ]}
      />
    </View>
  );
}

export function StatCard({ label, value, icon, tone, compact = false }) {
  const { colors } = useTheme();
  const effectiveTone = tone || colors.brand;
  const st = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.md + 2,
      gap: s.sm,
      alignItems: 'center',
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: r.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: { color: c.textPrimary, fontSize: 17, fontWeight: '900' },
    label: { color: c.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  }));
  return (
    <View style={[st.card, { flex: compact ? undefined : 1, minWidth: compact ? undefined : 100 }]}>
      <View style={[st.iconWrap, { backgroundColor: effectiveTone + '14' }]}>
        <Ionicons name={icon} size={16} color={effectiveTone} />
      </View>
      <Text style={st.value} numberOfLines={1}>{value}</Text>
      <Text style={st.label} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export function CategoryCard({ item, onPress }) {
  const st = useThemeStyles((c, s, r) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: r['2xl'],
      borderWidth: 1,
      borderColor: c.borderDefault,
      padding: s.lg,
      gap: s.sm,
      width: 150,
      height: 220,
      flexShrink: 0,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconWrap: { width: 44, height: 44, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.textPrimary, fontSize: 16, fontWeight: '900' },
    subtitle: { color: c.textSecondary, fontSize: 13, lineHeight: 18 },
    meta: { color: c.textTertiary, fontSize: 11, fontWeight: '700' },
    progressLabel: { color: c.textSecondary, fontSize: 11, fontWeight: '600' },
  }));
  return (
    <AnimatedPressable style={st.card} onPress={onPress} accessibilityLabel={item.title}>
      <View style={st.headerRow}>
        <View style={[st.iconWrap, { backgroundColor: item.tone + '14' }]}>
          <Ionicons name={item.icon} size={20} color={item.tone} />
        </View>
        <ChallengeBadge label={item.difficulty} tone={item.tone} />
      </View>
      <Text style={st.title}>{item.title}</Text>
      {item.subtitle ? (
        <Text style={st.subtitle} numberOfLines={2}>{item.subtitle}</Text>
      ) : null}
      <Text style={st.meta}>{item.questionCount.toLocaleString()} questions</Text>
      <ProgressBar value={item.progress} tone={item.tone} />
      <Text style={st.progressLabel}>{Math.round(item.progress * 100)}% complete</Text>
    </AnimatedPressable>
  );
}

export function AnswerOption({ label, selected, correct, revealed, onPress, disabled }) {
  const { colors } = useTheme();
  const tone = revealed && correct ? colors.success : revealed && selected ? colors.error : selected ? colors.brand : colors.borderDefault;
  const icon = revealed && correct ? 'checkmark-circle' : revealed && selected ? 'close-circle' : selected ? 'radio-button-on' : 'ellipse-outline';
  const bgColor = revealed && correct ? colors.success + '18' : revealed && selected ? colors.error + '18' : selected ? colors.brand + '18' : colors.card;
  const borderColor = revealed && correct ? colors.success : revealed && selected ? colors.error : selected ? colors.brand : colors.borderDefault;
  const st = useThemeStyles((c, s, r) => ({
    option: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.md,
      borderRadius: r.lg,
      borderWidth: 1,
      paddingHorizontal: s.lg,
      paddingVertical: s.md,
    },
    label: { flex: 1, color: c.textPrimary, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  }));
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      style={[st.option, { backgroundColor: bgColor, borderColor }]}
    >
      <Ionicons name={icon} size={20} color={tone} />
      <Text style={st.label}>{label}</Text>
    </AnimatedPressable>
  );
}

export function LeaderboardRow({ item, index, isCurrentUser }) {
  const { colors } = useTheme();
  const topTone = index === 0 ? colors.gold : index === 1 ? colors.greyLight : index === 2 ? colors.orange : colors.grey;
  const st = useThemeStyles((c, s, r) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.md,
      borderRadius: r['2xl'],
      borderWidth: 1,
      padding: s.md,
      marginBottom: s.sm,
    },
    rank: { width: 34, height: 34, borderRadius: r.full, alignItems: 'center', justifyContent: 'center' },
    rankText: { fontSize: 13, fontWeight: '900' },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: c.onBrand, fontSize: 16, fontWeight: '900' },
    name: { color: c.textPrimary, fontSize: 14, fontWeight: '900' },
    subtitle: { color: c.textSecondary, fontSize: 11.5, marginTop: 2, fontWeight: '600' },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
    statText: { color: c.textTertiary, fontSize: 11, fontWeight: '800' },
  }));
  return (
    <View
      style={[
        st.row,
        {
          backgroundColor: isCurrentUser ? colors.brandLight : colors.card,
          borderColor: isCurrentUser ? colors.brandGlow : colors.borderDefault,
        },
      ]}
    >
      <View style={[st.rank, { backgroundColor: index < 3 ? topTone + '18' : colors.surfaceSecondary }]}>
        <Text style={[st.rankText, { color: index < 3 ? topTone : colors.textPrimary }]}>{item.position || index + 1}</Text>
      </View>
      <View style={st.avatar}>
        <Text style={st.avatarText}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.name} numberOfLines={1}>{item.name || 'Student'}</Text>
        <Text style={st.subtitle} numberOfLines={1}>
          {[item.university, item.department].filter(Boolean).join(' - ') || 'UniHelp learner'}
        </Text>
        <View style={st.statsRow}>
          <Text style={st.statText}>{(item.xp || 0).toLocaleString()} XP</Text>
          <Text style={st.statText}>{(item.totalPoints || 0).toLocaleString()} pts</Text>
          <Text style={st.statText}>{item.currentStreak || 0} streak</Text>
        </View>
      </View>
    </View>
  );
}

export function AchievementTile({ item }) {
  const { colors } = useTheme();
  const st = useThemeStyles((c, s, r) => ({
    tile: {
      width: '48%',
      backgroundColor: c.card,
      borderRadius: r['2xl'],
      borderWidth: 1,
      padding: s.md,
      gap: s.sm,
    },
    iconWrap: { width: 44, height: 44, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center' },
    title: { color: c.textPrimary, fontSize: 13, fontWeight: '900', minHeight: 34 },
    progressText: { color: c.textSecondary, fontSize: 11, fontWeight: '800' },
  }));
  return (
    <View style={[st.tile, { borderColor: item.unlocked ? colors.brandGlow : colors.borderDefault }]}>
      <View style={[st.iconWrap, { backgroundColor: item.unlocked ? colors.brand : colors.surfaceSecondary }]}>
        <Ionicons name={item.unlocked ? item.icon : 'lock-closed-outline'} size={21} color={item.unlocked ? colors.onBrand : colors.textTertiary} />
      </View>
      <Text style={st.title} numberOfLines={2}>{item.title}</Text>
      <ProgressBar value={item.progress} tone={item.unlocked ? colors.success : colors.brand} height={7} />
      <Text style={st.progressText}>{Math.min(item.value, item.target)}/{item.target}</Text>
    </View>
  );
}

export function CelebrationBurst({ visible }) {
  const { colors } = useTheme();
  const pop = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      pop.value = withSequence(
        withTiming(1, { duration: 350 }),
        withRepeat(withSequence(withTiming(0.85, { duration: 700 }), withTiming(1, { duration: 700 })), 2, true)
      );
    }
  }, [pop, visible]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.75 + pop.value * 0.25 }],
  }));
  if (!visible) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 56, left: 0, right: 0, height: 220, alignItems: 'center', justifyContent: 'center' }, animStyle]}>
      {Array.from({ length: 12 }).map((_, index) => (
        <Spark key={index} index={index} />
      ))}
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.goldLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold }}>
        <Ionicons name="sparkles" size={26} color={colors.gold} />
      </View>
    </Animated.View>
  );
}

function Spark({ index }) {
  const { colors } = useTheme();
  const move = useSharedValue(0);
  useEffect(() => {
    move.value = withDelay(index * 35, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [index, move]);
  const angle = (Math.PI * 2 * index) / 12;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - move.value,
    transform: [
      { translateX: Math.cos(angle) * move.value * 110 },
      { translateY: Math.sin(angle) * move.value * 80 },
      { scale: 1 - move.value * 0.35 },
    ],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: index % 2 ? colors.brand : colors.gold },
        animatedStyle,
      ]}
    />
  );
}