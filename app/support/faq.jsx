import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';

const FAQ_DATA = [
  {
    q: 'What is UniHelp?',
    a: 'UniHelp is an all-in-one student platform built for university students. It combines lecture notes, past questions, study groups, messaging, a student marketplace, hostel listings, AI learning tools, and more in one app.',
  },
  {
    q: 'Is UniHelp free to use?',
    a: 'Yes. Most UniHelp features are completely free. Some premium tools and exclusive content may require a subscription in the future.',
  },
  {
    q: 'Do I need an account?',
    a: 'Yes. Creating an account allows your study progress, messages, uploads, marketplace listings, and settings to be securely saved and synchronized across your devices.',
  },
  {
    q: 'How do past questions work?',
    a: 'Browse uploaded past questions and study materials from the app library. You can save useful items and return to them later.',
  },
  {
    q: 'How does the Study Planner work?',
    a: 'The Study Planner helps you organize your preparation with study schedules, daily goals, revision reminders, exam countdowns, and progress tracking.',
  },
  {
    q: 'Can I upload lecture notes or past questions?',
    a: 'Yes. Students and tutors can upload lecture notes, PDFs, images, and past questions to help other learners within the UniHelp community.',
  },
  {
    q: 'How do I find study materials?',
    a: 'Use the search feature to browse notes, past questions, tutorials, and other learning resources by course, subject, or keyword.',
  },
  {
    q: 'Can I create or join study groups?',
    a: 'Yes. Anyone can create public or private study groups, invite friends, discuss academic topics, and collaborate with classmates.',
  },
  {
    q: 'How does messaging work?',
    a: 'UniHelp includes private messaging and group chats. You can reply to messages, share files, and communicate with other students securely.',
  },
  {
    q: 'What is the Student Marketplace?',
    a: 'The marketplace allows students to buy and sell items such as textbooks, gadgets, furniture, fashion items, and other essentials directly within UniHelp.',
  },
  {
    q: 'How do I contact a seller?',
    a: 'Open the listing and tap the Contact button to start a conversation with the seller through UniHelp messaging.',
  },
  {
    q: 'Are hostel listings verified?',
    a: 'While many listings are genuine, always inspect any hostel in person and confirm details before making payments.',
  },
  {
    q: 'What can the AI Assistant do?',
    a: 'The AI Assistant can explain difficult topics, summarize notes, generate revision plans, answer academic questions, and help you prepare for examinations.',
  },
  {
    q: 'Can I change my profile information?',
    a: 'Yes. Update your name, profile picture, department, institution, and other personal information anytime from your profile settings.',
  },
  {
    q: 'How do I reset my password?',
    a: "Select 'Forgot Password' on the login screen and follow the instructions sent to your registered email address.",
  },
  {
    q: 'How do I report inappropriate content?',
    a: 'Every post, listing, group, and message includes a Report option. Our moderation team reviews reports to keep the community safe.',
  },
  {
    q: 'How do I contact UniHelp Support?',
    a: 'Visit the Help & Support section inside Settings to report bugs, request assistance, or provide feedback to the UniHelp team.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. You can permanently delete your account from Settings. Once deleted, your account and associated data cannot be recovered.',
  },
];

const CATEGORY_ITEMS = [
  { icon: 'school-outline', label: 'Getting Started', color: colors.brand },
  { icon: 'book-outline', label: 'Study Tools', color: colors.teal },
  { icon: 'people-outline', label: 'Community', color: colors.purple },
  { icon: 'storefront-outline', label: 'Marketplace', color: colors.orange },
  { icon: 'sparkles-outline', label: 'AI Features', color: colors.green },
  { icon: 'shield-checkmark-outline', label: 'Account & Safety', color: colors.red },
];

export default function FAQPage() {
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = FAQ_DATA.filter(
    (item) =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleItem = (index) => {
    setExpandedId(expandedId === index ? null : index);
  };

  return (
    <ScreenShell title="FAQ" subtitle="Find answers to common questions" showBack scrollable>
      <View style={styles.container}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.greyLight} style={styles.searchIcon} />
          <TextInput
            placeholder="Search questions..."
            placeholderTextColor={colors.greyLight}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.greyLight} />
            </Pressable>
          ) : null}
        </View>

        {/* Category Chips */}
        <View style={styles.categoryRow}>
          {CATEGORY_ITEMS.map((cat) => (
            <View key={cat.label} style={[styles.categoryChip, { borderColor: cat.color + '30' }]}>
              <Ionicons name={cat.icon} size={14} color={cat.color} />
              <Text style={[styles.categoryChipText, { color: cat.color }]}>{cat.label}</Text>
            </View>
          ))}
        </View>

        {/* FAQ List */}
        <View style={styles.faqList}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.greyLight} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>Try a different search term.</Text>
            </View>
          ) : (
            filtered.map((item, index) => {
              const isOpen = expandedId === index;
              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    styles.faqItem,
                    pressed && styles.faqItemPressed,
                    isOpen && styles.faqItemOpen,
                  ]}
                  onPress={() => toggleItem(index)}
                >
                  <View style={styles.faqHeader}>
                    <View style={styles.faqIconWrap}>
                      <Ionicons
                        name={isOpen ? 'remove-circle' : 'add-circle'}
                        size={20}
                        color={isOpen ? colors.brand : colors.grey}
                      />
                    </View>
                    <Text style={[styles.faqQuestion, isOpen && styles.faqQuestionOpen]}>{item.q}</Text>
                  </View>
                  {isOpen && (
                    <View style={styles.faqAnswerWrap}>
                      <Text style={styles.faqAnswer}>{item.a}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Quick Tips</Text>
          <View style={styles.tipsGrid}>
            <View style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: colors.brandLight }]}>
                <Ionicons name="book-outline" size={20} color={colors.brand} />
              </View>
              <Text style={styles.tipTitle}>Study Smarter</Text>
              <Text style={styles.tipText}>
                Practice consistently, review your mistakes, and use analytics to improve.
              </Text>
            </View>
            <View style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: colors.purpleLight }]}>
                <Ionicons name="people-outline" size={20} color={colors.purple} />
              </View>
              <Text style={styles.tipTitle}>Stay Connected</Text>
              <Text style={styles.tipText}>
                Join study groups and collaborate with students across universities.
              </Text>
            </View>
            <View style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: colors.orangeLight }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.orange} />
              </View>
              <Text style={styles.tipTitle}>Stay Safe</Text>
              <Text style={styles.tipText}>
                Verify listings before making payments or sharing personal info.
              </Text>
            </View>
            <View style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: colors.greenLight }]}>
                <Ionicons name="rocket-outline" size={20} color={colors.green} />
              </View>
              <Text style={styles.tipTitle}>Keep Improving</Text>
              <Text style={styles.tipText}>
                UniHelp is constantly updated with new features and improvements.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 0,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surface,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  faqList: {
    gap: spacing.sm,
  },
  faqItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  faqItemPressed: {
    backgroundColor: colors.canvasLight,
  },
  faqItemOpen: {
    borderColor: colors.brandBorder,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  faqIconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 20,
  },
  faqQuestionOpen: {
    color: colors.brandText,
  },
  faqAnswerWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  faqAnswer: {
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 21,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  emptyText: {
    fontSize: 13,
    color: colors.grey,
  },
  tipsSection: {
    marginTop: spacing.sm,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  tipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tipCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  tipText: {
    fontSize: 12,
    color: colors.grey,
    lineHeight: 17,
  },
});
