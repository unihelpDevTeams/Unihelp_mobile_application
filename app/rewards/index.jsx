import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import { fetchStreakRewards, spinStreakReward } from '../../services/firestoreSync';

const describeGrant = (item = {}) => {
  const grant = item.grant || item;
  if (grant.amount) return `+${grant.amount} AI Tokens`;
  if (grant.percentage) return `${grant.percentage}% Premium Discount`;
  if (grant.days) return `${grant.days} Premium Days`;
  return grant.badge || grant.label || item.type || 'Reward';
};

export default function RewardsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [inventory, setInventory] = useState({ rewards: [], history: [] });
  const [selectedReward, setSelectedReward] = useState(null);
  const [activeReward, setActiveReward] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [wheelSegments, setWheelSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const rotation = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const availableRewards = useMemo(() => inventory.rewards.filter((reward) => reward.status === 'available'), [inventory.rewards]);
  const claimedRewards = useMemo(() => inventory.rewards.filter((reward) => reward.status !== 'available'), [inventory.rewards]);
  const fallbackSegments = useMemo(() => (activeReward?.rewards || activeReward?.options || []).map((reward, index) => ({
    id: reward.id || `fallback-${index}`,
    label: reward.label || reward.title || 'Reward',
  })), [activeReward]);
  const visibleSegments = wheelSegments.length ? wheelSegments : fallbackSegments;

  const styles = useThemeStyles((c, s, r) => ({
    hero: { backgroundColor: c.card, borderWidth: 1, borderColor: c.borderDefault, borderRadius: r['2xl'], padding: s.lg, marginBottom: s.lg },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: s.md },
    heroIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.goldLight || c.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { color: c.textPrimary, fontSize: 20, fontWeight: '900' },
    intro: { color: c.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 2 },
    sectionTitle: { color: c.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: s.sm },
    empty: { color: c.textSecondary, paddingVertical: s.lg },
    error: { color: c.danger || c.red, marginBottom: s.md },
    rewardCard: { backgroundColor: c.card, borderColor: c.borderDefault, borderWidth: 1, borderRadius: r['2xl'], padding: s.lg, marginBottom: s.sm, flexDirection: 'row', alignItems: 'center', gap: s.md },
    rewardCardActive: { borderColor: c.gold, backgroundColor: c.goldLight || c.card },
    rewardTitle: { color: c.textPrimary, fontWeight: '800', flex: 1 },
    rewardMeta: { color: c.textSecondary, fontSize: 12, marginTop: 3 },
    spinButton: { backgroundColor: c.brand, paddingHorizontal: s.lg, paddingVertical: s.sm, borderRadius: r.full, minWidth: 82, alignItems: 'center' },
    spinButtonDisabled: { opacity: 0.5 },
    spinText: { color: c.onBrand, fontWeight: '800' },
    wheelPanel: { alignItems: 'center', backgroundColor: c.surfaceSecondary, borderRadius: r['2xl'], padding: s.lg, marginBottom: s.lg, overflow: 'hidden' },
    wheel: { width: 266, height: 266, borderRadius: 133, backgroundColor: c.brand, borderWidth: 10, borderColor: c.gold, alignSelf: 'center', marginVertical: s.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    wheelRing: { ...StyleSheet.absoluteFillObject, borderRadius: 123, borderWidth: 1, borderColor: `${c.onBrand}55` },
    wheelInner: { width: 78, height: 78, borderRadius: 39, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.gold, zIndex: 3 },
    wheelText: { position: 'absolute', width: 112, textAlign: 'center', color: c.onBrand, fontSize: 10, fontWeight: '900' },
    segmentDot: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: c.gold },
    pointer: { position: 'absolute', top: 1, zIndex: 5 },
    wheelCaption: { color: c.textSecondary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    result: { alignItems: 'center', backgroundColor: c.card, padding: s.lg, borderRadius: r['2xl'], borderWidth: 1, borderColor: c.gold, marginBottom: s.lg },
    won: { color: c.gold, fontSize: 13, fontWeight: '900' },
    resultText: { color: c.textPrimary, fontSize: 20, fontWeight: '900', marginTop: 5, textAlign: 'center' },
    celebration: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    burst: { position: 'absolute', width: 9, height: 9, borderRadius: 5 },
    backButton: { marginTop: s.lg, paddingVertical: s.sm },
    backText: { color: c.brand, fontWeight: '800', textAlign: 'center' },
  }));

  const load = async () => {
    setErrorMessage('');
    try {
      setInventory(await fetchStreakRewards());
    } catch (error) {
      setErrorMessage(error.message || 'Could not load your rewards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const celebrate = () => {
    pop.setValue(0);
    Animated.sequence([
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 0, duration: 1200, delay: 900, useNativeDriver: true }),
    ]).start();
  };

  const handleSpin = async (reward) => {
    if (spinning) return;
    setSelectedReward(null);
    setActiveReward(reward);
    setWheelSegments([]);
    setSpinning(true);
    try {
      const result = await spinStreakReward(reward.id, `${reward.id}-${Date.now()}`);
      const nextSegments = result.wheelSegments || [];
      setWheelSegments(nextSegments);
      const slot = Math.max(0, Number(result.wheelIndex || 0));
      const segmentAngle = 360 / Math.max(nextSegments.length, 1);
      rotation.setValue(0);
      Animated.timing(rotation, {
        toValue: 1440 + slot * segmentAngle,
        duration: 3000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setSelectedReward(result.reward);
        setSpinning(false);
        setActiveReward(null);
        celebrate();
        load();
      });
    } catch (error) {
      setSpinning(false);
      setActiveReward(null);
      setErrorMessage(error.message || 'Your reward is safe. Please reconnect and try again.');
      if (/already claimed/i.test(error.message)) load();
    }
  };

  const rotate = rotation.interpolate({ inputRange: [0, 1800], outputRange: ['0deg', '1800deg'] });
  const popScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const popOpacity = pop.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 1, 1, 0] });

  return (
    <ScreenShell title="Rewards" subtitle="Your streak rewards and reward history" showBack>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Ionicons name="gift" size={24} color={colors.gold} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{availableRewards.length} spin{availableRewards.length === 1 ? '' : 's'} ready</Text>
            <Text style={styles.intro}>Keep your daily streak alive to unlock secure milestone spins.</Text>
          </View>
        </View>
      </View>

      {loading && <ActivityIndicator accessibilityLabel="Loading rewards" color={colors.brand} />}
      {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {(spinning || selectedReward) && (
        <View style={styles.wheelPanel}>
          <Ionicons name="caret-down" size={32} color={colors.gold} style={styles.pointer} />
          <View style={styles.wheel}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ rotate }] }]}>
              <View style={styles.wheelRing} />
              {visibleSegments.map((segment, index) => {
                const angle = index * (360 / Math.max(visibleSegments.length, 1));
                const dotColor = index % 2 === 0 ? colors.gold : colors.onBrand;
                return (
                  <View key={segment.id || `${segment.label}-${index}`} style={StyleSheet.absoluteFillObject}>
                    <View style={[styles.segmentDot, { backgroundColor: dotColor, transform: [{ rotate: `${angle}deg` }, { translateY: -112 }], left: 115, top: 115 }]} />
                    <Text numberOfLines={2} style={[styles.wheelText, { transform: [{ rotate: `${angle}deg` }, { translateY: -84 }], left: 67, top: 118 }]}>{segment.label}</Text>
                  </View>
                );
              })}
            </Animated.View>
            <View style={styles.wheelInner}><Ionicons name={spinning ? 'sync' : 'sparkles'} size={28} color={colors.gold} /></View>
          </View>
          <Text style={styles.wheelCaption}>{spinning ? `Spinning ${activeReward?.title || 'reward'}...` : 'Your reward is ready'}</Text>
        </View>
      )}

      {selectedReward && (
        <Animated.View style={[styles.result, { opacity: popOpacity, transform: [{ scale: popScale }] }]}>
          <Text style={styles.won}>YOU WON</Text>
          <Text style={styles.resultText}>{selectedReward.label}</Text>
        </Animated.View>
      )}

      {availableRewards.length > 0 && <Text style={styles.sectionTitle}>Available spins</Text>}
      {availableRewards.map((reward) => (
        <View key={reward.id} style={[styles.rewardCard, activeReward?.id === reward.id && styles.rewardCardActive]}>
          <Ionicons name="gift" size={24} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardTitle}>{reward.title}</Text>
            <Text style={styles.rewardMeta}>Milestone reward ready</Text>
          </View>
          <Pressable accessibilityLabel={`Spin ${reward.title}`} disabled={spinning} onPress={() => handleSpin(reward)} style={[styles.spinButton, spinning && styles.spinButtonDisabled]}>
            <Text style={styles.spinText}>{activeReward?.id === reward.id ? 'Spinning...' : 'Spin'}</Text>
          </Pressable>
        </View>
      ))}

      {claimedRewards.length > 0 && <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Claimed rewards</Text>}
      {claimedRewards.map((reward) => (
        <View key={reward.id} style={styles.rewardCard}>
          <Ionicons name="checkmark-circle" size={24} color={colors.green} />
          <Text style={styles.rewardTitle}>{reward.title}</Text>
          <Text style={styles.rewardMeta}>Claimed</Text>
        </View>
      ))}

      {inventory.history.length > 0 && <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Reward history</Text>}
      {inventory.history.map((item) => (
        <View key={item.id} style={styles.rewardCard}>
          <Ionicons name="receipt-outline" size={24} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardTitle}>{describeGrant(item)}</Text>
            <Text style={styles.rewardMeta}>{item.source || 'Streak reward'} · Claimed</Text>
          </View>
        </View>
      ))}

      {!loading && inventory.rewards.length === 0 && <Text style={styles.empty}>No rewards yet. Your first milestone is waiting.</Text>}
      <Pressable onPress={() => router.back()} accessibilityLabel="Return to streak" style={styles.backButton}><Text style={styles.backText}>Back to streak</Text></Pressable>

      <Animated.View pointerEvents="none" style={[styles.celebration, { opacity: popOpacity, transform: [{ scale: popScale }] }]}>
        {[0, 1, 2, 3, 4, 5].map((item) => <View key={item} style={[styles.burst, { backgroundColor: item % 2 ? colors.gold : colors.brand, transform: [{ rotate: `${item * 60}deg` }, { translateY: -118 }] }]} />)}
      </Animated.View>
    </ScreenShell>
  );
}
