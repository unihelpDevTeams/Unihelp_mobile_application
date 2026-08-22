import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { auth } from '../../src/firebase/config';

const MIGRATION_STORAGE_KEY = '@admin_migration_checklist';

const CHECKLIST_DATA = [
  {
    id: 'chat_groups',
    title: '1. Chat & Groups System 💬',
    items: [
      { id: 'chat_groups_collection', label: 'Groups: COLLECTIONS.groups in firestore.js' },
      { id: 'chat_convos_collection', label: 'Conversations: COLLECTIONS.conversations in firestore.js' },
      { id: 'chat_messages_collection', label: 'Messages: COLLECTIONS.messages in firestore.js' },
      { id: 'chat_socket_ui', label: 'UI leverages new Socket.io backend logic and /api/chat endpoints' },
    ]
  },
  {
    id: 'academic_tools',
    title: '2. Academic & Task Tools 📚',
    items: [
      { id: 'academic_gpa', label: 'GPA Records: GPARecords collection' },
      { id: 'academic_cgpa', label: 'CGPA Tracker: cgpaTracker collection' },
      { id: 'academic_tasks', label: 'Tasks: tasks collection in firestore.js' },
    ]
  },
  {
    id: 'social_friendships',
    title: '3. Social & Friendships 🤝',
    items: [
      { id: 'social_friends', label: 'Friends: COLLECTIONS.friends in friendships.js' },
      { id: 'social_friend_requests', label: 'Friend Requests: COLLECTIONS.friendRequests' },
      { id: 'social_blocked', label: 'Blocked Users: COLLECTIONS.blockedUsers' },
    ]
  },
  {
    id: 'user_profiles',
    title: '4. User Profiles & Activity 👤',
    items: [
      { id: 'user_profiles_col', label: 'User Profiles: COLLECTIONS.users in firestore.js' },
      { id: 'user_bookmarks', label: 'Bookmarks: Bookmarks subcollection' },
      { id: 'user_activity', label: 'Activity Feeds: User activity subcollections' },
    ]
  },
  {
    id: 'support_feedback',
    title: '5. Support & Feedback 🎧',
    items: [
      { id: 'support_contact', label: 'Contact Messages: COLLECTIONS.contactMessages' },
      { id: 'support_reports', label: 'Reports: COLLECTIONS.reports' },
      { id: 'support_suggestions', label: 'Suggestions: COLLECTIONS.suggestions' },
    ]
  },
  {
    id: 'onboarding_signup',
    title: '6. Onboarding & Signup 🎓',
    items: [
      { id: 'onboard_universities', label: 'Universities List: useUniversities.js queries' },
      { id: 'onboard_departments', label: 'Departments List: useDepartments.js queries' },
    ]
  },
  {
    id: 'promo_spotlights',
    title: '7. Promo Spotlights ✨',
    items: [
      { id: 'promo_events', label: 'Promos & Events: promoSpotlightService.js' },
    ]
  }
];

export default function MigrationChecklistScreen() {
  const { colors } = useTheme();
  const [checkedItems, setCheckedItems] = useState({});
  const [loading, setLoading] = useState(true);

  const styles = useThemeStyles((c, s, r) => ({
    container: {
      flex: 1,
      padding: s.md,
    },
    headerCard: {
      backgroundColor: c.brandLight,
      padding: s.md,
      borderRadius: r.lg,
      marginBottom: s.lg,
      borderWidth: 1,
      borderColor: c.brand,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: c.brand,
      marginBottom: s.xs,
    },
    headerDesc: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
    },
    sectionContainer: {
      marginBottom: s.xl,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: s.sm,
      letterSpacing: -0.2,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      padding: s.md,
      borderRadius: r.md,
      marginBottom: s.xs,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    itemRowChecked: {
      backgroundColor: c.surfaceSecondary,
      borderColor: c.borderOpaque,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.textSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: s.md,
    },
    checkboxChecked: {
      backgroundColor: c.brand,
      borderColor: c.brand,
    },
    itemLabel: {
      flex: 1,
      fontSize: 13,
      color: c.textPrimary,
      fontWeight: '500',
    },
    itemLabelChecked: {
      color: c.textSecondary,
      textDecorationLine: 'line-through',
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: c.borderDefault,
      borderRadius: r.full,
      marginTop: s.md,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: c.brand,
    },
    progressText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.brand,
      marginTop: 4,
      textAlign: 'right',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    }
  }));

  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch(process.env.EXPO_PUBLIC_API_URL + '/api/migration-status', {
          headers: {
            'Authorization': 'Bearer ' + await auth.currentUser?.getIdToken()
          }
        });
        if (response.ok) {
          const data = await response.json();
          let merged = data.checkedItems || {};
          if (Object.keys(merged).length === 0) {
             merged = {
              'support_contact': true,
              'support_reports': true,
              'support_suggestions': true,
              'academic_gpa': true,
              'academic_cgpa': true,
             };
          }
          setCheckedItems(merged);
        }
      } catch (e) {
        console.error('Failed to load migration state', e);
      } finally {
        setLoading(false);
      }
    };
    loadState();
  }, []);

  const toggleItem = async (itemId) => {
    const newState = {
      ...checkedItems,
      [itemId]: !checkedItems[itemId]
    };
    setCheckedItems(newState);
    try {
      await fetch(process.env.EXPO_PUBLIC_API_URL + '/api/migration-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + await auth.currentUser?.getIdToken()
        },
        body: JSON.stringify({ checkedItems: newState })
      });
    } catch (e) {
      console.error('Failed to save migration state', e);
    }
  };

  const totalItems = CHECKLIST_DATA.reduce((acc, section) => acc + section.items.length, 0);
  const completedItems = Object.values(checkedItems).filter(Boolean).length;
  const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  if (loading) {
    return (
      <ScreenShell title="Migration Checklist" showBack>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Migration Checklist" showBack>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>PostgreSQL Migration</Text>
          <Text style={styles.headerDesc}>
            Track the ongoing migration from Firebase Firestore to our custom PostgreSQL Node.js backend. Checked items are saved to your device.
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progressPct)}% Complete ({completedItems}/{totalItems})</Text>
        </View>

        {CHECKLIST_DATA.map((section) => (
          <View key={section.id} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => {
              const isChecked = !!checkedItems[item.id];
              return (
                <Pressable
                  key={item.id}
                  style={[styles.itemRow, isChecked && styles.itemRowChecked]}
                  onPress={() => toggleItem(item.id)}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <Ionicons name="checkmark" size={16} color="#FFF" />}
                  </View>
                  <Text style={[styles.itemLabel, isChecked && styles.itemLabelChecked]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}
