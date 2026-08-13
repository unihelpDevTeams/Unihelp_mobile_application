import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../src/shared/theme/ThemeContext';
import ScreenShell from '../src/shared/components/ScreenShell';

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

  return (
    <ScreenShell
      title={title}
      subtitle={subtitle}
      showBack={showBack}
      scrollable={scrollable}
      showFooter={showFooter}
      footerProps={footerProps}
    >
      <View style={[scrollable ? styles.scrollContent : styles.nonScrollableContent, containerStyle, contentStyle]}>
        {content}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  nonScrollableContent: {
    flex: 1,
  },
  loadingBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
});
