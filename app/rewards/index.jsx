import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { fetchStreakRewards, spinStreakReward } from '../../services/firestoreSync';

export default function RewardsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [inventory, setInventory] = useState({ rewards: [], history: [] });
  const [selectedReward, setSelectedReward] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [wheelSegments, setWheelSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const rotation = useRef(new Animated.Value(0)).current;
  const styles = useThemeStyles((c, s, r) => ({
    intro: { color: c.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: s.lg },
    sectionTitle: { color: c.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: s.sm },
    empty: { color: c.textSecondary, paddingVertical: s.lg },
    rewardCard: { backgroundColor: c.card, borderColor: c.borderDefault, borderWidth: 1, borderRadius: r['2xl'], padding: s.lg, marginBottom: s.sm, flexDirection: 'row', alignItems: 'center', gap: s.md },
    rewardTitle: { color: c.textPrimary, fontWeight: '800', flex: 1 },
    rewardMeta: { color: c.textSecondary, fontSize: 12, marginTop: 3 },
    spinButton: { backgroundColor: c.brand, paddingHorizontal: s.lg, paddingVertical: s.sm, borderRadius: r.full },
    spinText: { color: c.onBrand, fontWeight: '800' },
    wheel: { width: 250, height: 250, borderRadius: 125, backgroundColor: c.brand, borderWidth: 10, borderColor: c.gold, alignSelf: 'center', marginVertical: s.lg, alignItems: 'center', justifyContent: 'center' },
    wheelInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    wheelText: { position: 'absolute', width: 100, textAlign: 'center', color: c.onBrand, fontSize: 11, fontWeight: '800' },
    pointer: { position: 'absolute', top: -18, zIndex: 2 },
    result: { alignItems: 'center', backgroundColor: c.card, padding: s.lg, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.gold, marginBottom: s.lg },
    won: { color: c.gold, fontSize: 13, fontWeight: '900' },
    resultText: { color: c.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 5 },
  }));

  const load = async () => {
    setErrorMessage('');
    try { setInventory(await fetchStreakRewards()); } catch (error) { setErrorMessage(error.message || 'Could not load your rewards.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSpin = async (reward) => {
    if (spinning) return;
    setSpinning(true);
    try {
      const result = await spinStreakReward(reward.id, `${reward.id}-${Date.now()}`);
      setWheelSegments(result.wheelSegments || []);
      const slot = Math.max(0, Number(result.wheelIndex || 0));
      const segmentAngle = 360 / Math.max((result.wheelSegments || []).length, 1);
      rotation.setValue(0);
      Animated.timing(rotation, { toValue: 1440 + slot * segmentAngle, duration: 2600, useNativeDriver: true }).start(() => {
        setSelectedReward(result.reward);
        setSpinning(false);
        load();
      });
    } catch (error) {
      setSpinning(false);
      setErrorMessage(error.message || 'Your reward is safe. Please reconnect and try again.');
      if (/already claimed/i.test(error.message)) load();
    }
  };

  return (
    <ScreenShell title="Rewards" subtitle="Your streak rewards and reward history" showBack>
      <Text style={styles.intro}>Keep your daily streak alive to unlock milestone spins. Each spin is secured by UniHelp and can only be used once.</Text>
      {loading && <ActivityIndicator accessibilityLabel="Loading rewards" color={colors.brand} />}
      {!!errorMessage && <Text style={{ color: colors.danger || colors.red, marginBottom: 12 }}>{errorMessage}</Text>}
      {selectedReward && <View style={styles.result}><Text style={styles.won}>YOU WON</Text><Text style={styles.resultText}>{selectedReward.label}</Text></View>}
      {inventory.rewards.filter((reward) => reward.status === 'available').length > 0 && <Text style={styles.sectionTitle}>Available spins</Text>}
      {inventory.rewards.filter((reward) => reward.status === 'available').map((reward) => (
        <View key={reward.id} style={styles.rewardCard}>
          <Ionicons name="gift" size={24} color={colors.gold} />
          <View style={{ flex: 1 }}><Text style={styles.rewardTitle}>{reward.title}</Text><Text style={styles.rewardMeta}>Milestone reward ready</Text></View>
          <Pressable accessibilityLabel={`Spin ${reward.title}`} onPress={() => handleSpin(reward)} style={styles.spinButton}><Text style={styles.spinText}>{spinning ? 'Spinning...' : 'Spin'}</Text></Pressable>
        </View>
      ))}
      {inventory.rewards.filter((reward) => reward.status === 'available').map((reward) => (
        <View key={`wheel-${reward.id}`}>
          {spinning && <View style={styles.wheel}><Ionicons name="caret-up" size={28} color={colors.gold} style={styles.pointer} /><Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1440], outputRange: ['0deg', '1440deg'] }) }] }]}>{wheelSegments.map((segment, index) => <Text key={segment.id} style={[styles.wheelText, { transform: [{ rotate: `${index * (360 / Math.max(wheelSegments.length, 1))}deg` }, { translateY: -92 }] }]}>{segment.label}</Text>)}</Animated.View><View style={styles.wheelInner}><Ionicons name="sparkles" size={28} color={colors.gold} /></View></View>}
        </View>
      ))}
      {inventory.rewards.filter((reward) => reward.status !== 'available').length > 0 && <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Claimed rewards</Text>}
      {inventory.rewards.filter((reward) => reward.status !== 'available').map((reward) => <View key={reward.id} style={styles.rewardCard}><Ionicons name="checkmark-circle" size={24} color={colors.green} /><Text style={styles.rewardTitle}>{reward.title}</Text><Text style={styles.rewardMeta}>Claimed</Text></View>)}
      {inventory.history.length > 0 && <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Reward history</Text>}
      {inventory.history.map((item) => <View key={item.id} style={styles.rewardCard}><Ionicons name="receipt-outline" size={24} color={colors.brand} /><View style={{ flex: 1 }}><Text style={styles.rewardTitle}>{item.grant?.amount ? `+${item.grant.amount} AI Tokens` : item.grant?.percentage ? `${item.grant.percentage}% Premium Discount` : item.grant?.badge || item.type}</Text><Text style={styles.rewardMeta}>{item.source || 'Streak reward'} · Claimed</Text></View></View>)}
      {inventory.rewards.length === 0 && <Text style={styles.empty}>No rewards yet. Your first milestone is waiting.</Text>}
      <Pressable onPress={() => router.back()} accessibilityLabel="Return to streak" style={{ marginTop: 18 }}><Text style={{ color: colors.brand, fontWeight: '800', textAlign: 'center' }}>Back to streak</Text></Pressable>
    </ScreenShell>
  );
}
