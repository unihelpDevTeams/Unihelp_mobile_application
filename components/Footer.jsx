import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';
import { gradients, darkGradients } from '../src/shared/theme';
import logo from '../assets/images/favicon.png';

const DEFAULT_LINK_SECTIONS = [
  {
    title: 'Platform',
    links: [
      { label: 'About', route: '/about' },
      { label: 'Help Center', route: '/help-center' },
      { label: 'Suggest Feature', route: '/suggest' },
      { label: 'FAQ', route: '/faq' },
    ],
  },
  {
    title: 'Legal & Support',
    links: [
      { label: 'Terms of Service', route: '/terms' },
      { label: 'Privacy Policy', route: '/privacy' },
      { label: 'Contact Us', route: '/contact' },
    ],
  },
];

export default function Footer({
  title = 'Unihelp',
  tagline = 'Study made simple',
  sections = DEFAULT_LINK_SECTIONS,
  showCopyright = true,
  onBackToTop = null,
}) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const year = new Date().getFullYear();
  const brandGradient = isDark ? darkGradients.brand : gradients.brand;

  const styles = useThemeStyles((c, s, r) => ({
    footerContainer: {
      marginTop: s['3xl'],
      backgroundColor: c.surfaceSecondary,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
      position: 'relative',
      overflow: 'hidden',
    },
    signatureBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
    },
    contentPadding: {
      paddingTop: s.xl,
      paddingHorizontal: s.lg,
      paddingBottom: s.xl,
    },

    // Header Branding + Back to Top
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: s.xl,
    },
    brandWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      flex: 1,
    },
    logoFrame: {
      width: 42,
      height: 42,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brandLight,
      borderWidth: 1,
      borderColor: c.brandBorder,
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    logo: {
      width: 24,
      height: 24,
    },
    brandTextWrap: {
      flex: 1,
      gap: 2,
    },
    brandName: {
      fontSize: 17,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    brandTagline: {
      fontSize: 11,
      fontWeight: '700',
      color: c.brandText,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    backToTopButton: {
      width: 36,
      height: 36,
      borderRadius: r.md,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderDefault,
    },

    // Link Columns Layout
    sectionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.xl,
      paddingVertical: s.md,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.borderLight || c.borderDefault,
      marginBottom: s.lg,
    },
    sectionColumn: {
      flex: 1,
      minWidth: 140,
      gap: s.xs,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: s.xs,
    },
    linkItem: {
      paddingVertical: 5,
    },
    linkText: {
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    linkTextPressed: {
      color: c.brandText,
    },

    // Bottom Bar
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s.md,
    },
    copyrightWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    copyrightText: {
      color: c.textTertiary,
      fontSize: 11.5,
      fontWeight: '500',
      flexShrink: 1,
    },
    badgeVersion: {
      paddingHorizontal: s.sm,
      paddingVertical: 3,
      borderRadius: r.sm,
      backgroundColor: c.brandLight,
      borderWidth: 1,
      borderColor: c.brandBorder,
    },
    versionText: {
      color: c.brandText,
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
  }));

  return (
    <View style={styles.footerContainer}>
      {/* Top Gradient Accent Line */}
      <LinearGradient
        colors={brandGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.signatureBar}
      />

      <View style={styles.contentPadding}>
        {/* BRAND ROW WITH BACK TO TOP */}
        <View style={styles.headerRow}>
          <View style={styles.brandWrap}>
            <View style={styles.logoFrame}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandName} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.brandTagline} numberOfLines={1}>
                {tagline}
              </Text>
            </View>
          </View>

          {onBackToTop && (
            <Pressable
              onPress={onBackToTop}
              style={({ pressed }) => [
                styles.backToTopButton,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scroll to top"
              hitSlop={6}
            >
              <Ionicons name="arrow-up" size={18} color={colors.textPrimary} />
            </Pressable>
          )}
        </View>

        {/* CATEGORIZED LINKS GRID */}
        {sections.length > 0 && (
          <View style={styles.sectionsGrid}>
            {sections.map((section) => (
              <View key={section.title} style={styles.sectionColumn}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.links.map((link) => (
                  <Pressable
                    key={link.route || link.label}
                    onPress={() => router.push(link.route)}
                    style={styles.linkItem}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={link.label}
                  >
                    {({ pressed }) => (
                      <Text
                        style={[
                          styles.linkText,
                          pressed && styles.linkTextPressed,
                        ]}
                      >
                        {link.label}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* COPYRIGHT & VERSION */}
        {showCopyright && (
          <View style={styles.bottomRow}>
            <View style={styles.copyrightWrap}>
              <Ionicons name="school-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.copyrightText} numberOfLines={1}>
                © {year} {title} · All rights reserved
              </Text>
            </View>
            <View style={styles.badgeVersion}>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}