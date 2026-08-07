import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { getUserProfile } from '../../services/firestoreSync';
import { useAuth } from '../../context/AuthContext';
import {
  RELATIONSHIP,
  acceptFriendRequest,
  blockStudent,
  cancelFriendRequest,
  createOrOpenFriendConversation,
  declineFriendRequest,
  listenRelationship,
  removeFriend,
  sendFriendRequest,
  sendMessageRequest,
} from '../../src/shared/services/friendships';

export default function ViewUserProfile() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile: currentProfile } = useAuth();
  const targetUid = String(userId || '');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relationship, setRelationship] = useState({ state: RELATIONSHIP.NONE });
  const [busy, setBusy] = useState('');
  const [messageModal, setMessageModal] = useState(false);
  const [intro, setIntro] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!targetUid) return;
      try {
        const data = await getUserProfile(targetUid);
        if (!cancelled) setProfile(data);
      } catch (error) {
        console.warn('Failed to load user profile', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [targetUid]);

  useEffect(() => {
    if (!user?.uid || !targetUid || user.uid === targetUid) return undefined;
    return listenRelationship(user.uid, targetUid, setRelationship);
  }, [targetUid, user?.uid]);

  const initials = useMemo(() => {
    const source = profile?.username || profile?.email || 'S';
    return source.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'S';
  }, [profile]);

  const avatarUrl = profile?.photo || '';
  const isSelf = user?.uid === targetUid;

  const runAction = async (key, task, success) => {
    setBusy(key);
    try {
      await task();
      if (success) Alert.alert('Done', success);
    } catch (error) {
      Alert.alert('Action unavailable', error.message || 'Please try again.');
    } finally {
      setBusy('');
    }
  };

  const openChat = async () => {
    await runAction('message', async () => {
      const conversationId = await createOrOpenFriendConversation({
        currentUser: user,
        otherUser: { id: targetUid, ...profile },
        currentProfile,
        otherProfile: profile,
      });
      router.push(`/messages/${conversationId}`);
    });
  };

  const submitMessageRequest = async () => {
    await runAction('messageRequest', async () => {
      await sendMessageRequest({
        currentUid: user.uid,
        targetUid,
        message: intro,
        currentProfile,
        targetProfile: profile,
      });
      setIntro('');
      setMessageModal(false);
    }, 'Message request sent.');
  };

  const confirmRemove = () => {
    Alert.alert('Remove friend?', 'This student will no longer be able to chat with you freely.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => runAction('remove', () => removeFriend({ currentUid: user.uid, friendUid: targetUid, currentProfile })) },
    ]);
  };

  const confirmBlock = () => {
    Alert.alert('Block this student?', 'They will not be able to send requests or message you.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => runAction('block', () => blockStudent({ currentUid: user.uid, targetUid, currentProfile, targetProfile: profile })) },
    ]);
  };

  const renderActions = () => {
    if (isSelf || relationship.state === RELATIONSHIP.BLOCKED) return null;
    const request = relationship.request;
    if (relationship.state === RELATIONSHIP.SENT) {
      return (
        <View style={styles.actions}>
          <View style={[styles.profileButton, styles.disabledButton]}>
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <Text style={styles.disabledButtonText}>Friend Request Sent</Text>
          </View>
          <ProfileButton label="Cancel Request" icon="close-circle-outline" variant="secondary" loading={busy === 'cancel'} onPress={() => runAction('cancel', () => cancelFriendRequest({ requestId: request.id, currentUid: user.uid }))} />
        </View>
      );
    }
    if (relationship.state === RELATIONSHIP.RECEIVED) {
      return (
        <View style={styles.actions}>
          <ProfileButton label="Accept Friend Request" icon="checkmark" loading={busy === 'accept'} onPress={() => runAction('accept', () => acceptFriendRequest({ request, currentUid: user.uid, currentProfile }))} />
          <ProfileButton label="Decline Friend Request" icon="close" variant="secondary" loading={busy === 'decline'} onPress={() => runAction('decline', () => declineFriendRequest({ request, currentUid: user.uid, currentProfile }))} />
        </View>
      );
    }
    if (relationship.state === RELATIONSHIP.FRIENDS) {
      return (
        <View style={styles.actions}>
          <View style={[styles.profileButton, styles.friendButton]}>
            <Ionicons name="checkmark-circle" size={16} color="#047857" />
            <Text style={styles.friendButtonText}>Friends</Text>
          </View>
          <ProfileButton label="Message" icon="chatbubble-outline" loading={busy === 'message'} onPress={openChat} />
          <ProfileButton label="Remove" icon="person-remove-outline" variant="secondary" loading={busy === 'remove'} onPress={confirmRemove} />
        </View>
      );
    }
    return (
      <View style={styles.actions}>
        <ProfileButton label="Add Friend" icon="person-add-outline" loading={busy === 'add'} onPress={() => runAction('add', () => sendFriendRequest({
          currentUid: user.uid,
          targetUid,
          currentProfile,
          targetProfile: profile,
        }), 'Friend request sent.')} />
        <ProfileButton label="Message Request" icon="mail-outline" variant="secondary" loading={busy === 'messageRequest'} onPress={() => setMessageModal(true)} />
        <ProfileButton label="Block" icon="ban-outline" variant="danger" loading={busy === 'block'} onPress={confirmBlock} />
      </View>
    );
  };

  return (
    <ScreenShell title="Profile" subtitle={profile?.username || 'Student profile'} showBack loading={loading}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#4F46E5" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : profile ? (
        <View style={styles.identity}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>{profile?.username || 'Student'}</Text>
          <Text style={styles.email} numberOfLines={1}>{profile?.email || ''}</Text>
          {renderActions()}

          <View style={styles.chips}>
            {profile?.school ? (
              <View style={styles.chip}>
                <Ionicons name="school-outline" size={12} color="#4F46E5" />
                <Text style={styles.chipText}>{profile.school}</Text>
              </View>
            ) : null}
            {profile?.department ? (
              <View style={styles.chip}>
                <Ionicons name="library-outline" size={12} color="#4F46E5" />
                <Text style={styles.chipText}>{profile.department}</Text>
              </View>
            ) : null}
            {profile?.level ? (
              <View style={styles.chip}>
                <Ionicons name="ribbon-outline" size={12} color="#4F46E5" />
                <Text style={styles.chipText}>{profile.level}</Text>
              </View>
            ) : null}
            {profile?.location ? (
              <View style={styles.chip}>
                <Ionicons name="location-outline" size={12} color="#4F46E5" />
                <Text style={styles.chipText}>{profile.location}</Text>
              </View>
            ) : null}
          </View>

          {profile?.bio ? (
            <View style={styles.bioCard}>
              <Text style={styles.bioLabel}>About</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : null}
          {!isSelf && relationship.state !== RELATIONSHIP.BLOCKED ? (
            <View style={styles.mutualCard}>
              <Ionicons name="people-outline" size={18} color="#4F46E5" />
              <Text style={styles.mutualText}>{relationship.mutualCount || 0} mutual friends</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={22} color="#94A3B8" />
          <Text style={styles.emptyText}>User profile not found.</Text>
        </View>
      )}
      <Modal visible={messageModal} transparent animationType="fade" onRequestClose={() => setMessageModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMessageModal(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Send message request</Text>
          <Text style={styles.modalText}>Introduce yourself. You can send one request before becoming friends.</Text>
          <TextInput
            value={intro}
            onChangeText={setIntro}
            placeholder="Hi, I'm also in Mechanical Engineering 300 Level..."
            placeholderTextColor="#94A3B8"
            style={styles.messageInput}
            multiline
            maxLength={500}
          />
          <View style={styles.modalActions}>
            <ProfileButton label="Cancel" icon="close" variant="secondary" onPress={() => setMessageModal(false)} />
            <ProfileButton label="Send" icon="send-outline" loading={busy === 'messageRequest'} onPress={submitMessageRequest} />
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

function ProfileButton({ label, icon, variant = 'primary', loading, onPress }) {
  return (
    <Pressable
      style={[styles.profileButton, styles[`${variant}Button`]]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator size="small" color={variant === 'primary' ? '#FFFFFF' : '#4F46E5'} /> : <Ionicons name={icon} size={16} color={variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? '#DC2626' : '#4F46E5'} />}
      <Text style={[styles.profileButtonText, variant !== 'primary' && styles.secondaryButtonText, variant === 'danger' && styles.dangerButtonText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  identity: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  name: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: '85%',
  },
  email: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    maxWidth: '85%',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  profileButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
    borderColor: '#E0E7FF',
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  disabledButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  friendButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  secondaryButtonText: {
    color: '#4F46E5',
  },
  dangerButtonText: {
    color: '#DC2626',
  },
  disabledButtonText: {
    color: '#64748B',
    fontWeight: '900',
    fontSize: 12,
  },
  friendButtonText: {
    color: '#047857',
    fontWeight: '900',
    fontSize: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
  },
  bioCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    width: '100%',
  },
  bioLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bioText: {
    color: '#334155',
    fontSize: 13.5,
    lineHeight: 20,
  },
  mutualCard: {
    width: '100%',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mutualText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
  },
  modalTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 17,
  },
  modalText: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  messageInput: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    marginTop: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
});
