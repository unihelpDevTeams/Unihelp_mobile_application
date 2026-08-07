import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { createGroup } from '../../services/firestoreSync';
import { uploadToCloudinary } from '../../services/cloudinary';
import { colors } from '../../src/shared/theme';

const COLORS = {
  indigo: colors.brand,
  indigoDark: colors.brandDark,
  indigoSoft: colors.brandLight,
  white: colors.onBrand,
  ink: colors.textPrimary,
  inkSoft: colors.textSecondary,
  border: colors.borderDefault,
  success: colors.teal,
  successSoft: colors.greenLight,
  danger: colors.danger,
  dangerSoft: colors.redLight,
};

const CATEGORIES = ['Academics', 'Career', 'Health', 'Social', 'Tech', 'Other'];

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Academics');
  const [privacy, setPrivacy] = useState('public');
  const [allowMemberMessages, setAllowMemberMessages] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessageType('error');
      setMessage('Photo library permission is needed to add a group picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      setMessage('');
    }
  };

  const save = async () => {
    if (!name.trim() || !description.trim()) {
      setMessageType('error');
      setMessage('Add a name and description before saving.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      let avatarUrl = '';
      let avatarAsset = null;
      if (photoUri) {
        setPhotoUploading(true);
        const uploaded = await uploadToCloudinary(
          {
            uri: photoUri,
            name: `${name.trim().replace(/\s+/g, '-').toLowerCase() || 'group'}-photo.jpg`,
            type: 'image/jpeg',
          },
          {
            resourceType: 'image',
            validationKind: 'image',
          }
        );
        avatarUrl = uploaded?.secure_url || '';
        avatarAsset = uploaded || null;
        setPhotoUploading(false);
      }

      const createdGroup = await createGroup({
        name: name.trim(),
        description: description.trim(),
        category,
        privacy,
        allowMemberMessages,
        requireApproval,
        welcomeMessage: welcomeMessage.trim(),
        avatarUrl,
        avatarAsset,
      });
      setName('');
      setDescription('');
      setCategory('Academics');
      setPrivacy('public');
      setAllowMemberMessages(true);
      setRequireApproval(true);
      setWelcomeMessage('');
      setPhotoUri(null);
      router.replace({ pathname: '/community/[groupId]', params: { groupId: createdGroup?.id || '' } });
    } catch (error) {
      setMessageType('error');
      setMessage(error.message || 'Unable to create group. Try again.');
    } finally {
      setPhotoUploading(false);
      setLoading(false);
    }
  };

  return (
    <ScreenShell title="Create a group" subtitle="Start a space other students can join" showBack>
      <View style={styles.heroIconWrap}>
        <Ionicons name="people" size={20} color={COLORS.indigo} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Group name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="e.g. 200L Chemical Eng Study Group"
          placeholderTextColor={COLORS.inkSoft}
        />

        <Pressable style={styles.avatarPicker} onPress={pickPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatarPreview} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="images-outline" size={24} color={COLORS.indigo} />
            </View>
          )}
          <Text style={styles.avatarText}>{photoUri ? 'Change group photo' : 'Add group photo'}</Text>
        </Pressable>

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.input, styles.textArea]}
          placeholder="What's this group for?"
          placeholderTextColor={COLORS.inkSoft}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((option) => {
            const active = option === category;
            return (
              <Pressable
                key={option}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(option)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Privacy</Text>
        <View style={styles.segmented}>
          <Pressable
            style={[styles.segmentOption, privacy === 'public' && styles.segmentOptionActive]}
            onPress={() => setPrivacy('public')}
          >
            <Ionicons name="globe-outline" size={15} color={privacy === 'public' ? COLORS.white : COLORS.inkSoft} />
            <Text style={[styles.segmentText, privacy === 'public' && styles.segmentTextActive]}>Public</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentOption, privacy === 'private' && styles.segmentOptionActive]}
            onPress={() => setPrivacy('private')}
          >
            <Ionicons name="lock-closed-outline" size={15} color={privacy === 'private' ? COLORS.white : COLORS.inkSoft} />
            <Text style={[styles.segmentText, privacy === 'private' && styles.segmentTextActive]}>Private</Text>
          </Pressable>
        </View>
        <Text style={styles.segmentHint}>
          {privacy === 'public' ? 'Anyone can find and join this group.' : 'Only people you invite can join.'}
        </Text>

        <Text style={styles.label}>Messaging permission</Text>
        <View style={styles.segmented}>
          <Pressable
            style={[styles.segmentOption, allowMemberMessages && styles.segmentOptionActive]}
            onPress={() => setAllowMemberMessages(true)}
          >
            <Ionicons name="chatbubble-outline" size={15} color={allowMemberMessages ? COLORS.white : COLORS.inkSoft} />
            <Text style={[styles.segmentText, allowMemberMessages && styles.segmentTextActive]}>Members can post</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentOption, !allowMemberMessages && styles.segmentOptionActive]}
            onPress={() => setAllowMemberMessages(false)}
          >
            <Ionicons name="lock-closed-outline" size={15} color={!allowMemberMessages ? COLORS.white : COLORS.inkSoft} />
            <Text style={[styles.segmentText, !allowMemberMessages && styles.segmentTextActive]}>Admins only</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Join approval</Text>
        <View style={styles.segmented}>
          <Pressable
            style={[styles.segmentOption, requireApproval && styles.segmentOptionActive]}
            onPress={() => setRequireApproval(true)}
          >
            <Ionicons name="shield-checkmark-outline" size={15} color={requireApproval ? COLORS.white : COLORS.inkSoft} />
            <Text style={[styles.segmentText, requireApproval && styles.segmentTextActive]}>Admin approval</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentOption, !requireApproval && styles.segmentOptionActive]}
            onPress={() => setRequireApproval(false)}
          >
            <Ionicons name="flash-outline" size={15} color={!requireApproval ? COLORS.white : COLORS.inkSoft} />
            <Text style={[styles.segmentText, !requireApproval && styles.segmentTextActive]}>Auto-join</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Welcome message</Text>
        <TextInput
          value={welcomeMessage}
          onChangeText={setWelcomeMessage}
          multiline
          style={[styles.input, styles.textArea]}
          placeholder="Optional welcome message for new members"
          placeholderTextColor={COLORS.inkSoft}
        />
      </View>

      {message ? (
        <View style={[styles.messageBox, messageType === 'error' ? styles.messageError : styles.messageSuccess]}>
          <Ionicons
            name={messageType === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={16}
            color={messageType === 'error' ? COLORS.danger : COLORS.success}
          />
          <Text style={[styles.messageText, { color: messageType === 'error' ? COLORS.danger : COLORS.success }]}>
            {message}
          </Text>
        </View>
      ) : null}

      <Pressable style={[styles.button, (loading || photoUploading) && styles.buttonDisabled]} onPress={save} disabled={loading || photoUploading}>
        {loading || photoUploading ? <ActivityIndicator color={COLORS.white} /> : (
          <>
            <Ionicons name="checkmark" size={17} color={COLORS.white} />
            <Text style={styles.buttonText}>Create group</Text>
          </>
        )}
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  label: {
    marginBottom: 6,
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 12.5,
  },
  avatarPicker: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarPreview: {
    width: 84,
    height: 84,
    borderRadius: 18,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: COLORS.indigo,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    backgroundColor: colors.canvasLight,
    color: COLORS.ink,
    fontSize: 14,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: colors.canvasLight,
  },
  chipActive: {
    backgroundColor: COLORS.indigo,
    borderColor: COLORS.indigo,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.inkSoft,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.skeletonBackground,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  segmentOptionActive: {
    backgroundColor: COLORS.indigo,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.inkSoft,
  },
  segmentTextActive: {
    color: COLORS.white,
  },
  segmentHint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  messageSuccess: {
    backgroundColor: COLORS.successSoft,
  },
  messageError: {
    backgroundColor: COLORS.dangerSoft,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.indigo,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
});