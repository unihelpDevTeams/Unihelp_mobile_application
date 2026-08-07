import { Stack } from 'expo-router';
import { colors } from '../../src/shared/theme';

export default function ChallengeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="question" />
      <Stack.Screen name="result" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="history" />
      <Stack.Screen name="streak" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
