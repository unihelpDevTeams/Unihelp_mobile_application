import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InfoPage from "../../src/shared/screens/InfoPage";
import InfoCard from "../../src/shared/components/InfoCard";

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms & Conditions"
      subtitle="Please read these terms carefully before using UniHelp."
      sections={[
        {
          title: "1. Acceptance of Terms",
          text: "By creating an account or using UniHelp, you agree to these Terms & Conditions. If you do not agree with any part of these terms, please discontinue using the app.",
        },
        {
          title: "2. Eligibility",
          text: "UniHelp is intended for students, educators, tutors, and individuals interested in educational resources. You are responsible for ensuring that the information you provide is accurate and up to date.",
        },
        {
          title: "3. Your Account",
          text: "You are responsible for maintaining the security of your account and password. Do not share your login credentials with anyone. You are responsible for all activities carried out through your account.",
        },
        {
          title: "4. Acceptable Use",
          text: "You agree not to misuse UniHelp. This includes uploading harmful content, impersonating others, sending spam, spreading malware, cheating during exams, or engaging in illegal or abusive activities.",
        },
        {
          title: "5. User Content",
          text: "You retain ownership of the notes, documents, images, marketplace listings, and other content you upload. By uploading content, you grant UniHelp permission to display and distribute it within the platform to provide our services.",
        },
        {
          title: "6. Academic Integrity",
          text: "UniHelp is designed to support learning. Users should not use the platform to promote academic dishonesty, examination malpractice, plagiarism, or any activity that violates educational policies.",
        },
        {
          title: "7. Marketplace & Hostel Listings",
          text: "Marketplace items and hostel listings are created by individual users. UniHelp does not own, inspect, or guarantee these listings. Always verify details before making payments or entering agreements.",
        },
        {
          title: "8. AI Assistant",
          text: "The AI Assistant provides educational guidance and study support. While we strive for accuracy, AI-generated responses may occasionally contain errors. Always verify important academic or professional information.",
        },
        {
          title: "9. Intellectual Property",
          text: "The UniHelp name, logo, design, and software are protected by applicable intellectual property laws. You may not copy, modify, distribute, or reproduce any part of the platform without permission.",
        },
        {
          title: "10. Privacy",
          text: "Your personal information is handled in accordance with our Privacy Policy. We are committed to protecting your data and using it responsibly.",
        },
        {
          title: "11. Suspension or Termination",
          text: "Accounts that violate these terms may be suspended or permanently removed without prior notice. Serious violations may also be reported to relevant authorities where required.",
        },
        {
          title: "12. Limitation of Liability",
          text: "UniHelp is provided 'as is'. We are not responsible for losses arising from service interruptions, user-generated content, marketplace transactions, hostel agreements, or reliance on AI-generated responses.",
        },
        {
          title: "13. Updates to These Terms",
          text: "These Terms & Conditions may change from time to time. Continued use of UniHelp after updates means you accept the revised terms.",
        },
        {
          title: "14. Contact Us",
          text: "If you have any questions regarding these Terms & Conditions, please contact the UniHelp Support Team through the Help & Support section within the app.",
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
          title="Use UniHelp Responsibly"
          text="Help us maintain a safe, respectful, and welcoming learning community by following these terms and treating others with respect."
        />

        <InfoCard
          icon={<Ionicons name="book-outline" size={26} color="#22C55E" />}
          title="Promote Honest Learning"
          text="UniHelp encourages genuine learning and collaboration. Do not use the platform for examination malpractice or academic dishonesty."
        />

        <InfoCard
          icon={<Ionicons name="people-outline" size={26} color="#22C55E" />}
          title="Respect Other Users"
          text="Harassment, hate speech, bullying, impersonation, or abusive behavior is not tolerated and may result in account suspension."
        />

        <InfoCard
          icon={
            <Ionicons
              name="cloud-upload-outline"
              size={26}
              color="#22C55E"
            />
          }
          title="Upload Responsibly"
          text="Only upload content that you own or have permission to share. Avoid uploading copyrighted or inappropriate materials."
        />

        <InfoCard
          icon={
            <Ionicons
              name="information-circle-outline"
              size={26}
              color="#22C55E"
            />
          }
          title="Need Assistance?"
          text="If you're unsure about any of these terms, our support team is always available to answer your questions."
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