import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { spacing, borderRadius, shadows } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

export default function ErrorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useErrorStyles();
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.red} />
        </View>
        
        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.description}>
          Check your network settings and try again. Some content may be available offline.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.onBrand} />
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useErrorStyles();
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.orange} />
        </View>
        
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.description}>
          The page you&apos;re looking for does not exist or has been moved.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Ionicons name="home-outline" size={18} color={colors.onBrand} />
          <Text style={styles.retryButtonText}>Go Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ServerErrorScreen({ onRetry }) {
  const { colors } = useTheme();
  const styles = useErrorStyles();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="server-outline" size={64} color={colors.red} />
        </View>
        
        <Text style={styles.title}>Something Went Wrong</Text>
        <Text style={styles.description}>
          We are having trouble loading this content. Please try again in a moment.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={onRetry || (() => {})}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.onBrand} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    </View>
  );
}

function useErrorStyles() {
  return useThemeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.red}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: colors.grey,
    lineHeight: 22,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    ...shadows.brand,
  },
  retryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onBrand,
  },
  }));
}
