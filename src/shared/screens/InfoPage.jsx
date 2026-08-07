import React from 'react';
import { StyleSheet, View } from 'react-native';
import ScreenShell from '../components/ScreenShell';
import InfoCard from '../components/InfoCard';

export default function InfoPage({ title, subtitle, sections = [], showBack = true, children = null }) {
  return (
    <ScreenShell title={title} subtitle={subtitle} showBack={showBack} scrollable>
      <View style={styles.wrap}>
        {sections.map((section) => (
          <InfoCard key={section.title} title={section.title} text={section.text} />
        ))}
        {children}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 2,
  },
});
