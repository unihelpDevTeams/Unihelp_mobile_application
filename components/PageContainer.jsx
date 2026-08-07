import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/shared/theme/ThemeContext';
import Header from './Header';
import Footer from './Footer';

export default function PageContainer({
  title = 'Unihelp',
  subtitle = 'Study made simple',
  showBack = false,
  children,
  contentStyle,
  containerStyle,
  scrollable = true,
  loading = false,
  loadingContent = null,
  showFooter = false,
  footerProps = {},
}) {
  const { colors } = useTheme();

  const content = loading ? (
    loadingContent || (
      <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.borderDefault }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    )
  ) : (
    children
  );

  if (!scrollable) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Header title={title} subtitle={subtitle} showBack={showBack} />
        <View style={[styles.nonScrollableContent, containerStyle]}>{content}</View>
        {showFooter ? <Footer {...footerProps} /> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <Header title={title} subtitle={subtitle} showBack={showBack} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {content}
        {showFooter ? <Footer {...footerProps} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  nonScrollableContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  loadingBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
});