import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { updateDoc, doc } from 'firebase/firestore';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchAllTutorialPurchases } from '../../services/firestoreSync';
import { db } from '../../firebase/config';

const adminEmail = 'onakomayaokiki@gmail.com';

export default function AdminTutorialPaymentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const records = await fetchAllTutorialPurchases();
      setItems(records);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    setSavingId(id);
    try {
      await updateDoc(doc(db, 'purchases', id), { status });
      await load();
    } finally {
      setSavingId('');
    }
  };

  return (
    <ScreenShell title="Tutorial Payments" subtitle="Admin view of tutorial payment proofs and approvals." showBack>
      <Text style={styles.note}>Admin email: {adminEmail}</Text>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#4F46E5" />
        </View>
      ) : items.length ? (
        <View>
          {items.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.title}>{item.tutorialTitle || 'Tutorial'}</Text>
              <Text style={styles.subtitle}>₦{Number(item.amount || 0).toLocaleString()} - {item.status || 'pending'}</Text>
              <View style={styles.buttonRow}>
                <Pressable style={styles.approveButton} onPress={() => updateStatus(item.id, 'approved')} disabled={savingId === item.id}>
                  <Text style={styles.buttonText}>{savingId === item.id ? 'Saving...' : 'Approve'}</Text>
                </Pressable>
                <Pressable style={styles.rejectButton} onPress={() => updateStatus(item.id, 'rejected')} disabled={savingId === item.id}>
                  <Text style={styles.buttonText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title="No payments yet" description="Tutorial purchase records will appear here once students upload proof." />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  note: {
    marginBottom: 12,
    color: '#64748B',
    fontSize: 12,
  },
  loading: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 14,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
