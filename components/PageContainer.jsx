import React from 'react';
import { StyleSheet, View } from 'react-native';
import ScreenShell from '../src/shared/components/ScreenShell';
import { PageLoader } from '../src/shared/components/AILoaders';

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
  const content = loading ? (
    loadingContent || (
      <View style={styles.loadingBox}>
        <PageLoader label="Loading..." />
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
    alignItems: 'center',
  },
});
