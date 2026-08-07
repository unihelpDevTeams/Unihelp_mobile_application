import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { FullScreenLoader } from './AILoaders';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { layout } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';
import { headerMenuSections } from '../navigation/menuConfig';
import { useAuth } from '../../../context/AuthContext';
import { filterMenuSectionsByRole } from '../navigation/routePermissions';
import { countUserUploads, fetchNotifications } from '../../../services/firestoreSync';
import { COLLECTIONS } from '../firestoreSchema';
import logo from '../../../assets/images/favicon.png';
import Footer from '../../../components/Footer';

const ROLE_LABELS = {
  university: 'University Student',
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || '?';
}

export default function ScreenShell({
  title = 'Unihelp',
  subtitle = '',
  showBack = false,
  scrollable = true,
  loading = false,
  children,
  actions = null,
  showMenu = true,
  menuSections = headerMenuSections,
  overlayContent = null,
  showFooter = false,
  footerProps = {},
}) {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const { isConnected } = useNetInfo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [uploadCounts, setUploadCounts] = useState({ hostels: 0, listings: 0, stories: 0 });
  const uid = profile?.uid || user?.uid;

  const styles = useThemeStyles((c, s, r) => ({
    screen: { flex: 1, backgroundColor: c.background },
    header: {
      paddingHorizontal: layout.screenPadding, paddingVertical: s.lg,
      backgroundColor: c.headerBackground, borderBottomWidth: 1, borderBottomColor: c.borderDefault,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
      zIndex: 5,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s.md, marginRight: s.md },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
    notificationButtonWrap: { position: 'relative' },
    offlineBanner: {
      marginHorizontal: layout.screenPadding,
      marginTop: s.md,
      paddingHorizontal: s.lg,
      paddingVertical: s.md,
      borderRadius: r.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm,
      backgroundColor: c.brandLight,
      borderWidth: 1,
      borderColor: c.brandBorder,
    },
    offlineBannerText: { flex: 1 },
    offlineBannerTitle: { fontSize: 13, fontWeight: '800', color: c.brandText },
    offlineBannerSubtitle: { marginTop: 2, fontSize: 12, color: c.textSecondary, lineHeight: 17 },
    notificationDot: {
      position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: 5,
      backgroundColor: c.red, borderWidth: 2, borderColor: c.surface,
    },
    logoFrame: {
      width: 44, height: 44, borderRadius: r.lg, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder,
    },
    logo: { width: 26, height: 26 },
    headingWrap: { flex: 1 },
    title: { fontSize: 20, fontWeight: '800', color: c.headerText, letterSpacing: -0.2 },
    subtitle: { marginTop: s.xs, fontSize: 13, color: c.textSecondary },
    iconButton: {
      width: layout.iconButtonSize, height: layout.iconButtonSize, borderRadius: r.md,
      backgroundColor: c.canvasLight, alignItems: 'center', justifyContent: 'center',
    },
    iconButtonPressed: { backgroundColor: c.borderDefault },
    scrollContent: { paddingHorizontal: layout.screenPadding, paddingTop: s.lg, paddingBottom: s['3xl'] },
    staticContent: { flex: 1, paddingHorizontal: layout.screenPadding, paddingTop: s.lg, paddingBottom: s['3xl'] },
    overlay: { ...StyleSheet.absoluteFillObject },
    modalBackdrop: { flex: 1, backgroundColor: c.overlay, flexDirection: 'row', justifyContent: 'flex-end' },
    menuCard: {
      width: '86%', maxWidth: 380, height: '100%', backgroundColor: c.modalBackground,
      borderTopLeftRadius: r['2xl'], borderBottomLeftRadius: r['2xl'],
      paddingTop: s.xl, paddingHorizontal: layout.screenPadding,
    },
    menuCardTouchable: { flex: 1 },
    menuProfileRow: { flexDirection: 'row', alignItems: 'center', gap: s.md },
    menuAvatar: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: c.brand,
      alignItems: 'center', justifyContent: 'center',
    },
    menuAvatarText: { color: c.onBrand, fontSize: 17, fontWeight: '800' },
    menuProfileTextWrap: { flex: 1, gap: 4 },
    menuProfileName: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    menuRolePill: {
      alignSelf: 'flex-start', paddingHorizontal: s.sm, paddingVertical: 2,
      borderRadius: 999, backgroundColor: c.brandLight, borderWidth: 1, borderColor: c.brandBorder,
    },
    menuRolePillText: { fontSize: 10.5, fontWeight: '800', color: c.brandText, letterSpacing: 0.3 },
    menuDivider: { height: 1, backgroundColor: c.borderDefault, marginTop: s.lg, marginBottom: s.xs },
    menuContent: { paddingTop: s.lg, paddingBottom: s['2xl'] },
    menuSection: { marginBottom: s['2xl'] },
    menuSectionFirst: { marginTop: 0 },
    menuSectionTitle: {
      fontSize: 11, fontWeight: '800', letterSpacing: 1, color: c.textTertiary,
      textTransform: 'uppercase', marginBottom: s.sm, marginLeft: s.xs,
    },
    menuSectionCard: {
      backgroundColor: c.surfaceSecondary, borderRadius: r.xl, borderWidth: 1, borderColor: c.borderDefault, overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: s.md, paddingHorizontal: s.lg, borderBottomWidth: 1, borderBottomColor: c.borderDefault,
    },
    menuItemLast: { borderBottomWidth: 0 },
    menuItemPressed: { backgroundColor: c.brandLight },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: s.sm, flexShrink: 1 },
    menuItemIconWrap: { width: 28, height: 28, borderRadius: r.sm, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    menuItemText: { color: c.textPrimary, fontWeight: '700', fontSize: 14, flexShrink: 1 },
    menuEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: s['4xl'], gap: s.sm },
    menuEmptyText: { color: c.textTertiary, fontSize: 13, textAlign: 'center', maxWidth: 220 },
  }));

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadUnread = async () => {
        try {
          const items = await fetchNotifications();
          if (!cancelled) setHasUnreadNotifications((items || []).some((item) => !item.read));
        } catch { if (!cancelled) setHasUnreadNotifications(false); }
      };
      loadUnread();
      return () => { cancelled = true; };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadUploadCounts = async () => {
        if (!uid) {
          if (!cancelled) setUploadCounts({ hostels: 0, listings: 0, stories: 0 });
          return;
        }

        try {
          const [hostels, listings, stories] = await Promise.all([
            countUserUploads(COLLECTIONS.hostels, uid, 'userId'),
            countUserUploads(COLLECTIONS.studentMarketplace, uid, 'userId'),
            countUserUploads(COLLECTIONS.stories, uid, 'authorId'),
          ]);
          if (!cancelled) setUploadCounts({ hostels, listings, stories });
        } catch {
          if (!cancelled) setUploadCounts({ hostels: 0, listings: 0, stories: 0 });
        }
      };

      loadUploadCounts();
      return () => { cancelled = true; };
    }, [uid])
  );

  const filteredMenuSections = useMemo(() => {
    const roleFilteredSections = profile?.role ? filterMenuSectionsByRole(menuSections, profile.role) : menuSections;
    return roleFilteredSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.requiresUpload || uploadCounts[item.requiresUpload] > 0),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSections, profile?.role, uploadCounts]);

  const showUniversityIcons = !profile?.role || profile?.role === 'university';
  const body = loading ? <FullScreenLoader label="Loading..." /> : children;
  const footer = showFooter ? <Footer {...footerProps} /> : null;

  const content = scrollable ? (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <OfflineNotice visible={isConnected === false} colors={colors} styles={styles} />
      {body}
      {footer}
    </ScrollView>
  ) : (
    <View style={styles.staticContent}>
      <OfflineNotice visible={isConnected === false} colors={colors} styles={styles} />
      {body}
      {footer}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderBar
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        onBack={() => router.back()}
        showSearch={showUniversityIcons}
        onSearch={() => router.push('/search')}
        showNotifications={showUniversityIcons}
        hasUnreadNotifications={hasUnreadNotifications}
        onNotifications={() => router.push('/notifications')}
        showMenu={showMenu}
        onMenu={() => setMenuOpen(true)}
        actions={actions}
        colors={colors}
        styles={styles}
      />
      {content}
      {overlayContent ? (
        <View pointerEvents="box-none" style={styles.overlay}>{overlayContent}</View>
      ) : null}
      <MenuDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(route) => { setMenuOpen(false); router.push(route); }}
        sections={filteredMenuSections}
        profile={profile}
        colors={colors}
        styles={styles}
      />
    </SafeAreaView>
  );
}

function OfflineNotice({ visible, colors, styles }) {
  if (!visible) return null;
  return (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline-outline" size={18} color={colors.brand} />
      <View style={styles.offlineBannerText}>
        <Text style={styles.offlineBannerTitle}>You’re offline</Text>
        <Text style={styles.offlineBannerSubtitle}>Some features may be unavailable until your connection is back.</Text>
      </View>
    </View>
  );
}

function HeaderBar({
  title, subtitle, showBack, onBack,
  showSearch, onSearch, showNotifications, hasUnreadNotifications, onNotifications,
  showMenu, onMenu, actions, colors, styles,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {showBack ? (
            <IconButton icon="arrow-back" onPress={onBack} accessibilityLabel="Go back" colors={colors} styles={styles} />
          ) : (
            <View style={styles.logoFrame}>
              <Image source={logo} style={styles.logo} contentFit="contain" />
            </View>
          )}
          <View style={styles.headingWrap}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.headerRight}>
          {actions}
          {showSearch ? (
            <IconButton icon="search-outline" onPress={onSearch} accessibilityLabel="Search" colors={colors} styles={styles} />
          ) : null}
          {showNotifications ? (
            <View style={styles.notificationButtonWrap}>
              <IconButton icon="notifications-outline" onPress={onNotifications} accessibilityLabel="Open notifications" colors={colors} styles={styles} />
              {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
            </View>
          ) : null}
          {showMenu ? (
            <IconButton icon="menu" onPress={onMenu} accessibilityLabel="Open menu" colors={colors} styles={styles} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function MenuDrawer({ visible, onClose, onNavigate, sections, profile, colors, styles }) {
  const { width: screenWidth } = useWindowDimensions();
  const drawerX = useRef(new Animated.Value(screenWidth)).current;

  useEffect(() => {
    if (visible) {
      drawerX.setValue(screenWidth);
      Animated.timing(drawerX, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible, drawerX, screenWidth]);

  const handleClose = useCallback(() => {
    Animated.timing(drawerX, { toValue: screenWidth, duration: 200, useNativeDriver: true }).start(() => {
      onClose();
    });
  }, [drawerX, screenWidth, onClose]);

  const profileName = profile?.username || 'Student';
  const roleLabel = profile?.role ? (ROLE_LABELS[profile.role] || profile.role) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.modalBackdrop} onPress={handleClose}>
        <Animated.View style={[styles.menuCard, { transform: [{ translateX: drawerX }] }]}>
          <Pressable style={styles.menuCardTouchable} onPress={(event) => event.stopPropagation()}>
            <View style={styles.menuProfileRow}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>{getInitials(profileName)}</Text>
              </View>
              <View style={styles.menuProfileTextWrap}>
                <Text style={styles.menuProfileName} numberOfLines={1}>{profileName}</Text>
                {roleLabel ? (
                  <View style={styles.menuRolePill}>
                    <Text style={styles.menuRolePillText}>{roleLabel}</Text>
                  </View>
                ) : null}
              </View>
              <IconButton icon="close" onPress={handleClose} accessibilityLabel="Close menu" colors={colors} styles={styles} />
            </View>
            <View style={styles.menuDivider} />
            {sections.length ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuContent}>
                {sections.map((section, sectionIndex) => (
                  <View key={section.title} style={[styles.menuSection, sectionIndex === 0 && styles.menuSectionFirst]}>
                    <Text style={styles.menuSectionTitle}>{section.title}</Text>
                    <View style={styles.menuSectionCard}>
                      {section.items.map((item, itemIndex) => (
                        <Pressable
                          key={item.route}
                          onPress={() => onNavigate(item.route)}
                          style={({ pressed }) => [styles.menuItem, itemIndex === section.items.length - 1 && styles.menuItemLast, pressed && styles.menuItemPressed]}
                        >
                          <View style={styles.menuItemLeft}>
                            {item.icon ? (
                              <View style={styles.menuItemIconWrap}>
                                <Ionicons name={item.icon} size={15} color={colors.brand} />
                              </View>
                            ) : null}
                            <Text style={styles.menuItemText}>{item.label}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.menuEmpty}>
                <Ionicons name="grid-outline" size={22} color={colors.greyLight} />
                <Text style={styles.menuEmptyText}>No menu items available for your role yet.</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function IconButton({ icon, onPress, accessibilityLabel, colors, styles }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
      hitSlop={6}
    >
      <Ionicons name={icon} size={18} color={colors.icon} />
    </Pressable>
  );
}
