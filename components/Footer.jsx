import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';
import { gradients, darkGradients } from '../src/shared/theme';
import logo from '../assets/images/favicon.png';

const DEFAULT_LINKS = [
  { label: 'About', route: '/about' },
  { label: 'Help Center', route: '/help-center' },
  { label: 'Suggest', route: '/suggest' },
  { label: 'Terms', route: '/terms' },
  { label: 'FAQ', route: '/faq' },
  { label: 'Privacy', route: '/privacy' },
  { label: 'Contact', route: '/contact' },
];

export default function Footer({
  title = 'Unihelp',
  tagline = 'Study made simple',
  links = DEFAULT_LINKS,
  showCopyright = true,
}) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const year = new Date().getFullYear();
  const brandGradient = isDark ? darkGradients.brand : gradients.brand;

  const styles = useThemeStyles((c, s, r) => ({
    footer: {
      marginTop: s['2xl'],
      paddingTop: s.xl,
      paddingHorizontal: s.lg,
      paddingBottom: s.xl,
      backgroundColor: c.surfaceSecondary,
      overflow: 'hidden',
    },
    signatureBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2.5,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      marginBottom: s.lg,
    },
    logoFrame: {
      width: 38,
      height: 38,
      borderRadius: r.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.brandLight,
      borderWidth: 1,
      borderColor: c.brandBorder,
    },
    logo: { width: 22, height: 22 },
    brandTextWrap: { flex: 1, gap: 2 },
    brandName: {
      fontSize: 15.5,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    brandTagline: {
      fontSize: 11.5,
      fontWeight: '600',
      color: c.textTertiary,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    divider: { height: 1, backgroundColor: c.borderLight, marginBottom: s.lg },
    linksRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      rowGap: s.xs,
    },
    linkPressable: { paddingVertical: 3 },
    linkText: {
      color: c.textSecondary,
      fontSize: 12.5,
      fontWeight: '600',
      letterSpacing: 0.1,
    },
    linkTextPressed: {
      color: c.brandText,
      textDecorationLine: 'underline',
    },
    linkDivider: {
      color: c.textTertiary,
      fontSize: 12,
      marginHorizontal: 9,
    },
    copyrightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: s.lg,
    },
    copyrightTextWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    copyright: {
      color: c.textTertiary,
      fontSize: 11,
      flexShrink: 1,
    },
    version: {
      color: c.textTertiary,
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  }));

  return (
    <View style={styles.footer}>
      <LinearGradient
        colors={brandGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.signatureBar}
      />

      <View style={styles.brandRow}>
        <View style={styles.logoFrame}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.brandTextWrap}>
          <Text style={styles.brandName} numberOfLines={1}>{title}</Text>
          <Text style={styles.brandTagline} numberOfLines={1}>{tagline}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {links.length > 0 ? (
        <View style={styles.linksRow}>
          {links.map((link, index) => (
            <React.Fragment key={link.route || link.label}>
              <Pressable
                onPress={() => router.push(link.route)}
                style={styles.linkPressable}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={link.label}
              >
                {({ pressed }) => (
                  <Text style={[styles.linkText, pressed && styles.linkTextPressed]}>
                    {link.label}
                  </Text>
                )}
              </Pressable>
              {index < links.length - 1 ? (
                <Text style={styles.linkDivider}>·</Text>
              ) : null}
            </React.Fragment>
          ))}
        </View>
      ) : null}

      {showCopyright ? (
        <View style={styles.copyrightRow}>
          <View style={styles.copyrightTextWrap}>
            <Ionicons name="school-outline" size={12} color={colors.textTertiary} />
            <Text style={styles.copyright} numberOfLines={1}>
              © {year} Unihelp · All rights reserved
            </Text>
          </View>
          <Text style={styles.version}>v1.0.0</Text>
        </View>
      ) : null}
    </View>
  );
}