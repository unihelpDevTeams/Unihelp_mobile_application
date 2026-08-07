import React from 'react';
import { StyleSheet, View } from 'react-native';
import ScreenShell from '../components/ScreenShell';
import FeatureCard from '../components/FeatureCard';
import SectionHeader from '../components/SectionHeader';

export default function FeatureGridScreen({ title, subtitle, features, loading = false, showBack = false }) {
  return (
    <ScreenShell title={title} subtitle={subtitle} showBack={showBack} loading={loading}>
      <SectionHeader title={title} subtitle={subtitle} />
      <View style={styles.grid}>
        {features.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: 2,
  },
});
