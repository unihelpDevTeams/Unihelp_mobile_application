import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, KeyboardAvoidingView } from 'react-native';
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
import ThemeToggle from './ThemeToggle';
import ConfirmDialog from './ConfirmDialog';
import { useAuth } from '../../../context/AuthContext';
import { filterMenuSectionsByRole } from '../navigation/routePermissions';
import { countUserUploads, fetchNotifications } from '../../../services/firestoreSync';
import { COLLECTIONS } from '../firestoreSchema';
import logo from '../../../assets/images/favicon.png';

const ROLE_LABELS = {
  university: 'University Student',
};

// Item counts large enough to need a search box in the drawer.
const MENU_SEARCH_THRESHOLD = 7;

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || '?';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
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
  onProfilePress,
  menuFooterNote,
}) {
  const router = useRouter();
  const { profile, user, logout } = useAuth();
  const { colors } = useTheme();
  const { isConnected } = useNetInfo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
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

    // ---- Menu drawer -----------------------------------------------------
    modalRoot: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
    modalScrim: { backgroundColor: c.overlay },
    menuCard: {
      width: '86%', maxWidth: 380, height: '100%', backgroundColor: c.modalBackground,
      borderTopLeftRadius: r['2xl'], borderBottomLeftRadius: r['2xl'],
      shadowColor: c.shadow, shadowOffset: { width: -4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12,
    },
    menuCardTouchable: { flex: 1 },
    menuTopRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: s.xl, paddingHorizontal: layout.screenPadding, paddingBottom: s.sm,
    },
    menuEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: c.textTertiary, textTransform: 'uppercase' },

    menuProfileCard: {
      marginHorizontal: layout.screenPadding,
      marginTop: s.xs,
      backgroundColor: c.brandLight,
      borderWidth: 1,
      borderColor: c.brandBorder,
      borderRadius: r.xl,
      padding: s.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.md,
    },
    menuProfileCardPressed: { backgroundColor: c.brandBorder },
    menuAppearanceCard: {
      marginHorizontal: layout.screenPadding,
      marginTop: s.sm,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.xl,
      paddingVertical: s.sm,
      paddingHorizontal: s.md,
    },
    menuAppearanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s.sm,
    },
    menuAppearanceTextWrap: { flex: 1, gap: 2 },
    menuAppearanceTitle: { fontSize: 14, fontWeight: '800', color: c.textPrimary },
    menuAppearanceSubtitle: { fontSize: 11, color: c.textSecondary },
    menuAvatarRing: {
      width: 60, height: 60, borderRadius: 30, padding: 3,
      backgroundColor: c.modalBackground, borderWidth: 1, borderColor: c.brandBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    menuAvatar: {
      width: 50, height: 50, borderRadius: 25, backgroundColor: c.brand,
      alignItems: 'center', justifyContent: 'center',
    },
    menuAvatarText: { color: c.onBrand, fontSize: 18, fontWeight: '800' },
    menuProfileTextWrap: { flex: 1, gap: 3 },
    menuGreeting: { fontSize: 11, fontWeight: '700', color: c.brandText },
    menuProfileName: { fontSize: 16.5, fontWeight: '800', color: c.textPrimary },
    menuBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    menuRolePill: {
      alignSelf: 'flex-start', paddingHorizontal: s.sm, paddingVertical: 2,
      borderRadius: 999, backgroundColor: c.modalBackground, borderWidth: 1, borderColor: c.brandBorder,
    },
    menuRolePillText: { fontSize: 10.5, fontWeight: '800', color: c.brandText, letterSpacing: 0.3 },
    menuPremiumPill: {
      flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
      paddingHorizontal: s.sm, paddingVertical: 2, borderRadius: 999, backgroundColor: c.brandDark,
    },
    menuPremiumPillText: { fontSize: 10, fontWeight: '900', color: c.onBrand, letterSpacing: 0.3 },

    menuSearchWrap: {
      marginHorizontal: layout.screenPadding,
      marginTop: s.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surfaceSecondary,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: r.lg,
      paddingHorizontal: s.sm,
      height: 40,
    },
    menuSearchInput: { flex: 1, fontSize: 13.5, color: c.textPrimary, paddingVertical: 0 },

    menuDivider: { height: 1, backgroundColor: c.borderDefault, marginTop: s.lg, marginHorizontal: layout.screenPadding },
    menuContent: { paddingTop: s.lg, paddingHorizontal: layout.screenPadding, paddingBottom: s.md },
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
    menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    menuItemBadge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' },
    menuItemBadgeText: { color: c.onBrand, fontSize: 10.5, fontWeight: '800' },
    menuEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: s['4xl'], gap: s.sm },
    menuEmptyText: { color: c.textTertiary, fontSize: 13, textAlign: 'center', maxWidth: 220 },
    menuFooterNote: {
      paddingHorizontal: layout.screenPadding, paddingVertical: s.md,
      borderTopWidth: 1, borderTopColor: c.borderDefault,
    },
    menuFooterNoteText: { fontSize: 11, color: c.textTertiary, textAlign: 'center' },
    menuLogoutWrap: {
      paddingHorizontal: layout.screenPadding,
      paddingVertical: s.md,
      borderTopWidth: 1,
      borderTopColor: c.borderDefault,
    },
    menuLogoutButton: {
      minHeight: 46,
      borderRadius: r.lg,
      backgroundColor: c.dangerLight,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.sm,
    },
    menuLogoutButtonPressed: { opacity: 0.75 },
    menuLogoutText: { color: c.danger, fontSize: 14, fontWeight: '900' },
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
        items: section.items
          .filter((item) => !item.requiresUpload || uploadCounts[item.requiresUpload] > 0)
          .map((item) => (item.requiresUpload ? { ...item, count: uploadCounts[item.requiresUpload] } : item)),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSections, profile?.role, uploadCounts]);

  const showUniversityIcons = !profile?.role || profile?.role === 'university';
  const body = loading ? <FullScreenLoader label="Loading..." /> : children;
  const footer = showFooter ? <View style={{ height: 12 }} /> : null;

  const confirmLogout = useCallback(() => {
    setMenuOpen(false);
    setLogoutConfirmOpen(true);
  }, []);

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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
      </KeyboardAvoidingView>
      <MenuDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={(route) => { setMenuOpen(false); router.push(route); }}
        sections={filteredMenuSections}
        profile={profile}
        onProfilePress={onProfilePress ? () => { setMenuOpen(false); onProfilePress(); } : null}
        onLogout={confirmLogout}
        footerNote={menuFooterNote}
        colors={colors}
        styles={styles}
      />
      <ConfirmDialog
        visible={logoutConfirmOpen}
        title="Sign out?"
        message="You will need to sign back in to access your account."
        confirmLabel="Sign out"
        variant="destructive"
        icon="log-out-outline"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          logout();
        }}
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

// ---------------------------------------------------------------------------
// MenuDrawer
// A single organized surface: eyebrow + close, a profile card (avatar ring,
// time-aware greeting, name, role + premium badges), an optional search box
// that only appears once there are enough items to be worth filtering, then
// grouped sections with count badges, and an optional footer note.
// ---------------------------------------------------------------------------
function MenuDrawer({ visible, onClose, onNavigate, sections, profile, onProfilePress, onLogout, footerNote, colors, styles }) {
  const { width: screenWidth } = useWindowDimensions();
  const { isDark } = useTheme();
  const drawerX = useRef(new Animated.Value(screenWidth)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      drawerX.setValue(screenWidth);
      scrimOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(drawerX, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, drawerX, scrimOpacity, screenWidth]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerX, { toValue: screenWidth, duration: 200, useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [drawerX, scrimOpacity, screenWidth, onClose]);

  const totalItemCount = useMemo(
    () => sections.reduce((sum, section) => sum + section.items.length, 0),
    [sections]
  );

  const visibleSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sections;
    return sections
      .map((section) => ({ ...section, items: section.items.filter((item) => item.label.toLowerCase().includes(query)) }))
      .filter((section) => section.items.length > 0);
  }, [sections, searchQuery]);

  const profileName = profile?.username || 'Student';
  const roleLabel = profile?.role ? (ROLE_LABELS[profile.role] || profile.role) : null;
  const showSearch = totalItemCount >= MENU_SEARCH_THRESHOLD;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.modalScrim, { opacity: scrimOpacity }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close menu" />
        </Animated.View>

        <Animated.View style={[styles.menuCard, { transform: [{ translateX: drawerX }] }]} accessibilityViewIsModal>
          <Pressable style={styles.menuCardTouchable} onPress={(event) => event.stopPropagation()}>
            <View style={styles.menuTopRow}>
              <Text style={styles.menuEyebrow}>Menu</Text>
              <IconButton icon="close" onPress={handleClose} accessibilityLabel="Close menu" colors={colors} styles={styles} />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.menuProfileCard,
                onProfilePress && pressed && styles.menuProfileCardPressed,
              ]}
              onPress={onProfilePress || undefined}
              disabled={!onProfilePress}
              accessibilityRole={onProfilePress ? 'button' : undefined}
              accessibilityLabel={onProfilePress ? `View profile, ${profileName}` : undefined}
            >
              <View style={styles.menuAvatarRing}>
                <View style={styles.menuAvatar}>
                  <Text style={styles.menuAvatarText}>{getInitials(profileName)}</Text>
                </View>
              </View>
              <View style={styles.menuProfileTextWrap}>
                <Text style={styles.menuGreeting}>{getGreeting()}</Text>
                <Text style={styles.menuProfileName} numberOfLines={1}>{profileName}</Text>
                <View style={styles.menuBadgeRow}>
                  {roleLabel ? (
                    <View style={styles.menuRolePill}>
                      <Text style={styles.menuRolePillText}>{roleLabel}</Text>
                    </View>
                  ) : null}
                  {profile?.premium ? (
                    <View style={styles.menuPremiumPill}>
                      <Ionicons name="star" size={9} color={colors.onBrand} />
                      <Text style={styles.menuPremiumPillText}>PRO</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {onProfilePress ? <Ionicons name="chevron-forward" size={17} color={colors.greyLight} /> : null}
            </Pressable>

            <View style={styles.menuAppearanceCard}>
              <View style={styles.menuAppearanceRow}>
                <View style={styles.menuAppearanceTextWrap}>
                  <Text style={styles.menuAppearanceTitle}>Appearance</Text>
                  <Text style={styles.menuAppearanceSubtitle}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
                </View>
                <ThemeToggle />
              </View>
            </View>

            {showSearch ? (
              <View style={styles.menuSearchWrap}>
                <Ionicons name="search-outline" size={15} color={colors.greyLight} />
                <TextInput
                  style={styles.menuSearchInput}
                  placeholder="Find in menu"
                  placeholderTextColor={colors.greyLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  accessibilityLabel="Search menu items"
                  returnKeyType="search"
                />
                {searchQuery ? (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                    <Ionicons name="close-circle" size={16} color={colors.greyLight} />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={styles.menuDivider} />
            )}

            {visibleSections.length ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuContent} keyboardShouldPersistTaps="handled">
                {visibleSections.map((section, sectionIndex) => (
                  <View key={section.title} style={[styles.menuSection, sectionIndex === 0 && styles.menuSectionFirst]}>
                    <Text style={styles.menuSectionTitle}>{section.title}</Text>
                    <View style={styles.menuSectionCard}>
                      {section.items.map((item, itemIndex) => (
                        <Pressable
                          key={item.route}
                          onPress={() => onNavigate(item.route)}
                          style={({ pressed }) => [styles.menuItem, itemIndex === section.items.length - 1 && styles.menuItemLast, pressed && styles.menuItemPressed]}
                          accessibilityRole="button"
                          accessibilityLabel={item.label}
                        >
                          <View style={styles.menuItemLeft}>
                            {item.icon ? (
                              <View style={styles.menuItemIconWrap}>
                                <Ionicons name={item.icon} size={15} color={colors.brand} />
                              </View>
                            ) : null}
                            <Text style={styles.menuItemText} numberOfLines={1}>{item.label}</Text>
                          </View>
                          <View style={styles.menuItemRight}>
                            {typeof item.count === 'number' ? (
                              <View style={styles.menuItemBadge}>
                                <Text style={styles.menuItemBadgeText}>{item.count}</Text>
                              </View>
                            ) : null}
                            <Ionicons name="chevron-forward" size={16} color={colors.greyLight} />
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.menuEmpty}>
                <Ionicons name={searchQuery ? 'search-outline' : 'grid-outline'} size={22} color={colors.greyLight} />
                <Text style={styles.menuEmptyText}>
                  {searchQuery ? `No menu items match "${searchQuery}".` : 'No menu items available for your role yet.'}
                </Text>
              </View>
            )}

            <View style={styles.menuLogoutWrap}>
              <Pressable
                onPress={onLogout}
                style={({ pressed }) => [styles.menuLogoutButton, pressed && styles.menuLogoutButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
              >
                <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                <Text style={styles.menuLogoutText}>Sign out</Text>
              </Pressable>
            </View>

            {footerNote ? (
              <View style={styles.menuFooterNote}>
                <Text style={styles.menuFooterNoteText}>{footerNote}</Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </View>
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
