import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchTutorialPurchases } from '../../services/firestoreSync';

export default function StudentPurchasesPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchTutorialPurchases()
      .then(setItems)
      .catch(() => {});
  }, []);

  return (
    <ScreenShell title="Student Purchases" subtitle="Your tutorial purchase history." showBack>
      {items.length ? (
        <View>
          {items.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/tutorial/${item.tutorialId}`)}>
              <Text style={styles.title}>{item.tutorialTitle || 'Tutorial'}</Text>
              <Text style={styles.subtitle}>₦{Number(item.amount || 0).toLocaleString()} - {item.status || 'pending'}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState title="No purchases yet" description="Tutorial purchases you make on the website will appear here." />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
  },
});
