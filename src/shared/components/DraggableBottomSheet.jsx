import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal as RNModal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_DIST = 110;
const DISMISS_VEL = 0.75;

export default function DraggableBottomSheet({ visible, onClose, title, subtitle, children, footer }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const styles = useThemeStyles((c, s, r) => ({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%',
      backgroundColor: c.surface, borderTopLeftRadius: r['3xl'], borderTopRightRadius: r['3xl'],
      borderWidth: 1, borderColor: c.borderLight, borderBottomWidth: 0, overflow: 'hidden',
    },
    handleArea: { alignItems: 'center', paddingTop: s.md, paddingBottom: s.xs },
    handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.greyLight },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s.xl, paddingBottom: s.md, gap: s.sm },
    headerTextWrap: { flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
    headerSubtitle: { fontSize: 12.5, color: c.grey, marginTop: 2 },
    closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.canvasLight, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: s.xl, paddingBottom: insets.bottom + s.xl },
    footer: { borderTopWidth: 1, borderTopColor: c.borderLight, paddingHorizontal: s.xl, paddingTop: s.md, paddingBottom: insets.bottom + s.md },
  }));

  useEffect(() => {
    if (visible) {
      backdropOpacity.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 25 }),
      ]).start();
    }
  }, [visible, backdropOpacity, translateY]);

  const dismiss = () => {
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }).start(onClose);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DIST || g.vy > DISMISS_VEL) {
          Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 160, useNativeDriver: true }).start(onClose);
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 25 }).start();
        }
      },
    })
  ).current;

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={{ flex: 1 }} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Close dialog" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={dismiss} style={styles.closeButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close dialog">
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </RNModal>
  );
}