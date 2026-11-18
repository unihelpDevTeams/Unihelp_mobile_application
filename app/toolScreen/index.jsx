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
import { layout } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import { isRouteAllowedForRole } from '../../src/shared/navigation/routePermissions';

const ALL_TOOLS = [
  {
    category: 'Learn & Practice',
    tools: [
      { id: 'ai-tutor', title: 'AI Tutor', sub: 'Ask questions and learn concepts', icon: 'sparkles', color: '#4F46E5', bgColor: '#EEF2FF', route: '/ai' },
      { id: 'cbt', title: 'CBT Practice', sub: 'Practice with timed mock exams', icon: 'school', color: '#DC2626', bgColor: '#FEE2E2', route: '/cbt' },
      { id: 'past-questions', title: 'Past Questions', sub: 'Browse and save exam papers', icon: 'clipboard', color: '#2563EB', bgColor: '#EFF6FF', route: '/studyMaterials', params: { tab: 'questions' } },
      { id: 'notes', title: 'Notes', sub: 'Find lecture notes and study guides', icon: 'book', color: '#0F766E', bgColor: '#CCFBF1', route: '/studyMaterials', params: { tab: 'notes' } },
      { id: 'formula', title: 'Formula Hub', sub: 'Browse formulas by subject', icon: 'calculator', color: '#7C3AED', bgColor: '#F3E8FF', route: '/formula-hub' },
      { id: 'flashcards', title: 'Flashcards', sub: 'Review formulas with study cards', icon: 'albums', color: '#BE185D', bgColor: '#FCE7F3', route: '/formula-hub/flashcards' },
      { id: 'challenge', title: 'Daily Challenge', sub: 'Build a daily practice streak', icon: 'flame', color: '#EA580C', bgColor: '#FFF7ED', route: '/challenge' },
    ],
  },
  {
    category: 'Plan & Track',
    tools: [
      { id: 'gpa-cgpa', title: 'GPA & CGPA', sub: 'Calculate grades and track progress', icon: 'stats-chart', color: '#4F46E5', bgColor: '#EEF2FF', route: '/cgpa' },
      { id: 'timetable', title: 'Smart Schedule', sub: 'Manage classes and reminders', icon: 'calendar-number', color: '#D97706', bgColor: '#FEF3C7', route: '/smart-timetable' },
      { id: 'tasks', title: 'Task Planner', sub: 'Track assignments and deadlines', icon: 'checkbox', color: '#2563EB', bgColor: '#DBEAFE', route: '/tasks' },
      { id: 'pomodoro', title: 'Focus Timer', sub: 'Set a focused study session', icon: 'timer', color: '#C2410C', bgColor: '#FFEDD5', route: '/pomodoroScreen' },
      { id: 'saved', title: 'Saved Resources', sub: 'Return to bookmarked study items', icon: 'bookmark', color: '#0F766E', bgColor: '#CCFBF1', route: '/saved' },
      { id: 'downloads', title: 'Offline Library', sub: 'Open resources saved for offline study', icon: 'download', color: '#475569', bgColor: '#F1F5F9', route: '/downloads' },
    ],
  },
];

export default function ToolsScreen({ isTabScreen = false } = {}) {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const role = profile?.role || 'university';
  const [searchQuery, setSearchQuery] = useState('');

  const styles = useThemeStyles((c, s, r) => ({
    navHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: s.md, marginBottom: s.sm },
    btnBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.borderLight || c.border },
    screenTitle: { fontSize: 20, fontWeight: '900', color: c.ink, letterSpacing: -0.4 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: r.xl, paddingHorizontal: s.md, height: 48, borderWidth: 1, borderColor: c.borderLight || c.border, marginBottom: s.lg, gap: s.xs },
    searchInput: { flex: 1, fontSize: 14, color: c.ink, height: '100%' },
    categoryBlock: { marginBottom: s.xl },
    categoryTitle: { fontSize: 14, fontWeight: '800', color: c.grey, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: s.sm },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: s.sm },
    card: { width: (screenWidth - layout.screenPadding * 2 - s.sm) / 2, backgroundColor: c.surface, borderRadius: r['2xl'], padding: s.md, borderWidth: 1, borderColor: c.borderLight || c.border, shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, justifyContent: 'space-between', minHeight: 116 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconWrap: { width: 40, height: 40, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center' },
    cardBody: { marginTop: s.xs },
    cardTitle: { fontSize: 14, fontWeight: '800', color: c.ink },
    cardSub: { fontSize: 11, color: c.grey, fontWeight: '500', marginTop: 2 },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: s['3xl'] },
    emptyText: { fontSize: 15, fontWeight: '700', color: c.grey, marginTop: s.sm },
  }));

  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return ALL_TOOLS.map((category) => ({
      ...category,
      tools: category.tools.filter((tool) => (
        isRouteAllowedForRole(tool.route, role)
        && (tool.title.toLowerCase().includes(query) || tool.sub.toLowerCase().includes(query))
      )),
    })).filter((category) => category.tools.length > 0);
  }, [role, searchQuery]);

  const openTool = (tool) => {
    if (tool.params) {
      router.navigate({ pathname: `/(tabs)${tool.route}`, params: tool.params });
      return;
    }
    router.navigate(tool.route);
  };

  return (
    <ScreenShell showFooter scrollable={false}>
      <View style={styles.navHeader}>
        {isTabScreen ? <View style={{ width: 40 }} /> : (
          <Pressable style={styles.btnBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
        )}
        <Text style={styles.screenTitle}>{isTabScreen ? 'Study Tools' : 'All Academic Tools'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.grey} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tools or features..."
          placeholderTextColor={colors.grey}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.grey} />
          </Pressable>
        )}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredCategories.length > 0 ? filteredCategories.map((category) => (
          <View key={category.category} style={styles.categoryBlock}>
            <Text style={styles.categoryTitle}>{category.category}</Text>
            <View style={styles.grid}>
              {category.tools.map((tool) => (
                <Pressable
                  key={tool.id}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
                  onPress={() => openTool(tool)}
                  accessibilityRole="button"
                  accessibilityLabel={`${tool.title}. ${tool.sub}`}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconWrap, { backgroundColor: tool.bgColor }]}>
                      <Ionicons name={tool.icon} size={20} color={tool.color} />
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{tool.title}</Text>
                    <Text style={styles.cardSub} numberOfLines={2}>{tool.sub}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-disallowed" size={44} color={colors.grey} />
            <Text style={styles.emptyText}>No tools found matching &#34;{searchQuery}&#34;</Text>
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}