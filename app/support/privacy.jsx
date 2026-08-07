import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InfoPage from "../../src/shared/screens/InfoPage";
import InfoCard from "../../src/shared/components/InfoCard";

export default function PrivacyPolicyPage() {
  return (
    <InfoPage
      title="Privacy Policy"
      subtitle="Your privacy matters to us. Here's how UniHelp collects, uses, and protects your information."
      sections={[
        {
          title: "1. Our Commitment",
          text: "At UniHelp, we are committed to protecting your privacy and ensuring your personal information is handled securely and responsibly. This Privacy Policy explains how we collect, use, and safeguard your data when you use our services.",
        },
        {
          title: "2. Information We Collect",
          text: "We may collect information you provide directly, including your name, email address, profile photo, institution, department, level, and any content you upload such as notes, marketplace listings, messages, or study materials.",
        },
        {
          title: "3. Automatically Collected Information",
          text: "When you use UniHelp, we may collect technical information such as your device type, operating system, app version, crash reports, usage statistics, and diagnostic information to improve app performance and reliability.",
        },
        {
          title: "4. How We Use Your Information",
          text: "Your information is used to create and manage your account, personalize your experience, sync your data across devices, provide customer support, improve our services, and develop new features.",
        },
        {
          title: "5. Study Data",
          text: "Your mock exam scores, study plans, revision progress, bookmarks, and learning analytics are securely stored so you can continue your learning journey across devices.",
        },
        {
          title: "6. Messages & Community Content",
          text: "Messages, study group discussions, posts, and uploaded materials are stored to deliver UniHelp's communication and collaboration features. We may review reported content to keep the community safe.",
        },
        {
          title: "7. Marketplace & Hostel Listings",
          text: "Information you publish in marketplace or hostel listings is visible to other users. Please avoid sharing sensitive personal information publicly.",
        },
        {
          title: "8. AI Assistant",
          text: "Questions submitted to the AI Assistant may be processed to generate responses and improve the quality of the service. Please avoid sharing confidential or highly sensitive information in AI conversations.",
        },
        {
          title: "9. Data Sharing",
          text: "UniHelp does not sell your personal information. We only share data with trusted service providers when necessary to operate the platform, comply with legal obligations, or protect users and the community.",
        },
        {
          title: "10. Data Security",
          text: "We use industry-standard security measures to protect your information from unauthorized access, loss, misuse, or disclosure. However, no online platform can guarantee absolute security.",
        },
        {
          title: "11. Your Rights",
          text: "You may update your profile information, change your password, request account deletion, or contact us regarding your personal data at any time through the app.",
        },
        {
          title: "12. Cookies & Analytics",
          text: "UniHelp may use analytics and similar technologies to understand app usage, measure performance, fix issues, and improve the overall user experience.",
        },
        {
          title: "13. Children's Privacy",
          text: "UniHelp is intended primarily for students. We do not knowingly collect personal information from children in violation of applicable laws. If such information is identified, appropriate action will be taken.",
        },
        {
          title: "14. Policy Updates",
          text: "We may update this Privacy Policy from time to time. Any significant changes will be communicated within the app, and continued use of UniHelp means you accept the updated policy.",
        },
        {
          title: "15. Contact Us",
          text: "If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact UniHelp Support through the Help & Support section in the app.",
        },
      ]}
    >
      <View style={styles.grid}>
        <InfoCard
          icon={
            <Ionicons
              name="shield-checkmark-outline"
              size={26}
              color="#22C55E"
            />
          }
          title="Your Data is Protected"
          text="We use modern security practices to help protect your personal information and account."
        />

        <InfoCard
          icon={
            <Ionicons
              name="lock-closed-outline"
              size={26}
              color="#22C55E"
            />
          }
          title="You Control Your Information"
          text="You can update your profile, manage your account, and request deletion of your personal data whenever you choose."
        />

        <InfoCard
          icon={
            <Ionicons
              name="analytics-outline"
              size={26}
              color="#22C55E"
            />
          }
          title="Improving UniHelp"
          text="Anonymous analytics and crash reports help us improve stability, fix bugs, and build better features for students."
        />

        <InfoCard
          icon={
            <Ionicons
              name="people-outline"
              size={26}
              color="#22C55E"
            />
          }
          title="Respecting Your Privacy"
          text="We never sell your personal information. Any data sharing is limited to trusted providers required to operate UniHelp or where required by law."
        />

        <InfoCard
          icon={
            <Ionicons
              name="mail-outline"
              size={26}
              color="#22C55E"
            />
          }
          title="Questions?"
          text="If you have questions about how we collect or use your information, please contact the UniHelp Support Team through the Help & Support section."
        />
      </View>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 14,
    paddingBottom: 24,
  },
});