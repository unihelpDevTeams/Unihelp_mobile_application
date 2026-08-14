import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { PageLoader } from '../../src/shared/components/AILoaders';
import { getUserProfile } from '../../services/firestoreSync';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
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
  const { colors } = useTheme();
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
    return () => {
      cancelled = true;
    };
  }, [targetUid]);

  useEffect(() => {
    if (!user?.uid || !targetUid || user.uid === targetUid) return undefined;
    return listenRelationship(user.uid, targetUid, setRelationship);
  }, [targetUid, user?.uid]);

  const initials = useMemo(() => {
    const source = profile?.username || profile?.email || 'S';
    return source
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'S';
  }, [profile]);

  const avatarUrl = typeof profile?.photo === 'string' ? profile.photo.trim() : profile?.photo || '';
  const coverUrl = String(profile?.coverPhoto || profile?.cover || profile?.coverUrl || profile?.banner || '').trim();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const isSelf = user?.uid === targetUid;

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    setCoverFailed(false);
  }, [coverUrl]);

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
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          runAction('remove', () =>
            removeFriend({ currentUid: user.uid, friendUid: targetUid, currentProfile })
          ),
      },
    ]);
  };

  const confirmBlock = () => {
    Alert.alert('Block this student?', 'They will not be able to send requests or message you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          runAction('block', () =>
            blockStudent({
              currentUid: user.uid,
              targetUid,
              currentProfile,
              targetProfile: profile,
            })
          ),
      },
    ]);
  };

  const renderActions = () => {
    if (isSelf || relationship.state === RELATIONSHIP.BLOCKED) return null;
    const request = relationship.request;

    if (relationship.state === RELATIONSHIP.SENT) {
      return (
        <View style={styles.actionContainer}>
          <View style={styles.badgeSent}>
            <Ionicons name="time-outline" size={16} color="#6366F1" />
            <Text style={styles.badgeSentText}>Friend Request Sent</Text>
          </View>
          <ActionButton
            label="Cancel Request"
            icon="close-circle-outline"
            variant="ghost"
            loading={busy === 'cancel'}
            onPress={() =>
              runAction('cancel', () =>
                cancelFriendRequest({ requestId: request.id, currentUid: user.uid })
              )
            }
          />
        </View>
      );
    }

    if (relationship.state === RELATIONSHIP.RECEIVED) {
      return (
        <View style={styles.actionContainer}>
          <ActionButton
            label="Accept Friend"
            icon="checkmark-circle-outline"
            variant="primary"
            loading={busy === 'accept'}
            onPress={() =>
              runAction('accept', () =>
                acceptFriendRequest({ request, currentUid: user.uid, currentProfile })
              )
            }
          />
          <ActionButton
            label="Decline"
            icon="close-outline"
            variant="secondary"
            loading={busy === 'decline'}
            onPress={() =>
              runAction('decline', () =>
                declineFriendRequest({ request, currentUid: user.uid, currentProfile })
              )
            }
          />
        </View>
      );
    }

    if (relationship.state === RELATIONSHIP.FRIENDS) {
      return (
        <View style={styles.actionContainer}>
          <ActionButton
            label="Message"
            icon="chatbubble-ellipses-outline"
            variant="primary"
            loading={busy === 'message'}
            onPress={openChat}
          />
          <ActionButton
            label="Remove"
            icon="person-remove-outline"
            variant="secondary"
            loading={busy === 'remove'}
            onPress={confirmRemove}
          />
        </View>
      );
    }

    return (
      <View style={styles.actionContainer}>
        <ActionButton
          label="Add Friend"
          icon="person-add-outline"
          variant="primary"
          loading={busy === 'add'}
          onPress={() =>
            runAction(
              'add',
              () =>
                sendFriendRequest({
                  currentUid: user.uid,
                  targetUid,
                  currentProfile,
                  targetProfile: profile,
                }),
              'Friend request sent.'
            )
          }
        />
        <ActionButton
          label="Message"
          icon="mail-outline"
          variant="secondary"
          loading={busy === 'messageRequest'}
          onPress={() => setMessageModal(true)}
        />
        <ActionButton
          icon="ellipsis-horizontal"
          variant="icon"
          loading={busy === 'block'}
          onPress={confirmBlock}
        />
      </View>
    );
  };

  return (
    <ScreenShell title="Profile" showBack loading={loading}>
      {loading ? (
        <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.borderDefault }] }>
          <PageLoader label="Fetching student profile..." />
        </View>
      ) : profile ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header Cover & Avatar */}
          <View style={styles.headerContainer}>
            <View style={[styles.coverBanner, { backgroundColor: colors.brandLight }]}>
              {coverUrl && !coverFailed ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.coverImage}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={220}
                  onError={() => setCoverFailed(true)}
                />
              ) : (
                <View style={styles.coverFallback}>
                  <Ionicons name="school-outline" size={30} color={colors.brand} />
                  <Text style={[styles.coverFallbackText, { color: colors.brand }]}>
                    {profile?.school || profile?.department || 'UniHelp Student'}
                  </Text>
                </View>
              )}
              <View style={styles.coverScrim} />
            </View>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarBorder, { backgroundColor: colors.surfacePrimary, shadowColor: colors.shadow }]}>
                {avatarUrl && !avatarFailed ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: colors.brand }]}>
                    <Text style={[styles.avatarText, { color: colors.onBrand }]}>{initials}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* User Basic Info */}
          <View style={styles.profileMeta}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{profile?.username || 'Student'}</Text>
            {profile?.email ? <Text style={[styles.email, { color: colors.textSecondary }]}>{profile.email}</Text> : null}
          </View>

          {/* Action Row */}
          {renderActions()}

          {/* Mutual Friends Stat Bar */}
          {!isSelf && relationship.state !== RELATIONSHIP.BLOCKED ? (
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.borderDefault, shadowColor: colors.shadow }]}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={20} color={colors.brand} />
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{relationship.mutualCount || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mutual Friends</Text>
              </View>
            </View>
          ) : null}

          {/* Academic Info Grid */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderDefault, shadowColor: colors.shadow }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Academic Profile</Text>
            <View style={styles.infoGrid}>
              <InfoTile
                icon="school-outline"
                label="Institution"
                value={profile?.school}
              />
              <InfoTile
                icon="library-outline"
                label="Department"
                value={profile?.department}
              />
              <InfoTile
                icon="ribbon-outline"
                label="Level"
                value={profile?.level}
              />
              <InfoTile
                icon="location-outline"
                label="Location"
                value={profile?.location}
              />
            </View>
          </View>

          {/* Bio Section */}
          {profile?.bio ? (
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderDefault, shadowColor: colors.shadow }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
              <Text style={[styles.bioText, { color: colors.textSecondary }]}>{profile.bio}</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderDefault, shadowColor: colors.shadow }]}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="person-circle-outline" size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Student Not Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            This profile might have been removed or is no longer accessible.
          </Text>
        </View>
      )}

      {/* Message Request Modal */}
      <Modal visible={messageModal} transparent animationType="slide" onRequestClose={() => setMessageModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setMessageModal(false)} />
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBackground }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.borderDefault }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Send Message Request</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Introduce yourself to {profile?.username || 'this student'}.
            </Text>
            <TextInput
              value={intro}
              onChangeText={setIntro}
              placeholder="Hi, I'm also in Mechanical Engineering..."
              placeholderTextColor={colors.placeholder}
              style={[styles.messageInput, { backgroundColor: colors.inputBackground, borderColor: colors.borderDefault, color: colors.textPrimary }]}
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <ActionButton
                label="Cancel"
                variant="secondary"
                onPress={() => setMessageModal(false)}
              />
              <ActionButton
                label="Send Request"
                icon="paper-plane-outline"
                variant="primary"
                loading={busy === 'messageRequest'}
                onPress={submitMessageRequest}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

function InfoTile({ icon, label, value }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={[styles.infoTile, { backgroundColor: colors.canvasLight }]}>
      <View style={[styles.infoIconContainer, { backgroundColor: colors.brandLight }]}>
        <Ionicons name={icon} size={16} color={colors.brand} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({ label, icon, variant = 'primary', loading, onPress }) {
  const { colors } = useTheme();
  const isIconOnly = variant === 'icon';
  const buttonBg =
    variant === 'primary'
      ? colors.brand
      : variant === 'secondary'
        ? colors.brandLight
        : variant === 'ghost'
          ? colors.redLight
          : colors.surfaceSecondary;
  const textColor =
    variant === 'primary'
      ? colors.onBrand
      : variant === 'ghost'
        ? colors.red
        : colors.brand;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: buttonBg },
        pressed && styles.btnPressed,
        isIconOnly && styles.btnIconOnly,
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.onBrand : colors.brand}
        />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={
                variant === 'primary'
                  ? colors.onBrand
                  : variant === 'ghost'
                    ? colors.red
                    : colors.brand
              }
            />
          ) : null}
          {label ? (
            <Text
              style={[
                styles.btnText,
                { color: textColor },
              ]}
            >
              {label}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  loadingCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 36,
    alignItems: 'center',
    justify: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Header / Avatar */
  headerContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  coverBanner: {
    height: 150,
    width: '100%',
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverFallbackText: {
    fontSize: 13,
    fontWeight: '800',
  },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  avatarWrapper: {
    marginTop: -48,
  },
  avatarBorder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    padding: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },

  /* Profile Meta */
  profileMeta: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  email: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  /* Actions */
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  btn: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexGrow: 1,
  },
  btn_primary: {
    backgroundColor: '#4F46E5',
  },
  btn_secondary: {
    backgroundColor: '#EEF2FF',
  },
  btn_ghost: {
    backgroundColor: '#FEF2F2',
  },
  btn_icon: {
    width: 44,
    paddingHorizontal: 0,
    flexGrow: 0,
    backgroundColor: '#F1F5F9',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnTextSecondary: {
    color: '#4F46E5',
  },
  btnTextGhost: {
    color: '#DC2626',
  },
  btnIconOnly: {
    borderRadius: 12,
  },
  badgeSent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  badgeSentText: {
    color: '#4338CA',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Mutual Stat Card */
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  /* Academic Grid Section */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  infoGrid: {
    gap: 10,
  },
  infoTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  bioText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
    marginHorizontal: 16,
  },
  emptyIconContainer: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  messageInput: {
    minHeight: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    marginTop: 16,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});
