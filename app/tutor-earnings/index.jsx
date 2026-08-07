import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from '../../src/shared/components/ScreenShell';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchAllTutorialPurchases, fetchTutorials } from '../../services/firestoreSync';
import { summarizeTutorFinances } from '../../utils/tutorialEarnings';
import { useAuth } from '../../context/AuthContext';

export default function TutorEarningsPage() {
  const { profile } = useAuth();
  const [tutorials, setTutorials] = useState([]);
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    fetchTutorials().then(setTutorials).catch(() => {});
    fetchAllTutorialPurchases().then(setPurchases).catch(() => {});
  }, [profile?.uid]);

  const ownedTutorials = useMemo(
    () => tutorials.filter((item) => item.ownerId === profile?.uid || item.tutorId === profile?.uid || item.userId === profile?.uid),
    [profile?.uid, tutorials]
  );

  const summary = summarizeTutorFinances({
    tutorials: ownedTutorials,
    purchases: purchases.filter((purchase) => purchase.tutorId === profile?.uid || ownedTutorials.some((tutorial) => tutorial.id === purchase.tutorialId)),
  });

  return (
    <ScreenShell title="Tutorial Earnings" subtitle="Revenue summary built from the shared tutorial collections." showBack>
      <View style={styles.hero}>
        {[
          ['Gross revenue', `₦${summary.grossRevenue.toLocaleString()}`],
          ['Platform fee', `₦${summary.platformFee.toLocaleString()}`],
          ['Creator balance', `₦${summary.creatorGrossBalance.toLocaleString()}`],
          ['Withdrawable', `₦${summary.withdrawableBalance.toLocaleString()}`],
        ].map(([label, value]) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
        ))}
      </View>

      {ownedTutorials.length ? (
        <View>
          {ownedTutorials.map((tutorial) => (
            <View key={tutorial.id} style={styles.card}>
              <Text style={styles.title}>{tutorial.title}</Text>
              <Text style={styles.subtitle}>{tutorial.category || 'General'} - ₦{Number(tutorial.price || 0).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState title="No tutorials yet" description="Earnings will appear once your tutorials are published and purchased." />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  statValue: {
    marginTop: 6,
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
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
