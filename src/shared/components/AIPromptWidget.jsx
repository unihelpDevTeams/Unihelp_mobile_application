import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AIPromptWidget({ title, subtitle, icon = 'sparkles-outline', onPress, accent = '#4F46E5' }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { borderColor: `${accent}22` }, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}14` }]}> 
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color="#94A3B8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  pressed: { opacity: 0.9 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontSize: 13.5, fontWeight: '800', color: '#0F172A' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#64748B', lineHeight: 16 },
});
