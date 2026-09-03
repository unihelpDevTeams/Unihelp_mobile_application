import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
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

// Master list of all tools categorized
const ALL_TOOLS = [
  {
    category: 'Academic Tools',
    tools: [
      {
        id: 'gpa-cgpa',
        title: 'GPA & CGPA',
        sub: 'Calculate terms and track progress',
        icon: 'stats-chart',
        color: '#4F46E5',
        bgColor: '#EEF2FF',
        route: '/cgpa',
        badge: 'POPULAR',
      },
      {
        id: 'cbt',
        title: 'CBT practice',
        sub: 'Live mock exams & quizzes',
        icon: 'school',
        color: '#DC2626',
        bgColor: '#FEE2E2',
        route: '/cbt',
        badge: 'NEW',
      },
    ],
  },
  {
    category: 'Study & Learning',
    tools: [
      {
        id: 'timetable',
        title: 'Smart Schedule',
        sub: 'Live timetable & class alerts',
        icon: 'calendar-number',
        color: '#EF4444',
        bgColor: '#FEF2F2',
        route: '/smart-timetable',
        badge: 'LIVE',
      },
      {
        id: 'newsfeed',
        title: 'News Feed',
        sub: 'Latest updates',
        icon: 'newspaper',
        color: '#3B82F6',
        bgColor: '#ECFDF5',
        route: '/newsfeed',
        badge: 'TRENDING',
      },
      {
        id: 'formula',
        title: 'Formula Hub',
        sub: 'Math, Physics & Coding cheat sheets',
        icon: 'code-working',
        color: '#9333EA',
        bgColor: '#F3E8FF',
        route: '/formula-hub',
        badge: 'GUIDE',
      },
      {
        id: 'vault',
        title: 'Study Vault',
        sub: 'Past questions & lecture notes',
        icon: 'library',
        color: '#6366F1',
        bgColor: '#EEF2FF',
        route: '/(tabs)/studyMaterials',
      },
      {
        id: 'challenge',
        title: 'Daily Challenge',
        sub: 'Sharpen your skills with daily quizzes',
        icon: 'flame',
        color: '#0284C7',
        bgColor: '#F0F9FF',
        route: '/challenge',
      },
      {
        id: 'flashcards',
        title: 'Flashcards AI',
        sub: 'Smart revision cards generator',
        icon: 'layers',
        color: '#EC4899',
        bgColor: '#FDF2F8',
        route: '/formula-hub/flashcards',
        badge: 'AI',
      },
    ],
  },
  {
    category: 'Productivity',
    tools: [
      {
        id: 'tasks',
        title: 'Task Planner',
        sub: 'Deadlines, exams & assignments',
        icon: 'checkbox',
        color: '#8B5CF6',
        bgColor: '#F5F3FF',
        route: '/tasks',
      },
      {
        id: 'pomodoro',
        title: 'Focus Timer',
        sub: 'Pomodoro study sessions',
        icon: 'timer',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        route: '/pomodoroScreen',
      },
      {
        id: 'ai-copilot',
        title: 'AI Study Assistant',
        sub: 'Instant homework & concept solver',
        icon: 'sparkles',
        color: '#4F46E5',
        bgColor: '#EEF2FF',
        route: '/ai',
        badge: 'HOT',
      },
    ],
  },
];

export default function ToolsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const role = profile?.role || 'university';

  const [searchQuery, setSearchQuery] = useState('');

  const styles = useThemeStyles((c, s, r) => ({
    // Header Navigation
    navHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: s.md,
      marginBottom: s.sm,
    },
    btnBack: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
    },
    screenTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: c.ink,
      letterSpacing: -0.4,
    },

    // Search Bar
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: r.xl,
      paddingHorizontal: s.md,
      height: 48,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
      marginBottom: s.lg,
      gap: s.xs,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: c.ink,
      height: '100%',
    },

    // Category Block
    categoryBlock: {
      marginBottom: s.xl,
    },
    categoryTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.grey,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: s.sm,
    },

    // Grid System
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.sm,
    },
    card: {
      width: (screenWidth - layout.screenPadding * 2 - s.sm) / 2,
      backgroundColor: c.surface,
      borderRadius: r['2xl'],
      padding: s.md,
      borderWidth: 1,
      borderColor: c.borderLight || c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
      justifyContent: 'space-between',
      minHeight: 116,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      fontSize: 9,
      fontWeight: '800',
      color: c.brandText,
      backgroundColor: c.background,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      overflow: 'hidden',
    },
    cardBody: {
      marginTop: s.xs,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.ink,
    },
    cardSub: {
      fontSize: 11,
      color: c.grey,
      fontWeight: '500',
      marginTop: 2,
    },

    // Empty state
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: s['3xl'],
    },
    emptyText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.grey,
      marginTop: s.sm,
    },
  }));

  // Filter tools based on user permissions and search query
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return ALL_TOOLS.map((cat) => {
      const allowedTools = cat.tools.filter(
        (t) =>
          isRouteAllowedForRole(t.route, role) &&
          (t.title.toLowerCase().includes(q) || t.sub.toLowerCase().includes(q))
      );

      return {
        ...cat,
        tools: allowedTools,
      };
    }).filter((cat) => cat.tools.length > 0);
  }, [role, searchQuery]);

  return (
    <ScreenShell showFooter scrollable={false}>
      {/* HEADER */}
      <View style={styles.navHeader}>
        <Pressable style={styles.btnBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.screenTitle}>All Academic Tools</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* SEARCH INPUT */}
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

      {/* TOOL LIST CATEGORIES */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredCategories.length > 0 ? (
          filteredCategories.map((cat) => (
            <View key={cat.category} style={styles.categoryBlock}>
              <Text style={styles.categoryTitle}>{cat.category}</Text>
              <View style={styles.grid}>
                {cat.tools.map((tool) => (
                  <Pressable
                    key={tool.id}
                    style={({ pressed }) => [
                      styles.card,
                      pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => router.navigate(tool.route)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconWrap, { backgroundColor: tool.bgColor }]}>
                        <Ionicons name={tool.icon} size={20} color={tool.color} />
                      </View>
                      {tool.badge && <Text style={styles.badge}>{tool.badge}</Text>}
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{tool.title}</Text>
                      <Text style={styles.cardSub} numberOfLines={1}>
                        {tool.sub}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-disallowed" size={44} color={colors.grey} />
            <Text style={styles.emptyText}>No tools found matching &#34;{searchQuery}&#34;</Text>
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}
