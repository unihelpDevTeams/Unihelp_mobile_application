import React from 'react';
import { Image, Linking, Pressable, Text, View, useWindowDimensions } from 'react-native';
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

// Below this content width, link columns stack full-width instead of
// wrapping into cramped side-by-side columns.
const NARROW_BREAKPOINT = 400;

export default function Footer({
  title = 'Unihelp',
  tagline = 'Study made simple',
  sections = DEFAULT_LINK_SECTIONS,
  showCopyright = true,
  onBackToTop = null,
  version = 'v1.0.1',
  socialLinks = [], // e.g. [{ icon: 'logo-instagram', url: 'https://instagram.com/...', label: 'Instagram' }]
}) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const year = new Date().getFullYear();
  const brandGradient = isDark ? darkGradients.brand : gradients.brand;
  const isNarrow = width < NARROW_BREAKPOINT;

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
      marginBottom: s.lg,
      gap: s.sm,
    },
    brandWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      flex: 1,
    },
    logoRing: {
      width: 46,
      height: 46,
      borderRadius: r.lg + 2,
      padding: 2,
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 5,
    },
    logoFrame: {
      flex: 1,
      borderRadius: r.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },
    logo: {
      width: 22,
      height: 22,
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 36,
      paddingHorizontal: s.md,
      borderRadius: r.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    backToTopText: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },

    // Optional social row
    socialRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s.sm,
      marginBottom: s.lg,
    },
    socialButton: {
      width: 34,
      height: 34,
      borderRadius: r.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialButtonPressed: {
      backgroundColor: c.brandLight,
      borderColor: c.brandBorder,
    },

    // Link Columns Layout
    sectionsGrid: {
      flexDirection: isNarrow ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: isNarrow ? s.lg : s.xl,
      paddingVertical: s.md,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.borderLight || c.borderDefault,
      marginBottom: s.lg,
    },
    sectionColumn: {
      flex: isNarrow ? undefined : 1,
      width: isNarrow ? '100%' : undefined,
      minWidth: isNarrow ? undefined : 140,
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
      paddingVertical: 8,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      rowGap: s.sm,
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

  const openSocialLink = (link) => {
    if (!link) return;
    if (link.url) {
      Linking.openURL(link.url).catch(() => {});
    } else if (link.route) {
      router.push(link.route);
    }
  };

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
            <LinearGradient colors={brandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoRing}>
              <View style={styles.logoFrame}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
              </View>
            </LinearGradient>
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
                pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scroll to top"
              hitSlop={6}
            >
              <Ionicons name="arrow-up" size={14} color={colors.textSecondary} />
              <Text style={styles.backToTopText}>Top</Text>
            </Pressable>
          )}
        </View>

        {/* OPTIONAL SOCIAL LINKS */}
        {socialLinks.length > 0 && (
          <View style={styles.socialRow}>
            {socialLinks.map((link) => (
              <Pressable
                key={link.label}
                onPress={() => openSocialLink(link)}
                style={({ pressed }) => [styles.socialButton, pressed && styles.socialButtonPressed]}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={link.label}
              >
                <Ionicons name={link.icon} size={16} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        )}

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
                      <View style={styles.linkRow}>
                        <Text
                          style={[
                            styles.linkText,
                            pressed && styles.linkTextPressed,
                          ]}
                        >
                          {link.label}
                        </Text>
                        {pressed && (
                          <Ionicons name="chevron-forward" size={12} color={colors.brandText} />
                        )}
                      </View>
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
              <Text style={styles.versionText}>{version}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}