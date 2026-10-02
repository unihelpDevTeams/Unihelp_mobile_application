import React from 'react';
import { Alert, View, Text, TextInput, Pressable, Image as RNImage } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { spacing, borderRadius } from '../../shared/theme';
import { useTheme } from '../../shared/theme/ThemeContext';
import { useThemeStyles } from '../../shared/theme/createStyles';
import InterestSelector from '../components/InterestSelector';

export default function Step3Profile({ formData, errors, updateField }) {
  const { colors } = useTheme();
  const s = useThemeStyles((themeColors) => createStyles(themeColors));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo permission needed', 'Allow photo access in your device settings to add a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 30 * 1024 * 1024) {
      Alert.alert('Image too large', 'Please upload an image smaller than 30MB.');
      return;
    }

    updateField('photoURI', asset.uri);
  };

  const toggleInterest = (interest) => {
    const current = formData.interests || [];
    if (current.includes(interest)) {
      updateField('interests', current.filter((i) => i !== interest));
    } else {
      updateField('interests', [...current, interest]);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.head}><Text style={s.title}>Your Profile</Text><Text style={s.sub}>Add a personal touch to your profile.</Text></View>
      <View style={s.card}>
        {/* Profile Picture */}
        <View style={s.avatarSection}>
          <Pressable
            onPress={pickPhoto}
            style={({ pressed }) => [
              s.avatarWrap,
              errors.photoURI && s.avatarError,
              pressed && s.avatarPressed,
            ]}
          >
            {formData.photoURI ? (
              <RNImage source={{ uri: formData.photoURI }} style={s.avatar} />
            ) : (
              <View style={[s.avatarPlaceholder, errors.photoURI && s.avatarPlaceholderError]}>
                <Ionicons name="camera" size={28} color={errors.photoURI ? colors.rose : colors.greyLight} />
                <Text style={[s.avatarLabel, errors.photoURI && s.avatarLabelError]}>Add Photo</Text>
              </View>
            )}
          </Pressable>
          <Text style={[s.avatarHint, errors.photoURI && s.avatarHintError]}>{errors.photoURI || 'Required'}</Text>
        </View>

        {/* Bio */}
        <View style={s.f}><Text style={s.l}>Bio</Text>
          <TextInput style={[s.input, s.bioInput, errors.bio && s.errB]} placeholder="Tell us a little about yourself..." placeholderTextColor={colors.greyLight} value={formData.bio} onChangeText={(v) => updateField('bio', v)} multiline numberOfLines={3} textAlignVertical="top" />
        </View>

        {/* Interests */}
        <InterestSelector selected={formData.interests || []} onToggle={toggleInterest} error={errors.interests} />
      </View>
    </View>
  );
}

const createStyles = (colors) => ({
  container: { gap: spacing['2xl'] }, head: { gap: spacing.xs },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  sub: { color: colors.grey, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: colors.whiteTransparent, borderRadius: borderRadius['5xl'], borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.lg },
  avatarSection: { alignItems: 'center', gap: spacing.xs },
  avatarWrap: { width: 86, height: 86, borderRadius: 28 },
  avatarError: { borderWidth: 1.5, borderColor: colors.rose },
  avatarPressed: { opacity: 0.8 },
  avatar: { width: 86, height: 86, borderRadius: 28 },
  avatarPlaceholder: { width: 86, height: 86, borderRadius: 28, backgroundColor: colors.brandLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.brandBorder, borderStyle: 'dashed' },
  avatarPlaceholderError: { borderColor: colors.rose, backgroundColor: colors.redLight },
  avatarLabel: { color: colors.brandText, fontWeight: '700', fontSize: 10, marginTop: 2 },
  avatarLabelError: { color: colors.rose },
  avatarHint: { color: colors.grey, fontSize: 11 },
  avatarHintError: { color: colors.rose, fontWeight: '700' },
  f: { gap: 6 }, l: { color: colors.inkLight, fontSize: 12.5, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.greyLight, borderRadius: borderRadius.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: 15, color: colors.ink, backgroundColor: colors.surface },
  bioInput: { minHeight: 80, paddingTop: spacing.md }, errB: { borderColor: colors.rose, borderWidth: 1.5 },
});