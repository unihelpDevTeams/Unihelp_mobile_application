import React from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../src/shared/theme/createStyles';
import logo from '../assets/images/favicon.png';

export default function Header({ title = 'Unihelp', subtitle = 'Study made simple', showBack = false }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: s.lg, paddingTop: s.md, paddingBottom: s.lg,
      backgroundColor: c.header, borderBottomWidth: 1, borderBottomColor: c.borderDefault,
    },
    brandWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: s.sm },
    logoFrame: { width: 42, height: 42, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
    logo: { width: 24, height: 24 },
    brandTextWrap: { flex: 1, gap: 1 },
    brandName: { fontSize: 17, fontWeight: '800', color: c.headerText, letterSpacing: -0.2 },
    brandSubtitle: { fontSize: 12, fontWeight: '500', color: c.textSecondary },
    actions: { flexDirection: 'row', alignItems: 'center', gap: s.sm, marginLeft: s.md },
    actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: s.md, height: 38, borderRadius: r.full, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder },
    actionText: { color: c.brandText, fontSize: 12, fontWeight: '700' },
    iconButton: { width: 38, height: 38, borderRadius: r.full, backgroundColor: c.surfaceSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.borderDefault },
    primaryIconButton: { backgroundColor: c.brandText, borderColor: c.brandText },
    pressed: { opacity: 0.6 },
    primaryPressed: { backgroundColor: c.brandDark, borderColor: c.brandDark },
  }));
  const profileRoute = '/(tabs)/profile';

  return (
    <View style={styles.header}>
      <View style={styles.brandWrap}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={18} color={colors.headerText} />
          </Pressable>
        ) : (
          <View style={styles.logoFrame}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>
        )}

        <View style={styles.brandTextWrap}>
          <Text style={styles.brandName} numberOfLines={1}>{title}</Text>
          <Text style={styles.brandSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionChip, pressed && styles.pressed]}
          onPress={() => router.push('/messages')}
          hitSlop={6}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.brandText} />
          <Text style={styles.actionText}>DM</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          onPress={() => router.push(profileRoute)}
          hitSlop={8}
        >
          <Ionicons name="person-outline" size={18} color={colors.headerText} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.iconButton, styles.primaryIconButton, pressed && styles.primaryPressed]}
          onPress={() => router.push('/uploadquestion')}
          hitSlop={8}
        >
          <Ionicons name="add" size={20} color={colors.onBrand} />
        </Pressable>
      </View>
    </View>
  );
}
