import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import InfoPage from "../../src/shared/screens/InfoPage";
import InfoCard from "../../src/shared/components/InfoCard";
import { useTheme } from "../../src/shared/theme/ThemeContext";
import { useThemeStyles } from "../../src/shared/theme/createStyles";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TERMS_SECTIONS = [
  {
    id: '1',
    title: "1. Acceptance of Terms",
    text: "By creating an account or using UniHelp, you agree to these Terms & Conditions. If you do not agree with any part of these terms, please discontinue using the app.",
  },
  {
    id: '2',
    title: "2. Eligibility",
    text: "UniHelp is intended for students, educators, tutors, and individuals interested in educational resources. You are responsible for ensuring that the information you provide is accurate and up to date.",
  },
  {
    id: '3',
    title: "3. Your Account",
    text: "You are responsible for maintaining the security of your account and password. Do not share your login credentials with anyone. You are responsible for all activities carried out through your account.",
  },
  {
    id: '4',
    title: "4. Acceptable Use",
    text: "You agree not to misuse UniHelp. This includes uploading harmful content, impersonating others, sending spam, spreading malware, cheating during exams, or engaging in illegal or abusive activities.",
  },
  {
    id: '5',
    title: "5. User Content",
    text: "You retain ownership of the notes, documents, images, marketplace listings, and other content you upload. By uploading content, you grant UniHelp permission to display and distribute it within the platform to provide our services.",
  },
  {
    id: '6',
    title: "6. Academic Integrity",
    text: "UniHelp is designed to support learning. Users should not use the platform to promote academic dishonesty, examination malpractice, plagiarism, or any activity that violates educational policies.",
  },
  {
    id: '7',
    title: "7. Marketplace & Hostel Listings",
    text: "Marketplace items and hostel listings are created by individual users. UniHelp does not own, inspect, or guarantee these listings. Always verify details before making payments or entering agreements.",
  },
  {
    id: '8',
    title: "8. AI Assistant",
    text: "The AI Assistant provides educational guidance and study support. While we strive for accuracy, AI-generated responses may occasionally contain errors. Always verify important academic or professional information.",
  },
  {
    id: '9',
    title: "9. Intellectual Property",
    text: "The UniHelp name, logo, design, and software are protected by applicable intellectual property laws. You may not copy, modify, distribute, or reproduce any part of the platform without permission.",
  },
  {
    id: '10',
    title: "10. Privacy",
    text: "Your personal information is handled in accordance with our Privacy Policy. We are committed to protecting your data and using it responsibly.",
  },
  {
    id: '11',
    title: "11. Suspension or Termination",
    text: "Accounts that violate these terms may be suspended or permanently removed without prior notice. Serious violations may also be reported to relevant authorities where required.",
  },
  {
    id: '12',
    title: "12. Limitation of Liability",
    text: "UniHelp is provided 'as is'. We are not responsible for losses arising from service interruptions, user-generated content, marketplace transactions, hostel agreements, or reliance on AI-generated responses.",
  },
  {
    id: '13',
    title: "13. Updates to These Terms",
    text: "These Terms & Conditions may change from time to time. Continued use of UniHelp after updates means you accept the revised terms.",
  },
  {
    id: '14',
    title: "14. Contact Us",
    text: "If you have any questions regarding these Terms & Conditions, please contact the UniHelp Support Team through the Help & Support section within the app.",
  },
];

export default function TermsPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [expandedId, setExpandedId] = useState('1');

  const toggleSection = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const styles = useThemeStyles((c, s, r) => ({
    metaBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.xl,
      paddingHorizontal: s.md,
      paddingVertical: s.sm,
      borderWidth: 1,
      borderColor: c.borderDefault,
      marginBottom: s.lg,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },

    // Accordion List
    accordionContainer: {
      gap: s.sm,
      marginBottom: s.xl,
    },
    accordionCard: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: r.xl,
      borderWidth: 1,
      borderColor: c.borderDefault,
      overflow: 'hidden',
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: s.md,
    },
    accordionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textPrimary,
      flex: 1,
      paddingRight: s.xs,
    },
    accordionBody: {
      paddingHorizontal: s.md,
      paddingBottom: s.md,
      borderTopWidth: 1,
      borderTopColor: c.borderLight || c.borderDefault,
      paddingTop: s.sm,
    },
    accordionText: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 20,
    },

    // Highlights Section Header
    highlightsHeader: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: s.md,
      marginLeft: s.xs,
    },
    grid: {
      gap: s.md,
      paddingBottom: s['2xl'],
    },
  }));

  const accentColor = colors.brand || "#10B981";

  return (
    <InfoPage
      title="Terms & Conditions"
      subtitle="Please review our terms of service before using UniHelp."
    >
      {/* METADATA BAR */}
      <View style={styles.metaBar}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.metaText}>Updated: Aug 2026</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.metaText}>4 min read</Text>
        </View>
        <Pressable 
          onPress={() => router.navigate('/contact')}
          style={styles.metaItem}
          hitSlop={6}
        >
          <Ionicons name="help-circle-outline" size={15} color={accentColor} />
          <Text style={[styles.metaText, { color: accentColor, fontWeight: '700' }]}>Contact</Text>
        </Pressable>
      </View>

      {/* ACCORDION LEGAL SECTIONS */}
      <View style={styles.accordionContainer}>
        {TERMS_SECTIONS.map((section) => {
          const isExpanded = expandedId === section.id;
          return (
            <View key={section.id} style={styles.accordionCard}>
              <Pressable
                style={styles.accordionHeader}
                onPress={() => toggleSection(section.id)}
                accessibilityRole="button"
                accessibilityLabel={section.title}
              >
                <Text style={styles.accordionTitle}>{section.title}</Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textTertiary}
                />
              </Pressable>
              {isExpanded && (
                <View style={styles.accordionBody}>
                  <Text style={styles.accordionText}>{section.text}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* QUICK HIGHLIGHT CARDS */}
      <Text style={styles.highlightsHeader}>Key Guidelines</Text>
      <View style={styles.grid}>
        <InfoCard
          icon={<Ionicons name="shield-checkmark-outline" size={24} color={accentColor} />}
          title="Use UniHelp Responsibly"
          text="Help us maintain a safe, respectful, and welcoming learning community by following these terms and treating others with respect."
        />

        <InfoCard
          icon={<Ionicons name="book-outline" size={24} color={accentColor} />}
          title="Promote Honest Learning"
          text="UniHelp encourages genuine learning and collaboration. Do not use the platform for examination malpractice or academic dishonesty."
        />

        <InfoCard
          icon={<Ionicons name="people-outline" size={24} color={accentColor} />}
          title="Respect Other Users"
          text="Harassment, hate speech, bullying, impersonation, or abusive behavior is not tolerated and may result in account suspension."
        />

        <InfoCard
          icon={<Ionicons name="cloud-upload-outline" size={24} color={accentColor} />}
          title="Upload Responsibly"
          text="Only upload content that you own or have permission to share. Avoid uploading copyrighted or inappropriate materials."
        />

        <InfoCard
          icon={<Ionicons name="information-circle-outline" size={24} color={accentColor} />}
          title="Need Assistance?"
          text="If you're unsure about any of these terms, our support team is always available to answer your questions."
        />
      </View>
    </InfoPage>
  );
}