import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import FeatureCard from '../../src/shared/components/FeatureCard';
import EmptyState from '../../src/shared/components/EmptyState';
import { fetchAllTutorialPurchases, fetchTutorials } from '../../services/firestoreSync';
import { summarizeTutorFinances } from '../../utils/tutorialEarnings';
import { useAuth } from '../../context/AuthContext';

export default function TutorDashboardPage() {
  const router = useRouter();
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
    <ScreenShell title="Tutor Dashboard" subtitle="Manage tutorials with the same Firestore collections." showBack>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Creator tools</Text>
        <Text style={styles.heroText}>Tutorials, revenue, and purchase review all point at the same data model as the website.</Text>
      </View>

      <View style={styles.statsGrid}>
        {[
          ['Tutorials', summary.totalTutorials],
          ['Sales', summary.totalSales],
          ['Revenue', `₦${summary.grossRevenue.toLocaleString()}`],
          ['Balance', `₦${summary.withdrawableBalance.toLocaleString()}`],
        ].map(([label, value]) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <FeatureCard title="Create Tutorial" description="Open the mobile creator form and publish a new tutorial." route="/create-tutorial" accent="#4F46E5" icon="add-circle" />
      <FeatureCard title="My Tutorials" description="Review the tutorials you created and their status." route="/my-tutorials" accent="#0EA5E9" icon="library" />
      <FeatureCard title="Earnings" description="Review the same revenue summary used by the website." route="/tutor-earnings" accent="#F97316" icon="cash" />
      <FeatureCard title="Purchases" description="See student payments and approvals." route="/student-purchases" accent="#10B981" icon="receipt" />

      <Text style={styles.sectionTitle}>Owned tutorials</Text>
      {ownedTutorials.length ? (
        <View>
          {ownedTutorials.map((tutorial) => (
            <Pressable key={tutorial.id} style={styles.card} onPress={() => router.push(`/tutorial/${tutorial.id}`)}>
              <Text style={styles.title}>{tutorial.title}</Text>
              <Text style={styles.subtitle}>{tutorial.category || 'General'}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState title="No tutorials yet" description="Create one to start collecting revenue and approvals." />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  heroText: {
    marginTop: 6,
    color: '#E0E7FF',
    fontSize: 13,
    lineHeight: 19,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 4,
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
    marginTop: 5,
    color: '#64748B',
    fontSize: 13,
  },
});
