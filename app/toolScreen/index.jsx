import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { layout } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import { isRouteAllowedForRole } from '../../src/shared/navigation/routePermissions';

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const ALL_TOOLS = [
  {
    category: 'Learn & Practice',
    blurb: 'Understand topics and get exam-ready',
    icon: 'bulb-outline',
    tools: [
      { id: 'ai-tutor', title: 'AI Tutor', sub: 'Ask questions and learn concepts', icon: 'sparkles', color: '#4F46E5', route: '/ai', tag: 'Popular' },
      { id: 'cbt', title: 'CBT Practice', sub: 'Practice with timed mock exams', icon: 'school', color: '#DC2626', route: '/cbt', tag: 'Popular' },
      { id: 'past-questions', title: 'Past Questions', sub: 'Browse and save exam papers', icon: 'clipboard', color: '#2563EB', route: '/studyMaterials', params: { tab: 'questions' } },
      { id: 'notes', title: 'Notes', sub: 'Find lecture notes and study guides', icon: 'book', color: '#0F766E', route: '/studyMaterials', params: { tab: 'notes' } },
      { id: 'formula', title: 'Formula Hub', sub: 'Browse formulas by subject', icon: 'calculator', color: '#7C3AED', route: '/formula-hub' },
      { id: 'flashcards', title: 'Flashcards', sub: 'Review formulas with study cards', icon: 'albums', color: '#BE185D', route: '/formula-hub/flashcards' },
      { id: 'challenge', title: 'Daily Challenge', sub: 'Build a daily practice streak', icon: 'flame', color: '#EA580C', route: '/challenge', tag: 'Streak' },
    ],
  },
  {
    category: 'Plan & Track',
    blurb: 'Stay organised and on top of deadlines',
    icon: 'calendar-outline',
    tools: [
      { id: 'gpa-cgpa', title: 'GPA & CGPA', sub: 'Calculate grades and track progress', icon: 'stats-chart', color: '#4F46E5', route: '/cgpa' },
      { id: 'timetable', title: 'Smart Schedule', sub: 'Manage classes and reminders', icon: 'calendar-number', color: '#D97706', route: '/smart-timetable' },
      { id: 'tasks', title: 'Task Planner', sub: 'Track assignments and deadlines', icon: 'checkbox', color: '#2563EB', route: '/tasks' },
      { id: 'pomodoro', title: 'Focus Timer', sub: 'Set a focused study session', icon: 'timer', color: '#C2410C', route: '/pomodoroScreen' },
      { id: 'saved', title: 'Saved Resources', sub: 'Return to bookmarked study items', icon: 'bookmark', color: '#0F766E', route: '/saved' },
      { id: 'downloads', title: 'Offline Library', sub: 'Open resources saved for offline study', icon: 'download', color: '#475569', route: '/offline-center' },
    ],
  },
];

const FEATURED_ID = 'ai-tutor';
const QUICK_ACCESS = [
  { id: 'past-questions', label: 'Past Qs' },
  { id: 'gpa-cgpa', label: 'GPA' },
  { id: 'timetable', label: 'Schedule' },
  { id: 'tasks', label: 'Tasks' },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Studying late';
};

const getFirstName = (profile) => {
  const raw = profile?.firstName || profile?.displayName || profile?.name || profile?.fullName || profile?.username || '';
  const first = String(raw).trim().split(/\s+/)[0];
  return first || '';
};

// Soft tinted background that works in both light and dark themes.
const tint = (hex, alpha = '1F') => `${hex}${alpha}`;

/* -------------------------------------------------------------------------- */
/*  SVG illustrations                                                         */
/* -------------------------------------------------------------------------- */

const Sparkle = ({ x, y, size = 8, fill = '#FDE68A', opacity = 1 }) => (
  <Path
    d={`M${x} ${y - size} L${x + size / 4} ${y - size / 4} L${x + size} ${y} L${x + size / 4} ${y + size / 4} L${x} ${y + size} L${x - size / 4} ${y + size / 4} L${x - size} ${y} L${x - size / 4} ${y - size / 4} Z`}
    fill={fill}
    opacity={opacity}
  />
);

// Gradient card background with soft decorative circles.
function GradientBackdrop({ id, from, to }) {
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
    </Svg>
  );
}

// Book stack + graduation cap + sparkles.
function StudyArt({ width = 150, height = 132 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 140">
      <Circle cx="82" cy="78" r="58" fill="#FFFFFF" opacity="0.1" />
      <Circle cx="82" cy="78" r="38" fill="#FFFFFF" opacity="0.1" />
      {/* books */}
      <Rect x="26" y="104" width="108" height="16" rx="5" fill="#FFFFFF" opacity="0.95" />
      <Rect x="34" y="106" width="92" height="3" rx="1.5" fill="#C7D2FE" />
      <Rect x="36" y="88" width="88" height="16" rx="5" fill="#C7D2FE" />
      <Rect x="44" y="72" width="72" height="16" rx="5" fill="#FFFFFF" opacity="0.92" />
      <Rect x="52" y="76" width="30" height="3" rx="1.5" fill="#A5B4FC" />
      {/* cap */}
      <Path d="M58 52 V64 C58 72 102 72 102 64 V52 Z" fill="#A5B4FC" />
      <Path d="M80 28 L124 46 L80 64 L36 46 Z" fill="#FFFFFF" />
      <Path d="M80 34 L110 46 L80 58 L50 46 Z" fill="#E0E7FF" opacity="0.9" />
      {/* tassel */}
      <Path d="M124 46 V68" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round" />
      <Circle cx="124" cy="71" r="4" fill="#FCD34D" />
      <Sparkle x={24} y={34} size={9} />
      <Sparkle x={140} y={22} size={7} opacity={0.9} />
      <Sparkle x={134} y={100} size={5} opacity={0.7} />
    </Svg>
  );
}

// Magnifier with a question mark for empty search results.
function EmptyArt({ stroke = '#94A3B8', accent = '#4F46E5' }) {
  return (
    <Svg width={140} height={120} viewBox="0 0 140 120">
      <Circle cx="70" cy="60" r="50" fill={accent} opacity="0.08" />
      <Circle cx="62" cy="54" r="26" fill="none" stroke={accent} strokeWidth="6" opacity="0.9" />
      <Path d="M82 74 L104 96" stroke={accent} strokeWidth="8" strokeLinecap="round" />
      <Path d="M55 46 C55 38 69 38 69 47 C69 53 62 54 62 61" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <Circle cx="62" cy="68" r="2.8" fill={stroke} />
      <G opacity="0.8">
        <Sparkle x={112} y={26} size={7} fill="#FBBF24" />
        <Sparkle x={24} y={90} size={5} fill="#FBBF24" />
      </G>
    </Svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                    */
/* -------------------------------------------------------------------------- */

export default function ToolsScreen({ isTabScreen = false } = {}) {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const role = profile?.role || 'university';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const gridGap = 12;
  const cardWidth = (screenWidth - layout.screenPadding * 2 - gridGap) / 2;
  const quickTileWidth = (screenWidth - layout.screenPadding * 2 - gridGap * 3) / 4;

  const styles = useThemeStyles((c, s, r) => ({
    scrollContent: { paddingBottom: s['3xl'] + 24, gap: s.lg },

    /* header */
    navHeader: { flexDirection: 'row', alignItems: 'center', gap: s.sm, paddingTop: s.sm },
    btnBack: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center',
      justifyContent: 'center', borderWidth: 1, borderColor: c.borderLight || c.border,
    },
    headerCopy: { flex: 1, gap: 2 },
    greeting: { fontSize: 13, fontWeight: '600', color: c.grey },
    screenTitle: { fontSize: 24, fontWeight: '900', color: c.ink, letterSpacing: -0.5 },

    /* search */
    searchContainer: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: r.full,
      paddingHorizontal: s.md, height: 50, borderWidth: 1, borderColor: c.borderLight || c.border, gap: s.xs,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.ink, height: '100%', paddingVertical: 0 },

    /* category chips */
    chipsScroll: { flexGrow: 0 },
    chipsContent: { gap: s.xs, paddingRight: s.md },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: s.md, height: 36, borderRadius: r.full,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight || c.border,
    },
    chipActive: { backgroundColor: c.ink, borderColor: c.ink },
    chipText: { fontSize: 12.5, fontWeight: '700', color: c.grey },
    chipTextActive: { color: c.surface },

    /* hero */
    hero: { borderRadius: r['2xl'], overflow: 'hidden', minHeight: 164, flexDirection: 'row', alignItems: 'center', padding: s.md },
    heroCopy: { flex: 1, gap: 6, paddingRight: s.xs },
    heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    heroEyebrowText: { fontSize: 11, fontWeight: '800', color: '#E0E7FF', letterSpacing: 0.8, textTransform: 'uppercase' },
    heroTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.4, lineHeight: 25 },
    heroSub: { fontSize: 12.5, color: '#E0E7FF', fontWeight: '500', lineHeight: 18 },
    heroButton: {
      alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF',
      paddingHorizontal: s.md, height: 38, borderRadius: r.full, marginTop: 4,
    },
    heroButtonText: { fontSize: 13, fontWeight: '800', color: '#4338CA' },
    heroArt: { width: 128, alignItems: 'center', justifyContent: 'center' },

    /* quick access */
    sectionLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    sectionLabel: { fontSize: 16, fontWeight: '800', color: c.ink, letterSpacing: -0.2 },
    quickRow: { flexDirection: 'row', gap: gridGap },
    quickTile: {
      alignItems: 'center', gap: 8, paddingVertical: s.md, borderRadius: r['2xl'], backgroundColor: c.surface,
      borderWidth: 1, borderColor: c.borderLight || c.border,
    },
    quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    quickLabel: { fontSize: 12, fontWeight: '700', color: c.ink },

    /* categories */
    categoryBlock: { gap: s.sm },
    categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    categoryIcon: { width: 36, height: 36, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderLight || c.border },
    categoryCopy: { flex: 1, gap: 1 },
    categoryTitle: { fontSize: 17, fontWeight: '800', color: c.ink, letterSpacing: -0.2 },
    categoryBlurb: { fontSize: 12.5, color: c.grey, fontWeight: '500' },
    categoryCount: { fontSize: 12, fontWeight: '700', color: c.grey },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: gridGap },

    /* tool cards */
    card: {
      width: cardWidth, backgroundColor: c.surface, borderRadius: r['2xl'], padding: s.md, gap: s.sm,
      borderWidth: 1, borderColor: c.borderLight || c.border, shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, minHeight: 132,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    iconWrap: { width: 44, height: 44, borderRadius: r.xl, alignItems: 'center', justifyContent: 'center' },
    tagPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: r.full },
    tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
    cardBody: { gap: 3, flex: 1 },
    cardTitle: { fontSize: 14.5, fontWeight: '800', color: c.ink, letterSpacing: -0.1 },
    cardSub: { fontSize: 11.5, color: c.grey, fontWeight: '500', lineHeight: 16 },
    cardArrow: {
      position: 'absolute', right: 12, bottom: 12, width: 26, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center',
    },

    /* empty */
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: s['2xl'], gap: s.xs },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: c.ink, marginTop: s.xs },
    emptyText: { fontSize: 13, fontWeight: '500', color: c.grey, textAlign: 'center', paddingHorizontal: s.xl, lineHeight: 19 },
    emptyButton: {
      marginTop: s.sm, paddingHorizontal: s.lg, height: 40, borderRadius: r.full, alignItems: 'center',
      justifyContent: 'center', borderWidth: 1, borderColor: c.borderLight || c.border, backgroundColor: c.surface,
    },
    emptyButtonText: { fontSize: 13, fontWeight: '800', color: c.ink },
  }));

  const allowedCategories = useMemo(
    () =>
      ALL_TOOLS.map((category) => ({
        ...category,
        tools: category.tools.filter((tool) => isRouteAllowedForRole(tool.route, role)),
      })).filter((category) => category.tools.length > 0),
    [role],
  );

  const toolsById = useMemo(() => {
    const map = {};
    allowedCategories.forEach((category) => category.tools.forEach((tool) => { map[tool.id] = tool; }));
    return map;
  }, [allowedCategories]);

  const query = searchQuery.toLowerCase().trim();
  const isSearching = Boolean(query);

  const filteredCategories = useMemo(
    () =>
      allowedCategories
        .filter((category) => activeCategory === 'All' || category.category === activeCategory)
        .map((category) => ({
          ...category,
          tools: category.tools.filter(
            (tool) =>
              !query ||
              tool.title.toLowerCase().includes(query) ||
              tool.sub.toLowerCase().includes(query) ||
              category.category.toLowerCase().includes(query),
          ),
        }))
        .filter((category) => category.tools.length > 0),
    [activeCategory, allowedCategories, query],
  );

  const featured = toolsById[FEATURED_ID];
  const quickTools = QUICK_ACCESS.map((item) => ({ ...item, tool: toolsById[item.id] })).filter((item) => item.tool);
  const showDiscovery = !isSearching && activeCategory === 'All';
  const firstName = getFirstName(profile);
  const chipOptions = ['All', ...allowedCategories.map((category) => category.category)];

  const openTool = (tool) => {
    if (tool.params) {
      router.navigate({ pathname: `/(tabs)${tool.route}`, params: tool.params });
      return;
    }
    router.navigate(tool.route);
  };

  const resetSearch = () => {
    setSearchQuery('');
    setActiveCategory('All');
  };

  return (
    <ScreenShell showFooter scrollable={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.navHeader}>
          {isTabScreen ? null : (
            <Pressable
              style={styles.btnBack}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </Pressable>
          )}
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>{firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}</Text>
            <Text style={styles.screenTitle}>{isTabScreen ? 'Study Tools' : 'All Academic Tools'}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.grey} />
          <TextInput
            style={styles.searchInput}
            placeholder="What would you like to work on?"
            placeholderTextColor={colors.grey}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search tools"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.grey} />
            </Pressable>
          ) : null}
        </View>

        {/* Category chips */}
        {chipOptions.length > 2 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
            keyboardShouldPersistTaps="handled"
          >
            {chipOptions.map((option) => {
              const active = activeCategory === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setActiveCategory(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Featured hero + quick access */}
        {showDiscovery && featured ? (
          <Pressable
            onPress={() => openTool(featured)}
            accessibilityRole="button"
            accessibilityLabel={`${featured.title}. Ask a question and learn concepts`}
            style={({ pressed }) => [styles.hero, pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] }]}
          >
            <GradientBackdrop id="heroGradient" from="#4F46E5" to="#7C3AED" />
            <View style={styles.heroCopy}>
              <View style={styles.heroEyebrow}>
                <Ionicons name="sparkles" size={13} color="#FDE68A" />
                <Text style={styles.heroEyebrowText}>Your study buddy</Text>
              </View>
              <Text style={styles.heroTitle}>Stuck on a topic? Let's work through it together.</Text>
              <Text style={styles.heroSub}>Ask {featured.title} anything from your course and get clear, step-by-step help.</Text>
              <View style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Start learning</Text>
                <Ionicons name="arrow-forward" size={14} color="#4338CA" />
              </View>
            </View>
            <View style={styles.heroArt}>
              <StudyArt width={126} height={112} />
            </View>
          </Pressable>
        ) : null}

        {showDiscovery && quickTools.length ? (
          <View style={{ gap: 10 }}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>Quick access</Text>
            </View>
            <View style={styles.quickRow}>
              {quickTools.map(({ id, label, tool }) => (
                <Pressable
                  key={id}
                  onPress={() => openTool(tool)}
                  accessibilityRole="button"
                  accessibilityLabel={tool.title}
                  style={({ pressed }) => [styles.quickTile, { width: quickTileWidth }, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}
                >
                  <View style={[styles.quickIcon, { backgroundColor: tint(tool.color) }]}>
                    <Ionicons name={tool.icon} size={20} color={tool.color} />
                  </View>
                  <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Tool categories */}
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <View key={category.category} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <Ionicons name={category.icon} size={18} color={colors.ink} />
                </View>
                <View style={styles.categoryCopy}>
                  <Text style={styles.categoryTitle}>{category.category}</Text>
                  <Text style={styles.categoryBlurb}>{category.blurb}</Text>
                </View>
                <Text style={styles.categoryCount}>{category.tools.length}</Text>
              </View>

              <View style={styles.grid}>
                {category.tools.map((tool) => (
                  <Pressable
                    key={tool.id}
                    style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                    onPress={() => openTool(tool)}
                    accessibilityRole="button"
                    accessibilityLabel={`${tool.title}. ${tool.sub}`}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.iconWrap, { backgroundColor: tint(tool.color) }]}>
                        <Ionicons name={tool.icon} size={22} color={tool.color} />
                      </View>
                      {tool.tag ? (
                        <View style={[styles.tagPill, { backgroundColor: tint(tool.color, '22') }]}>
                          <Text style={[styles.tagText, { color: tool.color }]}>{tool.tag}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{tool.title}</Text>
                      <Text style={styles.cardSub} numberOfLines={2}>{tool.sub}</Text>
                    </View>
                    <View style={[styles.cardArrow, { backgroundColor: tint(tool.color, '18') }]}>
                      <Ionicons name="arrow-forward" size={13} color={tool.color} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyArt stroke={colors.grey} />
            <Text style={styles.emptyTitle}>No tools found</Text>
            <Text style={styles.emptyText}>
              {isSearching
                ? `We couldn't find anything for "${searchQuery.trim()}". Try a different word, like "exam", "notes" or "GPA".`
                : 'There are no tools available in this section right now.'}
            </Text>
            <Pressable onPress={resetSearch} style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.85 }]} accessibilityRole="button">
              <Text style={styles.emptyButtonText}>Show all tools</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}
