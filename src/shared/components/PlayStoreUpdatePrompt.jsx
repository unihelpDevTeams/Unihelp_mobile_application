import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export default function PlayStoreUpdatePrompt({ visible, updating, onUpdate, onDismiss }) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: Math.max(insets.top, insets.bottom, 24), backgroundColor: 'rgba(12, 18, 38, 0.62)' }}>
        <View style={[{ alignSelf: 'center', width: '100%', maxWidth: 420, backgroundColor: colors.surfacePrimary, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: colors.borderDefault }, shadows?.lg]}>
          <View style={{ width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandLight, marginBottom: 18 }}>
            <Ionicons name="cloud-download" size={26} color={colors.brand} />
          </View>
          <Text style={{ color: colors.textPrimary, fontSize: 21, lineHeight: 28, fontWeight: '800', marginBottom: 8 }}>
            New UniHelp Update Available!
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 22 }}>
            Enjoy the latest improvements, new features and bug fixes. Update UniHelp to get the best experience.
          </Text>
          <Pressable
            onPress={onUpdate}
            disabled={updating}
            accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 48, borderRadius: 13, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: pressed || updating ? 0.82 : 1 })}
          >
            {updating ? <ActivityIndicator size="small" color={colors.onBrand} /> : <Ionicons name="download-outline" size={18} color={colors.onBrand} />}
            <Text style={{ color: colors.onBrand, fontSize: 14, fontWeight: '800' }}>
              {updating ? 'Opening update...' : 'Update Now'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            disabled={updating}
            accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, opacity: pressed ? 0.65 : 1 })}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '700' }}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}