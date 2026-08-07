import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, layout } from '../../src/shared/theme';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';
import logo from '../../assets/images/favicon.png';
import onboardingLearning from '../../assets/images/onboarding-learning.png';
import onboardingAI from '../../assets/images/onboarding-ai.png';
import onboardingMarket from '../../assets/images/onboarding-market.png';
import onboardingGroup from '../../assets/images/onboarding-group.png';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    image: onboardingLearning,
    title: 'All Your Notes',
    description: 'Access lecture notes, past questions, and study materials from your university and beyond.',
  },
  {
    id: '2',
    image: onboardingAI,
    title: 'AI Study Assistant',
    description: 'Get instant help from our AI tutor. Summarize, explain, and quiz yourself on any topic.',
  },
  {
    id: '3',
    image: onboardingMarket,
    title: 'Student Marketplace',
    description: 'Buy and sell hostels, textbooks, and other student essentials right in the app.',
  },
  {
    id: '4',
    image: onboardingGroup,
    title: 'Join Study Groups',
    description: 'Connect with classmates, share knowledge, and collaborate on assignments.',
  },
];

const ACCENTS = ['brand', 'blue', 'orange', 'purple'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const styles = useThemeStyles((c, s, r) => ({
    container: { flex: 1, backgroundColor: c.canvas, paddingHorizontal: layout.screenPadding, justifyContent: 'space-between' },
    header: { alignItems: 'center', paddingTop: 60, paddingBottom: s['2xl'] },
    logo: { width: 64, height: 64 },
    appName: { fontSize: 28, fontWeight: '800', color: c.ink, marginTop: s.md, letterSpacing: -0.3 },
    slidesContainer: { justifyContent: 'center' },
    slide: { width: width - layout.screenPadding * 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    iconContainer: { width: 180, height: 180, borderRadius: r.full, alignItems: 'center', justifyContent: 'center', marginBottom: s['2xl'] },
    slideImage: { width: 150, height: 150 },
    slideTitle: { fontSize: 24, fontWeight: '800', color: c.ink, marginBottom: s.md, textAlign: 'center' },
    slideDescription: { fontSize: 16, color: c.grey, lineHeight: 24, textAlign: 'center', maxWidth: 280 },
    bottomContainer: { paddingBottom: 50 },
    pagination: { flexDirection: 'row', justifyContent: 'center', gap: s.sm, marginBottom: s['2xl'] },
    paginationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
    paginationDotActive: { width: 24 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    skipButton: { paddingHorizontal: s.lg, paddingVertical: s.md },
    skipButtonPressed: { opacity: 0.6 },
    skipText: { fontSize: 15, color: c.grey, fontWeight: '600' },
    nextButton: { flexDirection: 'row', alignItems: 'center', gap: s.xs, backgroundColor: c.brand, borderRadius: r.full, paddingHorizontal: s['2xl'], paddingVertical: s.md },
    nextButtonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    nextText: { fontSize: 15, color: c.onBrand, fontWeight: '700' },
  }));

  const goNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      scrollRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      router.replace('/(auth)/login');
    }
  };

  const skip = () => router.replace('/(auth)/login');

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    setCurrentIndex(Math.round(contentOffset / width));
  };

  const getAccent = (index) => {
    const key = ACCENTS[index] || 'brand';
    return colors[key];
  };

  const renderItem = ({ item, index }) => {
    const accent = getAccent(index);
    return (
      <View style={styles.slide}>
        <View style={[styles.iconContainer, { backgroundColor: `${accent}15` }]}>
          <Image source={item.image} style={styles.slideImage} resizeMode="contain" />
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>Unihelp</Text>
      </View>

      <View style={styles.slidesContainer}>
        <FlatList
          ref={scrollRef}
          data={ONBOARDING_DATA}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onScroll={handleScroll} scrollEventThrottle={16}
        />
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, index) => (
            <View key={index} style={[styles.paginationDot, index === currentIndex && [styles.paginationDotActive, { backgroundColor: getAccent(currentIndex) }]]} />
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={skip} style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          <Pressable onPress={goNext} style={({ pressed }) => [styles.nextButton, { backgroundColor: getAccent(currentIndex) }, pressed && styles.nextButtonPressed]}>
            <Text style={styles.nextText}>{currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}</Text>
            <Ionicons name={currentIndex === ONBOARDING_DATA.length - 1 ? 'arrow-forward' : 'chevron-forward'} size={16} color={colors.onBrand} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
